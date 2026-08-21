import { NextResponse } from 'next/server';
import { generateIdeogramImage } from '@/config/ideogramConfig';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/config/db';
import { designs } from '@/config/schema';
import { deductCredit, refundCredit, checkRateLimit } from '@/lib/credits';

export interface GenerateImageRequestBody {
  prompt: string;
  style?: string;
  aspectRatio?: string;
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
    let body: GenerateImageRequestBody;
    try {
      body = (await request.json()) as GenerateImageRequestBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const { prompt, style, aspectRatio } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
        { status: 400 }
      );
    }

    // 3. Atomically check & deduct 1 credit from database
    const creditResult = await deductCredit(userEmail, user.fullName || '', user.imageUrl || '');
    if (!creditResult.success) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please purchase more credits to generate images.' },
        { status: 403 }
      );
    }
    creditDeducted = true;

    // 4. Generate image using Ideogram AI via Replicate
    let imageUrl: string | null = null;
    try {
      imageUrl = await generateIdeogramImage({
        prompt: prompt.trim(),
        style: style || 'photographic',
        aspectRatio: aspectRatio || '1:1',
        outputDir: './public/generated',
        filename: `ideogram-${Date.now()}.png`,
      });
    } catch (genError) {
      console.error('Ideogram generation error:', genError);
      await refundCredit(userEmail);
      creditDeducted = false;
      return NextResponse.json(
        { error: 'Failed to generate image' },
        { status: 500 }
      );
    }

    if (!imageUrl) {
      await refundCredit(userEmail);
      creditDeducted = false;
      return NextResponse.json(
        { error: 'Failed to generate image' },
        { status: 500 }
      );
    }

    // 5. Persist the generated image in the designs table so it appears in the gallery
    try {
      const savedDesign = await db.insert(designs).values({
        userId: user.id,
        originalImageUrl: imageUrl,
        generatedImageUrl: imageUrl,
        roomType: 'Text to Image',
        designType: style || 'photographic',
        additionalRequirements: prompt.trim(),
        createdAt: new Date(),
      }).returning();

      return NextResponse.json({
        success: true,
        imageUrl,
        design: savedDesign[0],
        creditsRemaining: creditResult.creditsRemaining,
      });
    } catch (dbError) {
      console.error('Database save error for Ideogram design:', dbError);
      // Still return success to user since image was generated, but log DB issue
      return NextResponse.json({
        success: true,
        imageUrl,
        creditsRemaining: creditResult.creditsRemaining,
      });
    }

  } catch (error) {
    console.error('Unhandled error in generate-image route:', error);
    if (creditDeducted && userEmail) {
      await refundCredit(userEmail);
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred while generating image' },
      { status: 500 }
    );
  }
}
