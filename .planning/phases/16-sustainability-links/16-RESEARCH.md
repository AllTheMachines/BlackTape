# Phase 16: Sustainability Links - Research

**Researched:** 2026-02-24
**Domain:** UI rendering, Mastodon URL scheme, Nostr NIP-51 event fetch
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Funding link presentation (artist pages)**
- Separate labeled "Support" section, visually distinct from the info and social link sections
- Each funding link displayed as: icon + platform name as a text link (e.g., ♥ Patreon | ☕ Ko-fi)
- Section is hidden entirely when no funding links exist — no empty "Support" heading
- Section sits after info/social links, near the bottom of the artist page (non-intrusive positioning)

**Mastodon share UX**
- Small share icon in the artist page header (and scene page header)
- Always visible, not hidden in an overflow menu
- Pre-populated post text: "[Artist Name] on Mercury — [mercury://artist/ID]" (artist name + deep link, no extra copy)
- Instance routing: use a universal redirect service (e.g., sharetomastodon.app) — user picks their instance on the redirect page, no Mercury-side setup needed

**Mercury About screen**
- Add a "Support" section near the bottom of the About screen, after version/credits info
- Tone: mission-led — one sentence explaining the project's values, then the links
  - Exact copy: *"Mercury runs on no ads, no tracking, no VC money — just people who care about music."*
- Links listed: Ko-fi | GitHub Sponsors | Open Collective
- "View backers" link adjacent to the Support section, linking to the Backer Credits screen

**Backer credits screen**
- Simple scrollable list of backer names (no grid, no tiers)
- Fetch on screen open, show a loading state while fetching from Nostr
- If fetch fails or returns nothing: quiet message "Could not load backers" + retry button
- Small CTA at the bottom: "Want to be listed? Support Mercury" → links back to support options

### Claude's Discretion
- Exact icon choices for each funding platform (use recognizable brand icons if available, fallback to generic heart/coin icon)
- Nostr relay selection and fetch implementation details
- Loading skeleton vs spinner for backer list loading state
- Exact typography, spacing, and color treatment within the "Support" section

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SUST-01 | User can see Patreon/Ko-fi/crowdfunding links for artists on artist pages, visually distinguished from info/social links | Support links already reach the UI via `categorize.ts` and the `categorizedLinks.support` array — phase is rendering what already exists |
| SUST-02 | User can share any artist or scene page to the Fediverse via a pre-populated Mastodon share link (URL-scheme only, no AP protocol) | sharetomastodon.github.io or mastodonshare.com — plain `<a>` tag with URL-encoded query params, zero new libraries |
| SUST-03 | User can view Mercury project funding links (Ko-fi, GitHub Sponsors, Open Collective) in the About screen | Static HTML addition to `src/routes/about/+page.svelte`, no data fetching |
| SUST-04 | User can view a backer credits screen listing Mercury supporters, fetched from a Nostr list event | NDK `fetchEvents` with `{ kinds: [30000], authors: [MERCURY_PUBKEY], '#d': ['backers'] }` — same pattern used in rooms.svelte.ts |
</phase_requirements>

---

## Summary

Phase 16 is almost entirely a rendering and UI wiring task. The heavy lifting was done in Phase 15: `categorize.ts` already categorizes MusicBrainz URLs with `type: 'crowdfunding'` and `type: 'patronage'` into `categorizedLinks.support[]`, and the artist page already iterates over `LINK_CATEGORY_ORDER` to render all categories including `support`. What does not yet exist is a visually distinct "Support" section that separates funding links from the rest of the link display — the current code renders all categories in a single unified `<section class="links-section">` block with no special treatment for `support`.

The Mastodon share feature requires zero new libraries. The decided approach — a universal redirect service — means Mercury just constructs a URL like `https://sharetomastodon.github.io/?text=[encoded-text]` and opens it. The share icon in the artist/scene header is a small `<a>` element pointing to this URL. No JavaScript, no API calls, no NDK involvement.

The About screen support section is static markup appended to an existing Svelte file. The backer credits screen is a new route (`/backers`) that on mount calls `ndk.fetchEvents()` with a filter targeting a specific Mercury-controlled kind:30000 NIP-51 list event by pubkey + d-tag. This is the same fetch pattern already established in `rooms.svelte.ts`.

