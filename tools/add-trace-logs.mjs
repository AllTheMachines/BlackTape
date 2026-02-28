// Add trace logs to loadRelease() to find the hang point
import { readFileSync, writeFileSync } from 'fs';

const FILE = 'src/routes/artist/[slug]/release/[mbid]/+page.svelte';
let content = readFileSync(FILE, 'utf8');
const NL = content.includes('\r\n') ? '\r\n' : '\n';

// After "if (resp.ok) {" add a log
const afterRespOk = `\t\t\t\tif (resp.ok) {`;
if (!content.includes(afterRespOk)) {
  console.error('Cannot find if(resp.ok)'); process.exit(1);
}
content = content.replace(
  afterRespOk,
  afterRespOk + NL + `\t\t\t\tconsole.log('[LR] resp.ok status=', resp.status, 'mbid=', mbid);`
);
console.log('Added log after resp.ok ✓');

// After resp.json() — find "const mbData = await resp.json()"
const afterJson = `\t\t\t\tconst mbData = await resp.json() as {`;
if (!content.includes(afterJson)) {
  console.error('Cannot find resp.json()'); process.exit(1);
}
// Find closing }; of the type annotation and add log after
// Actually just add before the rels processing
const relsLine = `\t\t\t\tconst rels = mbData.releases ?? [];`;
if (!content.includes(relsLine)) {
  console.error('Cannot find rels line'); process.exit(1);
}
content = content.replace(
  relsLine,
  `console.log('[LR] json parsed, releases=', mbData.releases?.length ?? 0);${NL}${relsLine}`
);
console.log('Added log after json parse ✓');

// Before buildBuyLinks import
const buyLinksImport = `\t\t\t\t\t\tconst { buildBuyLinks } = await import('$lib/affiliates/construct');`;
if (!content.includes(buyLinksImport)) {
  console.error('Cannot find buildBuyLinks import');
} else {
  content = content.replace(
    buyLinksImport,
    `console.log('[LR] importing buildBuyLinks...');${NL}${buyLinksImport}`
  );
  console.log('Added log before buildBuyLinks ✓');
}

// After release = { ... } assignment - find "hasAnyStream = "
const hasAnyStream = `\t\t\t\t\thasAnyStream = Object.values(streamingUrls).some(Boolean);`;
if (!content.includes(hasAnyStream)) {
  console.error('Cannot find hasAnyStream');
} else {
  content = content.replace(
    hasAnyStream,
    hasAnyStream + NL + `\t\t\t\t\tconsole.log('[LR] release assigned, hasAnyStream=', hasAnyStream);`
  );
  console.log('Added log after release assigned ✓');
}

// Before getProvider import (credits section)
const getProviderImport = `\t\t\tconst { getProvider } = await import('$lib/db/provider');`;
if (!content.includes(getProviderImport)) {
  console.error('Cannot find getProvider import');
} else {
  content = content.replace(
    getProviderImport,
    `console.log('[LR] rawCredits.length=', rawCredits.length, '— importing getProvider...');${NL}${getProviderImport}`
  );
  console.log('Added log before getProvider ✓');
}

// Before loadDone = true
const loadDoneLine = `\t\t\tloadDone = true;`;
if (!content.includes(loadDoneLine)) {
  console.error('Cannot find loadDone = true');
} else {
  content = content.replace(
    loadDoneLine,
    `console.log('[LR] setting loadDone=true, release=', !!release);${NL}${loadDoneLine}`
  );
  console.log('Added log before loadDone ✓');
}

writeFileSync(FILE, content, 'utf8');
console.log('Done. Logs added.');
