import { readFileSync, writeFileSync } from 'fs';
const FILE = 'src/routes/artist/[slug]/release/[mbid]/+page.svelte';
let c = readFileSync(FILE, 'utf8');
const NL = c.includes('\r\n') ? '\r\n' : '\n';

// After release assigned log, add await tick() to force Svelte flush
const afterAssigned = `\t\t\t\t\tconsole.log('[LR] release assigned, hasAnyStream=', hasAnyStream, 'release.title=', release?.title);`;
if (!c.includes(afterAssigned)) { console.error('Not found: afterAssigned'); process.exit(1); }
c = c.replace(afterAssigned, afterAssigned + NL + `\t\t\t\t\tawait tick(); // force Svelte to flush $state changes to DOM`);
console.log('Added tick() after release assigned ✓');

// After loadDone = true, add another tick
const loadDoneLine = `console.log('[LR] setting loadDone=true');${NL}\t\tloadDone = true;`;
if (!c.includes(loadDoneLine)) { console.error('Not found: loadDone line'); process.exit(1); }
c = c.replace(loadDoneLine, loadDoneLine + NL + `\t\tawait tick();`);
console.log('Added tick() after loadDone ✓');

writeFileSync(FILE, c, 'utf8');
console.log('Done');
