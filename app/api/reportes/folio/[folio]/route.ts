import { NextRequest, NextResponse } from 'next/server';
import { getReporteByFolio } from '@/lib/aws/reportes';
import { REPORT_TYPES } from '@/lib/report-types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ folio: string }> }
) {
  const { folio } = await params;

  try {
    const reporte = await getReporteByFolio(folio);
    if (!reporte) {
      return NextResponse.json({ error: 'Folio no encontrado' }, { status: 404 });
    }

    const tipo = REPORT_TYPES.find((t) => t.id === reporte.tipo);

    // Return only public-safe fields
    return NextResponse.json({
      folio: reporte.folio,
      id: reporte.id,
      tipo: reporte.tipo,
      tipoLabel: tipo?.label || reporte.tipo,
      tipoEmoji: tipo?.emoji || '📋',
      estado: reporte.estado,
      calle: reporte.calle,
      colonia: reporte.colonia || null,
      createdAt: reporte.createdAt,
    });
  } catch (error) {
    console.error('Error looking up folio:', error);
    return NextResponse.json({ error: 'Error al buscar el folio' }, { status: 500 });
  }
}
