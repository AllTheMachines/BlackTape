# Phase 4: Local Music Player - Research

**Researched:** 2026-02-16
**Domain:** Desktop audio playback, metadata parsing, Tauri IPC, library management
**Confidence:** MEDIUM-HIGH

## Summary

Phase 4 turns Mercury from a discovery engine into a player. The core challenge is three-fold: (1) scan user folders and read audio metadata in Rust, (2) play audio files with standard player controls, and (3) bridge the local library with the existing 2.8M-artist search index so local files surface related artists and tags.

The Rust ecosystem has mature, well-maintained crates for all critical needs. **lofty** (v0.23.2) is the standard for multi-format metadata reading -- it covers ID3v2, Vorbis Comments, MP4/ilst, and more across 12 formats. **rodio** (v0.21.0) is the standard for audio playback, wrapping **cpal** for OS-level output and **symphonia** for decoding. The Tauri 2 ecosystem provides the dialog plugin for folder selection, the fs plugin for directory traversal, and a robust command/event system for frontend-backend communication.

The critical architecture decision is **where playback happens**: HTML5 `<audio>` via Tauri's asset protocol, or Rust-native via rodio/cpal. Evidence from the Musicat project (a production Tauri+Svelte music player) strongly favors **starting with HTML5 Audio** for v1, then migrating to Rust-native playback later if gapless playback or advanced features are needed. HTML5 Audio gives you play/pause/seek/volume for free, avoids complex IPC state management, and works immediately. The migration path is well-documented.

**Primary recommendation:** Use lofty for metadata, rodio (symphonia-all) for playback, HTML5 Audio + asset protocol for v1 player, Rust-native backend as v2 upgrade path. Match local files to the discovery index via normalized artist name lookup against the existing FTS5 index.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| lofty | 0.23.2 | Read audio metadata (ID3, Vorbis, MP4, FLAC tags) | Only Rust crate covering all 12 formats with unified API. 69 downstream crates. Used by Musicat. |
| rodio | 0.21.0 | Audio playback with decode + output | De facto Rust audio playback. 2.3k stars, 30k dependents. Wraps cpal + symphonia. |
| symphonia | 0.5.5 | Audio decoding (MP3, FLAC, AAC, OGG, etc.) | Pure Rust, no C dependencies. +/-15% of FFmpeg performance. Used by rodio internally. |
| cpal | latest | Cross-platform audio output | Used by rodio internally. Handles OS audio device access on Windows/macOS/Linux. |
| walkdir | latest | Recursive directory traversal | Standard Rust dir walker by BurntSushi. Comparable to `find` performance. |
| tauri-plugin-dialog | 2.x | Native folder picker dialog | Official Tauri plugin for OS-native file/folder selection. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jwalk | latest | Parallel directory traversal | If scanning large libraries (10k+ files) is too slow with walkdir |
| notify | latest | Filesystem change watching | Watch music folders for new/changed/deleted files after initial scan |
| serde | 1.x | Serialization for IPC | Already in Cargo.toml. Needed for command return types. |
| tauri-plugin-fs | 2.x | Frontend filesystem access | Only if using HTML5 Audio approach (asset protocol needs scope config) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| lofty | id3 + metaflac + mp4ameta | lofty unifies all; separate crates mean 3 APIs and no shared abstraction |
| rodio | symphonia + cpal directly | More control, more boilerplate. Rodio handles the plumbing. Only needed for advanced audio processing. |
| walkdir | jwalk (parallel) | jwalk is 4x faster for deep trees but adds rayon dependency. Only matters for 50k+ file libraries. |
| HTML5 Audio (v1) | Rust rodio backend (v2) | HTML5 is simpler to implement but can't do gapless. Rust backend is harder but enables gapless + DSP. |

### Installation

**Rust (Cargo.toml):**
```toml
[dependencies]
lofty = "0.23"
rodio = { version = "0.21", default-features = false, features = ["symphonia-all"] }
walkdir = "2"
tauri-plugin-dialog = "2"
```

