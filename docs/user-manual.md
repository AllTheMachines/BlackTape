# Mercury User Manual

Mercury is a music discovery engine that indexes all music from open databases and lets you discover through tags, genres, and connections between artists. The desktop app adds a local music player — scan your own files and discover how they connect to the wider world of music.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Searching for Music](#searching-for-music)
3. [Artist Pages](#artist-pages)
4. [Local Music Library](#local-music-library)
5. [Music Player](#music-player)
6. [Discovery Features](#discovery-features)
7. [Web vs Desktop](#web-vs-desktop)
8. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Desktop App (Recommended)

The desktop app is the full Mercury experience — search, discover, and play local music.

1. Download and install Mercury from the releases page
2. On first launch, you'll be prompted to set up the discovery database
3. Download the database file (~200MB compressed, ~800MB uncompressed) and place it in the indicated directory
4. Once the database is loaded, Mercury is ready to use

### Web Version

The web version at [mercury website] provides search and artist pages without requiring installation. It does not include the local music player or library features.

---

## Searching for Music

### Artist Search

Type an artist name in the search bar and press Enter. Mercury searches across 2.8 million artists from MusicBrainz.

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

**Header** — Artist name, country, active years, and type (person, group, etc.)

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

### Important

All music plays from where it already lives — Bandcamp, Spotify, SoundCloud, YouTube. Mercury never hosts audio. The artist keeps control of their music.

---

## Local Music Library

*Desktop app only.*

Mercury can scan your local music folders, read metadata from your files, and build a browsable library.

### Adding Music Folders

1. Click **Library** in the top navigation bar
2. Click **Add Folder**
3. Select a folder containing music files in the OS file picker
4. Mercury scans the folder recursively, reading metadata from all supported audio files

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

Mercury bridges your local music with its 2.8-million-artist discovery index.

### Now-Playing Discovery

While a track is playing, click the **Discover** button in the player bar to expand the discovery panel.

Mercury matches the playing track's artist name against the discovery index:

- **Matched Artist** — If found, shows the artist name (linked to their artist page), country, and tags
- **Related Artists** — Up to 5 artists who share the same primary tag
- **Not Found** — Shows "Not found in Mercury index" if the artist isn't in the database (this is normal for very obscure artists)

Click the matched artist name to navigate to their full artist page — your audio keeps playing.

### Unified Search

When you search in the desktop app, results come from two sources:

1. **Your Library** — Local tracks matching the search query (artist, title, or album). Click to play.
2. **Discovery** — Artists from the 2.8M-artist index, same as the web version.

If matches exist in both sources, "Your Library" appears above "Discovery" with a divider between them. If you have more than 10 local matches, a "See all in Library" link takes you to the full library view.

### How Matching Works

Mercury normalizes artist names from your file metadata before searching:
- Strips leading "The" (e.g., "The Beatles" matches "Beatles")
- Splits on featuring credits (e.g., "Artist feat. Other" matches "Artist")
- Removes trailing qualifiers like "(Remastered)" or "[Deluxe Edition]"

Matching is best-effort and never blocks playback. If a match can't be found, the discovery panel simply shows "Not found."

---

## Web vs Desktop

| Feature | Web | Desktop |
|---------|-----|---------|
| Artist search | Yes | Yes |
| Tag search | Yes | Yes |
| Artist pages | Yes | Yes |
| Embedded players (Bandcamp, etc.) | Yes | Yes |
| Local music library | No | Yes |
| Audio playback of local files | No | Yes |
| Player bar + queue | No | Yes |
| Now-playing discovery | No | Yes |
| Unified search (local + discovery) | No | Yes |
| Offline search | No | Yes |
| Requires internet for artist pages | Yes | Yes* |

*Artist pages fetch releases and links from MusicBrainz, which requires internet. Search works offline using the local database.

---

## Troubleshooting

### "Database not found" on first launch

Mercury needs a discovery database file to search. On first launch:
1. Follow the on-screen instructions to download the database
2. Place the file at the indicated path
3. Click "Retry" to check again

### Search returns no results

- Ensure the discovery database is loaded (check the home page for any setup prompts)
- Try a simpler or shorter search query
- For tag search, use common genre names (e.g., `electronic`, `jazz`, `metal`)

### No sound when playing local files

- Check that your system volume is up and not muted
- Check the volume slider in Mercury's player bar (right side)
- Ensure the audio file isn't corrupted — try playing it in another application
- Supported formats: MP3, FLAC, OGG, M4A, AAC, WAV, Opus, WavPack

### Library scan shows 0 tracks

- Ensure the folder contains supported audio file formats
- Mercury reads metadata from file tags — untagged files will show as "Unknown Title" / "Unknown Artist" but should still appear
- Try removing and re-adding the folder

### Player bar disappears

The player bar only appears when a track is playing or loaded. It also only appears in the desktop app — the web version does not have a player bar.

### Artist page shows "No releases found"

Release data comes from MusicBrainz. Some artists may not have releases listed there. Mercury does not store release data locally — it's fetched live, so internet connectivity is required.

### Embedded player doesn't load

Embeds require internet access. If an embed doesn't load:
- Check your internet connection
- The artist may have removed their page on that platform
- Try reloading the page

### App is slow after scanning many files

The library browser loads all tracks into memory. For very large libraries (50,000+ tracks), sorting and grouping may take a moment. Future updates will add pagination and lazy loading.

---

*Mercury v0.1.0 — Last updated: 2026-02-17*
