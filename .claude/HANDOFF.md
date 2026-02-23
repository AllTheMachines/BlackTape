# Work Handoff - 2026-02-23 (Search Fix Applied)

## Current Task
Test the search fix — it was just applied and rebuilt. Need to launch and verify.

## Root Cause (FOUND)
SvelteKit's client-side router fetches `__data.json` when navigating to the search page.
`build/search/__data.json` didn't exist (dynamic route, couldn't be pre-rendered).
Tauri served `index.html` as fallback. SvelteKit tried `JSON.parse('<!doctype html>')` → crash.
**This is why search never worked — it crashed before the invoke() call was ever made.**

## Fix Applied (built, NOT yet tested)

**`src/routes/search/+page.server.ts`** — added:
```typescript
export const prerender = import.meta.env.VITE_TAURI === '1';

export const load: PageServerLoad = async ({ url, platform }) => {
    if (import.meta.env.VITE_TAURI === '1') {
        return { results: [], query: '', mode: 'artist' as const, matchedTag: null, error: false };
    }
    // ... existing D1 web code unchanged ...
```

**Result:** `build/search/__data.json` now exists with `"uses":{}` (no URL dependency).
SvelteKit uses the cached empty data without refetching on `?q=` change, then `+page.ts`
runs with the actual URL and calls `invoke('query_mercury_db', ...)` for the real search.

## Current State
- Production exe rebuilt: `src-tauri/target/release/mercury.exe` ✓
- `build/search/__data.json` confirmed generated ✓
- Fix NOT yet tested (user interrupted before launch)
- Diagnostic code still in place (devtools open, console.logs, timeout in tauri-provider.ts)

## Uncommitted Changes
```
src-tauri/Cargo.toml         — devtools feature (temp, remove after fix confirmed)
src-tauri/src/lib.rs         — open_devtools() call (temp, remove after fix confirmed)
src/lib/db/tauri-provider.ts — 15s timeout + console.log (temp, remove after fix confirmed)
src/routes/search/+page.ts   — console.log markers (temp, remove after fix confirmed)
src/routes/search/+page.server.ts — THE ACTUAL FIX (keep this one)
BUILD-LOG.md                 — session notes
```

## Next Steps

### Step 1: Test
```bash
start "" "D:\Projects\Mercury\src-tauri\target\release\mercury.exe"
```
Search for "Radiohead". Should work now.

### Step 2a: If search works
Clean up diagnostic code, commit:
- `src-tauri/Cargo.toml`: remove `"devtools"` from tauri features
- `src-tauri/src/lib.rs`: remove `window.open_devtools()` block
- `src/lib/db/tauri-provider.ts`: revert to simple `return invoke<T[]>(...)`
- `src/routes/search/+page.ts`: remove console.log lines
- Commit: `fix(tauri): resolve search hang — pre-render search route for __data.json`

### Step 2b: If search STILL hangs
The `__data.json` fix worked for the JS crash, but invoke might ALSO be slow.
Check DevTools console for the `[search]` logs and `[TauriProvider]` timeout message.
Likely fix: the FTS5 query is slow — in `queries.ts` force the LIKE fallback:
```typescript
// In searchArtists(), temporarily force LIKE path:
const sanitized = ''; // skip FTS5
```

## Resume Command
After `/clear`, run `/resume` to continue.
