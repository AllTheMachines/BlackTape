---
phase: 21-activitypub-outbound
verified: 2026-02-24T20:15:00Z
status: human_needed
score: 6/7 must-haves verified (1 requires live deployment)
human_verification:
  - test: "Deploy exported AP files to a static host and search for the actor on Mastodon"
    expected: "Actor profile appears in Mastodon search; actor is followable (follow will show as pending, which is expected without an inbox)"
    why_human: "Requires live static host with HTTPS, correct Content-Type headers for WebFinger, and a Mastodon instance to test discovery — cannot be automated headlessly"
---

# Phase 21: ActivityPub Outbound Verification Report

**Phase Goal:** Users can configure and export a valid ActivityPub actor as static files they self-host, making their Mercury curation followable from Mastodon
**Verified:** 2026-02-24T20:15:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | User can configure AP actor identity (handle, display name, hosting URL) in Settings | VERIFIED | FediverseSettings.svelte (294 lines) has all three input fields with on-blur persistence via `set_identity_value`, on-mount load via `get_identity_value`, mounted in settings/+page.svelte under `{#if tauriMode}` guard |
| 2  | Handle preview updates live as user types — shows @handle@domain derived from handle + hosting URL | VERIFIED | `$derived` `handlePreview` uses `new URL().hostname` to extract domain; rendered conditionally with `data-testid="ap-handle-preview"` |
| 3  | Export button is disabled until all three fields are non-empty | VERIFIED | `$derived` `canExport` checks all three trims + `!isExporting`; button has `disabled={!canExport}` and tooltip text |
| 4  | Clicking Export opens a Tauri folder picker; on selection, invokes export_activitypub and shows a success message | VERIFIED | `handleExport()` calls `open({ directory: true })` from plugin-dialog, then `invoke('export_activitypub', { outputDir, identity })`; sets `exportStatus` on success/failure |
| 5  | All three files are written to {output_dir}/ap/ and {output_dir}/.well-known/ subdirectories | VERIFIED | `activitypub.rs` creates `ap_dir = out.join("ap")` and `wellknown_dir = out.join(".well-known")`; writes actor.json + outbox.json to ap/, webfinger.json to .well-known/ |
| 6  | actor.json contains valid ActivityPub Person document with publicKey PKCS1 PEM and dual @context | VERIFIED | `build_actor_json()` uses `serde_json::json!` with `["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1"]` @context; public key via `to_pkcs1_pem()` (PKCS1, not SPKI); inbox URL included |
| 7  | When exported files are uploaded to configured hosting URL, actor is followable from Mastodon | HUMAN NEEDED | All structural prerequisites are in place (valid JSON-LD, PKCS1 key, WebFinger JRD with correct acct: subject). Requires actual deployment and live Mastodon test to confirm |

