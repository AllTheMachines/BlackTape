# Feature Research

**Domain:** BlackTape v1.6 — Multi-source streaming playback integration (Spotify, YouTube, SoundCloud, Bandcamp)
**Researched:** 2026-02-26
**Confidence:** HIGH for embed/iframe features, MEDIUM-HIGH for Spotify OAuth flow, HIGH for Spotify policy constraints

---

## Context

This is a subsequent-milestone research file. BlackTape already has: full music search (2.8M artists),
artist profiles with click-to-load embed players (Bandcamp/Spotify/SoundCloud/YouTube iframes), queue
management (TrackRow on all surfaces), Settings page with a streaming preference UI stub (single dropdown),
and link categorization that extracts platform URLs from MusicBrainz artist data.

The app is **Tauri 2.0 desktop only — Windows uses WebView2 (Chromium-based)**. $0 infrastructure.
No server. All data stays local.

The milestone goal: wire up true streaming integration so clicking Play on an artist actually plays music,
with service priority set once and applied automatically.

### Critical Constraint Discovered During Research

**Spotify's February 2026 policy change is a project-level blocker.**

As of February 11, 2026 (effective March 9, 2026 for existing apps):
- Development Mode Client IDs are limited to **5 authorized users total**
- Premium subscription required for all developers
- Spotify only accepts applications from **legally registered organizations** (not individuals)
- Web Playback SDK requires Widevine DRM + Premium account — this has additional WebView2 compatibility questions

A bundled Client ID distributed with an open source desktop app would expose those 5 user slots to
the entire userbase, effectively bricking the integration for all but 5 users. This is not a solvable
problem within Spotify's current policy framework without extended API access (requires 250K MAU +
registered organization).

**Consequence: Spotify playback integration must scope to the iframe embed only (no Web Playback SDK),
and the "guided onboarding" for v1.6 is not Spotify Premium playback — it is Spotify embed play (which
works logged-in for full tracks, shows 30s previews when logged out). Users experience Spotify through
the existing embed iframe, which already works today.**

---

## Feature Landscape

### Area 1: Spotify Integration

#### What Users Expect (Table Stakes)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Spotify content loads and plays | If Spotify links exist for an artist, clicking Play should play | MEDIUM | Already works via iframe embed today — click-to-load trigger reveals the embed |
| Full track play for Premium users | Spotify Premium users expect full tracks, not 30s previews | LOW (for iframe) / BLOCKED (for SDK) | Iframe embed: if user is logged into Spotify in WebView2, full tracks play automatically. No extra auth needed. |
| 30s preview for free/logged-out users | Non-Premium users get a taste, not nothing | LOW | Iframe embed delivers this by default — no code needed |
| "Sign in to Spotify" prompt is visible | When a preview is playing, users expect to see how to get more | LOW | Spotify iframe handles this natively inside the iframe — no custom UI needed |
| No developer portal steps | Users expect to click a button, not configure an app | N/A | This is a key Spotify iframe advantage: zero setup for users |

#### What BlackTape Can Realistically Deliver

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Click-to-load Spotify embed (existing) | Already built — triggers iframe load on first click | DONE | `revealEmbed()` pattern already in EmbedPlayer.svelte |
| Auto-load Spotify embed when it is preferred service | Skip the click-to-load when Spotify is the priority service | LOW | Remove click gate for the preferred platform only |
| Service priority badge on Spotify embed | Small "Spotify" label above or below the embed | LOW | Visual anchor confirming which service is playing |
| Spotify iframe play tracking (70% rule) | Record that user listened to Spotify content, same as SoundCloud | MEDIUM | Spotify iframe does not expose progress events like SoundCloud Widget API does — LOW confidence this is achievable; SoundCloud is the only one with an accessible event API |

