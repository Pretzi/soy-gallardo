import Link from 'next/link';
import { FolioSearch } from '@/components/FolioSearch';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b-4 border-orange-500 shadow-sm">
        <div className="container mx-auto px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo-2.png" alt="Soy Gallardo" className="h-11 w-auto" />
              <span className="text-xl font-extrabold tracking-tight text-gray-900">
                Soy <span className="text-orange-500">Gallardo</span>
              </span>
            </div>
            <Link href="/municipio" className="text-xs font-semibold text-gray-700 hover:text-orange-500 transition-colors">
              Mi municipio
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-5 py-10 md:py-14 text-center max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 text-xs font-semibold px-3 py-1 rounded-full mb-5 border border-orange-100">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            Municipio de Tierra Blanca, Ver.
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
            Reporta problemas<br className="hidden md:block" /> en tu municipio
          </h2>
          <p className="text-gray-600 text-sm md:text-base max-w-lg mx-auto mb-4 leading-relaxed">
            Recibimos tu reporte, generamos un documento oficial y lo presentamos sellado directamente en Presidencia Municipal para su resolución.
          </p>
          <p className="text-gray-400 text-xs">
            Regiduría Quinta al mando de<br /><span className="font-semibold text-gray-600">Arturo Gallardo Cano 🤠</span>
          </p>
        </div>
      </section>

      {/* CTA Cards */}
      <section className="container mx-auto px-5 py-8 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Hacer un reporte */}
          <Link
            href="/reportar"
            className="group flex flex-col gap-3 p-6 rounded-2xl bg-orange-500 hover:bg-orange-600 transition-colors cursor-pointer shadow-sm"
          >
            <div>
              <p className="text-white font-extrabold text-lg leading-tight">Hacer un reporte</p>
              <p className="text-orange-100 text-sm mt-1">Reporta un problema en calles, servicios o espacios públicos.</p>
            </div>
            <span className="text-white text-sm font-semibold mt-auto">Iniciar →</span>
          </Link>

          {/* Consultar folio */}
          <div className="flex flex-col gap-4 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div>
              <p className="text-gray-900 font-extrabold text-lg leading-tight">Consultar folio</p>
              <p className="text-gray-500 text-sm mt-1">Ingresa tu número de folio para ver el estado de tu reporte.</p>
            </div>
            <FolioSearch />
          </div>

        </div>
      </section>

      {/* Map section */}
      <section className="bg-gray-50 border-t border-gray-100">
        <div className="container mx-auto px-5 py-8 max-w-2xl">
          <h3 className="text-lg font-extrabold text-gray-900 mb-1">Reportes en tu municipio</h3>
          <p className="text-gray-500 text-sm mb-5">Zona de atención: Tierra Blanca, Veracruz.</p>
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <iframe
              title="Mapa Tierra Blanca, Veracruz"
              src={`https://www.google.com/maps/embed/v1/view?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&center=18.4557,-96.3569&zoom=13&maptype=roadmap`}
              width="100%"
              height="340"
              className="w-full block"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-gray-300 border-t border-gray-100 bg-white">
        © {new Date().getFullYear()} Regiduría Quinta · Municipio de Tierra Blanca, Veracruz
      </footer>
    </div>
  );
}
