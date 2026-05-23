import type { Entry } from '@/lib/validation';
import { isFolioQuery, normalizeFolioForLookup } from '@/lib/folio-search';
import { getAlgoliaIndexName } from './config';
import { getAlgoliaSearchClient } from './clients';
import { algoliaHitToEntry } from './entry-record';

/** Search afiliados via Algolia (typo-tolerant names). Folio queries must not use this path. */
export async function searchEntriesAlgolia(query: string, hitsPerPage = 80): Promise<Entry[]> {
  const trimmed = query.trim();
  if (isFolioQuery(trimmed)) {
    throw new Error('Folio search must use exact Dynamo lookup, not Algolia');
  }

  const client = getAlgoliaSearchClient();
  const indexName = getAlgoliaIndexName();
  const res = await client.searchSingleIndex<Record<string, unknown>>({
    indexName,
    searchParams: {
      query: trimmed,
      hitsPerPage,
    },
  });
  const hits = (res.hits ?? []) as Record<string, unknown>[];
  const entries = hits.map((h) => algoliaHitToEntry(h));
  entries.sort((a, b) => {
    const folioA = parseInt(a.folio || '0', 10);
    const folioB = parseInt(b.folio || '0', 10);
    return folioB - folioA;
  });
  return entries;
}
