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
  'A super wide panoramic illustration of an enormous record store shelf stretching endlessly from left to right.',
  'The shelf is absolutely packed with hundreds of vinyl record sleeves standing upright, spine-out, crammed together tightly.',
  'Viewed straight-on, eye level with the shelf — a flat, horizontal strip composition.',
  'The records fill the entire image from edge to edge. Record sleeves have varied heights, slight tilts, dog-eared corners.',
  'Pure black and white only. No color, no grey tones — just stark black ink on white, like a woodcut or linocut print.',
  'Bold comic book / graphic novel style: thick black ink outlines, heavy black fills, strong contrast.',
  'The style is like a panel from a black-and-white indie comic — stark, high contrast, slightly gritty and raw.',
  'The shelf itself is black. The record spines alternate between black and white.',
  'Ultra-wide 16:9 composition. No people, no readable text, no logos, no watermarks.',
  'The feeling: an infinite, obsessive, overwhelming record collection rendered in bold ink.',
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
