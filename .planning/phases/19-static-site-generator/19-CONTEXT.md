# Phase 19: Static Site Generator - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Export any artist page from Mercury as a self-contained HTML folder that works offline, can be hosted anywhere, and has zero Mercury dependency. The exported site is a static artifact — no Mercury features, no live data, no interactive discovery. Just the artist's content, packaged.

</domain>

<decisions>
## Implementation Decisions

### Generated site design
- Mercury-styled: use Mercury's dark theme, colors, and typography — the exported site looks like a page from the app
- Single-column, centered layout
- Responsive (mobile-friendly) — links will be shared and opened on any device
- Small "Made with Mercury" attribution in the footer

### Export trigger & flow
- "Generate site" button in the artist page header/actions area (prominent and discoverable)
- Clicking opens a preview/summary dialog first (NOT the folder picker immediately)
  - Dialog shows: artist name + list of what will be included (bio, N releases, tags)
- After user confirms → OS folder picker opens
- After generation: show success message + "Open folder" button

### Offline asset handling
- Cover art: download at generation time, saved as image files into a `covers/` subfolder
- Missing covers (network error / not in Cover Art Archive): skip silently, use a placeholder image — do NOT fail generation
- CSS: inline in the HTML file (no separate stylesheet)
- Fonts: system font stack only — no external font requests, no base64 embedding

### Output structure
- Folder: `artist-name/` containing `index.html` + `covers/` subfolder
- Releases: all releases shown on the artist page in Mercury (no cap, no filtering)
- Each release card shows: cover image + title + year + platform buy/stream links
- Tags: displayed as styled tag pills near the artist bio (visual only, no navigation)

### Claude's Discretion
- Exact placeholder image design for missing covers
- Tag pill styling details
- HTML semantics and accessibility markup
- Error handling for failed generation (disk write errors, etc.)

</decisions>

<specifics>
## Specific Ideas

- The output folder should be named after the artist (slugified) so it's easy to identify
- The generated site should feel like "a Mercury page you can host" — not a generic press kit
- Platform links on release cards are the core value of the generated page for fans

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 19-static-site-generator*
*Context gathered: 2026-02-24*
