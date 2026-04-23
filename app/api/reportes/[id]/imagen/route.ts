import { NextRequest, NextResponse } from 'next/server';
import { getReporte } from '@/lib/aws/reportes';
import { generateReportImage } from '@/lib/report-image';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const reporte = await getReporte(id);
    if (!reporte) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
    }

    // Fetch the first photo if available
    let photoBuffer: Buffer | undefined;
    if (reporte.fotosUrls && reporte.fotosUrls.length > 0) {
      try {
        const res = await fetch(reporte.fotosUrls[0]);
        if (res.ok) {
          photoBuffer = Buffer.from(await res.arrayBuffer());
          console.log('[imagen] Photo fetched, size:', photoBuffer.length);
        } else {
          console.warn('[imagen] Photo fetch failed:', res.status, reporte.fotosUrls[0]);
        }
      } catch (e) {
        console.warn('[imagen] Photo fetch error:', e);
      }
    } else {
      console.log('[imagen] No photos on reporte, using solid background');
    }

    const imageBuffer = await generateReportImage(reporte, photoBuffer);

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="reporte-${reporte.folio}.jpg"`,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Error generating report image:', error);
    return NextResponse.json({ error: 'Error al generar la imagen' }, { status: 500 });
  }
}
