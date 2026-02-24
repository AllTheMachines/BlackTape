---
phase: 21-activitypub-outbound
plan: 01
subsystem: api
tags: [rust, activitypub, rsa, json-ld, fediverse, tauri]

# Dependency graph
requires:
  - phase: 19-static-site-generator
    provides: site_gen.rs module pattern (TasteDbState access, Tauri command structure)
  - phase: 09-identity-and-collections
    provides: user_identity table in taste.db for keypair persistence
provides:
  - RSA-2048 keypair generation and stable persistence in user_identity table
  - ActivityPub actor.json JSON-LD document builder (dual @context, PKCS1 public key)
  - WebFinger JRD document builder (.well-known/webfinger.json)
  - Empty outbox.json OrderedCollection builder
  - export_activitypub Tauri command writing all three files to output directory
affects: [21-02-fediverse-settings, 21-03-export-ui, plan-22+]

# Tech tracking
tech-stack:
  added: ["rsa 0.9 (pem feature)", "rand 0.8"]
  patterns: ["AP JSON-LD construction via serde_json::json! macro", "keypair upsert via ON CONFLICT DO UPDATE"]

key-files:
  created: ["src-tauri/src/activitypub.rs"]
  modified: ["src-tauri/Cargo.toml", "src-tauri/src/lib.rs"]

key-decisions:
  - "PKCS1 PEM for public key (not PKCS8/SPKI) — Mastodon rejects SPKI format in publicKeyPem field"
  - "Keypair persisted via ON CONFLICT upsert — stable across re-exports, Mastodon caches actors by key ID"
  - "hosting_url trailing slash stripped before URL construction — no double-slash paths"
  - "https:// validation in command — rejects non-TLS hosting URLs at Rust layer"
  - "Outbox is empty OrderedCollection — no curator_posts table exists yet, totalItems:0"

patterns-established:
  - "AP module pattern: parse/generate keypair separately from JSON building — keypair fn takes Connection ref, builders take &identity"
  - "Hostname extraction from hosting_url: strip 'https://', split on '/', take first segment"

requirements-completed: [APUB-02, APUB-03]

# Metrics
duration: 3min
completed: 2026-02-24
---

# Phase 21 Plan 01: ActivityPub Outbound — Rust Backend Summary

**RSA-2048 keypair generation with PKCS1 public key export and three ActivityPub JSON-LD file builders (actor.json, webfinger.json, outbox.json) registered as export_activitypub Tauri command**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-24T19:52:34Z
- **Completed:** 2026-02-24T19:55:01Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `activitypub.rs` with `ensure_rsa_keypair()` — generates RSA-2048 on first run, persists PKCS8 private key in user_identity table, returns PKCS1 public key (Mastodon-compatible format)
- Implemented three JSON-LD builders: `build_actor_json()` with dual @context (activitystreams + security/v1), `build_webfinger_json()` with acct: subject, and `build_outbox_json()` as empty OrderedCollection
- Registered `export_activitypub` Tauri command in lib.rs — writes ap/actor.json, ap/outbox.json, .well-known/webfinger.json to user-chosen output directory
- Cargo check passes clean; all 92 existing test suite checks still passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Add rsa/rand deps + create activitypub.rs module** - `3d698e4` (feat)
2. **Task 2: Register activitypub module in lib.rs** - `2ffc1fe` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src-tauri/src/activitypub.rs` - RSA keypair persistence, AP JSON-LD builders, export_activitypub command (223 lines)
- `src-tauri/Cargo.toml` - Added rsa 0.9 (pem feature) and rand 0.8 dependencies
- `src-tauri/src/lib.rs` - Added mod activitypub declaration and registered export_activitypub in invoke_handler

## Decisions Made
- **PKCS1 public key format:** Plan spec is explicit — Mastodon requires PKCS1 PEM in publicKeyPem field, not PKCS8/SPKI. Used `to_pkcs1_pem(LineEnding::LF)` for public key, `to_pkcs8_pem(LineEnding::LF)` for private key storage.
- **Keypair upsert strategy:** `ON CONFLICT(key) DO UPDATE SET value = excluded.value` ensures the private key table row survives re-export calls without unique constraint errors.
- **Hostname extraction:** `strip_prefix("https://")` + `split('/').next()` — no url-parsing crate needed, handles `https://host/path` and `https://host` correctly.
- **https:// validation:** Early return with Err if hosting_url doesn't start with `https://` — prevents generating files that would fail Mastodon's HTTP signature verification.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `export_activitypub` command is callable via `invoke('export_activitypub', { outputDir, identity })` from SvelteKit
- Plan 02 (FediverseSettings.svelte) can wire up the form UI to this command
- Plan 02 should also add P21-01 through P21-08 test manifest entries to verify this plan's deliverables

## Self-Check: PASSED

- src-tauri/src/activitypub.rs: FOUND
- src-tauri/Cargo.toml: FOUND
- src-tauri/src/lib.rs: FOUND
- 21-01-SUMMARY.md: FOUND
- Commit 3d698e4: FOUND
- Commit 2ffc1fe: FOUND

---
*Phase: 21-activitypub-outbound*
*Completed: 2026-02-24*