**Frontend (npm):**
```bash
npm install @tauri-apps/plugin-dialog
```

## Architecture Patterns

### Recommended Project Structure

```
src-tauri/src/
├── lib.rs              # Tauri builder + plugin registration + state management
├── main.rs             # Entry point (unchanged)
├── player/
│   ├── mod.rs          # Player state struct, playback commands
│   ├── audio.rs        # rodio Sink wrapper, play/pause/seek/volume
│   └── queue.rs        # Queue/playlist management
├── scanner/
│   ├── mod.rs          # Folder scanning orchestration
│   ├── metadata.rs     # lofty-based tag reading
│   └── watcher.rs      # File system change watcher (notify)
└── library/
    ├── mod.rs          # Library database operations
    └── matching.rs     # Match local artists to Mercury index

src/lib/
├── player/
│   ├── state.ts        # Svelte 5 runes for player state ($state, $derived)
│   ├── controls.ts     # Tauri invoke wrappers for play/pause/seek/volume
│   ├── queue.ts        # Queue management (frontend mirror)
│   └── audio.ts        # HTML5 Audio element wrapper (v1) or event listener (v2)
├── library/
│   ├── types.ts        # LocalTrack, LocalAlbum, LocalArtist interfaces
│   ├── store.ts        # Library state management
│   └── scanner.ts      # Invoke wrappers for scan commands
└── components/
    ├── Player.svelte   # Persistent bottom bar player UI
    ├── Queue.svelte    # Queue/now-playing sidebar
    └── Library.svelte  # Library browser view
```

### Pattern 1: Two-Phase Architecture (HTML5 Audio v1, Rust Backend v2)

**What:** Start with HTML5 `<audio>` element using Tauri's asset protocol to serve local files to the webview. Metadata reading and library management happen in Rust. Playback happens in the browser. Later, migrate to Rust-native playback via rodio for gapless and DSP.

**When to use:** Always for v1. This gets a working player fast without complex IPC.

**Why this is the right call:** The Musicat project (the most mature Tauri+Svelte music player) started with HTML5 Audio and only moved to Rust-native playback after 1+ years, specifically for gapless playback. Their developer documented three failed intermediate approaches (MSE, AudioWorklet+WASM, WebRTC DataChannel) before arriving at Rust-native. Starting with HTML5 Audio avoids all of that complexity.

**v1 Flow (HTML5 Audio):**
```
User clicks play
  → Frontend calls convertFileSrc(filePath) to get asset:// URL
  → HTML5 <audio> element plays the URL
  → Frontend manages all playback state (position, duration, volume)
  → No Rust involvement in playback, only in scanning/metadata
```

**v2 Flow (Rust Native, future):**
```
User clicks play
  → Frontend invokes Rust command: play_track(path)
  → Rust: rodio Sink loads file via symphonia decoder
  → Rust: emits playback state events (position, duration, playing/paused)
  → Frontend listens to events, updates UI
```

### Pattern 2: Metadata Scanning in Rust via Tauri Commands

**What:** Scanning happens entirely in Rust. Frontend invokes `scan_folder(path)` command, Rust walks the directory, reads metadata with lofty, inserts into local SQLite, and streams progress back via Tauri Channel.

