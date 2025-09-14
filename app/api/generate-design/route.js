import { NextResponse } from 'next/server';
import { generateRoomDesign } from '@/config/replicateConfig';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/config/db';
import { designs } from '@/config/schema';

export async function POST(request) {
  try {
    // Get current authenticated user
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const { imageUrl, roomType, designType, additionalRequirements } = await request.json();
    
    // Validate required fields
    if (!imageUrl || !roomType || !designType) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, roomType, or designType' },
        { status: 400 }
      );
    }
    
    // Generate room design using Replicate API
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
    
    // Get the generated image URL
    const generatedImageUrl = generatedDesigns[0];
    
    // Save design to database
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
    });
    
  } catch (error) {
    console.error('Error generating room design:', error);
    return NextResponse.json(
      { error: 'Failed to generate room design' },
      { status: 500 }
    );
  }
}