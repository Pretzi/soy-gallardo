import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Reporte } from './aws/reportes';
import type { MunicipioConfig } from './municipio-config';
import { getDirectorForCategory } from './municipio-config';
import { getReportClassification } from './report-types';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 72;
const LINE_HEIGHT = 16;
const BODY_SIZE = 11;

function wrapText(
  text: string,
  maxWidth: number,
  font: PDFFont,
  fontSize: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, fontSize) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  font: PDFFont,
  fontSize: number,
  lineHeight: number
): number {
  const lines = wrapText(text, maxWidth, font, fontSize);
  let y = startY;
  for (const line of lines) {
    page.drawText(line, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
  }
  return y;
}

function formatLetterDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Mexico_City',
  });
}

function buildLocation(reporte: Reporte): string {
  const parts = [reporte.calle, reporte.colonia, reporte.localidad].filter(Boolean);
  let location = parts.join(', ');
  if (reporte.referencia) {
    location += `. Referencia: ${reporte.referencia}`;
  }
  return location;
}

function buildBodyParagraphs(
  reporte: Reporte,
  classification: ReturnType<typeof getReportClassification>
): string[] {
  const location = buildLocation(reporte);
  const paragraphs: string[] = [];

  paragraphs.push(
    `Por medio del presente escrito, el suscrito(a) C. ${reporte.nombre.toUpperCase()}, en mi carácter de ciudadano(a) de este municipio, respetuosamente solicito su intervención para atender el siguiente reporte ciudadano con folio ${reporte.folio}:`
  );

  paragraphs.push(
    `Asunto: ${classification.categoryLabel}${classification.subcategoryLabel ? ` — ${classification.subcategoryLabel}` : ''}.`
  );

  if (reporte.descripcion?.trim()) {
    paragraphs.push(reporte.descripcion.trim());
  }

  paragraphs.push(`Ubicación: ${location}.`);

  if (reporte.lat != null && reporte.lng != null) {
    paragraphs.push(
      `Coordenadas: ${reporte.lat.toFixed(6)}, ${reporte.lng.toFixed(6)}.`
    );
  }

  paragraphs.push(
    'Agradezco de antemano su atención y quedo a sus órdenes para cualquier información adicional que requieran.'
  );

  paragraphs.push(
    'Sin más por el momento y en espera de una respuesta positiva, quedo a sus órdenes y le envío saludos cordiales.'
  );

  return paragraphs;
}

export async function generateReportPDF(
  reporte: Reporte,
  config: MunicipioConfig,
  signaturePng?: Buffer
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const classification = getReportClassification(reporte);
  const director = getDirectorForCategory(config, reporte.categoria);
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  const dateStr = formatLetterDate(reporte.createdAt);

  let y = PAGE_HEIGHT - MARGIN;

  const dateLine = `${config.municipioLabel} A ${dateStr}`;
  const dateWidth = font.widthOfTextAtSize(dateLine, BODY_SIZE);
  page.drawText(dateLine, {
    x: PAGE_WIDTH - MARGIN - dateWidth,
    y,
    size: BODY_SIZE,
    font,
  });
  y -= LINE_HEIGHT * 3;

  page.drawText(`C. ${config.alcaldeName}`, { x: MARGIN, y, size: BODY_SIZE, font: fontBold });
  y -= LINE_HEIGHT;
  page.drawText(config.alcaldeCargo, { x: MARGIN, y, size: BODY_SIZE, font: fontBold });
  y -= LINE_HEIGHT;
  page.drawText('PRESENTE', { x: MARGIN, y, size: BODY_SIZE, font: fontBold });
  y -= LINE_HEIGHT * 2;

  if (director) {
    page.drawText(`AT'N: ${director.name}`, { x: MARGIN, y, size: BODY_SIZE, font: fontBold });
    y -= LINE_HEIGHT;
    page.drawText(director.cargo, { x: MARGIN, y, size: BODY_SIZE, font });
    y -= LINE_HEIGHT * 2;
  }

  const paragraphs = buildBodyParagraphs(reporte, classification);
  for (const paragraph of paragraphs) {
    y = drawWrappedText(page, paragraph, MARGIN, y, contentWidth, font, BODY_SIZE, LINE_HEIGHT + 2);
    y -= LINE_HEIGHT;
  }

  y -= LINE_HEIGHT * 2;
  const attWidth = fontBold.widthOfTextAtSize('ATENTAMENTE', BODY_SIZE);
  page.drawText('ATENTAMENTE', {
    x: (PAGE_WIDTH - attWidth) / 2,
    y,
    size: BODY_SIZE,
    font: fontBold,
  });
  y -= LINE_HEIGHT * 3;

  if (signaturePng) {
    try {
      const sigImage = await pdfDoc.embedPng(signaturePng);
      const sigWidth = 160;
      const sigHeight = (sigImage.height / sigImage.width) * sigWidth;
      page.drawImage(sigImage, {
        x: (PAGE_WIDTH - sigWidth) / 2,
        y: y - sigHeight + 10,
        width: sigWidth,
        height: sigHeight,
      });
      y -= sigHeight + 10;
    } catch {
      // skip invalid signature
    }
  }

  y -= LINE_HEIGHT;
  const lineWidth = 200;
  page.drawLine({
    start: { x: (PAGE_WIDTH - lineWidth) / 2, y },
    end: { x: (PAGE_WIDTH + lineWidth) / 2, y },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });
  y -= LINE_HEIGHT * 1.5;

  const nameLine = `C. ${reporte.nombre.toUpperCase()}`;
  const nameWidth = fontBold.widthOfTextAtSize(nameLine, BODY_SIZE);
  page.drawText(nameLine, {
    x: (PAGE_WIDTH - nameWidth) / 2,
    y,
    size: BODY_SIZE,
    font: fontBold,
  });
  y -= LINE_HEIGHT;

  if (reporte.telefono) {
    const phoneWidth = font.widthOfTextAtSize(reporte.telefono, BODY_SIZE);
    page.drawText(reporte.telefono, {
      x: (PAGE_WIDTH - phoneWidth) / 2,
      y,
      size: BODY_SIZE,
      font,
    });
  }

  page.drawText(`Folio: ${reporte.folio}`, {
    x: MARGIN,
    y: MARGIN / 2,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  return Buffer.from(await pdfDoc.save());
}
