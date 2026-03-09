'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import Confetti from 'react-confetti';
import type { Entry } from '@/lib/validation';
import { formatFullName } from '@/lib/validation';

const VERIFIED_PARAM = 'verified';

export default function MemberPublicPage({
  params,
}: {
  params: Promise<{ identifier: string }>;
}) {
  const { identifier } = use(params);
  const searchParams = useSearchParams();
  const [member, setMember] = useState<Entry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageUrl, setPageUrl] = useState<string>('');
  const [showVerified, setShowVerified] = useState(false);
  const verifiedShownRef = useRef(false);

  useEffect(() => {
    setPageUrl(
      typeof window !== 'undefined'
        ? `${window.location.origin}/members/${identifier}?${VERIFIED_PARAM}=1`
        : ''
    );
  }, [identifier]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/members/${encodeURIComponent(identifier)}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Miembro no encontrado');
        }
        const data = await res.json();
        if (!cancelled) setMember(data);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Error al cargar');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [identifier]);

  // When page is opened with ?verified=1 (e.g. from QR scan), show verification animation once
  useEffect(() => {
    if (!member || verifiedShownRef.current) return;
    const isVerified = searchParams.get(VERIFIED_PARAM) === '1';
    if (!isVerified) return;

    verifiedShownRef.current = true;
    setShowVerified(true);

    const t = setTimeout(() => {
      setShowVerified(false);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete(VERIFIED_PARAM);
        window.history.replaceState({}, '', url.pathname + (url.search || ''));
      }
    }, 4500);

    return () => clearTimeout(t);
  }, [member, searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div
          className="w-10 h-10 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin"
          aria-hidden
        />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-base md:text-lg text-gray-800 font-medium">
            {error || 'Miembro no encontrado'}
          </p>
        </div>
      </div>
    );
  }

  const fullName = formatFullName({
    nombre: member.nombre,
    segundoNombre: member.segundoNombre,
    apellidos: member.apellidos,
  });

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Verification overlay when opened with ?verified=1 */}
      {showVerified && (
        <>
          <Confetti
            width={typeof window !== 'undefined' ? window.innerWidth : 300}
            height={typeof window !== 'undefined' ? window.innerHeight : 400}
            recycle={false}
            numberOfPieces={300}
            gravity={0.3}
            colors={['#22c55e', '#16a34a', '#f97316', '#ea580c', '#ffffff']}
          />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            style={{ animation: 'verifiedFadeIn 0.3s ease-out' }}
            aria-live="polite"
            aria-label="Membresía verificada"
          >
            <div
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center"
              style={{ animation: 'verifiedZoomIn 0.5s ease-out' }}
            >
              <div
                className="mx-auto w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mb-6 shadow-lg shadow-green-500/40"
                style={{ animation: 'verifiedZoomIn 0.6s ease-out 0.2s both' }}
              >
                <svg
                  className="w-12 h-12 text-white stroke-[3]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={24}
                  strokeDashoffset={24}
                  style={{
                    animation: 'drawCheck 0.6s ease-out 0.3s forwards',
                  }}
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                ¡Miembro verificado!
              </h2>
              <p className="text-gray-600 text-sm">
                Folio {member.folio}
              </p>
              <p className="text-gray-500 text-xs mt-4">
                Esta credencial es válida
              </p>
            </div>
          </div>
        </>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          {/* Header with folio */}
          <div className="bg-orange-500 px-4 py-3 text-white text-center">
            <p className="text-sm font-medium opacity-90">Folio</p>
            <p className="text-xl font-bold tracking-wide">{member.folio}</p>
          </div>

          <div className="p-4 md:p-6 space-y-6 text-center flex flex-col items-center">
            {/* Credential image - first */}
            <div className="w-full flex flex-col items-center">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                Credencial
              </label>
              <img
                src={`/api/members/${encodeURIComponent(identifier)}/image`}
                alt={`Credencial ${member.folio}`}
                className="rounded-lg shadow-sm w-full max-w-lg mx-auto"
              />
            </div>

            {/* QR code for business verification */}
            {pageUrl && (
              <div className="w-full flex flex-col items-center pt-2 border-t border-gray-100">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                  Escanea para verificar membresía
                </label>
                <div className="bg-white p-3 rounded-lg border border-gray-200 inline-block">
                  <QRCodeSVG value={pageUrl} size={160} level="M" includeMargin={false} />
                </div>
                <p className="text-xs text-gray-500 mt-2 max-w-[200px]">
                  Los negocios pueden escanear este código para verificar que eres miembro.
                </p>
              </div>
            )}

            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                {fullName}
              </h1>
              {member.createdAt && (
                <p className="text-sm text-gray-500 mt-1">
                  Miembro desde{' '}
                  {new Date(member.createdAt).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md justify-items-center sm:justify-items-stretch">
              {member.telefono && (
                <div className="text-center sm:text-left">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Teléfono
                  </label>
                  <p className="text-gray-900 font-medium mt-0.5">
                    {member.telefono}
                  </p>
                </div>
              )}
              {member.fechaNacimiento && (
                <div className="text-center sm:text-left">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Fecha de nacimiento
                  </label>
                  <p className="text-gray-900 font-medium mt-0.5">
                    {member.fechaNacimiento}
                  </p>
                </div>
              )}
              {member.localidad && (
                <div className="text-center sm:text-left">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Comunidad
                  </label>
                  <p className="text-gray-900 font-medium mt-0.5">
                    {member.localidad}
                  </p>
                </div>
              )}
              {(member as any).cargo && (
                <div className="text-center sm:text-left">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Cargo
                  </label>
                  <p className="text-gray-900 font-medium mt-0.5">
                    {(member as any).cargo}
                  </p>
                </div>
              )}
            </div>

            {member.notasApoyos && (
              <div className="w-full max-w-md">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Notas de apoyos
                </label>
                <p className="text-gray-900 mt-1 whitespace-pre-wrap text-left">
                  {member.notasApoyos}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
