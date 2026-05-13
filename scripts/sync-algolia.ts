#!/usr/bin/env npx tsx
/**
 * Full reindex of DynamoDB entries into Algolia.
 *
 * Prerequisites in `.env` or `.env.local` (repository root — run from there), or exported in shell:
 *   ALGOLIA_APPLICATION_ID
 *   ALGOLIA_ADMIN_API_KEY           — must allow addObject, deleteObject, settings
 *   ALGOLIA_ENTRIES_INDEX           — optional, default "entries"
 *
 * Uses ALGOLIA_SEARCH_API_KEY only indirectly (not required here).
 *
 * Usage:
 *   npm run algolia:sync
 */

import './load-env';
import { listEntries } from '../lib/aws/dynamo';
import { getAlgoliaAdminClient } from '../lib/algolia/clients';
import { algoliaAdminConfigured, getAlgoliaIndexName } from '../lib/algolia/config';
import { entryToAlgoliaObject, getDefaultEntriesIndexSettings } from '../lib/algolia/entry-record';

async function main() {
  if (!algoliaAdminConfigured()) {
    console.error('Missing ALGOLIA_APPLICATION_ID or ALGOLIA_ADMIN_API_KEY. Cannot index.');
    process.exit(1);
  }

  const client = getAlgoliaAdminClient();
  const indexName = getAlgoliaIndexName();

  console.log(`Index: "${indexName}" — loading all rows from Dynamo (single scan)...`);
  const { entries } = await listEntries(Number.MAX_SAFE_INTEGER);

  console.log(`Configuring searchable attributes (${entries.length} records)...`);
  await client.setSettings({
    indexName,
    indexSettings: getDefaultEntriesIndexSettings(),
    forwardToReplicas: false,
  });

  console.log('Pushing records to Algolia...');
  const objects = entries.map(entryToAlgoliaObject);
  await client.saveObjects({
    indexName,
    objects,
    waitForTasks: true,
    batchSize: 1000,
  });

  console.log('Done.', entries.length, 'records saved.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
