import { NextRequest, NextResponse } from 'next/server';
import { getEntriesByLocalidad, getCountByLocalidad } from '@/lib/aws/dynamo';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const localidad = searchParams.get('localidad');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const lastKey = searchParams.get('lastKey');

    if (!localidad) {
      return NextResponse.json(
        { error: 'localidad parameter is required' },
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

    const { entries, lastEvaluatedKey: newLastKey, count } = await getEntriesByLocalidad(
      localidad,
      limit,
      lastEvaluatedKey
    );

    // Get total count for this localidad
    const totalCount = await getCountByLocalidad(localidad);

    return NextResponse.json({
      entries,
      lastEvaluatedKey: newLastKey,
      count,
      totalCount,
      hasMore: !!newLastKey,
    });
  } catch (error: any) {
    console.error('Error in GET /api/localidades:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener entradas por localidad' },
      { status: 500 }
    );
  }
}
