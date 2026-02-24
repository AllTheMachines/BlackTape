# Mercury — Handoff

**Date:** 2026-02-24

## Where We Are

Phase 18 (AI Auto-News) is **complete and working**. Next: **Phase 19 — Static Site Generator**

## What Was Done This Session

- UAT for Phase 18 complete (11 passed, 5 skipped desktop-only)
- Fixed 4 bugs found during live testing:
  1. `RemoteAiProvider` double `/v1` in URL → 404 on every API call
  2. DB had aimlapi base URL with OpenAI key (incompatible)
  3. API key trailing whitespace → auth failures
  4. AiSettings Phase 18 sections used `<section>` → Svelte styles didn't apply → invisible
- Bumped text-secondary/muted lightness for readability
- AI summaries confirmed working with OpenAI gpt-4o-mini

## Current State

- All 103 tests passing
- OpenAI key configured: `https://api.openai.com/v1`, model `gpt-4o-mini`
- Auto-generate on visit: enabled in DB

## Next Action

```
/gsd:plan-phase 19
```

Phase 19: Export any artist page as self-contained HTML the artist can host with zero Mercury dependency (SITE-01 through SITE-04).
