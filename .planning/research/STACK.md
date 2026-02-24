# Stack Research

**Domain:** v1.3 The Open Network — ActivityPub outbound, Nostr listening rooms, artist tools, sustainability
**Researched:** 2026-02-24
**Confidence:** HIGH (Nostr/NDK, MusicBrainz, ActivityPub endpoints), MEDIUM (ActivityPub RSA signing), HIGH (artist static site generator approach)

---

## Context: What Already Exists (Do Not Re-Add)

This is a subsequent-milestone document. The following are already installed, integrated, and working. Do not re-research, re-add, or duplicate these.

| Already Present | Version | Notes |
|-----------------|---------|-------|
| `@nostr-dev-kit/ndk` | ^3.0.0 | NDK — NIP-17 DMs, NIP-28 rooms, ephemeral sessions fully implemented |
| `@nostr-dev-kit/ndk-svelte` | ^2.4.48 | Svelte 5 Nostr reactive stores |
| `nostr-tools` | ^2.23.1 | Low-level Nostr utility functions |
| `feed` | ^5.2.0 | RSS/Atom generation — used for RSS feeds on artist/scene/collection pages |
| `@tauri-apps/api` | ^2.10.1 | Tauri IPC, file system access |
| `@tauri-apps/plugin-sql` | ^2.3.2 | SQLite via Tauri |
| `reqwest` (Rust) | ^0.12 | HTTP client — already used in AI model download |
| `rusqlite` (Rust) | ^0.31 bundled | Direct SQLite access in Rust |
| `serde` + `serde_json` (Rust) | ^1 | JSON serialization |
| `base64` (Rust) | ^0.22 | Base64 encoding — needed for AP HTTP signatures too |
| `tauri-plugin-shell` | ^2.3.5 | Shell commands from Tauri |
| `tauri-plugin-dialog` | ^2.6.0 | File picker dialogs |
| MusicBrainz support link categorization | — | `categorize.ts` already maps `'patronage'` and `'crowdfunding'` MB relationship types to `'support'` category. Artist page already renders the 'support' link group. |
| Ephemeral Nostr sessions (kind:20001/20002) | — | `sessions.svelte.ts` — listening party sessions with host/guest, public/private, 1hr TTL |

---

## Feature 1: ActivityPub Outbound

**Goal:** Artist pages, scenes, and collections become AP actors that Fediverse users can follow. Outbound-only — Mercury posts announcements (new artist discovery, scene events) to followers on other AP servers. No inbox processing.

### What ActivityPub Outbound Actually Requires

ActivityPub for outbound-only (read: Mercury publishes, Fediverse reads) requires:

1. **WebFinger endpoint** — `/.well-known/webfinger?resource=acct:artist@mercury.domain` → JSON discovery doc
2. **Actor JSON-LD document** — stable URL per actor, served with `Content-Type: application/activity+json`
3. **Outbox endpoint** — ordered collection of `Create` activities (announcements)
4. **Inbox field in actor doc** — must exist in actor JSON even if not implemented; Mastodon rejects inbox-less actors (legacy requirement per Mastodon spec)
5. **HTTP Signatures on outbound POSTs** — when Mercury sends activities to follower inboxes, each HTTP POST must be signed with the actor's RSA private key (cavage-12 draft: Date + Digest + Signature headers)
6. **RSA-2048 keypair per actor** — private key stored locally, public key published in actor doc

### Architecture Decision: No AP Library

**Do not add an ActivityPub framework library** (e.g., `activitypub-express`, `@activity-pub/activitypub`). Mercury is outbound-only — no inbox processing, no federation relay, no delivery queue. The AP spec at this scope is 4 JSON templates + RSA signing. A full framework adds 50+ dependencies for 10% of the use cases. Hand-craft the JSON.

### What Needs Adding: Rust HTTP Server for AP Serving

ActivityPub endpoints need to be reachable by Mastodon/Pleroma/Misskey servers on the public internet. Mercury is a desktop app — this requires an embedded HTTP server in the Tauri Rust process, publicly reachable (via user-configured port forwarding or tunnel).

