import { NextRequest, NextResponse } from 'next/server';
import { getReporteByFolio } from '@/lib/aws/reportes';
import { getReportClassification } from '@/lib/report-types';

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

    const classification = getReportClassification(reporte);

    return NextResponse.json({
      folio: reporte.folio,
      id: reporte.id,
      categoria: reporte.categoria || null,
      subcategoria: reporte.subcategoria || null,
      tipo: reporte.tipo || null,
      tipoLabel: classification.displayLabel,
      tipoEmoji: classification.emoji,
      categoriaLabel: classification.categoryLabel,
      subcategoriaLabel: classification.subcategoryLabel,
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
