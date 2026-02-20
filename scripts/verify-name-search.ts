/**
 * Verification Script: Test name search with new entries
 *
 * Creates a test entry with accented name (Germán), searches by "German",
 * verifies the fix works, then cleans up.
 *
 * Usage: npx tsx scripts/verify-name-search.ts
 */

import {
  createEntry,
  searchEntries,
  deleteEntry,
  getLatestFolio,
} from '../lib/aws/dynamo';

async function verify() {
  console.log('🔍 Verifying name search fix for new users...\n');

  let testEntryId: string | null = null;

  try {
    // 1. Get next folio for test entry (getLatestFolio returns next available)
    const testFolio = await getLatestFolio();

    // 2. Create test entry with accented name
    console.log('📝 Step 1: Creating test entry "Germán Test Verificación"...');
    const created = await createEntry({
      folio: testFolio,
      nombre: 'Germán',
      segundoNombre: 'Test',
      apellidos: 'Verificación',
    });
    testEntryId = created.id;
    console.log(`   ✅ Created entry ${created.id} (folio: ${testFolio})\n`);

    // 3. Search by "German" (without accent) - should find it
    console.log('🔎 Step 2: Searching for "German" (without accent)...');
    const resultsGerman = await searchEntries('German');
    const foundByGerman = resultsGerman.some((e) => e.id === testEntryId);
    if (foundByGerman) {
      console.log(`   ✅ Found by "German" - ${resultsGerman.length} result(s)\n`);
    } else {
      console.log(`   ❌ FAIL: Not found by "German". Got ${resultsGerman.length} results.\n`);
      process.exit(1);
    }

    // 4. Search by "Germán" (with accent) - should also find it
    console.log('🔎 Step 3: Searching for "Germán" (with accent)...');
    const resultsGermanAccent = await searchEntries('Germán');
    const foundByAccent = resultsGermanAccent.some((e) => e.id === testEntryId);
    if (foundByAccent) {
      console.log(`   ✅ Found by "Germán" - ${resultsGermanAccent.length} result(s)\n`);
    } else {
      console.log(`   ❌ FAIL: Not found by "Germán". Got ${resultsGermanAccent.length} results.\n`);
      process.exit(1);
    }

    // 5. Search by "Verificacion" (without accent) - should find it
    console.log('🔎 Step 4: Searching for "Verificacion" (without ñ)...');
    const resultsVerificacion = await searchEntries('Verificacion');
    const foundByVerificacion = resultsVerificacion.some((e) => e.id === testEntryId);
    if (foundByVerificacion) {
      console.log(`   ✅ Found by "Verificacion" - ${resultsVerificacion.length} result(s)\n`);
    } else {
      console.log(`   ❌ FAIL: Not found by "Verificacion". Got ${resultsVerificacion.length} results.\n`);
      process.exit(1);
    }

    console.log('='.repeat(50));
    console.log('✅ All verification checks passed!');
    console.log('   Name search works for new entries with/without accents.');
    console.log('='.repeat(50));
  } finally {
    // Cleanup: delete test entry
    if (testEntryId) {
      console.log('\n🧹 Cleaning up: deleting test entry...');
      await deleteEntry(testEntryId);
      console.log('   ✅ Test entry deleted.\n');
    }
  }
}

verify()
  .then(() => {
    console.log('✨ Verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
