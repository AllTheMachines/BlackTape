# Phase 31: v1 Prep - Research

**Researched:** 2026-02-27
**Domain:** Svelte component cleanup / dead feature removal
**Confidence:** HIGH

## Summary

This phase removes community features (Scenes nav link, Chat button, ChatOverlay, Nostr init, FediverseSettings, artist page room buttons) from all visible UI surfaces. The code is preserved intact — only render paths and imports are removed. No new dependencies. No architectural changes. Pure subtraction.

All six files that need changes have been read and their exact current content recorded below. Line numbers reflect the file state as of 2026-02-27.

**Primary recommendation:** Remove each community surface surgically — delete the render statement or JSX block, then remove the import if it becomes fully unused. Unused CSS classes can be removed alongside for cleanliness, but are not required for correctness.

There is one additional community surface found beyond the original spec: `src/routes/crate/+page.svelte` has an "Open scene room" button that also needs removal. Total affected files: 5 (not 4 as originally specified).

---

## File-by-File Findings

### FILE 1: `src/routes/+layout.svelte`

**Current state — exact code to remove:**

#### 1a. Imports (lines 26-29)
```svelte
	import { initNostr } from '$lib/comms/nostr.svelte.js';
	import { subscribeToIncomingDMs } from '$lib/comms/dms.svelte.js';
	import { totalUnread, chatState, openChat } from '$lib/comms/notifications.svelte.js';
	import ChatOverlay from '$lib/components/chat/ChatOverlay.svelte';
```

#### 1b. Nostr init call in `onMount` (lines 50-52)
```svelte
		// Initialize Nostr communication layer — fire-and-forget, does not block layout render
		// Runs on both web and Tauri — IndexedDB available in all environments
		initNostr().then(() => subscribeToIncomingDMs()).catch(e => console.warn('[comms] Nostr init:', e));
```

#### 1c. Tauri nav — "Scenes" link (line 158)
```svelte
			<a href="/scenes" class="nav-link" class:active={$page.url.pathname.startsWith('/scenes')}>Scenes</a>
```

#### 1d. Tauri nav — Chat button (lines 167-178)
```svelte
			<button
				class="nav-chat-btn"
				class:active={chatState.open}
				onclick={() => openChat('dms')}
				aria-label="Open chat"
				title="Messages"
			>
				Chat
				{#if totalUnread() > 0}
					<span class="nav-badge">{totalUnread() > 99 ? '99+' : totalUnread()}</span>
				{/if}
			</button>
```

#### 1e. Web nav — "Scenes" link (line 201)
```svelte
			<a href="/scenes" class="nav-link" class:active={$page.url.pathname.startsWith('/scenes')}>Scenes</a>
```

#### 1f. Web nav — Chat button (lines 205-207)
```svelte
			<button class="nav-chat-btn" onclick={() => openChat('dms')} aria-label="Open chat" title="Messages">
				Chat
				{#if totalUnread() > 0}<span class="nav-badge">{totalUnread() > 99 ? '99+' : totalUnread()}</span>{/if}
			</button>
```

#### 1g. ChatOverlay render (lines 252-253)
```svelte
<!-- Chat overlay — present on all pages, slides in on demand -->
<ChatOverlay />
```

**Imports that become fully unused after removal:**
- `initNostr` — remove from line 26
- `subscribeToIncomingDMs` — remove from line 27
- `totalUnread`, `chatState`, `openChat` — remove entire line 28
- `ChatOverlay` — remove line 29

**CSS classes that become dead (can optionally clean up):**
- `.nav-chat-btn` (lines 336-352)
- `.nav-chat-btn:hover` / `.nav-chat-btn.active` (lines 349-352)
- `.nav-badge` (lines 355-368)

**Gotcha:** The `$page` store import on line 5 is still used for `$page.url.pathname` (canGoBack, isEmbed, and the remaining active-class checks). Do NOT remove it.

---

### FILE 2: `src/routes/artist/[slug]/+page.svelte`

**Current state — exact code to remove:**

#### 2a. Import (line 19)
```svelte
	import { openChat, chatState } from '$lib/comms/notifications.svelte.js';
```

#### 2b. Function `openRoomsForArtist` (lines 191-195)
```svelte
	/** Open the chat overlay in rooms view for this artist's primary tag. */
	function openRoomsForArtist() {
		chatState.view = 'rooms';
		openChat('rooms');
	}
```

#### 2c. "Explore {tag} scene" link panel (lines 444-451)
```svelte
			<div class="explore-scene-panel">
				<a
					href="/kb/genre/{tags[0].toLowerCase().replace(/\s+/g, '-')}"
					class="explore-scene-link"
				>
					Explore {tags[0]} scene →
				</a>
			</div>
```

