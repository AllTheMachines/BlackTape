---
phase: 35
slug: rabbit-hole
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vite.config.ts |
| **Quick run command** | `npm run check` |
| **Full suite command** | `npm run check && npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run check`
- **After every plan wave:** Run `npm run check && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 35-01-01 | 01 | 1 | Layout suppression | type-check | `npm run check` | ❌ W0 | ⬜ pending |
| 35-01-02 | 01 | 1 | /rabbit-hole route | type-check | `npm run check` | ❌ W0 | ⬜ pending |
| 35-01-03 | 01 | 1 | Sub-layout with exit+trail | type-check | `npm run check` | ❌ W0 | ⬜ pending |
| 35-02-01 | 02 | 1 | Artist page | type-check | `npm run check` | ❌ W0 | ⬜ pending |
| 35-02-02 | 02 | 1 | Genre page | type-check | `npm run check` | ❌ W0 | ⬜ pending |
| 35-02-03 | 02 | 1 | Similar artists nav | type-check | `npm run check` | ❌ W0 | ⬜ pending |
| 35-03-01 | 03 | 2 | History trail store | type-check | `npm run check` | ❌ W0 | ⬜ pending |
| 35-03-02 | 03 | 2 | New DB queries | type-check | `npm run check` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing TypeScript/Svelte infrastructure covers all phase requirements.
- No new test framework needed — `npm run check` provides type-checking across all new files.

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rabbit Hole full-screen immersion (no header/footer) | Layout suppression | Requires visual inspection in Tauri | Launch app, navigate to /rabbit-hole, verify header/footer absent |
| History trail breadcrumb display | History trail | Requires navigation sequence | Navigate Artist→Genre→Artist, verify trail shows each stop |
| Play button opens correct streaming source | Play integration | Requires user streaming pref + audio | Set streaming pref, click play, verify correct URL opens |
| Similar artists relevance | Similar artists | Subjective quality check | Search known artist, verify similar artists are related |
| Exit button returns to correct page | Exit navigation | Requires navigation state | Enter rabbit hole, click exit, verify landing |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
