import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { uploadImageToS3 } from '@/lib/aws/s3';
import { processHeadshotWithGemini } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('selfie') as File;
    const processBackground = formData.get('processBackground') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó una imagen de selfie' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'El archivo debe ser una imagen' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'La imagen es demasiado grande (máximo 10MB)' },
        { status: 400 }
      );
    }

    let buffer = Buffer.from(await file.arrayBuffer());

    // Only process headshot with Gemini if requested
    if (processBackground) {
      buffer = await processHeadshotWithGemini(buffer);
    }

    // Upload to S3
    const fileName = `selfie-${Date.now()}.jpg`;
    const { url, key } = await uploadImageToS3(buffer, fileName);

    console.log('Returning to client:', { url, s3Key: key });

    return NextResponse.json({ url, s3Key: key });
  } catch (error: any) {
    console.error('Error in /api/selfie/upload:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la selfie' },
      { status: 500 }
    );
  }
}
