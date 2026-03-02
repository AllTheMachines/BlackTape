# Handoff — Library Album Detail View Redesign

## What Was Done This Session

### Library Expanded View — Redesigned to Match Release Page
- Expanded album view now matches the artist release page hero layout:
  - 220px cover art (was 160px)
  - Large bold title (1.6rem, weight 700) with year + release type badges
  - Artist name as clickable search link
  - Track count + duration stats
  - Play/Queue buttons matching release page accent style
  - "TRACKLIST" section label below hero
  - "← Back to library" button at top, visible and clickable

### Back Button Fix
- Created dedicated `collapseAlbum()` that sets `expandedAlbumKey = null` + scrolls to top
- Verified working via CDP

### Artist Tab Sort Fix
- Added `localeCompare` sort by artist name (then album name) when artist tab is active
- Was missing after previous refactor — showed same order as All tab

### CSS Cleanup
- Removed duplicate `.expanded-close` CSS block (from intermediate edit)
- Removed dead `.album-type-header`, `.album-cover-placeholder` rules
- Old expanded classes (`.expanded-header`, `.expanded-cover-btn`, etc.) replaced with release-page-style classes (`.release-hero`, `.cover-art`, `.hero-info`, etc.)

### Files Changed
- `src/lib/components/LibraryBrowser.svelte` — expanded view rewrite + artist sort + CSS cleanup

## What's NOT Done Yet
- BUILD-LOG.md not updated with session entries
- No commit made — all changes still staged from previous sessions + this session
- Steve should test back button with real mouse clicks
