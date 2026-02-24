---
phase: 17-artist-stats-dashboard
verified: 2026-02-24T00:00:00Z
status: gaps_found
score: 2/3 success criteria verified
re_verification: false
gaps:
  - truth: "User can see a personal visit count for an artist that increments each time they visit that artist's profile"
    status: failed
    reason: "Visit count is tracked in taste.db but is never retrieved or displayed in the UI. No Rust command exists to read the visit count, and no frontend component renders it. The CONTEXT.md and RESEARCH.md explicitly overrode this with 'never shown in any UI / reserved for future use' — but this contradicts the ROADMAP success criterion which is the authoritative contract."
    artifacts:
      - path: "src/lib/components/ArtistStats.svelte"
        issue: "Does not display visit count — intentionally omitted during implementation"
      - path: "src-tauri/src/ai/taste_db.rs"
        issue: "No get_artist_visits or equivalent command to retrieve count for display"
    missing:
      - "A Rust command (e.g., get_artist_visit_count) that reads visit_count from artist_visits for a given mbid"
      - "Display of the visit count somewhere in ArtistStats.svelte (e.g., 'You have visited this artist N times')"
human_verification:
  - test: "Navigate to any artist page in the running app, then click the Stats tab"
    expected: "Stats tab appears, shows uniqueness score + tier label, rarest tag with link, horizontal bar chart of tags with proportional bars. All tags are clickable and navigate to tag search."
    why_human: "Visual layout, tab switching behavior, bar chart proportions, and link navigation require a running Tauri app"
  - test: "Visit an artist page, switch to Stats tab, verify score display for an artist with no tags"
    expected: "Stats hero shows 'No tag data' instead of a score. Tab is still accessible."
    why_human: "Null score handling edge case requires a real artist with no tags in the local DB"
  - test: "Visit the same artist page multiple times and check taste.db artist_visits table"
    expected: "visit_count increments on each page load"
    why_human: "Silent visit tracking writes to taste.db — requires running app and SQL inspection"
---

# Phase 17: Artist Stats Dashboard Verification Report

**Phase Goal:** Users can see how discoverable any artist is within Mercury's index and how much they personally engage with them
**Verified:** 2026-02-24
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can open a stats page for any artist showing uniqueness score, rarest tag, and tag distribution | VERIFIED | `ArtistStats.svelte` exists (213 lines), renders hero (score + tier), `data-testid="rarest-tag"` section, `data-testid="tag-distribution"` bar chart. Wired into +page.svelte at line 524. All 16 P17 test IDs pass. |
| 2 | User can see a personal visit count for an artist that increments each time they visit that artist's profile | FAILED | Visit count is tracked in `artist_visits` table via `record_artist_visit` command (confirmed wired in onMount), but the count is never queried or displayed anywhere in the UI. No read command exists. |
| 3 | Stats are derived entirely from local SQLite — no external API calls triggered by the stats page load | VERIFIED | `ArtistStats.svelte` uses only `getProvider()` + `getArtistTagDistribution()` (local SQLite). No fetch/axios/API call patterns found in the component. |

