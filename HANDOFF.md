# Mercury Handoff

**Date:** 2026-02-15
**Session:** Vision expansion + Phase 2 verification

## Where We Are

**Phase 2: Search + Artist Pages + Embeds** — Plan 5 of 5 (end-to-end verification)
- All automated checks pass (`npm run check`, `npm run build`)
- Full discovery loop verified visually via Playwright: landing, search, tag search, artist page with embeds, mobile
- **Waiting on Steve's visual sign-off to mark Phase 2 complete**

## What Happened This Session

### Vision Expansion (from voice memo)
Steve's 10-year vision transcribed and integrated into PROJECT.md:
- 6 new core concepts: Crate Digging Mode, Scene Maps, Time Machine, Liner Notes Revival, Import Your Library, Listening Rooms
- New UX Philosophy section (Record Shop metaphor — spatial, tactile, personal)
- Expanded: tagging (user + artist layers), Taste Fingerprint, writing inside platform, discussion threads, streaming service preference
- New Interoperability section: RSS everywhere, ActivityPub/Fediverse, import/export
- No vanity metrics elevated to core design rule

### Sustainability Strategy
Revenue Model replaced with full Sustainability section in PROJECT.md:
- Communication philosophy (never a popup, finances page as a feature)
- Physical goods: Taste Fingerprint prints, discovery tokens, tote bags, stickers, milestone drops, artist collab merch, liner notes backer credits
- 4-stage rollout tied to build phases
- Print-on-demand, zero inventory
- Rule: supporters get acknowledgment and physical goods, never platform advantages

### Requirements Expansion
REQUIREMENTS.md: 15 → 47 tracked requirements
- New sections: Interoperability (INTEROP), Listening Rooms (LISTEN), Artist Tools (ARTIST)
- Social: 2 → 10 requirements
- Discovery: 3 → 7 requirements
- Sustainability: 10 requirements (SUST-01 through SUST-10)

### Roadmap Expansion
ROADMAP.md: 6 → 9 phases
- Phase 7: Interoperability (ActivityPub/Fediverse)
- Phase 8: Listening Rooms
- Phase 9: Artist Tools (claiming, dashboard, news, site generator)
- Phase 0 expanded to 4 staged sustainability tracks

### Phase 2 Verification (plan 02-05)
Verified the full discovery loop:
- Landing page: dark theme, centered search, mode toggle
- Artist search ("radiohead"): 50 results, card grid, tags as chips
- Tag search ("dark ambient"): Lustmord, Atrium Carceri, Current 93, Coil, Merzbow
- Artist page (Ponyhof): two-column, Bandcamp link, Spotify button, SoundCloud embed
- Mobile (375px): single column, cards stack, search usable

## Resume Instructions

### To verify Phase 2 yourself:

```bash
npm run build
npx wrangler pages dev .svelte-kit/cloudflare --port 8788
```

Then open http://localhost:8788

**If D1 is empty** (search shows "unavailable"), copy the source database:
```bash
# Find the hash filename
ls .wrangler/state/v3/d1/miniflare-D1DatabaseObject/
# Copy source DB over it
cp pipeline/data/mercury.db .wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite
```

### After sign-off:
1. Mark Phase 2 complete — create 02-05-SUMMARY.md, update STATE.md and ROADMAP.md
2. Choose next: Phase 3 (Desktop) or Phase 0 Stage 1 (sustainability setup)

## Known Issues (not blocking)

1. **Search ranking**: "radiohead" returns "radiohead 3" first — FTS matches word in tags across unrelated artists. Fix belongs in Phase 4.
2. **Local dev DX**: `npm run dev` has no D1 access. Need wrangler for full testing.

## Git State

- Branch: `main`
- Last commit: `609b4d4` — docs: expand vision with full feature set, sustainability strategy, and 9-phase roadmap
- Pushed: yes
- Working tree: BUILD-LOG.md has post-commit hook append; untracked screenshots and config files

## Key Files

| File | What changed |
|------|-------------|
| `PROJECT.md` | Vision document — major expansion |
| `.planning/REQUIREMENTS.md` | 47 requirements (was 15) |
| `.planning/ROADMAP.md` | 9 phases + Phase 0 (was 6) |
| `BUILD-LOG.md` | Entries 010 (vision) + 011 (sustainability) |
