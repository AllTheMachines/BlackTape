# Phase 28: UX Cleanup + Scope Reduction - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning
**Source:** PRD Express Path (.planning/v1.5-PLAN.md)

<domain>
## Phase Boundary

Phase 28 cleans up the app before the Spotify integration sprint. It fixes 4 known bugs, removes 3 features from the nav (deferred to v2), simplifies the discovery sidebar layout, and applies 7 polish items from the GitHub backlog. No new features — only fixing, hiding, and refining what exists.

</domain>

<decisions>
## Implementation Decisions

### Bug Fixes (Locked)
- **#41** — Streaming preference setting must be read and reflected on the artist page (affects which "Play" links/buttons are shown)
- **#23** — Scene page must reflect the user's local library (which artists they have music for)
- **#26** — Artist's own website link must appear first in the links section (before Bandcamp, streaming, etc.)
- **#27** — External links must be validated; dead/hibernated sites must be removed or flagged

### Scope Reduction (Locked — hide from nav, don't delete code)
- Scenes page: remove from nav, keep route (link still works if you know the URL)
- Listening Rooms: remove from nav, keep route
- ActivityPub / DMs: remove from nav, keep route
- Goal: simplify what new users see in v1.5; full feature comes back in v2

### Discovery UI Simplification (Locked)
- Left sidebar: show only the currently active discovery mode
- Right panel: show mode variants/options for the active mode
- This aligns with GitHub #31 (prominent descriptions)
- Each discovery mode must have a prominent description header explaining what it does

### Polish Items (Locked)
- **#29** — AI provider selector in Settings needs UX redesign (currently hard to understand)
- **#31** — All discovery pages (Discover, Crate Dig, Explore, Time Machine, Style Map, KB) need prominent description at top
- **#32** — Artist page needs per-platform social sharing buttons (not just Mastodon)
- **#28** — Search page needs a type selector: Artist / Label / Song
- **#30** — About page: replace GitHub link with a feedback form (simple mailto or form)

### Claude's Discretion
- Exact UI placement and styling of nav changes (consistent with existing design tokens)
- How "dead link" detection works in #27 (HTTP check at runtime vs. static removal)
- Exact form design for the feedback form on About page
- Which social platforms to include in #32 (Twitter/X, Bluesky, Mastodon already exists)
- Implementation of search type selector (#28) — could be tabs, chips, or dropdown
- AI provider selector redesign (#29) — visual approach is open, must be clearer than current

</decisions>

<specifics>
## Specific Ideas

**Scope reduction approach:** Keep all routes working, just remove nav links. This way power users who bookmarked Scenes/Rooms still work. Add a small "coming in v2" note if a user lands on those pages.

**Discovery sidebar:** The current left sidebar shows all discovery modes as nav items. Change so only the active mode's name/icon is shown in left nav, and the right side (or a sub-panel) shows mode-specific options. Reduces visual noise.

**#26 link ordering:** MusicBrainz relationship type "official homepage" should always sort first. Currently the sort may be alphabetical or arbitrary.

**#27 dead links:** Focus on obviously-dead domains (geocities, MySpace-era, .fm domains known to be gone). A lightweight HEAD request check at render time could work for the rest.

**Per-platform sharing (#32):** Artist page already has Mastodon share. Add Twitter/X and Bluesky using their standard share URL patterns. Keep Mastodon as the primary/first option (aligns with project values).

</specifics>

<deferred>
## Deferred Ideas

- Style Map: square nodes + mouse wheel zoom (#24) — deferred to Phase 31
- Time Machine: pagination + popularity sort (#25) — deferred to Phase 31
- Full Scenes/Listening Rooms/ActivityPub features — deferred to v2

</deferred>

---

*Phase: 28-ux-cleanup-scope-reduction*
*Context gathered: 2026-02-26 via PRD Express Path*
