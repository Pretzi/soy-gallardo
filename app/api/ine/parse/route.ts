import { NextRequest, NextResponse } from 'next/server';
import { parseINEImage } from '@/lib/openai';
import sharp from 'sharp';
import convert from 'heic-convert';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('ine') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó una imagen INE' },
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

    // Check if the file is HEIC format (iPhone default)
    const isHEIC = file.name.toLowerCase().endsWith('.heic') || 
                   file.name.toLowerCase().endsWith('.heif') ||
                   file.type === 'image/heic' ||
                   file.type === 'image/heif';

    if (isHEIC) {
      console.log('Converting HEIC to JPEG for OpenAI parsing...');
      const outputBuffer = await convert({
        buffer: buffer,
        format: 'JPEG',
        quality: 0.9
      });
      buffer = Buffer.from(outputBuffer);
      console.log(`HEIC converted, new size: ${buffer.length} bytes`);
    }

    // Convert any image format to JPEG with sharp to ensure compatibility with OpenAI
    // OpenAI Vision API requires: png, jpeg, gif, or webp
    const processedBuffer = await sharp(buffer)
      .rotate() // Auto-rotate based on EXIF orientation
      .jpeg({ quality: 90 }) // Ensure JPEG format for OpenAI
      .toBuffer();

    console.log(`Processed image for OpenAI, size: ${processedBuffer.length} bytes`);

    const parsedData = await parseINEImage(processedBuffer);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Error in /api/ine/parse:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la imagen INE' },
      { status: 500 }
    );
  }
}
