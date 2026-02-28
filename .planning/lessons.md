# Mercury — Lessons Learned

Project-specific patterns derived from corrections. Reviewed automatically at session start.

---

## 2026-02-28 — Tauri 2.0 drag region requires explicit capability
**Mistake:** Assumed `data-tauri-drag-region` would work with just the attribute present.
**Rule:** In Tauri 2.0, `data-tauri-drag-region` calls `startDragging()` internally, which requires `core:window:allow-start-dragging` in capabilities. Without it the attribute is silently ignored. Always add this capability alongside `decorations: false`.
