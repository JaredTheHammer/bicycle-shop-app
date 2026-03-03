#!/usr/bin/env node
// ─── Generate PNG icons from SVG sources ─────────────────────────────
// iOS Safari requires PNG icons (it ignores SVGs in apple-touch-icon).
// Run: node scripts/generate-icons.mjs

import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, "../public/icons");

const ICONS = [
  // Apple touch icon (shown on home screen)
  { src: "icon-512.svg", out: "icon-180.png", size: 180 },
  // Standard PWA icons
  { src: "icon-192.svg", out: "icon-192.png", size: 192 },
  { src: "icon-512.svg", out: "icon-512.png", size: 512 },
  // Maskable (safe-zone-aware, used by Android adaptive icons)
  { src: "icon-maskable-512.svg", out: "icon-maskable-512.png", size: 512 },
];

for (const icon of ICONS) {
  const svgBuffer = readFileSync(resolve(iconsDir, icon.src));
  await sharp(svgBuffer)
    .resize(icon.size, icon.size)
    .png()
    .toFile(resolve(iconsDir, icon.out));
  console.log(`  ✓ ${icon.out} (${icon.size}×${icon.size})`);
}

console.log("\nDone! PNG icons generated in public/icons/");
