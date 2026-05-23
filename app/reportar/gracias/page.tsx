'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useState, useEffect } from 'react';
import { SignaturePad } from '@/components/SignaturePad';

function GraciasContent() {
  const params = useSearchParams();
  const folio = params.get('folio') || '';
  const id = params.get('id') || '';
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [oficioFirmado, setOficioFirmado] = useState(false);
  const [oficioFirmadoAt, setOficioFirmadoAt] = useState<string | null>(null);

  const imageUrl = id ? `/api/reportes/${id}/imagen` : null;

  useEffect(() => {
    if (!id) return;
    fetch(`/api/reportes/${id}/oficio`)
      .then((r) => r.json())
      .then((d) => {
        if (d.oficioFirmado) {
          setOficioFirmado(true);
          setOficioFirmadoAt(d.oficioFirmadoAt);
        }
      })
      .catch(() => {});
  }, [id]);

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

  const handleDownloadPdf = async () => {
    if (!id || !signature) return;
    setDownloadingPdf(true);
    try {
      const res = await fetch(`/api/reportes/${id}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureDataUrl: signature }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `oficio-${folio}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setOficioFirmado(true);
      setOficioFirmadoAt(new Date().toISOString());
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo descargar el oficio. Intenta de nuevo.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleRedownloadPdf = () => {
    if (!id) return;
    window.open(`/api/reportes/${id}/pdf`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-0 py-0">
      <div className="w-full max-w-sm mx-auto text-center px-5 py-10">
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

        {id && (
          <div className="mb-6 text-left">
            <p className="text-xs text-neutral-400 uppercase tracking-widest mb-3 text-center">
              Oficio formal
            </p>

            {oficioFirmado ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 text-center">
                <p className="text-sm font-bold text-green-800">Oficio firmado</p>
                {oficioFirmadoAt && (
                  <p className="text-xs text-green-600 mt-1">
                    {new Date(oficioFirmadoAt).toLocaleString('es-MX', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleRedownloadPdf}
                  className="mt-3 text-sm font-semibold text-green-700 hover:text-green-900 underline"
                >
                  Volver a descargar PDF
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-700 mb-1 text-center font-semibold">
                  Firma para descargar el oficio
                </p>
                <p className="text-sm text-gray-500 mb-4 text-center">
                  El documento se dirige al Presidente Municipal y al director correspondiente. Debes firmar antes de descargarlo.
                </p>
                <SignaturePad onChange={setSignature} className="mb-3" />
                {!signature && (
                  <p className="text-xs text-amber-600 text-center mb-3">
                    Dibuja tu firma arriba para habilitar la descarga
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={!signature || downloadingPdf}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {downloadingPdf ? 'Generando PDF...' : 'Descargar oficio firmado'}
                </button>
              </>
            )}
          </div>
        )}

        {imageUrl && !imgError && (
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center justify-center gap-2 w-full py-4 bg-black hover:bg-neutral-800 text-white font-bold rounded-2xl transition-colors text-sm mb-3 disabled:opacity-60"
          >
            {sharing ? 'Preparando...' : 'Compartir reporte'}
          </button>
        )}

        <Link
          href="/"
          className="block w-full py-4 bg-white border border-gray-200 hover:border-orange-300 text-gray-800 font-bold rounded-2xl transition-colors text-sm"
        >
          Reportar otro problema
        </Link>
      </div>

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
