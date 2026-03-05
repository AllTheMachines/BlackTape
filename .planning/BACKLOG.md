# Backlog

*Synced from GitHub Issues: 2026-03-05*

---

## Infrastructure / Release

- [ ] #92: Auto-updater reliability: make it bulletproof on both platforms
  Windows users on v0.3.0 have never received an update notification. CI silently skips `latest.json` upload. No health check. Windows build is entirely manual.

- [ ] #15: MusicBrainz live update strategy [enhancement]
  Database will go stale — need incremental sync strategy using MusicBrainz replication packets.

---

## Features

- [ ] #88: Redesign graph-based discovery views (Style Map, Knowledge Base, Time Machine, Crate Dig)
  These are the core discovery features and they don't feel right. Need a rethink from scratch — possibly unified into one experience.

- [ ] #86: i18n: Add Japanese, Spanish, Portuguese, and Korean localization
  Four highest-priority markets. CJK search requires special FTS5 tokenization.

- [ ] #85: Customizable popularity/obscurity range slider
  User feedback from r/LetsTalkMusic — let users define their own mainstream/obscure sweet spot.

- [ ] #84: UX: Make discovery feel like browsing, not like using a database
  User feedback from r/LetsTalkMusic comparing to Every Noise at Once. Style Map needs to be more prominent and less data-heavy.

- [ ] #81: Automate MusicBrainz/Discogs submissions
  Investigate whether release info and cover art can be submitted automatically from within BlackTape.

- [ ] #79: Reload button when playback feels wrong
  Simple UX: a reload/refresh button when the player feels glitchy.

- [ ] #69: Improve UI boxes, tabs, and containers
  Too uniform. Part of general UI polish pass before wider release.

---

## Platform

- [ ] #78: Mac and Linux version support
  macOS is now shipping (v0.3.1+). Linux still outstanding.

- [ ] #87: macOS build
  ✅ Effectively done — macOS DMG shipped with v0.3.1. Close this.

---

## Marketing / Outreach

- [ ] #82: Contact @wyattxhim YouTube channel
- [ ] #75: Plan marketing timing and platform strategy
- [ ] #74: Marketing email copy: frame as music research/discovery tool
- [ ] #72: Record demo video (30-60s, landscape + portrait)
- [ ] #37: Figure out marketing approach [question]

---

## Planning / Housekeeping

- [ ] #77: Audit and clean up GitHub issues before launch
- [ ] #76: Create public roadmap if going open source
- [ ] #38: Research: scan audiologs and history for features discussed but not implemented [question]
- [ ] #36: Audit: is Mercury modular enough to disable features without breaking things? [question]
- [ ] #35: Decide v1 feature scope: what ships vs what's deferred [question]
  ✅ Effectively done — v2 features are hidden from nav. Close this.

---

## Documentation

- [ ] #39: Make a testing and debugging session video for Mercury [documentation]

---

*Run `/github` to refresh*