#### Anti-Features (Spotify)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Spotify Web Playback SDK integration | Full in-app Premium streaming with programmatic control | Requires Widevine DRM. In WebView2 on Windows, Widevine is available but requires the user to have Edge's Widevine CDM — not guaranteed. More critically: bundled Client ID hits 5-user cap immediately. Extended access requires 250K MAU + legal organization. | Spotify iframe embed already delivers full Premium playback for logged-in users without any SDK or developer dashboard work. |
| Guided Spotify PKCE OAuth for playback | "Connect Spotify" step-by-step onboarding for Web Playback SDK | BLOCKED: the 5-user Development Mode cap makes this unusable in a distributed app. Each PKCE authorization counts toward the cap. | Defer until Spotify extended API access can be applied for (requires organization status + user scale). The existing import OAuth (for taste import) already exists but uses a user-supplied Client ID to avoid the cap. |
| Bundled Client ID for PKCE | Ship a Client ID in the app binary so users don't configure anything | Violates Spotify ToS — sharing Client IDs is explicitly prohibited. Also: 5-user cap applies per Client ID. | User-supplied Client ID (as in existing import flow) or skip Web Playback SDK entirely. |
| Spotify search by artist name | Look up what tracks Spotify has for an artist | Requires Web API with extended access. Search endpoints are restricted in Development Mode. | Use MusicBrainz-sourced Spotify URLs (already extracted from MB relationship data). |

---

### Area 2: YouTube Integration

#### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| YouTube content plays in-app | If an artist has a YouTube channel or videos, they expect playback | MEDIUM | YouTube IFrame API — already partially built (click-to-load iframe in EmbedPlayer.svelte) |
| Fallback to open-in-browser | If the iframe fails, open YouTube in browser | LOW | `isYoutubeChannel()` already in youtube.ts — channel URLs open externally |
| 16:9 aspect ratio preserved | Video content needs correct proportions | DONE | `.video-wrap` with 56.25% padding-bottom already in EmbedPlayer.svelte |
| No autoplay on page load | Auto-playing video is aggressive | DONE | Click-to-load trigger prevents autoplay |

#### Differentiators (YouTube)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Track-level resolution: music video lookup | For a given track title + artist name, find the matching YouTube video | HIGH | Requires YouTube Data API v3 with quota. Free tier: 10,000 units/day. Each search costs 100 units. This is 100 searches/day per app — inadequate for large usage. Alternatively, use MusicBrainz-sourced YouTube URLs (already extracted). |
| Auto-load YouTube when preferred service | Skip click gate if YouTube is priority service | LOW | Same pattern as Spotify auto-load |
| Audio-only mode for YouTube | Skip video rendering, play audio only | LOW | `?vq=tiny` parameter reduces video quality; audio-only is not officially supported by YouTube iframe |
| YouTube channel browse on artist page | Show artist's full YouTube channel content | MEDIUM | Embed the channel page as an iframe (`youtube.com/c/artistname`) — already handled by `isYoutubeChannel()` fallback |

#### Anti-Features (YouTube)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| YouTube Data API for artist search/resolution | Automatically find YouTube content for every artist | API quota makes this unscalable at app level (100 searches/day free). YouTube API key bundled in app binary is a security issue. | Use MusicBrainz-sourced YouTube URLs only. Resolution is "does MusicBrainz have a YouTube link for this artist?" — not a lookup. |
| Download or extract YouTube audio | Users want local files | Violates YouTube ToS. DMCA exposure. | Never. Link out. |
| YouTube Music integration | Separate from YouTube — has its own player and API | YouTube Music does not have a public embeddable player or open API. Separate product, different URL scheme. | Treat music.youtube.com URLs as external links only (already handled in `labelFromUrl` as "YouTube Music"). |

---

### Area 3: SoundCloud Integration

#### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| SoundCloud content plays in-app | If an artist has SoundCloud, clicking their embed should play | MEDIUM | SoundCloud oEmbed already implemented — fetched server-side in artist page load function |
| Artist profile page (not just individual tracks) | SoundCloud artist pages show all their tracks | DONE | `isSoundcloudArtist()` + oEmbed fetching already exists |
| Progress/listen tracking works | 70% completion triggers listening history entry | DONE | SoundCloud Widget API hook already wired in EmbedPlayer.svelte |

#### Differentiators (SoundCloud)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Track-level SoundCloud embed | Embed a specific track, not just the artist page | MEDIUM | oEmbed with a track URL (not artist page URL). Needs track URL from MusicBrainz (MB relationship type: "streaming"). |
| SoundCloud auto-load for preferred service | Remove click-to-load gate when SoundCloud is priority | LOW | Same pattern as other services |
| SoundCloud Widget API play/pause control | Programmatic control for queue integration | MEDIUM | SC.Widget() API supports `play()`, `pause()`, `seekTo()`. Already loading Widget API in EmbedPlayer. Integration is feasible. |

