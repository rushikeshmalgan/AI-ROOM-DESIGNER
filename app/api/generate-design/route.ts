import { NextResponse } from 'next/server';
import { generateRoomDesign } from '@/config/replicateConfig';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/config/db';
import { designs } from '@/config/schema';
import { deductCredit, refundCredit, checkRateLimit } from '@/lib/credits';

export interface GenerateDesignRequestBody {
  imageUrl: string;
  roomType: string;
  designType: string;
  additionalRequirements?: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  let userEmail = '';
  let creditDeducted = false;

  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    userEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || '';
    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 401 });
    }

    // 1. Rate limit — 10 requests/minute per user
    const rateLimit = await checkRateLimit(user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment before trying again.' },
        { status: 429 }
      );
    }

    // 2. Validate input BEFORE deducting credit
    let body: GenerateDesignRequestBody;
    try {
      body = (await request.json()) as GenerateDesignRequestBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const { imageUrl, roomType, designType, additionalRequirements } = body;

    if (!imageUrl || !roomType || !designType) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, roomType, or designType' },
        { status: 400 }
      );
    }

    // 3. Atomically check & deduct 1 credit from database
    const creditResult = await deductCredit(userEmail, user.fullName || '', user.imageUrl || '');
    if (!creditResult.success) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please purchase more credits to generate designs.' },
        { status: 403 }
      );
    }
    creditDeducted = true;

    // 4. Generate room design using Replicate API
    let generatedDesigns: string[] | null = null;
    try {
      generatedDesigns = await generateRoomDesign({
        imageUrl,
        roomType,
        designStyle: designType,
        additionalRequirements,
      });
    } catch (genError) {
      console.error('Replicate API error:', genError);
      await refundCredit(userEmail);
      creditDeducted = false;
      return NextResponse.json(
        { error: 'Failed to generate room design' },
        { status: 500 }
      );
    }

    if (!generatedDesigns || generatedDesigns.length === 0) {
      await refundCredit(userEmail);
      creditDeducted = false;
      return NextResponse.json(
        { error: 'Failed to generate design' },
        { status: 500 }
      );
    }

    const generatedImageUrl = generatedDesigns[0];

    // 5. Persist design to database
    try {
      const savedDesign = await db.insert(designs).values({
        userId: user.id,
        originalImageUrl: imageUrl,
        generatedImageUrl,
        roomType,
        designType,
        additionalRequirements: additionalRequirements || '',
        createdAt: new Date(),
      }).returning();

      return NextResponse.json({
        success: true,
        design: savedDesign[0],
        generatedImageUrl,
        creditsRemaining: creditResult.creditsRemaining,
      });
    } catch (dbError) {
      console.error('Database save error:', dbError);
      // Refund credit if DB persistence failed
      await refundCredit(userEmail);
      return NextResponse.json(
        { error: 'Failed to save generated design' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Unhandled error in generate-design route:', error);
    if (creditDeducted && userEmail) {
      await refundCredit(userEmail);
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred while generating room design' },
      { status: 500 }
    );
  }
}
