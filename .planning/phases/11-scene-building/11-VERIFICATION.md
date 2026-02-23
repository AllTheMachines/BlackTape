---
phase: 11-scene-building
verified: 2026-02-23T13:00:00Z
status: passed
score: 15/15 must-haves verified
re_verification: false
human_verification:
  - test: "Open Tauri app with favorites, navigate to /scenes, observe scene detection runs and populates tiers"
    expected: "Active Scenes and/or Emerging sections render with SceneCard components; loading indicator appears then disappears"
    why_human: "Detection requires taste.db populated from prior usage (favorite artists). Can only be verified with a running app that has listen history."
  - test: "Click Follow Scene on a scene detail page, then reopen /scenes"
    expected: "Follow button toggles to Unfollow; NIP-51 kind 30001 list published if Nostr connected"
    why_human: "Requires Tauri running app; NIP-51 publish requires a Nostr connection that cannot be headlessly simulated."
  - test: "Type an artist name in the Suggest an artist form and submit"
    expected: "Form disappears, 'Thanks — this helps improve scene detection.' message appears"
    why_human: "Form interaction and state change requires browser/Tauri UI interaction."
---

# Phase 11: Scene Building — Verification Report

**Phase Goal:** AI detects emerging scenes from collective listening + tag patterns. Scenes surface in a dedicated directory with anti-rich-get-richer tiering. Users can follow scenes and suggest artists. No creation tools ship this phase — scenes emerge automatically.
**Verified:** 2026-02-23
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | taste.db gains four new tables without breaking existing tables | VERIFIED | `CREATE TABLE IF NOT EXISTS` for `detected_scenes`, `scene_follows`, `scene_suggestions`, `feature_requests` confirmed in `taste_db.rs` lines 86–116; additive only, no existing tables modified |
| 2 | Tauri commands for scene CRUD are callable from the frontend | VERIFIED | All 8 commands registered in `lib.rs` invoke_handler lines 109–116: `get_detected_scenes`, `save_detected_scenes`, `follow_scene`, `unfollow_scene`, `get_scene_follows`, `suggest_scene_artist`, `get_scene_suggestions`, `upvote_feature_request` |
| 3 | App compiles with 0 errors after schema additions | VERIFIED | `cargo build` succeeded (`Finished dev profile in 0.89s`); `npm run check` reports 576 files, 0 errors, 7 pre-existing warnings (none from phase 11 scene files except 1 CSS `border-opacity` warning in SceneCard — not a blocker) |
| 4 | Scene detection runs from tag_cooccurrence + listener overlap and returns typed DetectedScene objects | VERIFIED | `detection.ts` implements `findTagClusterSeeds()` (tag_cooccurrence niche filter query), `groupTagPairsIntoClusters()`, `getClusterArtists()`, `validateListenerOverlap()` (Tauri invoke `get_favorite_artists`), `detectScenes()` full pipeline with `save_detected_scenes` cache write |
| 5 | The two-tier anti-rich-get-richer partition (active/emerging) is implemented | VERIFIED | `partitionScenes()` in `detection.ts` line 313 splits by `isEmerging OR listenerCount <= 2` (emerging) vs not (active); both tiers Fisher-Yates shuffled; `+page.svelte` renders tiers in separate independently-gated `{#if hasActive}` / `{#if hasEmerging}` blocks |
| 6 | Scenes state module holds detected scenes reactively for consumers | VERIFIED | `state.svelte.ts` exports `scenesState` as Svelte 5 `$state` singleton with `loadScenes()` async function; dynamic import of detection module with cache-first / force-detect logic |
| 7 | AI prompt for scene descriptions is registered in PROMPTS object | VERIFIED | `grep -n "sceneDescription" src/lib/ai/prompts.ts` returns line 46 inside PROMPTS object; prompt generates 20-word evocative vibe sentence |
| 8 | Visiting /scenes shows a directory with active/emerging tiers | VERIFIED | `+page.svelte` (227 lines) renders "Active Scenes" h2 and "Emerging" h2 independently; empty state message on both tiers empty; `isDetecting` loading indicator; SceneCard grid |
| 9 | Each tier is randomly ordered (anti-rich-get-richer) | VERIFIED | `partitionScenes()` applies Fisher-Yates to both `active` and `emerging` arrays before returning `PartitionedScenes` |
| 10 | Visiting /scenes/[slug] shows artists, listener count, top tags, and top tracks | VERIFIED | `[slug]/+page.svelte` (571 lines) implements all five blocks: header with listener badge + isEmerging chip, tags block, artists block, top tracks block (`{#if data.topTracks.length > 0}` wraps h2+ol), async AI description slot |
| 11 | Empty state and not-found state render gracefully (no crash) | VERIFIED | `/scenes` shows "No scenes detected yet..." empty state when both tiers empty; `/scenes/[slug]` shows "Scene not found" with back link when `data.scene === null`; web server loads return `{ scenes: [] }` / `{ scene: null, artists: [], topTracks: [] }` |
| 12 | User can follow a scene from the scene detail page | VERIFIED | `scenes.svelte.ts` exports `followScene()` (taste.db primary + NIP-51 kind 30001 optional); `[slug]/+page.svelte` imports and calls `followScene`/`unfollowScene` on button click; optimistic UI via `sceneFollowState.followedSlugs` |
| 13 | User can suggest an artist for a scene from the scene detail page | VERIFIED | `suggestArtist()` in `scenes.svelte.ts` invokes `suggest_scene_artist` Tauri command; suggestion form in `[slug]/+page.svelte` with text input + submit; post-suggestion "Thanks" message replaces form |
| 14 | Feature request vote counter is wired to the collaborative playlists CTA | VERIFIED | `+page.svelte` imports and calls `upvoteFeatureRequest` from `scenes.svelte.ts` on button click; localStorage persistence for web; vote count displayed after vote |
| 15 | Scenes nav link, web API, ARCHITECTURE.md, and user-manual.md are complete | VERIFIED | Nav link at `+layout.svelte` lines 114 + 156 (both web and Tauri blocks, not platform-gated); `/api/scenes` GET returns proto-scenes from tag_cooccurrence via D1Provider; `ARCHITECTURE.md` line 1101 "Scene Building" section; `docs/user-manual.md` line 705 "## Scenes" section |