**Example:**
```rust
use lofty::file::TaggedFileExt;
use lofty::read_from_path;
use tauri::ipc::Channel;
use serde::Serialize;

#[derive(Clone, Serialize)]
struct ScanProgress {
    scanned: u32,
    total: u32,
    current_file: String,
}

#[tauri::command]
async fn scan_folder(
    path: String,
    on_progress: Channel<ScanProgress>,
) -> Result<u32, String> {
    let mut count = 0u32;
    let entries: Vec<_> = walkdir::WalkDir::new(&path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path().extension()
                .map(|ext| matches!(ext.to_str(), Some("mp3" | "flac" | "ogg" | "m4a" | "aac" | "wav" | "opus" | "wv")))
                .unwrap_or(false)
        })
        .collect();

    let total = entries.len() as u32;

    for entry in &entries {
        let path = entry.path();
        if let Ok(tagged_file) = read_from_path(path) {
            let tag = tagged_file.primary_tag()
                .or_else(|| tagged_file.first_tag());

            if let Some(tag) = tag {
                let title = tag.title().map(|s| s.to_string());
                let artist = tag.artist().map(|s| s.to_string());
                let album = tag.album().map(|s| s.to_string());
                let track_number = tag.track();
                let genre = tag.genre().map(|s| s.to_string());
                let year = tag.year();

                // Insert into local library SQLite table
                // ...

                count += 1;
            }
        }

        on_progress.send(ScanProgress {
            scanned: count,
            total,
            current_file: path.display().to_string(),
        }).ok();
    }

    Ok(count)
}
```

### Pattern 3: Player State Management with Tauri Managed State

**What:** For the Rust-native backend (v2), use `Mutex<PlayerState>` managed by Tauri, accessed from both commands and the playback thread.

**Example:**
```rust
use std::sync::Mutex;
use rodio::{OutputStream, Sink};

struct PlayerState {
    sink: Option<Sink>,
    _stream: Option<OutputStream>,
    current_track: Option<String>,
    queue: Vec<String>,
}

impl Default for PlayerState {
    fn default() -> Self {
        let (stream, stream_handle) = OutputStream::try_default().ok().unzip();
        let sink = stream_handle.map(|h| Sink::try_new(&h).ok()).flatten();
        Self {
            sink,
            _stream: stream,
            current_track: None,
            queue: Vec::new(),
        }
    }
}

// In lib.rs setup:
app.manage(Mutex::new(PlayerState::default()));

#[tauri::command]
fn play_track(path: String, state: tauri::State<'_, Mutex<PlayerState>>) -> Result<(), String> {
    let mut player = state.lock().map_err(|e| e.to_string())?;
    if let Some(sink) = &player.sink {
        let file = std::fs::File::open(&path).map_err(|e| e.to_string())?;
        let source = rodio::Decoder::new(std::io::BufReader::new(file))
            .map_err(|e| e.to_string())?;
        sink.clear();
        sink.append(source);
        sink.play();
        player.current_track = Some(path);
    }
    Ok(())
}
```

### Pattern 4: Local-to-Discovery Matching (PLAYER-03)

**What:** When a local file is playing, extract the artist name from metadata and look it up in the existing Mercury artists FTS5 index. This surfaces related artists, tags, and links from the discovery database alongside the user's own music.

**Approach:** Normalize the artist name from the file's metadata, then query the existing `artists_fts` table. Fall back to LIKE query for fuzzy matching. The existing `searchArtists()` function in `queries.ts` already does this.

**Example:**
```rust
// After reading metadata, match artist against the Mercury index
#[tauri::command]
async fn match_artist(
    artist_name: String,
    db: tauri::State<'_, Mutex<SqliteConnection>>,
) -> Result<Option<ArtistMatch>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    // Use existing FTS5 index for fuzzy matching
    let result = conn.query_row(
        "SELECT a.id, a.mbid, a.name, a.slug, a.country,
                GROUP_CONCAT(at2.tag, ', ') AS tags
         FROM artists_fts f
         JOIN artists a ON a.id = f.rowid
         WHERE artists_fts MATCH ?
         ORDER BY CASE WHEN LOWER(a.name) = LOWER(?) THEN 0 ELSE 1 END, f.rank
         LIMIT 1",
        [&artist_name, &artist_name],
        |row| { /* map to ArtistMatch */ },
    ).optional();
    // ...
}
```

**Or, even simpler from the frontend (v1):** When a local track is playing, use the existing search infrastructure to look up the artist. The `searchArtists()` function already exists and works in both web and Tauri contexts. The frontend can call it directly from `queries.ts` via the existing `TauriProvider`.

