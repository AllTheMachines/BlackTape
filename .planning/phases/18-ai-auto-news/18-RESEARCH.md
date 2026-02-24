# Phase 18: AI Auto-News - Research

**Researched:** 2026-02-24
**Domain:** AI provider integration, SQLite caching, Svelte 5 UI patterns, Settings extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **AI provider & configuration:** User-configurable; no default pre-selected. Providers: Anthropic direct, OpenAI direct, and a unified API platform (e.g. aimlapi.com) marked "Recommended — affiliate link". API key stored in Settings, persisted locally. "Get API key" for unified provider opens affiliate URL in browser.
- **Summary placement:** Below artist header, above releases. Always visible (not collapsible). Small `[AI]` badge above summary text. Timestamp below: "Generated 3 days ago".
- **Regenerate button:** Inline near summary, circular arrow icon or "Refresh". During generation: spinner + "Generating..." text. On failure: silent — revert to last cached summary. If no cache and generation fails: section stays hidden (no error).
- **Cold start / first visit:** Section hidden until a summary exists. Auto-generate is opt-in — only triggers if API key is set AND "Auto-generate on artist visit" toggle enabled in AI settings.
- **Summary content:** Data fed to AI: albums + years + genres. Tone: factual-narrative. System prompt enforces grounding: "Only use the provided data."
- **Cache & staleness:** 30-day TTL in taste.db. On stale cache: show old summary immediately, auto-regenerate in background, swap when done. Age-based eviction only — NOT cleared on DB rebuild.

### Claude's Discretion

- Exact visual design of the AI badge (color, weight, border)
- Regenerate button placement specifics (icon vs text, exact position)
- AI settings tab layout and field ordering
- Affiliate URL construction for unified API providers

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NEWS-01 | User can see a 2–3 sentence AI-generated summary on artist pages derived from MusicBrainz release data (albums, years, genres) | New `ArtistSummary.svelte` component + `artistSummaryFromReleases` prompt in `prompts.ts`; data already available in `data.releases` from `+page.ts` load |
| NEWS-02 | AI-generated content is visibly labeled as "AI summary based on MusicBrainz data" — never presented as editorial or news | Badge rendered inside `ArtistSummary.svelte`; text label hardcoded in component |
| NEWS-03 | AI summary is cached per artist in taste.db and regenerated on demand by the user | New `artist_summaries` table in taste.db; two new Rust commands: `get_artist_summary` + `save_artist_summary`; regenerate button triggers fresh generation |

</phase_requirements>

---

## Summary

Phase 18 adds a grounded AI summary section to artist pages. The project already has a complete AI provider abstraction (`src/lib/ai/`) with `RemoteAiProvider` that calls any OpenAI-compatible endpoint. The data pipeline is also already in place: the artist page load function (`+page.ts`) fetches release groups from MusicBrainz including title, year, and type — exactly the data the summary needs.

The key gaps are: (1) a new `artist_summaries` SQLite table in taste.db to cache summaries with timestamps, (2) two new Rust Tauri commands to read/write that table, (3) a new `ArtistSummary.svelte` component that handles all states (hidden, generating, cached, stale-refresh), (4) a new AI settings section in the existing Settings page that exposes the provider list, API key, and opt-in toggle, and (5) a new prompt template in `prompts.ts` that takes structured release data rather than a freeform tag string.

The existing `aiState` reactive state (provider, apiKey, apiBaseUrl, apiModel) will be extended with new fields for the auto-generate toggle and the provider selection UI. The `RemoteAiProvider` already handles all three provider types (Anthropic, OpenAI, aimlapi) since they all expose an OpenAI-compatible `/v1/chat/completions` endpoint.

