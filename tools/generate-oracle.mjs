/**
 * generate-oracle.mjs
 * Generates the Oracle page hero banner using Gemini 3.1 Flash Image (Nano Banana 2).
 * Saves output to src/lib/assets/oracle-banner.png
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(ROOT, 'src/lib/assets/oracle-banner.png');

const API_KEY = 'AIzaSyAzenfN2o-f0qPuPKmFbPOUF8neIbTWAC4';
const MODEL = 'gemini-3.1-flash-image-preview';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const PROMPT = [
  'A wide landscape illustration of a humanoid figure with a vintage CRT television monitor as its head, centered in the composition.',
  'The figure is symmetrically framed, cropped at the waist.',
  'From the top of the CRT monitor, a small number of long elegant cables drift outward — sparse and graceful, like a few loose wires floating in zero gravity.',
  'Only 4 to 8 cables total, thin and delicate, curving gently to either side. Lots of empty white space around them.',
  'The monitor screen displays a classic TV test pattern: a circle with crosshairs and horizontal bars.',
  'The figure wears a structured jacket with circuit board traces etched on the chest.',
  'Art style: pure white background, black ink line art — clean, minimal, like a technical illustration or editorial drawing.',
  'High contrast. No color. No gradients. The figure is the only element — the rest is white space.',
  'Aesthetic: minimal, precise, slightly surreal. Sparse and elegant, not chaotic.',
  '16:9 aspect ratio, wide composition.',
  'No text, no watermarks, no borders.',
].join(' ');

async function generate() {
  console.log(`Model: ${MODEL}`);
  console.log(`Generating oracle banner...`);

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
