/**
 * gen-cassette-icon.mjs — Generate cassette tape app icon
 *
 * Creates a minimal cassette tape icon derived from the Player's cassette design.
 * Dark background, light cassette — works at all sizes down to 16x16.
 *
 * Outputs to src-tauri/icons/ and regenerates dev icons.
 *
 * Usage: node tools/gen-cassette-icon.mjs
 */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ICONS_DIR = path.join(ROOT, 'src-tauri', 'icons');

// Colors — match app dark theme
const BG = '#141420';
const BODY = '#e8e8f0';      // cassette shell
const WINDOW = '#1e1e30';    // reel window cutouts
const HUB = '#b0b0c0';       // reel hub detail
const ACCENT = '#9580ff';    // subtle accent on tape head area

/**
 * Generate cassette SVG at a given canvas size.
 * Design is centered with padding.
 */
function cassetteSvg(size) {
  const pad = Math.round(size * 0.12);
  const w = size - pad * 2;
  const h = Math.round(w * 0.68); // cassette aspect ratio ~1.5:1
  const ox = pad;
  const oy = Math.round((size - h) / 2);
  const r = Math.round(w * 0.06); // corner radius

  // Reel positions & sizes (relative to cassette body)
  const reelR = Math.round(w * 0.17);
  const reelCy = oy + Math.round(h * 0.42);
  const reel1Cx = ox + Math.round(w * 0.28);
  const reel2Cx = ox + Math.round(w * 0.72);

  // Hub (inner notched circle)
  const hubR = Math.round(reelR * 0.52);
  const spindleR = Math.max(Math.round(reelR * 0.12), 1);

  // Tape head window
  const thW = Math.round(w * 0.28);
  const thH = Math.round(h * 0.16);
  const thX = ox + Math.round((w - thW) / 2);
  const thY = oy + h - thH - Math.round(h * 0.06);
  const thR = Math.max(Math.round(thH * 0.2), 1);

  // Label area (between reels, above tape head)
  const labelW = Math.round(w * 0.82);
  const labelH = Math.round(h * 0.52);
  const labelX = ox + Math.round((w - labelW) / 2);
  const labelY = oy + Math.round(h * 0.14);
  const labelR = Math.max(Math.round(r * 0.5), 1);

  // Center bridge between reels
  const bridgeW = Math.round(w * 0.08);
  const bridgeH = Math.round(labelH * 0.75);
  const bridgeX = ox + Math.round((w - bridgeW) / 2);
  const bridgeY = labelY + Math.round((labelH - bridgeH) * 0.4);

  // Screws (only for larger sizes)
  const showScrews = size >= 64;
  const screwR = Math.max(Math.round(w * 0.02), 1);
  const screwInset = Math.round(w * 0.08);

  // Generate hub notch polygon (8-notch pattern like the Player)
  function hubNotches(cx, cy, outerR, innerR, numNotches = 8) {
    if (outerR < 3) return ''; // too small to render
    const points = [];
    const notchAngle = (12 / 360) * 2 * Math.PI;
    const gapAngle = (2 * Math.PI / numNotches) - notchAngle;

    for (let i = 0; i < numNotches; i++) {
      const baseAngle = (i * 2 * Math.PI) / numNotches;
      // Outer edge start
      points.push([
        cx + outerR * Math.cos(baseAngle),
        cy + outerR * Math.sin(baseAngle)
      ]);
      // Outer edge end
      points.push([
        cx + outerR * Math.cos(baseAngle + notchAngle),
        cy + outerR * Math.sin(baseAngle + notchAngle)
      ]);
      // Inner edge (notch dip)
      points.push([
        cx + innerR * Math.cos(baseAngle + notchAngle),
        cy + innerR * Math.sin(baseAngle + notchAngle)
      ]);
      points.push([
        cx + innerR * Math.cos(baseAngle + notchAngle + gapAngle * 0.15),
        cy + innerR * Math.sin(baseAngle + notchAngle + gapAngle * 0.15)
      ]);
      // Back to outer for next notch
      const nextAngle = ((i + 1) * 2 * Math.PI) / numNotches;
      points.push([
        cx + outerR * Math.cos(nextAngle - notchAngle * 0.2),
        cy + outerR * Math.sin(nextAngle - notchAngle * 0.2)
      ]);
    }
    return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  }

  // Tape guide blocks in head window
  const guideW = Math.max(Math.round(thW * 0.12), 1);
  const guideH = Math.max(Math.round(thH * 0.55), 1);
  const guideY = thY + Math.round((thH - guideH) / 2);
  const guide1X = thX + Math.round(thW * 0.12);
  const guide2X = thX + thW - Math.round(thW * 0.12) - guideW;

  const hub1Points = hubNotches(reel1Cx, reelCy, hubR, hubR * 0.7);
  const hub2Points = hubNotches(reel2Cx, reelCy, hubR, hubR * 0.7);

  return Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.12)}" fill="${BG}"/>

  <!-- Cassette body -->
  <rect x="${ox}" y="${oy}" width="${w}" height="${h}" rx="${r}" fill="${BODY}"/>

  <!-- Inner bezel -->
  <rect x="${ox + Math.round(w * 0.025)}" y="${oy + Math.round(h * 0.04)}" width="${w - Math.round(w * 0.05)}" height="${h - Math.round(h * 0.08)}" rx="${Math.max(r - 1, 1)}" fill="none" stroke="${BG}" stroke-width="${Math.max(Math.round(size * 0.004), 0.5)}" opacity="0.2"/>

  <!-- Label/window area -->
  <rect x="${labelX}" y="${labelY}" width="${labelW}" height="${labelH}" rx="${labelR}" fill="${BG}" opacity="0.12"/>

  <!-- Reel windows -->
  <circle cx="${reel1Cx}" cy="${reelCy}" r="${reelR}" fill="${WINDOW}"/>
  <circle cx="${reel2Cx}" cy="${reelCy}" r="${reelR}" fill="${WINDOW}"/>

  <!-- Reel rings -->
  <circle cx="${reel1Cx}" cy="${reelCy}" r="${reelR}" fill="none" stroke="${HUB}" stroke-width="${Math.max(Math.round(size * 0.008), 0.8)}" opacity="0.5"/>
  <circle cx="${reel2Cx}" cy="${reelCy}" r="${reelR}" fill="none" stroke="${HUB}" stroke-width="${Math.max(Math.round(size * 0.008), 0.8)}" opacity="0.5"/>

  <!-- Hub notches -->
  ${hub1Points ? `<polygon points="${hub1Points}" fill="${HUB}" opacity="0.6"/>` : ''}
  ${hub2Points ? `<polygon points="${hub2Points}" fill="${HUB}" opacity="0.6"/>` : ''}

  <!-- Spindle holes -->
  <circle cx="${reel1Cx}" cy="${reelCy}" r="${spindleR}" fill="${WINDOW}"/>
  <circle cx="${reel2Cx}" cy="${reelCy}" r="${spindleR}" fill="${WINDOW}"/>

  <!-- Center bridge -->
  <rect x="${bridgeX}" y="${bridgeY}" width="${bridgeW}" height="${bridgeH}" fill="${BG}" opacity="0.15"/>

  <!-- Tape head window -->
  <rect x="${thX}" y="${thY}" width="${thW}" height="${thH}" rx="${thR}" fill="${WINDOW}" stroke="${BG}" stroke-width="${Math.max(Math.round(size * 0.005), 0.5)}" stroke-opacity="0.3"/>

  <!-- Tape guides -->
  <rect x="${guide1X}" y="${guideY}" width="${guideW}" height="${guideH}" rx="${Math.max(Math.round(guideW * 0.2), 0.5)}" fill="${HUB}" opacity="0.5"/>
  <rect x="${guide2X}" y="${guideY}" width="${guideW}" height="${guideH}" rx="${Math.max(Math.round(guideW * 0.2), 0.5)}" fill="${HUB}" opacity="0.5"/>

  <!-- Corner screws -->
  ${showScrews ? `
  <circle cx="${ox + screwInset}" cy="${oy + screwInset}" r="${screwR}" fill="none" stroke="${BG}" stroke-width="${Math.max(Math.round(size * 0.004), 0.5)}" opacity="0.3"/>
  <circle cx="${ox + w - screwInset}" cy="${oy + screwInset}" r="${screwR}" fill="none" stroke="${BG}" stroke-width="${Math.max(Math.round(size * 0.004), 0.5)}" opacity="0.3"/>
  <circle cx="${ox + screwInset}" cy="${oy + h - screwInset}" r="${screwR}" fill="none" stroke="${BG}" stroke-width="${Math.max(Math.round(size * 0.004), 0.5)}" opacity="0.3"/>
  <circle cx="${ox + w - screwInset}" cy="${oy + h - screwInset}" r="${screwR}" fill="none" stroke="${BG}" stroke-width="${Math.max(Math.round(size * 0.004), 0.5)}" opacity="0.3"/>
  ` : ''}

  <!-- Subtle accent line at bottom of tape head area -->
  <line x1="${thX + Math.round(thW * 0.15)}" y1="${thY + thH}" x2="${thX + thW - Math.round(thW * 0.15)}" y2="${thY + thH}" stroke="${ACCENT}" stroke-width="${Math.max(Math.round(size * 0.006), 0.5)}" opacity="0.5"/>