**Score:** 2/3 success criteria verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/components/ArtistStats.svelte` | Stats tab content component with hero, rarest tag, and bar chart | VERIFIED | 213 lines. Contains `data-testid="artist-stats"`, `stats-hero`, `rarest-tag`, `tag-distribution`. Props: `artistId`, `score`, `tagCount`. Tier mapping: Ultra Rare >=100 / Rare >=8 / Niche >=0.36 / Common. Null score shows "No tag data". |
| `src/lib/db/queries.ts` | `getArtistTagDistribution()` and `ArtistTagStat` interface | VERIFIED | `ArtistTagStat` interface at line 67. `getArtistTagDistribution()` at line 447. LEFT JOINs `artist_tags` with `tag_stats`, `COALESCE(ts.artist_count, 1)`, ordered `ASC` (rarest first). |
| `src-tauri/src/ai/taste_db.rs` | `artist_visits` table DDL and `record_artist_visit` command | VERIFIED | `artist_visits` CREATE TABLE at line 116 (inside `init_taste_db()` batch). `record_artist_visit` at line 1137 using `TasteDbState` (correct). ON CONFLICT DO UPDATE upsert pattern. Unit test `record_artist_visit_inserts_and_increments` present. |
| `src-tauri/src/lib.rs` | `record_artist_visit` registered in invoke_handler | VERIFIED | `ai::taste_db::record_artist_visit` at line 171 in `tauri::generate_handler![]`. |
| `src/routes/artist/[slug]/+page.svelte` | Tab toggle UI, ArtistStats import, visit tracking in onMount | VERIFIED | `ArtistStats` imported at line 10. `activeTab` $state at line 23. `record_artist_visit` invoke at line 86. Tab bar with `data-testid="artist-tabs"` at line 362. Tab conditional wraps overview/stats at lines 378-530. Artist header always visible (outside tab conditional). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ArtistStats.svelte` | `src/lib/db/queries.ts` | dynamic import of `getArtistTagDistribution` in `onMount` | WIRED | `const { getArtistTagDistribution } = await import('$lib/db/queries')` at line 46. Result stored in `distribution` state, rendered in template. |
| `src-tauri/src/ai/taste_db.rs` | `src-tauri/src/lib.rs` | invoke_handler registration | WIRED | `ai::taste_db::record_artist_visit` confirmed at line 171 of lib.rs. |
| `src/routes/artist/[slug]/+page.svelte` | `ArtistStats.svelte` | import and conditional render in stats tab | WIRED | Imported at line 10, rendered at lines 524-528 with `artistId={data.artist.id}`, `score={data.uniquenessScore}`, `tagCount={data.uniquenessTagCount}`. |
| `src/routes/artist/[slug]/+page.svelte` | `record_artist_visit` Rust command | invoke in onMount Tauri block | WIRED | Fire-and-forget async IIFE at lines 83-90 inside `if (!tauriMode) return` guard. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| STAT-01 | 17-01-PLAN.md, 17-02-PLAN.md | User can view a discovery stats page for any artist showing their uniqueness score, rarest tag, and tag distribution | SATISFIED | ArtistStats.svelte fully implements this: score hero + tier label + rarest tag link + proportional bar chart. Wired into artist page stats tab. |
| STAT-02 | 17-01-PLAN.md, 17-02-PLAN.md | User can see how many times they have personally visited an artist's profile page (local count) | BLOCKED | Visit count is tracked (writes to `artist_visits` table) but never retrieved or displayed. The CONTEXT.md/RESEARCH.md deliberately scoped out the display ("never shown in any UI"), but ROADMAP success criterion 2 explicitly requires user-visible display. |

No orphaned requirements — REQUIREMENTS.md maps only STAT-01 and STAT-02 to Phase 17, both claimed by the plans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No TODO/FIXME/placeholder comments found. No empty implementations. No stubs. No console.log-only handlers.

### Human Verification Required

#### 1. Stats Tab Visual and Interaction

**Test:** Navigate to any artist page in the running Tauri app, then click the Stats tab
**Expected:** Stats tab appears below the artist header and "Listen On" bar. Shows uniqueness score in large text with tier label (e.g., "94 — ULTRA RARE"). Shows "Rarest tag:" with a clickable tag link. Shows horizontal bar chart with all tags as proportional bars, each tag name being a clickable link to tag search.
**Why human:** Visual layout, tab switching behavior, CSS bar chart proportions, and link navigation require a running Tauri app to verify.

#### 2. Null Score Handling

**Test:** Find an artist with no tags in the local DB and visit their artist page, then click Stats tab
**Expected:** Stats tab is accessible (not hidden), but the hero section shows "No tag data" instead of a score. The rarest tag section and bar chart are absent (no data to show).
**Why human:** Requires finding a tagless artist in the real local database.

#### 3. Silent Visit Tracking

**Test:** Visit the same artist page multiple times, then inspect the `artist_visits` table in taste.db
**Expected:** A row exists for the artist's MBID with `visit_count` incrementing on each page load. The count is never visible in the UI.
**Why human:** Requires running app and direct SQL inspection of taste.db.

### Gaps Summary

**One gap blocks full goal achievement:**

SC2 ("User can see a personal visit count") is not met. The `artist_visits` table exists and `record_artist_visit` is correctly wired — the tracking infrastructure is complete. However, there is no mechanism to _display_ the count to the user. The implementation was deliberately scoped this way (CONTEXT.md decision: "Stored in local SQLite only — never shown in any UI"), but this contradicts the ROADMAP success criterion which is the authoritative contract.

**What needs to be added to close this gap:**
1. A Rust command (e.g., `get_artist_visit_count`) that queries `SELECT visit_count FROM artist_visits WHERE artist_mbid = ?` and returns the count (or 0 if no row)
2. Registration of that command in `lib.rs` invoke_handler
3. Display of the visit count in `ArtistStats.svelte` — for example, in the stats hero section or below it (e.g., "You have visited this artist 7 times")
4. The fetch call in `ArtistStats.svelte` onMount alongside `getArtistTagDistribution`

The tracking data is already accumulating correctly in the DB — this is a read-and-display gap, not a tracking gap.

**Everything else is solid:** SC1 (stats page with score/rarest tag/distribution) is fully implemented and wired. SC3 (local SQLite only) is verified. All 92 code checks pass with 0 failures. Rust compiles clean. TypeScript checks pass. No anti-patterns.

---

_Verified: 2026-02-24_
_Verifier: Claude (gsd-verifier)_
