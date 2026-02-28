# Work Handoff - 2026-02-28

## Current Task
Processing UAT recording via `/uat-review`. Filing GitHub issues for all incidents found.

## Video
`F:\videorecordings\2026-02-28 11-27-15.mkv` (20:41)

## Working Directory
`/tmp/uat-review-20260228-120900/` — all frames extracted, all 20 incident folders present

## Progress
**13 of 20 incidents reviewed and posted.**

### Posted Issues
| # | Timestamp | Issue |
|---|-----------|-------|
| 1 | 02:15 | #43 — No loading indicator when clicking |
| 2 | 02:47 | #44 — Two Spotify Client ID fields, can't clear credentials |
| 3 | 03:17 | #45 — App repeatedly stops responding mid-session |
| 4 | 04:56 | #46 — Window cannot be dragged |
| 5 | 05:15 | #47 — About tab doesn't load for some artists |
| 6 | 05:51 | #48 — Remove Top Tracks section until implemented |
| 7 | 06:08 | #49 — Release page missing streaming links and play button |
| 8 | 07:24 | #50 — Discover page takes too long to load |
| 9 | 07:49 | #51 — Discover filter: custom tag input buried below generic tag cloud |
| 10 | 09:09 | #52 — Style Map non-interactive, nodes navigate away |
| 11 | 09:55 | #53 — Knowledge Base: no cities, truncated names, no genre map |
| 12 | 11:48 | #54 — Library/Crate Dig missing covers; no release type grouping |
| 13 | 13:26 | #55 — Library has no search; previously hung on load |

### Remaining (7 incidents)
| # | Timestamp | Type | Description |
|---|-----------|------|-------------|
| 14 | 14:11 | feature | No Play Album button on release page; "play from library" label confusing |
| 15 | 15:06 | bug | AI model downloads stuck on "pending" indefinitely |
| 16 | 16:23 | feature | Remove GitHub Sponsors/backers section when empty |
| 17 | 16:40 | feature | Bug report form needed (email to blacktape@all-the-machines.com) |
| 18 | 17:11 | ux | Settings page layout broken (text visible under elements) |
| 19 | 17:38 | bug | Streaming preferences changes don't apply |
| 20 | 19:54 | bug | LastFM import gives auth error ("not allowed permission") |

## How to Resume
1. Run `/resume` to load this handoff
2. Run `/uat-review` — but skip environment setup, audio extraction, transcription, and frame extraction (all done)
3. Go straight to incident 14 review loop
4. Frames for incidents 14-20 are at `/tmp/uat-review-20260228-120900/incident-N/`
5. Repo: `AllTheMachines/Mercury`

## Key Context
- Transcript already analyzed, all incidents identified
- All 20 incident frame folders exist in working dir
- Frame copying pattern: `cp /tmp/uat-review-20260228-120900/incident-N/frame-000X.png /d/Projects/Mercury/incN-fX.png` then Read from `/d/Projects/Mercury/incN-fX.png`
- Note: `performance` label doesn't exist in repo (issue #50 was filed without it)

## Resume Command
After running `/clear`, run `/resume` to continue.