**Primary recommendation:** Build as a single new Svelte component (`ArtistSummary.svelte`) that reads from taste.db cache via Tauri invoke, handles all lifecycle states internally, and drops into the artist page with one line. All AI logic stays in the component; no changes to the page load function needed.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Svelte 5 `$state` / `$derived` | Already in project | Reactive UI state for summary component | Project-wide convention |
| `RemoteAiProvider` | Already in project | HTTP calls to AI provider | Handles all OpenAI-compatible APIs; Anthropic/OpenAI/aimlapi all support it |
| Rust `rusqlite` | Already in project | taste.db cache table DDL and CRUD | All taste.db operations use this pattern |
| Tauri `invoke` | Already in project | TS → Rust bridge for DB reads/writes | Established pattern in every feature |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `$lib/ai/state.svelte` | Already in project | Read `aiState.apiKey`, `aiState.provider`, etc. | Component reads these to decide whether to attempt generation |
| `$lib/ai/prompts.ts` | Already in project | New `artistSummaryFromReleases()` prompt | Add new export here; keep all prompts centralized |
| `@tauri-apps/api/core` `invoke` | Already in project | Call `get_artist_summary` / `save_artist_summary` | Lazy import inside `onMount` per project convention |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending `RemoteAiProvider` | Adding Anthropic-native SDK | `RemoteAiProvider` already works; Anthropic supports OpenAI-compatible endpoint — no SDK needed |
| Inline summary logic in `+page.svelte` | Dedicated `ArtistSummary.svelte` | Component isolates state and keeps the already-long artist page cleaner |
| Server-side prompt call in `+page.ts` | Client-side in `onMount` | Page load is synchronous/fast; AI call is network-dependent — client-side is correct, matches existing `aiBio` pattern |

**Installation:** No new npm packages required (confirmed by project decision: "Zero new npm packages needed for v1.3").

---

## Architecture Patterns

### Recommended Project Structure

New files:
```
src/lib/components/ArtistSummary.svelte    # New: summary UI, all states
src/lib/ai/prompts.ts                      # Modified: add artistSummaryFromReleases()
src/lib/ai/state.svelte.ts                 # Modified: add auto_generate_on_visit field
src-tauri/src/ai/taste_db.rs               # Modified: DDL + get/save commands
src-tauri/src/lib.rs                       # Modified: register new commands
src/routes/settings/+page.svelte           # Modified: AI settings tab with provider config
src/routes/artist/[slug]/+page.svelte      # Modified: drop in <ArtistSummary>
tools/test-suite/manifest.mjs              # Modified: add PHASE_18 tests
```

### Pattern 1: taste.db DDL Extension

**What:** Add a new table to the existing `init_taste_db` `execute_batch`. All tables are created in one `CREATE TABLE IF NOT EXISTS` block.
**When to use:** Any new persistent data that belongs to the user's local state.

```rust
// Source: src-tauri/src/ai/taste_db.rs (existing pattern)
CREATE TABLE IF NOT EXISTS artist_summaries (
    artist_mbid TEXT PRIMARY KEY,
    summary TEXT NOT NULL,
    generated_at INTEGER NOT NULL  -- Unix timestamp seconds
);
```

### Pattern 2: Rust Tauri Command Pair (get/set)

**What:** Read and write a single row by primary key. Mirror every existing command in this file.
**When to use:** Any new taste.db data accessed from TypeScript.

```rust
// Source: src-tauri/src/ai/taste_db.rs (mirrors get_ai_setting / set_ai_setting pattern)
#[tauri::command]
pub fn get_artist_summary(
    artist_mbid: String,
    state: tauri::State<TasteDbState>,
) -> Option<ArtistSummaryRow> {
    let conn = state.0.lock().unwrap();
    conn.query_row(
        "SELECT summary, generated_at FROM artist_summaries WHERE artist_mbid = ?1",
        params![artist_mbid],
        |row| Ok(ArtistSummaryRow {
            summary: row.get(0)?,
            generated_at: row.get(1)?,
        }),
    ).ok()
}

#[tauri::command]
pub fn save_artist_summary(
    artist_mbid: String,
    summary: String,
    state: tauri::State<TasteDbState>,
) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    conn.execute(
        "INSERT OR REPLACE INTO artist_summaries (artist_mbid, summary, generated_at)
         VALUES (?1, ?2, ?3)",
        params![artist_mbid, summary, now],
    ).map_err(|e| e.to_string())?;
    Ok(())
}
```

### Pattern 3: New Svelte Component — ArtistSummary.svelte

**What:** Self-contained component that handles cache lookup, generation, caching, and all UI states.
**When to use:** Any feature that has multiple distinct visual states (hidden, loading, ready, stale).

