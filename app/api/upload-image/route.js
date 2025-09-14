import { NextResponse } from 'next/server';
import { cloudinary } from '@/config/cloudinaryConfig';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert buffer to base64 string
    const fileStr = buffer.toString('base64');
    const fileUri = `data:${file.type};base64,${fileStr}`;

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(fileUri, {
      folder: 'ai-room-design',
      resource_type: 'auto',
    });

    return NextResponse.json({
      success: true,
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}