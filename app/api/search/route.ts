import { NextRequest, NextResponse } from 'next/server';
import { searchEntries } from '@/lib/aws/dynamo';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Parámetro de búsqueda "q" es requerido' },
        { status: 400 }
      );
    }

    const entries = await searchEntries(query.trim());

    return NextResponse.json({ entries });
  } catch (error: any) {
    console.error('Error in GET /api/search:', error);
    return NextResponse.json(
      { error: error.message || 'Error al buscar entradas' },
      { status: 500 }
    );
  }
}
