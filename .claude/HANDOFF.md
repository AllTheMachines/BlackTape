# Work Handoff - 2026-02-27

## Current Task
Two parallel tasks: (1) artist page streaming section redesign, (2) animated cassette wheels in the player bar

## Context
Visual polish session on the BlackTape desktop app. Player icon bug was fixed (flex-shrink was crushing SVG widths). Back button fixed same way. Steve wants to redesign the artist page's streaming links section (confusing duplicates, full-width ugly buttons) and also wants animated spinning cassette reels in the player bar — very on-brand for BlackTape.

## Progress

### Completed (all committed via auto-save)
- **Player icons** — flex-shrink bug fixed. SVGs inside flex buttons were being crushed to button width. Fixed with `:global(.control-btn svg) { width: 15px; height: 15px; flex-shrink: 0 }` and `:global(.play-btn svg) { width: 18px; height: 18px; flex-shrink: 0 }`. Button sizes: small=28px, regular=32px, play=36px.
- **Back button** — same fix applied to `.back-btn` in ControlBar.svelte. `:global(.back-btn svg)` rule, button 26→32px.
- **Player bar background** — reverted red test back to `var(--bg-3)` ✓

### Remaining — Task 1: Artist Page Streaming Section Redesign

**The Problem (confirmed by screenshot):**
- Source switcher tabs (Bandcamp | Spotify | SoundCloud | YouTube) at top of artist header
- Embed shows for active tab only
- Separate full-width "Listen On" section below shows ALL platforms always → duplicates
- "Play on Spotify" + "Open in Spotify" — two identical-looking buttons → confusing
- "Visit YouTube Channel" ×2 duplicate buttons
- Overall: confusing, messy, full-width buttons look bad

**Agreed Design:**
- **One compact platform row** replacing both the source-switcher tabs AND the "Listen On" section
- Compact pill/chip buttons: `[Bandcamp] [Spotify] [SoundCloud] [YouTube]`
- **Click** → embed toggles open below (if embed available) OR opens site directly in new tab (Steve confirmed: "go straight to the site if no embed")
- **For platforms with both embed + external link**: small `↗` icon button next to the main button
- **Remove** the separate "Listen On" section entirely (lines 538-554 in +page.svelte)
- **Fix** deduplication bug (2x YouTube, 2x Spotify showing up)

**Key Files for Task 1:**
- `src/routes/artist/[slug]/+page.svelte`
  - Lines 447-470: source-switcher + EmbedPlayer → replace with new platform row
  - Lines 538-554: "Listen On" section → DELETE this entire block
  - Lines 472-485: spotify-play-btn → merge into platform row concept
  - `sortedStreamingLinks` / `availableEmbedServices` derived state → restructure
- `src/lib/components/EmbedPlayer.svelte` — check if it renders its own fallback link buttons ("Visit on Bandcamp" etc. when embed fails)
- `src/routes/artist/[slug]/+page.ts` — deduplication logic (lines 72-136)

**Data structure:**
- `data.links` — PlatformLinks: `{ bandcamp: string[], spotify: string[], soundcloud: string[], youtube: string[] }`
- `data.categorizedLinks.streaming` — CategorizedLink[]: `{ url, label }` for ALL streaming platforms including Apple Music, Tidal etc.
- `availableEmbedServices` — filtered to only embed-capable platforms (BC/Spotify/SC/YT)

**Implementation plan:**
1. Read EmbedPlayer.svelte to understand fallback behavior (what renders when embed fails)
2. Create new unified `platformRow` derived state merging embed services + streaming-only links
3. Replace source-switcher div + listen-on section with `<div class="platform-row">`
4. Each item: platform button (toggles embed or opens link) + optional ↗ external link button
5. Keep EmbedPlayer component as-is, wrap in collapsible container
6. Remove streaming platforms from categorized links section below

### Remaining — Task 2: Animated Cassette Wheels in Player Bar

**Steve's idea:** Animated cassette tape reels in the player bar — just the middle mechanical part (two spinning wheels/hubs), no full cassette body. Spins when playing, stops when paused. Very on-brand for BlackTape.

**Implementation approach:**
- SVG animation in `Player.svelte`
- Two circular SVG reels with spokes/holes pattern
- CSS `animation: spin linear infinite` on `.reel`
- `animation-play-state: running` when `playerState.isPlaying`, `paused` when not
- Position: in the track-info area or decoratively in the player bar background
- Subtle, dark-themed — shouldn't overpower the controls

## Key Decisions
- Artist page: click with no embed → go straight to the site (not a fallback panel)
- Player icons: controlled via `:global()` CSS rules with `flex-shrink: 0` (not inline styles or HTML attributes)
- The root cause of tiny icons: flex-shrink was crushing SVG widths in flex containers

## Relevant Files
- `src/lib/components/Player.svelte` — icons fixed, cassette wheels go here
- `src/lib/components/ControlBar.svelte` — back button fixed
- `src/routes/artist/[slug]/+page.svelte` — streaming section redesign (next)
- `src/lib/components/EmbedPlayer.svelte` — read before redesigning

## Git Status
Only BUILD-LOG.md has uncommitted auto-appended commit lines. All code changes committed.

## Next Steps
1. Decide which task to do first (cassette wheels are fun + fast; artist page is more complex)
2. For cassette wheels: design the SVG reels, add to Player.svelte, wire to isPlaying state
3. For artist page: read EmbedPlayer.svelte then implement the platform row redesign

## Resume Command
After running `/clear`, run `/resume` to continue.
