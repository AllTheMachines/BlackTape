# HANDOFF — UI Mockup Audit Fixes

**Date:** 2026-02-25
**Status:** Audit complete, NO fixes applied yet. Start here next session.

---

## Context

Steve asked to compare the running app against the design mockups and fix all deviations. Full audit done. No code changed yet.

**Mockup files:** `mockups/styles.css`, `mockups/01-artist.html`, `mockups/02-discover.html`, `mockups/03-library.html`, `mockups/04-genre.html`

---

## Fixes To Apply

### 1. `src/lib/components/LibraryBrowser.svelte` — CRITICAL

**`.album-list-pane`** background wrong
```css
/* current */ background: var(--bg-2);
/* fix */     background: var(--bg-1);
```

**`.album-list-item`** padding and gap wrong
```css
/* current */ gap: 10px; padding: 0 12px;
/* fix */     gap: 9px;  padding: 0 10px;
```

**`.album-thumb`** border color wrong
```css
/* current */ border: 1px solid var(--b-2);
/* fix */     border: 1px solid var(--b-1);
```

**`.album-list-item:hover`** uses OKLCH var instead of spec hex
```css
/* current */ background: var(--bg-hover);
/* fix */     background: #181818;
```

**`.album-list-item.selected`** missing explicit background
```css
/* add */ background: #1e1e1e;
```

**`.release-title`** wrong size and weight
```css
/* current */ font-size: 15px; font-weight: 500;
/* fix */     font-size: 18px; font-weight: 300;
```

**`.release-artist`** wrong color, missing weight
```css
/* current */ color: var(--t-2);
/* fix */     color: var(--acc); font-weight: 500;
```

**`.release-play-btn`** solid amber fill — should be accent outline style
```css
/* current */
background: var(--acc);
color: #000;
border: none;

/* fix */
background: var(--acc-bg);
border: 1px solid var(--b-acc);
color: var(--acc);
```

**`.release-play-btn:hover`**
```css
/* current */ opacity: 0.85;
/* fix */     background: var(--acc-bg-h); opacity: unset;
```

**`.track-pane-column-headers`** wrong bg, missing height
```css
/* current */ background: var(--bg-2); padding: 4px 8px;
/* fix */     background: var(--bg-1); height: 28px; padding: 0 8px;
```

**`.track-pane-tracks`** remove excess padding
```css
/* current */ padding: 4px 0;
/* fix */     padding: 0;
```

---

### 2. `src/lib/components/PanelLayout.svelte` — sidebar colors

**`.sidebar-pane`**
```css
/* current */ background: var(--bg-base);
/* fix */     background: var(--bg-1);
```

**`.sidebar-pane.collapsed`**
```css
/* current */ background: var(--bg-surface); border-right: 1px solid var(--border-subtle);
/* fix */     background: var(--bg-1);
```

**`.left-sidebar:not(.collapsed)`**
```css
/* current */ border-right: 1px solid var(--border-subtle);
/* fix */     border-right: 1px solid var(--b-1);
```

**`.right-sidebar:not(.collapsed)`**
```css
/* current */ border-left: 1px solid var(--border-subtle);
/* fix */     border-left: 1px solid var(--b-1);
```

---

### 3. `src/routes/discover/+page.svelte` — filter panel polish

**`.filter-heading`** — wrong padding, tracking, missing border-bottom
```css
/* current */ padding: 5px 12px; letter-spacing: 0.08em;
/* fix */     padding: 10px 12px 8px; letter-spacing: 0.12em; border-bottom: 1px solid var(--b-1);
```

**`.filter-label`** — wrong tracking
```css
/* current */ letter-spacing: 0.06em;
/* fix */     letter-spacing: 0.1em;
```

**`.results-toolbar`** — missing border-bottom
```css
/* add */ border-bottom: 1px solid var(--b-1);
```

**`.tag-chip`** (discover-local, not global) — height wrong
```css
/* current */ height: 20px;
/* fix */     height: 22px;
```

---

### 4. `src/routes/artist/[slug]/+page.svelte` — button border-radius

These buttons use `border-radius: 4px` or `6px` — all should be `var(--r)` (2px square design):

- `.rooms-link`: `6px` → `var(--r)`
- `.embed-toggle`: `6px` → `var(--r)`
- `.share-mastodon-btn`: `4px` → `var(--r)`
- `.save-shelf-btn`: `4px` → `var(--r)`, also fix bad tokens: `var(--border)` → `var(--b-2)`, `var(--bg-secondary)` → `var(--bg-4)`, `var(--accent)` → `var(--acc)`
- `.shelf-dropdown`: `4px` → `var(--r)`
- `.mode-btn` (embed panel): `4px` → `var(--r)`
- `.embed-action-btn`: `4px` → `var(--r)`
- `.embed-curator-input`: `4px` → `var(--r)` (already gets it from global input rule — just remove local override)
- `.embed-code`: `4px` → `var(--r)`
- `.curator-handle-link`: `999px` (pill) → `var(--r)` (should be square chip)

---

### 5. `src/lib/components/TrackRow.svelte` — minor height

```css
/* current */ min-height: 36px;
/* fix */     min-height: 34px;
```

Leave `padding: 0 8px` and `border-radius: var(--r)` as-is — used in multiple contexts.

---

### 6. `src/routes/kb/genre/[slug]/+page.svelte` — type badge

Find the genre type pill/badge element and fix padding:
```css
/* current */ padding: 2px 8px;
/* fix */     height: 18px; padding: 0 7px;
```

---

## Do NOT Change

- `--header-height: 48px` — used in PanelLayout height calc, tuned for Titlebar+ControlBar stack
- `--player-height: 72px` — same
- `--card-radius` / `--input-radius` — legacy vars, not actively used by v1.4 components
- Titlebar.svelte — Tauri-specific, not in mockup scope
- SearchBar.svelte (large variant) — web-only landing page component, OKLCH vars intentional

---

## After Fixing

```bash
npm run check           # 0 errors, 8 warnings (pre-existing)
node tools/test-suite/run.mjs  # 164 passing
```

Then update BUILD-LOG.md with a mockup audit + polish entry.
