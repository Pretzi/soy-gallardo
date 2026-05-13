import type { Entry } from '@/lib/validation';
import { getAlgoliaIndexName } from './config';
import { getAlgoliaSearchClient } from './clients';
import { algoliaHitToEntry } from './entry-record';

/** Search afiliados via Algolia (typo-tolerant names and folio substring). */
export async function searchEntriesAlgolia(query: string, hitsPerPage = 80): Promise<Entry[]> {
  const client = getAlgoliaSearchClient();
  const indexName = getAlgoliaIndexName();
  const res = await client.searchSingleIndex<Record<string, unknown>>({
    indexName,
    searchParams: {
      query: query.trim(),
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
