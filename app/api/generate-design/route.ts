import { NextResponse } from 'next/server';
import { generateRoomDesign } from '@/config/replicateConfig';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/config/db';
import { designs, users } from '@/config/schema';
import { decrementCredit, checkRateLimit, syncCreditsToDb } from '@/lib/credits';
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

    // Credits gate — atomic Redis decrement; 402 if exhausted
    const creditResult = await decrementCredit(user.id);
    if (!creditResult.ok) {
      return NextResponse.json(
        { error: 'Insufficient credits. Upgrade or wait for refill.' },
        { status: 402 }
      );
    }

    const { imageUrl, roomType, designType, additionalRequirements } =
      await request.json() as GenerateDesignRequestBody;

    if (!imageUrl || !roomType || !designType) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, roomType, or designType' },
        { status: 400 }
      );
    }

    const generatedDesigns = await generateRoomDesign({
      imageUrl,
      roomType,
      designStyle: designType,
      additionalRequirements,
    });

    if (!generatedDesigns || generatedDesigns.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate design' },
        { status: 500 }
      );
    }

    const generatedImageUrl = generatedDesigns[0];

    const savedDesign = await db.insert(designs).values({
      userId: user.id,
      originalImageUrl: imageUrl,
      generatedImageUrl,
      roomType,
      designType,
      additionalRequirements: additionalRequirements || '',
      createdAt: new Date(),
    }).returning();

    // Async best-effort: write decremented credits back to Postgres so
    // the dashboard display stays roughly in sync.
    const email = user.primaryEmailAddress?.emailAddress ?? '';
    if (email) {
      void syncCreditsToDb(email, creditResult.remaining);
    }

    return NextResponse.json({
      success: true,
      design: savedDesign[0],
      generatedImageUrl,
      creditsRemaining: creditResult.remaining,
    });

  } catch (error) {
    console.error('Error generating room design:', error);
    return NextResponse.json(
      { error: 'Failed to generate room design' },
      { status: 500 }
    );
  }
}
