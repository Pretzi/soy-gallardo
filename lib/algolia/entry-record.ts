import type { Entry } from '@/lib/validation';
import { formatFullName } from '@/lib/validation';

function stripAlgoliaHitMeta(hit: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(hit)) {
    if (k.startsWith('_')) continue;
    out[k] = v;
  }
  delete out.objectID;
  return out;
}

/** Drop undefined so Algolia payloads stay JSON-clean. */
export function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] === undefined) delete out[k];
  }
  return out as T;
}

/** Record shape sent to Algolia (objectID doubles as entry id). */
export function entryToAlgoliaObject(entry: Entry): Record<string, unknown> {
  return stripUndefined({
    objectID: entry.id,
    ...entry,
    nombreCompleto: formatFullName(entry),
  }) as Record<string, unknown>;
}

export function algoliaHitToEntry(hit: Record<string, unknown>): Entry {
  return stripAlgoliaHitMeta(hit) as Entry;
}

export function getDefaultEntriesIndexSettings(): {
  searchableAttributes: string[];
  customRanking: string[];
} {
  return {
    searchableAttributes: [
      'folio',
      'nombre',
      'segundoNombre',
      'apellidos',
      'nombreCompleto',
      'telefono',
      'localidad',
      'seccionElectoral',
      'casilla',
      'zona',
      'cargo',
    ],
    customRanking: ['desc(updatedAt)', 'desc(createdAt)'],
  };
}
