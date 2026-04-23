'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getReportType } from '@/lib/report-types';
import { notFound } from 'next/navigation';
import { Autocomplete } from '@/components/ui/Autocomplete';
import dynamic from 'next/dynamic';

const MapPinPicker = dynamic(
  () => import('@/components/MapPinPicker').then((m) => m.MapPinPicker),
  { ssr: false, loading: () => <div className="w-full h-[360px] rounded-2xl bg-gray-100 animate-pulse" /> }
);

const TOTAL_STEPS = 6;

type Coords = { lat: number; lng: number };

type FormData = {
  calle: string;
  colonia: string;
  localidad: string;
  referencia: string;
  coords: Coords | null;
  descripcion: string;
  fotos: File[];
  nombre: string;
  telefono: string;
  email: string;
};

export default function ReportarPage() {
  const params = useParams();
  const tipo = params.tipo as string;
  const reportType = getReportType(tipo);
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormData>({
    calle: '', colonia: '', localidad: '', referencia: '',
    coords: null,
    descripcion: '', fotos: [],
    nombre: '', telefono: '', email: '',
  });
  const [previews, setPreviews] = useState<string[]>([]);
  const [localidades, setLocalidades] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const calleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const nombreRef = useRef<HTMLInputElement>(null);

  if (!reportType) notFound();

  useEffect(() => {
    fetch('/api/options/localidades')
      .then((r) => r.json())
      .then((d) => setLocalidades(d.localidades || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (step === 0) calleRef.current?.focus();
      if (step === 2) descRef.current?.focus();
      if (step === 4) nombreRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [step]);

  const update = (field: keyof FormData, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    // Revoke any existing preview before replacing
    previews.forEach((url) => URL.revokeObjectURL(url));
    const file = files[0];
    setForm((p) => ({ ...p, fotos: [file] }));
    setPreviews([URL.createObjectURL(file)]);
  };

  const removePhoto = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setForm((p) => ({ ...p, fotos: p.fotos.filter((_, j) => j !== i) }));
    setPreviews((p) => p.filter((_, j) => j !== i));
  };

  const canNext = () => {
    if (step === 0) return form.calle.trim().length > 0;
    if (step === 3) return form.fotos.length > 0;
    if (step === 4) return form.nombre.trim().length > 0;
    return true;
  };

  const next = () => { if (canNext()) setStep((s) => s + 1); };
  const back = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('tipo', tipo);
      fd.append('descripcion', form.descripcion);
      fd.append('nombre', form.nombre);
      fd.append('telefono', form.telefono);
      fd.append('email', form.email);
      fd.append('calle', form.calle);
      fd.append('colonia', form.colonia);
      fd.append('localidad', form.localidad);
      fd.append('referencia', form.referencia);
      if (form.coords) {
        fd.append('lat', String(form.coords.lat));
        fd.append('lng', String(form.coords.lng));
      }
      form.fotos.forEach((f) => fd.append('fotos', f));

      const res = await fetch('/api/reportes', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al enviar el reporte');
      }
      const { folio, id } = await res.json();
      router.push(`/reportar/gracias?folio=${folio}&id=${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al enviar el reporte');
      setIsSubmitting(false);
    }
  };

  const progress = (step / TOTAL_STEPS) * 100;

  const inputClass = 'mt-1.5 w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Progress bar */}
      <div className="h-1 bg-gray-200 fixed top-0 left-0 right-0 z-20">
        <div
          className="h-full bg-orange-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-7 pb-4 bg-gray-50 sticky top-1 z-10">
        <button
          onClick={step === 0 ? () => router.push('/reportar') : back}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-all"
          aria-label="Atrás"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-lg">{reportType.emoji}</span>
          <p className="text-xs font-bold text-gray-700">{reportType.label}</p>
        </div>

        <Link
          href="/"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-500 transition-all"
          aria-label="Cancelar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Link>
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col pt-4 pb-8">
        <div className={step === 1 ? 'w-full px-4 flex flex-col flex-1' : 'w-full md:max-w-md md:mx-auto px-5'}>

          {/* Step 0 — Location */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <p className="text-lg font-bold text-orange-500 mb-1">Ubicación</p>
                <h2 className="text-2xl font-extrabold text-gray-900 leading-tight">¿En qué calle ocurre?</h2>
                <p className="text-sm text-gray-400 mt-1">Indica la calle, localidad y una referencia opcional.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Calle o avenida *</label>
                  <input
                    ref={calleRef}
                    type="text"
                    value={form.calle}
                    onChange={(e) => update('calle', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && next()}
                    placeholder="Ej. Av. Juárez"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Colonia</label>
                  <input
                    type="text"
                    value={form.colonia}
                    onChange={(e) => update('colonia', e.target.value)}
                    placeholder="Ej. Centro"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Localidad</label>
                  <Autocomplete
                    options={localidades}
                    value={form.localidad}
                    onChange={(v) => update('localidad', v)}
                    placeholder="Busca tu comunidad..."
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Referencia</label>
                  <input
                    type="text"
                    value={form.referencia}
                    onChange={(e) => update('referencia', e.target.value)}
                    placeholder="Ej. Frente a la farmacia"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 1 — Map pin */}
          {step === 1 && (
            <div className="flex flex-col flex-1 gap-4">
              <div>
                <p className="text-lg font-bold text-orange-500 mb-0.5">Ubicación en mapa</p>
                <p className="text-sm text-gray-400">Toca el mapa para colocar un pin. Puedes arrastrarlo para ajustar.</p>
              </div>
              <MapPinPicker
                value={form.coords}
                onChange={(coords) => setForm((p) => ({ ...p, coords }))}
                height="calc(100svh - 280px)"
              />
            </div>
          )}

          {/* Step 2 — Description */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <p className="text-lg font-bold text-orange-500 mb-1">Descripción</p>
                <h2 className="text-2xl font-extrabold text-gray-900 leading-tight">¿Qué está pasando?</h2>
                <p className="text-sm text-gray-400 mt-1">Opcional — describe el problema si quieres agregar más detalle.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</label>
                <textarea
                  ref={descRef}
                  value={form.descripcion}
                  onChange={(e) => update('descripcion', e.target.value)}
                  placeholder="Ej. Hay un bache profundo que daña los vehículos..."
                  rows={5}
                  className="mt-1.5 w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 3 — Photo (required, 1 only) */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <p className="text-lg font-bold text-orange-500 mb-1">Evidencia</p>
                <h2 className="text-2xl font-extrabold text-gray-900 leading-tight">Agrega una foto</h2>
                <p className="text-sm text-gray-400 mt-1">Requerida — toma una foto del problema.</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              {previews.length === 0 ? (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full py-16 bg-white border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center gap-3 text-gray-400 hover:border-orange-400 hover:text-orange-500 transition-all">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                  <span className="text-sm font-semibold">Tomar o elegir foto</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <img src={previews[0]} alt="Foto" className="w-full h-56 object-cover rounded-2xl" />
                    <button type="button" onClick={() => removePhoto(0)}
                      className="absolute top-3 right-3 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-colors">
                      ×
                    </button>
                  </div>
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:border-orange-300 transition-all">
                    Cambiar foto
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Contact */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <p className="text-lg font-bold text-orange-500 mb-1">Contacto</p>
                <h2 className="text-2xl font-extrabold text-gray-900 leading-tight">¿Cómo te llamamos?</h2>
                <p className="text-sm text-gray-400 mt-1">Para darte seguimiento a tu reporte.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre *</label>
                  <input ref={nombreRef} type="text" value={form.nombre} onChange={(e) => update('nombre', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && next()} placeholder="Tu nombre completo" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Teléfono</label>
                  <input type="tel" value={form.telefono} onChange={(e) => update('telefono', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && next()} placeholder="Opcional" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Correo electrónico</label>
                  <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && next()} placeholder="Opcional" className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {/* Step 5 — Confirm */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <p className="text-lg font-bold text-orange-500 mb-1">Confirmar</p>
                <h2 className="text-2xl font-extrabold text-gray-900 leading-tight">¿Todo correcto?</h2>
                <p className="text-sm text-gray-400 mt-1">Revisa tu reporte antes de enviarlo.</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {[
                  { label: 'Problema', value: reportType.label },
                  { label: 'Calle', value: form.calle },
                  form.colonia ? { label: 'Colonia', value: form.colonia } : null,
                  form.localidad ? { label: 'Localidad', value: form.localidad } : null,
                  form.referencia ? { label: 'Referencia', value: form.referencia } : null,
                  form.coords ? { label: 'Coordenadas', value: `${form.coords.lat.toFixed(5)}, ${form.coords.lng.toFixed(5)}` } : null,
                  { label: 'Descripción', value: form.descripcion },
                  form.fotos.length > 0 ? { label: 'Fotos', value: `${form.fotos.length} adjunta${form.fotos.length > 1 ? 's' : ''}` } : null,
                  { label: 'Nombre', value: form.nombre },
                  form.telefono ? { label: 'Teléfono', value: form.telefono } : null,
                ].filter(Boolean).map((row, i) => (
                  <div key={i} className="flex gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 flex-shrink-0 pt-0.5">{row!.label}</span>
                    <span className="text-sm text-gray-800 leading-relaxed break-all">{row!.value}</span>
                  </div>
                ))}
              </div>
              {error && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="mt-8">
            {step === 5 ? (
              <button type="button" onClick={handleSubmit} disabled={isSubmitting}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-colors disabled:opacity-50 text-base">
                {isSubmitting ? 'Enviando...' : 'Enviar reporte'}
              </button>
            ) : (
              <button type="button" onClick={next} disabled={!canNext()}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-colors disabled:opacity-30 text-base">
                Continuar
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
