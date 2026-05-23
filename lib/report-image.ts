import type { CanvasRenderingContext2D } from 'canvas';
import sharp from 'sharp';
import QRCode from 'qrcode';
import { existsSync } from 'fs';
import path, { resolve } from 'path';
import type { Reporte } from './aws/reportes';
import { getReportClassification } from './report-types';
import { loadCanvas } from './load-canvas';

const SIZE = 1080;

let fontsRegistered = false;

function ensureFonts(registerFont: (path: string, options: { family: string; weight?: string }) => void) {
  if (fontsRegistered) return;
  fontsRegistered = true;
  const variants: { file: string; weight: string }[] = [
    { file: 'PlusJakartaSans-Regular.ttf',  weight: 'normal' },
    { file: 'PlusJakartaSans-Bold.ttf',      weight: 'bold' },
    { file: 'PlusJakartaSans-ExtraBold.ttf', weight: '800' },
  ];
  for (const { file, weight } of variants) {
    const p = resolve(process.cwd(), 'public', 'fonts', file);
    try { if (existsSync(p)) registerFont(p, { family: 'PlusJakarta', weight }); }
    catch { /* skip */ }
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Approximate ascender height for canvas text (used for gap math)
function ascender(fontSize: number) { return fontSize * 0.78; }

// Truncate text to fit maxWidth, adding ellipsis if needed
function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
}

export async function generateReportImage(reporte: Reporte, photoBuffer?: Buffer): Promise<Buffer> {
  const { createCanvas, loadImage, registerFont } = await loadCanvas();
  ensureFonts(registerFont);

  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  const classification = getReportClassification(reporte);
  const typeLabel  = classification.displayLabel;

  // ── Background ───────────────────────────────────────────────────
  if (photoBuffer) {
    const resized = await sharp(photoBuffer)
      .rotate() // apply EXIF orientation and strip metadata
      .resize(SIZE, SIZE, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 90 })
      .toBuffer();
    const bgImage = await loadImage(resized);
    ctx.drawImage(bgImage, 0, 0, SIZE, SIZE);

    const grad = ctx.createLinearGradient(0, 0, 0, SIZE);
    grad.addColorStop(0,    'rgba(0,0,0,0.65)');
    grad.addColorStop(0.30, 'rgba(0,0,0,0.15)');
    grad.addColorStop(0.65, 'rgba(0,0,0,0.55)');
    grad.addColorStop(1,    'rgba(0,0,0,0.93)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SIZE, SIZE);
  } else {
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, SIZE, SIZE);
    const grad = ctx.createRadialGradient(SIZE / 2, SIZE / 2, SIZE * 0.2, SIZE / 2, SIZE / 2, SIZE * 0.8);
    grad.addColorStop(0, 'rgba(249,115,22,0.0)');
    grad.addColorStop(1, 'rgba(249,115,22,0.18)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  // ── Orange accent bar ─────────────────────────────────────────────
  ctx.fillStyle = '#f97316';
  ctx.fillRect(0, 0, SIZE, 10);

  // ── Logo (left) ───────────────────────────────────────────────────
  const logoPath = path.resolve(process.cwd(), 'public', 'logo-2.png');
  if (existsSync(logoPath)) {
    try {
      const logo = await loadImage(logoPath);
      const logoH = 120;
      const logoW = (logo.width / logo.height) * logoH;
      ctx.drawImage(logo, 48, 32, logoW, logoH);
    } catch { /* skip */ }
  }

  // ── "Reporte Ciudadano" — top right ──────────────────────────────
  const TITLE_SIZE = 38;
  const SUB_SIZE   = 26;

  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur  = 10;
  ctx.textAlign   = 'right';

  ctx.font      = `bold ${TITLE_SIZE}px PlusJakarta`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Reporte Ciudadano', SIZE - 48, 95);

  ctx.font      = `bold 30px PlusJakarta`;
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fillText('Tierra Blanca, Veracruz', SIZE - 48, 95 + TITLE_SIZE + 4);

  // ── Layout: build strictly bottom-up ─────────────────────────────
  //
  //  All y values are canvas baselines (y=0 is top).
  //  Gap between two text blocks = visual pixels between
  //  the descenders of the top block and ascenders of the bottom block.
  //
  //  Folio (28px)         → baseline: SIZE - 56
  //  ── 20px gap ──
  //  QR bottom            → baseline top of folio - 20
  //  QR (150px)
  //  ── 44px gap ──
  //  Address last line    (54px, ExtBold)
  //  Address first line   (54px, 66px LH)
  //  ── 16px visual gap ──
  //  Type line            (36px, Regular)

  const FOLIO_SIZE  = 28;
  const ADDR_SIZE   = 54;
  const TYPE_SIZE   = 44;
  const QR_SIZE     = 100;
  const QR_PAD      = 8;

  // ── Right column: QR + folio ──────────────────────────────────────
  const FOLIO_Y   = SIZE - 60;
  const QR_BOTTOM = FOLIO_Y - FOLIO_SIZE - 20 - QR_PAD;
  const QR_TOP    = QR_BOTTOM - QR_SIZE;
  const QR_X      = SIZE - 48 - QR_SIZE;

  // ── Left column: type + address, pinned to bottom ─────────────────
  // Anchored independently — content sits at the very bottom left.
  // Text wraps within left column only (stops before QR x).
  const TEXT_MAX_W  = QR_X - 48 - 24;            // 24px gap before QR
  const ADDR_Y      = SIZE - 72;                  // single line, pinned to bottom
  const TYPE_Y      = ADDR_Y - ascender(ADDR_SIZE) - TYPE_SIZE * 0.2 - 22;

  // ── Type line ─────────────────────────────────────────────────────
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur  = 18;
  ctx.textAlign   = 'left';
  ctx.font        = `bold ${TYPE_SIZE}px PlusJakarta`;
  ctx.fillStyle   = 'rgba(255,255,255,0.88)';
  ctx.fillText(typeLabel, 48, TYPE_Y);

  // ── Address ───────────────────────────────────────────────────────
  ctx.font      = `800 ${ADDR_SIZE}px PlusJakarta`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 24;

  const locationParts = [reporte.calle, reporte.colonia].filter(Boolean).join(', ');
  ctx.fillText(truncateText(ctx, locationParts, TEXT_MAX_W), 48, ADDR_Y);

  // ── QR code ───────────────────────────────────────────────────────
  ctx.shadowBlur = 0;

  try {
    const qrUrl    = `https://soygallardo.mx/?folio=${reporte.folio}`;
    const qrBuffer = await QRCode.toBuffer(qrUrl, {
      type: 'png', width: QR_SIZE, margin: 1,
      color: { dark: '#111827', light: '#ffffff' },
    }) as Buffer;
    const qrImage = await loadImage(qrBuffer);

    const bx = QR_X - QR_PAD, by = QR_TOP - QR_PAD;
    const bw = QR_SIZE + QR_PAD * 2, bh = QR_SIZE + QR_PAD * 2;
    const r  = 12;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + bw - r, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
    ctx.lineTo(bx + r, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
    ctx.fill();

    ctx.drawImage(qrImage, QR_X, QR_TOP, QR_SIZE, QR_SIZE);
  } catch { /* skip */ }

  // ── Folio ─────────────────────────────────────────────────────────
  ctx.font      = `normal ${FOLIO_SIZE}px PlusJakarta`;
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.textAlign = 'right';
  ctx.fillText(`Folio: ${reporte.folio}`, SIZE - 48, FOLIO_Y);

  // ── Convert ───────────────────────────────────────────────────────
  const pngBuffer = canvas.toBuffer('image/png');
  return sharp(pngBuffer).jpeg({ quality: 92 }).toBuffer();
}
