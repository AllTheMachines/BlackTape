# Phase 37: Context Sidebar + Decade Filtering - Research

**Researched:** 2026-03-04
**Domain:** SvelteKit 5 (Svelte 5 runes) component modification — sidebar enhancement, filter UI, AI chat integration
**Confidence:** HIGH

## Summary

Phase 37 is purely a frontend modification phase touching three files: `RightSidebar.svelte`, `discover/+page.svelte`, and indirectly the `PROMPTS` in `src/lib/ai/prompts.ts`. The codebase is in excellent shape — all required primitives already exist. The AI provider interface (`getAiProvider()` / `provider.complete()`), the FTS5 autocomplete queries (`searchArtistsAutocomplete`, `searchTagsAutocomplete`), the `aiState` reactive store, and the decade toggle pattern are all in place. No new infrastructure is needed.

The three additions are well-bounded: (1) prepend a quick-search box + AI companion section to `RightSidebar.svelte` above existing page-specific content, (2) expand `ERA_OPTIONS` from 7 to 8 entries by adding '50s', and (3) add an AI chat panel to the sidebar that reuses the `getAiProvider().complete()` / `PROMPTS.nlExplore` pattern from the existing Explore page.

The main architectural decision is how the AI companion accesses current filter context (for context-aware suggestions). Since the sidebar is rendered in `+layout.svelte` and receives only `pagePath`, passing filter state requires either prop drilling through the layout or having the chat component read URL params directly via `$page.url.searchParams`. The URL approach is simpler and self-contained.

**Primary recommendation:** Modify `RightSidebar.svelte` to prepend search + AI sections; the existing component structure (section / section-divider / conditional rendering) handles all layout needs. Reuse `searchArtistsAutocomplete` + `searchTagsAutocomplete` for sidebar search. Mirror the Explore page's `getAiProvider().complete()` pattern for AI chat.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Context sidebar — search:**
- Quick-search input appears in the right sidebar on all standard pages (persistent, always visible regardless of page context)
- Searches both artists and tags — same as the main `/search` route
- Clicking an artist result navigates to `/artist/[slug]`; clicking a tag result navigates to the tag search page (existing routes, no inline preview)
- The search box appears at the top of the right sidebar

**Context sidebar — stacking order:**
- Claude decides the exact stacking, but the order should be:
  1. Quick-search input (always shown)
  2. AI companion chat (shown only when `aiState.status === 'ready'`)
  3. Page-specific content (existing: artist tags, queue, now-playing — kept as-is below the new sections)
- Existing page-specific sidebar content is preserved, not replaced

**Context sidebar — AI companion:**
- A chat panel appears below the search box when AI is ready (`aiState.status === 'ready'`)
- Full capability: natural language DB queries, context-aware suggestions (knows current filters + now-playing + library), and general music knowledge chat
- When AI is not connected or loading: chat section is not shown
- No placeholder or "enable AI" hint — hidden by default, revealed when ready

**Decade row:**
- Replaces the current era pills (60s–20s) in the Discover filter panel
- Range: 50s through 2020s (50s, 60s, 70s, 80s, 90s, 00s, 10s, 20s — 8 decades)
- Single-select — click to activate, click again to deselect (same toggle behavior)
- URL param stays `era` — backend query logic unchanged

### Claude's Discretion
- Exact stacking and visual separation between search / AI / page-specific sections in the sidebar
- Decade row placement (within filter panel vs. band above artist grid)
- AI chat UI details (message bubbles, input box style, scroll behavior)
- How AI accesses current filter state and library for context-aware responses
- Search result rendering in the sidebar (compact artist chips vs. small cards)
- How many search results to show inline (suggest 5–8 max before "see all" link)

### Deferred Ideas (OUT OF SCOPE)
- Renaming "Discover" to "Search" in the nav
</user_constraints>

## Standard Stack