**Score:** 15/15 truths verified

---

## Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `src-tauri/src/ai/taste_db.rs` | 4 scene tables + 8 Tauri commands | VERIFIED | 1126 lines; 4 `CREATE TABLE IF NOT EXISTS` blocks at lines 86–116; 8 command functions starting at line 916; 2 new structs (`DetectedSceneRow`, `SceneSuggestionRow`) |
| `src-tauri/src/lib.rs` | Command registrations for scene Tauri commands | VERIFIED | All 8 commands registered at lines 109–116 with `ai::taste_db::` prefix |
| `src/lib/scenes/types.ts` | `DetectedScene`, `SceneArtist`, `SceneSuggestion`, `PartitionedScenes` interfaces | VERIFIED | 4 interfaces exported; `PartitionedScenes` correctly typed with `active`/`emerging` arrays |
| `src/lib/scenes/detection.ts` | `detectScenes()`, `partitionScenes()`, `loadCachedScenes()`, `findTagClusterSeeds()`, `validateListenerOverlap()`, `isNovelTagCombination()` | VERIFIED | 365 lines; all 8 functions exported; full detection pipeline implemented |
| `src/lib/scenes/state.svelte.ts` | Reactive `$state` for detected scenes list + `loadScenes()` | VERIFIED | `scenesState` as Svelte 5 `$state` singleton; `loadScenes(forceDetect?)` with idempotent guard |
| `src/lib/scenes/index.ts` | Barrel re-export for scenes module | VERIFIED | Exports all types, `scenesState`, `loadScenes`, `detectScenes`, `partitionScenes`, `loadCachedScenes` |
| `src/lib/ai/prompts.ts` | `sceneDescription` prompt added to PROMPTS object | VERIFIED | Line 46 inside PROMPTS object; 20-word vibe sentence prompt |
| `src/routes/scenes/+page.svelte` | Scene directory with active/emerging tiers | VERIFIED | 227 lines; two-tier grid, independent section visibility, empty state, isDetecting indicator, feature request CTA |
| `src/routes/scenes/+page.ts` | Universal load: Tauri detection via scenesState, web passthrough | VERIFIED | `isTauri()` branch; Tauri calls `loadScenes()`, returns `scenesState.partitioned`; web passthrough |
| `src/routes/scenes/+page.server.ts` | Web server load (empty state) | VERIFIED | Returns `{ scenes: [] }` with explanatory comment |
| `src/routes/scenes/[slug]/+page.svelte` | Scene detail: all five blocks | VERIFIED | 571 lines; header, tags chips, artists list, top tracks (`{#if topTracks.length > 0}`), AI description slot; not-found state; `svelte:head` outside `{#if}` |
| `src/routes/scenes/[slug]/+page.ts` | Universal load for scene detail | VERIFIED | Tauri: finds scene from `scenesState`, batch MBID lookup, recordings query; web: server passthrough |
| `src/routes/scenes/[slug]/+page.server.ts` | Web null state server load | VERIFIED | Returns `{ scene: null, artists: [], topTracks: [] }` |
| `src/lib/components/SceneCard.svelte` | Scene card component for directory listing | VERIFIED | `DetectedScene` prop typed; name, top 3 tags, listener badge, emerging badge; CSS `--accent` var; links to `/scenes/[scene.slug]` |
| `src/lib/comms/scenes.svelte.ts` | Follow/suggest/vote interaction module | VERIFIED | 200 lines; `sceneFollowState`, `followScene`, `unfollowScene`, `suggestArtist`, `upvoteFeatureRequest` all exported and implemented |
| `src/routes/api/scenes/+server.ts` | GET /api/scenes returning proto-scenes for web | VERIFIED | `export const GET` with `D1Provider`; tag_cooccurrence query with niche filters; graceful empty fallback |
| `ARCHITECTURE.md` | Scene Building section | VERIFIED | Line 1101 "## Scene Building" with detection algorithm, anti-rich-get-richer rationale, data model, interactions, routes, anti-patterns table |
| `docs/user-manual.md` | Scenes section with user-facing documentation | VERIFIED | Line 705 "## Scenes" with browsing, following, suggesting, feature requests, and how detection works |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/scenes/detection.ts` | `src-tauri/src/ai/taste_db.rs` | `getInvoke()` for `get_favorite_artists` + `save_detected_scenes` | WIRED | `getInvoke()` dynamic import at line 34; `invoke('get_favorite_artists')` line 194; `invoke('save_detected_scenes')` line 284 |
| `src/lib/scenes/detection.ts` | `src/lib/db/provider` | `getProvider()` for tag_cooccurrence queries | WIRED | `getProvider` dynamically imported line 235; used for `findTagClusterSeeds` (tag_cooccurrence query) and `getClusterArtists` |
| `src/lib/scenes/state.svelte.ts` | `src/lib/scenes/detection.ts` | import `detectScenes` + reactive `$state` assignment | WIRED | Dynamic import of `detection` inside `loadScenes()`; `scenes = await detectScenes()`; `scenesState.scenes = scenes` |
| `src/routes/scenes/+page.ts` | `src/lib/scenes/state.svelte.ts` | `loadScenes()` on Tauri, passthrough on web | WIRED | `loadScenes, scenesState, partitionScenes` imported line 11; `await loadScenes()` line 12; `scenesState.partitioned` returned |
| `src/routes/scenes/+page.server.ts` | Web empty state | `export const load` returning `{ scenes: [] }` | WIRED | Returns empty scenes array; page.ts web branch passes through cleanly |
| `src/routes/scenes/[slug]/+page.ts` | `mercury.db` artists + recordings tables | Batch MBID lookup + recordings query | WIRED | Loop over `scene.artistMbids.slice(0, 20)` at line 28; SELECT from `recordings r JOIN artists a` at line 47 |
| `src/routes/scenes/[slug]/+page.svelte` | `src/lib/ai/prompts.ts` | `PROMPTS.sceneDescription` called in onMount AI slot | WIRED | `aiDescription` state at line 11; `PROMPTS.sceneDescription(...)` call line 56; result set to `aiDescription` |
| `src/routes/scenes/[slug]/+page.svelte` | `src/lib/comms/scenes.svelte.ts` | `followScene()` called on button click | WIRED | Import at line 6; `followScene(data.scene.slug)` at line 72; `unfollowScene` at line 70 |
| `src/lib/comms/scenes.svelte.ts` | `ndkState` (nostr.svelte.ts) | NIP-51 kind 30001 event published via NDK | WIRED | `ndkState` dynamically imported line 63; `ndkState.ndk.fetchEvent({ kinds: [30001] })` line 69; `NDKEvent` with `kind = 30001` at line 76 |
| `src/lib/comms/scenes.svelte.ts` | `src-tauri/src/ai/taste_db.rs` | `follow_scene`, `suggest_scene_artist`, `upvote_feature_request` Tauri commands | WIRED | `invoke('follow_scene')` line 52; `invoke('unfollow_scene')` line 107; `invoke('suggest_scene_artist')` line 162; `invoke('upvote_feature_request')` line 186 |
| `src/routes/scenes/+page.svelte` | `src/lib/comms/scenes.svelte.ts` | `upvoteFeatureRequest` called on CTA button click | WIRED | Import line 6; `upvoteFeatureRequest(FEATURE_ID)` line 42 |
| `src/routes/+layout.svelte` | `/scenes` route | Nav link present on both web and Tauri | WIRED | Nav links at lines 114 (web block) and 156 (Tauri block) |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| COMM-07 | 11-01, 11-02, 11-03, 11-04 | AI scene awareness — detects emerging scenes from collective listening patterns | SATISFIED | `detectScenes()` in `detection.ts` implements full pipeline: tag co-occurrence clustering with niche filter (< 200 artists per tag), listener overlap validation (minimum 2 favorites), novelty detection via genres table, results cached to taste.db. Routes `/scenes` and `/scenes/[slug]` surface detected scenes. |
| COMM-08 | 11-01, 11-02, 11-03, 11-04 | The underground is alive — scenes exist in Mercury that exist nowhere else | SATISFIED | Niche filter ensures mainstream tags never become scenes (< 200 artists per tag, >= 5 shared); `isNovelTagCombination()` marks scenes as emerging when tags don't match KB genres; Fisher-Yates shuffle on both tiers prevents popularity-order lock-in; `partitionScenes()` tiering is anti-rich-get-richer by construction |

**Note:** COMM-07 and COMM-08 are the only requirement IDs declared across all four plans for this phase. No orphaned requirements found — no additional IDs are mapped to Phase 11 in the ROADMAP or RESEARCH documents beyond these two.

---

## Anti-Patterns Scan

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/components/SceneCard.svelte` | 57 | `border-opacity: 0.4` (non-standard CSS property) | Warning | CSS property not recognized by svelte-check; visually inert in browsers that ignore unknown properties. Not a blocker — uses `--accent` var for color, opacity is cosmetic supplemental |
| `src/lib/scenes/detection.ts` | 174 | `const placeholders = topTags.map(() => '?').join(', ')` | Info | Dynamic SQL placeholder generation — this is correct for parameterized queries, not a placeholder stub. Word "placeholders" is code variable, not a stub indicator |
| `src/routes/scenes/[slug]/+page.svelte` | 211 | `placeholder="Artist name"` | Info | HTML input placeholder attribute for the suggestion form — correct semantic HTML, not a stub |

