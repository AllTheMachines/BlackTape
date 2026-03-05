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
  'A dramatic wide landscape illustration of a humanoid figure with a vintage CRT television monitor as its head, centered in the composition.',
  'The figure is symmetrically framed, cropped at the waist.',
  'From the sides of the CRT monitor, a moderate number of organic cables and wires extend outward — maybe 10 to 15 cables, curving naturally like loose hair.',
  'The cables spread to the sides but do NOT fill the entire image — there is dark negative space above and around them.',
  'The monitor screen displays a classic TV test pattern: a circle with crosshairs and horizontal bars.',
  'The figure wears a structured jacket with circuit board traces etched on the chest.',
  'Art style: pure black background, white and grey ink line art — bold outlines, strong contrast, deep shadows.',
  'Comic book / graphic novel style. Exactly like a noir illustration — dark atmosphere, high contrast, dramatic lighting.',
  'No color. No gradients. Black fills dominate, white lines define the figure.',
  'Aesthetic: cyberpunk, analog horror, mechanical oracle. Dark and atmospheric.',
  '16:9 aspect ratio, ultra-wide composition.',
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