### Core
| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Svelte 5 runes (`$state`, `$derived`, `$effect`) | 5.x | Reactive state in components | Project standard — all components use it |
| SvelteKit `goto()` | 2.x | Navigation from sidebar results | Used throughout search/discover |
| SvelteKit `$page` store | 2.x | Read URL params for AI context | Already imported in layout |
| `getAiProvider()` from `$lib/ai/engine` | local | AI chat calls | The sole abstraction for all AI features |
| `searchArtistsAutocomplete()` from `$lib/db/queries` | local | FTS5 artist suggestions | Powers existing SearchBar |
| `searchTagsAutocomplete()` from `$lib/db/queries` | local | Tag suggestions | Already exists, same pattern |
| `aiState` from `$lib/ai/state.svelte` | local | AI ready guard | Already used in layout header |
| `PROMPTS` + `INJECTION_GUARD` from `$lib/ai/prompts` | local | AI chat prompts | All AI prompts live here |
| `externalContent()` from `$lib/ai/prompts` | local | Injection hardening | Mandatory for user input |

### Supporting
| Component | Version | Purpose | When to Use |
|-----------|---------|---------|-------------|
| `getProvider()` from `$lib/db/provider` | local | DB access for sidebar search | Lazy-import inside async functions (same as SearchBar pattern) |
| `tasteProfile` from `$lib/taste/profile.svelte` | local | Taste context for AI | Optional — already imported in sidebar |
| `page` store from `$app/stores` | 2.x | Read discover filter state (era, tags) | For AI companion context-awareness |

### Installation
No new dependencies needed. All required modules are already in the project.

## Architecture Patterns

### Recommended Project Structure (changes only)
```
src/
├── lib/
│   └── components/
│       └── RightSidebar.svelte          # PRIMARY: add sidebar-search + AI sections at top
├── routes/
│   └── discover/
│       └── +page.svelte                 # SECONDARY: expand ERA_OPTIONS, minor UI update
```

No new files are required. The phase is entirely modification of existing components.

### Pattern 1: RightSidebar Section Prepend

**What:** Add two new `<section class="sidebar-section">` blocks at the top of `RightSidebar.svelte`, before the existing `{#if isArtistPage}` conditional.

**When to use:** When new functionality must be visible regardless of page context (search + AI are always-on).

**How the current structure works:**
```svelte
<aside class="right-sidebar">
  <!-- NEW: Quick-search section (always shown) -->
  <section class="sidebar-section sidebar-search">
    <!-- search input + inline results -->
  </section>
  <div class="section-divider"></div>

  <!-- NEW: AI companion (conditional on aiState.status === 'ready') -->
  {#if aiState.status === 'ready'}
    <section class="sidebar-section ai-companion">
      <!-- chat input + message list -->
    </section>
    <div class="section-divider"></div>
  {/if}

  <!-- EXISTING: all the {#if isArtistPage} ... {:else if isGenrePage} ... {:else} blocks stay here unchanged -->
  {#if isArtistPage && artistData}
    ...
```

The existing sections sit below — no structural surgery needed.

### Pattern 2: Sidebar Search (mirrors SearchBar internals, simplified)

**What:** A stripped-down search input with autocomplete that navigates to existing routes on selection. Does NOT use the full `SearchBar.svelte` component (which has artist/tag toggle, large/normal sizing, and is too heavy for sidebar). Instead, a self-contained input + dropdown.

**Approach:** Inline autocomplete identical to `SearchBar.fetchSuggestions()` pattern — debounced input, `searchArtistsAutocomplete()` for artists, `searchTagsAutocomplete()` for tags. Show top 3 artist + top 3 tag results inline. "See all" link goes to `/search?q=...`.

**Key decisions:**
- Single input for both artists + tags (no mode toggle — auto-detect by trying both)
- OR: run both queries in parallel and show grouped results (preferred: artists first, then tags)
- Navigation: artist click → `goto('/artist/' + slug)`, tag click → `goto('/search?q=' + tag + '&mode=tag')`
- Close dropdown on blur (150ms delay, same as SearchBar pattern)

