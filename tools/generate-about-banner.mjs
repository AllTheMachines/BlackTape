/**
 * generate-about-banner.mjs
 * Generates the About page hero banner using Gemini 3.1 Flash Image (Nano Banana 2).
 * A long-haired nerdy guy freaking out in front of an old-school computer.
 * Saves to src/lib/assets/about-banner.png
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(ROOT, 'src/lib/assets/about-banner.png');

const API_KEY = 'AIzaSyAzenfN2o-f0qPuPKmFbPOUF8neIbTWAC4';
const MODEL = 'gemini-3.1-flash-image-preview';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const PROMPT = [
  'A wide horizontal illustration of a middle-aged hacker in his 40s with long greying hair and thick nerdy glasses sitting in a dark room at a vintage CRT computer setup.',
  'He has visible wrinkles, a slightly weathered face, and the look of someone who has been doing this for decades.',
  'The room is very dark — almost pitch black. The only light source is the eerie green-tinted glow of the CRT monitor illuminating his face from below.',
  'He is visibly freaking out — head thrown back, mouth open in an exaggerated scream of excitement or disbelief, hands raised or grabbing his hair.',
  'Multiple CRT monitors, tangled cables everywhere, stacks of printed papers and manuals. Empty energy drink cans. Dark and chaotic hacker den atmosphere.',
  'Pure black and white ink illustration — comic book / graphic novel style. Bold outlines, extreme contrast, vast black areas with only the face lit.',
  'Wide landscape composition, slightly cinematic framing. The figure is slightly off-center.',
  'No readable text, no logos, no watermarks. Noir hacker energy.',
].join(' ');

async function generate() {
  console.log(`Model: ${MODEL}`);
  console.log(`Generating about page banner...`);

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
