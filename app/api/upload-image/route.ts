import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { cloudinary } from '@/config/cloudinaryConfig';
import { checkRateLimit } from '@/lib/credits';

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export interface UploadImageResponse {
  success: boolean;
  imageUrl: string;
  publicId: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // 1. Authenticate user
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate limit — 10 upload requests/minute per user
    const rateLimit = await checkRateLimit(user.id);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before uploading another image.' },
        { status: 429 }
      );
    }

    // 3. Parse and validate FormData
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const file = formData.get('file');

    if (!file || typeof (file as unknown as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer !== 'function') {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const fileObj = file as unknown as { type?: string; size?: number; arrayBuffer: () => Promise<ArrayBuffer> };
    const mimeType = fileObj.type || '';
    const fileSize = typeof fileObj.size === 'number' ? fileObj.size : 0;

    // 4. Validate MIME Type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a JPEG, PNG, or WebP image.' },
        { status: 400 }
      );
    }

    // 5. Validate File Size before buffer conversion
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size exceeds the 10MB limit. Uploaded size: ${(fileSize / (1024 * 1024)).toFixed(2)}MB` },
        { status: 400 }
      );
    }

    // 6. Convert file to base64 data URI
    const bytes = await fileObj.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileStr = buffer.toString('base64');
    const fileUri = `data:${mimeType};base64,${fileStr}`;

    // 7. Upload to Cloudinary with user-specific folder tagging
    const uploadResult = await cloudinary.uploader.upload(fileUri, {
      folder: 'ai-room-design',
      resource_type: 'image',
      tags: [user.id],
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
