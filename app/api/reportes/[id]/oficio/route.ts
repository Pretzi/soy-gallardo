import { NextRequest, NextResponse } from 'next/server';
import { getReporte } from '@/lib/aws/reportes';

/** Public endpoint — oficio signing status for citizen gracias page */
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

    return NextResponse.json({
      oficioFirmado: Boolean(reporte.oficioFirmado),
      oficioFirmadoAt: reporte.oficioFirmadoAt || null,
    });
  } catch (error) {
    console.error('Error fetching oficio status:', error);
    return NextResponse.json({ error: 'Error al consultar el oficio' }, { status: 500 });
  }
}