#### SoundCloud Relevance to BlackTape's Values

SoundCloud is particularly important for BlackTape's indie/underground focus: it hosts vast amounts of
independent music that has no Bandcamp or Spotify presence. Artists on labels like Vakant, Ocha Records,
or experimental/ambient scenes frequently have SoundCloud as their primary or only streaming presence.
The oEmbed integration already works — this area is about making it first-class.

#### Anti-Features (SoundCloud)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| SoundCloud API key for search | Find SoundCloud content for artists without MB links | SoundCloud public API has been effectively closed to new registrations since 2021. Getting an API key is no longer reliably possible. | Use MusicBrainz-sourced SoundCloud URLs only. |
| SoundCloud Go+ integration | Play tracks behind SoundCloud's paywall | No public API or embed support for subscriber-only content. | Not feasible. Subscriber content stays gated. |

---

### Area 4: Bandcamp Integration

#### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Bandcamp content plays in-app | BlackTape's primary value alignment is with independent music | MEDIUM | **Major finding:** Bandcamp now supports a `url=` parameter in EmbeddedPlayer, removing the need for album/track IDs. Format: `https://bandcamp.com/EmbeddedPlayer/url=https%3A%2F%2Fartist.bandcamp.com%2Falbum%2Falbum-name/size=large/bgcol=1d1d1d/linkcol=ffffff/minimal=true/transparent=true/` |
| Album tracklist playable in order | A Bandcamp album embed should play all tracks | LOW | The `url=` parameter with an album URL plays the entire album with tracklist |
| Individual track embed | Embed a specific track | LOW | Same `url=` parameter with a track URL |
| No API key required | Artists don't expect their fans to configure Bandcamp credentials | DONE | Bandcamp embedding is public — no auth, no API key needed |

#### What Changed: The `url=` Parameter

Previously, Bandcamp embeds required an album ID and track ID that are not present in MusicBrainz URLs.
This meant Bandcamp was "external link only" in the existing codebase (see `bandcamp.ts`).

Bandcamp added a new `url=` parameter to the EmbeddedPlayer that accepts a URL-encoded Bandcamp URL
directly. This means any `artist.bandcamp.com/album/album-name` URL from MusicBrainz can be embedded
without scraping or API calls.

**This unblocks Bandcamp embed support for v1.6.**

Format:
```
https://bandcamp.com/EmbeddedPlayer/url={ENCODED_URL}/size=large/bgcol=1d1d1d/linkcol=ffffff/minimal=true/transparent=true/
```

Parameters:
- `size`: `small`, `medium`, `large`
- `bgcol`: hex without # (use dark backgrounds — 1d1d1d matches app theme)
- `linkcol`: hex without # (amber accent — d4a017 or similar)
- `minimal`: `true` removes artwork, `false` shows artwork
- `transparent`: `true` for transparent background

#### Differentiators (Bandcamp)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Bandcamp-first embed for indie artists | Prioritize Bandcamp when available — aligns with project values | DONE | PLATFORM_PRIORITY already puts Bandcamp first |
| Album-level embed on release pages | Release page "Play Album" wires up a Bandcamp embed for that release | MEDIUM | Requires release page to use release URL (from MusicBrainz purchase links) to construct embed |
| Free/name-your-price detection | Bandcamp tracks marked free in MusicBrainz can be labeled accordingly | LOW | MB `download for free` relationship type already categorized as `streaming` in categorize.ts |
| Dark theme alignment | Bandcamp embed bg color matches BlackTape dark theme | LOW | Pass `bgcol=1d1d1d` (matches --bg-1) and `linkcol` matching amber accent |

#### Bandcamp Relevance to BlackTape's Values

Bandcamp is the canonical platform for independent music. Steve's label background (Vakant, Kwik Snax)
means the artists most likely to be featured in BlackTape's discovery flows release on Bandcamp. This
is where the "uniqueness is rewarded" philosophy intersects most directly with actual playback:
underground artists have Bandcamp pages, not Spotify profiles.