#### 2d. "Scene rooms for {tag}" section (lines 463-468)
```svelte
			<!-- Scene Rooms discovery link -->
			<section class="scene-rooms-hint">
				<button onclick={openRoomsForArtist} class="rooms-link">
					Scene rooms for {tags[0]} &rarr;
				</button>
			</section>
```

**Imports that become fully unused after removal:**
- `openChat` and `chatState` — the entire import on line 19 can be removed (neither symbol is used anywhere else in this file)

**CSS classes that become dead (can optionally clean up):**
- `.explore-scene-panel` (lines 863-865)
- `.explore-scene-link` (lines 867-876)
- `.explore-scene-link:hover` (lines 874-877)
- `.scene-rooms-hint` (lines 894-896)
- `.rooms-link` (lines 898-907)
- `.rooms-link:hover` (lines 909-912)

**Gotcha:** The `style-map-cross-link` block (lines 453-461) and the tag chips above it (lines 430-442) are KEPT — they are not community features. Only the two specific panels identified above are removed.

---

### FILE 3: `src/routes/settings/+page.svelte`

**Current state — exact code to remove:**

#### 3a. Import (line 5)
```svelte
	import FediverseSettings from '$lib/components/FediverseSettings.svelte';
```

#### 3b. FediverseSettings render (lines 650-651)
```svelte
		<div class="section-separator"></div>
		<FediverseSettings />
```

#### 3c. Spotify localhost text fix (line 509)

**Current text (line 509):**
```html
<p class="import-card-desc">Requires a Spotify Client ID from <a href="https://developer.spotify.com" target="_blank" rel="noopener noreferrer">developer.spotify.com</a>. You must add <code>http://localhost</code> as a redirect URI in your app settings.</p>
```

**Change:** Replace `http://localhost` with `http://127.0.0.1`

**Result:**
```html
<p class="import-card-desc">Requires a Spotify Client ID from <a href="https://developer.spotify.com" target="_blank" rel="noopener noreferrer">developer.spotify.com</a>. You must add <code>http://127.0.0.1</code> as a redirect URI in your app settings.</p>
```

**Imports that become fully unused after removal:**
- `FediverseSettings` — remove line 5

**Gotcha:** The `<div class="section-separator"></div>` on line 650 is the separator that precedes FediverseSettings. It should be removed along with the component since without FediverseSettings it just adds a floating separator at the end of the page.

---

### FILE 4: `src/routes/scenes/+page.svelte`

**Current state:** The page already has a `v2-notice` banner at the top (lines 71-74):
```svelte
	<div class="v2-notice">
		<span class="v2-badge">Coming in v2</span>
		Scenes are being redesigned for a better community experience. Check back in the next major release.
	</div>
```

**Phase 31 action:** The scenes page itself is NOT deleted — it just needs to be unreachable via nav (handled by removing the nav link in FILE 1). The page already has the v2-notice banner. No code changes needed in this file for Phase 31.

---

### FILE 5: `src/routes/room/[channelId]/+page.svelte`

**Current state:** The room page already has a `v2-notice` banner at the top (lines 98-101):
```svelte
	<div class="v2-notice">
		<span class="v2-badge">Coming in v2</span>
		Listening Rooms are being redesigned for a better community experience. Check back in the next major release.
	</div>
```

