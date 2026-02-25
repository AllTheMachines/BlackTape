# HANDOFF — Post-UAT: 12 Issues Ready to Fix

**Date:** 2026-02-25
**Status:** UAT session complete, 12 GitHub issues filed. Nothing started on fixes yet.

---

## What Just Happened

Steve did a 44-minute first-time user walkthrough of Mercury (screen recording). Processed with `/uat-review` skill: Whisper transcription → incident detection → frame extraction → GitHub issues. All 12 issues filed to `AllTheMachines/Mercury`.

---

## Open Issues (priority order)

### Blockers — fix first
| Issue | Title | Why urgent |
|-------|-------|------------|
| [#9](https://github.com/AllTheMachines/Mercury/issues/9) | Profile page always 500 Internal Error | Dead end on first nav |
| [#4](https://github.com/AllTheMachines/Mercury/issues/4) | Discover page: gray boxes, images never load | App looks broken immediately |
| [#8](https://github.com/AllTheMachines/Mercury/issues/8) | No album cover art anywhere (library + artist pages) | App feels empty everywhere |
| [#7](https://github.com/AllTheMachines/Mercury/issues/7) | Crate Dig country filter does nothing | Core feature broken |

### Navigation bugs
| Issue | Title |
|-------|-------|
| [#5](https://github.com/AllTheMachines/Mercury/issues/5) | Back navigation broken (KB → Style Map) |
| [#3](https://github.com/AllTheMachines/Mercury/issues/3) | No home button; dark contrast throughout app |

### Playback bugs
| Issue | Title |
|-------|-------|
| [#12](https://github.com/AllTheMachines/Mercury/issues/12) | Spacebar restarts playback instead of pausing |
| [#14](https://github.com/AllTheMachines/Mercury/issues/14) | Play All / Queue All buttons do nothing |

### Data bugs
| Issue | Title |
|-------|-------|
| [#6](https://github.com/AllTheMachines/Mercury/issues/6) | Time Machine shows future years (cap at current year) |
| [#13](https://github.com/AllTheMachines/Mercury/issues/13) | Duplicate Deezer entries on artist page |

### Enhancements
| Issue | Title |
|-------|-------|
| [#10](https://github.com/AllTheMachines/Mercury/issues/10) | Persist volume between sessions |
| [#11](https://github.com/AllTheMachines/Mercury/issues/11) | Search dropdown: arrow key navigation |

---

## Quick Wins (low effort, high impact)

**#6 — Time Machine future years** (5 min)
```js
// Cap slider max:
const maxYear = Math.min(rangeMax, new Date().getFullYear());
// Filter query:
WHERE begin_year <= strftime('%Y', 'now')
```

**#10 — Persist volume** (10 min)
Save volume to SQLite settings on change, restore on startup. Default to 0.5 if no saved value.

**#12 — Spacebar pause** (15 min)
Global keydown handler — spacebar should call `player.togglePlay()`, not trigger a button click that restarts.

**#13 — Deduplicate streaming links** (15 min)
Group MusicBrainz relationships by domain before rendering. Keep first URL per domain.

---

## Profile 500 — Where to look

The Profile route is crashing on load. Check:
- `src/routes/profile/+page.svelte` or `+page.server.ts` load function
- Any DB query that assumes rows exist (unhandled null from empty taste_tags/artist_anchors tables)
- Run app in dev mode and check the terminal for the actual error stack

---

## Cover Art — Where to look

Two separate surfaces affected:
1. **Library** — embedded ID3/FLAC art not being read during scan. Check `src/lib/tauri/scanner.ts` or equivalent — is `cover_art` being extracted from file metadata?
2. **Artist pages / Discover grid** — Cover Art Archive URLs. Check if the CAA fetch is being blocked (CSP?) or if the URL construction is wrong.

---

## Session Notes

- Build log updated (Entry 2026-02-25 "First UAT Session")
- UAT frames saved at: `C:\Users\User\AppData\Local\Temp\uat-review-20260225-142855\`
- Recording: `D:\Projects\_videoTestingApps\2026-02-25 13-35-39.mkv`