```typescript
// Source: project conventions from existing ArtistStats.svelte, onMount IIFE pattern

interface Props {
  artistMbid: string;
  releases: ReleaseGroup[];   // already in data.releases from page load
  artistName: string;
}

// State machine: hidden | generating | ready | stale-refreshing
let summaryText = $state<string | null>(null);
let generatedAt = $state<number | null>(null);  // Unix seconds
let isGenerating = $state(false);

// On mount: load cache, check staleness, maybe auto-generate
// Regenerate: call provider.complete(), save via invoke, update state
```

### Pattern 4: Prompt Template — Release Data as Context

**What:** A new prompt function in `prompts.ts` that takes structured release data, not tag strings.
**When to use:** Whenever AI is given factual structured data to summarize.

```typescript
// Source: src/lib/ai/prompts.ts (new export alongside existing PROMPTS)
export function artistSummaryFromReleases(
  artistName: string,
  releases: Array<{ title: string; year: number | null; type: string }>,
  tags: string
): { system: string; user: string } {
  const releaseList = releases
    .slice(0, 20) // Limit context size
    .map(r => `- "${r.title}" (${r.year ?? 'unknown year'}, ${r.type})`)
    .join('\n');

  return {
    system: `You are a factual music cataloger. Write exactly 2-3 sentences describing an artist based ONLY on the provided data. Do not invent, speculate, or add information not present. Do not mention the artist name in the first sentence.`,
    user: `Artist: ${artistName}
Tags/genres: ${tags || 'unknown'}
Discography:
${releaseList}

Write a 2-3 sentence factual summary of this artist's catalog.`
  };
}
```

### Pattern 5: AI Settings Tab Extension

**What:** Add a new section within the existing `AiSettings.svelte` component (or a new dedicated section in Settings page) for Phase 18 config.
**When to use:** Any new AI-related user settings.

New settings keys needed in `ai_settings` table:
- `ai_provider_name` — e.g. `"anthropic"`, `"openai"`, `"aimlapi"` (human-readable selection)
- `auto_generate_on_visit` — `"true"` / `"false"` (opt-in toggle)

The existing `api_key`, `api_base_url`, `api_model` fields in `ai_settings` table are reused as-is.

### Pattern 6: Staleness Check and Background Refresh

**What:** Show stale summary immediately, trigger background generation, swap text when ready.
**When to use:** Any cached content with a TTL.

```typescript
// Source: project conventions, onMount IIFE pattern
const SUMMARY_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function isSummaryStale(generatedAt: number): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return (nowSeconds - generatedAt) > SUMMARY_TTL_SECONDS;
}