#### Anti-Features (Bandcamp)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Bandcamp API integration | Search Bandcamp for artist content | Bandcamp's public API has been extremely limited since Songtradr acquisition concerns. No reliable public search API. | Use MusicBrainz-sourced Bandcamp URLs only. |
| "Buy on Bandcamp" direct in-app purchase | Users want to buy without leaving the app | Bandcamp's checkout requires their website — no in-app purchase API exists. | "Buy on Bandcamp" external link (already in BuyOnBar.svelte). |
| Bandcamp scraping for track IDs (old approach) | Get album/track IDs not in MusicBrainz | Brittle, against ToS, breaks on Bandcamp HTML changes. | `url=` parameter approach eliminates the need for IDs entirely. |

---

### Area 5: Service Resolution

This is the connective tissue — how the app determines which services have content for a given artist
and which to use first.

#### How Service Resolution Works in BlackTape

**Current state:** MusicBrainz artist data includes relationship URLs. The `categorize.ts` `detectPlatform()`
function already extracts Spotify, YouTube, SoundCloud, and Bandcamp URLs from these relationships.
The `PlatformLinks` type (`{ bandcamp: string[], spotify: string[], soundcloud: string[], youtube: string[] }`)
is already populated per artist.

**Resolution strategy:** The system already knows which services have content — it's in `PlatformLinks`.
There is no need for secondary lookups, artist name searches, or ISRC matching. Resolution = "does the
MusicBrainz record for this artist contain a URL for this platform?"

**When MusicBrainz has no link:** The platform shows as unavailable. Users can always open the platform
in their browser to search manually. There is no fallback search against Spotify/YouTube/SoundCloud APIs
(this would require API keys and quotas).

#### Table Stakes (Service Resolution)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Available services are clearly shown | Users want to know what's playable before clicking | LOW | Show platform badges/buttons only for platforms that have URLs in PlatformLinks |
| Priority order is respected | User set a preference — it should be honored | LOW | PLATFORM_PRIORITY already exists; `streamingPref.platform` already reorders it |
| Unavailable services are not shown | Don't show a YouTube button if there's no YouTube link | DONE | EmbedPlayer already filters by `urls.length > 0` |
| First available service loads automatically (or with one click) | Users expect a single Play action, not choosing a platform | MEDIUM | Auto-select first available service from ordered priority list |

#### Differentiators (Service Resolution)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Source switcher buttons on artist page | After initial play, user can switch to a different available service | LOW | Small button group: "Playing: Bandcamp — Also on: [SC] [YT]" |
| Drag-to-reorder priority in Settings | Intuitive priority management, borrowed from Parachord | MEDIUM | Replaces the existing platform dropdown. Svelte 5 drag API or a simple up/down button approach. |
| "Available on N services" count on artist card | Discover cards show service availability at a glance | LOW | Count non-empty platform arrays in PlatformLinks |

#### Anti-Features (Service Resolution)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Cross-platform artist search to find content | "If MusicBrainz has no Spotify link, search Spotify for the artist name" | Requires API keys. Name search is unreliable (common artist names, wrong region results). Creates false matches. | Only use MusicBrainz-sourced URLs. If a link is missing, the right fix is adding it to MusicBrainz. |
| ISRC-based track matching | Match tracks across services via ISRC codes | ISRC lookup APIs require service-specific auth. ISRC data in MusicBrainz is incomplete. High complexity for marginal gain. | Use release-level URLs from MusicBrainz, which are already per-platform. |
| Real-time availability checking | Ping each service to verify a URL still resolves | Network overhead on every artist page load. Unreliable for privacy (leaks browsing to service CDNs). | Accept that some links may be stale. Dead domain filtering (already built for artist links) handles the worst cases. |

---

### Area 6: Service Priority UI (Settings)

#### Current State

The Settings page has a `<select>` dropdown for "Preferred Platform" with 4 options (Bandcamp, Spotify,
SoundCloud, YouTube, or No preference). This works but does not allow specifying a full ordered priority
list — only "what to show first."

