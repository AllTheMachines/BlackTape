# Phase 19: Static Site Generator - Research

**Researched:** 2026-02-24
**Domain:** Rust file I/O + HTML generation + Tauri command architecture
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Generated site design:**
- Mercury-styled: use Mercury's dark theme, colors, and typography — the exported site looks like a page from the app
- Single-column, centered layout
- Responsive (mobile-friendly) — links will be shared and opened on any device
- Small "Made with Mercury" attribution in the footer

**Export trigger & flow:**
- "Generate site" button in the artist page header/actions area (prominent and discoverable)
- Clicking opens a preview/summary dialog first (NOT the folder picker immediately)
  - Dialog shows: artist name + list of what will be included (bio, N releases, tags)
- After user confirms → OS folder picker opens
- After generation: show success message + "Open folder" button

**Offline asset handling:**
- Cover art: download at generation time, saved as image files into a `covers/` subfolder
- Missing covers (network error / not in Cover Art Archive): skip silently, use a placeholder image — do NOT fail generation
- CSS: inline in the HTML file (no separate stylesheet)
- Fonts: system font stack only — no external font requests, no base64 embedding

**Output structure:**
- Folder: `artist-name/` containing `index.html` + `covers/` subfolder
- Releases: all releases shown on the artist page in Mercury (no cap, no filtering)
- Each release card shows: cover image + title + year + platform buy/stream links
- Tags: displayed as styled tag pills near the artist bio (visual only, no navigation)

### Claude's Discretion

- Exact placeholder image design for missing covers
- Tag pill styling details
- HTML semantics and accessibility markup
- Error handling for failed generation (disk write errors, etc.)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SITE-01 | User can generate a self-contained HTML/CSS artist page for any artist and export it to a user-selected local directory | Tauri dialog `open({directory:true})` + Rust `generate_artist_site` command; existing `dialog:allow-open` capability covers this |
| SITE-02 | Generated site includes artist bio (from Wikipedia/MusicBrainz), top tags, discography with release covers, and platform buy/stream links | All data already in `data` object on artist page; Rust command receives serialized payload; reqwest downloads covers |
| SITE-03 | Generated site has zero runtime dependency on Mercury, external APIs, or any hosted service for basic display | CSS inlined in `<style>` tag; cover art downloaded to `covers/` subfolder; no external script/font/link tags in output |
| SITE-04 | Generated HTML is sanitized — artist names and bios with special characters or markup cannot inject scripts | Inline Rust `html_escape()` helper using string replace for `&`, `<`, `>`, `"`, `'`; no template engine needed; attributes always quoted |
</phase_requirements>

---

## Summary

Phase 19 adds a "Generate site" action to the artist page that exports a self-contained HTML folder. The technical approach is: (1) a Svelte confirmation dialog collects the user's intent, (2) the native OS folder picker selects the destination, (3) a new Rust command receives the full artist data payload, downloads cover images using the existing reqwest infrastructure, generates HTML as a Rust format-string, and writes the output folder.

