#!/usr/bin/env node

import { readEntriesCSV } from '../lib/csv';
import { batchWriteEntries } from '../lib/aws/dynamo';
import type { EntryCreate } from '../lib/validation';

async function seedDatabase() {
  console.log('Starting DynamoDB seed process...\n');

  try {
    // Read CSV files
    console.log('Reading CSV files...');
    const entries1 = readEntriesCSV('entries-1.csv');
    const entries2 = readEntriesCSV('entries-2.csv');
    
    console.log(`Found ${entries1.length} entries in entries-1.csv`);
    console.log(`Found ${entries2.length} entries in entries-2.csv`);

    // Map CSV records to entry schema
    const mapCSVToEntry = (record: any): EntryCreate => {
      return {
        folio: record.folio || record.Folio || '',
        nombre: record.nombre || record.Nombre || '',
        segundoNombre: record.segundoNombre || record.SegundoNombre || record.segundo_nombre || '',
        apellidos: record.apellidos || record.Apellidos || '',
        telefono: record.telefono || record.Telefono || record.tel || '',
        metodoContacto: (record.metodoContacto || record.MetodoContacto || record.metodo_contacto || 'telefono') as any,
        fechaNacimiento: record.fechaNacimiento || record.FechaNacimiento || record.fecha_nacimiento || '1990-01-01',
        seccionElectoral: record.seccionElectoral || record.SeccionElectoral || record.seccion_electoral || record.seccion || '',
        zona: record.zona || record.Zona || '',
        notasApoyos: record.notasApoyos || record.NotasApoyos || record.notas_apoyos || record.notas || '',
        localidad: record.localidad || record.Localidad || '',
        selfieS3Key: record.selfieS3Key || '',
        selfieUrl: record.selfieUrl || '',
      };
    };

    const allEntries: EntryCreate[] = [
      ...entries1.map(mapCSVToEntry),
      ...entries2.map(mapCSVToEntry),
    ].filter((entry) => entry.folio && entry.nombre && entry.apellidos); // Filter out invalid entries

    console.log(`\nTotal valid entries to import: ${allEntries.length}\n`);

    if (allEntries.length === 0) {
      console.log('No valid entries found. Please check CSV files.');
      return;
    }

    // Batch write to DynamoDB
    console.log('Writing to DynamoDB...');
    await batchWriteEntries(allEntries);

    console.log(`\n✅ Successfully seeded ${allEntries.length} entries to DynamoDB!`);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
