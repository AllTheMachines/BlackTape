# Work Handoff - 2026-02-25

## Current Task
Audit the running v1.4 app against the HTML mockups and fix all design discrepancies.

## Context
v1.4 shipped. Mockups are in `mockups/`. This session did a full audit and started fixing. Must continue fixing remaining gaps.

## Progress
### Completed This Session
- Full read of all 4 mockups + styles.css
- Full read of all key source files (ArtistCard, ControlBar, Player, LeftSidebar, PanelLayout, artist page, discover page, genre page, LibraryBrowser)
- **ArtistCard** — FIXED: added `.a-art` square area, fixed `border-radius` (6px → 2px), fixed colors (`var(--bg-3)`, `var(--b-2)`, `var(--t-1)`), fixed font sizes (12px name, 10px meta), card is now an `<a>` tag
- **Discover page** — FIXED: removed outer `padding: var(--space-lg)`, filter panel width 220px→196px, filter panel gets `background: var(--bg-1)` + `border-right: 1px solid var(--b-1)`, artist grid `minmax(220px,1fr)` → `minmax(160px,1fr)`

### Still Remaining
1. **Discover page** — filter-heading, filter-section, filter-label, results-toolbar, discover-results all need tighter styling to match mockup (see below)
2. **Artist page** — major structural gaps (see below)
3. **KB Genre page** — structural gaps (see below)
4. **LibraryBrowser** — missing album thumbs and release header (see below)

## Detailed Fix List

### Discover page — remaining CSS fixes
File: `src/routes/discover/+page.svelte`
- `.filter-heading`: change `font-size: 0.75rem` → `font-size: 9px`, add `padding: 5px 12px`, remove `margin: 0` gap handling
- `.filter-section`: change `gap: var(--space-lg)` → `gap: 0; border-bottom: 1px solid var(--b-0); padding: 8px 0`
- `.filter-label`: change `font-size: 0.7rem` → `font-size: 9px; padding: 3px 12px 6px`
- `.tag-cloud`: change `padding` → `padding: 0 10px`
- `.discover-results`: remove `gap: var(--space-md)`, change to `display: flex; flex-direction: column; overflow: hidden`
- `.results-toolbar`: add `background: var(--bg-2); padding: 8px 16px`, remove `padding-bottom` + `border-bottom` style
- `.result-count`: add `flex-shrink: 0`

### Artist page — `src/routes/artist/[slug]/+page.svelte`
This is the biggest fix. Key changes needed in `<style>`:
- `.artist-page`: remove `max-width`, `margin: 0 auto`, change `padding: var(--space-lg)` → `padding: 0`, change `gap: var(--space-2xl)` → `gap: 0`
- `.artist-header`: change to `padding: 18px 20px 0; border-bottom: 1px solid var(--b-1); background: var(--bg-2)`, `gap: 0`
- `.artist-name`: change `font-size: 2.4rem` → `font-size: 24px`, `color: var(--text-accent)` → `color: var(--t-1)`, `font-weight: 300`
- `.artist-meta`: change `font-size: 0.95rem` → `font-size: 11px`, `color: var(--text-secondary)` → `color: var(--t-3)`, `margin: 0; margin-top: 5px`
- `.tags`: add `padding-bottom: 14px`
- `.listen-on`: replace with flat bar: `display: flex; align-items: center; gap: 10px; padding: 8px 20px; border-bottom: 1px solid var(--b-1); background: var(--bg-1)`, remove `border: 1px solid`, `border-radius: var(--card-radius)`
- `.listen-label`: change to `font-size: 9px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--t-3); width: 62px; flex-shrink: 0`
- `.listen-link`: change `border-radius: 999px` → `border-radius: var(--r)`, `height: 26px; padding: 0 10px`, `color: var(--t-2)` (not text-accent)
- `.artist-tab-bar`: remove `margin-bottom: 1.5rem`, add `class="tab-bar"` to HTML element (or just apply same styles)
- `.artist-tab` → should look like global `.tab` — check theme.css for tab styles
- `.section-title` (h2): change `font-size: 1.1rem` → `font-size: 9px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--t-3); padding: 9px 20px; margin: 0`
- `.discography`: add `border-bottom: 1px solid var(--b-1)`; `.releases-grid`: change to `display: grid; grid-template-columns: repeat(auto-fill, minmax(108px, 1fr)); gap: 8px; padding: 14px 20px`
- `.discography-controls`: add `padding: 0 20px`
- `.links-section`: `border-bottom: 1px solid var(--b-1)`. `.link-group` → `display: flex; align-items: center; gap: 8px; padding: 5px 20px`. `.link-group-title` → `font-size: 9px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--t-3); width: 68px; flex-shrink: 0`
- `.cat-link`: change `border-radius: 999px` → `border-radius: var(--r)`, `font-size: 11px; height: 26px; padding: 0 10px`
- `.support-section`, `.embed-section`: add `padding: 0 20px`

