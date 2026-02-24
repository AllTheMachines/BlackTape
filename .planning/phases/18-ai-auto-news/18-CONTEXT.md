# Phase 18: AI Auto-News - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Artist pages show a 2–3 sentence AI-generated summary derived from MusicBrainz catalog data (albums, years, genres) — always labeled, never invented. Includes on-demand regeneration and SQLite caching. AI provider is user-configurable via a dedicated Settings tab.

Creating, editing, or surfacing other kinds of editorial content belongs in other phases.

</domain>

<decisions>
## Implementation Decisions

### AI provider & configuration
- Provider is user-configurable: user picks provider AND model from a dedicated AI tab in Settings
- No default provider is pre-selected — user must actively choose
- Providers offered:
  - Direct: Anthropic, OpenAI (and potentially others)
  - Recommended option: a unified API platform (e.g. aimlapi.com) that gives access to multiple models under a single key — **marked with an inline badge: "Recommended — affiliate link"** (fully transparent; no hidden relationship)
- API key stored in Settings page (entered once, persisted locally)
- When user selects the unified API option: 'Get API key' opens the affiliate URL in the browser; setup instructions shown in-app alongside

### Summary placement & presentation
- Appears below the artist header, above releases — prime real estate, sets context before browsing
- Always visible (not collapsible) — 2–3 sentences is short enough
- **AI label:** Small badge above the summary text (e.g. `[AI]` chip or similar subtle indicator)
- **Timestamp:** Small text below the summary — "Generated 3 days ago" — so user knows freshness at a glance

### Regeneration trigger & states
- Regenerate button is inline near the summary (small circular arrow icon or "Refresh" label)
- **During generation:** Spinner + "Generating..." text replaces the summary area
- **On failure (API error, network):** Silent fail — revert to last cached summary without surfacing an error
- **If no cache exists and generation fails:** Show empty state (section remains hidden or shows nothing); no error message

### First visit & cold start
- Summary section is **hidden** until a summary exists (no placeholder visible if no cache and auto-generate is off)
- Auto-generate on visit is **opt-in**: only triggers if API key is set AND user has enabled "Auto-generate on artist visit" in AI settings
- Opt-in toggle lives in the AI settings tab alongside API key + provider config
- When auto-generate triggers: summary section appears on page load with spinner + "Generating..." while in progress

### Summary content & tone
- Data fed to AI: **albums + years + genres** (as phase spec defines — no additional fields)
- Tone: **factual-narrative** — state facts in readable, flowing sentences (not dry bullet stats, not editorial opinion)
- System prompt includes strict grounding instruction: "Only use the provided data. If information is not in the data, omit it." — enforces the "never invented" principle
- Prompt template is an internal implementation detail — not shown to users

### Cache & staleness
- 30-day TTL: summaries cached in taste.db; stale after 30 days
- On page visit with stale cache: show old summary immediately, auto-regenerate in background, replace when new version arrives
- Cache eviction: age-based only (30-day TTL); NOT cleared on DB rebuild or sync

### Claude's Discretion
- Exact visual design of the AI badge (color, weight, border)
- Regenerate button placement specifics (icon vs text, exact position)
- AI settings tab layout and field ordering
- Affiliate URL construction for unified API providers

</decisions>

<specifics>
## Specific Ideas

- The affiliate disclosure must be visible **before** the user clicks — "Recommended — affiliate link" as an inline badge on the provider option, not hidden behind a tooltip
- When the user selects the unified API provider, show a 'Get API key' button that opens the referral URL in the browser, with brief setup instructions remaining visible in the app
- Stale summaries should still show instantly on load — background refresh should feel invisible unless the user is watching
- "Generated 3 days ago" timestamp gives users natural cues for when to manually regenerate

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-ai-auto-news*
*Context gathered: 2026-02-24*