No blocker anti-patterns found. No `TODO`, `FIXME`, `return null` stubs, or unimplemented handlers in the scene-specific files.

---

## Human Verification Required

### 1. Scene Detection Run with Real Taste Data

**Test:** Open the Tauri desktop app with a populated library (artists favorited). Navigate to `/scenes`. Wait for detection to complete.
**Expected:** Active Scenes and/or Emerging sections render with SceneCard grid; "Detecting scenes..." loading indicator appears then disappears; scenes have names, tags, and listener counts.
**Why human:** Detection requires `taste.db` populated with `favorite_artists` from real usage. The pipeline reads `get_favorite_artists` to validate listener overlap (minimum 2 favorites per scene). Cannot be headlessly verified without a real user taste profile.

### 2. Scene Follow + NIP-51 Publish

**Test:** Click "Follow Scene" on any scene detail page while connected to Nostr.
**Expected:** Button toggles to "Unfollow Scene"; taste.db updated; NIP-51 kind 30001 list published to Nostr relay with `d='mercury-scenes'` tag containing the scene slug.
**Why human:** Requires running Tauri app with an active Nostr connection and private key. NIP-51 relay publish cannot be verified programmatically without a live relay connection.

### 3. Artist Suggestion Form Submission

**Test:** Navigate to a scene detail page in Tauri. Type an artist name in the "Suggest an artist" text input and click submit.
**Expected:** Form disappears; "Thanks — this helps improve scene detection." message appears; suggestion written to `scene_suggestions` in taste.db.
**Why human:** Requires running Tauri UI interaction. Form state change (disappear/confirm message) is a visual/interactive behavior.

---

## Gaps Summary

No gaps. All 15 must-have truths verified. All artifacts exist, are substantive, and are wired. Both requirement IDs (COMM-07 and COMM-08) are satisfied with concrete implementation evidence. The phase goal — AI-detected scenes surfaced in a two-tier anti-rich-get-richer directory with follow/suggest interactions — is fully achieved.

Three items are flagged for human verification only because they require a running Tauri app with real user data; the code paths that would execute during those tests are confirmed implemented and wired.

---

_Verified: 2026-02-23_
_Verifier: Claude (gsd-verifier)_
