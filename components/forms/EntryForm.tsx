'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Autocomplete } from '@/components/ui/Autocomplete';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import type { Entry, EntryCreate } from '@/lib/validation';
import { getCachedSecciones } from '@/lib/indexeddb';

interface EntryFormProps {
  initialData?: Partial<Entry>;
  onSubmit: (data: EntryCreate) => Promise<void>;
  submitLabel?: string;
}

interface EntryFormPropsExtended extends EntryFormProps {
  onIneFrontUpload?: (url: string, s3Key: string) => void;
  onIneBackUpload?: (url: string, s3Key: string) => void;
  onSelfieBlob?: (blob: Blob) => void;
  onIneFrontBlob?: (blob: Blob) => void;
  onIneBackBlob?: (blob: Blob) => void;
  ineBackUrl?: string;
  ineFrontUrl?: string;
  isOnline?: boolean;
  useSelfieProcessing?: boolean;
  onSelfieProcessingChange?: (value: boolean) => void;
}

export function EntryForm({ 
  initialData, 
  onSubmit, 
  submitLabel = 'Guardar', 
  onIneFrontUpload, 
  onIneBackUpload, 
  onSelfieBlob,
  onIneFrontBlob,
  onIneBackBlob,
  ineBackUrl: initialIneBackUrl, 
  ineFrontUrl: initialIneFrontUrl,
  isOnline = true,
  useSelfieProcessing = false,
  onSelfieProcessingChange,
}: EntryFormPropsExtended) {
  const [formData, setFormData] = useState<Partial<EntryCreate>>({
    folio: initialData?.folio || '',
    nombre: initialData?.nombre || '',
    segundoNombre: initialData?.segundoNombre || '',
    apellidos: initialData?.apellidos || '',
    telefono: initialData?.telefono || '',
    metodoContacto: initialData?.metodoContacto || '',
    fechaNacimiento: initialData?.fechaNacimiento || '',
    seccionElectoral: initialData?.seccionElectoral || '',
    notasApoyos: initialData?.notasApoyos || '',
    localidad: initialData?.localidad || '',
    selfieS3Key: initialData?.selfieS3Key || '',
    selfieUrl: initialData?.selfieUrl || '',
    ineFrontS3Key: initialData?.ineFrontS3Key || '',
    ineFrontUrl: initialData?.ineFrontUrl || '',
    ineBackS3Key: initialData?.ineBackS3Key || '',
    ineBackUrl: initialData?.ineBackUrl || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingSelfie, setIsUploadingSelfie] = useState(false);
  const [isProcessingSelfie, setIsProcessingSelfie] = useState(false);
  const [isUploadingIneFront, setIsUploadingIneFront] = useState(false);
  const [isUploadingIneBack, setIsUploadingIneBack] = useState(false);
  const [ineFrontDeleted, setIneFrontDeleted] = useState(false);
  const [ineBackDeleted, setIneBackDeleted] = useState(false);
  const [secciones, setSecciones] = useState<string[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<{ message: string; entryId: string; folio: string } | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  
  // Sync initial data changes with form data
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...(initialData.folio && { folio: initialData.folio }),
        ...(initialData.nombre && { nombre: initialData.nombre }),
        ...(initialData.segundoNombre && { segundoNombre: initialData.segundoNombre }),
        ...(initialData.apellidos && { apellidos: initialData.apellidos }),
        ...(initialData.telefono && { telefono: initialData.telefono }),
        ...(initialData.metodoContacto && { metodoContacto: initialData.metodoContacto }),
        ...(initialData.fechaNacimiento && { fechaNacimiento: initialData.fechaNacimiento }),
        ...(initialData.seccionElectoral && { seccionElectoral: initialData.seccionElectoral }),
        ...(initialData.localidad && { localidad: initialData.localidad }),
        ...(initialData.notasApoyos && { notasApoyos: initialData.notasApoyos }),
      }));
    }
  }, [initialData]);
  
  useEffect(() => {
    console.log('INE Front URL prop changed:', initialIneFrontUrl);
    if (initialIneFrontUrl) {
      setFormData(prev => ({ ...prev, ineFrontUrl: initialIneFrontUrl }));
    }
  }, [initialIneFrontUrl]);
  
  useEffect(() => {
    console.log('INE Back URL prop changed:', initialIneBackUrl);
    if (initialIneBackUrl) {
      setFormData(prev => ({ ...prev, ineBackUrl: initialIneBackUrl }));
    }
  }, [initialIneBackUrl]);

  // Debug formData changes
  useEffect(() => {
    console.log('FormData updated:', {
      ineFrontUrl: formData.ineFrontUrl,
      ineBackUrl: formData.ineBackUrl,
      initialIneFrontUrl,
      initialIneBackUrl
    });
  }, [formData.ineFrontUrl, formData.ineBackUrl, initialIneFrontUrl, initialIneBackUrl]);

  // Load options (secciones only; localidad is now a free-text field)
  useEffect(() => {
    const loadOptions = async () => {
      if (isOnline) {
        // Load from API when online
        try {
          const sec = await fetch('/api/options/secciones').then((r) => r.json());
          setSecciones(sec.secciones || sec);
        } catch (error) {
          console.warn('Failed to load options from API, loading from cache:', error);
          // Fallback to cache if API fails
          const cachedSec = await getCachedSecciones();
          if (cachedSec) setSecciones(cachedSec);
        }
      } else {
        // Load from cache when offline
        const cachedSec = await getCachedSecciones();
        if (cachedSec) setSecciones(cachedSec);
      }
    };
    
    loadOptions();
  }, [isOnline]);

  // Check for duplicate names
  useEffect(() => {
    const checkDuplicate = async () => {
      const { nombre, segundoNombre, apellidos } = formData;
      
      // Only check if we have at least nombre and apellidos
      if (!nombre || !apellidos) {
        setDuplicateWarning(null);
        return;
      }

      // Build full name for search
      const fullName = [nombre, segundoNombre, apellidos].filter(Boolean).join(' ').trim();
      if (fullName.length < 3) {
        setDuplicateWarning(null);
        return;
      }

      setIsCheckingDuplicate(true);
      
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(fullName)}`);
        const data = await response.json();
        
        if (data.entries && data.entries.length > 0) {
          // Filter out the current entry if we're editing
          const duplicates = data.entries.filter((entry: any) => {
            // If we have initialData with an id, exclude it from duplicates
            if (initialData?.id && entry.id === initialData.id) {
              return false;
            }
            
            // Check if names match exactly (case-insensitive)
            const entryFullName = [entry.nombre, entry.segundoNombre, entry.apellidos]
              .filter(Boolean)
              .join(' ')
              .trim()
              .toUpperCase();
            const formFullName = [nombre, segundoNombre, apellidos]
              .filter(Boolean)
              .join(' ')
              .trim()
              .toUpperCase();
            
            return entryFullName === formFullName;
          });

          if (duplicates.length > 0) {
            const duplicate = duplicates[0];
            setDuplicateWarning({
              message: `Ya existe una entrada con este nombre: ${duplicate.nombre} ${duplicate.segundoNombre || ''} ${duplicate.apellidos}`,
              entryId: duplicate.id,
              folio: duplicate.folio,
            });
          } else {
            setDuplicateWarning(null);
          }
        } else {
          setDuplicateWarning(null);
        }
      } catch (error) {
        console.error('Error checking duplicate:', error);
        setDuplicateWarning(null);
      } finally {
        setIsCheckingDuplicate(false);
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(checkDuplicate, 800);
    return () => clearTimeout(timeoutId);
  }, [formData.nombre, formData.segundoNombre, formData.apellidos, initialData?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Convert to uppercase for specific fields
    const uppercaseFields = ['folio', 'nombre', 'segundoNombre', 'apellidos'];
    const finalValue = uppercaseFields.includes(name) ? value.toUpperCase() : value;
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSelfieUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSelfie(true);
    try {
      if (!isOnline) {
        // OFFLINE MODE: Store as blob and create local preview URL
        const blob = new Blob([await file.arrayBuffer()], { type: file.type });
        const localUrl = URL.createObjectURL(blob);
        
        setFormData((prev) => ({
          ...prev,
          selfieUrl: localUrl,
          selfieS3Key: '', // Will be set on sync
        }));
        
        // Notify parent to store blob
        if (onSelfieBlob) {
          onSelfieBlob(blob);
        }
      } else {
        // ONLINE MODE: Upload to S3
        const formDataUpload = new FormData();
        formDataUpload.append('selfie', file);
        formDataUpload.append('processBackground', useSelfieProcessing.toString());

      const response = await fetch('/api/selfie/upload', {
        method: 'POST',
          body: formDataUpload,
      });

      if (!response.ok) {
        throw new Error('Error al procesar la selfie');
      }

      const data = await response.json();
      setFormData((prev) => ({
        ...prev,
        selfieUrl: data.url,
        selfieS3Key: data.s3Key,
      }));
      }
    } catch (error: any) {
      alert(error.message || 'Error al subir la selfie');
    } finally {
      setIsUploadingSelfie(false);
    }
  };

  const handleReprocessSelfie = async () => {
    if (!formData.selfieUrl || !isOnline) return;

    setIsProcessingSelfie(true);
    try {
      // Fetch the current selfie image
      const imageResponse = await fetch(formData.selfieUrl);
      if (!imageResponse.ok) {
        throw new Error('No se pudo cargar la imagen actual');
      }

      const imageBlob = await imageResponse.blob();
      const imageFile = new File([imageBlob], 'selfie.jpg', { type: imageBlob.type });

      // Upload with background processing enabled
      const formDataUpload = new FormData();
      formDataUpload.append('selfie', imageFile);
      formDataUpload.append('processBackground', 'true'); // Always process when re-processing

      const response = await fetch('/api/selfie/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (!response.ok) {
        throw new Error('Error al procesar la selfie');
      }

      const data = await response.json();
      setFormData((prev) => ({
        ...prev,
        selfieUrl: data.url,
        selfieS3Key: data.s3Key,
      }));

      alert('Selfie procesada exitosamente. El fondo ha sido removido.');
    } catch (error: any) {
      alert(error.message || 'Error al procesar la selfie');
    } finally {
      setIsProcessingSelfie(false);
    }
  };

  const handleIneFrontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingIneFront(true);
    try {
      if (!isOnline) {
        // OFFLINE MODE: Store as blob and create local preview URL
        const blob = new Blob([await file.arrayBuffer()], { type: file.type });
        const localUrl = URL.createObjectURL(blob);
        
        setFormData((prev) => ({
          ...prev,
          ineFrontUrl: localUrl,
          ineFrontS3Key: '',
        }));
        setIneFrontDeleted(false);
        
        // Notify parent to store blob
        if (onIneFrontBlob) {
          onIneFrontBlob(blob);
        }
        
        // Notify parent if callback provided
        if (onIneFrontUpload) {
          onIneFrontUpload(localUrl, '');
        }
      } else {
        // ONLINE MODE: Upload to S3
      const formDataUpload = new FormData();
      formDataUpload.append('ine', file);
      formDataUpload.append('side', 'front');

      const response = await fetch('/api/ine/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar INE frontal');
      }

      const data = await response.json();
      setFormData((prev) => ({
        ...prev,
        ineFrontUrl: data.url,
        ineFrontS3Key: data.s3Key,
      }));
        setIneFrontDeleted(false);
      
      // Notify parent if callback provided
      if (onIneFrontUpload) {
        onIneFrontUpload(data.url, data.s3Key);
        }
      }
      
      // Reset file input
      e.target.value = '';
    } catch (error: any) {
      console.error('Error uploading INE frontal:', error);
      alert(error.message || 'Error al subir INE frontal');
      e.target.value = '';
    } finally {
      setIsUploadingIneFront(false);
    }
  };

  const handleIneBackUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingIneBack(true);
    try {
      if (!isOnline) {
        // OFFLINE MODE: Store as blob and create local preview URL
        const blob = new Blob([await file.arrayBuffer()], { type: file.type });
        const localUrl = URL.createObjectURL(blob);
        
        setFormData((prev) => ({
          ...prev,
          ineBackUrl: localUrl,
          ineBackS3Key: '',
        }));
        setIneBackDeleted(false);
        
        // Notify parent to store blob
        if (onIneBackBlob) {
          onIneBackBlob(blob);
        }
        
        // Notify parent if callback provided
        if (onIneBackUpload) {
          onIneBackUpload(localUrl, '');
        }
      } else {
        // ONLINE MODE: Upload to S3
      const formDataUpload = new FormData();
      formDataUpload.append('ine', file);
      formDataUpload.append('side', 'back');

      const response = await fetch('/api/ine/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar INE trasera');
      }

      const data = await response.json();
      setFormData((prev) => ({
        ...prev,
        ineBackUrl: data.url,
        ineBackS3Key: data.s3Key,
      }));
        setIneBackDeleted(false);
      
      // Notify parent if callback provided
      if (onIneBackUpload) {
        onIneBackUpload(data.url, data.s3Key);
        }
      }
      
      // Reset file input
      e.target.value = '';
    } catch (error: any) {
      console.error('Error uploading INE trasera:', error);
      alert(error.message || 'Error al subir INE trasera');
      e.target.value = '';
    } finally {
      setIsUploadingIneBack(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      await onSubmit(formData as EntryCreate);
    } catch (error: any) {
      if (error.details) {
        const fieldErrors: Record<string, string> = {};
        error.details.forEach((detail: any) => {
          fieldErrors[detail.path[0]] = detail.message;
        });
        setErrors(fieldErrors);
      } else {
        alert(error.message || 'Error al guardar');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Folio"
          name="folio"
          value={formData.folio || ''}
          onChange={handleChange}
          error={errors.folio}
          required={isOnline}
          disabled={!isOnline}
          placeholder={!isOnline ? 'Se asignará al sincronizar' : ''}
          className="uppercase"
        />

        <Input
          label="Nombre"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          error={errors.nombre}
          required
          className="uppercase"
        />

        <Input
          label="Segundo Nombre"
          name="segundoNombre"
          value={formData.segundoNombre}
          onChange={handleChange}
          error={errors.segundoNombre}
          className="uppercase"
        />

        <Input
          label="Apellidos"
          name="apellidos"
          value={formData.apellidos}
          onChange={handleChange}
          error={errors.apellidos}
          required
          className="uppercase"
        />
      </div>

      {/* Duplicate Warning */}
      {isCheckingDuplicate && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">🔍 Verificando si existe una entrada duplicada...</p>
        </div>
      )}
      
      {duplicateWarning && (
        <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">Posible Entrada Duplicada</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{duplicateWarning.message}</p>
                <p className="mt-1">Folio: <span className="font-semibold">{duplicateWarning.folio}</span></p>
              </div>
              <div className="mt-3">
                <a
                  href={`/entries/${duplicateWarning.entryId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                >
                  Ver entrada existente →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Teléfono"
          name="telefono"
          type="tel"
          value={formData.telefono}
          onChange={handleChange}
          error={errors.telefono}
        />

        <Select
          label="Método de Contacto"
          name="metodoContacto"
          value={formData.metodoContacto}
          onChange={handleChange}
          error={errors.metodoContacto}
          options={[
            { value: '', label: 'Ninguno' },
            { value: 'telefono', label: 'Teléfono' },
            { value: 'whatsapp', label: 'WhatsApp' },
            { value: 'email', label: 'Email' },
            { value: 'presencial', label: 'Presencial' },
          ]}
        />

        <Input
          label="Fecha de Nacimiento"
          name="fechaNacimiento"
          type="date"
          value={formData.fechaNacimiento}
          onChange={handleChange}
          error={errors.fechaNacimiento}
        />

        <Autocomplete
          label="Sección Electoral"
          placeholder="Buscar sección..."
          options={secciones}
          value={(() => {
            // If we have a section number (e.g., "3877"), find the full text
            const seccion = formData.seccionElectoral;
            if (!seccion) return '';
            
            // If it's already the full format "(3877) - ...", return it
            if (seccion.startsWith('(')) return seccion;
            
            // Otherwise, find the matching full section from the options
            const match = secciones.find(s => {
              const numberMatch = s.match(/\((\d+)\)/);
              return numberMatch && numberMatch[1] === seccion;
            });
            
            return match || seccion;
          })()}
          onChange={(value) => {
            // Extract just the number from the selected section
            const match = value.match(/\((\d+)\)/);
            const seccionNumber = match ? match[1] : value;
            setFormData((prev) => ({ ...prev, seccionElectoral: seccionNumber }));
          }}
          error={errors.seccionElectoral}
        />

        <Input
          label="Comunidad y Colonia"
          name="localidad"
          value={formData.localidad || ''}
          onChange={handleChange}
          error={errors.localidad}
          className="uppercase"
        />
      </div>

      <Textarea
        label="Notas de Apoyos"
        name="notasApoyos"
        value={formData.notasApoyos}
        onChange={handleChange}
        error={errors.notasApoyos}
        rows={4}
      />

      {/* INE Front Upload Section */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">INE Frontal</h3>
        
        {!ineFrontDeleted && (formData.ineFrontUrl || initialIneFrontUrl) && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
            <img
              src={formData.ineFrontUrl || initialIneFrontUrl || ''}
              alt="INE frontal preview"
              className="w-full max-w-md object-contain rounded-lg border-2 border-gray-300 shadow-md"
              onError={(e) => {
                console.error('Error loading INE frontal:', formData.ineFrontUrl || initialIneFrontUrl);
                e.currentTarget.style.display = 'none';
              }}
              onLoad={() => console.log('INE frontal loaded:', formData.ineFrontUrl || initialIneFrontUrl)}
            />
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={handleIneFrontUpload}
            className="hidden"
            id="ine-front-upload-form"
            disabled={isUploadingIneFront}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={isUploadingIneFront}
            onClick={() => document.getElementById('ine-front-upload-form')?.click()}
            className="w-full md:w-auto"
          >
            {isUploadingIneFront ? 'Subiendo...' : (!ineFrontDeleted && (formData.ineFrontUrl || initialIneFrontUrl)) ? 'Reemplazar INE Frontal' : 'Subir INE Frontal'}
          </Button>
          {!ineFrontDeleted && (formData.ineFrontUrl || initialIneFrontUrl) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setFormData((prev) => ({ ...prev, ineFrontUrl: '', ineFrontS3Key: '' }));
                setIneFrontDeleted(true);
              }}
              className="w-full md:w-auto"
            >
              Eliminar
            </Button>
          )}
        </div>
      </div>

      {/* INE Back Upload Section */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">INE Trasera</h3>
        
        {!ineBackDeleted && (formData.ineBackUrl || initialIneBackUrl) && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
            <img
              src={formData.ineBackUrl || initialIneBackUrl || ''}
              alt="INE trasera preview"
              className="w-full max-w-md object-contain rounded-lg border-2 border-gray-300 shadow-md"
              onError={(e) => {
                console.error('Error loading INE trasera:', formData.ineBackUrl || initialIneBackUrl);
                e.currentTarget.style.display = 'none';
              }}
              onLoad={() => console.log('INE trasera loaded:', formData.ineBackUrl || initialIneBackUrl)}
            />
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={handleIneBackUpload}
            className="hidden"
            id="ine-back-upload-form"
            disabled={isUploadingIneBack}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={isUploadingIneBack}
            onClick={() => document.getElementById('ine-back-upload-form')?.click()}
            className="w-full md:w-auto"
          >
            {isUploadingIneBack ? 'Subiendo...' : (!ineBackDeleted && (formData.ineBackUrl || initialIneBackUrl)) ? 'Cambiar INE Trasera' : 'Subir INE Trasera'}
          </Button>
          {!ineBackDeleted && (formData.ineBackUrl || initialIneBackUrl) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setFormData((prev) => ({ ...prev, ineBackUrl: '', ineBackS3Key: '' }));
                setIneBackDeleted(true);
              }}
              className="w-full md:w-auto"
            >
              Eliminar
            </Button>
          )}
        </div>
      </div>

      {/* Selfie Upload Section */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Foto (Selfie)</h3>
        
        {/* Selfie Processing Toggle - Only show when online */}
        {isOnline && onSelfieProcessingChange && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label htmlFor="selfie-processing-toggle" className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="selfie-processing-toggle"
                      className="sr-only"
                      checked={useSelfieProcessing}
                      onChange={(e) => onSelfieProcessingChange(e.target.checked)}
                    />
                    <div className={`block w-14 h-8 rounded-full transition-colors ${
                      useSelfieProcessing ? 'bg-orange-500' : 'bg-gray-300'
                    }`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                      useSelfieProcessing ? 'transform translate-x-6' : ''
                    }`}></div>
                  </div>
                  <div className="ml-4">
                    <span className="text-sm font-semibold text-gray-900">
                      {useSelfieProcessing ? '🤖 Procesamiento de fondo activado' : '✍️ Llenado manual'}
                    </span>
                    <p className="text-xs text-gray-600 mt-1">
                      {useSelfieProcessing 
                        ? 'La IA removerá el fondo de la foto automáticamente (requiere internet)' 
                        : 'La foto se subirá tal cual, sin procesamiento de fondo'}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}
        
        {formData.selfieUrl && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
            <img
              src={formData.selfieUrl}
              alt="Selfie preview"
              className="w-48 h-48 object-cover rounded-lg border-2 border-gray-300 shadow-md"
              onError={(e) => {
                console.error('Error loading image:', formData.selfieUrl);
                e.currentTarget.style.display = 'none';
              }}
              onLoad={() => console.log('Image loaded successfully:', formData.selfieUrl)}
            />
            {/* Re-process button - only show when online */}
            {isOnline && (
              <div className="mt-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isProcessingSelfie}
                  onClick={handleReprocessSelfie}
                  className="w-full md:w-auto"
                >
                  {isProcessingSelfie ? 'Procesando...' : '🤖 Remover fondo con IA'}
                </Button>
                <p className="text-xs text-gray-500 mt-1">
                  Re-procesa la foto actual para remover el fondo automáticamente
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={handleSelfieUpload}
            className="hidden"
            id="selfie-upload-form"
            disabled={isUploadingSelfie}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={isUploadingSelfie}
            onClick={() => document.getElementById('selfie-upload-form')?.click()}
            className="w-full md:w-auto"
          >
            {isUploadingSelfie ? 'Subiendo...' : formData.selfieUrl ? 'Cambiar Selfie' : 'Subir Selfie'}
          </Button>
          {formData.selfieUrl && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setFormData((prev) => ({ ...prev, selfieUrl: '', selfieS3Key: '' }))}
              className="w-full md:w-auto"
            >
              Eliminar Selfie
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-2">
          La foto se usará en el PDF generado. Recomendado: Fondo claro o liso.
        </p>
      </div>

      <div className="flex gap-4 justify-end pt-4 border-t border-gray-200">
        <Button type="submit" isLoading={isLoading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
