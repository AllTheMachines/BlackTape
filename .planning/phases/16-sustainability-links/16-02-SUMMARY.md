---
phase: 16-sustainability-links
plan: 02
subsystem: ui
tags: [svelte, nostr, ndk, kind-30000, config, about-page, backers]

# Dependency graph
requires:
  - phase: 16-sustainability-links
    provides: Nostr NDK singleton (ndkState, initNostr) from nostr.svelte.ts, MERCURY_RELAYS relay pool
provides:
  - MERCURY_PUBKEY constant in config.ts (placeholder for future Mercury Nostr identity)
  - About page Support section with Ko-fi/GitHub Sponsors/Open Collective funding links
  - /backers route with Nostr kind:30000 backer credits fetch and state machine
affects: [phase 17 stats, any future Nostr identity work, phase 21 activitypub]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MERCURY_PUBKEY gate pattern: empty string = graceful fallback, avoids fetch without crashing"
    - "Nostr backer list via kind:30000 NIP-51 addressable list with d=backers tag"
    - "loadBackers() state machine: loading → loaded | empty | error with retry loop"
    - "Dynamic import of nostr.svelte.js in onMount for deferred Nostr initialization"

key-files:
  created:
    - src/routes/backers/+page.svelte
  modified:
    - src/lib/config.ts
    - src/routes/about/+page.svelte

key-decisions:
  - "MERCURY_PUBKEY stored as empty string placeholder in config.ts — fills in when Mercury Nostr identity keypair is generated"
  - "No kind:0 profile fetching for backers — display names stored directly as 'name' tags on kind:30000 event (single fetch, no per-pubkey lookups)"
  - "Backer list uses kind:30000 NIP-51 addressable list with d='backers' tag — confirms backer credits decision from STATE.md accumulated context"

patterns-established:
  - "Support section pattern: mission copy → funding links row → secondary action link (view backers)"
  - "Error state with retry: button re-runs full loadBackers() flow from scratch, resets to loading state"

requirements-completed: [SUST-03, SUST-04]

# Metrics
duration: 4min
completed: 2026-02-24
---

# Phase 16 Plan 02: Sustainability Links — Support + Backer Credits Summary

**About page Support section with Ko-fi/GitHub Sponsors/Open Collective links, and /backers route fetching supporter names from a Nostr kind:30000 addressable list event**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-24T09:48:24Z
- **Completed:** 2026-02-24T09:53:19Z
- **Tasks:** 2
- **Files modified:** 3 (1 created)

## Accomplishments
- Added `MERCURY_PUBKEY` constant to `config.ts` as empty string placeholder (fills in when Mercury Nostr identity is generated)
- About page `/about#support` section: mission copy "Mercury runs on no ads, no tracking, no VC money — just people who care about music." with Ko-fi, GitHub Sponsors, Open Collective links, plus "View backers →" link to /backers
- New `/backers` route with loading spinner, backer name list, empty state ("Backer credits coming soon" when MERCURY_PUBKEY is empty), error state with retry button, and CTA back to about#support

## Task Commits

Each task was committed atomically:

1. **Task 1: Add MERCURY_PUBKEY to config and Support section to About page** - `afbf6b5` (feat)
2. **Task 2: Create /backers route with Nostr fetch** - `7c01210` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/config.ts` - Added MERCURY_PUBKEY constant (empty string placeholder for Mercury's Nostr hex pubkey)
- `src/routes/about/+page.svelte` - Added Support section with id="support" anchor, mission copy, three funding links (Ko-fi/GitHub Sponsors/Open Collective), "View backers →" link, and associated CSS
- `src/routes/backers/+page.svelte` - New SvelteKit page. State machine: loading → loaded|empty|error. MERCURY_PUBKEY gate. NDK fetchEvents(kinds:[30000], authors:[MERCURY_PUBKEY], #d:['backers']). Name extraction from event tags. Retry button in error state. CTA to /about#support.

## Decisions Made
- MERCURY_PUBKEY stored as empty string in config.ts — the constant exists now so all imports are wired up, fills in when the Mercury Nostr keypair is actually generated
- No kind:0 profile fetching for backers — names stored directly as `name` tags on the kind:30000 event. Single event fetch, no per-pubkey lookups, no additional relay round-trips
- Support section placed before the CTA buttons (after Mission and Data Sources) — natural reading flow: understand → how to support → go discover
- Empty ruleset `.about-support-section {}` removed to eliminate Svelte linter warning — section inherits `.about-section` styles without needing overrides

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed empty CSS ruleset that triggered Svelte linter warning**
- **Found during:** Task 1 verification (npm run check)
- **Issue:** `.about-support-section {}` with comment-only content triggered "Do not use empty rulesets" warning in svelte-check
- **Fix:** Removed the empty ruleset entirely — the section inherits all needed styles from `.about-section`
- **Files modified:** src/routes/about/+page.svelte
- **Verification:** npm run check dropped from 9 warnings (with empty ruleset) to 8 warnings (all pre-existing in other files)
- **Committed in:** afbf6b5 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug/warning fix)
**Impact on plan:** Trivial — empty ruleset was a no-op. Removing it had zero behavior impact and cleaned up the linter output.

## Issues Encountered
None — both tasks executed cleanly on first attempt.

## User Setup Required
None — no external service configuration required at this time.

The Ko-fi, GitHub Sponsors, and Open Collective URLs in the About page currently use placeholder paths (`ko-fi.com/mercury`, `github.com/sponsors/mercury`, `opencollective.com/mercury`). These will need to be updated with real account URLs when Mercury's funding accounts are created. See the TODO comments in `src/routes/about/+page.svelte`.

## Next Phase Readiness
- MERCURY_PUBKEY infrastructure is in place — when the Mercury Nostr identity is generated, filling in the constant will automatically enable the backer credits fetch
- Phase 16 is complete after this plan (2 plans total: Plan 01 artist support links, Plan 02 about page + backers route)
- Phase 17 Artist Stats Dashboard can begin — no dependencies on Phase 16 output

## Self-Check: PASSED

- FOUND: src/lib/config.ts (contains MERCURY_PUBKEY)
- FOUND: src/routes/about/+page.svelte (contains Support section)
- FOUND: src/routes/backers/+page.svelte (new file)
- FOUND: .planning/phases/16-sustainability-links/16-02-SUMMARY.md
- FOUND commit: afbf6b5 (Task 1)
- FOUND commit: 7c01210 (Task 2)

---
*Phase: 16-sustainability-links*
*Completed: 2026-02-24*
