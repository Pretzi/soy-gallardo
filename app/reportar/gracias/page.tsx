'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useState } from 'react';

function GraciasContent() {
  const params = useSearchParams();
  const folio = params.get('folio') || '';
  const id = params.get('id') || '';
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [imgError, setImgError] = useState(false);

  const imageUrl = id ? `/api/reportes/${id}/imagen` : null;

  const copyFolio = async () => {
    try {
      await navigator.clipboard.writeText(folio);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    if (!imageUrl) return;
    setSharing(true);
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], `reporte-${folio}.jpg`, { type: 'image/jpeg' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Reporte ciudadano ${folio}`,
          text: 'Reporte enviado al Municipio de Tierra Blanca, Ver.',
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-${folio}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch { /* ignore share cancel */ } finally {
      setSharing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-0 py-0">
      <div className="w-full max-w-sm mx-auto text-center px-5 py-10">
        {/* Animated checkmark */}
        <svg
          className="w-14 h-14 mx-auto mb-6"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="32" cy="32" r="30" stroke="#f97316" strokeWidth="3" />
          <path
            d="M18 32 L28 42 L46 22"
            stroke="#f97316"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 40,
              strokeDashoffset: 0,
              animation: 'draw 0.4s ease-out 0.15s both',
            }}
          />
        </svg>
        <style>{`
          @keyframes draw {
            from { stroke-dashoffset: 40; }
            to { stroke-dashoffset: 0; }
          }
        `}</style>

        <h1 className="text-2xl font-black text-black mb-2">Reporte enviado</h1>
        <p className="text-neutral-400 text-sm mb-8">
          Lo atenderemos a la brevedad.
        </p>

        {folio && (
          <div className="mb-8">
            <p className="text-xs text-neutral-400 uppercase tracking-widest mb-3">Tu folio</p>
            <button
              onClick={copyFolio}
              className="group flex items-center justify-center gap-3 mx-auto"
            >
              <span className="text-2xl font-mono font-black text-black tracking-widest">
                {folio}
              </span>
              <span className="text-neutral-300 group-hover:text-orange-500 transition-colors">
                {copied ? (
                  <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </span>
            </button>
            <p className="text-xs text-neutral-300 mt-2">Toca para copiar</p>
          </div>
        )}

        {imageUrl && !imgError && (
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center justify-center gap-2 w-full py-4 bg-black hover:bg-neutral-800 text-white font-bold rounded-2xl transition-colors text-sm mb-3 disabled:opacity-60"
          >
            {sharing ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            )}
            {sharing ? 'Preparando...' : 'Compartir reporte'}
          </button>
        )}

        <Link
          href="/"
          className="block w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-colors text-sm"
        >
          Reportar otro problema
        </Link>
      </div>

      {/* Share image preview — below buttons */}
      {imageUrl && !imgError && (
        <div className="w-full max-w-sm mx-auto pb-10 px-5">
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Imagen del reporte"
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function GraciasPage() {
  return (
    <Suspense>
      <GraciasContent />
    </Suspense>
  );
}
