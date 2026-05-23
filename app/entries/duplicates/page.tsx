import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { scanEntriesForDuplicateAnalysis } from '@/lib/aws/dynamo';
import { analyzeDuplicatesAndSimilar, normalizedFullName } from '@/lib/duplicate-names';
import type { ExactDuplicateGroup, SimilarNameGroup } from '@/lib/duplicate-names';
import type { Entry } from '@/lib/validation';
import { formatFullName } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Posibles duplicados | Soy Gallardo',
  description: 'Entradas con el mismo nombre normalizado o nombres parecidos.',
};

function displayName(entry: Pick<Entry, 'nombre' | 'segundoNombre' | 'apellidos'>): string {
  return formatFullName(entry).trim();
}

function EntryRow(props: {
  entry: ExactDuplicateGroup['entries'][number] | SimilarNameGroup['entries'][number];
}) {
  const { entry } = props;
  return (
    <tr className="hover:bg-orange-50/70 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-orange-700 whitespace-nowrap">
        <Link href={`/entries/${entry.id}`} className="underline-offset-2 hover:underline">
          {entry.folio || '—'}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-gray-900">{displayName(entry)}</td>
      <td className="px-4 py-3 text-xs text-gray-500 font-mono break-all">{normalizedFullName(entry)}</td>
      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{entry.telefono || '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-700">{entry.localidad || '—'}</td>
      <td className="px-4 py-3 text-sm whitespace-nowrap">
        <Link href={`/entries/${entry.id}`} className="text-orange-600 hover:text-orange-800 font-medium">
          Ver →
        </Link>
      </td>
    </tr>
  );
}

function CardBlock(props: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden mb-10">
      <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
        <h2 className="text-lg font-bold text-gray-900">{props.title}</h2>
        <p className="text-sm text-gray-600 mt-1">{props.subtitle}</p>
      </div>
      <div className="p-4 md:p-6">{props.children}</div>
    </section>
  );
}

