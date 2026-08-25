/**
 * Generates the PWA PNG icons from an inline SVG source.
 *
 * Run with `npm run icons`. Committed output means a normal build needs no image
 * pipeline, and `sharp` is already present as an Astro dependency, so this costs
 * no extra install.
 *
 * The maskable variant carries much heavier padding: Android crops maskable icons
 * to a circle or squircle, and an icon drawn edge to edge loses its corners.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const BRAND = '#0f6b47';

/** @param {number} size @param {number} inset padding as a fraction of the canvas */
function svg(size, inset) {
  const pad = Math.round(size * inset);
  const box = size - pad * 2;
  const radius = Math.round(box * 0.22);
  const fontSize = Math.round(box * 0.46);
  const baseline = pad + box / 2 + fontSize * 0.35;

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="${BRAND}"/>
      <rect x="${pad}" y="${pad}" width="${box}" height="${box}" rx="${radius}" fill="${BRAND}"/>
      <text x="${size / 2}" y="${baseline}"
            font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
            font-size="${fontSize}" font-weight="700" fill="#ffffff" text-anchor="middle">ND</text>
    </svg>`
  );
}

const TARGETS = [
  { file: 'icon-192.png', size: 192, inset: 0 },
  { file: 'icon-512.png', size: 512, inset: 0 },
  // ~20% safe-zone padding on every side for Android's maskable crop.
  { file: 'icon-maskable-512.png', size: 512, inset: 0.2 },
];

await mkdir(OUT_DIR, { recursive: true });

for (const { file, size, inset } of TARGETS) {
  const png = await sharp(svg(size, inset)).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(join(OUT_DIR, file), png);
  console.log(`wrote ${file} (${size}x${size}, ${png.length} bytes)`);
}