### Anti-Patterns to Avoid

- **Don't build playback IPC before you need it.** HTML5 Audio handles play/pause/seek/volume natively. Only add Rust-side playback when you need gapless or DSP. Every Tauri music player project that tried to build complex playback IPC from day 1 regretted it.

- **Don't scan on the main thread.** Use async Tauri commands so scanning doesn't block the UI. Stream progress via Channel, not repeated invoke calls.

- **Don't store audio data in the database.** Store only metadata (path, title, artist, album, track number, duration, genre, year) and the file path. The file system is the source of truth for audio data.

- **Don't create a separate database for the library.** Add a `local_tracks` table to the existing `mercury.db`. This keeps everything in one place and enables direct JOINs between local library and discovery index.

- **Don't try to match by MusicBrainz ID.** Local files rarely have MBIDs. Match by normalized artist name against the FTS5 index. This is "good enough" for 90%+ of cases.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio metadata parsing | Custom tag readers per format | lofty | 12 formats, 4 tag systems. Edge cases in ID3v2 alone fill books. |
| Audio decoding | FFI bindings to C codecs | symphonia (via rodio) | Pure Rust, no C deps, +/-15% FFmpeg perf. Handles resampling. |
| Audio device output | Raw OS audio APIs | cpal (via rodio) | WASAPI/CoreAudio/ALSA abstraction. Thread-safe callback model. |
| Directory traversal | `std::fs::read_dir` recursive | walkdir | Handles symlinks, permission errors, cross-platform edge cases. |
| File change watching | Polling loop | notify crate (or tauri-plugin-fs watch feature) | OS-native watchers (inotify/FSEvents/ReadDirectoryChanges). |
| Folder picker dialog | Custom file browser UI | tauri-plugin-dialog | OS-native dialog. Users expect their OS's folder picker. |
| Audio seeking/position | Manual sample counting | rodio Sink (try_seek, get_pos) | Handles variable bitrate, codec-specific seeking quirks. |

**Key insight:** Audio is a domain where every format has decades of edge cases. The Rust audio ecosystem (RustAudio GitHub org) maintains battle-tested crates. Custom solutions will break on real-world music libraries.

## Common Pitfalls

### Pitfall 1: Asset Protocol Scope Not Configured

**What goes wrong:** `convertFileSrc()` returns URLs that fail to load because the asset protocol doesn't have permission to access user music directories.
**Why it happens:** Tauri 2's security model requires explicit scope configuration for asset protocol access. Default scopes only cover app directories.
**How to avoid:** Configure asset protocol scope in `tauri.conf.json` to allow access to user-selected music folders. Use dynamic scope updates after folder selection via the dialog plugin.
**Warning signs:** `<audio>` elements fail to load with no clear error message; network tab shows 403 or empty responses for `asset://` URLs.

### Pitfall 2: Metadata Reading Blocks the UI

**What goes wrong:** Scanning a large library (5k+ files) takes 10-30 seconds and the UI freezes.
**Why it happens:** Tauri commands are async but if you don't use `async` properly, the command runs on the main thread. Also, emitting progress too frequently can flood the IPC channel.
**How to avoid:** Use `async` Tauri commands. Batch progress updates (emit every 50-100 files, not every file). Consider using `tokio::task::spawn_blocking` for the CPU-bound metadata reading.
**Warning signs:** UI becomes unresponsive during scan; progress bar doesn't update smoothly.

### Pitfall 3: OutputStream Dropped While Playing

**What goes wrong:** Audio plays for a split second then stops. Or: audio never plays at all.
**Why it happens:** rodio's `OutputStream` must live as long as playback continues. If it's created in a function scope, it drops when the function returns, killing all audio output.
**How to avoid:** Store `OutputStream` in the managed state alongside the `Sink`. Both must live for the app's lifetime.
**Warning signs:** Audio starts but immediately stops; no error messages.

