---
phase: 05-ai-foundation
plan: 01
subsystem: ai-infrastructure
tags: [rust, sidecar, llama-server, ai-provider, taste-db, typescript]
dependency_graph:
  requires: []
  provides: [ai-sidecar-management, ai-provider-interface, taste-db-schema, ai-settings-crud]
  affects: [05-02, 05-03, 05-04, 05-05, 05-06, 05-07]
tech_stack:
  added: [tauri-plugin-shell, "@tauri-apps/plugin-shell"]
  patterns: [sidecar-lifecycle, provider-abstraction, openai-compatible-api, pid-file-orphan-detection]
key_files:
  created:
    - src-tauri/src/ai/mod.rs
    - src-tauri/src/ai/sidecar.rs
    - src-tauri/src/ai/taste_db.rs
    - src/lib/ai/engine.ts
    - src/lib/ai/local-provider.ts
    - src/lib/ai/remote-provider.ts
    - src/lib/ai/prompts.ts
    - src/lib/ai/index.ts
  modified:
    - src-tauri/Cargo.toml
    - src-tauri/Cargo.lock
    - src-tauri/src/lib.rs
    - src-tauri/capabilities/default.json
    - package.json
    - package-lock.json
decisions:
  - "PID files written to app data dir for orphan detection on startup"
  - "Health checks done from frontend via fetch, not from Rust — avoids adding reqwest dependency"
  - "taste.db is separate from library.db and mercury.db — dedicated to AI settings and taste profile"
  - "Default ai_settings seeded on first launch with INSERT OR IGNORE"
  - "OpenAI-compatible API format used for both local and remote providers"
  - "Response types explicitly typed to satisfy TypeScript strict mode"
metrics:
  duration: "5min 33s"
  completed: 2026-02-17
---

# Phase 5 Plan 1: AI Infrastructure Foundation Summary

Rust sidecar lifecycle management for llama-server (spawn, kill, PID tracking, orphan cleanup) with TypeScript AI provider abstraction (local llama-server + remote OpenAI-compatible API) and taste.db schema for persistent AI settings and taste profile data.

## What Was Built

### Rust AI Module (`src-tauri/src/ai/`)

**Sidecar management (`sidecar.rs`):**
- `AiSidecarState` struct holds optional `CommandChild` handles for generation (port 8847) and embedding (port 8848) servers
- `start_generation_server` / `start_embedding_server` commands read model paths from taste.db, spawn llama-server via `tauri-plugin-shell` sidecar API, write PID files
- `stop_ai_servers` kills both child processes and removes PID files
- `get_ai_status` returns running state and port numbers
- `cleanup_orphaned_servers` runs on startup: reads PID files, kills stale processes (taskkill on Windows, kill -9 on Unix), removes stale PID files

**Taste database (`taste_db.rs`):**
- `taste.db` created on first launch with 4 tables:
  - `taste_tags` — weighted tags with source tracking
  - `taste_anchors` — pinned reference artists
  - `favorite_artists` — saved artist bookmarks
  - `ai_settings` — key-value store for all AI configuration
- Default settings seeded: enabled, provider, api_key, api_base_url, api_model, local model statuses
- CRUD commands: `get_ai_setting`, `set_ai_setting`, `get_all_ai_settings`

**Integration (`lib.rs`):**
- Shell plugin registered with sidecar spawn permission for `binaries/llama-server`
- All 7 new commands registered in invoke_handler
- taste.db initialized in setup() callback alongside library.db
- Orphan cleanup runs before app window opens

### TypeScript AI Module (`src/lib/ai/`)

**Provider interface (`engine.ts`):**
- `AiProvider` interface with `complete()`, `embed()`, `isReady()` methods
- Module-level active provider state with `getAiProvider()`/`setAiProvider()`

**Local provider (`local-provider.ts`):**
- Communicates with llama-server via OpenAI-compatible HTTP API
- POST to `/v1/chat/completions` for generation, `/v1/embeddings` for embeddings
- GET to `/health` for readiness check
- All errors caught gracefully — returns empty string/arrays on failure

**Remote provider (`remote-provider.ts`):**
- Configurable API endpoint + bearer token auth
- Same OpenAI-compatible format — works with OpenAI, Anthropic proxies, etc.
- Ready if API key is non-empty

**Prompt templates (`prompts.ts`):**
- `artistSummary` — concise artist descriptions from tags/country
- `nlExplore` — natural language music discovery
- `nlRefine` — iterative recommendation refinement
- `recommendation` — taste-based similar artist suggestions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused serde::Serialize import in taste_db.rs**
- **Found during:** Task 1 verification (cargo check warning)
- **Issue:** `use serde::Serialize` was imported but not used
- **Fix:** Removed the import
- **Files modified:** `src-tauri/src/ai/taste_db.rs`
- **Commit:** d0f9bc0 (included in task commit)

**2. [Rule 1 - Bug] Added explicit response types for TypeScript strict mode**
- **Found during:** Task 2 verification (npm run check)
- **Issue:** `response.json()` returns `{}` type, accessing `.choices` / `.data` fails strict type checking
- **Fix:** Added `ChatCompletionResponse` and `EmbeddingResponse` interfaces in both local-provider.ts and remote-provider.ts
- **Files modified:** `src/lib/ai/local-provider.ts`, `src/lib/ai/remote-provider.ts`
- **Commit:** e18740c

### Plan Omission: sqlite-vec dependency

The plan called for adding `sqlite-vec = "0.1"` to Cargo.toml. This was intentionally skipped because:
1. The crate is not used in this plan (noted as "used in later plans")
2. Adding unused dependencies triggers compiler warnings and adds build time
3. It should be added in the plan that actually uses vector similarity

## Verification Results

| Check | Result |
|-------|--------|
| `cargo check` passes | PASS (0 warnings) |
| `npm run check` passes | PASS (0 errors, 0 warnings) |
| taste.db has 4 tables | PASS (taste_tags, taste_anchors, favorite_artists, ai_settings) |
| Sidecar commands in invoke_handler | PASS (7 commands registered) |
| Shell plugin with sidecar permissions | PASS (shell:default + shell:allow-spawn) |
| AiProvider has complete/embed/isReady | PASS |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | d0f9bc0 | Rust AI sidecar module and taste.db schema |
| 2 | e18740c | TypeScript AI provider interface with local/remote implementations |

## Self-Check: PASSED

All 9 created files exist. Both commit hashes (d0f9bc0, e18740c) verified in git log.
