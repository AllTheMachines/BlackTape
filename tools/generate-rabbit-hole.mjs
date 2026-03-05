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
  'A hypnotic psychedelic spiral vortex, top-down view, perfectly circular and centered.',
  'An Archimedean spiral that winds tightly from the outer edge all the way into a black void at the center.',
  'The spiral arms are made of intricate white line art — fine hatching, cross-hatching, and detail lines.',
  'Multiple nested spiral arms rotating inward, creating a strong sense of depth and motion — like falling into infinity.',
  'Trippy, dizzying, optical illusion quality. The spiral should feel like it is spinning.',
  'Pure black background with crisp white and light-grey ink strokes only — engraving / woodcut print style.',
  'No color, no gradients — only high-contrast black and white line art.',
  'The center is a deep black hole, the outer edges fade into darkness.',
  'Aesthetic: psychedelic meets gothic ink art. Dark, hypnotic, pulling inward.',
  'Perfectly square image, the spiral fills the entire frame edge to edge.',
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
