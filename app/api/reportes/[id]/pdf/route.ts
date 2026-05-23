import { NextRequest, NextResponse } from 'next/server';
import { getReporte, updateReporte } from '@/lib/aws/reportes';
import { getMunicipioConfig } from '@/lib/aws/municipio-config';
import { generateReportPDF } from '@/lib/report-pdf';
import { uploadToS3 } from '@/lib/aws/s3';

function parseSignature(dataUrl?: string | null): Buffer | undefined {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return undefined;
  const base64 = dataUrl.split(',')[1];
  if (!base64) return undefined;
  return Buffer.from(base64, 'base64');
}

async function fetchBuffer(url: string): Promise<Buffer | undefined> {
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return undefined;
  }
}

async function buildPdfForReporte(
  reporte: NonNullable<Awaited<ReturnType<typeof getReporte>>>,
  signaturePng?: Buffer
) {
  const config = await getMunicipioConfig();
  let sig = signaturePng;
  if (!sig && reporte.firmaUrl) {
    sig = await fetchBuffer(reporte.firmaUrl);
  }
  return generateReportPDF(reporte, config, sig);
}

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

    if (reporte.oficioPdfUrl) {
      const stored = await fetchBuffer(reporte.oficioPdfUrl);
      if (stored) {
        return new NextResponse(new Uint8Array(stored), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="oficio-${reporte.folio}.pdf"`,
            'Cache-Control': 'no-store',
          },
        });
      }
    }

    const pdfBuffer = await buildPdfForReporte(reporte);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="oficio-${reporte.folio}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating report PDF:', error);
    return NextResponse.json({ error: 'Error al generar el PDF' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const reporte = await getReporte(id);
    if (!reporte) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const signaturePng = parseSignature(body.signatureDataUrl);

    if (!signaturePng) {
      return NextResponse.json(
        { error: 'La firma es requerida para descargar el oficio' },
        { status: 400 }
      );
    }

    const pdfBuffer = await buildPdfForReporte(reporte, signaturePng);
    const now = new Date().toISOString();

    const [{ url: firmaUrl, key: firmaS3Key }, { url: oficioPdfUrl, key: oficioPdfS3Key }] =
      await Promise.all([
        uploadToS3(signaturePng, `firma-${reporte.folio}.png`, 'image/png', 'reportes/firmas'),
        uploadToS3(pdfBuffer, `oficio-${reporte.folio}.pdf`, 'application/pdf', 'reportes/oficios'),
      ]);

    await updateReporte(id, {
      oficioFirmado: true,
      oficioFirmadoAt: now,
      firmaUrl,
      firmaS3Key,
      oficioPdfUrl,
      oficioPdfS3Key,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="oficio-${reporte.folio}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating signed report PDF:', error);
    return NextResponse.json({ error: 'Error al generar el PDF' }, { status: 500 });
  }
}
