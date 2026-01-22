'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import type { Entry, EntryCreate } from '@/lib/validation';

interface EntryFormProps {
  initialData?: Partial<Entry>;
  onSubmit: (data: EntryCreate) => Promise<void>;
  submitLabel?: string;
}

interface EntryFormPropsExtended extends EntryFormProps {
  onIneFrontUpload?: (url: string, s3Key: string) => void;
  onIneBackUpload?: (url: string, s3Key: string) => void;
  ineBackUrl?: string;
  ineFrontUrl?: string;
}

export function EntryForm({ initialData, onSubmit, submitLabel = 'Guardar', onIneFrontUpload, onIneBackUpload, ineBackUrl: initialIneBackUrl, ineFrontUrl: initialIneFrontUrl }: EntryFormPropsExtended) {
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
  const [isUploadingIneFront, setIsUploadingIneFront] = useState(false);
  const [isUploadingIneBack, setIsUploadingIneBack] = useState(false);
  const [ineFrontDeleted, setIneFrontDeleted] = useState(false);
  const [ineBackDeleted, setIneBackDeleted] = useState(false);
  const [localidades, setLocalidades] = useState<string[]>([]);
  const [secciones, setSecciones] = useState<string[]>([]);
  
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

  // Load options
  useEffect(() => {
    Promise.all([
      fetch('/api/options/localidades').then((r) => r.json()),
      fetch('/api/options/secciones').then((r) => r.json()),
    ]).then(([loc, sec]) => {
      setLocalidades(loc.localidades || loc);
      setSecciones(sec.secciones || sec);
    });
  }, []);

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
      const formData = new FormData();
      formData.append('selfie', file);

      const response = await fetch('/api/selfie/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al procesar la selfie');
      }

      const data = await response.json();
      console.log('Received from API:', data);
      console.log('Setting selfieUrl to:', data.url);
      setFormData((prev) => ({
        ...prev,
        selfieUrl: data.url,
        selfieS3Key: data.s3Key,
      }));
    } catch (error: any) {
      alert(error.message || 'Error al subir la selfie');
    } finally {
      setIsUploadingSelfie(false);
    }
  };

  const handleIneFrontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingIneFront(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('ine', file);
      formDataUpload.append('side', 'front');

      const response = await fetch('/api/ine/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error uploading INE frontal:', errorData);
        throw new Error(errorData.error || 'Error al procesar INE frontal');
      }

      const data = await response.json();
      console.log('INE frontal uploaded:', data);
      setFormData((prev) => ({
        ...prev,
        ineFrontUrl: data.url,
        ineFrontS3Key: data.s3Key,
      }));
      setIneFrontDeleted(false); // Reset deletion state
      
      // Notify parent if callback provided
      if (onIneFrontUpload) {
        onIneFrontUpload(data.url, data.s3Key);
      }
      
      // Reset file input so the same file can be selected again
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
      const formDataUpload = new FormData();
      formDataUpload.append('ine', file);
      formDataUpload.append('side', 'back');

      const response = await fetch('/api/ine/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error uploading INE trasera:', errorData);
        throw new Error(errorData.error || 'Error al procesar INE trasera');
      }

      const data = await response.json();
      console.log('INE trasera uploaded:', data);
      setFormData((prev) => ({
        ...prev,
        ineBackUrl: data.url,
        ineBackS3Key: data.s3Key,
      }));
      setIneBackDeleted(false); // Reset deletion state
      
      // Notify parent if callback provided
      if (onIneBackUpload) {
        onIneBackUpload(data.url, data.s3Key);
      }
      
      // Reset file input so the same file can be selected again
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
          value={formData.folio}
          onChange={handleChange}
          error={errors.folio}
          required
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

        <Select
          label="Sección Electoral"
          name="seccionElectoral"
          value={formData.seccionElectoral}
          onChange={handleChange}
          error={errors.seccionElectoral}
          options={secciones}
        />

        <Select
          label="Localidad"
          name="localidad"
          value={formData.localidad}
          onChange={handleChange}
          error={errors.localidad}
          options={localidades}
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
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="file"
            accept="image/*"
            capture="user"
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