**Option A (recommended): axum** — lightweight, Tokio-native (same runtime as Tauri), no runtime conflict.

**Why not actix-web:** actix-web uses its own runtime and requires spawning on a `std::thread` to avoid conflict with Tauri's Tokio runtime. This adds complexity. axum runs directly on `tauri::async_runtime::spawn` without thread gymnastics.

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `axum` (Rust) | ^0.8 | Embedded HTTP server for AP endpoints | Tokio-native, no runtime conflict with Tauri, minimal boilerplate for JSON routes |
| `tower` (Rust) | ^0.5 | Middleware layer for axum | Required by axum for CORS and request handling |

**RSA signing for outbound HTTP:** Node.js `crypto` module (Web Crypto API in the SvelteKit frontend) can generate RSA-OAEP-2048 keypairs and sign. In the Rust side, `rsa` crate handles signing for outbound delivery. Check which layer does delivery.

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `rsa` (Rust) | ^0.9 | RSA-SHA256 signing for AP HTTP signatures | Pure Rust, no OpenSSL dependency, handles PKCS#1 signing required by Mastodon |
| `sha2` (Rust) | ^0.10 | SHA-256 for Digest header generation | Already likely in tree via tauri deps; needed for AP body digest |

**Key generation:** Use Web Crypto API (`window.crypto.subtle.generateKey`) in TypeScript to generate the keypair in the frontend, store private key in taste.db via Tauri SQL. Public key extracted as PEM and embedded in actor JSON. This avoids adding a key-gen Rust command.

### AP Endpoint Structure (No New JS Libraries)

The actor JSON, WebFinger response, and outbox are plain TypeScript objects serialized to JSON. SvelteKit's `+server.ts` files handle these routes when the embedded axum server proxies or when the SvelteKit app is the AP server. Given Mercury is desktop-only (static build), the axum Rust server serves AP endpoints directly — SvelteKit doesn't serve these, axum does.

**Endpoint routes in axum:**
- `GET /.well-known/webfinger` — WebFinger discovery
- `GET /ap/artist/:mbid` — Actor document
- `GET /ap/artist/:mbid/outbox` — OrderedCollection of Create activities
- `POST /ap/artist/:mbid/inbox` — Accept 200 OK, discard body (satisfy Mastodon requirement)
- `GET /ap/scene/:id` — Scene actor
- `GET /ap/collection/:id` — Collection actor

---

## Feature 2: Listening Rooms (Synchronized Embed Playback)

**Goal:** Host controls which embedded player (Bandcamp/Spotify/YouTube/SoundCloud) is playing and at what position. Guests sync to host. Coordination via Nostr.

### What's Already There

`sessions.svelte.ts` already implements ephemeral Nostr sessions (kind:20001/20002) for listening parties with host/guest, public/private, session metadata (artistName, releaseName, artistMbid). The existing sessions are text-only — they announce what's being listened to but don't coordinate playback state.

### What Needs Adding: Playback Sync Events

NIP-53 (kind:30311 Live Activities) is the closest Nostr standard. However, kind:30311 is designed for audio stream URLs, not embed URL + timestamp sync. For Mercury's use case (iframe embed control, not a real stream), extend the existing ephemeral session protocol.

**No new Nostr library needed.** NDK ^3.0.0 supports subscribing to any event kind. The sync protocol is a Mercury-specific ephemeral event (kind:20003, within ephemeral range 20000-29999) that carries playback state.

**Mercury playback sync event (kind:20003):**
```json
{
  "kind": 20003,
  "tags": [
    ["e", "<sessionId>"],
    ["t", "mercury"],
    ["t", "playback-sync"],
    ["expiration", "<unix+3600>"]
  ],
  "content": "{\"embedUrl\": \"https://bandcamp.com/...\", \"platform\": \"bandcamp\", \"position\": 42.5, \"playing\": true, \"sequence\": 17}"
}
```

Host publishes kind:20003 events when playback state changes (play/pause, seek, track change). Guests subscribe and apply state. `sequence` field prevents out-of-order application.

