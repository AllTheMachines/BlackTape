# Roadmap: Mercury v1.4 — The Interface

## Milestones

- ✅ **v1.0 MVP** - Phases 1–10 (shipped 2026-02-23)
- ✅ **v1.1 Scene Building + Curator Tools** - Phases 11–12 (shipped 2026-02-23)
- ✅ **v1.2 Zero-Click Confidence** - Phases 13–15 (shipped 2026-02-24)
- ✅ **v1.3 The Open Network** - Phases 16–22 (shipped 2026-02-24)
- 🚧 **v1.4 The Interface** - Phases 23–27 (in progress)

---

### 🚧 v1.4 The Interface (In Progress)

**Milestone Goal:** Transform Mercury from a functional prototype into a real desktop application — ground-up visual redesign plus the UX depth the app has been missing: queue management, artist relationship data, discovery cross-linking, and search improvements.

## Phases

- [x] **Phase 23: Design System Foundation** - CSS design tokens, base component overhaul (buttons, tags, inputs, panels), layout shell (topbar, sidebar, player bar) (completed 2026-02-24)
- [x] **Phase 24: Artist Page** - Redesign artist page + MusicBrainz relationships (members, influences, labels) + release credits linking + discography filters + Mastodon button label (completed 2026-02-25)
- [x] **Phase 25: Queue System + Library** - Full queue management (Play/Queue on every track surface, Play Album, player queue panel, reorder/remove) + library two-pane redesign (completed 2026-02-25)
- [x] **Phase 26: Discover + Cross-Linking + Crate Fix** - Discover page redesign (filter panel + artist grid) + discovery tool cross-linking + Crate Dig country dropdown (completed 2026-02-25)
- [ ] **Phase 27: Search + Knowledge Base** - Search autocomplete + label/city search + result distinction + KB genre page redesign

## Phase Details

### Phase 23: Design System Foundation
**Goal**: Every surface in the app uses a consistent, intentional visual language — square controls, layered dark greys, amber accents, 1px panel borders
**Depends on**: Nothing (first phase of v1.4)
**Requirements**: DSYS-01, DSYS-02, DSYS-03, DSYS-04, DSYS-05
**Success Criteria** (what must be TRUE):
  1. All interactive elements (buttons, inputs, tag chips) have visible backgrounds and borders — no bare text acting as a button
  2. Tag chips are uniformly 22px tall, 2px radius, and turn amber when active
  3. Topbar, sidebar, and player bar are visually distinct, each separated by a 1px border
  4. The sidebar shows a left amber border on the active nav item and uses section labels to group navigation
  5. The app's dark grey palette is layered (panels sit on panels) with consistent amber accent throughout
**Plans**: 3 plans

Plans:
- [x] 23-01-PLAN.md — Design tokens in theme.css + custom Tauri titlebar
- [x] 23-02-PLAN.md — App chrome: ControlBar, LeftSidebar, Player bar
- [x] 23-03-PLAN.md — TagChip spec + global button/input/badge base styles

### Phase 24: Artist Page
**Goal**: The artist page is a fully redesigned, information-rich view — relationships from MusicBrainz, linked credits, filterable discography, and a fixed share button label
**Depends on**: Phase 23
**Requirements**: ARTP-01, ARTP-02, ARTP-03, ARTP-04, ARTP-05, ARTP-06, ARTP-07, ARTP-08
**Success Criteria** (what must be TRUE):
  1. Artist page matches the v1.4 design system across all sections (header, tabs, player integration)
  2. Band members, influenced-by artists, and associated labels are visible on the artist page, sourced from MusicBrainz relationships
  3. Release credits (producers, engineers, featured artists) appear on release views and each name links to that artist's page
  4. Discography has a working type filter (All / Albums / EPs / Singles) and date sort (newest / oldest)
  5. The Mastodon share button shows a visible text label, not just the arrow icon
**Plans**: 3 plans

Plans:
- [ ] 24-01-PLAN.md — MB relationships fetch + ArtistRelationships component + About tab + v1.4 tab bar tokens
- [ ] 24-02-PLAN.md — Discography filter pills (All/Albums/EPs/Singles) + sort control (Newest/Oldest)
- [ ] 24-03-PLAN.md — Release page collapsible Credits section + all P24 test suite entries

