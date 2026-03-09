import { NextRequest, NextResponse } from 'next/server';
import { getEntryByPublicId } from '@/lib/aws/dynamo';
import { generateEntryImage } from '@/lib/image';

// Public route: returns the credential image for a member (by publicId only).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  try {
    const { identifier } = await params;
    if (!identifier) {
      return NextResponse.json(
        { error: 'Identificador requerido' },
        { status: 400 }
      );
    }

    const entry = await getEntryByPublicId(identifier);

    if (!entry) {
      return NextResponse.json(
        { error: 'Miembro no encontrado' },
        { status: 404 }
      );
    }

    let selfieBuffer: Buffer | undefined;
    if (entry.selfieUrl) {
      try {
        const response = await fetch(entry.selfieUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          selfieBuffer = Buffer.from(arrayBuffer);
        }
      } catch (error) {
        console.error('Error fetching selfie for member image:', error);
      }
    }

    const imageBuffer = await generateEntryImage(entry, selfieBuffer);

    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `inline; filename="credencial-${entry.folio}.jpg"`,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/members/[identifier]/image:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar la imagen' },
      { status: 500 }
    );
  }
}
