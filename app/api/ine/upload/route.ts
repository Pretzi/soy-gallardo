import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import convert from 'heic-convert';
import { uploadImageToS3 } from '@/lib/aws/s3';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('ine') as File;
    const side = formData.get('side') as string; // 'front' or 'back'

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó una imagen de INE' },
        { status: 400 }
      );
    }

    if (!side || !['front', 'back'].includes(side)) {
      return NextResponse.json(
        { error: 'Debe especificar el lado de la INE (front o back)' },
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

    console.log(`Processing INE ${side}, original size: ${buffer.length} bytes, type: ${file.type}, name: ${file.name}`);

    // Check if the file is HEIC format (iPhone default)
    const isHEIC = file.name.toLowerCase().endsWith('.heic') || 
                   file.name.toLowerCase().endsWith('.heif') ||
                   file.type === 'image/heic' ||
                   file.type === 'image/heif';

    if (isHEIC) {
      console.log('Converting HEIC to JPEG...');
      const outputBuffer = await convert({
        buffer: buffer,
        format: 'JPEG',
        quality: 0.9
      });
      buffer = Buffer.from(outputBuffer);
      console.log(`HEIC converted, new size: ${buffer.length} bytes`);
    }

    // Convert any image format to JPEG with sharp
    const processedBuffer = await sharp(buffer)
      .rotate() // Auto-rotate based on EXIF orientation
      .jpeg({ quality: 90 })
      .toBuffer();

    console.log(`Final JPEG size: ${processedBuffer.length} bytes`);

    // Upload to S3 in the 'ine' folder
    const fileName = `${side}-${Date.now()}.jpg`;
    const { url, key } = await uploadImageToS3(processedBuffer, fileName, 'ine');

    console.log(`INE ${side} uploaded:`, { url, key });

    return NextResponse.json({ url, s3Key: key });
  } catch (error: any) {
    console.error('Error in /api/ine/upload:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la imagen INE' },
      { status: 500 }
    );
  }
}