### Phase 25: Queue System + Library
**Goal**: Users can build and manage a playback queue from any track surface in the app, and the library uses a clear two-pane layout
**Depends on**: Phase 23
**Requirements**: QUEU-01, QUEU-02, QUEU-03, QUEU-04, QUEU-05, QUEU-06, LIBR-01, LIBR-02, LIBR-03
**Success Criteria** (what must be TRUE):
  1. Every track row in the app (search results, artist page, release page, library) shows "Play" and "+ Queue" buttons on hover
  2. Artist pages have "Play All" and "+ Queue All" for top tracks; release pages have "Play Album" and "+ Queue Album"
  3. The player bar has a queue icon that opens a panel showing the current queue
  4. Tracks in the queue can be reordered by drag and removed individually
  5. The library shows a two-pane layout (album list left, tracklist right) with the selected album highlighted by an amber left-border
**Plans**: 4 plans

Plans:
- [ ] 25-01-PLAN.md — Queue persistence (localStorage) + TrackRow reusable component
- [ ] 25-02-PLAN.md — Wire TrackRow into search/release/artist surfaces + Play Album / Play All buttons
- [ ] 25-03-PLAN.md — Queue panel slide-up redesign + drag-reorder + library two-pane layout
- [x] 25-04-PLAN.md — Phase 25 test manifest (P25-01 through P25-20) (completed 2026-02-25)

### Phase 26: Discover + Cross-Linking + Crate Fix
**Goal**: The Discover page has a proper filter-and-grid layout, the seven discovery tools reference each other naturally, and the Crate Dig country field is a proper dropdown
**Depends on**: Phase 23
**Requirements**: DISC-01, DISC-02, DISC-03, XLINK-01, XLINK-02, XLINK-03, XLINK-04, XLINK-05, CRAT-01
**Success Criteria** (what must be TRUE):
  1. Discover page shows a filter panel on the left and an artist card grid on the right; active filters appear as dismissable chips in the toolbar
  2. Artist cards display name, country, top tags, and a uniqueness score bar
  3. Artist pages link to Style Map filtered by the artist's primary tag; KB genre pages link to Discover filtered by that genre
  4. Scene pages link to the KB for the scene's primary genre; Crate Dig results surface "Explore in Style Map" and "Open scene room" links; Time Machine results link to artist pages and KB era entries
  5. Crate Dig country filter is a dropdown of country names — no raw ISO code input required
**Plans**: 4 plans

Plans:
- [ ] 26-01-PLAN.md — Discover page redesign: filter panel, live filtering, uniqueness score bar on artist cards
- [ ] 26-02-PLAN.md — Discovery tool cross-linking: artist→Style Map, scene→KB, crate/time-machine links
- [ ] 26-03-PLAN.md — Crate Dig country dropdown fix
- [x] 26-04-PLAN.md — Phase 26 test manifest (P26-01 through P26-16) (completed 2026-02-25)

### Phase 27: Search + Knowledge Base
**Goal**: Search finds artists by city and label in addition to name, shows autocomplete suggestions, distinguishes result types, and the KB genre pages match the v1.4 design
**Depends on**: Phase 23
**Requirements**: SRCH-01, SRCH-02, SRCH-03, SRCH-04, KBAS-01
**Success Criteria** (what must be TRUE):
  1. Typing in the search box shows autocomplete suggestions for artist names before the user submits
  2. User can search "artists from Berlin" or filter by city and get relevant results
  3. User can search by label name (e.g. "Warp Records") and get artists on that label
  4. Search results visually distinguish between artist name matches and tag matches
  5. KB genre pages show a type badge, description panel, key artists list, related genres with colour-coded type dots, and a genre map placeholder
**Plans**: TBD

## Progress

**Execution Order:** 23 → 24 → 25 → 26 → 27

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 23. Design System Foundation | 3/3 | Complete    | 2026-02-24 |
| 24. Artist Page | 3/3 | Complete    | 2026-02-25 |
| 25. Queue System + Library | 4/4 | Complete    | 2026-02-25 |
| 26. Discover + Cross-Linking + Crate Fix | 4/4 | Complete    | 2026-02-25 |
| 27. Search + Knowledge Base | 0/TBD | Not started | - |
