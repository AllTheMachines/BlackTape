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
  'A perfect top-down aerial view looking straight down into a spinning centrifuge or industrial vortex machine.',
  'Circular composition, perfectly centered, symmetrical.',
  'The centrifuge has concentric rings of mechanical detail — metal plates, bolts, grooves, tubes, and chambers arranged radially.',
  'At the very center is a deep dark void — an infinite black hole pulling inward.',
  'The spinning motion is implied through radial blur and curved mechanical forms.',
  'Like looking down the barrel of a machine, or into a whirlpool drain, or a spiral staircase from above.',
  'Dark industrial aesthetic — aged steel, oxidized metal, dark oil, deep shadows.',
  'Moody dark color palette: near-black background, dark greys, hints of rust and deep teal.',
  'Highly detailed mechanical illustration style — technical drawing meets dark art.',
  'The image is perfectly square, completely circular composition filling the frame.',
  'No text, no watermarks, no borders.',
  'Cinematic, atmospheric, slightly ominous.',
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
