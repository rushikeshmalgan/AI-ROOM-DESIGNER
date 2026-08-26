import { NextResponse } from 'next/server';
import { generateIdeogramImage } from '@/config/ideogramConfig';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/config/db';
import { designs, users } from '@/config/schema';
import { decrementCredit, checkRateLimit, syncCreditsToDb } from '@/lib/credits';
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

    // Credits gate — atomic Redis decrement; 402 if exhausted
    const creditResult = await decrementCredit(user.id);
    if (!creditResult.ok) {
      return NextResponse.json(
        { error: 'Insufficient credits. Upgrade or wait for refill.' },
        { status: 402 }
      );
    }

    const { prompt, style, aspectRatio } = await request.json() as GenerateImageRequestBody;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
        { status: 400 }
      );
    }

    const imageUrl = await generateIdeogramImage({
      prompt,
      style: style || 'photographic',
      aspectRatio: aspectRatio || '1:1',
      outputDir: './public/generated',
      filename: `ideogram-${Date.now()}.png`,
    });

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Failed to generate image' },
        { status: 500 }
      );
    }

    // Async best-effort: write decremented credits back to Postgres so
    // the dashboard display stays roughly in sync.
    if (email) {
      void syncCreditsToDb(email, creditResult.remaining);
    }

    // Persist to designs table so it appears in the user's gallery.
    // If the DB write fails, signal partial success — the image was
    // generated but won't persist across sessions.
    let saved = true;
    try {
      await db.insert(designs).values({
        userId: user.id,
        originalImageUrl: '',
        generatedImageUrl: imageUrl,
        roomType: 'ai-image',
        designType: style || 'photographic',
        additionalRequirements: prompt,
        createdAt: new Date(),
      });
    } catch (dbError) {
      console.error('Failed to save generated image to designs:', dbError);
      saved = false;
    }

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
