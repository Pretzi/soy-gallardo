import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data');

// Cache for CSV data
let localidadesCache: string[] | null = null;
let seccionesCache: string[] | null = null;

// Function to clear cache (useful after updating CSV files)
export function clearCache() {
  localidadesCache = null;
  seccionesCache = null;
}

export function readCSV(filePath: string): any[] {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    return records;
  } catch (error) {
    console.error(`Error reading CSV file ${filePath}:`, error);
    return [];
  }
}

export function getLocalidades(): string[] {
  if (localidadesCache) {
    return localidadesCache;
  }

  const filePath = join(DATA_DIR, 'colonia-comunidad.csv');
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    // Parse CSV without headers, just get first column
    const lines = content.split('\n').filter(line => line.trim());
    const localidades = lines
      .map(line => line.split(',')[0].trim())
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i) // Unique values
      .sort();

    localidadesCache = localidades;
    return localidades;
  } catch (error) {
    console.error('Error reading localidades:', error);
    return [];
  }
}

export function getSecciones(): string[] {
  if (seccionesCache) {
    return seccionesCache;
  }

  const filePath = join(DATA_DIR, 'secciones.csv');
  const records = readCSV(filePath);
  
  // Return full section text from "SECCIÓN:" column
  // Format: "(3859) - MIRA FLORES ESC.PRIM. GRAL AMERICA"
  // Keep duplicates as same section number can have multiple locations
  const secciones = records
    .map((record) => {
      const seccion = record['SECCIÓN:'] || record['SECCION:'] || record['seccion'] || '';
      return seccion.trim();
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Sort by the number inside parentheses
      const matchA = a.match(/\((\d+)\)/);
      const matchB = b.match(/\((\d+)\)/);
      const numA = matchA ? parseInt(matchA[1], 10) : 0;
      const numB = matchB ? parseInt(matchB[1], 10) : 0;
      return numA - numB;
    });

  seccionesCache = secciones;
  return secciones;
}

export function readEntriesCSV(fileName: string): any[] {
  const filePath = join(DATA_DIR, fileName);
  return readCSV(filePath);
}