**No new npm packages needed.** The existing `player/` module (`playback.svelte.ts`, `audio.svelte.ts`, `state.svelte.ts`) already manages embed state. Listening room sync wires kind:20003 events into the existing player state.

**NIP-53 reference:** NIP-53 defines kind:1311 for live chat messages. Mercury can use kind:1311 alongside kind:20003 for room chat, replacing or complementing the current kind:20001 text messages. This is optional — kind:20001 already works.

---

## Feature 3: Artist Tools

### 3a. Discovery Stats Dashboard

**Goal:** Show an artist their Mercury stats — how many searches led to their page, which tags drove traffic, which scenes they appear in.

**What's already there:** The local SQLite `taste.db` records user history. The main `mercury.db` holds the artist index. No cross-user aggregation exists (offline-first, no server).

**Architecture:** Stats are local only — Mercury cannot aggregate cross-user data (no server, no telemetry). The dashboard shows the *local user's* interaction with an artist: how many times they searched for them, played them, added to collections, shared. This is honest and privacy-preserving.

**No new libraries needed.** SQLite queries via `tauri-plugin-sql` already available. Stats are a new set of SQL queries against existing tables. Display in Svelte components with existing D3 (already installed for style map and taste fingerprint).

### 3b. AI Auto-News

**Goal:** AI-generated "what's new" content for artists — release announcements, scene activity summaries.

**What's already there:** `ai/engine.ts` + `ai/prompts.ts` provide the local AI pipeline (llama.cpp sidecar, Qwen2.5 3B). `ai/local-provider.ts` and `ai/remote-provider.ts` handle model routing. Prompt templates in `prompts.ts` cover artist summaries, genre descriptions, scene descriptions.

**What needs adding:** A new prompt template in `prompts.ts` for news-style summaries, plus a trigger mechanism (scheduled or on-visit). The existing AI pipeline handles execution.

**No new libraries needed.** Add a prompt to `prompts.ts`, a schedule trigger (use `setInterval` or store a `lastGenerated` timestamp in taste.db), and a news display component.

**Data sources for news content:** MusicBrainz live API (already used — artist releases endpoint), scene Nostr events (already fetched via NDK). AI summarizes what it finds.

### 3c. Self-Hosted Static Site Generator

**Goal:** Artist clicks "Generate my site" — Mercury produces a folder of static HTML/CSS/JS that the artist can self-host anywhere. No claiming, no Mercury account. Pure export.

**Architecture:** Generate a minimal SvelteKit-style static site using a Tauri Rust command that writes files to disk. The generated site is a standalone HTML/CSS package, not dependent on Mercury infrastructure.

