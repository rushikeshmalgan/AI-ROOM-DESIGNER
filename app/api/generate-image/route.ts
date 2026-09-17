import { NextResponse } from 'next/server';
import { generateIdeogramImage } from '@/config/ideogramConfig';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/config/db';
import { designs, users } from '@/config/schema';
import { decrementCredit, checkRateLimit, syncCreditsToDb, refundCredit, recordCreditTransaction } from '@/lib/credits';
import { newGenerationId, logGeneration } from '@/lib/observability';
import { trackEvent } from '@/lib/analytics';
import { runGenerationAttempt, linkGenerationToDesign } from '@/lib/generation/generationService';
import { eq } from 'drizzle-orm';

export interface GenerateImageRequestBody {
  prompt: string;
  style?: string;
  aspectRatio?: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Backfill clerkId on users row if not set (migration safety net)
    const email = user.primaryEmailAddress?.emailAddress ?? '';
    if (email) {
      const existingUser = await db
        .select({ clerkId: users.clerkId })
        .from(users)
        .where(eq(users.email, email));
      if (existingUser.length > 0 && !existingUser[0].clerkId) {
        await db
          .update(users)
          .set({ clerkId: user.id })
          .where(eq(users.email, email));
      }
    }

    // Rate limit — 10 requests/minute per user
    const rateLimit = await checkRateLimit(user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before trying again.' },
        { status: 429 }
      );
    }

    // Validate the request BEFORE charging a credit — a 400 must never
    // cost the user anything.
    const { prompt, style, aspectRatio } = await request.json() as GenerateImageRequestBody;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
        { status: 400 }
      );
    }

    // Credits gate — atomic Redis decrement; 402 if exhausted
    const creditResult = await decrementCredit(user.id);
    if (!creditResult.ok) {
      return NextResponse.json(
        { error: 'Insufficient credits. Upgrade or wait for refill.' },
        { status: 402 }
      );
    }

    // From here on, a credit has been spent — any failure to actually
    // produce an image must refund it before returning. Ideogram isn't
    // wired through ImageGenerationProvider (see lib/generation/providers.ts
    // for why — its free-text-prompt, generate-only shape doesn't fit that
    // interface), but it still gets the same generations-table audit trail.
    void trackEvent({
      event: 'generation_started', userId: user.id,
      properties: { designStyle: style || 'photographic', generationType: 'initial', provider: 'replicate-ideogram' },
    });

    const attempt = await runGenerationAttempt(
      { userId: user.id, generationType: 'initial', provider: 'replicate-ideogram', designStyle: style || 'photographic' },
      async () => {
        const url = await generateIdeogramImage({
          prompt,
          style: style || 'photographic',
          aspectRatio: aspectRatio || '1:1',
        });
        return { imageUrls: url ? [url] : [] };
      }
    );

    const correlationId = attempt.generationId !== null ? String(attempt.generationId) : newGenerationId();

    if (!attempt.success || !attempt.imageUrls) {
      const failureReason = attempt.errorMessage ?? 'empty result from provider';
      console.error('Error generating image with Ideogram:', failureReason);
      logGeneration({
        generationId: correlationId, userId: user.id, provider: 'replicate-ideogram', generationType: 'initial',
        designStyle: style || 'photographic', durationMs: attempt.latencyMs, success: false, failureReason,
      });
      void trackEvent({
        event: 'generation_failed', userId: user.id,
        properties: { designStyle: style || 'photographic', generationType: 'initial', provider: 'replicate-ideogram', latencyMs: attempt.latencyMs },
      });
      const remaining = await refundCredit(user.id);
      void recordCreditTransaction({
        userId: user.id, type: 'refund', amount: 1, balanceAfter: remaining, generationId: attempt.generationId,
      });
      return NextResponse.json(
        { error: 'Failed to generate image. Your credit was not charged.', creditsRemaining: remaining },
        { status: 500 }
      );
    }

    const imageUrl = attempt.imageUrls[0];

    // Async best-effort: write decremented credits back to Postgres so
    // the dashboard display stays roughly in sync.
    if (email) {
      void syncCreditsToDb(email, creditResult.remaining);
    }

    // Persist to designs table so it appears in the user's gallery.
    // If the DB write fails, signal partial success — the image was
    // generated but won't persist across sessions.
    let saved = true;
    let savedId: number | null = null;
    try {
      const inserted = await db.insert(designs).values({
        userId: user.id,
        originalImageUrl: '',
        generatedImageUrl: imageUrl,
        roomType: 'ai-image',
        designType: style || 'photographic',
        additionalRequirements: prompt,
        createdAt: new Date(),
      }).returning({ id: designs.id });
      savedId = inserted[0]?.id ?? null;
      if (savedId) {
        void linkGenerationToDesign(attempt.generationId, savedId);
      }
    } catch (dbError) {
      console.error('Failed to save generated image to designs:', dbError);
      saved = false;
    }

    logGeneration({
      generationId: correlationId, userId: user.id, designId: savedId,
      provider: 'replicate-ideogram', generationType: 'initial',
      designStyle: style || 'photographic', durationMs: attempt.latencyMs, success: true,
    });
    void trackEvent({
      event: 'generation_succeeded', userId: user.id,
      properties: { designStyle: style || 'photographic', generationType: 'initial', provider: 'replicate-ideogram', latencyMs: attempt.latencyMs },
    });
    void recordCreditTransaction({
      userId: user.id, type: 'generation', amount: -1, balanceAfter: creditResult.remaining, generationId: attempt.generationId,
    });

    return NextResponse.json({
      success: true,
      imageUrl,
      saved,
      creditsRemaining: creditResult.remaining,
      ...(saved ? {} : { warning: 'Image generated but could not be saved to your gallery. Please save it manually.' }),
    });

  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
