import { NextResponse } from 'next/server';
import { generateRoomDesign } from '@/config/replicateConfig';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/config/db';
import { designs, users } from '@/config/schema';
import { decrementCredit, checkRateLimit, syncCreditsToDb, refundCredit } from '@/lib/credits';
import { newGenerationId, logGeneration } from '@/lib/observability';
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
    // produce a design must refund it before returning.
    const generationId = newGenerationId();
    const startTime = Date.now();
    let generatedDesigns: string[] | undefined;
    try {
      generatedDesigns = await generateRoomDesign({
        imageUrl,
        roomType,
        designStyle: designType,
        additionalRequirements,
      });
    } catch (genError) {
      console.error('Error generating room design:', genError);
      logGeneration({
        generationId, userId: user.id, provider: 'replicate-sdxl', generationType: 'initial',
        roomType, designStyle: designType, durationMs: Date.now() - startTime,
        success: false, failureReason: genError instanceof Error ? genError.message : 'unknown error',
      });
      const remaining = await refundCredit(user.id);
      return NextResponse.json(
        { error: 'Failed to generate design. Your credit was not charged.', creditsRemaining: remaining },
        { status: 500 }
      );
    }

    if (!generatedDesigns || generatedDesigns.length === 0) {
      logGeneration({
        generationId, userId: user.id, provider: 'replicate-sdxl', generationType: 'initial',
        roomType, designStyle: designType, durationMs: Date.now() - startTime,
        success: false, failureReason: 'empty result from provider',
      });
      const remaining = await refundCredit(user.id);
      return NextResponse.json(
        { error: 'Failed to generate design. Your credit was not charged.', creditsRemaining: remaining },
        { status: 500 }
      );
    }

    const generatedImageUrl = generatedDesigns[0];

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
    } catch (dbError) {
      console.error('Failed to save generated design to DB:', dbError);
      saved = false;
    }

    logGeneration({
      generationId, userId: user.id, designId: savedDesign?.id ?? null,
      provider: 'replicate-sdxl', generationType: 'initial', roomType, designStyle: designType,
      durationMs: Date.now() - startTime, success: true,
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
