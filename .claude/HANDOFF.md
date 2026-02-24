# Work Handoff - 2026-02-24

## Current Task

Creating 4 HTML design mockups for Mercury's new UI direction. Files go in `mockups/` folder.

## Context

Steve wants to redesign Mercury's UI away from "black with white text links" toward a proper interface:
- **Square everything** — border-radius: 2px max, no pills
- **Buttons have backgrounds** — not just text links
- **Layered dark greys** — bg-0 (#080808) → bg-1 → bg-2 → bg-3 → bg-4 → bg-5 → bg-6 (#323232)
- **1px border lines** separating every panel
- **Warm amber accent** — #c4a55a
- **Reference:** Audirvana Studio (audirvana.com) — that level of interface structure

## Progress

### Completed
- `mockups/styles.css` — full shared design system CSS ✅
- `mockups/01-artist.html` — Artist page (Stars of the Lid) ✅
  - Sidebar + topbar + player bar shell
  - Artist header with name, uniqueness badge, meta, action buttons
  - Tags row (square chips)
  - Listen On bar
  - Tab bar (Overview / Members / Stats)
  - Bio section, Members section, Discography grid, Links section, Discovered By

### Still To Build
- `mockups/02-discover.html` — Discover/browse page
  - Tag filter panel (many tags, some active with amber highlight)
  - Results toolbar (count + sort dropdown + view toggle)
  - Artist card grid (3-4 columns, cards with art + name + country + tags + uniqueness score bar)

- `mockups/03-library.html` — Local library / two-pane
  - Left inner panel: album list with art thumbnail + name + year, selected state
  - Right panel: tracklist for selected album (track rows: # | title | duration | [▶ Play] [+ Queue])
  - Toolbar: Add Folder, sort, scan status

- `mockups/04-genre.html` — Knowledge Base genre page (Post-Rock)
  - Genre type badge + name + year/origin
  - Wikipedia description panel (with source badge)
  - Key Artists small grid
  - Related Genres chips (with type dots: scene=orange, city=teal, genre=grey)
  - Genre Map placeholder panel (darker box)

## Design System Reference

All CSS variables are in `mockups/styles.css`. Key ones:
```
--bg-0: #080808  --bg-1: #0f0f0f  --bg-2: #141414  --bg-3: #1a1a1a
--bg-4: #212121  --bg-5: #292929  --bg-6: #323232
--b-1: #202020   --b-2: #2c2c2c   --b-3: #3a3a3a
--t-1: #e0e0e0   --t-2: #888      --t-3: #464646
--acc: #c4a55a   --acc-bg: rgba(196,165,90,0.1)
--r: 2px         --sidebar: 192px  --topbar: 42px  --player: 66px
```

All 4 pages use: `<link rel="stylesheet" href="styles.css">` + Google Fonts Inter.

Body grid: `grid-template: 42px 1fr 66px / 192px 1fr` with areas topbar/sidebar/main/player.

## Next Step

Open a new session and write the 3 remaining mockup files:
1. `mockups/02-discover.html`
2. `mockups/03-library.html`
3. `mockups/04-genre.html`

Use `mockups/01-artist.html` as the structural template (topbar/sidebar/player shell is identical).
The only thing that changes per page is the `.main` content and which `.nav-item` has `class="active"`.

## Resume Command

After `/clear`, run `/resume` to reload this context.