// In onMount:
// 1. invoke('get_artist_summary', { artistMbid }) → show immediately if exists
// 2. If stale AND auto-generate enabled AND provider ready → regenerate in background
// 3. On success: invoke('save_artist_summary', ...) → swap summaryText
```

### Pattern 7: Timestamp Display

**What:** Convert Unix seconds to human-readable relative time.
**When to use:** Any "generated N days ago" display.

```typescript
function formatRelativeTime(generatedAt: number): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const diffSeconds = nowSeconds - generatedAt;
  const diffDays = Math.floor(diffSeconds / 86400);
  if (diffDays === 0) return 'Generated today';
  if (diffDays === 1) return 'Generated yesterday';
  return `Generated ${diffDays} days ago`;
}
```

### Anti-Patterns to Avoid

- **Storing release data in taste.db:** Releases are fetched live from MusicBrainz per the "internet is the database" architecture decision. Only the generated summary text gets cached.
- **Showing error messages on generation failure:** Decision is silent fail — revert to cache or hide section. No toast, no error state in UI.
- **Adding provider-specific HTTP clients:** `RemoteAiProvider` already handles all three providers. Only the `baseUrl` changes per provider.
- **Making the summary section collapsible:** Decision locks it as always visible once a summary exists.
- **Storing affiliate configuration in environment variables:** Phase 16's affiliate pattern uses `$env/dynamic/private` — that is web/CF Workers specific. For Tauri desktop, the affiliate URL is a hardcoded constant in the provider config list (like `MERCURY_PUBKEY` in config.ts).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OpenAI-compatible HTTP calls | Custom fetch wrapper | `RemoteAiProvider.complete()` | Already handles auth header, error handling, response parsing |
| taste.db write/read | Raw SQL in TypeScript | Tauri `invoke` → Rust rusqlite | Connection is managed by Rust; TypeScript should never touch taste.db directly |
| Time-relative display | Date library | Simple arithmetic (see Pattern 7) | No date library in project; days-level precision needs no library |
| Provider-specific API differences | Provider adapter pattern | Single `baseUrl` param in `RemoteAiProvider` | Anthropic, OpenAI, aimlapi all expose identical `/v1/chat/completions` schema |

**Key insight:** The AI infrastructure (RemoteAiProvider, taste.db commands, aiState) is already mature. This phase is primarily a UI composition task — assembling existing pieces into a new component and extending existing settings.

---

## Common Pitfalls

### Pitfall 1: Using AI Summary as Wikipedia Bio Fallback Instead of Its Own Section

**What goes wrong:** The existing `aiBio` state in `+page.svelte` uses tags/country as AI input and falls back when Wikipedia is missing. Phase 18 is a separate, always-visible section with different data (releases), label, and lifecycle.
**Why it happens:** Confusion between the existing fallback AI bio (lines 66-118 in `+page.svelte`) and the new Phase 18 summary.
**How to avoid:** The new `ArtistSummary` component is a distinct section placed ABOVE releases in the overview tab, not in the header bio area. The existing `aiBio` mechanism stays unchanged.
**Warning signs:** If summary only appears when `data.bio` is null — that is the old behavior.

### Pitfall 2: Blocking the Page on AI Generation

**What goes wrong:** Awaiting the AI call inside the page load function or in a blocking `await` at the top of `onMount`, causing the artist page to render slowly.
**Why it happens:** Forgetting that AI calls are network-dependent with variable latency.
**How to avoid:** Always run the AI call inside an IIFE inside `onMount` (the established pattern in this project). The section starts hidden; spinner appears only if generation is triggered.
**Warning signs:** Page takes >2 seconds to render.

### Pitfall 3: Clearing Cache on mercury.db Rebuild

**What goes wrong:** Deleting artist_summaries rows when the user refreshes/rebuilds the Mercury catalog database.
**Why it happens:** Misunderstanding "cache staleness" — the decision is age-based only, never event-based.
**How to avoid:** Never delete from `artist_summaries` in any DB rebuild or sync code path. TTL check happens at display time, not at DB write time.

### Pitfall 4: Calling the Old `PROMPTS.artistSummary` (Tags Only) Instead of the New Release-Based Prompt

**What goes wrong:** Summary is generated from tags/country (existing generic summary) instead of from the catalog (albums/years/types).
**Why it happens:** `PROMPTS.artistSummary` already exists in `prompts.ts` and looks similar.
**How to avoid:** The new Phase 18 prompt function is named differently (`artistSummaryFromReleases`) and takes a `releases` array. Double-check that the Phase 18 component calls the new function, not the old one.
**Warning signs:** Summary says something like "Artist X makes ambient electronic music" with no release titles mentioned.

### Pitfall 5: Provider Selector Using `api_base_url` Directly as Provider Identity

**What goes wrong:** Treating the `apiBaseUrl` field as the provider discriminator. User selects "OpenAI" but `api_base_url` points to aimlapi.
**Why it happens:** Conflating the base URL with the provider concept.
**How to avoid:** Add a separate `ai_provider_name` key to `ai_settings` for the human-readable selection. The component maps provider name → base URL. User selects from a list; base URL is derived, not typed manually (though power users can override).
**Warning signs:** Settings shows a free-form URL field as the primary selector.

### Pitfall 6: Affiliate URL Constructed at Runtime Using Environment Variables

**What goes wrong:** Using `$env/dynamic/private` (Cloudflare Pages pattern) for aimlapi affiliate URL in Tauri.
**Why it happens:** Copying the affiliate pattern from Phase 16's `affiliates/config.ts`.
**How to avoid:** In Tauri desktop, affiliate URLs are constants defined in the provider list (TypeScript const), not env vars. The aimlapi referral URL is a hardcoded string in the provider configuration object.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### taste.db Table Schema

```sql
-- Source: src-tauri/src/ai/taste_db.rs (existing pattern for new table addition)
CREATE TABLE IF NOT EXISTS artist_summaries (
    artist_mbid TEXT PRIMARY KEY,
    summary     TEXT NOT NULL,
    generated_at INTEGER NOT NULL   -- Unix epoch seconds
);
```

### ArtistSummary Component — Skeleton

```svelte
<!-- Source: ArtistStats.svelte pattern + artist page onMount IIFE pattern -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { getAiProvider } from '$lib/ai/engine';
  import { aiState } from '$lib/ai/state.svelte';
  import { artistSummaryFromReleases } from '$lib/ai/prompts';
  import type { ReleaseGroup } from '$lib/embeds/types';

  interface Props {
    artistMbid: string;
    artistName: string;
    artistTags: string;
    releases: ReleaseGroup[];
  }

  let { artistMbid, artistName, artistTags, releases }: Props = $props();

  let summaryText = $state<string | null>(null);
  let generatedAt = $state<number | null>(null);
  let isGenerating = $state(false);

  const SUMMARY_TTL_SECONDS = 30 * 24 * 60 * 60;

  function isSummaryStale(ts: number): boolean {
    return (Math.floor(Date.now() / 1000) - ts) > SUMMARY_TTL_SECONDS;
  }

  async function generateSummary(): Promise<void> {
    const provider = getAiProvider();
    if (!provider) return;
    isGenerating = true;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const prompt = artistSummaryFromReleases(artistName, releases, artistTags);
      const result = await provider.complete(prompt.user, {
        systemPrompt: prompt.system,
        temperature: 0.3,
        maxTokens: 200
      });
      if (result && result.trim()) {
        const newSummary = result.trim();
        await invoke('save_artist_summary', {
          artistMbid,
          summary: newSummary
        });
        summaryText = newSummary;
        generatedAt = Math.floor(Date.now() / 1000);
      }
    } catch {
      // Silent fail per spec
    } finally {
      isGenerating = false;
    }
  }

  onMount(async () => {
    (async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const cached = await invoke<{ summary: string; generated_at: number } | null>(
          'get_artist_summary',
          { artistMbid }
        );
        if (cached) {
          summaryText = cached.summary;
          generatedAt = cached.generated_at;
          // If stale and auto-generate enabled, refresh in background
          if (isSummaryStale(cached.generated_at) && aiState.autoGenerateOnVisit) {
            generateSummary(); // intentionally not awaited
          }
        } else if (aiState.autoGenerateOnVisit && getAiProvider()) {
          generateSummary();
        }
      } catch {
        // Silent
      }
    })();
  });
