/**
 * gen-dev-icons.mjs — Generate dev-variant icons with a red "DEV" banner
 *
 * Reads base icons from src-tauri/icons/, composites a red corner banner,
 * writes results to src-tauri/icons-dev/. Run once, commit the output.
 *
 * Usage: node tools/gen-dev-icons.mjs
 */
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ICONS_SRC = path.join(ROOT, 'src-tauri', 'icons');
const ICONS_DEV = path.join(ROOT, 'src-tauri', 'icons-dev');

fs.mkdirSync(ICONS_DEV, { recursive: true });

/** Create an SVG overlay with a red corner banner and white "DEV" text */
function devBannerSvg(size) {
  // Banner covers top-right corner — diagonal stripe
  const fontSize = Math.max(Math.round(size * 0.14), 6);
  const bandWidth = Math.round(size * 0.38);

  return Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="corner">
      <polygon points="${size},0 ${size},${bandWidth} ${size - bandWidth},0"/>
    </clipPath>
  </defs>
  <!-- Red triangle in top-right corner -->
  <polygon points="${size},0 ${size},${bandWidth} ${size - bandWidth},0" fill="#e53935"/>
  <!-- DEV text rotated 45° along the diagonal -->
  <text
    x="${size - bandWidth * 0.42}"
    y="${bandWidth * 0.38}"
    font-family="Arial, Helvetica, sans-serif"
    font-weight="900"
    font-size="${fontSize}"
    fill="white"
    text-anchor="middle"
    dominant-baseline="central"
    transform="rotate(45, ${size - bandWidth * 0.42}, ${bandWidth * 0.38})"
  >DEV</text>
</svg>`);
}

// PNG icons to process
const pngIcons = ['32x32.png', '128x128.png', '128x128@2x.png'];

for (const name of pngIcons) {
  const src = path.join(ICONS_SRC, name);
  const dst = path.join(ICONS_DEV, name);
  const meta = await sharp(src).metadata();
  const size = meta.width;

  await sharp(src)
    .composite([{ input: devBannerSvg(size), top: 0, left: 0 }])
    .png()
    .toFile(dst);

  console.log(`✓ ${name} (${size}x${size})`);
}

// ICO — build from the 32x32 dev icon
const ico32 = path.join(ICONS_DEV, '32x32.png');
// sharp doesn't output .ico natively, so we'll build a minimal ICO from the 32x32 PNG
const ico32Buf = fs.readFileSync(ico32);
const icoDst = path.join(ICONS_DEV, 'icon.ico');

// Minimal ICO format: header + 1 entry + PNG data
function buildIco(pngBuffer) {
  const img = pngBuffer;
  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);     // reserved
  header.writeUInt16LE(1, 2);     // type: ICO
  header.writeUInt16LE(1, 4);     // 1 image

  // Directory entry: 16 bytes
  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0);        // width (0 = 256)
  entry.writeUInt8(32, 1);        // height
  entry.writeUInt8(0, 2);         // color palette
  entry.writeUInt8(0, 3);         // reserved
  entry.writeUInt16LE(1, 4);      // color planes
  entry.writeUInt16LE(32, 6);     // bits per pixel
  entry.writeUInt32LE(img.length, 8);   // image size
  entry.writeUInt32LE(6 + 16, 12);      // offset to image data

  return Buffer.concat([header, entry, img]);
}

fs.writeFileSync(icoDst, buildIco(ico32Buf));
console.log('✓ icon.ico (from 32x32 PNG)');

// ICNS — just copy from base (macOS not critical for now)
const icnsSrc = path.join(ICONS_SRC, 'icon.icns');
const icnsDst = path.join(ICONS_DEV, 'icon.icns');
fs.copyFileSync(icnsSrc, icnsDst);
console.log('✓ icon.icns (copied from base)');

console.log(`\nDone — dev icons written to src-tauri/icons-dev/`);