No new npm packages or Rust crates are required. The existing tauri-plugin-dialog, reqwest, and futures-util crates already installed cover all technical needs. The "Open folder" button after generation uses the existing `plugin-shell open()` function, which is already installed — though it requires passing a file URL (`file:///path`) to open a directory reliably on Windows (the Opener plugin's `revealItemInDir` would be cleaner but adds a dependency).

The only genuine risk is the minijinja concern noted in STATE.md, but that concern is now moot: the HTML is generated with a single `format!()` call in Rust (a multi-hundred-line string interpolation). This is simpler, has no multi-file loading complexity, and is verifiable in unit tests. The STATE.md blocker can be closed.

**Primary recommendation:** All HTML generation in a new Rust module `src-tauri/src/site_gen.rs`. No template engine. No new packages. Data flows from Svelte → Rust via a single `generate_artist_site` command invocation.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `reqwest` | 0.12 (already installed) | Download cover art images | Already used for model downloads; `stream` feature already enabled |
| `futures-util` | 0.3 (already installed) | Async streaming for image downloads | Already in Cargo.toml |
| `tauri-plugin-dialog` | 2.x (already installed) | OS folder picker (`open({directory:true})`) | `dialog:allow-open` capability already declared in `default.json` |
| `tauri-plugin-shell` | 2.x (already installed) | `open()` for "Open folder" button | Already used for URL-opening in AiSettings and Spotify auth |
| `serde` / `serde_json` | 1.x (already installed) | Serialize artist data payload from TS to Rust | Standard project pattern for all commands |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Inline `html_escape()` helper | n/a — ~10 lines of Rust | Escape `&`, `<`, `>`, `"`, `'` for XSS prevention | Every string interpolated into generated HTML |
| `std::fs` | stdlib | Create dirs, write files | `create_dir_all` for output folder + `covers/`; `write` for HTML |
| `std::path::PathBuf` | stdlib | Build file paths | Cross-platform path construction |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline `format!()` HTML | `minijinja` / `tera` / `askama` | Template engines add a new crate + complexity; STATE.md explicitly flagged minijinja multi-file loading as a risk. Inline Rust string is simpler, fully testable, and sufficient for one-off export |
| Inline `html_escape()` | `html-escape` crate | Adding a crate for 5 lines of character substitution is unnecessary; inline is auditable, zero-dependency, unambiguous |
| `plugin-shell open()` | `tauri-plugin-opener` `revealItemInDir()` | `revealItemInDir` is cleaner and avoids the path-with-spaces issue on Windows; however, it requires adding a new npm package + Rust crate, violating the v1.3 zero-new-packages constraint. Mitigation: pass `file:///path` format to `shell open`, which Windows handles correctly. |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure

```
src-tauri/src/
├── site_gen.rs          # New module: generate_artist_site command + HTML/CSS generation
├── lib.rs               # Register generate_artist_site + open_in_explorer commands
src/lib/
├── components/
│   └── SiteGenDialog.svelte   # Preview/confirm dialog + generation state machine
src/routes/artist/[slug]/
└── +page.svelte         # Add "Generate site" button to header actions area
```

### Pattern 1: Data Payload via Rust Command

**What:** Frontend serializes all artist data (name, bio, tags, releases with links) into a typed struct, passes to Rust command as JSON. Rust owns all generation logic.

**When to use:** Any multi-file write that cannot be done from the browser JS context.

**Example (TypeScript side):**
```typescript
// Source: existing pattern from taste_db invoke calls
const { invoke } = await import('@tauri-apps/api/core');
const result = await invoke<{ output_dir: string; cover_count: number }>('generate_artist_site', {
  outputDir: selectedFolder,
  artist: {
    name: data.artist.name,
    slug: data.artist.slug,
    tags: data.artist.tags ?? '',
    country: data.artist.country ?? null,
    type: data.artist.type ?? null,
    beginYear: data.artist.begin_year ?? null,
    ended: data.artist.ended ?? false,
    bio: effectiveBio ?? null,
    releases: data.releases.map(r => ({
      title: r.title,
      year: r.year,
      type: r.type,
      coverArtUrl: r.coverArtUrl,
      links: r.links,
    })),
  },
});
```

**Example (Rust command signature):**
```rust
// Source: pattern from download.rs / taste_db.rs
#[tauri::command]
pub async fn generate_artist_site(
    output_dir: String,
    artist: ArtistSitePayload,
) -> Result<SiteGenResult, String> { ... }

#[derive(Deserialize)]
pub struct ArtistSitePayload {
    pub name: String,
    pub slug: String,
    pub tags: String,
    pub country: Option<String>,
    pub r#type: Option<String>,
    pub begin_year: Option<i32>,
    pub ended: bool,
    pub bio: Option<String>,
    pub releases: Vec<ReleaseSitePayload>,
}

#[derive(Deserialize)]
pub struct ReleaseSitePayload {
    pub title: String,
    pub year: Option<i32>,
    pub r#type: String,
    pub cover_art_url: Option<String>,
    pub links: Vec<ReleaseLinkPayload>,
}

#[derive(Deserialize)]
pub struct ReleaseLinkPayload {
    pub url: String,
    pub platform: String,  // "bandcamp" | "spotify" | "soundcloud" | "youtube"
}

#[derive(Serialize)]
pub struct SiteGenResult {
    pub output_dir: String,
    pub cover_count: usize,  // for success message: "N covers downloaded"
}
```

### Pattern 2: Cover Art Download (Best-Effort)

**What:** For each release with a `coverArtUrl`, attempt `reqwest::get()` and write bytes to `covers/{mbid}.jpg`. On any error, silently skip — use placeholder in HTML. Mirror of `download.rs` logic without progress reporting.

**When to use:** Batch image fetching where failure is non-fatal.

**Example:**
```rust
// Source: pattern from src-tauri/src/ai/download.rs
async fn download_cover(url: &str, dest: &std::path::Path) -> bool {
    let Ok(response) = reqwest::get(url).await else { return false; };
    if !response.status().is_success() { return false; }
    let Ok(bytes) = response.bytes().await else { return false; };
    std::fs::write(dest, &bytes).is_ok()
}
```

Cover Art Archive returns 404 for releases without art — this is expected. `is_success()` check handles it cleanly.

### Pattern 3: HTML Generation via `format!()`

**What:** One function builds the entire HTML string. Inline `<style>` tag contains Mercury theme CSS translated to static hex/rgb values (OKLCH is not universally supported in older browsers — translate to hex for max compatibility). All user data passes through `html_escape()` before interpolation.

**Why:** No template engine needed. The output is a single static file. Rust string interpolation is auditable line-by-line. Unit-testable by parsing the output string.

**The inline escape helper:**
```rust
fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
     .replace('<', "&lt;")
     .replace('>', "&gt;")
     .replace('"', "&quot;")
     .replace('\'', "&#x27;")
}
```
**This function must be applied to: artist name, bio text, release titles, tag text, country, type. It must NOT be applied to URLs used in href= attributes** (URLs should be URL-encoded separately if needed; for MusicBrainz-sourced links this is typically not required).

### Pattern 4: Output Folder Naming

**What:** Slugify artist name for folder name. Simple approach: lowercase, replace spaces with hyphens, strip non-alphanumeric-or-hyphen characters.

```rust
fn slugify(name: &str) -> String {
    name.to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}
```

Note: the artist `slug` from `data.artist.slug` already exists and IS the Mercury-canonical slug — prefer reusing it directly over re-computing. The Mercury DB slug is already URL-safe.

### Pattern 5: "Open Folder" After Generation

**What:** After generation succeeds, the success message includes an "Open folder" button. On click, open the output directory in OS file explorer.

**Implementation (Rust command, avoids new packages):**
```rust
#[tauri::command]
pub fn open_in_explorer(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
```

This approach: no new crates, no new npm packages, no new capabilities needed (Rust `std::process::Command` runs in the Tauri process, not via tauri-plugin-shell), correct cross-platform behavior. The `spawn()` call is fire-and-forget — we don't wait for Explorer to close.

**Alternative considered:** `plugin-shell open()` — already installed, but has a documented issue with folder paths containing spaces on Windows (GitHub issue #6431). Avoid.

### Pattern 6: Preview/Confirm Dialog (Svelte)

**What:** An inline Svelte component (`SiteGenDialog.svelte`) rendered conditionally with `{#if showDialog}`. State machine: `idle → confirming → picking → generating → success | error`.

Follows the existing `ListeningHistory.svelte` pattern for two-step confirmation (`confirmClear = $state(false)`). Not a native OS dialog — purely Svelte UI with Mercury styling.

```svelte
<!-- Artist page: header actions area -->
{#if tauriMode}
  <button class="generate-site-btn" onclick={() => showSiteGen = true}>
    Export site
  </button>
  {#if showSiteGen}
    <SiteGenDialog
      artist={data.artist}
      releases={data.releases}
      bio={effectiveBio}
      onclose={() => showSiteGen = false}
    />
  {/if}
{/if}
```

### Anti-Patterns to Avoid

- **Calling `dialog.open()` without `directory: true`**: This opens a file picker, not a folder picker. Always include `directory: true` for this flow.
- **Passing raw artist name to `format!()` without escaping**: Will break HTML if artist name contains `&`, `<`, `>` (e.g., "Simon & Garfunkel"). Always escape ALL text fields.
- **Linking to `covers/{mbid}.jpg` unconditionally**: Must check whether the cover was actually downloaded. Use a flag per release (boolean `downloaded`) returned from Rust, or check file existence. Simpler: return a `HashSet<String>` of successfully downloaded mbids in `SiteGenResult`.
- **Using OKLCH colors in generated CSS**: OKLCH has excellent support in modern browsers but zero support in older ones. Since the generated site may be viewed anywhere, translate to hex/RGB equivalents for CSS in generated output.
- **Blocking the Tauri main thread during generation**: `generate_artist_site` must be `async` (it does network I/O for cover downloads). Mark with `#[tauri::command]` on an async fn — Tauri spawns it on the tokio runtime automatically.
- **Not handling the case where `output_dir/artist-slug/` already exists**: Use `create_dir_all` (idempotent) — if the folder already exists, generation overwrites it. This is the expected behavior (re-export).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML entity encoding | Custom regex replace | Inline `html_escape()` with 5 known substitutions | Regex is overkill; the 5 entities (`&`, `<`, `>`, `"`, `'`) are well-defined and exhaustive for text content nodes and attribute values |
| Async HTTP | Custom TCP | `reqwest` (already installed) | reqwest handles TLS, redirects (Cover Art Archive redirects), timeouts — cover downloads fail silently anyway |
| Folder slug | Complex Unicode normalization | Reuse `data.artist.slug` from DB | The DB slug is already Mercury-canonical and safe for filesystem use |
| Dialog state machine | Custom event system | Svelte `$state()` booleans | Project convention; see ListeningHistory.svelte pattern |
| CSS for generated site | External stylesheet | Inline `<style>` block in HTML template | Requirement: zero external dependencies, single-file delivery |

**Key insight:** The generated HTML is a one-off artifact, not a live rendered component. Simpler is correct here. Long format strings with clear section comments are more auditable than a template engine for a ~300-line HTML output.

---

## Common Pitfalls

### Pitfall 1: OKLCH in Generated CSS

**What goes wrong:** Copy-pasting Mercury's `theme.css` OKLCH values into the generated HTML's `<style>` block causes blank/unstyled pages in some browsers (Firefox ESR, Safari <15.4, all of Internet Explorer).

**Why it happens:** OKLCH is a modern color space not universally supported. Mercury's app uses WebView2 which is Chromium-based and supports OKLCH. The generated site will be opened in users' various browsers.

**How to avoid:** Translate OKLCH values to hex/RGB in the static template. Use CSS custom properties with hex fallback values in the generated template's `<style>` block.

**Warning signs:** Site looks blank or unstyled when opened in Firefox ESR or Safari.

### Pitfall 2: Cover URL vs Local Path Mismatch

**What goes wrong:** `index.html` references `covers/mbid.jpg` but the download failed silently → broken image icons instead of placeholder.

**Why it happens:** The download is best-effort. The HTML must be generated with knowledge of which covers actually succeeded.

**How to avoid:** Return a `HashSet<String>` (mbids) of successful downloads from the Rust command. The HTML generation loop (also in Rust) uses this set: if mbid not in downloaded set → use inline SVG placeholder instead of `<img src="covers/...">`.

**Better approach:** Keep HTML generation and cover downloading in the same Rust function. Download first, track successes, then generate HTML using that knowledge. This avoids any coordination problem.

### Pitfall 3: Artist Name with Special Chars in Folder Name

**What goes wrong:** Artist name "AC/DC" or "Sigur Rós" creates a folder with invalid filesystem characters.

**Why it happens:** Slugification only handles safe chars. `/` on macOS, `\` on Windows are directory separators.

**How to avoid:** The artist `slug` from the DB is already sanitized (Mercury uses it in URLs). Use `artist.slug` as the folder name — not the artist name.

### Pitfall 4: XSS via Bio Text (SITE-04)

**What goes wrong:** Wikipedia bio contains `<script>` tags or `<a href="javascript:...">` → injected into HTML → executes when someone views the generated page.

**Why it happens:** Wikipedia bios are fetched raw and may contain rich text. Even without malicious intent, accidental `<` in a bio creates broken HTML.

**How to avoid:** ALL text content must go through `html_escape()`. Bio text is especially risky since it's longer and comes from an external source. The `html_escape()` function converts `<script>` to `&lt;script&gt;` which renders as visible text, not executable code.

**Important:** URL attributes (`href=`) do NOT need `html_escape()` for external URLs — but they MUST be quoted (`href="..."`) so that `html_escape()` on surrounding text cannot escape out of attribute context.

### Pitfall 5: capabilities.json Needs `dialog:allow-open` for Directory Mode

**What goes wrong:** Folder picker works for files but silently does nothing for directories, OR throws "permission denied" in Tauri.

**Why it happens:** `dialog:allow-open` is already in `default.json` (confirmed in research). The directory mode is covered by the same permission.

**How to avoid:** Already handled. No new capability needed. Verified: `dialog:allow-open` permits both file and directory selection with `open({directory:true})`.

### Pitfall 6: Tauri Command Must Be `async` for reqwest

**What goes wrong:** `generate_artist_site` declared as `pub fn` (synchronous) → `reqwest::get().await` compilation error: "no async runtime available."

**Why it happens:** `reqwest` is async. Tauri commands can be either sync or async — you must declare `pub async fn` for commands that do async work.

**How to avoid:** `pub async fn generate_artist_site(...)` — matches the pattern from `download.rs::download_model`.

---

## Code Examples

Verified patterns from project codebase:

### Folder Picker (TypeScript)

```typescript
// Source: src/lib/library/scanner.ts — confirmed directory:true pattern
const { open } = await import('@tauri-apps/plugin-dialog');
const selected = await open({
  directory: true,
  multiple: false,
  title: 'Choose export destination'
});
// selected is string | null
if (!selected) return; // user cancelled
```

### Async Rust Command with reqwest (Rust)

```rust
// Source: pattern from src-tauri/src/ai/download.rs
#[tauri::command]
pub async fn generate_artist_site(
    output_dir: String,
    artist: ArtistSitePayload,
) -> Result<SiteGenResult, String> {
    let out_path = std::path::PathBuf::from(&output_dir).join(&artist.slug);
    let covers_path = out_path.join("covers");
    std::fs::create_dir_all(&covers_path)
        .map_err(|e| format!("Failed to create output dir: {}", e))?;

    // Download covers (best-effort)
    let mut downloaded_mbids = std::collections::HashSet::new();
    for release in &artist.releases {
        if let Some(ref url) = release.cover_art_url {
            let dest = covers_path.join(format!("{}.jpg", release.mbid_or_slug()));
            if download_cover(url, &dest).await {
                downloaded_mbids.insert(release.mbid_or_slug());
            }
        }
    }

    // Generate HTML
    let html = build_html(&artist, &downloaded_mbids);
    let html_path = out_path.join("index.html");
    std::fs::write(&html_path, html.as_bytes())
        .map_err(|e| format!("Failed to write index.html: {}", e))?;

    Ok(SiteGenResult {
        output_dir: out_path.to_string_lossy().to_string(),
        cover_count: downloaded_mbids.len(),
    })
}
```

### HTML Escape (Rust)

```rust
// Inline — no crate needed
fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
     .replace('<', "&lt;")
     .replace('>', "&gt;")
     .replace('"', "&quot;")
     .replace('\'', "&#x27;")
}
```

### HTML Template Structure (Rust)

```rust
fn build_html(artist: &ArtistSitePayload, downloaded: &std::collections::HashSet<String>) -> String {
    let name = html_escape(&artist.name);
    let bio_html = artist.bio.as_deref()
        .map(|b| format!("<p class=\"bio\">{}</p>", html_escape(b)))
        .unwrap_or_default();
    let tags_html = build_tags_html(&artist.tags);
    let releases_html = build_releases_html(&artist.releases, downloaded);

    format!(r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{name}</title>
  <style>
    /* Mercury dark theme — static hex translations of OKLCH values */
    :root {{
      --bg-base: #111;
      --bg-surface: #1c1c1c;
      --text-primary: #e8e8e8;
      --text-secondary: #b3b3b3;
      --text-muted: #808080;
      --link-color: #7ab4d8;
      --tag-bg: #1a2530;
      --tag-text: #7ab4d8;
      --tag-border: #2a3d50;
      --border-default: #333;
      --card-radius: 6px;
      --bandcamp-color: #1da0c3;
      --spotify-color: #1db954;
      --soundcloud-color: #ff5500;
      --youtube-color: #ff0000;
    }}
    /* ... full responsive single-column layout ... */
  </style>
</head>
<body>
  <main class="artist-page">
    <h1 class="artist-name">{name}</h1>
    {bio_html}
    {tags_html}
    <section class="discography">
      {releases_html}
    </section>
    <footer><small>Made with <a href="https://github.com/mercury-app/mercury">Mercury</a></small></footer>
  </main>
</body>
</html>"#, name=name, bio_html=bio_html, tags_html=tags_html, releases_html=releases_html)
}
```

Note: `{{` and `}}` in `format!()` are literal `{` and `}` — Rust's escape sequence in format strings.

### Success State with "Open Folder" (Svelte)

```svelte
<!-- After generation completes -->
{#if generationResult}
  <div class="gen-success">
    <p>Site exported to <code>{generationResult.output_dir}</code></p>
    <p>{generationResult.cover_count} cover images downloaded.</p>
    <button onclick={handleOpenFolder}>Open folder</button>
    <button onclick={handleClose}>Done</button>
  </div>
{/if}
```

```typescript
async function handleOpenFolder() {
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('open_in_explorer', { path: generationResult!.output_dir });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Template engine (minijinja) for HTML | Inline Rust `format!()` | Phase 19 decision | Eliminates STATE.md blocker; no multi-file loading complexity |
| `plugin-shell open()` for folder reveal | Custom Rust `open_in_explorer` using `std::process::Command` | Phase 19 | Avoids Windows path-with-spaces bug; no new packages |
| New npm package for opener | Existing infrastructure only | Phase 19 decision | Maintains v1.3 zero-new-packages constraint |

**Deprecated/outdated:**
- `minijinja` for site generation: STATE.md flagged this as a risk — eliminated by using `format!()` instead

---

## Open Questions

1. **Does `reqwest::get()` in Tauri commands share the same tokio runtime context?**
   - What we know: `download.rs` uses `reqwest::get().await` in a `#[tauri::command] async fn` and it works correctly. Tauri runs commands on tokio.
   - What's unclear: Whether concurrent reqwest calls (downloading N covers in parallel) work, or if we need sequential downloads.
   - Recommendation: Download covers sequentially in a loop (simpler, no rate-limit risk with Cover Art Archive). Cover Art Archive is a public service — concurrent requests could get rate-limited. Sequential is safe and sufficient.

2. **Release identifier for cover filenames**
   - What we know: `ReleaseGroup.mbid` exists in the TypeScript type and is passed in the payload. Cover Art Archive URLs already use the MBID (`coverartarchive.org/release-group/{mbid}/front-250`).
   - What's unclear: The `ReleaseSitePayload` struct needs to include `mbid` field explicitly (it's currently not in the CONTEXT.md data structure spec).
   - Recommendation: Include `mbid: String` in `ReleaseSitePayload`. Use it as the cover filename: `covers/{mbid}.jpg`. This gives deterministic, collision-free filenames.

3. **Bio source in generated site**
   - What we know: `effectiveBio` on the artist page is `data.bio || aiBio` — Wikipedia bio takes priority, AI bio as fallback.
   - What's unclear: The TypeScript payload sends whichever bio is currently showing. If AI bio is used, is it appropriate to include in the exported site?
   - Recommendation: Send `effectiveBio` as the `bio` field. Include both sources as valid. The generated site makes no claim about bio source — it's just contextual text.

---

## Sources

### Primary (HIGH confidence)

- Project codebase `src-tauri/src/ai/download.rs` — confirmed reqwest async pattern with `response.bytes().await`
- Project codebase `src/lib/library/scanner.ts` — confirmed `open({directory:true, multiple:false})` pattern
- Project codebase `src-tauri/capabilities/default.json` — confirmed `dialog:allow-open` already declared
- Project codebase `src-tauri/Cargo.toml` — confirmed `reqwest = {version="0.12", features=["stream"]}` and `futures-util = "0.3"` already installed
- Project codebase `src/lib/styles/theme.css` — confirmed OKLCH values and system font stack
- Tauri v2 Dialog docs (`https://v2.tauri.app/plugin/dialog/`) — confirmed `open({directory:true})` returns `string | null`

### Secondary (MEDIUM confidence)

- Tauri v2 Opener docs (`https://v2.tauri.app/plugin/opener/`) — confirmed `revealItemInDir` exists but requires new package; decided against
- WebSearch: `plugin-shell open` path-with-spaces bug on Windows (GitHub issue #6431) — cross-referenced against decision to use `std::process::Command` instead

### Tertiary (LOW confidence)

- `html-escape` crate documentation — reviewed; decided inline escape function is sufficient and preferable

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in Cargo.toml; no new packages needed
- Architecture: HIGH — all patterns derived from existing working code in the project
- Pitfalls: HIGH for OKLCH/XSS/async (codebase evidence); MEDIUM for Windows path handling (WebSearch + issue tracker)

**Research date:** 2026-02-24
**Valid until:** 2026-05-24 (stable domain — HTML generation, reqwest, Tauri dialog)
