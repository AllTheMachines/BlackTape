/**
 * generate-library-shelf.mjs
 * Generates the Library page header strip using Gemini 3.1 Flash Image (Nano Banana 2).
 * A loooong shelf packed with vinyl records, comic book style.
 * Saves to src/lib/assets/library-shelf.png
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(ROOT, 'src/lib/assets/library-shelf.png');

const API_KEY = 'AIzaSyAzenfN2o-f0qPuPKmFbPOUF8neIbTWAC4';
const MODEL = 'gemini-3.1-flash-image-preview';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const PROMPT = [
  'A wide panoramic illustration of a long vinyl record shelf, viewed from slightly above — looking down at the tops of the records.',
  'The shelf stretches from left to right across the entire image.',
  'Most records are packed tightly together, but a few individual records stick up higher than the others — poking out above the crowd, clearly identifiable as square vinyl record sleeves.',
  'The tops of the record sleeves are clearly visible — you can see the square corners, the slight thickness of each sleeve.',
  'A few records lean at slight angles. The overall impression is a massive dense collection with a few records pulled slightly forward or sticking up.',
  'Pure black and white ink illustration — comic book / graphic novel style. Bold outlines, strong contrast, black fills.',
  'The shelf wood is dark. The record sleeves have varied black and white tones.',
  'Ultra-wide horizontal composition, like a panoramic strip. Slightly elevated viewing angle.',
  'No readable text, no logos, no people, no watermarks.',
  'The image should make it immediately obvious these are vinyl records on a shelf.',
].join(' ');

async function generate() {
  console.log(`Model: ${MODEL}`);
  console.log(`Generating library shelf...`);

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
