# Work Handoff - 2026-02-28

## Current Task
Investigating #45 (app freezes mid-session) — still unresolved. Active freeze happening right now.

## Context
Session fixed: #62 (oauth capability), #46 (window drag — two commits: drag region + start-dragging capability), #45 (partial — external link fix), #47 (About tab always visible + empty state). Triage created v1.4 milestone with 17 issues assigned.

## The Freeze — Investigation Status

**Symptom:** App stops responding after navigating to Discover + Style Map. Steve confirmed it's internal buttons freezing, not just external links.

**Leading hypothesis: Rust Mutex poisoning in `query_mercury_db`**

The `TauriProvider` (all DB queries) goes through Rust command `query_mercury_db` in `src-tauri/src/mercury_db.rs`. It acquires `MercuryDbState(Mutex<Option<Connection>>)`. The Discover page runs a **very complex SQL query** (`getDiscoveryArtists` with correlated subqueries in ORDER BY — see `src/lib/db/queries.ts:486`). If this query panics in Rust, the Mutex gets poisoned. Every subsequent `lock()` call returns a `PoisonError`, which is mapped to `format!("Lock error: {}")` and returned as an Err — causing every DB call to silently fail. Pages that depend on DB data appear "frozen" (they load but show nothing, navigation fails).

**Key files to investigate:**
- `src-tauri/src/mercury_db.rs:108` — `query_mercury_db` command, lock at line 113
- `src/lib/db/queries.ts:486` — `getDiscoveryArtists` complex correlated-subquery ORDER BY
- `src/lib/db/tauri-provider.ts` — TauriProvider, all DB calls go through `invoke('query_mercury_db')`

**What to do next:**
1. Read `src-tauri/src/mercury_db.rs` lines 108-160 to see the full `query_mercury_db` implementation
2. Check if the complex `getDiscoveryArtists` SQL could cause a Rust panic (e.g., via rusqlite query_row error handling)
3. Add `recover_from_poison()` or wrap the lock in a way that survives panics
4. ALSO: simplify the `getDiscoveryArtists` ORDER BY — the unfiltered case uses 3 nested correlated subqueries, one per artist row — on 2.6M artists this is catastrophically slow and likely the trigger for the panic/timeout
5. Consider adding a timeout or LIMIT earlier in the query

**Alternative hypothesis:** The slow Discover query just takes 10-15 seconds, user clicks elsewhere, sees "nothing happening" — not a true freeze but perceived as one.

## Progress This Session
### Completed
- v1.4 milestone created on GitHub with 17 issues assigned
- #41 closed as duplicate of #61; #28 closed as already done
- #62 fixed: `oauth:allow-start` capability added
- #46 fixed: drag region attribute + `core:window:allow-start-dragging` capability
- #45 partial: external links now open in system browser (correct but not the root cause)
- #47 fixed: About tab always shown, empty state added
- Tauri lesson saved to `.planning/lessons.md`

### In Progress
- #45 (app freeze) — investigation ongoing, Mutex poison hypothesis

### Remaining v1.4 issues (open)
#61, #60, #54, #53, #57, #50, #49, #56, #48, #43, #44, #55, #52

## Key Decisions
- About tab: always visible regardless of MB data availability
- External links: all `target="_blank"` http links routed through `shell::open` in Tauri

## Relevant Files
- `src-tauri/src/mercury_db.rs` — Rust DB commands, Mutex
- `src/lib/db/queries.ts:486` — complex Discover query
- `src/lib/db/tauri-provider.ts` — all JS DB calls
- `src/routes/+layout.svelte` — external link interceptor (added this session)
- `src/lib/components/ArtistRelationships.svelte` — empty state added
- `src/routes/artist/[slug]/+page.svelte` — About tab ungated

## Git Status
Several auto-save commits on top of fix commits. App is currently running (`npm run tauri dev` background task bgoppxpo6).

## Resume Command
After running `/clear`, run `/resume` to continue.