**Score:** 6/7 truths fully automated; 1 requires human/live-environment verification

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src-tauri/src/activitypub.rs` | RSA key gen, AP JSON-LD builders, export_activitypub command; min 150 lines | VERIFIED | 221 lines; contains `ensure_rsa_keypair`, `build_actor_json`, `build_webfinger_json`, `build_outbox_json`, `export_activitypub` |
| `src-tauri/Cargo.toml` | rsa and rand crate dependencies | VERIFIED | Line 30: `rsa = { version = "0.9", features = ["pem"] }`; line 31: `rand = "0.8"` |
| `src-tauri/src/lib.rs` | mod activitypub declaration + command registration | VERIFIED | Line 1: `mod activitypub;`; line 178: `activitypub::export_activitypub` in invoke_handler |
| `src/lib/components/FediverseSettings.svelte` | AP identity form, live preview, export button, path display, help block; min 120 lines | VERIFIED | 294 lines; all required elements present with data-testid attributes |
| `src/routes/settings/+page.svelte` | FediverseSettings import + mount | VERIFIED | Line 5: import; line 587-589: `{#if tauriMode}<FediverseSettings />{/if}` |
| `tools/test-suite/manifest.mjs` | PHASE_21 export with 15 entries, included in ALL_TESTS | VERIFIED | Lines 1453-1582; 15 entries (P21-01 through P21-15); `...PHASE_21` in ALL_TESTS at line 1582 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src-tauri/src/lib.rs` | `src-tauri/src/activitypub.rs` | `mod activitypub` + `invoke_handler` registration | WIRED | `mod activitypub;` at line 1; `activitypub::export_activitypub` at line 178 in invoke_handler |
| `src-tauri/src/activitypub.rs` | `src-tauri/src/ai/taste_db.rs` | `TasteDbState` for rusqlite connection access | WIRED | Import `use crate::ai::taste_db::TasteDbState;` at line 7; used in command signature as `tauri::State<'_, TasteDbState>` |
| `FediverseSettings.svelte` | `activitypub::export_activitypub` | `invoke('export_activitypub', { outputDir, identity })` | WIRED | Line 69 in handleExport(); passes correct shape `{ handle, display_name, hosting_url }` matching `ActorIdentity` struct |
| `FediverseSettings.svelte` | `user_identity` table | `invoke('set_identity_value')` on blur, `invoke('get_identity_value')` on mount | WIRED | `set_identity_value` called in saveHandle/saveDisplayName/saveHostingUrl; `get_identity_value` called in onMount for all three keys |
| `src/routes/settings/+page.svelte` | `FediverseSettings.svelte` | import + `{#if tauriMode}<FediverseSettings />{/if}` | WIRED | Import at line 5; mount at lines 586-589 under `tauriMode` guard (note: plan specified `isTauri` but `tauriMode` is the correct boolean — auto-fixed deviation documented in SUMMARY) |
| `set_identity_value` / `get_identity_value` | `src-tauri/src/lib.rs` | invoke_handler registration | WIRED | Both commands registered at lines 144-145 of lib.rs (from prior phase) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| APUB-01 | 21-02-PLAN.md | User can configure an ActivityPub actor identity (handle, display name, hosting URL) in Settings | SATISFIED | FediverseSettings.svelte has all three fields with persistence to user_identity table on blur and load on mount |
| APUB-02 | 21-01-PLAN.md, 21-02-PLAN.md | User can export AP actor files (actor.json, webfinger.json, outbox.json) to a local directory | SATISFIED | export_activitypub Rust command writes all three files; FediverseSettings.svelte wires folder-picker + invoke + success status |
| APUB-03 | 21-01-PLAN.md, 21-02-PLAN.md | Exported AP actor is valid and followable from Mastodon when uploaded to configured hosting URL | NEEDS HUMAN | Structural validity confirmed (PKCS1 key, dual @context, correct WebFinger acct: subject, HTTPS validation). Live deployment test required to confirm Mastodon discovery and followability |

No orphaned requirements — all three APUB-01/02/03 are claimed by plans and mapped in REQUIREMENTS.md.

### Anti-Patterns Found

None detected. Scanned `activitypub.rs` and `FediverseSettings.svelte` for TODO/FIXME/PLACEHOLDER, empty implementations, and console.log stubs — all clear.

### Build and Test Results

- **cargo check:** Finished dev profile in 0.92s — 0 errors
- **npm run check:** 0 errors (TypeScript + Svelte check)
- **cargo test:** All Rust unit tests pass
- **Phase 21 test suite:** 14/14 code checks PASS, 1 skip documented (P21-15 — requires live deployment)

### Notable Implementation Details

1. **PKCS1 vs PKCS8 key format:** Public key correctly uses `to_pkcs1_pem()` not `to_pkcs8_pem()`. Comment in code explains Mastodon rejects SPKI/PKCS8 format in `publicKeyPem` field. Critical correctness point.

2. **Keypair stability:** `ensure_rsa_keypair()` uses `ON CONFLICT(key) DO UPDATE SET value = excluded.value` upsert — same keypair is reused across all exports. Mastodon caches actors by key ID; changing the keypair would break federation for existing followers.

3. **HTTPS validation:** `export_activitypub` returns early with `Err` if hosting_url doesn't start with `https://` — prevents generating files that would fail Mastodon's HTTP signature verification.

4. **Trailing slash stripping:** Handled at Rust command entry point (`trim_end_matches('/')`) — prevents double-slash paths in all derived URLs.

5. **isTauri vs tauriMode deviation:** Plan 02 specified `{#if isTauri}` but `isTauri` is a function reference (always truthy in Svelte template). Auto-corrected to `{#if tauriMode}` (the boolean $state already used throughout settings page). Documented in 21-02-SUMMARY.md.

### Human Verification Required

#### 1. AP Actor Discoverable and Followable on Mastodon

**Test:** Configure identity in Settings (handle, display name, valid HTTPS hosting URL). Click Export, pick a folder. Upload the three output files to a static host at the exact paths shown in the deploy-paths block. Ensure `.well-known/webfinger` is served with `Content-Type: application/jrd+json`. Search `@handle@yourdomain.com` on a Mastodon instance.

**Expected:** Actor profile appears in Mastodon search results. Clicking Follow sends a follow request (shows as "pending" — expected, since there is no inbox implementation yet).

**Why human:** Requires a live static HTTPS host with correct Content-Type header configuration, and a Mastodon account to perform the search and follow. Cannot be automated headlessly. This is explicitly documented as an integration test blocker in STATE.md (P21-15 skip reason).

---

## Gaps Summary

No gaps. All automated must-haves are satisfied. The one open item (APUB-03 live Mastodon test) was anticipated in the plan design — P21-15 was explicitly marked `skip` with reason documented before execution began. All code prerequisites for APUB-03 are structurally correct and in place.

---

_Verified: 2026-02-24T20:15:00Z_
_Verifier: Claude (gsd-verifier)_