**Phase 31 action:** The room page is NOT deleted — it just needs to be unreachable via nav (it's only reachable from the scenes page or direct URL; both are fine to leave). No code changes needed in this file for Phase 31.

---

### FILE 6 (UNEXPECTED): `src/routes/crate/+page.svelte`

**Found during research:** The Crate Dig page has an "Open scene room" button that was not in the original spec.

#### 6a. Import (line 8)
```svelte
	import { openChat, chatState } from '$lib/comms/notifications.svelte.js';
```

#### 6b. "Open scene room" button (lines 170-173)
```svelte
								<button
									class="crate-cross-link crate-room-link"
									onclick={() => { chatState.view = 'rooms'; openChat('rooms'); }}
								>Open scene room →</button>
```

**Imports that become fully unused after removal:**
- `openChat` and `chatState` — the entire import on line 8 can be removed (neither symbol is used elsewhere in this file)

**Gotcha:** The surrounding structure has an `{#if artist.tags}` block. Only the `<button>` element (4 lines) needs to be removed. The `<a>` tag before it ("Explore in Style Map") and the `{#if artist.tags}` wrapper remain intact.

---

## Architecture Patterns

### Code-Only Removal (Not Deletion) — Correct Approach

All community feature source files (`$lib/comms/`, `$lib/components/chat/`, etc.) are preserved exactly as-is. This is the right call because:

1. **Git history** — Code is preserved for future v2 reintroduction
2. **No Rust/Tauri changes needed** — Nostr and listening room Rust commands don't need to change
3. **No type errors** — The modules still export their types; just nothing imports them in the affected routes
4. **Test suite** — Existing E2E tests for Scenes and Room pages (marked as skip) can stay as-is

### Svelte Import Cleanup Rules

In Svelte 5, unused imports produce TypeScript/compiler warnings. Remove an import when ALL named exports from that import are no longer referenced in the file. Never remove an import if even one named export is still used.

**Safe to fully remove:**
- Line 26 (`initNostr`) — only used in the removed onMount block
- Line 27 (`subscribeToIncomingDMs`) — only used in the removed onMount block
- Line 28 (`totalUnread, chatState, openChat`) — all three used only in the removed nav buttons
- Line 29 (`ChatOverlay`) — used only in the removed render line

**Do NOT remove:**
- `$app/stores` (`page`) in layout — still used for `canGoBack`, `isEmbed`, remaining active-class nav links
- `$lib/platform` (`isTauri`) in layout — still used for all the `{#if tauriMode}` blocks

---

## Common Pitfalls

### Pitfall 1: Partial import removal
**What goes wrong:** Removing only some named exports from an import line, leaving the line with the wrong symbols.
**Prevention:** When removing an entire set of functionality, check if ALL exports from that import are now unused. If so, remove the entire import line. If only some are unused, edit the destructuring.

### Pitfall 2: Removing the wrong section separator
**What goes wrong:** The settings page has multiple `<div class="section-separator"></div>` elements. Removing the wrong one creates an extra gap.
**Prevention:** Remove specifically the separator on line 650 (the one immediately before `<FediverseSettings />`).

### Pitfall 3: Breaking the `{#if tags.length > 0}` block structure
**What goes wrong:** The explore-scene-panel and scene-rooms-hint are inside `{#if tags.length > 0}`. Removing them incorrectly could corrupt the if-block.
**Prevention:** Remove only the inner `<div>` and `<section>` elements. The outer `{#if tags.length > 0}` block and its closing `{/if}` on line 469 must remain.

### Pitfall 4: CSS class orphans causing no error but wasted code
**What goes wrong:** Leaving CSS for `.rooms-link`, `.explore-scene-link`, etc. in the stylesheet after removing their HTML.
**Severity:** Low — orphaned CSS doesn't break anything but adds noise. Clean it up for correctness.
**Prevention:** After removing HTML blocks, search the `<style>` block for each class name and remove the associated CSS rule.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Hiding routes | Custom redirect/guard | Just remove the nav link — routes still accessible by direct URL |
| Disabling Nostr | Runtime flag check | Remove the `initNostr()` call entirely |

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| v2-notice banners on Scenes and Room pages | Already present | No action needed — banners are already there |
| Community nav links visible | Targeted removal | Users can no longer navigate to community features from nav |

---

## Open Questions

1. **Profile page Nostr section**
   - What we know: `src/routes/profile/+page.svelte` imports `ndkState` from nostr and shows a Nostr pubkey display and `nostrStatus` publishing indicator (lines 133-141)
   - What's unclear: Whether this should also be hidden in Phase 31 or is considered acceptable to leave
   - Recommendation: Phase 31 spec does not mention the profile page — leave it as-is. The profile page is not a "community navigation surface"; it's user identity. Nostr pubkey display there is fine.

2. **Backers page Nostr init**
   - What we know: `src/routes/backers/+page.svelte` calls `initNostr()` locally within an onMount (not the global init)
   - What's unclear: Whether removing the global init from layout affects backers page functionality
   - Recommendation: The backers page has its own local `initNostr()` call — it's self-contained. The layout init removal does not break it. No change needed for Phase 31.

---

## Sources

### Primary (HIGH confidence)
- Direct file reads — all findings are from actual source code, not inferred
- `src/routes/+layout.svelte` — read in full, lines 1-475
- `src/routes/artist/[slug]/+page.svelte` — relevant sections read and grep-verified
- `src/routes/settings/+page.svelte` — read in full, lines 1-1207
- `src/routes/scenes/+page.svelte` — read in full, lines 1-292
- `src/routes/room/[channelId]/+page.svelte` — read in full, lines 1-706
- `src/routes/crate/+page.svelte` — lines 1-20 and 160-182 read

### Secondary (MEDIUM confidence)
- Grep scan of all `.svelte` files for community keywords — confirmed no other routes have community navigation surfaces beyond those listed above

---

## Metadata

**Confidence breakdown:**
- File locations: HIGH — all files read directly
- Line numbers: HIGH — read as of 2026-02-27; may shift if concurrent edits occur before implementation
- Import analysis: HIGH — grep-verified no other consumers of the removed imports within affected files
- Completeness: HIGH — full grep scan found one additional surface (crate page) not in original spec

**Research date:** 2026-02-27
**Valid until:** 2026-03-13 (stable codebase; line numbers shift with every commit)