### KB Genre page — `src/routes/kb/genre/[slug]/+page.svelte`
- `.genre-page`: remove `max-width: 860px; margin: 0 auto`, change `padding: var(--space-lg) var(--space-md)` → `padding: 0`
- `.genre-header`: add `padding: 18px 20px 16px; border-bottom: 1px solid var(--b-1); background: var(--bg-2)`; remove `margin-bottom`
- `.genre-title-row h1`: change `font-size: 1.8rem; font-weight: 700; color: var(--text-primary)` → `font-size: 28px; font-weight: 300; color: var(--t-1); margin-top: 6px`
- `.genre-meta`: `font-size: 11px; color: var(--t-3)` (was 0.85rem / text-muted)
- `.genre-section`: add `border-bottom: 1px solid var(--b-1); padding: 0`
- `.genre-section h2`: add `padding: 9px 20px; margin: 0` (already has uppercase/small pattern)
- Key artists list wrapper: add `padding: 0 20px 14px`
- Related genres wrapper: add `padding: 0 20px 14px`
- Genre map: add `padding: 14px 20px`

### LibraryBrowser — `src/lib/components/LibraryBrowser.svelte`
- `.album-list-item`: add height 52px, add `.album-thumb` div (36x36, show initials)
- `.track-pane-header`: upgrade to release header with cover art (80x80 + release details + play/queue buttons)
- Fix height formula: currently `calc(100vh - var(--topbar) - var(--player) - 120px)` — should be `height: 100%` (parent pane handles height)

## Key Decisions
- **Fully autonomous** — do NOT ask Steve for input, just fix it
- Mockups are the ground truth
- v1.4 design tokens: use `--t-1/t-2/t-3`, `--bg-1/2/3/4`, `--b-0/1/2/3`, `--acc`, `--b-acc` — NOT the OKLCH tokens
- Run `npm run check` after all changes
- Commit fixes atomically with descriptive messages
- Update BUILD-LOG.md

## Key Files
- `mockups/styles.css` — all design tokens and component patterns
- `mockups/01-artist.html`, `02-discover.html`, `03-library.html`, `04-genre.html` — ground truth
- `src/lib/styles/theme.css` — app CSS tokens
- `src/routes/artist/[slug]/+page.svelte` — artist page
- `src/routes/discover/+page.svelte` — discover page
- `src/lib/components/ArtistCard.svelte` — artist card (FIXED)
- `src/lib/components/LibraryBrowser.svelte` — library two-pane
- `src/routes/kb/genre/[slug]/+page.svelte` — KB genre page

## Git Status
- BUILD-LOG.md: minor uncommitted changes
- ArtistCard.svelte: modified (FIXED this session)
- discover/+page.svelte: modified (partial fix this session)
- Run `git diff` to see current state before continuing

## Next Steps
1. `/clear` to reset context
2. `/resume` to load this handoff
3. Continue with "Still Remaining" list above — Discover CSS fixes first, then artist page, then genre page, then LibraryBrowser
4. Run `npm run check` after each file
5. Commit each logical set of fixes: "fix(discover): tighten filter panel and results layout", "fix(artist): dense cockpit layout matching mockup", etc.
6. Update BUILD-LOG.md at end
