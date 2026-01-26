import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Entry } from './validation';
import { formatFullName } from './validation';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function generateEntryPDF(entry: Entry, selfieBuffer?: Buffer): Promise<Buffer> {
  // ID Card size: 85.6mm × 53.98mm = 242.64 × 153 points (at 72 DPI)
  // Using a slightly larger format for better visibility: 300 × 200 points
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([400, 250]); // Landscape ID card size
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Orange header background (reduced height)
  const headerHeight = 35;
  page.drawRectangle({
    x: 0,
    y: height - headerHeight,
    width: width,
    height: headerHeight,
    color: rgb(1, 0.45, 0), // Orange #ff7300
  });

  // Header text: "Soy Gallardo y obtengo beneficios."
  page.drawText('Soy ', {
    x: 15,
    y: height - 23,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1), // White
  });
  
  page.drawText('Gallardo', {
    x: 55,
    y: height - 23,
    size: 21,
    font: fontBold,
    color: rgb(0, 0, 0), // Black
  });
  
  page.drawText(' y obtengo beneficios.', {
    x: 140,
    y: height - 23,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1), // White
  });

  // Embed selfie image first (below orange stripe, left side)
  const photoSize = 100;
  let selfieHeight = 0;
  let selfieWidth = 0;
  let selfieY = 0;
  if (selfieBuffer) {
    try {
      let image;
      try {
        image = await pdfDoc.embedJpg(selfieBuffer);
      } catch {
        image = await pdfDoc.embedPng(selfieBuffer);
      }
      
      // Photo below orange stripe, left side
      const imageDims = image.scale(photoSize / image.width);
      selfieHeight = imageDims.height;
      selfieWidth = imageDims.width;
      selfieY = height - headerHeight - imageDims.height - 10;
      
      page.drawImage(image, {
        x: 15,
        y: selfieY,
        width: imageDims.width,
        height: imageDims.height,
      });
    } catch (error) {
      console.error('Error embedding selfie in PDF:', error);
    }
  }

  // Decorative dots pattern (orange gradient) - aligned with selfie size
  let dotsEndX = 0;
  if (selfieHeight > 0 && selfieWidth > 0) {
    const baseDotRadius = 3; // Starting radius for first 2 columns
    const startX = 15 + selfieWidth + 5; // Start right after selfie with small margin
    const startY = selfieY + selfieHeight; // Start at top of selfie
    const dotsContainerWidth = selfieWidth; // Container same width as selfie
    const totalColumns = 18;
    
    dotsEndX = startX + dotsContainerWidth; // Track where dots end
    
    // Calculate uniform vertical spacing for all columns
    const verticalSpacing = selfieHeight / 17; // 17 spaces for ~18 dots vertically
    const numRows = 18;
    
    // Calculate column width to fit exactly in container
    const columnWidth = dotsContainerWidth / totalColumns;
    
    for (let col = 0; col < totalColumns; col++) {
      let dotRadius, opacity;
      
      if (col < 2) {
        // First 2 columns: full size
        dotRadius = baseDotRadius;
        opacity = 1;
      } else {
        // Column 3+: progressively smaller
        const shrinkFactor = 1 - ((col - 1) * 0.08); // Decrease size by ~8% each column
        dotRadius = Math.max(0.5, baseDotRadius * shrinkFactor);
        opacity = Math.max(0.15, 1 - ((col - 2) * 0.06)); // Gradual fade
      }
      
      const xPos = startX + (col * columnWidth) + (columnWidth / 2);
      
      // Draw column with uniform vertical alignment
      for (let row = 0; row < numRows; row++) {
        const yPos = startY - (row * verticalSpacing);
        
        page.drawCircle({
          x: xPos,
          y: yPos,
          size: dotRadius,
          color: rgb(1, 0.45, 0), // Orange #ff7300
          opacity: opacity,
        });
      }
    }
  }

  // Embed logo in remaining space (right side)
  if (dotsEndX > 0 && selfieHeight > 0) {
    try {
      const logoPath = join(process.cwd(), 'public', 'logo-2.png');
      const logoImageBytes = readFileSync(logoPath);
      const logoImage = await pdfDoc.embedPng(logoImageBytes);
      
      // Calculate remaining space with minimal margins
      const rightMargin = 10;
      const topGap = 8; // Gap from top
      const availableWidth = width - dotsEndX - rightMargin - 5; // Reduced margin from dots
      const availableHeight = selfieHeight * 1.4; // Slightly smaller logo
      
      // Scale logo to fit in available space
      const logoAspectRatio = logoImage.width / logoImage.height;
      let logoWidth = availableWidth;
      let logoHeight = logoWidth / logoAspectRatio;
      
      // If too tall, scale by height instead
      if (logoHeight > availableHeight) {
        logoHeight = availableHeight;
        logoWidth = logoHeight * logoAspectRatio;
      }
      
      // Position logo with gap from top
      const logoX = dotsEndX + 5 + (availableWidth - logoWidth) / 2;
      const logoY = selfieY + selfieHeight - logoHeight - topGap;
      
      page.drawImage(logoImage, {
        x: logoX,
        y: logoY,
        width: logoWidth,
        height: logoHeight,
      });
    } catch (error) {
      console.error('Error embedding logo in PDF:', error);
    }
  }

  // Main content area - start below the selfie
  let yPosition = height - headerHeight - selfieHeight - 30; // Position below selfie

  // "Número de afiliado:" label
  page.drawText('Número de afiliado:', {
    x: 15,
    y: yPosition,
    size: 16,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  yPosition -= 22;

  // Folio (large, orange)
  page.drawText(entry.folio, {
    x: 15,
    y: yPosition,
    size: 18,
    font: fontBold,
    color: rgb(1, 0.4, 0), // Orange
  });
  yPosition -= 25;

  // "Nombre completo:" label
  page.drawText('Nombre completo:', {
    x: 15,
    y: yPosition,
    size: 16,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  yPosition -= 22;

  // Full name (large, orange)
  const fullName = formatFullName(entry).toUpperCase();
  page.drawText(fullName, {
    x: 15,
    y: yPosition,
    size: 18,
    font: fontBold,
    color: rgb(1, 0.4, 0), // Orange
    maxWidth: width  // Leave space for logo
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
