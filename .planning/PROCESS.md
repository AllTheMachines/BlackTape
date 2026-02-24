# Mercury — Process Requirements

Cross-milestone process standards. These apply to all phases regardless of milestone.

## TEST-PLAN Requirement (PROC-03)

Every phase plan (PLAN.md) must include a mandatory `## TEST-PLAN` section before any code is written.

**Format:**
```markdown
## TEST-PLAN

Tests to be written for this plan:
- [test-id] Description of what will be verified
- [test-id] Description of what will be verified
```

**Rules:**
- Tests are defined before code, not after
- Every new feature, file, or behavior gets at least one test entry
- Use `fileContains`, `fileExists`, or `tauri` method assertions
- No CSS class selectors — use `data-testid` attributes

Introduced: v1.2 Phase 15 (PROC-03). Required for all phases in v1.3 and beyond.

## Pre-Commit Gate (PROC-01)

`--code-only` test suite runs on every commit via `.githooks/pre-commit`.
Suite must exit 0 before any commit lands.

Introduced: v1.2 Phase 15 (PROC-01).

## Phase Gate (PROC-02)

Full test suite (`node tools/test-suite/run.mjs`) must be green before any new phase begins execution.

Introduced: v1.2 Phase 13 (PROC-02).
