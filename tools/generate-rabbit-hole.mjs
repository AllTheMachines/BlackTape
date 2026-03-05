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
  'Top-down view of a spiral galaxy structure — not a real galaxy, but inspired by the shape.',
  'Two or three distinct sweeping spiral arms curving outward from a bright dense core.',
  'The arms are made of flowing white ink lines, loose and elegant — like brushstrokes curving through space.',
  'Lots of negative black space between the arms. Airy, open, not dense.',
  'The center is a tight bright nucleus fading outward. The arms thin and dissolve at the edges.',
  'Pure black background. White and light-grey line art only — ink illustration, engraving style.',
  'No color, no gradients. High contrast black and white.',
  'Elegant, cosmic, slightly mysterious. The arms have motion and flow.',
  'Aesthetic matches a detailed dark ink illustration — gothic, precise, beautiful.',
  'Perfectly square composition, centered.',
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
