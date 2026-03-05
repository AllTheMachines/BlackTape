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
  'The figure is symmetrically framed, slightly cropped at the waist.',
  'From the top and sides of the CRT monitor, hundreds of organic cables and electrical wires erupt outward like wild tangled hair,',
  'sweeping dramatically to both sides and filling the entire left and right portions of the image all the way to the edges.',
  'The cables vary in thickness, some thick as rope, some thin as wire, all organic and curved — like roots, tentacles, or blown hair.',
  'The monitor screen displays a classic TV test pattern: a large circle with crosshairs, a grid, and horizontal color bars at the bottom.',
  'Below the monitor is a structured neck flowing into broad armored shoulders and a chest covered in etched circuit board traces — PCB lines and solder dots.',
  'The figure wears a structured jacket with prominent lapels.',
  'Art style: pure black background, white and light-grey ink line art — like a detailed engraving or woodcut print.',
  'High contrast. No color. No gradients. No shading fills — only line work.',
  'Aesthetic: cyberpunk gothic, analog horror, mechanical oracle.',
  '16:9 aspect ratio, ultra-wide composition, dramatically cinematic.',
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
