import { NextRequest, NextResponse } from 'next/server';
import { parseINEImage } from '@/lib/openai';

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

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsedData = await parseINEImage(buffer);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Error in /api/ine/parse:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la imagen INE' },
      { status: 500 }
    );
  }
}
