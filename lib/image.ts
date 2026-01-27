import { createCanvas, loadImage, registerFont } from 'canvas';
import type { Entry } from './validation';
import { formatFullName } from './validation';
import { readFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

// Register Arial font for reliable text rendering in production
try {
  registerFont(require('@canvas-fonts/arial'), { family: 'Arial' });
} catch (error) {
  console.warn('Could not register Arial font, falling back to system fonts:', error);
}

// PDF dimensions: 400x250 points
// For high-quality image, use 4x resolution: 1600x1000 pixels
const IMAGE_WIDTH = 1600;
const IMAGE_HEIGHT = 1000;
const SCALE = 4; // Scale factor from PDF points to pixels

export async function generateEntryImage(entry: Entry, selfieBuffer?: Buffer): Promise<Buffer> {
  const canvas = createCanvas(IMAGE_WIDTH, IMAGE_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Set white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);

  // Set text rendering properties for better compatibility
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  // Convert PDF dimensions to pixels
  const width = IMAGE_WIDTH;
  const height = IMAGE_HEIGHT;
  const headerHeight = 35 * SCALE;
  const photoSize = 100 * SCALE;

  // Orange header background at the TOP
  ctx.fillStyle = '#FF7300'; // Orange #ff7300
  ctx.fillRect(0, 0, width, headerHeight);

  // Header text: "Soy Gallardo y obtengo beneficios." - LEFT ALIGNED
  // Use registered Arial font
  const startX = 15 * SCALE; // Left margin
  
  // Calculate widths of each part
  ctx.font = `bold ${20 * SCALE}px Arial`;
  const soyWidth = ctx.measureText('Soy ').width;
  
  ctx.font = `bold ${21 * SCALE}px Arial`;
  const gallardoWidth = ctx.measureText('Gallardo').width;
  
  // Vertically center: header center minus half the font size (since textBaseline is 'top')
  // Use the larger font size (21 * SCALE) as reference for better centering
  const baseFontSize = 21 * SCALE;
  const headerY = headerHeight / 2 - baseFontSize / 2; // Properly centered vertically
  
  // Draw "Soy " in white - adjust Y position for smaller font
  ctx.fillStyle = '#FFFFFF'; // White
  ctx.font = `bold ${20 * SCALE}px Arial`;
  const fontSizeDiff = (21 * SCALE - 20 * SCALE) / 2;
  ctx.fillText('Soy ', startX, headerY + fontSizeDiff);
  
  // Draw "Gallardo" in black - uses base font size, so no adjustment needed
  ctx.fillStyle = '#000000'; // Black
  ctx.font = `bold ${21 * SCALE}px Arial`;
  ctx.fillText('Gallardo', startX + soyWidth, headerY);
  
  // Draw " y obtengo beneficios." in white - adjust Y position for smaller font
  ctx.fillStyle = '#FFFFFF'; // White
  ctx.font = `bold ${20 * SCALE}px Arial`;
  ctx.fillText(' y obtengo beneficios.', startX + soyWidth + gallardoWidth, headerY + fontSizeDiff);

  // Process and embed selfie image (below the orange header at top)
  let selfieY = headerHeight + 10 * SCALE;
  if (selfieBuffer) {
    try {
      // Process image with sharp (same as PDF generation)
      const sharpImage = sharp(selfieBuffer);
      const metadata = await sharpImage.metadata();
      
      let rotationAngle = 0;
      if (metadata.orientation) {
        switch (metadata.orientation) {
          case 3:
            rotationAngle = 180;
            break;
          case 6:
            rotationAngle = 90;
            break;
          case 8:
            rotationAngle = -90;
            break;
        }
      }
      
      let processedImage = sharpImage;
      if (rotationAngle !== 0) {
        processedImage = processedImage.rotate(rotationAngle);
      }
      
      processedImage = processedImage.resize(photoSize, photoSize, {
        fit: 'cover',
        position: 'center',
      });
      
      const processedBuffer = await processedImage.jpeg({ quality: 95 }).toBuffer();
      const selfieImage = await loadImage(processedBuffer);
      
      ctx.drawImage(selfieImage, 15 * SCALE, selfieY, photoSize, photoSize);
    } catch (error) {
      console.error('Error embedding selfie in image:', error);
    }
  }

  // Decorative dots pattern (orange gradient)
  const dotsStartX = 15 * SCALE + photoSize + 5 * SCALE;
  const dotsContainerWidth = photoSize;
  const totalColumns = 18;
  const numRows = 18;
  const columnWidth = dotsContainerWidth / totalColumns;
  const verticalSpacing = photoSize / 17;
  const baseDotRadius = 3 * SCALE;

  for (let col = 0; col < totalColumns; col++) {
    let dotRadius, opacity;
    
    if (col < 2) {
      dotRadius = baseDotRadius;
      opacity = 1;
    } else {
      const shrinkFactor = 1 - ((col - 1) * 0.08);
      dotRadius = Math.max(0.5 * SCALE, baseDotRadius * shrinkFactor);
      opacity = Math.max(0.15, 1 - ((col - 2) * 0.06));
    }
    
    const xPos = dotsStartX + (col * columnWidth) + (columnWidth / 2);
    
    for (let row = 0; row < numRows; row++) {
      const yPos = selfieY + photoSize - (row * verticalSpacing);
      
      ctx.fillStyle = `rgba(255, 115, 0, ${opacity})`; // Orange with opacity
      ctx.beginPath();
      ctx.arc(xPos, yPos, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Embed logo
  try {
    const logoPath = join(process.cwd(), 'public', 'logo-2.png');
    const logoBuffer = readFileSync(logoPath);
    const logoImage = await loadImage(logoBuffer);
    
    const dotsEndX = dotsStartX + dotsContainerWidth;
    const rightMargin = 10 * SCALE;
    const topGap = 8 * SCALE;
    const availableWidth = width - dotsEndX - rightMargin - 5 * SCALE;
    const availableHeight = photoSize * 1.4;
    
    const logoAspectRatio = logoImage.width / logoImage.height;
    let logoWidth = availableWidth;
    let logoHeight = logoWidth / logoAspectRatio;
    
    if (logoHeight > availableHeight) {
      logoHeight = availableHeight;
      logoWidth = logoHeight * logoAspectRatio;
    }
    
    const logoX = dotsEndX + 5 * SCALE + (availableWidth - logoWidth) / 2;
    const logoY = selfieY + photoSize - logoHeight - topGap + 200; // Move 50 units closer to bottom
    
    ctx.drawImage(logoImage, logoX, logoY, logoWidth, logoHeight);
  } catch (error) {
    console.error('Error embedding logo in image:', error);
  }

  // Main content area (just below the selfie image)
  let yPosition = selfieY + photoSize + 5 * SCALE;

  // "Número de afiliado:" label - ABOVE the folio value
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${16 * SCALE}px Arial`;
  ctx.fillText('Número de afiliado:', 15 * SCALE, yPosition);
  yPosition += 18 * SCALE; // Move DOWN for the value (increased gap between label and value)

  // Folio (large, orange) - BELOW the label
  ctx.fillStyle = '#FF6600'; // Orange
  ctx.font = `bold ${18 * SCALE}px Arial`;
  ctx.fillText(entry.folio || '', 15 * SCALE, yPosition);
  yPosition += 24 * SCALE; // Extra space before next section (reduced gap between sections)

  // "Nombre completo:" label - ABOVE the name value
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${16 * SCALE}px Arial`;
  ctx.fillText('Nombre completo:', 15 * SCALE, yPosition);
  yPosition += 18 * SCALE; // Move DOWN for the value (increased gap between label and value)

  // Full name (large, orange) - BELOW the label
  const fullName = formatFullName(entry).toUpperCase();
  ctx.fillStyle = '#FF6600'; // Orange
  ctx.font = `bold ${18 * SCALE}px Arial`;
  
  // Handle text wrapping if name is too long
  const maxWidth = width - 30 * SCALE;
  const words = fullName.split(' ');
  let line = '';
  let currentY = yPosition;
  
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line, 15 * SCALE, currentY);
      line = words[i] + ' ';
      currentY += 22 * SCALE; // Move DOWN for next line
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, 15 * SCALE, currentY);

  // Test if text was rendered (debugging for production)
  // If fonts aren't available, canvas might render empty text
  try {
    const testMetrics = ctx.measureText('Test');
    if (testMetrics.width === 0) {
      console.warn('Warning: Text rendering may not be working - font might not be available');
    }
  } catch (error) {
    console.error('Error testing text rendering:', error);
  }

  // Convert canvas to PNG buffer
  const buffer = canvas.toBuffer('image/png');
  
  // Optionally convert to JPEG for smaller file size
  const jpegBuffer = await sharp(buffer)
    .jpeg({ quality: 100 })
    .toBuffer();
  
  return jpegBuffer;
}
