import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Entry } from './validation';
import { formatFullName } from './validation';

export async function generateEntryPDF(entry: Entry, selfieBuffer?: Buffer): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const fontSize = 12;
  const lineHeight = 20;
  let yPosition = height - 50;

  // Title
  page.drawText('FICHA DE REGISTRO', {
    x: 50,
    y: yPosition,
    size: 18,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  yPosition -= 40;

  // Helper function to draw field
  const drawField = (label: string, value: string) => {
    page.drawText(`${label}:`, {
      x: 50,
      y: yPosition,
      size: fontSize,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    page.drawText(value || 'N/A', {
      x: 200,
      y: yPosition,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
  };

  // Draw all fields
  drawField('Folio', entry.folio);
  drawField('Nombre Completo', formatFullName(entry));
  drawField('Teléfono', entry.telefono);
  drawField('Método de Contacto', entry.metodoContacto);
  drawField('Fecha de Nacimiento', entry.fechaNacimiento);
  drawField('Sección Electoral', entry.seccionElectoral);
  drawField('Localidad', entry.localidad);
  
  yPosition -= 10;
  
  // Notes (multi-line)
  if (entry.notasApoyos) {
    page.drawText('Notas de Apoyos:', {
      x: 50,
      y: yPosition,
      size: fontSize,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
    
    const notes = entry.notasApoyos.substring(0, 200); // Limit length
    page.drawText(notes, {
      x: 50,
      y: yPosition,
      size: fontSize - 1,
      font: font,
      color: rgb(0, 0, 0),
      maxWidth: width - 100,
    });
    yPosition -= lineHeight * 2;
  }

  // Embed selfie image if provided (square format from OpenAI)
  if (selfieBuffer) {
    try {
      // Try JPEG first (OpenAI output format), fallback to PNG
      let image;
      try {
        image = await pdfDoc.embedJpg(selfieBuffer);
      } catch {
        image = await pdfDoc.embedPng(selfieBuffer);
      }
      
      // Scale to fit nicely in top-right corner (square image)
      const maxSize = 150; // pixels
      const imageDims = image.scale(maxSize / image.width);
      
      page.drawImage(image, {
        x: width - imageDims.width - 50,
        y: height - imageDims.height - 50,
        width: imageDims.width,
        height: imageDims.height,
      });
    } catch (error) {
      console.error('Error embedding selfie in PDF:', error);
    }
  }

  // Footer
  page.drawText(`Generado: ${new Date().toLocaleString('es-MX')}`, {
    x: 50,
    y: 30,
    size: 9,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
