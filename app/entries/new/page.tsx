'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Confetti from 'react-confetti';
import { Button } from '@/components/ui/Button';
import { EntryForm } from '@/components/forms/EntryForm';
import type { EntryCreate, INEParseResponse } from '@/lib/validation';

export default function NewEntryPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [ineData, setIneData] = useState<Partial<EntryCreate>>({});
  const [ineFrontUrl, setIneFrontUrl] = useState('');
  const [ineFrontS3Key, setIneFrontS3Key] = useState('');
  const [ineBackUrl, setIneBackUrl] = useState('');
  const [ineBackS3Key, setIneBackS3Key] = useState('');
  const [isUploadingINE, setIsUploadingINE] = useState(false);
  const [nextFolio, setNextFolio] = useState<string>('');
  const [isLoadingFolio, setIsLoadingFolio] = useState(false);
  const [createdEntryId, setCreatedEntryId] = useState<string>('');

  // Fetch next folio when component mounts or when step changes to 2
  useEffect(() => {
    if (step === 2 && !nextFolio) {
      fetchNextFolio();
    }
  }, [step]);

  const fetchNextFolio = async () => {
    setIsLoadingFolio(true);
    try {
      const response = await fetch('/api/entries/next-folio');
      if (!response.ok) {
        throw new Error('Error al obtener el siguiente folio');
      }
      const data = await response.json();
      setNextFolio(data.folio);
      // Also set it in ineData so it pre-fills the form
      setIneData(prev => ({ ...prev, folio: data.folio }));
    } catch (error: any) {
      console.error('Error fetching next folio:', error);
      alert('No se pudo obtener el siguiente folio. Por favor, intenta de nuevo.');
    } finally {
      setIsLoadingFolio(false);
    }
  };

  const handleINEUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingINE(true);
    try {
      // First upload the INE front image to S3
      const uploadFormData = new FormData();
      uploadFormData.append('ine', file);
      uploadFormData.append('side', 'front');

      const uploadResponse = await fetch('/api/ine/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Error al subir INE');
      }

      const uploadData = await uploadResponse.json();
      setIneFrontUrl(uploadData.url);
      setIneFrontS3Key(uploadData.s3Key);

      // Then parse the INE data with OpenAI
      const parseFormData = new FormData();
      parseFormData.append('ine', file);

      const parseResponse = await fetch('/api/ine/parse', {
        method: 'POST',
        body: parseFormData,
      });

      if (!parseResponse.ok) {
        throw new Error('Error al procesar INE');
      }

      const parseData: INEParseResponse = await parseResponse.json();
      setIneData({
        ...parseData as Partial<EntryCreate>,
        ineFrontUrl: uploadData.url,
        ineFrontS3Key: uploadData.s3Key,
      });
      setStep(2);
    } catch (error: any) {
      alert(error.message || 'Error al procesar la imagen INE');
    } finally {
      setIsUploadingINE(false);
    }
  };

  const handleFormSubmit = async (data: EntryCreate) => {
    const entryData = {
      ...data,
      ineFrontUrl,
      ineFrontS3Key,
      ineBackUrl: data.ineBackUrl || ineBackUrl,
      ineBackS3Key: data.ineBackS3Key || ineBackS3Key,
    };

    const response = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entryData),
    });

    if (!response.ok) {
      const error = await response.json();
      // If folio conflict, fetch new folio
      if (response.status === 409) {
        await fetchNextFolio();
      }
      throw error;
    }

    const entry = await response.json();
    setCreatedEntryId(entry.id);
    setStep(3); // Go to Finalizado step with confetti
  };

  const handleIneFrontReplace = (url: string, s3Key: string) => {
    setIneFrontUrl(url);
    setIneFrontS3Key(s3Key);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/entries')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Volver"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-gray-900">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Nueva Entrada</h1>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((stepNum) => (
              <div
                key={stepNum}
                className={`flex items-center ${stepNum < 3 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-12 h-12 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= stepNum
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step > stepNum ? 'bg-orange-500' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3">
            <span className="text-xs md:text-sm font-medium text-gray-900">Subir INE</span>
            <span className="text-xs md:text-sm font-medium text-gray-900">Completar Datos</span>
            <span className="text-xs md:text-sm font-medium text-gray-900">Finalizado</span>
          </div>
        </div>

        {/* Step 1: Upload INE */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-4 text-gray-900">Paso 1: Subir Imagen de INE</h2>
            <p className="text-base text-gray-800 mb-6">
              Sube una foto o escaneo de la credencial INE para extraer automáticamente los datos.
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleINEUpload}
                className="hidden"
                id="ine-upload"
                disabled={isUploadingINE}
              />
              <div className="text-base md:text-lg text-gray-800 mb-4 font-medium">
                {isUploadingINE ? 'Procesando...' : 'Click para subir imagen INE'}
              </div>
              <Button 
                type="button" 
                disabled={isUploadingINE}
                onClick={() => document.getElementById('ine-upload')?.click()}
              >
                {isUploadingINE ? 'Procesando...' : 'Seleccionar Imagen'}
              </Button>
            </div>
            <div className="mt-4">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Omitir y llenar manualmente
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Fill Form */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-900">Paso 2: Completar Información</h2>
            
            {isLoadingFolio && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 font-medium">⏳ Obteniendo siguiente folio...</p>
              </div>
            )}
            
            {nextFolio && !isLoadingFolio && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800">
                  <span className="font-semibold">Folio asignado:</span> {nextFolio}
                </p>
                <button
                  onClick={fetchNextFolio}
                  className="mt-2 text-sm text-green-700 hover:text-green-900 underline"
                >
                  Actualizar folio
                </button>
              </div>
            )}
            
            <EntryForm
              initialData={ineData}
              ineFrontUrl={ineFrontUrl}
              ineBackUrl={ineBackUrl}
              onIneFrontUpload={handleIneFrontReplace}
              onSubmit={handleFormSubmit}
              submitLabel="Finalizar"
            />
            <div className="mt-4">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Volver
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Finalizado - Success with Confetti */}
        {step === 3 && (
          <>
            <Confetti
              width={typeof window !== 'undefined' ? window.innerWidth : 300}
              height={typeof window !== 'undefined' ? window.innerHeight : 200}
              recycle={false}
              numberOfPieces={500}
            />
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="mb-6">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                  ¡Entrada Creada Exitosamente!
                </h2>
                <p className="text-lg text-gray-700 mb-8">
                  La entrada ha sido registrada correctamente en el sistema.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-4 justify-center">
                <Button
                  onClick={() => router.push(`/entries/${createdEntryId}`)}
                  className="w-full md:w-auto"
                >
                  Ver Entrada
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => router.push('/entries/new')}
                  className="w-full md:w-auto"
                >
                  Crear Otra Entrada
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => router.push('/entries')}
                  className="w-full md:w-auto"
                >
                  Volver a la Lista
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
