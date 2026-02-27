# Work Handoff - 2026-02-27

## Current Task
Artist page links/streaming section redesign

## Context
Visual polish session. Player icon fix is complete and committed. Now working on redesigning the artist page streaming section which is confusing (duplicate buttons, full-width ugly buttons, mixed embeds + links).

## Progress

### Completed this session (all committed via auto-save)
- **Player icons** — fixed flex-shrink bug (SVGs were being crushed by flex container). Icons now visible. Added `:global(.control-btn svg) { width: 15px; height: 15px; flex-shrink: 0 }` and `:global(.play-btn svg) { width: 18px; height: 18px; flex-shrink: 0 }`. Buttons: small=28px, regular=32px, play=36px.
- **Back button** — same fix. `:global(.back-btn svg)` CSS rule, button 26→32px.

### Next Task: Artist Page Streaming Section Redesign

**The Problem (screenshot confirmed):**
- Source switcher tabs (Bandcamp | Spotify | SoundCloud | YouTube) at top
- Embed shows for active tab only
- Separate full-width "Listen On" section below shows ALL platforms always → duplicates
- "Play on Spotify" + "Open in Spotify" two identical-looking buttons → confusing
- "Visit YouTube Channel" ×2 duplicate buttons
- Overall: confusing, messy, full-width buttons look bad

**Agreed Design:**
- **One compact platform row** replacing both the source-switcher tabs AND the "Listen On" section
- Compact pill/chip buttons: `[Bandcamp] [Spotify] [SoundCloud] [YouTube]`
- **Click** → embed toggles open below (if embed available) OR opens site directly in new tab (Steve: "go straight to the site if no embed")
- **For platforms with both embed + external link**: small `↗` icon button next to the main button
- **Remove** the separate "Listen On" section entirely
- **Remove** streaming platforms from the categorized links section below (they're in the row now)
- **Fix** deduplication bug (2x YouTube, 2x Spotify showing up)

**Key Files:**
- `src/routes/artist/[slug]/+page.svelte` — main changes here
  - Lines 447-470: source-switcher + EmbedPlayer → replace with new platform row
  - Lines 538-554: "Listen On" section → DELETE this entire block
  - Lines 472-485: spotify-play-btn → merge into platform row concept
  - `sortedStreamingLinks` / `availableEmbedServices` derived state → restructure
- `src/lib/components/EmbedPlayer.svelte` — check if it renders its own link buttons (the "Visit on Bandcamp" etc. buttons come from here when embed fails — keep or redirect to site?)
- `src/routes/artist/[slug]/+page.ts` — deduplication logic (lines 72-136)

**Data structure:**
- `data.links` — PlatformLinks: `{ bandcamp: string[], spotify: string[], soundcloud: string[], youtube: string[] }`
- `data.categorizedLinks.streaming` — CategorizedLink[]: `{ url, label }` for ALL streaming platforms including Apple Music, Tidal etc.
- `availableEmbedServices` — filtered to only platforms with embed capability (BC/Spotify/SC/YT)

**Implementation approach:**
1. Create new `platformRow` derived state that merges embed services + streaming-only links
2. Replace source-switcher div + listen-on section with single `<div class="platform-row">`
3. Each item: platform button (toggles embed or opens link) + optional ↗ external link button
4. Keep EmbedPlayer as-is but wrap in collapsible container
5. Remove streaming from categorized links section

## Relevant Files
- `src/lib/components/Player.svelte` — icons fixed ✓
- `src/lib/components/ControlBar.svelte` — back button fixed ✓
- `src/routes/artist/[slug]/+page.svelte` — NEXT: redesign streaming section

## Git Status
Clean (auto-save committing throughout). BUILD-LOG needs session summary.

## Next Steps
1. Read EmbedPlayer.svelte to understand what "Visit on Bandcamp" fallback renders
2. Implement the new platform row design
3. **NEW IDEA: Animated cassette wheels in player bar** — Steve wants the spinning cassette reels (just the middle part, no full cassette body) animated in the player bar. Should spin when playing, stop when paused. Very on-brand for BlackTape. Implement as an SVG animation alongside the track info or replacing the static player bar background.
4. Update BUILD-LOG with session summary

## Resume Command
After `/clear`, run `/resume` to continue.
