/**
 * Script to convert CSV folio format from XXX.XXX.XXX to XXXXXX
 * 
 * This script reads CSV files with old folio format and converts them to the new format.
 * Usage: npx tsx scripts/convert-csv-folios.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

function convertFolio(oldFolio: string): string {
  // Remove dots and any whitespace
  const cleaned = oldFolio.replace(/\./g, '').trim();
  
  // Parse as integer and pad to 6 digits
  const numericValue = parseInt(cleaned, 10);
  
  if (isNaN(numericValue)) {
    console.warn(`Warning: Invalid folio "${oldFolio}" - keeping as is`);
    return oldFolio;
  }
  
  // Cap at 999999 for 6-digit format
  const cappedValue = Math.min(numericValue, 999999);
  
  // Convert to 6-digit string with leading zeros
  return cappedValue.toString().padStart(6, '0');
}

function convertCSVFile(inputPath: string, outputPath: string) {
  console.log(`\n📄 Processing: ${inputPath}`);
  console.log(`📝 Output to: ${outputPath}`);
  
  try {
    // Read the file
    const content = readFileSync(inputPath, 'utf-8');
    const lines = content.split('\n');
    
    if (lines.length === 0) {
      console.log('❌ File is empty');
      return;
    }
    
    // Process each line
    const convertedLines: string[] = [];
    let convertedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Keep header as is (first line)
      if (i === 0) {
        convertedLines.push(line);
        continue;
      }
      
      // Skip empty lines
      if (!line.trim()) {
        convertedLines.push(line);
        continue;
      }
      
      // Split by comma to get the folio (first column)
      const columns = line.split(',');
      
      if (columns.length > 0 && columns[0]) {
        const oldFolio = columns[0].trim();
        
        // Check if it's in old format (contains dots)
        if (oldFolio.includes('.')) {
          const newFolio = convertFolio(oldFolio);
          columns[0] = newFolio;
          convertedCount++;
          
          if (i <= 5) {
            console.log(`  ${oldFolio} → ${newFolio}`);
          }
        } else {
          skippedCount++;
        }
      }
      
      convertedLines.push(columns.join(','));
    }
    
    // Write the converted content
    writeFileSync(outputPath, convertedLines.join('\n'), 'utf-8');
    
    console.log(`✅ Converted ${convertedCount} folios`);
    if (skippedCount > 0) {
      console.log(`⏭️  Skipped ${skippedCount} entries (already in new format or empty)`);
    }
    console.log(`💾 Saved to: ${outputPath}`);
    
  } catch (error: any) {
    console.error(`❌ Error processing file:`, error.message);
  }
}

// Main execution
console.log('🔄 Starting CSV folio format conversion...\n');
console.log('Old format: XXX.XXX.XXX (9 digits with dots)');
console.log('New format: XXXXXX (6 digits)');

const downloadsPath1 = '/Users/pretzi/Downloads/entries-1.csv';
const downloadsPath2 = '/Users/pretzi/Downloads/entries-2.csv';
const projectPath1 = join(process.cwd(), 'data', 'entries-1.csv');
const projectPath2 = join(process.cwd(), 'data', 'entries-2.csv');

// Convert both files
convertCSVFile(downloadsPath1, projectPath1);
convertCSVFile(downloadsPath2, projectPath2);

console.log('\n' + '='.repeat(60));
console.log('✨ CSV Conversion Complete!');
console.log('='.repeat(60));
console.log('\n📁 Updated files in your project:');
console.log(`  - ${projectPath1}`);
console.log(`  - ${projectPath2}`);
console.log('\n💡 Next steps:');
console.log('  1. Review the converted CSV files');
console.log('  2. Run the database migration: npx tsx scripts/migrate-folio-format.ts');
console.log('  3. Test your application with the new format\n');
