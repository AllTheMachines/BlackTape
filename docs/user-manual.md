# BlackTape User Manual

BlackTape is a music discovery engine that indexes all music from open databases and lets you discover through tags, genres, and connections between artists. The desktop app adds a local music player — scan your own files and discover how they connect to the wider world of music.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Searching for Music](#searching-for-music)
3. [Artist Pages](#artist-pages)
4. [Discover Page](#discover-page)
5. [Style Map](#style-map)
6. [Knowledge Base](#knowledge-base)
7. [Local Music Library](#local-music-library)
8. [Music Player](#music-player)
9. [Discovery Features](#discovery-features)
10. [Crate Digging Mode](#crate-digging-mode)
11. [AI Features](#ai-features)
12. [Desktop Workspace](#desktop-workspace)
    - [ControlBar](#controlbar)
    - [Layout Templates](#layout-templates)
    - [Theme Modes](#theme-modes)
    - [Streaming Preference](#streaming-preference)
13. [Community Foundation](#community-foundation)
    - [Your Profile](#your-profile)
    - [Shelves (Collections)](#shelves-collections)
    - [Import Listening History](#import-listening-history)
    - [Export Your Data](#export-your-data)
14. [Communication](#communication)
15. [Scenes](#scenes)
    - [Browsing Scenes](#browsing-scenes)
    - [Scene Pages](#scene-pages)
    - [Following a Scene](#following-a-scene)
    - [Suggesting an Artist](#suggesting-an-artist)
    - [Requesting Creation Tools](#requesting-creation-tools)
    - [How Detection Works](#how-detection-works)
16. [Curator Tools](#curator-tools)
    - [Embedding Artist Cards](#embedding-artist-cards)
    - [Collection Embeds](#collection-embeds)
    - [RSS Feeds](#rss-feeds)
    - [New & Rising](#new--rising)
    - [Curator Attribution](#curator-attribution)
17. [Desktop-Only App](#desktop-only-app)
18. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Desktop App (Recommended)

The desktop app is the full BlackTape experience — search, discover, and play local music.

1. Download and install BlackTape from the releases page
2. On first launch, the **Setup Wizard** guides you through getting everything ready
3. Follow the wizard steps to download and place the discovery database
4. AI models are optional — the app works fully without them
5. Once setup completes, BlackTape is ready to use

### Setup Wizard

The setup wizard runs automatically on first launch. It has four steps:

1. **Welcome** — Overview of what's needed
2. **Database** — Download `mercury.db.gz` from the releases page, decompress it, and place it at the path shown in the wizard. Click "Check Again" once placed.
3. **AI Models** — Optional. Download the generation model (~4 GB) and embedding model (~100 MB) for AI biography generation and music similarity. Click "Skip for now" to proceed without them.
4. **Done** — Launch the app

**Re-running the wizard:** Go to Settings → About → "Reset setup". This re-launches the wizard without deleting any of your data.

### API Keys and Security

API keys (for remote AI providers) and Spotify OAuth tokens are stored in the OS credential store — Windows Credential Manager on Windows. They are never written to plain text files. You can revoke access at any time from Settings → AI Settings or Settings → Streaming.

---

## Searching for Music

### Artist Search

Type an artist name in the search bar and press Enter. BlackTape searches across 2.8 million artists from MusicBrainz.

- Search is fuzzy — partial names and misspellings will still return results
- Exact name matches appear first, followed by relevance-ranked results
- Results show the artist name, country flag, and top tags

### Tag Search

Switch to "Tags" mode using the toggle above the search bar. Type a genre or style tag (e.g., `shoegaze`, `post-punk`, `ambient`) to find artists tagged with that term.

- Tags come from the MusicBrainz community — they're crowd-sourced and specific
- Results are ordered by how strongly the community associated the tag with each artist
- Click any tag on a search result to search for more artists with that tag

### Tips

- Use specific tags for better results: `dream pop` is more useful than `rock`
- Tags are case-insensitive: `Post-Punk` and `post-punk` return the same results
- If you can't find an artist, try a shorter version of their name

---

## Artist Pages

Click any artist from search results to see their full page.

### What You'll See

**Header** — Artist name, country, active years, and type (person, group, etc.). A small uniqueness badge appears next to the artist name for artists with tags — see [Uniqueness Badge](#uniqueness-badge) below.

**Tags** — Clickable genre/style tags. Click any tag to discover more artists with the same tag.

**Bio** — A brief summary pulled from Wikipedia (when available).

**Discography** — Albums, EPs, and singles with cover art, organized by release type. Each release shows:
- Cover artwork from the Cover Art Archive
- Release year
- Links to listen on available platforms (Bandcamp, Spotify, SoundCloud, YouTube)

**Embedded Player** — An auto-playing embed from the first available platform (priority: Bandcamp > Spotify > SoundCloud > YouTube). This plays directly from the artist's own presence on that platform.

**External Links** — Organized by category:
- **Official** — Artist's own website
- **Streaming** — Bandcamp, Spotify, Apple Music, Tidal, etc.
- **Social** — Twitter, Instagram, Facebook, Mastodon
- **Info** — Wikipedia, Discogs, RateYourMusic, AllMusic
- **Support** — Patreon, Ko-fi, crowdfunding pages

### Uniqueness Badge

Next to the artist name, a small badge shows how niche the artist is relative to the full BlackTape catalog. The badge maps the artist's uniqueness score to four tiers:

| Badge | Meaning |
|-------|---------|
| **Very Niche** | Extremely rare tag combination — ultra-niche artist |
| **Niche** | Uncommon genre profile — not on the well-worn path |
| **Eclectic** | Broad or mixed genre profile |
| **Mainstream** | Widely tagged genres — commonly known styles |

The badge is absent for artists with no tags. This is the core BlackTape thesis made visible: the more niche you are, the more discoverable you become through the tag intersection system.

### Important

All music plays from where it already lives — Bandcamp, Spotify, SoundCloud, YouTube. BlackTape never hosts audio. The artist keeps control of their music.

---

## Discover Page

The Discover page (`/discover`) is BlackTape's primary browsing interface. Instead of searching for a known artist by name, you browse by intersecting tags to find artists you didn't know existed.

### Browsing by Tag

1. Visit `/discover` or click **Discover** in the navigation
2. A cloud of popular tags appears — genres, styles, scenes, moods
3. Click any tag to filter artists by that tag
4. Click a second tag to narrow down to artists with BOTH tags (AND logic)
5. Keep adding tags (up to 5) to find increasingly specific combinations

The URL updates with each click (`?tags=shoegaze,post-rock`) — this makes your discovery shareable and bookmarkable.

### Niche-First Ordering

When you've selected tags, results are ordered niche-first: artists with fewer total tags appear first. The fewer tags an artist has, the more specific and unusual they are. This is the core of BlackTape's discovery philosophy — uniqueness is rewarded.

### No Tags Selected

When the Discover page loads with no tags selected, it shows BlackTape's top 50 discovery-ranked artists. The discovery score rewards:
- Rare tags (tags that appear on fewer artists)
- Artists with fewer tags overall (more niche)
- Active artists (not disbanded)
- Artists who started after 2010 (discovering newer music)

### Removing Tags

Active tags appear in a "Filtering by:" row above the cloud. Click any active tag (or the × next to it) to remove it from the filter.

### Tag Limit

You can select up to 5 tags at a time. At 5 tags, all remaining inactive tags are grayed out. Remove an active tag to free a slot.

### Desktop Only

The Discover page is part of the BlackTape desktop app (data from your local mercury.db).

---

## Style Map

The Style Map (`/style-map`) is a visual overview of how music genres relate to each other. It is available in the desktop app.

### What You See

- **Nodes** — Each circle represents a music tag (genre or style). The bigger the circle, the more artists use that tag.
- **Edges** — Lines between nodes show tags that frequently appear together on the same artists. Thicker lines mean stronger co-occurrence.
- **Layout** — Tags that cluster together in real musical practice end up close together in the graph. Shoegaze and dream pop will be near each other; heavy metal and jazz will be farther apart.

### How to Use It

- **Hover** a node to highlight it and see the tag name clearly.
- **Click** any node to navigate to `/discover?tags=<tag>` — you'll see all artists with that tag, ordered niche-first.

### Technical Note

The graph layout is computed once on page load using D3's force simulation (500 iterations, run synchronously). The result is a static snapshot — no animation loop, no continuous layout updates.

---

## Knowledge Base

### Genre Map

The Knowledge Base is BlackTape's music encyclopedia — a living map of genres, scenes, and musical movements. Find it under **Knowledge Base** in the navigation.

The genre graph starts centered on your taste. Click any genre to open its page. Genres (global), scenes (geographic/temporal), and cities are visually distinct. The graph expands as you navigate — always a neighborhood, never an overwhelming hairball.

### Genre Pages

Each genre or scene page shows:
- A description pulled from Wikipedia when available
- An AI-generated vibe summary (desktop app, when AI is enabled)
- Key artists linked to their BlackTape profiles
- Related genres and scenes
- For scenes with a city origin: a map pinning the location

Pages with limited data show a contribution invitation — community editing comes in a future phase.

### Time Machine

The **Time Machine** lets you browse BlackTape's catalog by year. Navigate decades (60s–20s) with the decade buttons, then fine-tune within the decade using the year slider. Add a genre tag filter to narrow the results.

Opening state: approximately 30 years in the past — a natural starting point for musical nostalgia. Adjust freely.

### Liner Notes

On any release page, expand **Liner Notes** at the bottom to see:
- Full artist credits
- Record label and catalog number
- Per-track recording credits (when available)

Liner Notes are fetched from MusicBrainz on demand — expanding is instant when MusicBrainz responds quickly. Credits may show a brief loading state.

---

## Local Music Library

*Desktop app only.*

BlackTape can scan your local music folders, read metadata from your files, and build a browsable library.

### Adding Music Folders

1. Click **Library** in the top navigation bar
2. Click **Add Folder**
3. Select a folder containing music files in the OS file picker
4. BlackTape scans the folder recursively, reading metadata from all supported audio files

### Supported Audio Formats

| Format | Extensions |
|--------|-----------|
| MP3 | `.mp3` |
| FLAC | `.flac` |
| Ogg Vorbis | `.ogg` |
| AAC / ALAC | `.m4a`, `.aac` |
| WAV | `.wav` |
| Opus | `.opus` |
| WavPack | `.wv` |

### Scan Progress

While scanning, a progress bar shows:
- Number of files scanned vs total found
- Current file being processed

Scanning reads metadata (title, artist, album, track number, year, genre, duration) from each file's tags (ID3, Vorbis Comment, MP4 atoms, etc.).

### Browsing Your Library

After scanning, your library is displayed as an album grid:

- Albums are grouped by album artist + album name
- Each album shows its tracks with track numbers and durations
- Click any track to start playing

### Sorting

Use the sort controls to organize your library:
- **Artist** — Alphabetical by album artist
- **Album** — Alphabetical by album name
- **Title** — Alphabetical by track title
- **Date Added** — Most recently scanned first

### Managing Folders

- **Add Folder** — Register a new music directory
- **Remove** — Unregister a folder (does not delete any files)
- **Rescan** — Re-scan a folder to pick up new or changed files

---

## Music Player

*Desktop app only.*

### Player Bar

When you play a track, a persistent player bar appears at the bottom of the screen. It stays visible and keeps playing as you navigate between pages.

**Track Info** (left) — Currently playing track title, artist, and album.

**Transport Controls** (center):
- Skip previous (or restart current track if more than 3 seconds in)
- Play / Pause
- Skip next
- Shuffle toggle
- Repeat toggle (cycles: off → repeat all → repeat one)

**Seek Bar** (center, below controls) — Drag to scrub through the track. Shows current time and total duration.

**Volume** (right) — Volume slider and mute toggle.

**Discover** (right) — Opens the discovery panel (see [Discovery Features](#discovery-features)).

**Queue** (right) — Opens the queue sidebar.

### Queue

Click the queue icon (list icon, far right of the player bar) to open the queue sidebar:

- Shows all upcoming tracks
- The currently playing track is highlighted
- Click any track to jump to it
- Remove individual tracks with the X button
- Clear the entire queue

### Playback Behavior

- Audio continues playing when you navigate between pages (search, artist, library)
- Closing the queue or discovery panel does not stop playback
- When a track ends, the next track in the queue plays automatically
- With "repeat one" enabled, the current track loops
- With "repeat all" enabled, the queue loops back to the beginning

---

## Discovery Features

*Desktop app only.*

BlackTape bridges your local music with its 2.8-million-artist discovery index.

### Now-Playing Discovery

While a track is playing, click the **Discover** button in the player bar to expand the discovery panel.

BlackTape matches the playing track's artist name against the discovery index:

- **Matched Artist** — If found, shows the artist name (linked to their artist page), country, and tags
- **Related Artists** — Up to 5 artists who share the same primary tag
- **Not Found** — Shows "Not found in BlackTape index" if the artist isn't in the database (this is normal for very obscure artists)

Click the matched artist name to navigate to their full artist page — your audio keeps playing.

### Unified Search

When you search in the desktop app, results come from two sources:

1. **Your Library** — Local tracks matching the search query (artist, title, or album). Click to play.
2. **Discovery** — Artists from the 2.8M-artist index, same as the web version.

If matches exist in both sources, "Your Library" appears above "Discovery" with a divider between them. If you have more than 10 local matches, a "See all in Library" link takes you to the full library view.

### How Matching Works

BlackTape normalizes artist names from your file metadata before searching:
- Strips leading "The" (e.g., "The Beatles" matches "Beatles")
- Splits on featuring credits (e.g., "Artist feat. Other" matches "Artist")
- Removes trailing qualifiers like "(Remastered)" or "[Deluxe Edition]"

Matching is best-effort and never blocks playback. If a match can't be found, the discovery panel simply shows "Not found."

---

## Crate Digging Mode

*Desktop app only.*

Crate Digging (`/crate`) is BlackTape's serendipity mechanism. Hit a button and get 20 random artists from the database. Each click is a fresh random draw — no repeat order, no algorithm, no curation. Just wandering.

### Filters

You can narrow the random draw before digging:

- **Tag** — Enter a genre (e.g., `psychedelic`) to only dig within that style
- **Decade** — Select a decade range to filter by when the artist was formed
- **Country** — Enter an ISO country code (e.g., `JP`, `DE`) to dig regionally

Leave all filters empty to dig across the entire 2.8-million-artist catalog.

### How to Use It

1. Set any filters you want (or leave them blank)
2. Click **Dig** — 20 random matching artists appear
3. Click any artist name to go to their artist page
4. Click **Dig** again for a fresh random batch

Crate digging state is ephemeral — the URL doesn't change when you dig. This is intentional: wandering isn't meant to be bookmarked. Use the Discover page for shareable filtered results.

---

## AI Features

*Desktop app only. All AI processing runs locally on your machine.*

BlackTape includes an optional AI system that adds natural language exploration, personalized recommendations, and taste profiling. It is disabled by default — you choose whether to enable it.

### Enabling AI

1. Navigate to **Settings** (via the header navigation)
2. Find the **AI Features** toggle — it is OFF by default
3. Toggle it ON — you'll be prompted to download the AI models (~2.1GB total)
4. Click **Download Models** — a progress bar shows download status for each model
5. After download completes, the AI engine starts automatically
6. The AI status indicator in the header shows when the system is ready

Models are stored locally. You only need to download them once.

### Explore

The Explore page (`/explore` in the header navigation) lets you search for music using natural language instead of exact artist names or tags.

Type a query describing what you're looking for:
- "find me something like Boards of Canada but darker"
- "upbeat jazz fusion from the 70s"
- "ambient music for late night coding"
- "female-fronted shoegaze bands"

BlackTape generates a curated list of artist recommendations with brief descriptions of why each fits your query. Click any matched artist name to navigate to their artist page.

**Refinement:** After getting results, you can refine your query with follow-up messages (up to 5 exchanges). For example, after getting results for "ambient music," type "more electronic" or "less minimal" to narrow the results.

If you have a taste profile (see below), your preferences appear as a subtle hint — the AI is aware of your tastes but you can explore freely beyond them.

### Recommendations

On artist pages, a **"You might also like"** section appears with personalized recommendations based on the artist you're viewing and your taste profile.

Recommendations only appear after you've saved enough favorites to build a meaningful taste profile:
- At least **5 favorite artists**, OR
- At least **20 tracks** in your local library

This prevents unhelpful cold-start guessing. The more favorites you save, the better recommendations become.

### Favorites

On every artist page, a **heart button** appears in the header area:
- Click to **save** the artist as a favorite (heart fills)
- Click again to **remove** from favorites (heart empties)

Favorites feed directly into your taste profile. They are weighted more heavily than library tracks — favoriting an artist is a strong signal of your preferences.

### AI Artist Summaries

When an artist's Wikipedia bio is unavailable, BlackTape generates a brief AI summary instead. Wikipedia bios always take priority when available — the AI summary is a fallback for lesser-known artists who don't have Wikipedia entries.

### Taste Profile

Your taste profile is built automatically from your favorites and local library. View and edit it in **Settings > Taste Profile** (visible when AI is enabled).

**Tag Weights:** Each tag shows a weight slider from -1.0 (strong dislike) to 1.0 (strong affinity). Tags are computed from your favorites and library, with source badges showing where each tag came from:
- **library** — Derived from your local music files
- **favorite** — Derived from artists you've favorited
- **manual** — Tags you've added or adjusted yourself

Adjusting a tag weight changes its source to "manual" — your overrides are preserved even when the profile is recomputed from new favorites or library changes.

**Artist Anchors:** Pin specific artists as taste anchors to strengthen their influence on your profile. Search and add artists from the discovery index.

**Adding/Removing Tags:** Add new tags manually or remove tags you don't want in your profile.

### Remote API

If you prefer not to run models locally (or want to use a more powerful model), you can configure a remote API endpoint:

1. Go to **Settings > AI Features**
2. Switch the provider to **Remote**
3. Enter your API endpoint URL (must be OpenAI-compatible)
4. Optionally enter an API key

This sends your queries to the remote endpoint instead of the local llama-server. Note that when using a remote API, your queries are sent over the internet to the configured endpoint.

### Privacy

When using the default local AI:
- All models run on your machine
- No data is sent to any external server
- Your taste profile, favorites, and queries stay entirely local
- The only network traffic is the initial model download from HuggingFace

When using a remote API provider, your queries are sent to whichever endpoint you configure. BlackTape does not add any tracking or telemetry regardless of provider choice.

---

## Desktop Workspace

*Desktop app only.*

The BlackTape desktop app has a configurable workspace with resizable panels, a personalized color theme, and a streaming platform preference. All of these are set from the **Settings** page.

### ControlBar

The ControlBar is the thin toolbar that appears below the site header in the desktop app. It provides workspace-level controls that are separate from the navigation.

**Left side:** A search box — same as the header search, just more convenient when you're deep in a panel.

**Right side:**
- **Layout switcher** — A dropdown to switch between layout templates. Built-in templates appear first; your saved layouts appear under "My Layouts."
- **Theme dot** — A small colored circle showing your current theme hue. Click it to open Settings.

### Layout Templates

BlackTape's desktop workspace supports three built-in layouts and unlimited user-created layouts.

**Built-in layouts:**

| Template | Panels | Best for |
|----------|--------|----------|
| **Cockpit** | Left sidebar + Main + Right sidebar | Power users — maximum context at once |
| **Focus** | Main + Right sidebar | Browsing with context panel |
| **Minimal** | Main only | Clean, distraction-free |

**Switching layouts:**

- Use the layout switcher dropdown in the ControlBar (top right of workspace)
- Or go to **Settings > Layout** and click any template

Panel sizes are remembered independently per template — resize them once and BlackTape remembers your preference for each layout.

**Left sidebar (Cockpit and Focus modes):**
- Quick navigation links (Discover, Style Map, Dig, Library, Explore, Settings)
- Discovery filters: tag input, decade selector, niche score — results appear inside the sidebar without affecting the main content

**Right sidebar (Cockpit mode):**
- On artist pages: related tags and queue panel
- On genre pages: subgenres, related scenes, and key artists
- Elsewhere: now-playing info, queue, and your top taste tags

**Saving a custom layout:**

1. Switch to the layout that feels closest to what you want
2. Resize the panels to your liking
3. Go to **Settings > Layout**
4. Type a name in the "Name this layout..." field and click **Save layout**

Your custom layout appears in the ControlBar dropdown under "My Layouts" and in the Settings layout picker. Use it, resize it further, and BlackTape remembers the new panel sizes independently.

**Deleting a custom layout:**

In **Settings > Layout > My Layouts**, click the **×** next to any custom layout. If that layout was active, BlackTape falls back to Cockpit. Built-in templates cannot be deleted.

### Theme Modes

BlackTape's desktop app can color itself based on your music taste — or you can pick your own color.

Go to **Settings > Appearance** to choose a theme mode:

**Default** — Classic dark theme. The static OKLCH colors from BlackTape's base theme apply. No personalization.

**Taste** — Colors derived from your music taste. BlackTape takes your top taste tags, hashes them to a hue angle, and generates a full color palette in OKLCH space. The same taste always produces the same color — it's deterministic. Switch artists or add favorites and the theme shifts to match.

This option requires a taste profile (needs 5+ favorites OR 20+ library tracks). If you don't have enough data yet, it shows "(need more data)" — add favorites to unlock it.

**Custom** — Pick your own hue. A slider appears (0–360 degrees) that lets you choose any hue in the OKLCH color wheel. The preview circle shows the current selection. Changes apply live.

All theme settings persist across app restarts.

**Technical note:** Only background, border, link, and accent colors shift with the hue. Text colors stay at fixed lightness values — WCAG AA contrast is maintained regardless of which hue you choose.

### Streaming Preference

BlackTape embeds music from Bandcamp, Spotify, SoundCloud, and YouTube. By default, Bandcamp is shown first (most direct artist support). If you prefer a different platform, go to **Settings > Streaming Preference** and choose it from the dropdown.

Your preference affects two places:

1. **Embedded player on artist pages** — Your preferred platform's embed appears first, so you don't have to scroll past platforms you don't use.
2. **"Listen on" links** — The links bar under the embedded player shows your preferred platform first.

Setting "No preference" restores the default order (Bandcamp → Spotify → SoundCloud → YouTube). Server data is always platform-neutral — only the display order changes, client-side only.

---

## Community Foundation

*Desktop app only.*

### Your Profile

Your profile is your musical identity inside BlackTape. It's optional and local — no account, no sign-up, no central server.

**Access:** Desktop app → Profile (in the top navigation)

**Handle:** A name you choose for yourself. No uniqueness enforcement — BlackTape is local-first. Your handle appears on your profile page only.

**Avatar:** Automatically generated from your taste profile (the same tags that color your theme). To customize: Settings → Identity → Edit Avatar. Draw pixel art on a 16×16 grid. Switch back to "Generative" any time.

**Taste Fingerprint:** A constellation visualization of your musical taste — your top tags and favorite artists arranged like a star map of your music brain. Updates automatically as your taste evolves. Export it as a PNG to share.

### Shelves (Collections)

Shelves are named collections of artists and releases — like a real record shelf, not a playlist.

**Create a shelf:** Profile page → "+ New Shelf" or Settings → Collections

**Save to a shelf:** On any artist or release page, click "Save to Shelf" and select a shelf (or create one inline). The button shows "✓ Saved" once an item is on any shelf.

**View a shelf:** Profile page → click a shelf name to expand it. Remove items with the × button.

**Ideas for shelf names:** "Favorites", "Want to explore", "Rainy day", "Stuff from [a friend]", "2024 finds"

### Import Listening History

Bring your existing listening history into BlackTape from other services.

**Access:** Settings → Import Listening History

**Spotify:** Requires a Spotify Client ID (register a free app at developer.spotify.com). BlackTape imports your top 50 artists from the past 6 months. Your Client ID is never stored.

**Last.fm:** Requires your Last.fm username and an API key (create one free at last.fm/api). BlackTape imports your full scrobble history (up to 10,000 tracks). Aggregated by artist play count.

**Apple Music:** Requires an Apple Developer Token (MusicKit key from the Apple Developer portal — requires $99/year Apple Developer membership). Imports your saved library artists. This is an advanced option.

**CSV:** Upload any CSV file with an "Artist" column. Works with Last.fm export CSVs and generic artist lists.

After import, matched artists are added to a new shelf named "Imported from [Platform]".

### Export Your Data

**Access:** Settings → Your Data → Export All Data

BlackTape exports everything: your handle, avatar, all shelves and their contents, your taste profile, and your listening history. Saved as a single JSON file.

Your data is yours. BlackTape will never hold it hostage.

---

## Communication

Real-time communication features (Nostr DMs, scene rooms, listening parties) are planned for a future version of BlackTape. They are not currently available in the app.

---

## Scenes

Scenes are music micro-communities that BlackTape discovers automatically from your listening and collection data. A scene forms when the same niche artists keep appearing together — both in tag data and in what people actually collect.

### Browsing Scenes

Go to **Scenes** in the navigation to see all detected scenes, divided into two sections:
- **Active Scenes** — established micro-communities with multiple connected listeners
- **Emerging** — novel tag combinations appearing for the first time, possibly before anyone else has noticed them

Scenes are displayed in random order within each section — popular scenes don't automatically dominate.

### Scene Pages

Each scene page shows:
- The artists BlackTape detected as part of the scene
- How many of your favorites are in this scene
- The tags that define the scene
- A one-sentence AI-generated description (Tauri desktop, when AI is enabled)

### Following a Scene

Click **Follow Scene** on any scene detail page to follow it. Following a scene:
- Saves your follow to your local taste profile
- Publishes the follow to the Nostr network (if connected) so it's part of your public taste signal

### Suggesting an Artist

If you know an artist who belongs in a scene but BlackTape hasn't detected them, use the **Suggest an artist** box at the bottom of any scene page. Suggestions are queued and feed into the next detection run.

### Requesting Creation Tools

If you'd like features like collaborative playlists or shared collections, use the **Request** button at the bottom of the Scenes page. This helps prioritise what gets built next.

### How Detection Works

BlackTape uses your favorites and the tag co-occurrence map to detect scenes automatically each time you open the app. No configuration needed — scenes emerge as your collection grows.

---

## Curator Tools

BlackTape gives music bloggers and curators tools to share discoveries and get credit for them.

### Embedding Artist Cards

Every artist page has an **Embed** button. Click it to get:
- **iframe snippet** — paste directly into any HTML editor or CMS
- **Script-tag snippet** — for blogs where iframes are restricted

Both snippets automatically adapt to your blog's dark or light mode.

To get attribution credit when you embed an artist, enter your blog handle in the "Your handle" field before copying the script-tag snippet. When readers load your page, BlackTape records you as a curator for that artist.

**QR Code**: Click "QR Code" to generate a QR code for the embed URL — useful for print materials or event flyers.

### Collection Embeds

Collection embeds (`/embed/collection/[id]`) are available in the desktop app when sharing a public collection.

### RSS Feeds

Subscribe to any artist, tag, or curator in your RSS reader:

| What | RSS URL |
|------|---------|
| Artist updates | `/api/rss/artist/[slug]` |
| Tag discovery | `/api/rss/tag/[tag-name]` |
| Curator's picks | `/api/rss/curator/[handle]` |
| New & Rising | `/api/rss/new-rising` |

Append `?format=atom` to any feed URL for Atom format. Most feed readers accept both — try the default RSS first.

Look for the RSS icon (orange signal arcs) on artist pages, the Discover page, and the New & Rising page.

### New & Rising

The **New & Rising** page (link in the navigation) surfaces artists that BlackTape doesn't see discussed elsewhere yet:

- **Newly Active** — artists with recent activity dates
- **Gaining Traction** — niche artists accumulating unusual tag combinations (the most interesting view for finding artists worth writing about)

Use New & Rising as your weekly "what should I write about next" list. Subscribe to the RSS feed to get updates in your feed reader.

### Curator Attribution

When you embed an artist on your site (using the script-tag snippet with your handle), BlackTape records you as a curator for that artist. Your handle then appears on the artist's BlackTape page as "Discovered by @[yourhandle]".

All curators who have featured an artist are credited — not just the first. Embedding the same artist on multiple posts still only records once per curator.

Click your handle on any artist page to see all artists you've featured on BlackTape (`/new-rising?curator=[yourhandle]`).

---

## Desktop-Only App

BlackTape is a desktop-only application — there is no web version. All features listed in this manual are part of the desktop app.

| Feature | Desktop |
|---------|---------|
| Artist search | Yes |
| Tag search | Yes |
| Artist pages | Yes |
| Embedded players (Bandcamp, etc.) | Yes |
| Discover page (tag intersection browsing) | Yes |
| Style Map (genre graph visualization) | Yes |
| Knowledge Base (genre encyclopedia) | Yes |
| Time Machine (browse by year) | Yes |
| Liner Notes (release credits) | Yes |
| Local music library | Yes |
| Audio playback of local files | Yes |
| Player bar + queue | Yes |
| Now-playing discovery | Yes |
| Unified search (local + discovery) | Yes |
| Crate Digging Mode | Yes |
| AI features (explore, recommendations, taste) | Yes |
| AI genre summaries in Knowledge Base | Yes |
| Offline search | Yes |
| Panel workspace (Cockpit, Focus, Minimal layouts) | Yes |
| Custom theme (taste-based or manual hue) | Yes |
| Streaming platform preference | Yes |
| Profile (handle, avatar, Taste Fingerprint) | Yes |
| Shelves (save artists and releases) | Yes |
| Import listening history (Spotify, Last.fm, Apple, CSV) | Yes |
| Export all user data | Yes |
| Scenes directory (browse proto-scenes) | Yes |
| Scenes — follow, suggest, AI detection | Yes |
| New & Rising page | Yes |
| Embed artist cards (copy snippet) | Yes |
| RSS feeds (artist, tag, curator, new & rising) | Yes |
| Curator attribution tracking | Yes |
| Requires internet for artist pages | Yes* |

*Artist pages fetch releases and links from MusicBrainz, which requires internet. Search works offline using the local database.

---

## Troubleshooting

### "Database not found" on first launch

BlackTape needs a discovery database file to search. On first launch:
1. Follow the on-screen instructions to download the database
2. Place the file at the indicated path
3. Click "Retry" to check again

### Search returns no results

- Ensure the discovery database is loaded (check the home page for any setup prompts)
- Try a simpler or shorter search query
- For tag search, use common genre names (e.g., `electronic`, `jazz`, `metal`)

### No sound when playing local files

- Check that your system volume is up and not muted
- Check the volume slider in BlackTape's player bar (right side)
- Ensure the audio file isn't corrupted — try playing it in another application
- Supported formats: MP3, FLAC, OGG, M4A, AAC, WAV, Opus, WavPack

### Library scan shows 0 tracks

- Ensure the folder contains supported audio file formats
- BlackTape reads metadata from file tags — untagged files will show as "Unknown Title" / "Unknown Artist" but should still appear
- Try removing and re-adding the folder

### Player bar disappears

The player bar only appears when a track is playing or loaded.

### Artist page shows "No releases found"

Release data comes from MusicBrainz. Some artists may not have releases listed there. BlackTape does not store release data locally — it's fetched live, so internet connectivity is required.

### Embedded player doesn't load

Embeds require internet access. If an embed doesn't load:
- Check your internet connection
- The artist may have removed their page on that platform
- Try reloading the page

### App is slow after scanning many files

The library browser loads all tracks into memory. For very large libraries (50,000+ tracks), sorting and grouping may take a moment. Future updates will add pagination and lazy loading.

### AI features not appearing

- Go to **Settings** and verify the AI Features toggle is ON
- Check that both models have been downloaded (progress should show 100% for each)
- Wait for the AI status indicator to show "ready" — model loading takes a few seconds after download

### No recommendations on artist pages

Recommendations require a minimum taste profile:
- Save at least **5 artists** as favorites using the heart button, OR
- Have at least **20 tracks** in your local music library

Until this threshold is met, the "You might also like" section will not appear.

### Explore page returns nothing

- Verify AI is enabled and ready in Settings
- Try a different or simpler query
- If the AI just started, it may need a moment to warm up — try again after a few seconds

### Model download failed

- Check your internet connection
- Go to **Settings** and retry the download
- The download uses temporary files — a failed download will not leave corrupted model files
- Models are downloaded from HuggingFace; ensure the domain is not blocked by your network

### AI responses are slow

Local model processing time depends on your hardware. The generation model (Qwen2.5 3B) runs best on machines with at least 8GB of RAM. If performance is unacceptable, consider configuring a remote API provider in Settings instead of using local models.

---

*BlackTape v0.1.0 — Last updated: 2026-03-01*
