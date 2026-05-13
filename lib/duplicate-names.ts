import { formatFullName, normalizeForSearch } from '@/lib/validation';
import type { Entry } from '@/lib/validation';

export type EntryNameRow = Pick<Entry, 'id' | 'nombre' | 'segundoNombre' | 'telefono' | 'localidad' | 'createdAt'> &
  Partial<Pick<Entry, 'folio'>> & {
    /** Required in forms; defaulted when missing from legacy rows */
    apellidos: string;
  };

export type ExactDuplicateGroup = {
  normalizedName: string;
  displayNameHint: string;
  entries: EntryNameRow[];
};

export type SimilarNameGroup = {
  entries: EntryNameRow[];
  /** Distinct normalized full names represented in this cluster */
  normalizedVariants: string[];
};

const BUCKET_MAX = 100;

function lev(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const prev = new Array<number>(n + 1);
  const cur = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j]!;
  }
  return prev[n]!;
}

export function normalizedFullName(
  entry: Pick<Entry, 'nombre' | 'segundoNombre' | 'apellidos'>
): string {
  return normalizeForSearch(formatFullName(entry)).toUpperCase().replace(/\s+/g, ' ').trim();
}

function normApellidos(apellidos: string): string {
  return normalizeForSearch(apellidos || '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normNombrePrimer(nombre: string): string {
  const first = (nombre || '').trim().split(/\s+/)[0] || '';
  return normalizeForSearch(first).toUpperCase();
}

/** Max edit distance scales slightly with shorter names (typos matter more when string is tiny). */
function similarThreshold(len: number): number {
  return len <= 6 ? 1 : len <= 12 ? 2 : 3;
}

class UnionFind {
  private readonly p: number[];
  constructor(n: number) {
    this.p = Array.from({ length: n }, (_, i) => i);
  }
  find(i: number): number {
    if (this.p[i] !== i) this.p[i] = this.find(this.p[i]!);
    return this.p[i]!;
  }
  unite(a: number, b: number) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.p[ra] = rb;
  }
}

/** Split oversized index groups into chunks of ≤ BUCKET_MAX, sorted by normalized full name window. */
function chunkIndices(indices: readonly number[], normFullArr: readonly string[]): number[][] {
  if (indices.length <= BUCKET_MAX) return indices.length >= 2 ? [[...indices]] : [];
  const sorted = [...indices].sort((a, b) => {
    const ca = normFullArr[a] || '';
    const cb = normFullArr[b] || '';
    return ca.localeCompare(cb, 'es');
  });
  const out: number[][] = [];
  for (let s = 0; s < sorted.length; s += BUCKET_MAX) {
    const slice = sorted.slice(s, s + BUCKET_MAX);
    if (slice.length >= 2) out.push(slice);
  }
  return out;
}

/**
 * Builds surname buckets, then subdivides by first nombre, then fixes size caps.
 */
function buildPairwiseBuckets(
  n: number,
  surnameKey: string[],
  normFirstName: string[],
  normFullArr: string[]
): number[][] {
  const bySurname = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const k = surnameKey[i]!;
    if (!bySurname.has(k)) bySurname.set(k, []);
    bySurname.get(k)!.push(i);
  }

  const buckets: number[][] = [];

  for (const idxs of bySurname.values()) {
    if (idxs.length < 2) continue;

    if (idxs.length <= BUCKET_MAX) {
      buckets.push(idxs);
      continue;
    }

    const byFirst = new Map<string, number[]>();
    for (const i of idxs) {
      const fk = normFirstName[i]! || '_';
      if (!byFirst.has(fk)) byFirst.set(fk, []);
      byFirst.get(fk)!.push(i);
    }

    for (const sub of byFirst.values()) {
      buckets.push(...chunkIndices(sub, normFullArr));
    }
  }

  return buckets.filter((b) => b.length >= 2);
}

/** Groups with identical normalized full name (Dynamo NAME#… key semantics). */
export function findExactDuplicateGroups(entries: readonly EntryNameRow[]): ExactDuplicateGroup[] {
  const map = new Map<string, EntryNameRow[]>();
  for (const e of entries) {
    const k = normalizedFullName(e);
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(e);
  }
  const groups: ExactDuplicateGroup[] = [];
  for (const [normalizedName, list] of map) {
    if (list.length < 2) continue;
    groups.push({
      normalizedName,
      displayNameHint: formatFullName({
        nombre: list[0]!.nombre,
        segundoNombre: list[0]!.segundoNombre,
        apellidos: list[0]!.apellidos,
      }),
      entries: [...list].sort((a, b) => parseInt(a.folio || '0', 10) - parseInt(b.folio || '0', 10)),
    });
  }
  groups.sort((a, b) => b.entries.length - a.entries.length);
  return groups;
}

/**
 * Clusters entries that share normalized apellidos and have close Levenshtein distance
 * between normalized full names (different strings only — exact dupes omitted here).
 */
export function findSimilarNameGroups(entries: readonly EntryNameRow[]): SimilarNameGroup[] {
  const rows = entries.map((e) => ({
    ...e,
    nf: normalizedFullName(e),
    sa: normApellidos(e.apellidos),
    nfn: normNombrePrimer(e.nombre),
  }));
  const n = rows.length;
  if (n < 2) return [];

  const surnameKeys = rows.map((r) => r.sa || '_UNKNOWN');
  const nfnKeys = rows.map((r) => r.nfn);
  const nfArr = rows.map((r) => r.nf);
  const uf = new UnionFind(n);

  for (const bucket of buildPairwiseBuckets(n, surnameKeys, nfnKeys, nfArr)) {
    const len = bucket.length;
    for (let a = 0; a < len; a++) {
      const ia = bucket[a]!;
      const fra = rows[ia]!;
      const na = fra.nf;
      if (!na) continue;
      for (let b = a + 1; b < len; b++) {
        const ib = bucket[b]!;
        const nb = rows[ib]!.nf;
        if (!nb || na === nb) continue;
        const maxLen = Math.max(na.length, nb.length);
        const thresh = similarThreshold(maxLen);
        if (lev(na, nb) <= thresh) {
          uf.unite(ia, ib);
        }
      }
    }
  }

  const components = new Map<number, typeof rows>();
  for (let i = 0; i < n; i++) {
    const r = uf.find(i);
    if (!components.has(r)) components.set(r, []);
    components.get(r)!.push(rows[i]!);
  }

  const groups: SimilarNameGroup[] = [];
  for (const list of components.values()) {
    if (list.length < 2) continue;
    const variantSet = new Set(list.map((r) => r.nf).filter(Boolean));
    if (variantSet.size <= 1) continue;
    const sorted = [...list].sort((a, b) => parseInt(a.folio || '0', 10) - parseInt(b.folio || '0', 10));
    groups.push({
      entries: sorted.map(({ nf: _nf, sa: _sa, nfn: _nfn, ...rest }) => rest),
      normalizedVariants: [...variantSet].sort(),
    });
  }

  groups.sort((a, b) => {
    const d = b.entries.length - a.entries.length;
    if (d !== 0) return d;
    return (a.normalizedVariants[0] || '').localeCompare(b.normalizedVariants[0] || '', 'es');
  });
  return groups;
}

export function analyzeDuplicatesAndSimilar(entries: readonly EntryNameRow[]): {
  exactGroups: ExactDuplicateGroup[];
  similarGroups: SimilarNameGroup[];
  totalEntries: number;
} {
  return {
    exactGroups: findExactDuplicateGroups(entries),
    similarGroups: findSimilarNameGroups(entries),
    totalEntries: entries.length,
  };
}
