import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getReportCategory } from '@/lib/report-types';

export default async function ReportarSubcategoryPage({
  params,
}: {
  params: Promise<{ categoria: string }>;
}) {
  const { categoria } = await params;
  const category = getReportCategory(categoria);

  if (!category) notFound();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b-4 border-orange-500 shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-5 py-3 max-w-2xl">
          <div className="flex items-center gap-3">
            <Link
              href="/reportar"
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-all flex-shrink-0"
              aria-label="Regresar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/logo-2.png" alt="Soy Gallardo" className="h-10 w-auto" />
              <span className="text-lg font-extrabold tracking-tight text-gray-900">
                Soy <span className="text-orange-500">Gallardo</span>
              </span>
            </Link>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-5 py-8 max-w-2xl">
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-2">
            {category.emoji} {category.label}
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            ¿Cuál es el detalle?
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Elige la subcategoría que mejor describe el problema.
          </p>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-5 py-6 max-w-2xl">
        <div className="flex flex-col gap-2">
          {category.subcategories.map((subcategory) => (
            <Link
              key={subcategory.id}
              href={`/reportar/${category.id}/${subcategory.id}`}
              className="group flex items-center gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:border-orange-300 hover:shadow-md transition-all duration-150"
            >
              <span className="text-2xl w-11 h-11 flex items-center justify-center rounded-xl bg-gray-50 group-hover:bg-orange-50 transition-colors flex-shrink-0">
                {subcategory.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-gray-900 group-hover:text-orange-600 transition-colors leading-tight">
                  {subcategory.label}
                </p>
              </div>
              <svg
                className="w-5 h-5 text-gray-300 group-hover:text-orange-400 transition-colors flex-shrink-0"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
