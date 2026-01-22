import { NextRequest, NextResponse } from 'next/server';
import { getEntriesBySeccion, getCountBySeccion } from '@/lib/aws/dynamo';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const seccion = searchParams.get('seccion');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const lastKey = searchParams.get('lastKey');

    if (!seccion) {
      return NextResponse.json(
        { error: 'seccion parameter is required' },
        { status: 400 }
      );
    }

    // Parse lastEvaluatedKey if provided
    let lastEvaluatedKey: Record<string, any> | undefined;
    if (lastKey) {
      try {
        lastEvaluatedKey = JSON.parse(decodeURIComponent(lastKey));
      } catch (e) {
        console.error('Error parsing lastKey:', e);
      }
    }

    const { entries, lastEvaluatedKey: newLastKey, count } = await getEntriesBySeccion(
      seccion,
      limit,
      lastEvaluatedKey
    );

    // Get total count for this sección
    const totalCount = await getCountBySeccion(seccion);

    return NextResponse.json({
      entries,
      lastEvaluatedKey: newLastKey,
      count,
      totalCount,
      hasMore: !!newLastKey,
    });
  } catch (error: any) {
    console.error('Error in GET /api/secciones:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener entradas por sección' },
      { status: 500 }
    );
  }
}