```svelte
<!-- Pattern: sidebar search with dual-query autocomplete -->
<script lang="ts">
  import { goto } from '$app/navigation';

  let searchQuery = $state('');
  let artistSuggestions = $state<Array<{name: string; slug: string; tags: string | null}>>([]);
  let tagSuggestions = $state<Array<{tag: string; artist_count: number}>>([]);
  let showDropdown = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function fetchSuggestions(q: string) {
    if (q.length < 2) {
      artistSuggestions = [];
      tagSuggestions = [];
      showDropdown = false;
      return;
    }
    const { getProvider } = await import('$lib/db/provider');
    const { searchArtistsAutocomplete, searchTagsAutocomplete } = await import('$lib/db/queries');
    const db = await getProvider();
    [artistSuggestions, tagSuggestions] = await Promise.all([
      searchArtistsAutocomplete(db, q, 4),
      searchTagsAutocomplete(db, q, 3)
    ]);
    showDropdown = artistSuggestions.length > 0 || tagSuggestions.length > 0;
  }

  function handleInput() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fetchSuggestions(searchQuery), 200);
  }

  function selectArtist(slug: string) {
    showDropdown = false;
    searchQuery = '';
    goto('/artist/' + slug);
  }

  function selectTag(tag: string) {
    showDropdown = false;
    searchQuery = '';
    goto('/search?q=' + encodeURIComponent(tag) + '&mode=tag');
  }
</script>
```

### Pattern 3: AI Companion Chat (mirrors Explore page pattern)

**What:** A compact chat interface in the sidebar, reusing `getAiProvider().complete()` and `PROMPTS.nlExplore` / `PROMPTS.nlExploreWithTaste` from the existing Explore page.

**Key difference from Explore page:** The sidebar companion is context-aware — it reads current page state (current filters, now-playing) from `$page.url.searchParams` and `playerState` to include in the system context.

