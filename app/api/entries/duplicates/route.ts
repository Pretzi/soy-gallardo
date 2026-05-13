import { NextResponse } from 'next/server';
import { scanEntriesForDuplicateAnalysis } from '@/lib/aws/dynamo';
import { analyzeDuplicatesAndSimilar } from '@/lib/duplicate-names';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const slices = await scanEntriesForDuplicateAnalysis();
    const { exactGroups, similarGroups, totalEntries } = analyzeDuplicatesAndSimilar(slices);
    return NextResponse.json({
      totalEntries,
      exactGroupCount: exactGroups.length,
      similarGroupCount: similarGroups.length,
      exactGroups,
      similarGroups,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/entries/duplicates:', error);
    const message = error instanceof Error ? error.message : 'Error al analizar duplicados';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
