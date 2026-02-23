# Phase 11: Scene Building - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

AI detects emerging scenes from collective listening patterns and surfaces them in a dedicated Scenes section. Users can follow scenes and suggest artists to include. No creation tools ship this phase — scenes emerge automatically, not by user creation. Label collectives are deferred.

</domain>

<decisions>
## Implementation Decisions

### How scenes surface
- Scenes have a **dedicated Scenes section/page** — a place you go to browse them, like a directory
- Scene pages show: **artists in the scene + top tracks + listener count**
- Scenes are named by inheriting the **dominant tag** (e.g., the strongest tag cluster becomes the scene name)
- Detection threshold: **meaningful listener overlap** across a few artists (quality signal — connected humans, not just tag co-occurrence)

### AI scene detection signals
- Primary signal: **both tag clusters AND listener overlap** must reinforce each other — a scene requires artists with overlapping niche tags AND the same listeners collecting them
- Geography: **optional metadata** — don't use it for detection, but surface origin on scene pages if it's there
- "Emerging" means **novelty** — tag combinations not seen before, not just size or growth rate
- Surfacing: **random rotation within tiers** — most active scenes in one tier, emerging scenes in another, neither dominates (anti-rich-get-richer)

### User interactions on scene pages
- Users can **follow a scene** to get notified when new artists join it
- Users can **suggest artists** that belong in a scene, even if AI didn't detect them — community curation feeds back as signal
- **No creation tools** this phase — scenes are purely AI-detected and displayed, not manually created
- Feature requests for creation tools (collaborative playlists, shared collections) surface via **a "request feature" link on relevant empty states** — simple vote counter

### Claude's Discretion
- Exact scene detection algorithm and thresholds (tag weight, listener overlap minimum)
- How artist suggestions are queued and reviewed before affecting scene membership
- Scene page layout details beyond the three content types (artists, tracks, listeners)
- Notification delivery mechanism for scene follows

</decisions>

<specifics>
## Specific Ideas

- The underground is alive — scenes exist in Mercury that exist nowhere else. This is the north star for what "success" looks like.
- Anti-rich-get-richer is explicitly a design value — the rotation tier system should prevent established scenes from always dominating the page

</specifics>

<deferred>
## Deferred Ideas

- **Label collectives** — skipped entirely for Phase 11. Too vague without an organic community. Revisit when users have formed natural groupings and we can see what they actually want.
- **Creation tools** (collaborative playlists, shared collections, label pages) — deferred until community explicitly requests them. Feature request mechanism ships Phase 11, actual tools come later.

</deferred>

---

*Phase: 11-scene-building*
*Context gathered: 2026-02-23*
