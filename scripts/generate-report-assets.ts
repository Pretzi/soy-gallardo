import 'dotenv/config';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Import sharp dynamically to avoid issues if not installed
let sharp: typeof import('sharp') | undefined;
try {
  sharp = require('sharp');
} catch {
  console.warn('⚠️  sharp not installed. Install with: npm install sharp');
}

const REPORT_TYPES = [
  { id: 'baches', imagePrompt: 'Flat icon of a road with a pothole, municipal services style, clean vector art, orange and red colors, white background' },
  { id: 'alumbrado', imagePrompt: 'Flat icon of a street lamp that is broken or dark, municipal services style, clean vector art, amber and yellow colors, white background' },
  { id: 'agua', imagePrompt: 'Flat icon of a water pipe with a leak, municipal services style, clean vector art, blue colors, white background' },
  { id: 'basura', imagePrompt: 'Flat icon of overflowing trash bins on a street, municipal services style, clean vector art, green colors, white background' },
  { id: 'parques', imagePrompt: 'Flat icon of a neglected park with overgrown grass, municipal services style, clean vector art, emerald green colors, white background' },
  { id: 'semaforos', imagePrompt: 'Flat icon of a broken traffic light, municipal services style, clean vector art, orange colors, white background' },
  { id: 'arboles', imagePrompt: 'Flat icon of a fallen dangerous tree on a sidewalk, municipal services style, clean vector art, lime green colors, white background' },
  { id: 'vandalismo', imagePrompt: 'Flat icon of graffiti on a public wall, municipal services style, clean vector art, violet purple colors, white background' },
  { id: 'seguridad', imagePrompt: 'Flat icon of a security alert or warning sign in a neighborhood, municipal services style, clean vector art, pink and red colors, white background' },
  { id: 'animales', imagePrompt: 'Flat icon of a stray dog on a street, municipal services style, clean vector art, purple colors, white background' },
  { id: 'ruido', imagePrompt: 'Flat icon of sound waves and noise pollution in a neighborhood, municipal services style, clean vector art, cyan colors, white background' },
  { id: 'otros', imagePrompt: 'Flat icon of a municipal services clipboard with checkmarks, clean vector art, slate gray colors, white background' },
];

async function generateImage(prompt: string): Promise<Buffer> {
  const KEY = process.env.GOOGLE_AI_API_KEY;
  if (!KEY) throw new Error('GOOGLE_AI_API_KEY not set in .env');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: '1:1' },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Imagen API error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const b64 = json.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error('No image data in response');

  return Buffer.from(b64, 'base64');
}

async function main() {
  const outDir = join(process.cwd(), 'public', 'icons', 'reportes');
  mkdirSync(outDir, { recursive: true });

  console.log(`Generating ${REPORT_TYPES.length} report type icons...`);
  console.log(`Output directory: ${outDir}\n`);

  for (const type of REPORT_TYPES) {
    console.log(`Generating ${type.id}...`);
    try {
      const imageBuffer = await generateImage(type.imagePrompt);

      // Save full size (1024x1024)
      const fullPath = join(outDir, `${type.id}.png`);
      writeFileSync(fullPath, imageBuffer);

      // Save thumbnail (256x256) if sharp is available
      if (sharp) {
        const thumbPath = join(outDir, `${type.id}-sm.png`);
        await sharp(imageBuffer)
          .resize(256, 256, { fit: 'cover' })
          .png()
          .toFile(thumbPath);
        console.log(`  ✓ ${type.id}.png + ${type.id}-sm.png`);
      } else {
        console.log(`  ✓ ${type.id}.png (no thumbnail, sharp not installed)`);
      }

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.error(`  ✗ Error generating ${type.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