export default async function EntriesDuplicatesPage() {
  const rows = await scanEntriesForDuplicateAnalysis();
  const { exactGroups, similarGroups, totalEntries } = analyzeDuplicatesAndSimilar(rows);

  const exactAffected = exactGroups.reduce((acc, g) => acc + g.entries.length, 0);
  const similarAffected = similarGroups.reduce((acc, g) => acc + g.entries.length, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm font-medium text-orange-600 uppercase tracking-wide">Calidad de datos</p>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">Duplicados y nombres parecidos</h1>
          </div>
          <Link
            href="/entries"
            className="inline-flex items-center justify-center rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 shadow-sm shrink-0"
          >
            ← Volver al listado
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
          <div className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase">Total analizado</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalEntries}</p>
          </div>
          <div className="rounded-lg bg-orange-50 border border-orange-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-orange-900 uppercase">Grupos idénticos</p>
            <p className="text-2xl font-bold text-orange-900 mt-1">{exactGroups.length}</p>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-amber-900 uppercase">Grupos parecidos</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">{similarGroups.length}</p>
          </div>
          <div className="rounded-lg bg-gray-100 border border-gray-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-600 uppercase">Registros en conflicto</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{exactAffected + similarAffected}</p>
            <p className="text-xs text-gray-500 mt-1">puede solaparse entre secciones</p>
          </div>
        </div>

        <CardBlock
          title="Nombre idéntico (normalizado)"
          subtitle="Dos o más entradas con el mismo texto de nombre después de normalizar. Probable duplicado real."
        >
          {exactGroups.length === 0 ? (
            <p className="text-gray-600">No hay grupos con el mismo nombre normalizado.</p>
          ) : (
            <div className="space-y-8">
              {exactGroups.map((group) => (
                <div key={group.normalizedName}>
                  <p className="text-sm font-semibold text-gray-800 mb-2">
                    Clave{' '}
                    <span className="font-mono text-xs md:text-sm text-orange-700 break-all">
                      {group.normalizedName}
                    </span>
                    <span className="text-gray-600 font-normal"> — {group.entries.length} registros</span>
                  </p>
                  <div className="hidden md:block rounded-md border border-gray-200 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                        <tr>
                          <th className="px-4 py-2 font-semibold">Folio</th>
                          <th className="px-4 py-2 font-semibold">Nombre en captura</th>
                          <th className="px-4 py-2 font-semibold">Normalizado</th>
                          <th className="px-4 py-2 font-semibold">Teléfono</th>
                          <th className="px-4 py-2 font-semibold">Comunidad</th>
                          <th className="px-4 py-2 font-semibold" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {group.entries.map((e) => (
                          <EntryRow key={e.id} entry={e} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden space-y-3">
                    {group.entries.map((e) => (
                      <div key={e.id} className="rounded-lg border border-gray-200 p-3 bg-gray-50/50">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="text-xs font-semibold text-gray-500">Folio</p>
                            <Link href={`/entries/${e.id}`} className="text-lg font-bold text-orange-600">
                              {e.folio || '—'}
                            </Link>
                          </div>
                          <Link
                            href={`/entries/${e.id}`}
                            className="text-sm text-orange-600 font-medium shrink-0"
                          >
                            Ver →
                          </Link>
                        </div>
                        <p className="text-base font-medium text-gray-900 mt-2">{displayName(e)}</p>
                        <p className="text-xs font-mono text-gray-600 mt-1 break-all">{normalizedFullName(e)}</p>
                        <div className="flex gap-4 mt-2 text-sm text-gray-700">
                          <span>{e.telefono || 'Sin tel.'}</span>
                          <span>{e.localidad || ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBlock>

        <CardBlock
          title="Nombres parecidos"
          subtitle="Mismo apellido normalizado y nombre completo que difiere sólo por pocos caracteres (revisión manual recomendada)."
        >
          {similarGroups.length === 0 ? (
            <p className="text-gray-600">
              No se detectaron otros grupos bajo estos criterios. Si aparecen más datos, ejecuta esta vista de
              nuevo.
            </p>
          ) : (
            <div className="space-y-8">
              {similarGroups.map((group, gi) => (
                <div key={`similar-${gi}-${group.entries[0]?.id ?? ''}`}>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Variantes normalizadas</p>
                  <ul className="text-xs md:text-sm font-mono text-gray-800 mb-3 space-y-1 break-all">
                    {group.normalizedVariants.map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                  <div className="hidden md:block rounded-md border border-gray-200 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                        <tr>
                          <th className="px-4 py-2 font-semibold">Folio</th>
                          <th className="px-4 py-2 font-semibold">Nombre en captura</th>
                          <th className="px-4 py-2 font-semibold">Normalizado</th>
                          <th className="px-4 py-2 font-semibold">Teléfono</th>
                          <th className="px-4 py-2 font-semibold">Comunidad</th>
                          <th className="px-4 py-2 font-semibold" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {group.entries.map((e) => (
                          <EntryRow key={e.id} entry={e} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden space-y-3">
                    {group.entries.map((e) => (
                      <div key={e.id} className="rounded-lg border border-gray-200 p-3 bg-gray-50/50">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className="text-xs font-semibold text-gray-500">Folio</p>
                            <Link href={`/entries/${e.id}`} className="text-lg font-bold text-orange-600">
                              {e.folio || '—'}
                            </Link>
                          </div>
                          <Link
                            href={`/entries/${e.id}`}
                            className="text-sm text-orange-600 font-medium shrink-0"
                          >
                            Ver →
                          </Link>
                        </div>
                        <p className="text-base font-medium text-gray-900 mt-2">{displayName(e)}</p>
                        <p className="text-xs font-mono text-gray-600 mt-1 break-all">{normalizedFullName(e)}</p>
                        <div className="flex gap-4 mt-2 text-sm text-gray-700">
                          <span>{e.telefono || 'Sin tel.'}</span>
                          <span>{e.localidad || ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBlock>
      </div>
    </div>
  );
}
