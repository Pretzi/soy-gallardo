import Link from 'next/link';

export default function MunicipioPage() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Floating top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-4 bg-white/90 backdrop-blur-sm border-b border-white/20 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/logo-2.png" alt="Soy Gallardo" className="h-9 w-auto" />
          <div>
            <p className="text-sm font-extrabold text-gray-900 leading-none">Mi municipio</p>
            <p className="text-xs text-gray-400 mt-0.5">Tierra Blanca, Veracruz</p>
          </div>
        </div>
        <Link
          href="/"
          className="text-xs font-semibold text-gray-500 hover:text-orange-500 transition-colors bg-gray-100 hover:bg-orange-50 px-3 py-1.5 rounded-full"
        >
          ← Regresar
        </Link>
      </div>

      {/* Fullscreen map */}
      <iframe
        title="Mapa Tierra Blanca, Veracruz"
        src="https://www.openstreetmap.org/export/embed.html?bbox=-96.4569%2C18.3557%2C-96.2569%2C18.5557&layer=mapnik&marker=18.4557%2C-96.3569"
        className="w-full h-full border-0"
        loading="lazy"
      />

      {/* Floating bottom attribution */}
      <div className="absolute bottom-4 right-4 z-10 text-xs text-gray-500 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full">
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500">OpenStreetMap</a>
      </div>
    </div>
  );
}
