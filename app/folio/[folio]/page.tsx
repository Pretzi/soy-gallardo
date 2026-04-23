import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getReporteByFolio } from '@/lib/aws/reportes';
import { REPORT_TYPES } from '@/lib/report-types';

const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  resuelto: 'Resuelto',
  cancelado: 'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  en_proceso: 'bg-blue-100 text-blue-800 border-blue-200',
  resuelto: 'bg-green-100 text-green-800 border-green-200',
  cancelado: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STEPS = ['pendiente', 'en_proceso', 'resuelto'] as const;

const STEP_LABEL: Record<string, string> = {
  pendiente: 'Recibido',
  en_proceso: 'En proceso',
  resuelto: 'Resuelto',
};

export default async function FolioPage({
  params,
}: {
  params: Promise<{ folio: string }>;
}) {
  const { folio } = await params;
  const reporte = await getReporteByFolio(folio);

  if (!reporte) notFound();

  const tipo = REPORT_TYPES.find((t) => t.id === reporte.tipo);
  const isCancelled = reporte.estado === 'cancelado';
  const currentStep = STEPS.indexOf(reporte.estado as (typeof STEPS)[number]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b-4 border-orange-500 shadow-sm">
        <div className="container mx-auto px-5 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo-2.png" alt="Soy Gallardo" className="h-11 w-auto" />
              <span className="text-xl font-extrabold tracking-tight text-gray-900">
                Soy <span className="text-orange-500">Gallardo</span>
              </span>
            </Link>
            <Link href="/municipio" className="text-xs font-semibold text-gray-700 hover:text-orange-500 transition-colors">
              Mi municipio
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-5 py-8 max-w-lg flex flex-col gap-4">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Inicio
        </Link>

        {/* Report card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Top accent */}
          <div className="h-1.5 bg-orange-500" />

          <div className="p-6">
            {/* Type + status */}
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{tipo?.emoji || '📋'}</span>
                <div>
                  <p className="text-sm text-gray-500 font-medium">
                    {tipo?.label || reporte.tipo}
                  </p>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">{reporte.folio}</p>
                </div>
              </div>
              <span
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap ${
                  STATUS_COLOR[reporte.estado] || 'bg-gray-100 text-gray-600'
                }`}
              >
                {STATUS_LABEL[reporte.estado] || reporte.estado}
              </span>
            </div>

            {/* Progress */}
            {!isCancelled && (
              <div className="mb-6">
                <div className="flex items-center">
                  {STEPS.map((step, i) => {
                    const done = i <= currentStep;
                    const active = i === currentStep;
                    return (
                      <div key={step} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${
                              done
                                ? 'bg-orange-500 border-orange-500'
                                : 'bg-white border-gray-200'
                            }`}
                          >
                            {done && (
                              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span
                            className={`text-xs whitespace-nowrap ${
                              active ? 'font-bold text-orange-500' : done ? 'text-gray-600' : 'text-gray-400'
                            }`}
                          >
                            {STEP_LABEL[step]}
                          </span>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div
                            className={`flex-1 h-0.5 mx-1 mb-4 rounded ${
                              i < currentStep ? 'bg-orange-500' : 'bg-gray-200'
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Details */}
            <div className="space-y-3 text-sm border-t border-gray-50 pt-4">
              <div className="flex gap-2">
                <span className="text-gray-400 w-20 shrink-0">Ubicación</span>
                <span className="text-gray-800 font-medium">
                  {reporte.calle}
                  {reporte.colonia ? `, ${reporte.colonia}` : ''}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-400 w-20 shrink-0">Enviado</span>
                <span className="text-gray-800">
                  {new Date(reporte.createdAt).toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              {reporte.updatedAt !== reporte.createdAt && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20 shrink-0">Actualizado</span>
                  <span className="text-gray-800">
                    {new Date(reporte.updatedAt).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
              {reporte.notasAdmin && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20 shrink-0">Nota</span>
                  <span className="text-gray-800">{reporte.notasAdmin}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Otro reporte */}
        <Link
          href="/reportar"
          className="block text-center py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-colors text-sm"
        >
          Hacer otro reporte
        </Link>
      </main>

      <footer className="py-6 text-center text-xs text-gray-300 border-t border-gray-100 bg-white mt-auto">
        © {new Date().getFullYear()} Regiduría Quinta · Municipio de Tierra Blanca, Veracruz
      </footer>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ folio: string }>;
}) {
  const { folio } = await params;
  return {
    title: `Reporte ${folio.toUpperCase()} · Soy Gallardo`,
  };
}