**Primary recommendation:** Wire SUST-01 as a CSS/markup separation in the existing artist page link block. SUST-02 as an `<a>` tag in header. SUST-03 as static section in About. SUST-04 as a new `/backers` route using the existing NDK singleton pattern from `nostr.svelte.ts`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nostr-dev-kit/ndk` | ^3.0.0 (already in deps) | Fetch backer list from Nostr | Already used throughout Mercury for rooms, DMs, scenes |
| SvelteKit routing | (project version) | New `/backers` page route | Project's framework |
| `nostr-tools` | ^2.23.1 (already in deps) | Keypair and pubkey utilities | Already used in keypair.ts |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `idb` | ^8.0.3 (already in deps) | IndexedDB access for keypair | Already used — keypair.ts |
| `sharetomastodon.github.io` | (external service) | Mastodon instance routing | SUST-02 only — no install, URL-only |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `sharetomastodon.github.io` | `mastodonshare.com` | Both work identically; sharetomastodon is open-source and GitHub-hosted, lower dependency risk |
| `sharetomastodon.github.io` | Prompt user for instance + redirect locally | More work, stores instance preference; CONTEXT.md decision locks to redirect service |
| kind:30000 NIP-51 list | Custom Nostr event kind | kind:30000 is the NIP-51 standard "follow sets" addressable list — well-supported by all relays |

**Installation:** No new packages required. STATE.md confirms: "Zero new npm packages needed for v1.3."

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── routes/
│   ├── artist/[slug]/+page.svelte   # SUST-01: add Support section, SUST-02: add share icon
│   ├── scenes/[slug]/+page.svelte   # SUST-02: add share icon to scene header
│   ├── about/+page.svelte           # SUST-03: add Support section + "View backers" link
│   └── backers/
│       └── +page.svelte             # SUST-04: new route — backer credits list
└── lib/
    └── comms/
        └── backers.ts               # SUST-04: fetchBackers() function (optional, can inline in page)
```

### Pattern 1: Support Section in Artist Page (SUST-01)

**What:** The existing link section renders all categories generically. Add a dedicated `<section class="support-section">` that renders only `categorizedLinks.support` with distinct visual treatment, outside the generic `links-section` block.

**When to use:** When `data.categorizedLinks.support.length > 0`. Section hidden entirely when empty (locked decision).

**Example:**
```svelte
<!-- After the links-section block, before AI Recommendations -->
{#if data.categorizedLinks.support.length > 0}
  <section class="support-section">
    <h3 class="support-heading">Support</h3>
    <div class="support-links">
      {#each data.categorizedLinks.support as link}
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          class="support-link"
        >
          {supportIcon(link.label)}{link.label}
        </a>
      {/each}
    </div>
  </section>
{/if}
```

