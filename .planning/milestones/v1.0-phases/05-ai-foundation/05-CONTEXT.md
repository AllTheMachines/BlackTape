# Phase 5: AI Foundation - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Client-side AI that powers recommendations, natural-language exploration, artist summaries, and taste profiling. All processing local by default — user data never leaves their machine. Optional API key for users who want better results. This phase builds the AI engine and integrates it into the existing desktop app. Discovery mechanics (uniqueness scoring, tag browsing, style map) are Phase 6.

</domain>

<decisions>
## Implementation Decisions

### Natural Language Query UX
- Dedicated explore page — separate from the main search bar, not mixed into it
- One-shot query with free-text refinement: user types a query, gets results, then can type follow-up text to refine ("darker", "more electronic", "from the 90s")
- Results have a curated list feel — numbered, with descriptions, feels like a human wrote it. Not the same artist cards as regular search.
- Refinement is free text input below results (not suggested chips)

### Recommendation Surface
- Woven into artist pages — not a separate "For You" section
- Sits alongside (enhances) the existing tag-based Related Artists discovery panel from Phase 4, as a separate section
- No explanation for why something was recommended — just show the artists, let the music speak
- Recommendations require listening history — they only appear once there's enough taste data. No cold-start recs from catalog alone.

### Taste Profile
- Invisible engine with subtle hints — no dedicated "your taste" page, but the UI reflects taste (e.g. explore page surfaces genres the user gravitates toward)
- Fed by local library (scanned files) + explicit signals (saving/favoriting artists). Not passive browsing.
- Full user editing: tag management (add/remove/weight tags like "more ambient, less techno") AND artist anchors (pin specific artists as taste anchors)
- Both tag adjustments and artist anchors shape the same underlying profile

### AI Backend Strategy
- Local-first, API optional: ships with a small open-source model that runs locally. Users CAN add an API key (OpenAI, Anthropic, etc.) for better results. Local is default.
- Opt-in: AI features are off by default. User enables them with a clear prompt ("Enable AI features — downloads ~500MB model")
- Target local model size: medium (~500MB-1GB) — small language model capable of generating summaries and handling NL queries

### AI Content Transparency
- No "AI-generated" labels on summaries — if content is useful, the source method doesn't matter
- Standard loading states for AI operations — same spinner/skeleton as data loading, AI isn't treated as special
- Honest fallback: when AI can't produce a good result, show "Not enough data to generate this" rather than guessing wrong or showing nothing

### Claude's Discretion
- Exact model selection (which open model to use locally)
- Embedding strategy for artist similarity
- How taste profile is stored locally (schema, format)
- How API key configuration UI works
- Loading skeleton and progress designs
- How "subtle hints" of taste manifest in the UI

</decisions>

<specifics>
## Specific Ideas

- NL explore page should feel like getting a recommendation from a knowledgeable friend, not like querying a database
- Recommendations on artist pages should feel organic — like they belong there, not bolted on
- The opt-in model download should be clear about size and what it enables, but not scary
- Taste profile editing (tags + artist anchors) gives users real control over what the AI thinks they like

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-ai-foundation*
*Context gathered: 2026-02-17*
