# Deferred Items — Phase 09 Community Foundation

## Out-of-Scope Issues Discovered During Plan 03

### Pre-existing error in avatar.ts (from Plan 02 WIP)

**File:** `src/lib/identity/avatar.ts`
**Error:** `Module '"@dicebear/pixel-art"' has no exported member 'pixelArt'.`
**Context:** This error was present before Plan 03 execution began. The `@dicebear/pixel-art` package was installed in the Plan 02 dependency commit (`2a3e4b7`) but the import `{ pixelArt }` is not the correct export name for that package version.
**Impact:** `npm run check` returns exit code 1 with 1 error.
**Resolution:** Needs to be fixed in Plan 02 SUMMARY creation or a separate hotfix. The correct import from `@dicebear/pixel-art` v3+ may be a default export or different named export.
**Discovered during:** Task 2 (create import modules + CollectionShelf)
**Scope:** Out of scope for Plan 03 — this error is from Plan 02 WIP files not yet committed.
