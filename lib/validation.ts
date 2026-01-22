import { z } from 'zod';

// Entry schema for form validation
export const entrySchema = z.object({
  folio: z.string().min(1, 'Folio es requerido'),
  nombre: z.string().min(1, 'Nombre es requerido'),
  segundoNombre: z.string().optional(),
  apellidos: z.string().min(1, 'Apellidos son requeridos'),
  telefono: z.string().optional(),
  metodoContacto: z.string().optional(),
  fechaNacimiento: z.string().optional(),
  seccionElectoral: z.string().optional(),
  casilla: z.string().optional(), // Full section text: "(3877) - 20 DE NOVIEMBRE..."
  zona: z.string().optional(),
  cargo: z.string().optional(), // Position/role (from entries-2.csv)
  notasApoyos: z.string().optional(),
  localidad: z.string().optional(),
  selfieS3Key: z.string().optional(),
  selfieUrl: z.union([z.string().url(), z.literal('')]).optional(),
  ineFrontS3Key: z.string().optional(),
  ineFrontUrl: z.union([z.string().url(), z.literal('')]).optional(),
  ineBackS3Key: z.string().optional(),
  ineBackUrl: z.union([z.string().url(), z.literal('')]).optional(),
});

export const entryCreateSchema = entrySchema;
export const entryUpdateSchema = entrySchema.partial();

export type Entry = z.infer<typeof entrySchema> & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type EntryCreate = z.infer<typeof entryCreateSchema>;
export type EntryUpdate = z.infer<typeof entryUpdateSchema>;

// INE parsing response schema
export const ineParseResponseSchema = z.object({
  folio: z.string().optional(),
  nombre: z.string().optional(),
  segundoNombre: z.string().optional(),
  apellidos: z.string().optional(),
  telefono: z.string().optional(),
  fechaNacimiento: z.string().optional(),
  seccionElectoral: z.string().optional(),
  localidad: z.string().optional(),
});

export type INEParseResponse = z.infer<typeof ineParseResponseSchema>;

// Selfie upload response schema
export const selfieUploadResponseSchema = z.object({
  url: z.string().url(),
  s3Key: z.string(),
});

export type SelfieUploadResponse = z.infer<typeof selfieUploadResponseSchema>;

// Helper to normalize names for search
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .trim();
}

// Helper to format full name
export function formatFullName(entry: { nombre: string; segundoNombre?: string; apellidos: string }): string {
  const parts = [entry.nombre, entry.segundoNombre, entry.apellidos].filter(Boolean);
  return parts.join(' ');
}