### Pitfall 4: Windows Path Separators in SQLite/URLs

**What goes wrong:** File paths stored with backslashes (`\`) fail when used in URLs or cross-platform code.
**Why it happens:** Windows uses `\` as path separator, but URLs and SQLite URIs expect `/`.
**How to avoid:** Normalize all paths to forward slashes before storing in SQLite or using in URLs. The existing codebase already does this in `tauri-provider.ts` (`replaceAll('\\', '/')`).
**Warning signs:** Files found during scan but can't be played; path lookups fail.

### Pitfall 5: Linux WebView Audio Codec Support

**What goes wrong:** Audio files play fine on Windows and macOS but fail on Linux.
**Why it happens:** Linux uses webkit2gtk which may not have all audio codecs installed. MP3 support depends on GStreamer plugins being available.
**How to avoid:** For v1 (HTML5 Audio), document that Linux users may need `gstreamer1.0-plugins-good` and `gstreamer1.0-plugins-ugly`. For v2 (Rust backend), this is a non-issue since symphonia handles decoding in pure Rust.
**Warning signs:** "NotSupportedError" on Linux when trying to play certain formats.

### Pitfall 6: Duplicate Artist Matching

**What goes wrong:** "The Beatles" in local files matches multiple entries in the discovery index, or doesn't match at all because the metadata says "Beatles, The".
**Why it happens:** Artist names in metadata are inconsistent. Some use "Last, First", some use featured artist notation ("Artist feat. Other"), some have typos.
**How to avoid:** Normalize artist names before matching: trim whitespace, lowercase, strip common prefixes like "The", handle "feat."/"ft."/"featuring" splits. Rank results by exact match first, then FTS5 relevance.
**Warning signs:** "Related artists" section shows wrong or no results for well-known artists.

## Code Examples

### Reading Metadata with lofty

```rust
// Source: https://docs.rs/lofty/latest/lofty/
use lofty::file::TaggedFileExt;
use lofty::tag::Accessor;
use lofty::read_from_path;
use std::path::Path;

fn read_track_metadata(path: &Path) -> Option<TrackMetadata> {
    let tagged_file = read_from_path(path).ok()?;

    // primary_tag() returns the "native" tag for the format (ID3v2 for MP3, Vorbis for FLAC, etc.)
    // first_tag() is fallback for files with non-standard tags
    let tag = tagged_file.primary_tag()
        .or_else(|| tagged_file.first_tag())?;

    let properties = tagged_file.properties();

    Some(TrackMetadata {
        title: tag.title().map(|s| s.to_string()),
        artist: tag.artist().map(|s| s.to_string()),
        album: tag.album().map(|s| s.to_string()),
        album_artist: tag.get_string(&lofty::tag::ItemKey::AlbumArtist).map(|s| s.to_string()),
        track_number: tag.track(),
        disc_number: tag.disk(),
        genre: tag.genre().map(|s| s.to_string()),
        year: tag.year(),
        duration_secs: properties.duration().as_secs_f64(),
        path: path.to_string_lossy().to_string(),
    })
}
```

### HTML5 Audio Playback with Asset Protocol (v1)

```typescript
// Source: Tauri 2 docs - https://v2.tauri.app/reference/javascript/api/namespacecore/
import { convertFileSrc } from '@tauri-apps/api/core';

class AudioPlayer {
    private audio: HTMLAudioElement;

    constructor() {
        this.audio = new Audio();
        this.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
        this.audio.addEventListener('ended', () => this.onTrackEnd());
        this.audio.addEventListener('loadedmetadata', () => this.onMetadataLoaded());
    }

    play(filePath: string) {
        // convertFileSrc converts a local path to an asset:// URL
        // that the Tauri webview can load
        const url = convertFileSrc(filePath);
        this.audio.src = url;
        this.audio.play();
    }

    pause() { this.audio.pause(); }
    resume() { this.audio.play(); }
    seek(seconds: number) { this.audio.currentTime = seconds; }
    setVolume(volume: number) { this.audio.volume = Math.max(0, Math.min(1, volume)); }

    get currentTime(): number { return this.audio.currentTime; }
    get duration(): number { return this.audio.duration; }
    get isPlaying(): boolean { return !this.audio.paused; }
}
```

### Folder Selection via Dialog Plugin

```typescript
// Source: https://v2.tauri.app/plugin/dialog/
import { open } from '@tauri-apps/plugin-dialog';

async function selectMusicFolder(): Promise<string | null> {
    const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select your music folder',
    });
    return selected as string | null;
}
```

### Matching Local Track to Discovery Index

```typescript
// Uses existing Mercury infrastructure - no new code needed for basic matching
import { searchArtists } from '$lib/db/queries';
import type { DbProvider } from '$lib/db/provider';

