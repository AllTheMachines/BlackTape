/**
 * generate-rabbit-hole.mjs
 * Generates the Rabbit Hole page hero image using Gemini 3.1 Flash Image (Nano Banana 2).
 * Top-down centrifuge/spiral vortex. Saves to src/lib/assets/rabbit-hole-spiral.png
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(ROOT, 'src/lib/assets/rabbit-hole-spiral.png');

const API_KEY = 'AIzaSyAzenfN2o-f0qPuPKmFbPOUF8neIbTWAC4';
const MODEL = 'gemini-3.1-flash-image-preview';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const PROMPT = [
  'A perfect top-down aerial view looking straight down into a spinning centrifuge or mechanical vortex.',
  'Circular composition, perfectly centered, symmetrical radial design.',
  'Concentric rings of mechanical detail — gears, grooves, bolts, tubes, chambers — arranged radially outward.',
  'At the very center is a deep black void pulling inward like a drain or a rabbit hole.',
  'Pure black background with white and light-grey ink line art — like a detailed engraving or woodcut print.',
  'No color, no gradients, no shading fills — only crisp line work on absolute black.',
  'The style exactly matches a dark ink illustration: high contrast, white strokes, intricate mechanical detail.',
  'Aesthetic: cyberpunk gothic, industrial, analog horror — matching the style of a CRT monitor figure illustration.',
  'The image is perfectly square.',
  'No text, no watermarks, no borders.',
].join(' ');

async function generate() {
  console.log(`Model: ${MODEL}`);
  console.log(`Generating rabbit-hole spiral...`);

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT }] }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API ${res.status}: ${body}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData);

  if (!imagePart?.inlineData) {
    const textPart = parts.find((p) => p.text);
    throw new Error(`No image in response. Text: ${textPart?.text ?? JSON.stringify(data)}`);
  }

  const buf = Buffer.from(imagePart.inlineData.data, 'base64');
  await writeFile(OUT, buf);
  console.log(`Saved: ${OUT} (${(buf.length / 1024).toFixed(0)} KB)`);
}

generate().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
