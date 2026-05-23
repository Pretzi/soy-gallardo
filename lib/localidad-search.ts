/** Stored localidad values are uppercase (import + EntryForm). */
export function normalizeLocalidadForLookup(localidad: string): string {
  return localidad.trim().toUpperCase();
}