**Context-building approach (Claude's discretion — recommended):** Read URL params directly inside the AI call:
```typescript
import { page } from '$app/stores';
import { get } from 'svelte/store';

function buildAiContext(): string {
  const url = get(page).url;
  const era = url.searchParams.get('era');
  const tags = url.searchParams.get('tags');
  const parts = [];
  if (tags) parts.push(`Current genre filters: ${tags}`);
  if (era) parts.push(`Current era filter: ${era}`);
  if (playerState.currentTrack) parts.push(`Now playing: ${playerState.currentTrack.artist} — ${playerState.currentTrack.title}`);
  return parts.join('. ');
}
```

**Chat message format:** Simple array of `{role: 'user' | 'assistant', text: string}` in local state. No history sent to AI (stateless per message, like Explore page). Sidebar space is limited — keep the conversation list short (last 4 messages max).

**Prompt pattern:**
```typescript
// Source: src/routes/explore/+page.svelte handleQuery()
const provider = getAiProvider();
if (!provider) return;

const context = buildAiContext();
const systemPrompt = INJECTION_GUARD + (context ? ` Context: ${externalContent(context)}` : '');
const response = await provider.complete(
  PROMPTS.nlExplore(userMessage),
  { systemPrompt, temperature: 0.8, maxTokens: 512 }
);
```

Use `maxTokens: 512` (not 1024) for sidebar — responses should be compact.

### Pattern 4: Decade Row (minimal change to discover page)

**What:** Add '50s' to `ERA_OPTIONS` and optionally adjust the visual presentation of the era pill section.

**Exact change:**
```typescript
// Before (line 12 of discover/+page.svelte):
const ERA_OPTIONS = ['60s', '70s', '80s', '90s', '00s', '10s', '20s'];

// After:
const ERA_OPTIONS = ['50s', '60s', '70s', '80s', '90s', '00s', '10s', '20s'];
```

Everything else — `toggleEra()`, `buildUrl()`, the `.era-pill` styles, the URL param — is unchanged.

**Placement (Claude's discretion — recommended):** Keep the era pills within the existing filter panel `<div class="filter-section">` block. With 8 pills they still fit in the 196px panel using `flex-wrap: wrap`. No layout restructuring needed.

### Anti-Patterns to Avoid

- **Importing full `SearchBar.svelte` into the sidebar:** It has artist/tag mode buttons, large/small sizing variants, and is designed for the main search experience. Build a leaner inline version.
- **Sending chat history to the AI:** The sidebar is not a full conversation engine (that's the Explore page). Each message is independent — stateless calls with the same context injection.
- **Making the layout pass filter state as props:** The sidebar already has access to `$page` — read URL params directly rather than threading props through PanelLayout and layout.svelte.
- **Showing a placeholder when AI is not ready:** Locked decision — the AI companion is either shown (status === 'ready') or completely absent. No "Enable AI" hint, no disabled state.
- **Using `$app/stores` `page` in SearchBar.svelte:** It works but couples the component to routing. The sidebar search should use `goto()` for navigation and NOT use the `page` store (it doesn't need current URL params).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Artist FTS autocomplete | Custom SQL LIKE query | `searchArtistsAutocomplete(db, q, 4)` | Already handles FTS5, LIKE fallback, prefix scoring |
| Tag autocomplete | Custom tag query | `searchTagsAutocomplete(db, q, 3)` | Already returns tag + artist_count |
| AI text generation | New fetch to AI server | `getAiProvider().complete(prompt, opts)` | Abstracts local/remote, already handles auth |
| Prompt injection hardening | Custom escaping | `externalContent()` + `INJECTION_GUARD` | Project-standard injection guard pattern |
| DB connection management | New provider init | `getProvider()` from `$lib/db/provider` | Handles Tauri vs web, connection pooling |

**Key insight:** The Explore page is a complete working reference for the AI companion chat pattern. The sidebar version is a smaller version of the same pattern, with context injection added.

## Common Pitfalls

### Pitfall 1: Svelte 5 Runes in Non-Runes Context
**What goes wrong:** Using `$state()` in a `.svelte` file that was previously working with Svelte 4 syntax causes syntax errors, or mixing `$derived` with legacy `$:` reactive statements.
**Why it happens:** The project uses Svelte 5 runes throughout — `RightSidebar.svelte` already uses `$state`, `$derived`. Stay consistent.
**How to avoid:** Keep all reactive variables as `$state()`. Derived values use `$derived()`. No `$:` reactive labels.
**Warning signs:** TypeScript errors mentioning `$state is not defined` or Svelte compiler errors about reactive syntax.

### Pitfall 2: Dropdown z-index Clipping
**What goes wrong:** The sidebar search dropdown gets clipped by the `overflow-y: auto` on `.right-sidebar`.
**Why it happens:** The sidebar CSS has `overflow-y: auto` which creates a new stacking context that clips `position: absolute` children.
**How to avoid:** Use `overflow: visible` on the sidebar-search section container, or use `position: fixed` with calculated coordinates for the dropdown. Simplest fix: contain the dropdown within the search section's own height by using `max-height` on the section when the dropdown is open.
**Warning signs:** Dropdown appears clipped at the bottom of the search input.

### Pitfall 3: Global Spacebar Handler Conflict
**What goes wrong:** Typing in the sidebar search or AI chat input triggers the global spacebar → play/pause handler from `+layout.svelte`.
**Why it happens:** The global `handleGlobalKeydown` checks `tag === 'INPUT'` but only for `e.key !== ' '`. If focus lands in a non-INPUT element (e.g., a contenteditable div), space could trigger playback.
**How to avoid:** Use standard `<input type="text">` or `<textarea>` for all sidebar inputs — the existing guard in `+layout.svelte` already filters these out correctly. Do not use contenteditable divs for chat input.

### Pitfall 4: AI Response Parsing in Sidebar Context
**What goes wrong:** The Explore page's `parseResponse()` expects numbered list format (`N. **Artist Name** — Description`). If the sidebar AI companion gets a different response format, it crashes silently.
**Why it happens:** The sidebar chat is general-purpose (not just artist recommendations), so the AI may respond with prose, not numbered lists.
**How to avoid:** The sidebar AI companion does NOT use `parseResponse()`. It displays the raw AI response as a chat message. Only the artist recommendation prompts (`nlExplore`, `nlExploreWithTaste`) need structured parsing — the sidebar uses these prompts but displays the entire response as text, relying on the AI to format it readably.

### Pitfall 5: Sidebar Overflow with AI Chat
**What goes wrong:** The AI chat message history grows and pushes the page-specific content (queue, now-playing) out of view.
**Why it happens:** The sidebar is flex-column with no fixed heights on sections.
**How to avoid:** Give the AI chat message list a `max-height` with `overflow-y: auto` (e.g., `max-height: 200px`). The sidebar is compact — 4 messages max, each capped in height. Or: keep only the last exchange (user + assistant) visible, with a "clear" button.

### Pitfall 6: `page` Store in Component Imports
**What goes wrong:** Importing `page` from `$app/stores` in `RightSidebar.svelte` fails during SSR or static prerendering because the store is only available in browser context.
**Why it happens:** The search page uses `prerender = true`. However, `RightSidebar` is only rendered in Tauri mode (`{#if tauriMode}` in layout), so SSR is not actually a concern here.
**How to avoid:** This is safe. The layout's Tauri guard means the sidebar only renders in the desktop app. Import `page` from `$app/stores` freely in `RightSidebar.svelte`. Guard with a try/catch if paranoid.

## Code Examples

Verified patterns from existing source files:

### AI Provider Check and Call (from explore/+page.svelte)
```typescript
// Source: src/routes/explore/+page.svelte lines 44-47, 109-134
import { getAiProvider } from '$lib/ai/engine';
import { PROMPTS, INJECTION_GUARD, externalContent } from '$lib/ai/prompts';

// Check readiness
const provider = getAiProvider();
if (!provider) return; // provider is null when not configured

// Make a call
const response = await provider.complete(prompt, {
  systemPrompt: INJECTION_GUARD,
  temperature: 0.8,
  maxTokens: 512  // smaller for sidebar (Explore uses 1024)
});
```

### AI State Guard (from src/routes/+layout.svelte lines 221-235)
```svelte
<!-- Source: src/routes/+layout.svelte — exact pattern to follow in sidebar -->
{#if aiState.status === 'ready'}
  <span class="ai-dot ready"></span>
{/if}
```

### FTS5 Autocomplete (from src/lib/components/SearchBar.svelte lines 19-36)
```typescript
// Source: src/lib/components/SearchBar.svelte fetchSuggestions()
const { getProvider } = await import('$lib/db/provider');
const { searchArtistsAutocomplete } = await import('$lib/db/queries');
const db = await getProvider();
suggestions = await searchArtistsAutocomplete(db, q); // default limit=5
```

### Tag Autocomplete (from src/lib/db/queries.ts line 1070)
```typescript
// Source: src/lib/db/queries.ts searchTagsAutocomplete()
// Returns: Array<{ tag: string; artist_count: number }>
const { searchTagsAutocomplete } = await import('$lib/db/queries');
const tagResults = await searchTagsAutocomplete(db, q, 3);
```

### Discover ERA_OPTIONS (from src/routes/discover/+page.svelte line 12)
```typescript
// Source: src/routes/discover/+page.svelte
// CURRENT:
const ERA_OPTIONS = ['60s', '70s', '80s', '90s', '00s', '10s', '20s'];
// AFTER Phase 37:
const ERA_OPTIONS = ['50s', '60s', '70s', '80s', '90s', '00s', '10s', '20s'];
```

### Sidebar Section Structure (from RightSidebar.svelte)
```svelte
<!-- Source: src/lib/components/RightSidebar.svelte — existing structure to follow -->
<section class="sidebar-section">
  <h4 class="section-label">Quick Search</h4>
  <!-- content here -->
</section>
<div class="section-divider"></div>
```

### Discover toggleEra (from discover/+page.svelte — unchanged by this phase)
```typescript
// Source: src/routes/discover/+page.svelte lines 79-82
// This function handles 50s correctly without modification:
function toggleEra(era: string) {
  const newEra = data.era === era ? '' : era;
  goto(buildUrl({ era: newEra }), { keepFocus: true, noScroll: true });
}
```

### Taste Context for AI (from explore/+page.svelte lines 35-41)
```typescript
// Source: src/routes/explore/+page.svelte
let tasteDescription = $derived(
  tasteProfile.tags
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10)
    .map((t) => t.tag)
    .join(', ')
);
// Use in prompt: PROMPTS.nlExploreWithTaste(query, tasteDescription)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Svelte 4 `$:` reactive | Svelte 5 `$state`, `$derived`, `$effect` | Project inception | All component state uses runes — don't mix |
| Direct DB invocation | `DbProvider` abstraction + `getProvider()` | Phase 1-2 | All DB access goes through provider interface |
| Hardcoded AI calls | `getAiProvider().complete()` abstraction | AI phases | Handles local/remote providers transparently |

**Current era pills:** The existing era pills section uses `display: flex; flex-wrap: wrap; gap: 4px` — 8 pills (adding '50s') will still wrap naturally within the 196px filter panel. No layout changes needed.

## Open Questions

1. **AI companion response format in sidebar**
   - What we know: The Explore page uses `parseResponse()` to extract numbered artist lists; the sidebar is a general-purpose chat
   - What's unclear: Should the sidebar always use artist-recommendation prompts (structured output) or allow free-form responses?
   - Recommendation: Use `nlExplore`/`nlExploreWithTaste` prompts and display raw response text. The AI will naturally format it as a numbered list when asked for artists; for general music knowledge questions it will respond in prose. Both are fine as text output.

2. **Tag results navigation target**
   - What we know: Clicking a tag in the sidebar goes to "the tag search page" (per locked decisions). The tag search page is `/search?q=TAG&mode=tag`.
   - What's unclear: Nothing — this is clear from the existing search route.
   - Recommendation: `goto('/search?q=' + encodeURIComponent(tag) + '&mode=tag')`.

3. **Sidebar width when hosting 8 decade pills**
   - What we know: The discover page's decade pills section already uses `flex-wrap: wrap` at 196px — the 7 existing pills wrap fine
   - What's unclear: Whether adding '50s' pushes the layout to an extra row in a visually awkward way
   - Recommendation: 8 pills at 10px font, ~26px each ≈ 208px unflowed. At 196px they wrap to two rows of 4 — this is fine and visually balanced. No CSS changes needed.

## Validation Architecture

> `workflow.nyquist_validation` is absent from `.planning/config.json` — treated as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Not detected (no test config files found in project) |
| Config file | None |
| Quick run command | `npm run check` (TypeScript + Svelte type checking) |
| Full suite command | `npm run check` |

### Phase Requirements → Test Map
| Behavior | Test Type | Automated Command | Notes |
|----------|-----------|-------------------|-------|
| Sidebar search shows artist results | manual-only | n/a | No test framework; verify visually in running app |
| Sidebar search navigates to `/artist/[slug]` | manual-only | n/a | Verify via Tauri CDP |
| Sidebar search tag click navigates to `/search?q=TAG&mode=tag` | manual-only | n/a | Verify via Tauri CDP |
| AI companion hidden when `aiState.status !== 'ready'` | manual-only | n/a | Verify with AI disabled |
| AI companion visible when `aiState.status === 'ready'` | manual-only | n/a | Verify with AI enabled |
| Decade row shows 8 pills (50s–20s) | manual-only | n/a | Visual check |
| Decade toggle works for '50s' | manual-only | n/a | Click + verify URL param |
| TypeScript compiles clean | automated | `npm run check` | Must pass |

### Sampling Rate
- **Per task commit:** `npm run check`
- **Per wave merge:** `npm run check`
- **Phase gate:** `npm run check` green before `/gsd:verify-work`

### Wave 0 Gaps
- No test infrastructure exists in this project — all verification is manual (via running app) + TypeScript type checking

## Sources

### Primary (HIGH confidence)
- `src/lib/components/RightSidebar.svelte` — existing structure, CSS variables, section patterns
- `src/routes/discover/+page.svelte` — ERA_OPTIONS, toggleEra, buildUrl patterns
- `src/routes/explore/+page.svelte` — complete AI chat pattern to mirror
- `src/lib/ai/engine.ts` — AiProvider interface, getAiProvider()
- `src/lib/ai/state.svelte.ts` — aiState, AiStatus type
- `src/lib/ai/prompts.ts` — PROMPTS, INJECTION_GUARD, externalContent()
- `src/lib/db/queries.ts` — searchArtistsAutocomplete, searchTagsAutocomplete signatures
- `src/lib/components/SearchBar.svelte` — debounced autocomplete pattern
- `src/routes/+layout.svelte` — aiState guard pattern, RightSidebar prop passing

### Secondary (MEDIUM confidence)
- `src/lib/components/PanelLayout.svelte` — sidebar overflow context (overflow: hidden on container)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are project-internal, inspected directly
- Architecture: HIGH — all integration points verified from source code
- Pitfalls: HIGH (overflow/z-index pitfalls) / MEDIUM (AI response format pitfall — informed by Explore page design)

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable internal codebase)
