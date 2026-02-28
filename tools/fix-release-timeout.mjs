// One-time fix: restructure loadRelease() timeout so it covers resp.json() body read
import { readFileSync, writeFileSync } from 'fs';

const FILE = 'src/routes/artist/[slug]/release/[mbid]/+page.svelte';
let content = readFileSync(FILE, 'utf8');
const NL = content.includes('\r\n') ? '\r\n' : '\n';
console.log(`Line endings: ${NL === '\r\n' ? 'CRLF' : 'LF'}`);

// Detect the actual indentation prefix before the timeout line
const match = content.match(/([\t ]+)const timeoutId = setTimeout\(\(\) => controller\.abort\(\), 5_000\);/);
if (!match) {
  console.error('Could not find timeout line');
  process.exit(1);
}
const I = match[1]; // base indent e.g. '\t\t\t'
const II = I + '\t';
const III = I + '\t\t';
console.log(`Indent: ${JSON.stringify(I)}`);

const join = (...lines) => lines.join(NL);

// OLD: inner try/finally block (just the fetch part)
const oldFetchBlock = join(
  `${I}const timeoutId = setTimeout(() => controller.abort(), 5_000);`,
  `${I}let resp: Response;`,
  `${I}try {`,
  `${II}resp = await fetch(mbUrl, {`,
  `${III}headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },`,
  `${III}signal: controller.signal`,
  `${II}});`,
  `${I}} finally {`,
  `${II}clearTimeout(timeoutId);`,
  `${I}}`,
);

if (!content.includes(oldFetchBlock)) {
  console.error('Could not find old fetch block');
  process.exit(1);
}

// NEW: timeout stays alive — try wraps the whole fetch + body pipeline
const newFetchBlock = join(
  `${I}// Timeout covers headers AND body — resp.json() can stall if MB delays body transfer`,
  `${I}const timeoutId = setTimeout(() => controller.abort(), 8_000);`,
  `${I}try {`,
  `${II}let resp = await fetch(mbUrl, {`,
  `${III}headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },`,
  `${III}signal: controller.signal`,
  `${II}});`,
);

content = content.replace(oldFetchBlock, newFetchBlock);
console.log('Replaced fetch block ✓');

// OLD retry block — find and replace it
// From the byte output we know the retry block starts after the closing } of inner try
const oldRetry = join(
  ``,
  `${I}// MB rate-limit: wait 1s and retry once on 429/503`,
  `\t\tif (resp.status === 429 || resp.status === 503) {`,
  `\t\t\tawait new Promise(r => setTimeout(r, 1200));`,
  `\t\t\tconst controller2 = new AbortController();`,
  `\t\t\tconst t2 = setTimeout(() => controller2.abort(), 5_000);`,
  `\t\t\ttry {`,
  `\t\t\t\tresp = await fetch(mbUrl, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: controller2.signal });`,
  `\t\t\t} finally { clearTimeout(t2); }`,
  `\t\t}`,
  ``,
  `\t\tif (resp.ok) {`,
);

if (!content.includes(oldRetry)) {
  console.error('Could not find old retry block');
  // Show what the content looks like around the retry comment
  const idx = content.indexOf('// MB rate-limit');
  if (idx >= 0) {
    console.error('Retry comment found, showing surroundings:');
    console.error(JSON.stringify(content.slice(idx - 5, idx + 300)));
  }
  process.exit(1);
}

// NEW: retry block — properly nested inside the new try, cancel original timeout on 429
const newRetry = join(
  ``,
  `${II}// MB rate-limit: cancel original timeout, wait, retry with fresh timeout`,
  `${II}if (resp.status === 429 || resp.status === 503) {`,
  `${III}clearTimeout(timeoutId);`,
  `${III}await new Promise(r => setTimeout(r, 1200));`,
  `${III}const controller2 = new AbortController();`,
  `${III}const t2 = setTimeout(() => controller2.abort(), 8_000);`,
  `${III}try {`,
  `${III}\tresp = await fetch(mbUrl, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: controller2.signal });`,
  `${III}} finally { clearTimeout(t2); }`,
  `${II}}`,
  ``,
  `${II}if (resp.ok) {`,
);

content = content.replace(oldRetry, newRetry);
console.log('Replaced retry block ✓');

// Now add } finally { clearTimeout } before the } catch (err) {
// The closing sequence: the } that closes if(resp.ok), then } catch
// From analysis: closing } of if(resp.ok) is at 3 tabs, then } catch at 2 tabs
const oldClose = `\t\t\t}${NL}\t\t} catch (err) {`;
const newClose = `\t\t\t}${NL}\t\t\t} finally {${NL}\t\t\t\tclearTimeout(timeoutId);${NL}\t\t\t}${NL}\t\t} catch (err) {`;

if (!content.includes(oldClose)) {
  console.error('Could not find closing sequence');
  const idx = content.indexOf('} catch (err) {');
  if (idx >= 0) {
    console.error('catch found, surroundings:', JSON.stringify(content.slice(idx - 30, idx + 20)));
  }
  process.exit(1);
}

content = content.replace(oldClose, newClose);
console.log('Added finally block ✓');

writeFileSync(FILE, content, 'utf8');
console.log('File written successfully');
