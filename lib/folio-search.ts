/** True when the query is digits-only (treated as folio, not name). */
export function isFolioQuery(query: string): boolean {
  return /^\d+$/.test(query.trim());
}

/** Pad numeric folio to 6 digits (000001), matching stored Dynamo/CSV format. */
export function normalizeFolioForLookup(query: string): string {
  const digits = query.trim();
  if (!/^\d+$/.test(digits)) return digits;
  if (digits.length >= 6) return digits;
  return digits.padStart(6, '0');
}
