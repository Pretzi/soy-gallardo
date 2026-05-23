import { NextRequest, NextResponse } from 'next/server';
import { getEntryByFolio, searchEntries } from '@/lib/aws/dynamo';
import { algoliaSearchConfigured } from '@/lib/algolia/config';
import { searchEntriesAlgolia } from '@/lib/algolia/search';
import { isFolioQuery, normalizeFolioForLookup } from '@/lib/folio-search';

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

    const q = query.trim();
    let entries;

    // Folio lookups are always exact (Dynamo GSI1) — never Algolia fuzzy
    if (isFolioQuery(q)) {
      const entry = await getEntryByFolio(normalizeFolioForLookup(q));
      entries = entry ? [entry] : [];
    } else if (algoliaSearchConfigured()) {
      try {
        entries = await searchEntriesAlgolia(q);
      } catch (algoliaErr) {
        console.warn('Algolia search failed, using Dynamo:', algoliaErr);
        entries = await searchEntries(q);
      }
    } else {
      entries = await searchEntries(q);
    }

    return NextResponse.json({ entries });
  } catch (error: any) {
    console.error('Error in GET /api/search:', error);
    return NextResponse.json(
      { error: error.message || 'Error al buscar entradas' },
      { status: 500 }
    );
  }
}