</script>

{#if summaryText || isGenerating}
  <section class="ai-summary" data-testid="ai-summary">
    <span class="ai-badge">AI</span>
    {#if isGenerating}
      <p class="ai-generating">Generating...</p>
    {:else}
      <p class="ai-summary-text">{summaryText}</p>
      <div class="ai-summary-footer">
        <span class="ai-timestamp">{formattedTimestamp}</span>
        <button class="ai-regenerate" onclick={generateSummary} aria-label="Regenerate summary">↺</button>
        <span class="ai-attribution">AI summary based on MusicBrainz data</span>
      </div>
    {/if}
  </section>
{/if}
```

### Provider Configuration List (TypeScript constant)

```typescript
// In a new src/lib/ai/providers.ts or inline in AiSettings.svelte
export const AI_PROVIDERS = [
  {
    id: 'aimlapi',
    label: 'AI/ML API',
    baseUrl: 'https://api.aimlapi.com',
    badge: 'Recommended — affiliate link',
    affiliateUrl: 'https://aimlapi.com/?via=MERCURY',  // hardcoded constant
    instructions: 'Sign up, copy your API key, paste below. Access 200+ models with one key.'
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    badge: null,
    affiliateUrl: null,
    instructions: 'Use your OpenAI platform API key.'
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    badge: null,
    affiliateUrl: null,
    instructions: 'Use your Anthropic Console API key.'
  }
] as const;
```

### aiState Extension

```typescript
// Source: src/lib/ai/state.svelte.ts — extend existing AiState interface
export interface AiState {
  // ... existing fields ...
  autoGenerateOnVisit: boolean;    // new: opt-in toggle
  selectedProviderName: string;    // new: 'aimlapi' | 'openai' | 'anthropic'
}

// Default values to add to ai_settings table defaults in taste_db.rs:
// ("auto_generate_on_visit", "false"),
// ("selected_provider_name", ""),
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic tag-based AI summary (fallback bio) | Release-data-grounded summary (Phase 18) | Phase 18 | Separate section, better data, always labeled |
| Single remote provider (manual URL entry) | Named provider list with affiliate badge | Phase 18 | UX improvement; affiliate disclosure required |
| AI settings as one block | Extended with auto-generate toggle + provider selector | Phase 18 | New settings keys in taste.db |

**Existing infrastructure that Phase 18 builds on:**
- `RemoteAiProvider` — handles all three providers (OpenAI-compatible endpoint)
- `ai_settings` table — key/value store in taste.db, extensible without schema migration
- `getAiProvider()` / `aiState` — provider access pattern used everywhere
- `PROMPTS` object in `prompts.ts` — centralized prompt registry

---

## Open Questions

1. **Anthropic's base URL for OpenAI-compatible endpoint**
   - What we know: Anthropic supports an OpenAI-compatible messages endpoint (`/v1/messages` with `anthropic-version` header). However, the compatibility layer requires different auth headers (`x-api-key` rather than `Authorization: Bearer`).
   - What's unclear: Whether `RemoteAiProvider` as currently written (using `Authorization: Bearer`) will work with Anthropic's native endpoint.
   - Recommendation: Use aimlapi as the recommended Anthropic-via-proxy option (aimlapi proxies Anthropic with standard Bearer auth). For direct Anthropic, document the auth difference and consider a `authHeaderStyle` param in `RemoteAiProvider`.

2. **Prompt token count with large discographies**
   - What we know: Releases are fetched with `limit=50` from MusicBrainz. At ~15 tokens per release line, 50 releases = ~750 tokens of context.
   - What's unclear: Whether cheap models (e.g., GPT-4o-mini at $0.15/1M input) will handle 50 releases correctly or need trimming.
   - Recommendation: Slice releases to 20 entries in the prompt (recent albums/EPs first, which the existing sort order already produces). This keeps total prompt under ~400 tokens regardless of model.

3. **Model field UX**
   - What we know: The model name varies widely across providers. aimlapi uses model IDs like `"claude-3-5-sonnet-20241022"`, OpenAI uses `"gpt-4o-mini"`, etc.
   - What's unclear: Whether to show a fixed dropdown of known good models per provider or a free-form text input.
   - Recommendation: Free-form text field is correct for the planner's discretion. Pre-fill a sensible default when user selects a provider (e.g., `gpt-4o-mini` for OpenAI, `claude-3-5-haiku-20241022` for Anthropic/aimlapi).

---

## Sources

### Primary (HIGH confidence)

- Codebase: `src/lib/ai/engine.ts`, `remote-provider.ts`, `state.svelte.ts`, `prompts.ts` — full AI module reviewed
- Codebase: `src-tauri/src/ai/taste_db.rs` — DDL patterns, command patterns, existing table schema
- Codebase: `src-tauri/src/lib.rs` — command registration pattern
- Codebase: `src/routes/artist/[slug]/+page.ts` — confirms releases already available with title/year/type
- Codebase: `src/routes/artist/[slug]/+page.svelte` — confirms section placement context, existing aiBio pattern
- Codebase: `src/routes/settings/+page.svelte`, `src/lib/components/AiSettings.svelte` — settings UI patterns
- Codebase: `tools/test-suite/manifest.mjs` — code-check test patterns for Phase 18 entries

### Secondary (MEDIUM confidence)

- `.planning/phases/18-ai-auto-news/18-CONTEXT.md` — all locked decisions from user discussion
- `.planning/REQUIREMENTS.md` — NEWS-01, NEWS-02, NEWS-03 exact requirement text
- `.planning/STATE.md` — "AI auto-news prompt must include actual MusicBrainz release data as context — free-form generation explicitly prohibited (hallucination guard)"

### Tertiary (LOW confidence)

- Anthropic OpenAI-compatible API auth header behavior — unverified from codebase inspection alone; flagged as Open Question 1.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new dependencies
- Architecture: HIGH — patterns directly copied from existing features (taste_db, ArtistStats, onMount IIFE)
- Pitfalls: HIGH — derived from direct codebase reading of the areas that will change
- Anthropic direct auth header: LOW — flagged as open question, mitigated by aimlapi recommended path

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (30-day estimate — stable stack, no fast-moving libraries)
