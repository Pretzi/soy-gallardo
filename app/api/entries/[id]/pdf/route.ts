import { NextRequest, NextResponse } from 'next/server';
import { getEntry } from '@/lib/aws/dynamo';
import { generateEntryPDF } from '@/lib/pdf';

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
        console.error('Error fetching selfie for PDF:', error);
        // Continue without selfie
      }
    }

    // Generate PDF
    const pdfBuffer = await generateEntryPDF(entry, selfieBuffer);

    // Check if preview mode
    const { searchParams } = new URL(request.url);
    const isPreview = searchParams.get('preview') === 'true';

    // Return PDF with inline display for preview, or attachment for download
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': isPreview 
          ? `inline; filename="preview-${entry.folio}.pdf"`
          : `attachment; filename="entry-${entry.folio}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/entries/[id]/pdf:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar el PDF' },
      { status: 500 }
    );
  }
}
