import { NextResponse } from 'next/server';
import { generateIdeogramImage } from '@/config/ideogramConfig';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(request) {
  try {
    // Get current authenticated user
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const { prompt, style, aspectRatio } = await request.json();
    
    // Validate required fields
    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
        { status: 400 }
      );
    }
    
    // Generate image using Ideogram AI
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
    
    return NextResponse.json({
      success: true,
      imageUrl,
    });
    
  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}