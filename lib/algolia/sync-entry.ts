import type { Entry } from '@/lib/validation';
import { algoliaAdminConfigured, getAlgoliaIndexName } from './config';
import { getAlgoliaAdminClient } from './clients';
import { entryToAlgoliaObject } from './entry-record';

/**
 * Upserts a single entry into Algolia when admin env is set. Swallows errors after logging
 * so Dynamo remains the source of truth if Algolia is flaky.
 */
export async function syncEntryToAlgolia(entry: Entry): Promise<void> {
  if (!algoliaAdminConfigured()) return;
  try {
    const client = getAlgoliaAdminClient();
    const indexName = getAlgoliaIndexName();
    await client.saveObjects({
      indexName,
      objects: [entryToAlgoliaObject(entry)],
      waitForTasks: false,
    });
  } catch (e) {
    console.error('[algolia] syncEntryToAlgolia failed', e);
  }
}

export async function removeEntryFromAlgolia(entryId: string): Promise<void> {
  if (!algoliaAdminConfigured()) return;
  try {
    const client = getAlgoliaAdminClient();
    const indexName = getAlgoliaIndexName();
    await client.deleteObjects({
      indexName,
      objectIDs: [entryId],
      waitForTasks: false,
    });
  } catch (e) {
    console.error('[algolia] removeEntryFromAlgolia failed', e);
  }
}
