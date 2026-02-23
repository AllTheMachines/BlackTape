---
phase: 02-search-and-embeds
plan: 04
subsystem: artist-pages
tags: [artist-page, embeds, musicbrainz-api, bio, external-links, platform-detection]
dependency_graph:
  requires: [02-01, 02-03]
  provides: [artist-page, embed-player, external-links, musicbrainz-proxy, bio-fetcher]
  affects: [02-05]
tech_stack:
  added: [wikipedia-rest-api, musicbrainz-ws2-api, soundcloud-oembed, spotify-embed, youtube-nocookie-embed]
  patterns: [click-to-load-iframe, server-side-oembed, rate-limiting, cache-api, platform-detection, balanced-two-column-layout]
key_files:
  created:
    - src/lib/embeds/types.ts
    - src/lib/embeds/spotify.ts
    - src/lib/embeds/youtube.ts
    - src/lib/embeds/soundcloud.ts
    - src/lib/embeds/bandcamp.ts
    - src/lib/bio.ts
    - src/routes/api/artist/[mbid]/links/+server.ts
    - src/lib/components/ExternalLink.svelte
    - src/lib/components/EmbedPlayer.svelte
    - src/routes/artist/[slug]/+page.server.ts
    - src/routes/artist/[slug]/+page.svelte
  modified: []
key_decisions:
  - Click-to-load pattern for iframes — show styled button, reveal iframe on click to avoid loading heavy embeds until user wants to listen
  - SoundCloud oEmbed fetched server-side in page load — avoids client-side CORS issues
  - YouTube uses nocookie domain (youtube-nocookie.com) for privacy
  - MusicBrainz rate limiting via module-level timestamp tracking (1100ms between requests)
  - Cloudflare Cache API with 24hr TTL for MusicBrainz responses
  - Bio and links are best-effort — page renders from DB data alone if external APIs fail
  - Embeds column uses sticky positioning on desktop for scroll context
  - artistMeta computed as derived function for conditional rendering
metrics:
  duration: 3min
  completed: 2026-02-15
---

# Phase 02 Plan 04: Artist Pages with Embeds Summary

Artist pages with MusicBrainz-powered platform embeds, Wikipedia bio snippets, click-to-load iframes, and balanced two-column layout.

## What Shipped

### Task 1: MusicBrainz API proxy, embed utilities, and bio fetcher (8b9967f)

Created the full embed infrastructure:

- **Platform type system** (`types.ts`): PlatformType union, PlatformLinks interface, EmbedData interface, PLATFORM_PRIORITY array (bandcamp first)
- **Spotify embed** (`spotify.ts`): URL parser that extracts artist/album/track/playlist IDs, returns dark-themed embed URLs
- **YouTube embed** (`youtube.ts`): Handles watch, youtu.be, and embed URL formats; returns nocookie privacy domain; detects channel URLs separately
- **SoundCloud** (`soundcloud.ts`): Constructs oEmbed API URL for server-side fetch; detects artist vs track profiles
- **Bandcamp** (`bandcamp.ts`): External link only (no embed per locked decision); URL detection
- **Bio fetcher** (`bio.ts`): Wikipedia REST API integration with language detection, User-Agent header, graceful failure
- **MusicBrainz API proxy** (`+server.ts`): UUID validation, Cloudflare Cache API (24hr TTL), rate limiting (1100ms), URL relation categorization by domain

### Task 2: Artist page with balanced layout, embeds, and components (21fffe8)

Built the complete artist experience:

- **ExternalLink component**: Platform-colored pill buttons with hover states using `color-mix()` for subtle accent borders
- **EmbedPlayer component**: Renders embeds in priority order (bandcamp > spotify > soundcloud > youtube); click-to-load pattern shows styled buttons before revealing iframes; YouTube gets 16:9 aspect ratio wrapper; SoundCloud renders server-fetched oEmbed HTML
- **Artist page server load**: Fetches artist from D1, external links from MusicBrainz proxy, SoundCloud oEmbed HTML server-side, Wikipedia bio — all with graceful fallbacks
- **Artist page**: Two-column layout (5fr/4fr grid) with info left (name, type/country, year, bio, tags, other links) and embeds right (sticky positioning); responsive single-column on mobile; all tags shown as clickable TagChips

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/embeds/types.ts` | Platform type definitions and priority order |
| `src/lib/embeds/spotify.ts` | Spotify URL to embed URL transformer |
| `src/lib/embeds/youtube.ts` | YouTube URL to nocookie embed URL transformer |
| `src/lib/embeds/soundcloud.ts` | SoundCloud oEmbed URL constructor |
| `src/lib/embeds/bandcamp.ts` | Bandcamp URL detection (external link only) |
| `src/lib/bio.ts` | Wikipedia bio snippet fetcher |
| `src/routes/api/artist/[mbid]/links/+server.ts` | MusicBrainz API proxy with caching and rate limiting |
| `src/lib/components/ExternalLink.svelte` | Platform-colored external link pill buttons |
| `src/lib/components/EmbedPlayer.svelte` | Priority-ordered embed player with click-to-load |
| `src/routes/artist/[slug]/+page.server.ts` | Artist page server load (DB + API + bio) |
| `src/routes/artist/[slug]/+page.svelte` | Artist page with balanced two-column layout |

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| 8b9967f | feat(02-04): add MusicBrainz API proxy, embed utilities, and bio fetcher |
| 21fffe8 | feat(02-04): build artist page with embeds, bio, and balanced layout |

## Self-Check: PASSED

- FOUND: src/lib/embeds/types.ts
- FOUND: src/lib/embeds/spotify.ts
- FOUND: 2 commits matching "02-04" (8b9967f, 21fffe8)
