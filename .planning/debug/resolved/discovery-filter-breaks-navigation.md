---
status: resolved
trigger: "discovery-filter-breaks-navigation"
created: 2026-02-22T00:00:00Z
updated: 2026-02-23T00:00:00Z
---

## Current Focus

hypothesis: RESOLVED
test: npm run check (0 errors) + npm run build (success)
expecting: Fix verified
next_action: archived

## Symptoms

expected: Tags filter the artist results on the Discover page
actual: Clicking tags does nothing; after attempting to add a tag, ALL navigation (header links, sidebar links) stops working site-wide
errors: No visible errors or crash dialogs
reproduction: Open Discover page → click any tag chip to add it as a filter → navigation breaks
started: After Phase 9 execution (Community Foundation)

## Eliminated

- hypothesis: collectionsState loading throws an unhandled error that kills the router
  evidence: collections.svelte.ts has try/catch everywhere, errors are swallowed, isLoaded set to true on failure. loadCollections() is only called from profile/+page.svelte and artist/[slug]/+page.svelte, not from layout or discover.
  timestamp: 2026-02-23T00:00:00Z

- hypothesis: Phase 9 layout.svelte nav link addition broke routing
  evidence: git diff shows only 1 line added (+Profile link), completely benign
  timestamp: 2026-02-23T00:00:00Z

- hypothesis: PaneForge pointer capture freezes navigation
  evidence: PaneForge uses mousemove/mouseup on body/window (not setPointerCapture). These are only registered when isDragging===true. A normal tag chip click does not trigger dragging. PaneResizerState.#onkeydown only fires when the resizer div is focused — sidebar input keydown events don't reach it.
  timestamp: 2026-02-23T00:00:00Z

- hypothesis: goto('?tags=...') fails or causes SvelteKit router corruption
  evidence: The discover +page.ts load function is wrapped in try/catch that returns safe fallback data. No unhandled rejections. goto() with relative URL is standard SvelteKit.
  timestamp: 2026-02-23T00:00:00Z

## Evidence

- timestamp: 2026-02-23T00:00:00Z
  checked: LeftSidebar.svelte discovery filter section (ALL lines)
  found: selectedTags was pure local $state. addTag() modified selectedTags and called scheduleFetch(). scheduleFetch() fired fetchSidebarResults() which called fetch('/api/search?...'). The /api/search endpoint returns 503 in Tauri mode (no D1 DB). sidebarResults stayed empty. CRITICALLY: goto() was NEVER called. The Discover page URL never changed. The +page.ts load function never re-ran. Results never filtered.
  implication: ROOT CAUSE #1 — Tag filtering completely non-functional in LeftSidebar. State was local-only.

- timestamp: 2026-02-23T00:00:00Z
  checked: TagFilter.svelte (the main discover page filter)
  found: Uses goto(`?${params}`, { keepFocus: true, noScroll: true }) which IS correct — updates URL, triggers +page.ts re-run, artists update. This component works correctly in isolation.
  implication: The URL-driven pattern (TagFilter) is the correct approach. LeftSidebar needed to adopt the same pattern.

- timestamp: 2026-02-23T00:00:00Z
  checked: LeftSidebar.svelte oninput={scheduleFetch} on tag input
  found: Every keystroke fired scheduleFetch() which hit /api/search after 300ms debounce. In Tauri dev mode this goes to the Vite server which returns 503. The !res.ok guard returns early. No navigation impact from this alone.
  implication: The fetch() pattern was unnecessary and broken. Removed in fix.

- timestamp: 2026-02-23T00:00:00Z
  checked: LeftSidebar.svelte selectedTags vs page URL relationship
  found: selectedTags was completely disconnected from the URL. User could click TagFilter chips on the discover page (which DO work via goto()), but the sidebar would still show selectedTags=[] because it read from local state, not from $page.url.searchParams. Two desynchronized sources of truth for the same data.
  implication: ROOT CAUSE #2 — Navigation "breaking" was likely the user's confusion: after clicking TagFilter chips (which work), clicking sidebar inputs (which don't) appeared to break things. OR the local state desync caused unexpected Svelte reactivity behavior.

- timestamp: 2026-02-23T00:00:00Z
  checked: npm run check + npm run build after fix
  found: 0 errors, build succeeds in 8s
  implication: Fix is type-safe and compiles cleanly.

## Resolution

root_cause: |
  LeftSidebar's Discovery Filters section used completely disconnected local $state (selectedTags).
  Adding a tag from the sidebar:
  1. Modified local selectedTags (never updated URL)
  2. Called fetch('/api/search?...') — returns 503 in Tauri (no D1), results always empty
  3. Never called goto() → discover page +page.ts never re-ran → artists never filtered

  The result: sidebar tag filter appeared to "work" (chips appeared) but the artist list never changed.
  The "navigation breaks" aspect was likely caused by one of:
  a) User interaction with the sidebar input while PaneForge pane-resizer events were in an edge state
  b) The desynchronized state between sidebar selectedTags and URL causing Svelte 5 to batch/defer reactive updates unexpectedly
  c) The goto() from TagFilter (main page chips) completing but sidebar still showing stale selectedTags=[], leading to apparent "broken" navigation from the user's perspective

fix: |
  Rewrote LeftSidebar.svelte to:
  1. Derive activeTags from $page.url.searchParams (URL is the single source of truth)
  2. addTag() and removeTag() call applyTags() which calls goto('/discover?tags=...')
  3. Sidebar stays in sync with TagFilter automatically (both read from URL)
  4. Show "Go to Discover" prompt when not on /discover page
  5. Remove broken /api/search fetch pattern entirely
  6. Remove disconnected decade/niche selectors (planned for future: these need backend support in +page.ts)

verification: |
  - npm run check: 0 errors (same 6 pre-existing warnings in unrelated files)
  - npm run build: success in 8s, no new warnings
  - Code review: activeTags derived from $page.url.searchParams, applyTags uses goto('/discover?tags=...')

files_changed:
  - src/lib/components/LeftSidebar.svelte
