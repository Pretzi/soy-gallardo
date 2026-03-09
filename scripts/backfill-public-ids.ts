#!/usr/bin/env node
/**
 * Backfill publicId for existing entries that don't have one.
 * Run once after deploying the unique member URL feature:
 *   npx tsx scripts/backfill-public-ids.ts
 */

import { listEntries, updateEntry, generatePublicId } from '../lib/aws/dynamo';

async function backfill() {
  console.log('Backfilling publicId for entries...\n');

  let total = 0;
  let updated = 0;
  let lastKey: Record<string, unknown> | undefined;

  do {
    const { entries, lastEvaluatedKey } = await listEntries(100, lastKey);
    total += entries.length;

    for (const entry of entries) {
      if ((entry as { publicId?: string }).publicId) continue;
      try {
        await updateEntry(entry.id, { publicId: generatePublicId() });
        updated++;
        console.log(`  ✓ ${entry.folio} (${entry.id})`);
      } catch (err) {
        console.error(`  ✗ ${entry.folio}:`, err);
      }
    }

    lastKey = lastEvaluatedKey;
  } while (lastKey);

  console.log(`\n✅ Done. Processed ${total} entries, assigned publicId to ${updated}.`);
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
