import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { docClient, TABLE_NAME } from '../lib/aws/dynamo';
import { PutCommand } from '@aws-sdk/lib-dynamodb';

interface CSVRow {
  folio: string;
  apellidos: string;
  nombre: string;
  segundoNombre?: string;
  telefono?: string;
  metodoContacto?: string;
  cumpleanos?: string;
  seccionCasilla?: string;
  zona?: string;
  cargo?: string; // For entries-2.csv
  pollas?: string;
  despensas?: string;
  laminas?: string;
}

function extractSeccion(seccionCasilla: string): string {
  if (!seccionCasilla) return '';
  // Extract number from format like "(3877) - 20 DE NOVIEMBRE..."
  const match = seccionCasilla.match(/\((\d+)\)/);
  return match ? match[1] : '';
}

function parseFechaNacimiento(dateStr: string): string {
  if (!dateStr || dateStr.trim() === '0000-00-00') return '';
  
  // Handle formats like "2000-07-07", "1992-03-27", etc.
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    
    // Validate date components
    if (year && month && day && year !== '0000') {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  return '';
}

function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  // Remove hyphens and spaces
  return phone.replace(/[-\s]/g, '');
}

function buildNotasApoyos(row: any): string {
  const notas: string[] = [];
  
  if (row.pollas && row.pollas.trim()) {
    notas.push(`Pollas: ${row.pollas.trim()}`);
  }
  if (row.despensas && row.despensas.trim()) {
    notas.push(`Despensas: ${row.despensas.trim()}`);
  }
  if (row.laminas && row.laminas.trim()) {
    notas.push(`Láminas: ${row.laminas.trim()}`);
  }
  
  return notas.join(', ');
}

async function parseCSV(filePath: string, hasExtraColumn: boolean = false): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const rows: CSVRow[] = [];
    
    createReadStream(filePath)
      .pipe(parse({
        columns: false,
        skip_empty_lines: true,
        trim: true,
        from: 2, // Skip header row
      }))
      .on('data', (row: string[]) => {
        // Skip empty rows
        if (!row[0] || row[0].trim() === '') return;
        
        const csvRow: CSVRow = {
          folio: row[0] || '',
          apellidos: row[1] || '',
          nombre: row[2] || '',
          segundoNombre: row[3] || '',
          telefono: row[4] || '',
          metodoContacto: row[5] || '',
          cumpleanos: row[6] || '',
          seccionCasilla: row[7] || '',
          zona: hasExtraColumn ? row[8] : row[9], // entries-2 has column at index 8, entries-1 at 9
        };
        
        // For entries-1.csv, collect support notes
        if (!hasExtraColumn) {
          csvRow.pollas = row[10] || '';
          csvRow.despensas = row[11] || '';
          csvRow.laminas = row[12] || '';
        } else {
          // For entries-2.csv, collect cargo
          csvRow.cargo = row[9] || '';
        }
        
        rows.push(csvRow);
      })
      .on('end', () => resolve(rows))
      .on('error', (error) => reject(error));
  });
}

async function importEntry(row: CSVRow, index: number): Promise<boolean> {
  try {
    // Skip if no folio or name
    if (!row.folio || !row.nombre) {
      console.log(`Skipping row ${index}: missing folio or name`);
      return false;
    }
    
    const timestamp = Date.now();
    const id = `${timestamp}-${Math.random().toString(36).substring(2, 15)}`;
    
    const fechaNacimiento = parseFechaNacimiento(row.cumpleanos || '');
    const seccionElectoral = extractSeccion(row.seccionCasilla || '');
    const casilla = row.seccionCasilla?.trim() || ''; // Store full section text
    const telefono = cleanPhoneNumber(row.telefono || '');
    const notasApoyos = buildNotasApoyos(row);
    const cargo = row.cargo?.trim() || ''; // Store position from entries-2
    
    // Build full name for search
    const nombre = row.nombre.trim();
    const segundoNombre = row.segundoNombre?.trim() || '';
    const apellidos = row.apellidos?.trim() || '';
    const fullName = [nombre, segundoNombre, apellidos].filter(Boolean).join(' ').toUpperCase();
    
    const entry = {
      PK: `ENTRY#${id}`,
      SK: `METADATA`,
      GSI1PK: `FOLIO#${row.folio}`,
      GSI1SK: `ENTRY#${id}`,
      GSI2PK: `NAME#${fullName}`,
      GSI2SK: `ENTRY#${id}`,
      id,
      folio: row.folio.trim(),
      nombre: nombre,
      segundoNombre: segundoNombre,
      apellidos: apellidos,
      telefono: telefono,
      metodoContacto: row.metodoContacto?.trim() || '',
      fechaNacimiento: fechaNacimiento,
      seccionElectoral: seccionElectoral,
      casilla: casilla, // Full section text
      localidad: '', // Will be filled manually
      zona: row.zona?.trim() || '',
      cargo: cargo, // Position/role
      notasApoyos: notasApoyos,
      selfieS3Key: '',
      selfieUrl: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: entry,
      })
    );
    
    return true;
  } catch (error) {
    console.error(`Error importing entry ${index}:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting data import...\n');
  
  // Parse both CSV files
  console.log('📖 Reading entries-1.csv...');
  const entries1 = await parseCSV('/Users/pretzi/Downloads/entries-1.csv', false);
  console.log(`✅ Found ${entries1.length} entries in entries-1.csv\n`);
  
  console.log('📖 Reading entries-2.csv...');
  const entries2 = await parseCSV('/Users/pretzi/Downloads/entries-2.csv', true);
  console.log(`✅ Found ${entries2.length} entries in entries-2.csv\n`);
  
  const allEntries = [...entries1, ...entries2];
  console.log(`📊 Total entries to import: ${allEntries.length}\n`);
  
  // Import in batches
  let successCount = 0;
  let skipCount = 0;
  const batchSize = 25;
  
  for (let i = 0; i < allEntries.length; i += batchSize) {
    const batch = allEntries.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(allEntries.length / batchSize);
    
    console.log(`⏳ Processing batch ${batchNum}/${totalBatches} (entries ${i + 1}-${Math.min(i + batchSize, allEntries.length)})...`);
    
    const results = await Promise.all(
      batch.map((entry, idx) => importEntry(entry, i + idx + 1))
    );
    
    const batchSuccess = results.filter(r => r).length;
    const batchSkipped = results.filter(r => !r).length;
    
    successCount += batchSuccess;
    skipCount += batchSkipped;
    
    console.log(`   ✓ Imported: ${batchSuccess}, Skipped: ${batchSkipped}\n`);
    
    // Small delay between batches to avoid throttling
    if (i + batchSize < allEntries.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log('\n🎉 Import complete!');
  console.log(`   ✅ Successfully imported: ${successCount}`);
  console.log(`   ⏭️  Skipped: ${skipCount}`);
  console.log(`   📊 Total: ${allEntries.length}`);
}

main().catch(console.error);
