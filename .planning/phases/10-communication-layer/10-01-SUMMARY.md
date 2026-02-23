---
phase: 10-communication-layer
plan: "01"
subsystem: api
tags: [nostr, ndk, ndkprivatekeysigner, idb, indexeddb, unfurl, nostr-tools, relay-pool, secp256k1]

# Dependency graph
requires:
  - phase: 09-community-foundation
    provides: taste.db identity + keypair concepts; IndexedDB usage patterns
provides:
  - Nostr keypair identity with IndexedDB persistence (loadOrCreateKeypair)
  - NDK singleton with 4-relay pool and reactive ndkState ($state runes)
  - Mercury URL pattern detection (extractMercuryUrls)
  - Link unfurl client utility (fetchUnfurlData) + server route (/api/unfurl POST)
affects:
  - 10-02 (DM inbox)
  - 10-03 (scene rooms)
  - 10-04 (listening parties)
  - 10-05 (message composer)
  - Any plan that calls initNostr() or uses ndkState

# Tech tracking
tech-stack:
  added:
    - "@nostr-dev-kit/ndk@3.0.0 — Nostr dev kit, NDK + NDKPrivateKeySigner"
    - "@nostr-dev-kit/ndk-svelte@2.4.48 — Svelte bindings for NDK stores"
    - "nostr-tools@2.23.1 — generateSecretKey, getPublicKey"
    - "idb@8.0.3 — IndexedDB promise wrapper"
    - "unfurl.js@6.4.0 — server-side OG metadata fetch (server-only)"
  patterns:
    - "secp256k1 keys stored as raw Uint8Array in IndexedDB (not CryptoKey — not supported by WebCrypto)"
    - "Dynamic import pattern for NDKPrivateKeySigner in initNostr()"
    - "Origin-based URL validation in server route using request.url origin derivation"
    - "Graceful degradation: unfurl failure returns { url } with 200 (link shows without preview)"

key-files:
  created:
    - src/lib/comms/keypair.ts
    - src/lib/comms/nostr.svelte.ts
    - src/lib/comms/index.ts
    - src/lib/comms/unfurl.ts
    - src/routes/api/unfurl/+server.ts
  modified:
    - package.json (5 new dependencies)

key-decisions:
  - "secp256k1 (Nostr) keys stored as raw Uint8Array in IndexedDB — not CryptoKey; WebCrypto doesn't support secp256k1 curve"
  - "NDKPrivateKeySigner loaded via dynamic import inside initNostr() — consistent with Tauri isolation pattern"
  - "Origin-based URL validation in /api/unfurl using request.url.origin — works across local dev, CF Pages preview, production without env var"
  - "unfurl.js is server-only — never imported in client .ts or .svelte files; only in +server.ts"
  - "initNostr() is idempotent — guard clause returns early if ndkState.connected is already true"
  - "fetchUnfurlData is intentionally not debounced — callers apply their own 800ms debounce before invoking"

patterns-established:
  - "comms/ module structure: keypair.ts (identity), nostr.svelte.ts (NDK singleton), unfurl.ts (link previews), index.ts (barrel)"
  - "Server-only packages (unfurl.js) imported only in +server.ts — never in lib/ client modules"

requirements-completed: [COMM-04, COMM-05, COMM-06]

# Metrics
duration: 3min
completed: 2026-02-23
---

# Phase 10 Plan 01: Nostr Infrastructure + Link Unfurl Summary

**NDK singleton with 4-relay pool and IndexedDB keypair identity, plus /api/unfurl OG preview endpoint for Mercury link unfurling in chat**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-23T00:37:35Z
- **Completed:** 2026-02-23T00:41:14Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Stable Nostr identity: `loadOrCreateKeypair()` generates secp256k1 keypair on first run and persists it as raw Uint8Array in IndexedDB — same identity across every session
- NDK singleton: `initNostr()` connects to 4-relay pool (nos.lol, relay.damus.io, nostr.mom, relay.nostr.band) with outbox model enabled; `ndkState` is reactive $state consumed by any component
- Mercury URL unfurl system: `extractMercuryUrls()` detects /artist/, /release/, /kb/ URLs in chat messages; `fetchUnfurlData()` POSTs to /api/unfurl for OG preview data

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Nostr deps + keypair + NDK singleton** - `8e517fc` (feat)
2. **Task 2: Mercury URL detection + /api/unfurl route** - `c358563` (feat)

**Plan metadata:** (see final docs commit)

## Files Created/Modified
- `src/lib/comms/keypair.ts` - loadOrCreateKeypair(): IndexedDB-backed secp256k1 identity
- `src/lib/comms/nostr.svelte.ts` - ndkState reactive singleton + initNostr() relay connection
- `src/lib/comms/index.ts` - barrel export for comms module
- `src/lib/comms/unfurl.ts` - extractMercuryUrls() + fetchUnfurlData() client utilities
- `src/routes/api/unfurl/+server.ts` - POST handler: validates Mercury-origin URLs, returns OG card
- `package.json` - 5 new dependencies: ndk, ndk-svelte, nostr-tools, idb, unfurl.js

## Decisions Made
- **secp256k1 as raw Uint8Array:** Nostr uses secp256k1 which WebCrypto's SubtleCrypto doesn't support — stored raw Uint8Array in IndexedDB (IndexedDB structured clone handles typed arrays natively). CryptoKey pattern was explicitly rejected.
- **Origin-based URL validation:** Plan specified `PUBLIC_SITE_URL` from `$env/static/public`. Since that env var isn't defined in this project and CF Pages runtime env vars require `$env/dynamic/private` (not static), derived site origin from `new URL(request.url).origin` instead — works correctly across all environments without config.
- **Dynamic import for NDKPrivateKeySigner:** Consistent with the project's Tauri isolation pattern (dynamic imports prevent web bundle failures). No behavioral difference — NDK package already installed.
- **idempotent initNostr():** Added early-return guard if `ndkState.connected` is true — prevents double-initialization if called multiple times (e.g., from multiple components or hot reload).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Origin-based URL validation instead of PUBLIC_SITE_URL env import**
- **Found during:** Task 2 (/api/unfurl route)
- **Issue:** Plan specified `import PUBLIC_SITE_URL from '$env/static/public'` but that env var is not defined in the project. SvelteKit would either throw at build time (undefined static env var) or silently produce an empty string validation.
- **Fix:** Derived site origin dynamically from `new URL(request.url).origin` — fully equivalent security guarantee (only Mercury origin URLs processed) without requiring env var configuration.
- **Files modified:** src/routes/api/unfurl/+server.ts
- **Verification:** npm run check (0 errors), npm run build (success, route appears in output)
- **Committed in:** c358563 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - correctness fix to avoid undefined env var at build time)
**Impact on plan:** Functionally equivalent to plan spec. Security guarantee preserved — only same-origin URLs processed.

## Issues Encountered
None — both NDK and unfurl.js built cleanly with adapter-cloudflare.

## User Setup Required
None — no external service configuration required. Relays are public, no auth needed.

## Next Phase Readiness
- `ndkState` and `initNostr()` ready for Plan 02 (DM inbox) to call from root layout
- `loadOrCreateKeypair()` provides stable identity for all subsequent Nostr operations
- `/api/unfurl` endpoint operational — Plan 05 (MessageInput) can call `fetchUnfurlData()` directly
- `extractMercuryUrls()` ready for use in message parsing

---
*Phase: 10-communication-layer*
*Completed: 2026-02-23*
