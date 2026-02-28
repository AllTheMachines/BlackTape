# Work Handoff - 2026-02-28

## Current Task
Fix **#50 — Discover page takes too long to load**

## Context
Steve: "Takes forever." No loading indicator while it hangs.

## Root Cause (already identified)

`getDiscoveryArtists` in `src/lib/db/queries.ts` (line 486):

**No-filter path** (line 510–528): JOINs all 2.6M artists with `artist_tags` + `tag_stats`, then does a complex multi-factor ORDER BY expression computed per row — no index possible on a computed expression. This scans tens of millions of rows on every Discover page load.

**Filtered path** (line 559–579): Two correlated subqueries per artist row (for `tags` and `uniqueness_score`) — O(N) subquery calls.

The comment at line 507 says "The old approach ran 3 correlated subqueries per artist row across 2.6M artists, holding the Rust Mutex for 10-30+ seconds." The current approach improved it but it's still slow.

## The Fix

**Option A (pipeline — best long-term):** Add `uniqueness_score` as a precomputed column on the `artists` table in the pipeline. Query becomes: `SELECT ... FROM artists ORDER BY uniqueness_score DESC LIMIT 50` — instant.

**Option B (index — simpler, no pipeline change):** Add an index in the DB init or a migration. But since `uniqueness_score` is computed from other tables, can't index it directly without materializing it.

**Option C (no-filter fast path improvement):** The current no-filter JOIN query could be sped up with a covering index on `artist_tags(artist_id, tag)` + `tag_stats(tag, artist_count)`. These indexes may already exist — check.

**Recommended approach:**
1. Check what indexes exist on `artist_tags` and `tag_stats`
2. Run EXPLAIN QUERY PLAN on the no-filter query to see what it's actually doing
3. If simple index fix works, do that
4. If not, add `uniqueness_score REAL` to the `artists` table and populate it in the pipeline (`build-genre-data.mjs` or a separate step)

## Steps to Implement

```bash
# 1. Check existing indexes
cd /d/Projects/Mercury/pipeline && node -e "
const Database = require('better-sqlite3');
const db = new Database('C:/Users/User/AppData/Roaming/com.mercury.app/mercury.db', { readonly: true });
const indexes = db.prepare(\"SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' ORDER BY tbl_name\").all();
indexes.forEach(i => console.log(i.tbl_name, '-', i.name));
db.close();
"

# 2. Time the current query
cd /d/Projects/Mercury && node tools/time-cold-library.mjs  # (reuse similar approach)
```

2. Add precomputed `uniqueness_score` to `artists` table:
   - `src-tauri/src/mercury_db.rs` — add column to CREATE TABLE and a migration
   - Pipeline: compute score after importing artist_tags and save it
   - Queries: replace computed ORDER BY with `ORDER BY uniqueness_score DESC`

3. Also check issue #43 (missing loading indicator) — it's mentioned in #50 and may be a quick separate fix.

## Relevant Files
- `src/lib/db/queries.ts` lines 486–579 — `getDiscoveryArtists` — the slow query
- `src/routes/discover/+page.ts` — calls `getDiscoveryArtists` in server load
- `src-tauri/src/mercury_db.rs` — artists table DDL + indexes
- `pipeline/import.js` — main pipeline import script

## Git Status
Clean. All changes from #54 committed (1110b29). 191 tests passing.

## Next Steps
1. `gh issue view 43` — check the loading indicator issue (may be quick)
2. Time the actual Discover query via CDP
3. Fix the query (index or precomputed column)
4. Test: Discover should load in <500ms
5. Close #50

## Resume Command
After `/clear`, run `/resume` to continue.