#### What v1.6 Needs

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Full ordered list (not just "first") | Users want to say "Bandcamp first, SoundCloud second, YouTube third, skip Spotify" | MEDIUM | Replaces dropdown with ordered list |
| Drag-to-reorder | Intuitive for a priority list | MEDIUM | Svelte 5 drag events or simple up/down arrows (up/down arrows are more accessible and simpler to implement reliably) |
| "Enable/disable" per service | Turn off services you don't use | LOW | Checkbox or toggle per service in the ordered list |
| Priority persists across sessions | Set once, always applied | DONE | `saveStreamingPreference()` pattern exists, needs extending to array instead of single string |

#### Anti-Features (Settings)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Per-artist service override | "I always want Bandcamp for Burial but Spotify for Daft Punk" | High complexity, poor UX (requires per-artist config memory). Edge case. | Global priority is sufficient. Source switcher on artist page handles one-off needs. |
| Service connection status in Settings | "Show me if I'm connected to Spotify" | Spotify iframe does not surface login state to parent page. No way to detect if user is logged in to Spotify in WebView2 without the SDK. | Source switcher and embed show Spotify's own login prompt when needed. |

---

### Area 7: Player Bar Service Badge

#### What Users Expect

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Visual indicator of active service | "Am I listening to the Spotify embed or Bandcamp?" | LOW | Small badge/chip on player bar, e.g. "via Bandcamp" |
| Service name or icon | Platform is identified at a glance | LOW | Text label is more accessible than icon-only (icon requires tooltip) |
| Badge updates when source switches | Switching service should update the badge | LOW | Reactive derived from playerState |

#### Design Note

The Player.svelte currently shows track info (title, artist, album) in the left section of the player bar.
The service badge fits naturally in that section, below the track metadata, in a muted style so it does not
compete with the track title.

Format: `via Bandcamp` or `via SoundCloud` — not an icon, a text label. Consistent with the project's
typographic aesthetic.

#### Anti-Features (Player Bar)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Service logo/icon in player bar | Brand recognition | Requires trademark permission for Spotify/Bandcamp/YouTube/SoundCloud logos. Text label avoids trademark issues. | "via {ServiceName}" text label |
| Platform-specific color theming when playing | Green player bar for Spotify, orange for SoundCloud | Distracting. Conflicts with BlackTape's OKLCH taste theming. | Neutral badge, consistent with existing player bar aesthetic |

---

### Area 8: Album Playback from Release Pages

#### Current State

The release page has `handlePlayAlbum()` and `handleQueueAlbum()` stub functions that do nothing.
The comment explains: "Stub: Play Album requires matching MusicBrainz release tracks to local library files."

**That reasoning is outdated for v1.6.** The v1.6 approach does not require local file matching.
Album playback from release pages uses streaming embeds, not local files.

#### What "Play Album" Actually Means in v1.6

There are two distinct interpretations:

**Interpretation A: Embed the album's Bandcamp/SoundCloud player on the release page**
The release page has a `links` array (`ReleaseGroup.links: ReleaseLink[]`). These include Bandcamp and
SoundCloud URLs for the specific release. Using the `url=` Bandcamp EmbeddedPlayer approach, the release
page can render a Bandcamp embed for that album directly. This plays the full album in track order.

This is the simplest implementation and aligns with BlackTape's embed-first approach. The "Play Album"
button reveals the Bandcamp embed (or preferred service embed) for this release.

**Interpretation B: Populate the queue with individual tracks from the tracklist, then resolve each via Spotify/YouTube**
The release page already shows the tracklist from MusicBrainz. Populating the queue with these tracks
requires resolving each track title to a streamable URL on the preferred service. This requires:
- For Spotify: Web API search (Development Mode limited)
- For YouTube: YouTube Data API search (quota limited)
- For SoundCloud: no API for track search
- For Bandcamp: the album embed already handles this

**Recommendation: Interpretation A for v1.6.** Embed the album player (Bandcamp `url=` embed, SoundCloud
oEmbed, or Spotify album embed) on the release page. The "Play Album" button reveals that embed.
Queue population (Interpretation B) is a v1.7+ feature requiring service API integration.

#### Table Stakes (Album Playback)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Release page shows a play button | Users see tracklist and expect to play the album | LOW | Button already rendered, stub already present |
| "Play Album" reveals the best available embed | Bandcamp first if available, then fallback chain | MEDIUM | Determine which services have a URL for this release from `release.links`, apply priority |
| Track count and total duration visible | Users want to know what they're committing to | DONE | Already shown from MusicBrainz tracklist data |

