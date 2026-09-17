import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/config/db';
import { designs, users } from '@/config/schema';
import { refineRoomDesign } from '@/config/replicateConfig';
import { decrementCredit, checkRateLimit, syncCreditsToDb, refundCredit } from '@/lib/credits';
import { newGenerationId, logGeneration } from '@/lib/observability';
import { eq } from 'drizzle-orm';

export const MAX_INSTRUCTION_LENGTH = 300;

export interface RefineDesignRequestBody {
  instruction: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const designId = Number(id);
    if (!Number.isInteger(designId) || designId <= 0) {
      return NextResponse.json({ error: 'Invalid design ID' }, { status: 400 });
    }

    // Backfill clerkId on users row if not set (migration safety net —
    // matches generate-design/generate-image; the FK on designs.userId
    // requires a matching users.clerkId row to exist).
    const email = user.primaryEmailAddress?.emailAddress ?? '';
    if (email) {
      const existingUser = await db
        .select({ clerkId: users.clerkId })
        .from(users)
        .where(eq(users.email, email));
      if (existingUser.length > 0 && !existingUser[0].clerkId) {
        await db.update(users).set({ clerkId: user.id }).where(eq(users.email, email));
      }
    }

    // Rate limit — shares the same 10 req/min bucket as generation,
    // since a refinement calls the same paid AI provider.
    const rateLimit = await checkRateLimit(user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before trying again.' },
        { status: 429 }
      );
    }

    // Validate the instruction BEFORE charging a credit or touching the DB.
    let instruction = '';
    try {
      const body = await request.json() as RefineDesignRequestBody;
      instruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!instruction) {
      return NextResponse.json(
        { error: 'Missing required field: instruction' },
        { status: 400 }
      );
    }
    if (instruction.length > MAX_INSTRUCTION_LENGTH) {
      return NextResponse.json(
        { error: `Instruction must be ${MAX_INSTRUCTION_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }

    // Look up the parent design. A missing design and a design owned by
    // someone else both return 404 — never 403 — so a request can't be
    // used to probe which design IDs belong to other users.
    const parentRows = await db.select().from(designs).where(eq(designs.id, designId));
    const parent = parentRows[0];
    if (!parent || parent.userId !== user.id) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 });
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
    // produce a refinement must refund it before returning.
    const generationId = newGenerationId();
    const startTime = Date.now();
    let refinedDesigns: string[] | undefined;
    try {
      refinedDesigns = await refineRoomDesign({
        // Refine from the previous generation, not the original photo —
        // each refinement builds on the last, not on where the chain started.
        sourceImageUrl: parent.generatedImageUrl,
        roomType: parent.roomType,
        designStyle: parent.designType,
        instruction,
      });
    } catch (genError) {
      console.error('Error refining room design:', genError);
      logGeneration({
        generationId, userId: user.id, parentDesignId: parent.id,
        provider: 'replicate-sdxl', generationType: 'refinement',
        roomType: parent.roomType, designStyle: parent.designType,
        durationMs: Date.now() - startTime, success: false,
        failureReason: genError instanceof Error ? genError.message : 'unknown error',
      });
      const remaining = await refundCredit(user.id);
      return NextResponse.json(
        { error: 'Failed to refine design. Your credit was not charged.', creditsRemaining: remaining },
        { status: 500 }
      );
    }

    if (!refinedDesigns || refinedDesigns.length === 0) {
      logGeneration({
        generationId, userId: user.id, parentDesignId: parent.id,
        provider: 'replicate-sdxl', generationType: 'refinement',
        roomType: parent.roomType, designStyle: parent.designType,
        durationMs: Date.now() - startTime, success: false, failureReason: 'empty result from provider',
      });
      const remaining = await refundCredit(user.id);
      return NextResponse.json(
        { error: 'Failed to refine design. Your credit was not charged.', creditsRemaining: remaining },
        { status: 500 }
      );
    }

    const generatedImageUrl = refinedDesigns[0];

    // The provider call succeeded — the credit is correctly spent from
    // here even if the DB write below fails; only surface a warning.
    let savedDesign: typeof designs.$inferSelect | undefined;
    let saved = true;
    try {
      const inserted = await db.insert(designs).values({
        userId: user.id,
        // Carries the true original photo forward through the whole
        // chain, so v1 -> v2 -> v3 can all still be compared back to it.
        originalImageUrl: parent.originalImageUrl,
        generatedImageUrl,
        roomType: parent.roomType,
        designType: parent.designType,
        additionalRequirements: instruction,
        parentDesignId: parent.id,
        createdAt: new Date(),
      }).returning();
      savedDesign = inserted[0];
    } catch (dbError) {
      console.error('Failed to save refined design to DB:', dbError);
      saved = false;
    }

    logGeneration({
      generationId, userId: user.id, designId: savedDesign?.id ?? null, parentDesignId: parent.id,
      provider: 'replicate-sdxl', generationType: 'refinement',
      roomType: parent.roomType, designStyle: parent.designType,
      durationMs: Date.now() - startTime, success: true,
    });

    if (email) {
      void syncCreditsToDb(email, creditResult.remaining);
    }

    return NextResponse.json({
      success: true,
      design: savedDesign ?? null,
      generatedImageUrl,
      parentDesignId: parent.id,
      creditsRemaining: creditResult.remaining,
      saved,
      ...(saved ? {} : { warning: 'Refinement generated but could not be saved to your gallery. Please save it manually.' }),
    });

  } catch (error) {
    console.error('Error refining design:', error);
    return NextResponse.json(
      { error: 'Failed to refine design' },
      { status: 500 }
    );
  }
}
