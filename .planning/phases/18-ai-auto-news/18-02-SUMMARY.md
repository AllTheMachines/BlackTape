---
phase: 18-ai-auto-news
plan: 02
subsystem: ai
tags: [typescript, ai, providers, state, prompts]
dependency_graph:
  requires: []
  provides:
    - AI_PROVIDERS constant (src/lib/ai/providers.ts)
    - AiState.autoGenerateOnVisit field
    - AiState.selectedProviderName field
    - artistSummaryFromReleases() prompt function
  affects:
    - src/lib/components/AiSettings.svelte (Plan 04 will import AI_PROVIDERS)
    - src/lib/components/ArtistSummary.svelte (Plan 03 will import artistSummaryFromReleases)
tech_stack:
  added: []
  patterns:
    - AI provider configuration as typed readonly const array
    - Svelte 5 $state extended with new fields (non-breaking pattern)
    - Grounded prompt engineering — release data as context, no free-form generation
key_files:
  created:
    - src/lib/ai/providers.ts
  modified:
    - src/lib/ai/state.svelte.ts
    - src/lib/ai/prompts.ts
    - BUILD-LOG.md
decisions:
  - "Anthropic routed via aimlapi (not direct) — RemoteAiProvider uses Bearer auth only; Anthropic direct requires x-api-key header which is not supported"
  - "artistSummaryFromReleases named distinctly from PROMPTS.artistSummary to prevent confusion between tag-based and release-data-based prompt paths"
  - "Affiliate URL hardcoded as constant, not env var — Tauri desktop has no env var pattern; badge visible before user clicks (full transparency)"
metrics:
  duration: 147s
  completed: 2026-02-24
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 3
---

# Phase 18 Plan 02: AI TypeScript Infrastructure Summary

TypeScript provider config, extended AiState, and grounded release-data prompt function — all three building blocks Plans 03 and 04 depend on, with no Rust dependency.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create providers.ts and extend state.svelte.ts | 403efba | src/lib/ai/providers.ts (new), src/lib/ai/state.svelte.ts |
| 2 | Add artistSummaryFromReleases to prompts.ts | f573b86 | src/lib/ai/prompts.ts |

## What Was Built

### src/lib/ai/providers.ts (new)

`AI_PROVIDERS` readonly const array with three provider configurations:

- **aimlapi** — Recommended, affiliate badge + URL (`https://aimlapi.com/?via=mercury`), default model `claude-3-5-haiku-20241022`
- **openai** — Direct OpenAI, no affiliate, default model `gpt-4o-mini`
- **anthropic** — Routes via aimlapi base URL (workaround for `x-api-key` vs Bearer auth), label says "via aimlapi" for transparency

Each entry has: `id`, `label`, `baseUrl`, `badge`, `affiliateUrl`, `instructions`, `defaultModel`. Also exports `getProviderById()` helper.

### src/lib/ai/state.svelte.ts (extended)

Two new fields added to `AiState` interface and `$state` initialization:

- `autoGenerateOnVisit: boolean` — opt-in to auto-generate on artist page visit (default `false`)
- `selectedProviderName: string` — tracks which provider user has selected (default `''`)

Both loaded from taste.db via `loadAiSettings()` (reads `auto_generate_on_visit` and `selected_provider_name` keys) and persisted via `saveAiSetting()` switch cases.

### src/lib/ai/prompts.ts (extended)

New export `artistSummaryFromReleases(artistName, releases, tags)` returns `{system, user}`:

- System: strict grounding instruction — factual only, no invention
- User: artist name + tags + up to 20 releases (sliced to keep under ~400 tokens)
- Deliberately named to avoid confusion with `PROMPTS.artistSummary` (tag-based from earlier phases)

## Verification

- `npm run check` — 0 errors, 8 pre-existing warnings (all unrelated)
- 92/92 test suite passing on both commits
- `AI_PROVIDERS` found in providers.ts with 3 entries
- `autoGenerateOnVisit` in state.svelte.ts at interface, init, loadAiSettings, saveAiSetting
- `artistSummaryFromReleases` exported from prompts.ts

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- `src/lib/ai/providers.ts` exists with `AI_PROVIDERS` export
- `src/lib/ai/state.svelte.ts` has `autoGenerateOnVisit` and `selectedProviderName`
- `src/lib/ai/prompts.ts` has `artistSummaryFromReleases` export
- Commits 403efba and f573b86 present in git log
