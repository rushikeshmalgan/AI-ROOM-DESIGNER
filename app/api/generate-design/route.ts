import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/config/db';
import { designs, users } from '@/config/schema';
import { decrementCredit, checkRateLimit, syncCreditsToDb, refundCredit, recordCreditTransaction } from '@/lib/credits';
import { logGeneration, newGenerationId } from '@/lib/observability';
import { trackEvent } from '@/lib/analytics';
import { replicateSdxlProvider } from '@/lib/generation/providers';
import { runGenerationAttempt, linkGenerationToDesign } from '@/lib/generation/generationService';
import { eq } from 'drizzle-orm';

export interface GenerateDesignRequestBody {
  imageUrl: string;
  roomType: string;
  designType: string;
  additionalRequirements?: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Backfill clerkId on users row if not set (migration safety net)
    const existingUser = await db
      .select({ clerkId: users.clerkId })
      .from(users)
      .where(eq(users.email, user.primaryEmailAddress?.emailAddress ?? ''));
    if (existingUser.length > 0 && !existingUser[0].clerkId) {
      await db
        .update(users)
        .set({ clerkId: user.id })
        .where(eq(users.email, user.primaryEmailAddress?.emailAddress ?? ''));
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
    const { imageUrl, roomType, designType, additionalRequirements } =
      await request.json() as GenerateDesignRequestBody;

    if (!imageUrl || !roomType || !designType) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, roomType, or designType' },
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
    // produce a design must refund it before returning. The route
    // depends on `replicateSdxlProvider` (an ImageGenerationProvider),
    // not on config/replicateConfig.ts or Replicate's SDK directly.
    void trackEvent({
      event: 'generation_started', userId: user.id,
      properties: { roomType, designStyle: designType, generationType: 'initial', provider: 'replicate-sdxl' },
    });

    const attempt = await runGenerationAttempt(
      { userId: user.id, generationType: 'initial', provider: 'replicate-sdxl', roomType, designStyle: designType },
      () => replicateSdxlProvider.generate({ imageUrl, roomType, designStyle: designType, additionalRequirements })
    );

    // The generations table row is the durable audit record; this
    // correlation id is what ties it to the structured log line below
    // (falls back to a fresh id only if the row itself failed to insert).
    const correlationId = attempt.generationId !== null ? String(attempt.generationId) : newGenerationId();

    if (!attempt.success || !attempt.imageUrls) {
      const failureReason = attempt.errorMessage ?? 'empty result from provider';
      console.error('Error generating room design:', failureReason);
      logGeneration({
        generationId: correlationId, userId: user.id, provider: 'replicate-sdxl', generationType: 'initial',
        roomType, designStyle: designType, durationMs: attempt.latencyMs, success: false, failureReason,
      });
      void trackEvent({
        event: 'generation_failed', userId: user.id,
        properties: { roomType, designStyle: designType, generationType: 'initial', provider: 'replicate-sdxl', latencyMs: attempt.latencyMs },
      });
      const remaining = await refundCredit(user.id);
      void recordCreditTransaction({
        userId: user.id, type: 'refund', amount: 1, balanceAfter: remaining, generationId: attempt.generationId,
      });
      return NextResponse.json(
        { error: 'Failed to generate design. Your credit was not charged.', creditsRemaining: remaining },
        { status: 500 }
      );
    }

    const generatedImageUrl = attempt.imageUrls[0];

    // The provider call succeeded — the credit is correctly spent from
    // here even if the DB write below fails; only surface a warning.
    let savedDesign: typeof designs.$inferSelect | undefined;
    let saved = true;
    try {
      const inserted = await db.insert(designs).values({
        userId: user.id,
        originalImageUrl: imageUrl,
        generatedImageUrl,
        roomType,
        designType,
        additionalRequirements: additionalRequirements || '',
        createdAt: new Date(),
      }).returning();
      savedDesign = inserted[0];
      if (savedDesign) {
        void linkGenerationToDesign(attempt.generationId, savedDesign.id);
      }
    } catch (dbError) {
      console.error('Failed to save generated design to DB:', dbError);
      saved = false;
    }

    logGeneration({
      generationId: correlationId, userId: user.id, designId: savedDesign?.id ?? null,
      provider: 'replicate-sdxl', generationType: 'initial', roomType, designStyle: designType,
      durationMs: attempt.latencyMs, success: true,
    });
    void trackEvent({
      event: 'generation_succeeded', userId: user.id,
      properties: { roomType, designStyle: designType, generationType: 'initial', provider: 'replicate-sdxl', latencyMs: attempt.latencyMs },
    });
    void recordCreditTransaction({
      userId: user.id, type: 'generation', amount: -1, balanceAfter: creditResult.remaining, generationId: attempt.generationId,
    });

    // Async best-effort: write decremented credits back to Postgres so
    // the dashboard display stays roughly in sync.
    const email = user.primaryEmailAddress?.emailAddress ?? '';
    if (email) {
      void syncCreditsToDb(email, creditResult.remaining);
    }

    return NextResponse.json({
      success: true,
      design: savedDesign ?? null,
      generatedImageUrl,
      creditsRemaining: creditResult.remaining,
      saved,
      ...(saved ? {} : { warning: 'Design generated but could not be saved to your gallery. Please save it manually.' }),
    });

  } catch (error) {
    console.error('Error generating room design:', error);
    return NextResponse.json(
      { error: 'Failed to generate room design' },
      { status: 500 }
    );
  }
}
