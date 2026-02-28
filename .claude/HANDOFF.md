# Work Handoff - 2026-02-28

## Current Task
Working through open GitHub issues (bugs first, then enhancements).

## Completed This Session
- **#59** — About page feedback form: replaced mailto with direct POST to Cloudflare Worker (`/feedback` endpoint). Worker emails via Resend to `blacktape@all-the-machines.com`, stores in KV. (commit c70ffbd)
- **#58** — Hid "View backers" link on About page until Nostr backer feed active in v2.
- **Spotify scope fix** — Added `user-top-read` to Connect OAuth scopes so "Import from Spotify" works. (earlier commit)
- **Worker deployed** — `blacktape-signups.theaterofdelays.workers.dev` updated with `/feedback` endpoint.

## Currently Investigating
**#63 — App freezes when clicking album cover**

### What I found so far
- `ReleaseCard.svelte` wraps the cover in `<a href={releaseHref}>` (internal SvelteKit route)
- Navigating to a release page via CDP works fine — no freeze reproduced
- The Library page (`/library`) crashes on `waitForLoadState` in CDP (but that's issue #55 — library hangs on load, separate issue)
- Release page `+page.ts` makes an unguarded `fetch` to MusicBrainz with NO timeout — could hang indefinitely if MusicBrainz is slow
- Could not reproduce the specific freeze from the issue in automated testing

### Next Investigation Steps
1. Try reproducing by navigating to a page with many album covers and clicking rapidly
2. Check if the freeze is specifically in the **Tauri exe** vs dev mode
3. The MusicBrainz fetch in `+page.ts:58` has no timeout — add `AbortController` with ~10s timeout as a defensive fix regardless
4. Check if it's the `coverArtUrl` image itself (`coverartarchive.org` redirects to CDN) causing WebView2 to hang

## Remaining Open Issues (21 total)
**Bugs:**
- #63 App freezes on album cover click (currently investigating)
- #57 AI model download stuck on 'Pending'
- #54 Library/Crate Dig missing covers + no release type grouping
- #53 KB: no cities, truncated names, genre map not rendered
- #50 Discover page too slow
- #23 Scene page — local library not reflected

**Enhancements (high priority):**
- #56 Release page: Play Album button
- #55 Library: no search/filter + hangs on load
- #52 Style Map non-interactive
- #51 Discover: custom tag input buried
- #49 Release page: missing streaming links + per-track play
- #43 No loading indicator
- #25 Time Machine: no pagination, bad sort

## Key Files
- `src/routes/about/+page.svelte` — feedback form (just fixed)
- `src/lib/spotify/auth.ts` — `SCOPES` now includes `user-top-read`
- `/d/Projects/blacktapesite/worker/index.js` — Cloudflare Worker with `/feedback` endpoint
- `src/routes/artist/[slug]/release/[mbid]/+page.ts` — release page load (MusicBrainz fetch, no timeout)
- `src/lib/components/ReleaseCard.svelte` — cover art link

## Resume Command
After running `/clear`, run `/resume` to continue.