#### Differentiators (Album Playback)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Bandcamp "Play Album" with dark theme embed | The album embed on the release page uses matching bgcol/linkcol | LOW | CSS vars mapped to Bandcamp embed parameters |
| "Open on Bandcamp" button alongside embed | Some users prefer the full Bandcamp experience | DONE | Already in BuyOnBar.svelte |
| Queue All Tracks (v1.7 candidate) | Populate the internal queue with all tracks for gapless cross-service playback | HIGH | Requires track-to-service resolution. Defer. |

---

## Feature Dependencies

```
Service Priority UI (Settings)
    └──persists to──> streamingPref (already exists, needs to become an ordered array)
    └──drives──> EmbedPlayer platform ordering (already reads streamingPref)
    └──drives──> Source switcher on artist page

Bandcamp Embed [UNLOCKED by url= parameter]
    └──requires──> Bandcamp URL from PlatformLinks.bandcamp (already extracted from MusicBrainz)
    └──enables──> Album playback on release pages (use release.links Bandcamp URL)
    └──requires updating──> bandcamp.ts (currently "external link only" — add embed URL generator)
    └──requires updating──> EmbedPlayer.svelte (replace ExternalLink with embed iframe for Bandcamp)

Album Playback on Release Pages
    └──requires──> Bandcamp embed support (Interpretation A)
    └──requires──> Release page has streaming links (already in release.links)
    └──blocked on local file matching──> NO (this assumption was wrong — embed approach works directly)

Service Badge on Player Bar
    └──requires──> playerState to know which service provided the current track
    └──requires──> Queue.svelte / queue.svelte to tag each track with its source service
    └──derives from──> which embed was loaded when user played

Source Switcher on Artist Page
    └──requires──> PlatformLinks for artist (already fetched)
    └──requires──> Knowing which embed is currently active (new state)
    └──enhances──> EmbedPlayer (swap active platform)

SoundCloud Widget API controls
    └──already built in──> EmbedPlayer.svelte (hookSoundCloudWidget)
    └──extends to──> programmatic play/pause via SC.Widget()

Spotify iframe embed (already works)
    └──enhancement needed──> auto-load when priority (remove click gate for preferred service)
    └──blocked──> Web Playback SDK (Spotify policy, Widevine, 5-user cap)
```

### Dependency Notes

- **Bandcamp embed unblocked.** The `url=` parameter discovery changes the scope significantly. `bandcamp.ts`
  needs a `bandcampEmbedUrl(url: string): string` function, and EmbedPlayer.svelte needs to render an iframe
  for Bandcamp instead of ExternalLink. This is a LOW-MEDIUM complexity change, not a HIGH one.

- **Spotify scope is narrower than planned.** The February 2026 policy changes mean the "guided onboarding"
  for Spotify in v1.6 is not PKCE OAuth for the Web Playback SDK — it is UX clarity around what the Spotify
  iframe provides (full tracks if logged in, 30s if not). The connect flow is: "Log in to Spotify in the
  app, then click Play — you'll get full tracks."

- **Service priority state needs upgrade.** The existing `streamingPref.platform` is a single string.
  v1.6 needs it to be an ordered array with per-service enable/disable. This is a schema migration in
  localStorage preferences — careful not to break existing saved preferences.

- **Player bar service badge requires new state.** The player queue currently stores `PlayerTrack` objects
  with title/artist/album/url/duration. A `source?: PlatformType` field needs to be added so the player
  bar knows which service provided the track.

- **Release page album playback depends on release having streaming links.** Some releases in MusicBrainz
  have no streaming links at all (particularly older releases). The "Play Album" button should be hidden
  when no streaming links exist for the release.

---

## MVP Definition for v1.6

### Launch With (v1.6 Core — "The Playback Milestone")

Minimum viable v1.6: clicking Play on an artist actually plays something.

- [ ] **Bandcamp embed support** — Add `bandcampEmbedUrl()` using `url=` parameter. Update EmbedPlayer to
  render Bandcamp iframe. This is the highest-value single change: enables Bandcamp playback for indie/underground
  artists who are the core BlackTape audience.