**Icon mapping (Claude's discretion):** A simple lookup in the component script:
```typescript
function supportIcon(label: string): string {
  if (label.toLowerCase().includes('patreon')) return '♥ ';
  if (label.toLowerCase().includes('ko-fi')) return '☕ ';
  if (label.toLowerCase().includes('kickstarter')) return '🚀 ';
  return '♡ '; // generic fallback
}
```

The `labelFromUrl()` function in `categorize.ts` already returns `'Patreon'` for `patreon.com` and `'Ko-fi'` for `ko-fi.com`, so these labels are already clean. No changes to `categorize.ts` needed.

### Pattern 2: Mastodon Share Button (SUST-02)

**What:** An `<a>` tag in the artist/scene page header that opens the universal share redirect with pre-populated text. Pure HTML, no JavaScript.

**URL construction:**
- Share text: `"{Artist Name} on Mercury — mercury://artist/{mbid}"`
- Encoded: `encodeURIComponent(text)`
- Full URL: `https://sharetomastodon.github.io/?text=${encoded}`

**Example (in artist page header, after existing name-row buttons):**
```svelte
<!-- In .artist-name-row, after RssButton -->
<a
  href="https://sharetomastodon.github.io/?text={encodeURIComponent(`${data.artist.name} on Mercury — mercury://artist/${data.artist.mbid}`)}"
  target="_blank"
  rel="noopener noreferrer"
  class="share-mastodon-btn"
  aria-label="Share on Mastodon"
  title="Share on Mastodon"
>
  ↑
</a>
```

Note: Using `encodeURIComponent` in a Svelte template attribute is valid — Svelte compiles this as standard JS expression in the `href`. If this causes template parsing issues, move to a `$derived` expression in the script block instead.

**Scene page share:** Same pattern in the `scene-title-row` div, with text: `"{Scene Name} scene on Mercury — mercury://scene/{slug}"`.

### Pattern 3: About Screen Support Section (SUST-03)

**What:** Append a `<section class="about-section">` to the existing About page with the exact mission copy, three links, and a "View backers" link. Static markup only.

**Position:** After the "Data sources" section, before the `.about-ctas` block.

**Example:**
```svelte
<section class="about-section">
  <h2>Support</h2>
  <p>Mercury runs on no ads, no tracking, no VC money — just people who care about music.</p>
  <div class="support-links-row">
    <a href="https://ko-fi.com/mercury-app" target="_blank" rel="noopener noreferrer">Ko-fi</a>
    <a href="https://github.com/sponsors/mercury-app" target="_blank" rel="noopener noreferrer">GitHub Sponsors</a>
    <a href="https://opencollective.com/mercury" target="_blank" rel="noopener noreferrer">Open Collective</a>
  </div>
  <a href="/backers" class="view-backers-link">View backers →</a>
</section>
```

Note: The actual URLs for Ko-fi/GitHub Sponsors/Open Collective are placeholders until Mercury has live accounts. Use placeholder URLs for now with a TODO comment — or hardcode the real URLs if available.

### Pattern 4: Backer Credits Screen (SUST-04)

**What:** New route at `/backers`. On mount, initializes Nostr (if needed) and fetches a kind:30000 NIP-51 addressable list event authored by Mercury's public key with `d: 'backers'`. Extracts `p` tags from the event (each `p` tag contains a pubkey). Optionally resolves pubkeys to display names via kind:0 profile fetch.

**NDK fetch pattern** (mirrors `rooms.svelte.ts` exactly):
```typescript
// In +page.svelte onMount, after initNostr()
const { ndkState } = await import('$lib/comms/nostr.svelte.js');
const { ndk } = ndkState;
if (!ndk) { error = 'Could not load backers'; return; }

const events = await ndk.fetchEvents({
  kinds: [30000],
  authors: [MERCURY_PUBKEY],  // Mercury's Nostr public key (hex)
  '#d': ['backers']
});
```

**Event structure expected:**
```json
{
  "kind": 30000,
  "pubkey": "<MERCURY_PUBKEY>",
  "tags": [
    ["d", "backers"],
    ["p", "<backer_pubkey_1>"],
    ["p", "<backer_pubkey_2>"],
    ["name", "Alice"],
    ["name", "Bob"]
  ],
  "content": ""
}
```

**Important design choice (Claude's discretion):** The backer list event can store display names either:
1. As `["p", "<pubkey>"]` tags → requires resolving kind:0 profiles, adds async complexity
2. As custom `["name", "<display_name>"]` tags → simpler, controlled by Mercury, no profile fetch needed

**Recommendation: Use custom `["name", "<display_name>"]` tags.** This avoids a second round of Nostr fetches (kind:0 profile resolution), is faster, works offline for relay-cached events, and lets Mercury control exactly what name shows. The backer credits list is Mercury-curated (Mercury publishes the event), not user-self-reported — so Mercury controls the content. The `p` tags become optional (for verification/linking) and `name` tags carry the display name.

**Simplified event structure:**
```json
{
  "kind": 30000,
  "tags": [
    ["d", "backers"],
    ["name", "Alice K."],
    ["name", "Bob M."],
    ["name", "Carol Z."]
  ]
}
```

**Page state machine:**
```typescript
type FetchState = 'loading' | 'loaded' | 'empty' | 'error';
let fetchState = $state<FetchState>('loading');
let backers = $state<string[]>([]);
```

**MERCURY_PUBKEY:** This is a constant representing Mercury's dedicated Nostr identity (not the user's keypair). It should be stored in `src/lib/config.ts` or a new `src/lib/comms/constants.ts`. Mercury must generate this keypair once (outside the app) and hardcode the pubkey. The event itself is published separately by the project maintainer (Steve), not by the app.

### Anti-Patterns to Avoid

- **Modifying `LINK_CATEGORY_ORDER`** to remove `support` from the generic links section: Instead, render the generic links section with a filter that skips `support`, then render the distinct Support section separately. This keeps LINK_CATEGORY_ORDER intact for other uses.
- **Hiding support links by removing them from the generic section**: The simplest approach is to keep the existing generic loop but add a condition `{#if category !== 'support'}` — support links are then rendered exclusively in the new dedicated section.
- **Using `window.open()` for the Mastodon share URL**: An `<a target="_blank">` is simpler, works in Tauri's WebView2, and follows the same pattern as other external links throughout the app.
- **Fetching kind:0 profiles for every backer pubkey**: This adds N+1 Nostr fetches on page load. Use `name` tags in the list event instead (see above).
- **Storing `MERCURY_PUBKEY` in environment variables or .env**: This is a public key — it's not a secret. Hardcode it in `config.ts` or `constants.ts`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mastodon instance routing | Custom instance-picker UI with localStorage | `sharetomastodon.github.io` redirect | Decision is locked; the redirect service handles instance selection and memory |
| Nostr event fetching | Raw WebSocket connection to relay | `ndk.fetchEvents()` (existing NDK instance) | NDK already handles relay pool, connection management, deduplication — 3 lines vs 100+ |
| Display name resolution for backers | Kind:0 profile fetch per backer | `name` tags directly in the list event | Avoids N+1 relay fetches; Mercury curates the event content |
| Funding platform icons | SVG icon library | Unicode characters + CSS (♥, ☕, ♡) | No additional bundle weight; labels already carry platform name from `labelFromUrl()` |

**Key insight:** This phase is almost entirely a UI rendering task. The data pipeline (MusicBrainz → categorize.ts → categorizedLinks.support) and the Nostr infrastructure (NDK, keypair, relay pool) already exist. The work is wiring existing data to new visual slots.

---

## Common Pitfalls

### Pitfall 1: Support Links Appearing in Both Sections

**What goes wrong:** The existing artist page renders all categories via `{#each LINK_CATEGORY_ORDER as category}`. After adding a dedicated Support section, support links will appear twice: once in the generic loop and once in the new section.

**Why it happens:** Forgetting to add `{#if category !== 'support'}` guard to the generic loop.

**How to avoid:** In the existing `{#each LINK_CATEGORY_ORDER as category}` block, add `{#if category !== 'support'}` around or before the `{#if links.length > 0}` check. Keep the Support section render completely separate.

**Warning signs:** Seeing support link platform names appear twice on an artist page with Patreon/Ko-fi links.

### Pitfall 2: encodeURIComponent in Svelte Template Attribute

**What goes wrong:** Calling `encodeURIComponent()` directly in an `href` attribute template string may require careful escaping because `{}` in href attributes in Svelte 5 is the expression delimiter.

**Why it happens:** Template string with `${}` inside Svelte `{}` braces can confuse the compiler.

**How to avoid:** Use a `$derived` in the script block:
```typescript
let mastodonShareUrl = $derived(
  `https://sharetomastodon.github.io/?text=${encodeURIComponent(`${data.artist.name} on Mercury — mercury://artist/${data.artist.mbid}`)}`
);
```
Then in template: `href={mastodonShareUrl}`.

**Warning signs:** TypeScript/Svelte check errors on the href attribute.

### Pitfall 3: NDK Not Initialized When Backers Page Mounts

**What goes wrong:** User navigates directly to `/backers` before Nostr is initialized. `ndkState.ndk` is null, fetch fails silently.

**Why it happens:** `initNostr()` is called in `+layout.svelte` as fire-and-forget but may not have resolved by the time the backers page mounts.

**How to avoid:** In the backers page `onMount`, call `initNostr()` explicitly (it's idempotent — safe to call multiple times per `nostr.svelte.ts` line 34: `if (ndkState.connected) return;`). Then use `ndkState.ndk`.

**Warning signs:** `fetchState` stays `'loading'` indefinitely or jumps to `'error'` immediately.

### Pitfall 4: MERCURY_PUBKEY Not Yet Set

**What goes wrong:** The backer list event must be published by Mercury's Nostr identity. If no MERCURY_PUBKEY is defined, the filter `authors: [MERCURY_PUBKEY]` will fetch nothing (or fetch from wrong pubkey if using the user's keypair).

**Why it happens:** Mercury's project Nostr identity is separate from each user's auto-generated keypair. The keypair for the project itself must be generated once by Steve and the pubkey hardcoded.

**How to avoid:** Define `MERCURY_PUBKEY` as a constant in `src/lib/config.ts`. If the actual key doesn't exist yet, use an empty string and gate the fetch: if `!MERCURY_PUBKEY` show "Backer credits coming soon". This allows the UI to ship before the Nostr identity is established.

**Warning signs:** Backer list always empty even after publishing the event.

### Pitfall 5: kind:30000 Event Not Found on All Relays

**What goes wrong:** Mercury publishes the backer list to one relay but `fetchEvents` times out or returns empty because the event hasn't propagated to all relays in the Mercury pool.

**Why it happens:** Nostr relay propagation is not instant and not guaranteed across all relays.

**How to avoid:** Publish the backer list event to all 4 Mercury relays explicitly. In the fetch, use `closeOnEose: true` (default for `fetchEvents`) and handle the empty case gracefully with the "Could not load backers" + retry UI.

**Warning signs:** Backers appear on some test runs and not others.

---

## Code Examples

Verified patterns from existing codebase:

### NDK fetchEvents (from rooms.svelte.ts — verified working pattern)
```typescript
// Source: D:/Projects/Mercury/src/lib/comms/rooms.svelte.ts
const events = await ndk.fetchEvents({
  kinds: [40],
  '#t': tagFilter,
  limit: 100
});
```

Adapted for backer list:
```typescript
const events = await ndk.fetchEvents({
  kinds: [30000],
  authors: [MERCURY_PUBKEY],
  '#d': ['backers']
});
```

### Mastodon Share URL (from sharetomastodon.github.io — verified)

```typescript
// Source: https://sharetomastodon.github.io/about/ — confirmed URL format
const text = `${artistName} on Mercury — mercury://artist/${mbid}`;
const shareUrl = `https://sharetomastodon.github.io/?text=${encodeURIComponent(text)}`;
```

Alternative (mastodonshare.com also supports `?text=` parameter):
```typescript
const shareUrl = `https://mastodonshare.com/?text=${encodeURIComponent(text)}`;
```

Both are confirmed working. `sharetomastodon.github.io` is open-source and GitHub Pages hosted (lower external dependency risk).

### Svelte conditional section (support links hidden when empty)
```svelte
<!-- Source: pattern from existing artist page — same conditional idiom -->
{#if data.categorizedLinks.support.length > 0}
  <section class="support-section">
    <!-- ... -->
  </section>
{/if}
```

### NDK initNostr idempotent call (from nostr.svelte.ts — verified)
```typescript
// Source: D:/Projects/Mercury/src/lib/comms/nostr.svelte.ts line 34
export async function initNostr(): Promise<void> {
  if (ndkState.connected) return;  // safe to call multiple times
  // ...
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Social share popups (Twitter/FB share dialogs) | URL-scheme redirect via third-party sharer | Post-Mastodon mainstream (2022+) | No JS required; user selects their own instance |
| NIP-51 kind:30001 generic lists | kind:30000+ named sets with d-tag | NIP-51 revision (2023) | kind:30001 deprecated; kind:30000 is current standard for people lists |

**Deprecated/outdated:**
- kind:30001 with `d: "mute"` has been replaced by kind:10000 (mute list). kind:30000 itself remains the correct kind for addressable follow/people sets.
- STATE.md note says "backer credits Nostr event kind: kind:30000 with `d` tag (NIP-51 addressable list) — confirm against NIP-51 spec during Phase 16". Confirmed: kind:30000 is still active and correct per the current NIP-51 spec.

---

## Open Questions

1. **MERCURY_PUBKEY — does it exist yet?**
   - What we know: No Mercury project Nostr identity has been mentioned in any existing code. Each user gets their own auto-generated keypair via `loadOrCreateKeypair()`. The backer list must be authored by a single known Mercury pubkey.
   - What's unclear: Whether Steve has already generated a project-level Nostr keypair for Mercury.
   - Recommendation: Add `MERCURY_PUBKEY = ''` to `config.ts` as a placeholder. Gate the backer fetch on `MERCURY_PUBKEY !== ''`. This ships the UI without breaking when the key isn't set. Steve can fill it in when the identity is established.

2. **Actual Ko-fi / GitHub Sponsors / Open Collective URLs**
   - What we know: Mercury doesn't yet have registered accounts on these platforms (no URLs referenced anywhere in the codebase).
   - What's unclear: Whether these accounts exist or need to be created before phase ships.
   - Recommendation: Use obvious placeholder URLs (e.g., `https://ko-fi.com/mercury`) with a TODO comment. These are pure string literals in a Svelte file — trivial to update without a code change.

3. **Support section appearance in generic link block**
   - What we know: `LINK_CATEGORY_ORDER` includes `'support'`. The artist page currently renders all categories via this array.
   - What's unclear: Whether the intent is to remove support from the generic loop entirely (so it only appears in the dedicated Support section) or to show it in both places.
   - Recommendation: Remove `'support'` from the rendered generic loop (add `{#if category !== 'support'}` guard). The dedicated Support section below takes over. This matches the "visually distinct" requirement.

---

## Sources

### Primary (HIGH confidence)
- `D:/Projects/Mercury/src/lib/embeds/categorize.ts` — confirms `'crowdfunding'` and `'patronage'` MB types already map to `'support'` category; `patreon.com` and `ko-fi.com` already have friendly labels in `FRIENDLY_NAMES`
- `D:/Projects/Mercury/src/lib/comms/rooms.svelte.ts` — verified NDK `fetchEvents` pattern with `'#t'` tag filter; same pattern adapts to `'#d'` for kind:30000
- `D:/Projects/Mercury/src/lib/comms/nostr.svelte.ts` — verified `initNostr()` idempotent guard; confirmed Mercury relay pool (4 relays)
- `D:/Projects/Mercury/src/routes/artist/[slug]/+page.svelte` — full artist page structure, header layout, existing link section rendering
- `D:/Projects/Mercury/src/routes/about/+page.svelte` — current About page structure for where to insert support section
- `D:/Projects/Mercury/package.json` — confirmed `@nostr-dev-kit/ndk ^3.0.0` and `nostr-tools ^2.23.1` already in dependencies; no new packages needed
- NIP-51 spec (https://nostr-nips.com/nip-51) — confirmed kind:30000 is the current addressable list kind for people sets; `d` tag is the identifier; `p` tags reference pubkeys; kind not deprecated

### Secondary (MEDIUM confidence)
- https://sharetomastodon.github.io/about/ — confirmed URL format: `?text=<encoded>` and `?url=<encoded>` parameters; open-source GitHub Pages project
- https://mastodonshare.com/ — confirmed also supports `?text=<encoded>` parameter as alternative

### Tertiary (LOW confidence)
- STATE.md claim "kind:30000 with `d` tag — confirm against NIP-51 spec during Phase 16": now elevated to HIGH after NIP-51 verification above.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all libraries in-use and verified in codebase
- Architecture: HIGH — patterns copied directly from existing codebase (`rooms.svelte.ts`, `categorize.ts`)
- Pitfalls: HIGH — pitfalls derived from reading the actual existing code that will be modified
- Mastodon share URL: HIGH — verified directly against the service's own about page
- Nostr NIP-51 kind:30000: HIGH — verified against official NIP-51 spec

**Research date:** 2026-02-24
**Valid until:** 2026-04-24 (stable APIs and specs — NDK, NIP-51, Mastodon share URL format are all stable)
