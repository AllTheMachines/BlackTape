# Parachord Analysis — What Mercury Can Learn

## Overview

Parachord is a **metadata-first music player** built in Electron + React. It solves the aggregation problem (play music from multiple sources in one interface) through a plugin architecture.

---

## Tech Stack Comparison

| Aspect | Parachord | Mercury |
|--------|-----------|---------|
| **Desktop** | Electron + React (Node-based) | Tauri 2.0 + SvelteKit (Rust-based) |
| **Code bundling** | Single `app.js` bundle (no visible src/) | SvelteKit + modular Rust |
| **Styling** | Tailwind CSS (CDN) | Custom CSS variables (OKLCH theming) |
| **Data layer** | better-sqlite3 + plugins | SQLite + FTS5 (local index) |
| **Metadata** | MusicBrainz API (live) + plugins | MusicBrainz (indexed locally) |
| **Distribution** | GitHub Releases, electron-builder | Torrent + direct download |

**Winner:** Mercury's Tauri approach is leaner (Rust shell vs Node), better for distribution (no heavy Node runtime).

---

## Architecture: Plugin vs. Index-Based

### Parachord's Approach: **Plugin Resolver Model**
- Each streaming service is a "plugin" that resolves tracks
- Plugins run in parallel, return matches incrementally ("Smart Resolution")
- User drag-to-reorder plugins to set priority
- Format: `.axe` (JSON-based plugin spec)
- Extensible: Anyone can build a plugin

**Strengths:**
- Flexible — easy to add new sources without core changes
- Incremental results — user sees matches as plugins respond
- Respects user preference — drag-to-reorder is clear

**Weaknesses:**
- Requires API credentials for each service (user friction)
- Plugin quality varies — depends on maintainers
- Complex plugin system (sandboxing, hot reload)

### Mercury's Approach: **Local Indexed Search + Live Embeds**
- All metadata indexed locally (MusicBrainz 2.6M artists)
- Streaming services are embed targets, not data sources
- User preference is stored (not drag-to-reorder)
- Audio always plays on the original service

**Strengths:**
- No API credentials needed upfront
- Fast search (local FTS5)
- Uniqueness-based discovery (Mercury's angle)
- Artist enablement (tagging, claiming profiles)

**Weaknesses:**
- Less flexible for adding new sources
- Requires pre-processing of MusicBrainz dumps
- Doesn't show incremental results

---

## UI/UX Patterns Worth Adopting

### 1. **Source Priority Drag-to-Reorder**
Parachord shows this in Settings → Plugins:
- Visual list of enabled services
- Drag to reorder priority
- Checkboxes to enable/disable
- Clear visual feedback on current priority

**For Mercury Phase 30:** Instead of a dropdown, use drag-to-reorder for service priority. It's more visual and intuitive.

### 2. **Incremental Search Results**
Parachord shows matches as plugins respond (e.g., "YouTube found it in 200ms, Bandcamp found it in 450ms"). User sees multiple options appearing.

**For Mercury Phase 30:** When searching, show "Playing from [service]" with option to switch. Show other available services as badges below the player.

### 3. **"Buy Links" as Secondary Action**
Parachord surfaces Bandcamp buy buttons even when playing from Spotify. This is a discovery angle.

**For Mercury:** Link to artist's Bandcamp/Ko-fi/Patreon from the player (leverage existing artist links).

### 4. **Volume Normalization Between Sources**
Parachord normalizes loudness between services (YouTube audio is often quieter).

**For Mercury:** Not critical for Phase 30, but note for later.

---

## What Mercury Does Better

1. **Discovery over Aggregation**
   - Parachord: "Play this track from any source"
   - Mercury: "Discover music you've never heard based on your taste"
   - Mercury's angle is stronger for music nerds

2. **Artist Enablement**
   - Parachord: Shows artist data (bio, discography)
   - Mercury: Artists can claim profiles, add specific tags, earn visibility through uniqueness
   - Mercury's model rewrites the discovery economics

3. **No API Key Friction**
   - Parachord: "Go get an API key from Spotify's developer console"
   - Mercury: Works out of the box (embeds use public links)
   - Lower barrier to entry

4. **Knowledge Base**
   - Parachord: Artist pages are static (MusicBrainz + Wikipedia)
   - Mercury: Scene maps, genre evolution, curator writing
   - Mercury's knowledge base is richer and more interactive

---

## What We Should Copy for Phase 30

### Service Selector UI
```
[Now Playing: Radiohead - No Surprises]
  Playing from: [Spotify ▼]
    Available on: [YouTube] [Bandcamp] [SoundCloud]
```

Instead of a dropdown, show:
- Current service as a button/badge
- Available services as clickable badges
- Click to switch instantly

### Implementation Path

1. **Player bar:** Show current service icon + name
2. **On-hover/click:** Show available services as pills
3. **Settings:** Drag-to-reorder service priority (like Parachord)
4. **Preference persistence:** localStorage + preferenceStore

### Code Structure
- `lib/streaming.ts` — service detection + availability check
- `lib/preference.ts` — store + manage service order
- `Player.svelte` — add service indicator + switcher UI
- `StreamServiceSelector.svelte` — new component for priority drag-to-reorder

---

## Red Flags to Avoid

1. **Plugin Complexity** — Don't build a full plugin system for v1.5. Just hardcode Spotify/YouTube/SoundCloud/Bandcamp.

2. **API Key Friction** — Spotify's Web Playback SDK requires Premium. Be transparent about this in Settings (show a note like "Spotify playback requires Premium account").

3. **Incremental Results Overhead** — Parachord's "matches arrive as plugins respond" is cool but adds complexity. For Mercury Phase 30, just show all available services at once.

4. **Drag-to-Reorder Complexity** — SvelteKit's `dnd` library is well-supported. Keep it simple: Settings → Service Priority, list with drag handles.

---

## Phase 30 Checklist

- [ ] Service detection module (which services available for this track?)
- [ ] Preference store (service priority order)
- [ ] Player bar service indicator + switcher UI
- [ ] Settings → Service Priority (drag-to-reorder)
- [ ] Persistent preference (survives app restart)
- [ ] Service icons/badges (Spotify, YouTube, Bandcamp, SoundCloud)
- [ ] Test: can play same track from different services
- [ ] Test: preference persists across tracks

---

## Bottom Line

**Parachord is a solid aggregator, but Mercury has a stronger vision.** Parachord's plugin architecture is overcomplicated for Phase 30. Mercury should steal the **drag-to-reorder service priority UI** and the **clear visual indicators of where music is playing**, then stay focused on discovery + artist enablement.

Don't try to build Parachord 2.0. Build Mercury with multi-source playback added.
