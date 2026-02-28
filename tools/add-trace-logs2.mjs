// Add detailed trace logs to find the hang after "release assigned"
import { readFileSync, writeFileSync } from 'fs';

const FILE = 'src/routes/artist/[slug]/release/[mbid]/+page.svelte';
let content = readFileSync(FILE, 'utf8');
const NL = content.includes('\r\n') ? '\r\n' : '\n';

function replace(old, nw) {
  if (!content.includes(old)) {
    console.error('NOT FOUND:', JSON.stringify(old.slice(0, 60)));
    return false;
  }
  content = content.replace(old, nw);
  return true;
}

// After "release assigned" log — add a check of the release value
replace(
  `\t\t\t\t\tconsole.log('[LR] release assigned, hasAnyStream=', hasAnyStream);`,
  `\t\t\t\t\tconsole.log('[LR] release assigned, hasAnyStream=', hasAnyStream, 'release.title=', release?.title);`
);

// After the finally block and before rawCredits check
replace(
  `\t\t\t} finally {\r\n\t\t\t\tclearTimeout(timeoutId);\r\n\t\t\t}\r\n\t\t} catch (err) {`,
  `\t\t\t} finally {\r\n\t\t\t\tclearTimeout(timeoutId);\r\n\t\t\t\tconsole.log('[LR] finally done, release=', !!release, 'rawCredits=', rawCredits.length);\r\n\t\t\t}\r\n\t\t} catch (err) {`
);

// Before rawCredits check
replace(
  `\t\t// Resolve credit slugs against local DB (graceful degradation if unavailable)\r\n\t\tif (rawCredits.length > 0) {`,
  `\t\tconsole.log('[LR] post-try, release=', !!release, 'rawCredits=', rawCredits.length);\r\n\t\t// Resolve credit slugs against local DB (graceful degradation if unavailable)\r\n\t\tif (rawCredits.length > 0) {`
);

// Before getProvider import
replace(
  `\tconsole.log('[LR] rawCredits.length=', rawCredits.length, '— importing getProvider...');\r\n\t\t\tconst { getProvider } = await import('$lib/db/provider');`,
  `\t\t\tconsole.log('[LR] rawCredits.length=', rawCredits.length, '— importing getProvider...');\r\n\t\t\tconst { getProvider } = await import('$lib/db/provider');\r\n\t\t\tconsole.log('[LR] getProvider imported');`
);

// Before loadDone = true (check current indentation)
const loadDonePatterns = [
  `\t\t\tloadDone = true;`,
  `\t\tloadDone = true;`,
  `\t\t\t\tloadDone = true;`,
];
let foundLoadDone = false;
for (const pat of loadDonePatterns) {
  if (content.includes(pat)) {
    content = content.replace(pat, `console.log('[LR] setting loadDone=true');\r\n${pat}`);
    console.log('Found loadDone with pattern:', JSON.stringify(pat));
    foundLoadDone = true;
    break;
  }
}
if (!foundLoadDone) console.error('loadDone not found with any pattern');

writeFileSync(FILE, content, 'utf8');
console.log('Done');