- [ ] **Auto-load preferred service** — When priority service has content, load its embed without requiring
  a click. Remove click gate for the preferred platform only. Other platforms remain click-to-load.

- [ ] **Drag-to-reorder service priority** — Replace the single dropdown in Settings > Streaming with an
  ordered list. Save as array to localStorage. Persist across sessions.

- [ ] **Source switcher on artist page** — After loading one embed, show small buttons for other available
  services: "Also on: [SC] [YT]". Clicking switches the active embed.

- [ ] **Player bar service badge** — "via Bandcamp" / "via Spotify" text label in the track-info section
  of the player bar. Derived from which embed was loaded when the track started.

- [ ] **Album playback from release pages** — "Play Album" button reveals the best available streaming embed
  for that release (Bandcamp first via `url=` parameter, SoundCloud oEmbed second, Spotify embed third).
  Hide button when no streaming links exist for the release.

- [ ] **SoundCloud upgrade** — Ensure SoundCloud plays reliably as first-class service (it already has the
  most complete integration). Test Widget API play/pause control works for queue integration.

### Add After Validation (v1.6.x)

- [ ] **Spotify UX guidance** — Inline tooltip or callout on artist pages: "For full tracks, log in to Spotify
  in BlackTape." Triggered when Spotify is the active service and the user is likely seeing 30s previews.

- [ ] **YouTube auto-open fallback** — When YouTube is the preferred service but the artist only has a channel
  URL (not a video URL), add a clear "Watch on YouTube" CTA instead of an empty state.

- [ ] **Bandcamp dark theme parameters** — Fine-tune `bgcol` and `linkcol` to match current theme tokens
  dynamically (uses CSS vars — need to read them in JS to pass to the embed URL).

### Future Consideration (v1.7+)

- [ ] **Queue-level track resolution** — Populate the queue with individual tracks from a release tracklist,
  resolved to YouTube/Spotify URLs via their respective APIs. High complexity, requires API quotas.

- [ ] **Spotify extended access** — If BlackTape reaches organization status + 250K MAU, apply for Spotify
  extended API access and then add the Web Playback SDK with true PKCE OAuth onboarding.

- [ ] **SoundCloud track-level embed** — Embed specific tracks (not just artist pages) when MusicBrainz has
  individual track SoundCloud URLs.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Bandcamp embed (url= parameter) | HIGH (core audience) | LOW (new function + EmbedPlayer update) | P1 |
| Auto-load preferred service | HIGH | LOW | P1 |
| Drag-to-reorder priority in Settings | HIGH | MEDIUM | P1 |
| Album playback on release pages | HIGH | MEDIUM (depends on Bandcamp embed) | P1 |
| Source switcher on artist page | MEDIUM | LOW | P1 |
| Player bar service badge | MEDIUM | LOW | P1 |
| SoundCloud first-class QA | MEDIUM | LOW (already mostly built) | P1 |
| Spotify UX guidance ("log in for full tracks") | MEDIUM | LOW | P2 |
| YouTube open-in-browser clarity | LOW | LOW | P2 |
| Bandcamp dynamic dark theme embed params | LOW | LOW | P2 |
| Spotify Web Playback SDK | HIGH (if feasible) | HIGH + BLOCKED | Deferred (policy blocker) |
| Cross-service track resolution (queue) | HIGH | VERY HIGH | Deferred (v1.7) |

**Priority key:**
- P1: Ship in v1.6 core milestone
- P2: Ship in v1.6 if P1 is stable; otherwise v1.6.x patch
- P3: Nice to have, future milestone
- Deferred: Architectural or policy blocker, not feasible in v1.6

---

## Competitor Feature Analysis

| Feature | Parachord | BlackTape v1.5 | BlackTape v1.6 Target |
|---------|-----------|----------------|----------------------|
| Service priority ordering | Drag-to-reorder resolver order | Single-service dropdown | Drag-to-reorder ordered array |
| Service resolution method | Plugin resolver chain, tries each until match | MusicBrainz URLs only | MusicBrainz URLs only (same) |
| Source indicator | Small resolver badge on track | None | "via {Service}" in player bar |
| Auth flow | Per-service OAuth (complex, multi-step) | No auth for playback | No auth for Spotify embed (login is in-app Spotify session) |
| Album playback | Full album queue via resolver | Stubs only | Embed the album's streaming player |
| Spotify | Full Web Playback SDK | Embed iframe only | Embed iframe only (policy-constrained) |
| SoundCloud | Resolver plugin | oEmbed + Widget API hooks | Same + first-class priority |
| Bandcamp | No (complex embed — needed album IDs) | External link only | Full embed via url= parameter |
| YouTube | Channel resolver | Click-to-load iframe | Same + auto-load when preferred |

