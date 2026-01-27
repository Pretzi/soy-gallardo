import { NextRequest, NextResponse } from 'next/server';
import { getEntry } from '@/lib/aws/dynamo';
import { generateEntryImage } from '@/lib/image';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = await getEntry(id);

    if (!entry) {
      return NextResponse.json(
        { error: 'Entrada no encontrada' },
        { status: 404 }
      );
    }

    // Fetch selfie image if available
    let selfieBuffer: Buffer | undefined;
    if (entry.selfieUrl) {
      try {
        const response = await fetch(entry.selfieUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          selfieBuffer = Buffer.from(arrayBuffer);
        }
      } catch (error) {
        console.error('Error fetching selfie for image:', error);
        // Continue without selfie
      }
    }

    // Generate image
    const imageBuffer = await generateEntryImage(entry, selfieBuffer);

    // Check if preview mode
    const { searchParams } = new URL(request.url);
    const isPreview = searchParams.get('preview') === 'true';

    // Return image with inline display for preview, or attachment for download
    return new NextResponse(new Uint8Array(imageBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': isPreview 
          ? `inline; filename="preview-${entry.folio}.jpg"`
          : `attachment; filename="entry-${entry.folio}.jpg"`,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/entries/[id]/image:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar la imagen' },
      { status: 500 }
    );
  }
}
