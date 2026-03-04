---
phase: 37
slug: context-sidebar-decade-filtering
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-04
---

# Phase 37 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (no test config files detected) |
| **Config file** | none |
| **Quick run command** | `npm run check` |
| **Full suite command** | `npm run check` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run check`
- **After every plan wave:** Run `npm run check`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 37-01-01 | 01 | 1 | Decade row 50s–20s | manual | `npm run check` | ✅ | ⬜ pending |
| 37-01-02 | 01 | 1 | ERA_OPTIONS updated | automated | `npm run check` | ✅ | ⬜ pending |
| 37-02-01 | 02 | 1 | Sidebar search input | manual | `npm run check` | ✅ | ⬜ pending |
| 37-02-02 | 02 | 1 | Artist autocomplete | manual | `npm run check` | ✅ | ⬜ pending |
| 37-02-03 | 02 | 1 | Tag autocomplete | manual | `npm run check` | ✅ | ⬜ pending |
| 37-02-04 | 02 | 1 | Navigation on select | manual | `npm run check` | ✅ | ⬜ pending |
| 37-03-01 | 03 | 2 | AI companion visibility | manual | `npm run check` | ✅ | ⬜ pending |
| 37-03-02 | 03 | 2 | AI chat messages | manual | `npm run check` | ✅ | ⬜ pending |
| 37-03-03 | 03 | 2 | Context-aware AI | manual | `npm run check` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No test infrastructure exists in this project — all verification is manual (via running app) + TypeScript type checking.

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar search shows artist results | Sidebar search | No test framework | Type 2+ chars in sidebar search input, verify dropdown shows artists |
| Sidebar search navigates to `/artist/[slug]` | Sidebar search nav | No test framework | Click artist result, verify route changes |
| Sidebar search tag click navigates to `/search?q=TAG&mode=tag` | Tag nav | No test framework | Click tag result, verify URL params |
| AI companion hidden when `aiState.status !== 'ready'` | AI visibility | No test framework | Verify with AI disabled — section absent |
| AI companion visible when `aiState.status === 'ready'` | AI visibility | No test framework | Verify with AI enabled — section appears |
| Decade row shows 8 pills (50s–20s) | Decade row | No test framework | Open Discover, count era pills, verify 50s present |
| Decade toggle works for '50s' | Decade toggle | No test framework | Click 50s pill, verify `era=50s` in URL |
| Existing page-specific sidebar content preserved | Sidebar stacking | No test framework | Navigate to artist page — verify artist tags section still present below new sections |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