**BlackTape's advantage over Parachord in this domain:**
- Discovery-first architecture means service resolution is secondary, not primary
- No OAuth friction for users (no app registration, no redirect URI confusion)
- Bandcamp embed now achievable without ID extraction (url= parameter)
- Values alignment: Bandcamp first is not just UX preference, it's a philosophical statement

---

## Sources

- [Spotify Developer Policy — February 2026 Update](https://developer.spotify.com/blog/2026-02-06-update-on-developer-access-and-platform-security) — 5-user Development Mode cap, Premium requirement, organization-only applications. Confidence: HIGH.
- [TechCrunch — Spotify API Changes February 2026](https://techcrunch.com/2026/02/06/spotify-changes-developer-mode-api-to-require-premium-accounts-limits-test-users/) — Confirms 5-user limit and Premium requirement. Confidence: HIGH.
- [Spotify Web Playback SDK — Getting Started](https://developer.spotify.com/documentation/web-playback-sdk/tutorials/getting-started) — Requires Spotify Premium account. Requires `encrypted-media` allow attribute. Confidence: HIGH.
- [Spotify Embed Documentation](https://developer.spotify.com/documentation/embeds) — iframe embed, no auth required for rendering; full tracks for Premium users logged in; 30s previews for free/logged-out users. Confidence: HIGH.
- [Spotify Community — 30s Preview Behavior](https://community.spotify.com/t5/Spotify-for-Developers/30-second-preview-showing-when-try-to-embed-playlist/td-p/5655204) — Confirmed: embed plays full tracks when user is logged in with Premium in the same browser. Confidence: HIGH.
- [Spotify Web Playback SDK + Electron Issue #7](https://github.com/spotify/web-playback-sdk/issues/7) — SDK requires Widevine CDM. Electron (and by extension Tauri/WebView2) requires specific setup. Confidence: MEDIUM.
- [Bandcamp — EmbeddedPlayer url= parameter](https://github.com/bluesky-social/social-app/pull/6761) — Confirmed Bandcamp added `url=` parameter to EmbeddedPlayer, enabling embeds from URL-encoded Bandcamp page URLs without needing album/track IDs. Confidence: HIGH.
- [Bandcamp Help — Creating Embedded Players](https://get.bandcamp.help/hc/en-us/articles/23020711574423) — Official documentation for embed parameters (size, bgcol, linkcol, minimal, transparent). Confidence: HIGH.
- [SoundCloud Widget API](https://developers.soundcloud.com/docs/api/html5-widget) — SC.Widget() provides play, pause, seekTo, getPosition, and event binding. Confidence: HIGH.
- [SoundCloud oEmbed API](https://developers.soundcloud.com/docs/oembed) — oEmbed endpoint returns embed HTML for artist pages and tracks. Confidence: HIGH.
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) — No auth required for embeds. Programmatic control via IFrame API JS. Confidence: HIGH.
- [Spotify Redirect URI Policy — localhost deprecated](https://developer.spotify.com/blog/2025-02-12-increasing-the-security-requirements-for-integrating-with-spotify) — As of November 2025, `localhost` aliases removed. Loopback `127.0.0.1` still works. Confidence: HIGH.
- [Spotify Extended Access Criteria Update](https://developer.spotify.com/blog/2025-04-15-updating-the-criteria-for-web-api-extended-access) — 250K MAU + registered organization required for extended access as of May 2025. Confidence: HIGH.
- Existing codebase analysis: `src/lib/embeds/`, `src/lib/components/EmbedPlayer.svelte`, `src/routes/settings/+page.svelte`, `src/lib/theme/preferences.svelte`. Confidence: HIGH (direct code inspection).

---
*Feature research for: BlackTape v1.6 — Multi-source streaming playback*
*Researched: 2026-02-26*