async function findRelatedArtist(
    db: DbProvider,
    localArtistName: string
): Promise<ArtistResult | null> {
    // Normalize: strip "The ", handle "feat." splits
    const normalized = localArtistName
        .replace(/^the\s+/i, '')
        .split(/\s+(feat\.?|ft\.?|featuring)\s+/i)[0]
        .trim();

    const results = await searchArtists(db, normalized, 5);

    // Return best match (exact match preferred, then FTS rank)
    return results.length > 0 ? results[0] : null;
}
```

### Tauri Channel for Scan Progress

```typescript
// Source: https://v2.tauri.app/develop/calling-frontend/
import { invoke, Channel } from '@tauri-apps/api/core';

interface ScanProgress {
    scanned: number;
    total: number;
    current_file: string;
}

async function scanMusicFolder(path: string, onProgress: (p: ScanProgress) => void) {
    const channel = new Channel<ScanProgress>();
    channel.onmessage = onProgress;

    const totalScanned = await invoke<number>('scan_folder', {
        path,
        onProgress: channel,
    });

    return totalScanned;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTML5 Audio for desktop players | Rust-native decoding (symphonia + cpal) | 2024-2025 (Musicat, etc.) | Enables gapless playback, lower CPU, no codec dependency on OS |
| Separate metadata crates per format (id3 + metaflac + ...) | lofty unified library | 2022+ (lofty 0.x series) | One API for all formats, maintained by one author |
| rodio default decoders (minimp3, claxon, lewton) | rodio + symphonia-all feature | 2024+ | More formats (AAC, ALAC, Opus), better decoder quality, pure Rust |
| Tauri v1 allowlist security | Tauri v2 capabilities + permissions | Tauri 2.0 (Oct 2024) | Granular per-plugin scoping, no more global allowlists |

**Deprecated/outdated:**
- **audiotags crate:** Thin wrapper over id3/metaflac/mp4ameta. Superseded by lofty which provides a true unified API.
- **tauri-plugin-fs-watch (v1 standalone):** Merged into tauri-plugin-fs v2 as the `watch` feature flag.
- **rodio with claxon/minimp3 defaults:** Still works but symphonia-all is now preferred for broader format support and consistent behavior.

## Open Questions

1. **Asset protocol scope for user-selected directories**
   - What we know: Tauri 2 asset protocol requires explicit scope configuration. Static scopes go in `tauri.conf.json`. Dynamic scope changes may be possible via Rust-side APIs.
   - What's unclear: Whether the dialog plugin's folder selection automatically grants asset protocol scope, or whether we need to manually add the selected path to the scope at runtime.
   - Recommendation: Test with a minimal POC. Worst case, serve files via a custom Tauri command that reads bytes and returns them, or use a custom protocol handler.

2. **Local library database schema**
   - What we know: Need a `local_tracks` table alongside existing `artists`/`artist_tags` tables. Should store path, title, artist, album, track_number, duration, genre, year, and a hash/mtime for change detection.
   - What's unclear: Whether to add the table to the existing `mercury.db` (which is downloaded/distributed) or create a separate `library.db` for local-only data.
   - Recommendation: **Separate `library.db`** file. The `mercury.db` is a read-only search index distributed via download. Local library data is user-specific and mutable. Keep them separate to avoid migration conflicts when mercury.db is updated.

3. **Playback format coverage on Linux (HTML5 Audio path)**
   - What we know: Linux webkit2gtk depends on GStreamer for audio codec support. Not all formats may work out of the box.
   - What's unclear: Exactly which formats fail on a fresh Linux install. Whether we can detect missing codecs and show a helpful message.
   - Recommendation: For v1, document the GStreamer dependency. For v2 (Rust-native playback), this becomes a non-issue since symphonia handles all decoding in pure Rust.

4. **Embedded album art extraction**
   - What we know: lofty can read pictures/album art from tags. Cover art could be extracted and displayed in the player UI.
   - What's unclear: Performance impact of extracting art for large libraries during scan. Whether to extract during scan or lazily on display.
   - Recommendation: Lazy extraction. Don't read album art during the initial scan pass. Read it on-demand when a track or album is displayed, and cache the result.

## Sources

### Primary (HIGH confidence)
- [lofty docs](https://docs.rs/lofty/latest/lofty/) - Format support, API, tag reading patterns
- [lofty GitHub](https://github.com/Serial-ATA/lofty-rs) - Version 0.23.2 confirmed (Feb 14, 2026)
- [rodio docs](https://docs.rs/rodio/latest/rodio/) - Sink API (play, pause, seek, volume, queue)
- [rodio Cargo.toml](https://github.com/RustAudio/rodio/blob/master/Cargo.toml) - Feature flags, symphonia-all
- [symphonia GitHub](https://github.com/pdeljanov/Symphonia) - Version 0.5.5 (Oct 2025), codec support table
- [Tauri 2 File System plugin](https://v2.tauri.app/plugin/file-system/) - readDir, watch, permissions
- [Tauri 2 Dialog plugin](https://v2.tauri.app/plugin/dialog/) - Folder picker API
- [Tauri 2 Calling Frontend](https://v2.tauri.app/develop/calling-frontend/) - Events and Channels API
- [Tauri 2 Calling Rust](https://v2.tauri.app/develop/calling-rust/) - Commands, State, async patterns
- [Tauri 2 State Management](https://v2.tauri.app/develop/state-management/) - Mutex patterns, managed state

### Secondary (MEDIUM confidence)
- [Musicat blog: Building a music player with Tauri + Svelte](https://slavbasharov.com/blog/building-music-player-tauri-svelte) - Architecture patterns, lessons learned
- [Musicat blog: Road to Gapless](https://slavbasharov.com/blog/musicat-road-to-gapless) - HTML5 Audio limitations, migration to Rust native, failed intermediate approaches
- [Musicat GitHub](https://github.com/basharovV/musicat) - Production Tauri+Svelte music player reference
- [walkdir GitHub](https://github.com/BurntSushi/walkdir) - Standard recursive dir traversal crate
- [notify GitHub](https://github.com/notify-rs/notify) - Cross-platform fs watcher

### Tertiary (LOW confidence)
- Asset protocol scope for arbitrary user directories - gathered from GitHub discussions, not clearly documented for dynamic scoping
- Linux webkit2gtk codec support - known issue from Tauri bug reports, exact codec availability varies by distro

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - lofty, rodio, symphonia are well-documented with clear APIs and active maintenance
- Architecture: MEDIUM-HIGH - HTML5 Audio v1 pattern is validated by Musicat project; Rust-native v2 path is well-documented but not tested in this codebase
- Pitfalls: MEDIUM - Most pitfalls are from community reports and Musicat's documented experience; some (like asset protocol scoping) need POC validation
- Library-to-discovery matching: MEDIUM - Relies on existing FTS5 infrastructure which works, but artist name normalization edge cases haven't been tested

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (30 days - stable ecosystem, slow-moving crates)