</svg>`);
}

/** Build minimal ICO from a 32px PNG buffer */
function buildIco(pngBuffers) {
  // ICO header: 6 bytes
  const numImages = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);           // reserved
  header.writeUInt16LE(1, 2);           // type: ICO
  header.writeUInt16LE(numImages, 4);   // image count

  let offset = 6 + numImages * 16;     // after header + all entries
  const entries = [];
  for (const { buf, size } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);   // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1);   // height
    entry.writeUInt8(0, 2);             // color palette
    entry.writeUInt8(0, 3);             // reserved
    entry.writeUInt16LE(1, 4);          // color planes
    entry.writeUInt16LE(32, 6);         // bits per pixel
    entry.writeUInt32LE(buf.length, 8); // image data size
    entry.writeUInt32LE(offset, 12);    // offset to image data
    entries.push(entry);
    offset += buf.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buf)]);
}

// --- Generate all icon sizes ---

const sizes = {
  '32x32.png': 32,
  '64x64.png': 64,
  '128x128.png': 128,
  '128x128@2x.png': 256,
  'icon.png': 512,
};

// Windows Store logos
const storeSizes = {
  'StoreLogo.png': 50,
  'Square30x30Logo.png': 30,
  'Square44x44Logo.png': 44,
  'Square71x71Logo.png': 71,
  'Square89x89Logo.png': 89,
  'Square107x107Logo.png': 107,
  'Square142x142Logo.png': 142,
  'Square150x150Logo.png': 150,
  'Square284x284Logo.png': 284,
  'Square310x310Logo.png': 310,
};

// Generate main icons
for (const [name, size] of Object.entries(sizes)) {
  const svg = cassetteSvg(size);
  const dst = path.join(ICONS_DIR, name);
  await sharp(svg).png().toFile(dst);
  console.log(`✓ ${name} (${size}x${size})`);
}

// Generate store icons
for (const [name, size] of Object.entries(storeSizes)) {
  const svg = cassetteSvg(size);
  const dst = path.join(ICONS_DIR, name);
  await sharp(svg).png().toFile(dst);
  console.log(`✓ ${name} (${size}x${size})`);
}

// Generate ICO with multiple sizes (16, 32, 48, 256)
const icoSizes = [16, 32, 48, 256];
const icoBuffers = [];
for (const size of icoSizes) {
  const svg = cassetteSvg(size);
  const buf = await sharp(svg).png().toBuffer();
  icoBuffers.push({ buf, size });
}
const icoDst = path.join(ICONS_DIR, 'icon.ico');
fs.writeFileSync(icoDst, buildIco(icoBuffers));
console.log(`✓ icon.ico (${icoSizes.join(', ')}px)`);

console.log('\nDone — icons written to src-tauri/icons/');
console.log('Run `node tools/gen-dev-icons.mjs` to regenerate dev icons.');