**Approach:** Rust command (`#[tauri::command]`) that:
1. Fetches artist data (name, tags, biography, cover art URL, platform links, releases) from existing APIs
2. Renders HTML using a template string (no separate template engine needed — Rust's `format!` macro for small templates, or `minijinja` for complex ones)
3. Writes output to a user-selected directory (via `tauri-plugin-dialog` file picker — already installed)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `minijinja` (Rust) | ^2.0 | Jinja2-compatible template engine for Rust | Lightweight (no dependencies), familiar syntax, handles the HTML generation complexity that `format!` can't cleanly handle for multi-page sites |

**Alternative considered:** Generate the site entirely in TypeScript using SvelteKit's prerender capability. Rejected — the Tauri app is already built as a static SPA; adding a secondary "build a different SvelteKit app" pipeline inside the running app is complex. A Rust template engine writing files directly is simpler and keeps the generated output predictable.

**What NOT to add:** Do not add `@sveltejs/kit` as a runtime dependency for site generation. The app is already a SvelteKit app — this would be circular. The generated artist sites are simple enough (biography, discography, embed links) to not need a full framework.

---

## Feature 4: Sustainability

### 4a. Artist Support Links (MusicBrainz)

**Status: Already implemented.** This needs verification, not new stack.

The existing stack already handles this:
- `categorize.ts` maps MusicBrainz relationship types `'patronage'` and `'crowdfunding'` to the `'support'` link category (confirmed: lines 41-42)
- `types.ts` defines `'support'` as a `LinkCategory` and includes it in `LINK_CATEGORY_ORDER`
- `artist/[slug]/+page.svelte` renders all categories including 'support' in the links section
- The artist links API (`/api/artist/[mbid]/links`) fetches URL relationships including patronage/crowdfunding from MusicBrainz `?inc=url-rels`

MusicBrainz has two relevant relationship types (confirmed via official docs):
- `'patronage'` (UUID: 6f77d54e-1d81-4e1a-9ea5-37947577151b) — Patreon, Ko-fi, PayPal.me, Flattr
- `'crowdfunding'` (UUID: 93883cf6-e818-4938-990e-75863f8db2d3) — Kickstarter, Indiegogo

**Action needed:** Visual differentiation — support links should render differently (highlight, icon) vs. info links. No new library — CSS + existing link rendering.

### 4b. Mercury Project Funding Links

**Goal:** A screen in Mercury showing how to support the project (GitHub Sponsors, Open Collective, etc.).

**No new libraries needed.** Static screen in Svelte with hardcoded links. Use `FUNDING.yml` in the repo (GitHub convention) for discoverability. Display in an "About / Support" panel.

### 4c. Backer Credits Screen

**Goal:** Display names/handles of Mercury backers/supporters.

**Approach:** Publish a Nostr list event from the Mercury project account. Clients read and display. NIP-51 kind:30003 (bookmark sets / custom lists) or a custom kind works. NDK already available to fetch and display.

**No new libraries needed.** NDK `ndk.fetchEvents()` already used throughout the codebase. A backer list is a `#t: ['mercury', 'backers']` tagged replaceable event. Display in the About screen.

---

## New Stack Additions Summary

| Library | Layer | Version | Why | Install |
|---------|-------|---------|-----|---------|
| `axum` (Rust) | AP HTTP server | ^0.8 | Tokio-native embedded HTTP, no runtime conflict with Tauri | `Cargo.toml` |
| `tower` (Rust) | axum middleware | ^0.5 | Required by axum; CORS, routing layers | `Cargo.toml` |
| `rsa` (Rust) | AP HTTP signatures | ^0.9 | RSA-SHA256 signing for AP outbound delivery (cavage-12) | `Cargo.toml` |
| `sha2` (Rust) | AP body digest | ^0.10 | SHA-256 Digest header for AP HTTP signatures | `Cargo.toml` |
| `minijinja` (Rust) | Artist site generator | ^2.0 | HTML template rendering for static site export | `Cargo.toml` |

**Zero new npm packages needed for any v1.3 feature.** All TypeScript/Svelte functionality uses existing NDK, feed, SvelteKit, and D3 capabilities.

---

## Installation

```bash
# All new dependencies are Rust-side. Add to src-tauri/Cargo.toml:

# [dependencies] additions:
# axum = { version = "0.8", features = ["json", "tokio"] }
# tower = { version = "0.5", features = ["util"] }
# rsa = { version = "0.9", features = ["sha2"] }
# sha2 = "0.10"
# minijinja = { version = "2", features = ["loader"] }

# No npm installs needed.
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `axum` (AP server) | `actix-web` | actix-web requires separate `std::thread` to avoid Tauri runtime conflict; axum is Tokio-native |
| `axum` (AP server) | `warp` | warp is unmaintained (last release 2022); axum is the successor |
| `axum` (AP server) | `tauri-plugin-localhost` | Plugin exposes the *app's SPA assets* on localhost, not suitable for serving custom AP JSON endpoints |
| No AP library | `activitypub-express` | Mercury is outbound-only; full AP framework adds 50+ deps for inbox/federation features we don't use |
| No AP library | `@misskey-dev/summaly` | Social graph tool, not relevant here |
| `minijinja` | `tera` | tera is a good alternative; minijinja is lighter and uses familiar Jinja2 syntax |
| `minijinja` | `handlebars` | handlebars (Rust) is heavier; minijinja more idiomatic for this use |
| `minijinja` | TypeScript template literals | For a multi-page site with partials and conditionals, string concatenation in TS becomes unmaintainable; the Rust command is simpler |
| Web Crypto API (key gen) | `openssl` (Rust) | openssl requires system OpenSSL; `rsa` crate is pure Rust, no system dep |
| NIP-51 kind:30003 (backers) | Custom kind | Using standard NIP-51 list kinds means any Nostr client can read the backer list |
| kind:20003 (playback sync) | NIP-53 kind:30311 | NIP-53 is designed for real audio stream URLs; Mercury syncs embed iframes + timestamps, which NIP-53 doesn't model well |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| ActivityPub JS framework (`activitypub-express`, etc.) | Mercury is outbound-only — full AP frameworks solve inbox/delivery/federation complexity Mercury doesn't need | Hand-craft 4 JSON templates |
| `warp` (Rust HTTP) | Unmaintained since 2022 | `axum` |
| `actix-web` | Runtime conflict with Tauri's Tokio | `axum` |
| `openssl` (Rust) | System dependency, compile complexity | `rsa` crate (pure Rust) |
| New Nostr library | NDK ^3.0.0 already installed and used | Extend existing NDK usage |
| `vitest` or test framework additions | v1.2 explicitly deferred this; no new features need component tests | Existing Playwright CDP suite |
| Second SvelteKit build pipeline for artist sites | Circular: the app IS a SvelteKit app; a nested build is complex | `minijinja` Rust templates |

---

## Stack Patterns by Feature

**ActivityPub actor (per artist/scene/collection):**
- axum route handles `GET /ap/:type/:id` → returns JSON-LD with `Content-Type: application/activity+json`
- Actor includes `publicKey` (RSA-2048 public key PEM) generated once per actor, stored in taste.db
- WebFinger at `/.well-known/webfinger` maps `acct:artist-mbid@mercury.local` → actor URL
- Outbox is an `OrderedCollection` of `Create` + `Note` activities (recent Mercury events for this actor)
- Inbox exists as a route but returns 200 and discards body (Mastodon compatibility requirement)

**Outbound AP delivery:**
- When a follower follows an actor (their server sends a Follow to Mercury's inbox), Mercury's axum handler accepts it and stores the follower's inbox URL in taste.db
- When Mercury wants to announce (new discovery, scene update), Rust code POSTs a `Create` activity to each follower's inbox URL via `reqwest` (already in Cargo.toml)
- Each POST signed with actor's private RSA key: `Date`, `Digest`, `Signature` headers (cavage-12 draft)

**Playback sync (listening rooms):**
- Host: on play/pause/seek/track-change → publish kind:20003 ephemeral Nostr event via NDK
- Guest: subscribe to kind:20003 events tagged with session ID → apply playback state to local player
- Both sides already have `ndkState.ndk` initialized → zero new Nostr setup
- Sequence number in event content prevents out-of-order state application

**Artist static site generator:**
- User clicks "Generate site" on artist page → `invoke('generate_artist_site', { mbid, outputDir })`
- Rust fetches artist data from existing APIs (reqwest + MusicBrainz)
- minijinja renders HTML templates (index.html, releases.html, links.html)
- Writes to user-selected directory (tauri-plugin-dialog picker already installed)
- Output: self-contained `/artist-name/` folder with inline CSS, no JS dependencies, no Mercury dependency

**Backer credits:**
- Mercury project Nostr account publishes a kind:30003 list event tagged `['t', 'mercury-backers']`
- App fetches on About screen load: `ndk.fetchEvents({ kinds: [30003], '#t': ['mercury-backers'] })`
- Display npub handles and optional display names from the list's `p` tags

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `axum@0.8` | `tokio` embedded in Tauri 2.0 | axum 0.8 requires tokio 1.x — Tauri 2.0 uses tokio 1.x internally |
| `rsa@0.9` | `sha2@0.10` | rsa 0.9 uses `sha2` as a feature gate — versions must align |
| `minijinja@2` | Rust edition 2021 | Already the project's edition |
| NDK `@nostr-dev-kit/ndk@3.0.0` | kind:20003 ephemeral | NDK supports any kind number; ephemeral 20000-29999 are relayed but not stored per NIP-01 |
| `reqwest@0.12` (existing) | AP outbound delivery | Already installed; used for AI model downloads; reuse for AP POST delivery |
| `base64@0.22` (existing) | AP HTTP signature encoding | Already in Cargo.toml; needed for AP signature Base64 encoding |

---

## Critical Finding: Zero New npm Dependencies

The most important finding for v1.3 planning: **every TypeScript/Svelte capability needed already exists in the installed npm dependency tree.** NDK handles Nostr playback sync events. The `feed` package handles outbox generation if needed. D3 handles stats charts. The existing player module manages embed state.

All new stack additions are Rust-side (axum, rsa, sha2, minijinja) for the ActivityPub HTTP server and the site generator command. The JavaScript/TypeScript layer extends, not expands.

The artist support links (Patreon/Ko-fi via MusicBrainz) are the most surprising finding: **this feature is already implemented end-to-end**. MusicBrainz 'patronage' and 'crowdfunding' relationship types are already mapped to the 'support' category, and the artist page already renders all link categories including 'support'. The v1.3 task for sustainability links is visual polish, not new stack.

---

## Sources

- [Mastodon ActivityPub spec](https://docs.joinmastodon.org/spec/activitypub/) — Inbox required in actor doc even for outbound-only; Content-Type requirements. HIGH confidence.
- [Mastodon blog: How to implement a basic ActivityPub server](https://blog.joinmastodon.org/2018/06/how-to-implement-a-basic-activitypub-server/) — Inbox field requirement confirmed; RSA-2048 keypair; HTTP signature headers (Date, Digest, Signature, cavage-12). HIGH confidence.
- [maho.dev ActivityPub static site guide (2024)](https://maho.dev/2024/02/a-guide-to-implementing-activitypub-in-a-static-site-or-any-website-part-3/) — WebFinger structure; actor JSON-LD template; Content-Type: application/activity+json requirement. MEDIUM confidence (single source, well-documented).
- [NIP-53 spec (nips.nostr.com)](https://nips.nostr.com/53) — kind:30311, kind:1311 live chat, streaming tag structure. HIGH confidence (official spec).
- [NIP-51 spec (nips.nostr.com)](https://nips.nostr.com/51) — kind:30003 bookmark sets; kind:10003 bookmarks. HIGH confidence (official spec).
- [MusicBrainz Artist-URL relationships](https://musicbrainz.org/relationships/artist-url) — 'patronage' (UUID: 6f77d54e) and 'crowdfunding' (UUID: 93883cf6) relationship types confirmed. HIGH confidence (official MB docs).
- [axum GitHub / crates.io](https://github.com/tokio-rs/axum) — axum 0.8 is current stable; Tokio-native. HIGH confidence.
- [Tauri discussion: Running actix-web from Tauri](https://github.com/tauri-apps/tauri/discussions/2942) — actix-web runtime conflict with Tauri; separate std::thread workaround. MEDIUM confidence (community discussion, multiple confirmations).
- [MoonGuard blog: Setting up Actix Web in a Tauri App](https://blog.moonguard.dev/setting-up-actix-in-tauri) — Confirms runtime conflict pattern; axum is simpler alternative. MEDIUM confidence.
- [actix-webfinger crate](https://docs.rs/actix-webfinger/0.4.1/actix_webfinger/) — Exists but not needed; WebFinger is simple enough to hand-craft in axum. LOW confidence (not used).
- Existing codebase inspection — `categorize.ts`, `types.ts`, `+page.svelte` artist page, `sessions.svelte.ts`, `Cargo.toml`, `package.json`. HIGH confidence (direct code read).

---

*Stack research for: Mercury v1.3 — The Open Network (ActivityPub outbound, synchronized listening rooms, artist tools, sustainability)*
*Researched: 2026-02-24*
