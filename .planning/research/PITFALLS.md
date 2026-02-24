# Pitfalls Research

**Domain:** Adding ActivityPub federation, Nostr listening rooms, artist tools, and sustainability links to an existing Tauri 2.0 + SvelteKit + Nostr desktop app
**Researched:** 2026-02-24
**Confidence:** HIGH (ActivityPub/AP serving constraints verified with official docs and implementation guides; Nostr NIP-53 verified against spec; adapter-static/+server.ts gap verified against Tauri community reports and codebase review; MusicBrainz URL types verified against live MB documentation)

---

## Critical Pitfalls

### Pitfall 1: ActivityPub Cannot Be Served from a Desktop App — It Needs a Publicly Reachable HTTP Server

**What goes wrong:**
The plan is to expose artist pages, scenes, and collections as ActivityPub actors so the Fediverse can follow them. ActivityPub requires a publicly reachable HTTP server that:
- Responds to WebFinger discovery at `/.well-known/webfinger` with correct `Content-Type: application/jrd+json`
- Serves Actor JSON at stable URLs with `Content-Type: application/activity+json`
- Receives `Follow` activity POSTs to an inbox (Mastodon will POST to the inbox when a user tries to follow)
- Pushes `Create` activities to follower inboxes when new content appears (signed with RSA-SHA256 HTTP signatures)

A Tauri desktop app running on a user's machine is behind a home router, behind NAT, with no stable domain name or IP, and with no open inbound port. Mastodon cannot reach it. The WebFinger DNS lookup will fail. There is no inbox to POST Follow activities to. **Outbound-only federation is half the protocol and produces a read-only ghost that cannot receive follows or push updates.**

**Why it happens:**
The AP spec reads like a data format spec. Developers assume "publish actor JSON = federated." But ActivityPub is a pub/sub messaging protocol. The fediverse needs to POST to your inbox to subscribe. You need to POST to follower inboxes when you publish. Both require a reachable server with a domain name.

**How to avoid:**
Accept the constraint and implement the read-only AP subset: generate static Actor JSON, WebFinger JSON, and Outbox JSON as files. Host them on a static file host (Netlify, Cloudflare Pages, GitHub Pages) under a real domain. This gives Fediverse users a stable URL to look at. To make follows actually work, a small serverless function or Cloudflare Worker is required for the inbox endpoint — it must receive Follow POSTs, verify HTTP signatures, store follower pub keys, and push Create activities to follower inboxes on new content. Without the inbox, the actor appears in search but cannot be followed.

The $0 infrastructure constraint means: static hosting (free tier on Netlify/Cloudflare Pages) + serverless inbox function (Cloudflare Workers free tier: 100,000 requests/day). This is $0 if traffic stays below Cloudflare's free limits.

**Warning signs:**
- Any plan that says "serve AP from localhost" or "serve from the Tauri app"
- Any plan that skips inbox handling and assumes "follow" still works
- Any plan that references "the existing +server.ts routes" as the delivery mechanism (see Pitfall 2)

**Phase to address:** ActivityPub phase (AP architecture decision) — decide static-file-host + serverless-inbox before writing any AP code

---

### Pitfall 2: The Existing +server.ts Routes Do Not Exist in the Built Tauri App

**What goes wrong:**
Mercury has `+server.ts` files under `src/routes/api/` (artist links, artist releases, RSS feeds, SoundCloud oEmbed, unfurl). These work in development (`npm run dev`) because SvelteKit's dev server handles the routes. In the built Tauri app (`npm run build` + `tauri build`), the app is served as a static SPA via `adapter-static` with `fallback: 'index.html'`. There is no Node.js runtime. All server routes are dead — calling `/api/artist/[mbid]/links` from inside the built app returns 404 (or the fallback index.html).

Code review confirms: the `+page.ts` load function for artist pages already bypasses the `+server.ts` routes and calls MusicBrainz directly (`fetch('https://musicbrainz.org/ws/2/artist/...')`). The `+server.ts` files are dead code in the built app — they are only used by any external service that happens to call those URLs during dev.

Any new v1.3 feature that creates `+server.ts` routes expecting them to work inside the Tauri app will silently fail at runtime, with no error during `npm run check` or `npm run build`.

**Why it happens:**
The `+server.ts` pattern is idiomatic SvelteKit. It works in dev. The build completes without error. Developers assume it works. The discrepancy between dev behavior and built behavior is a well-known Tauri+SvelteKit gotcha that is not obvious until you test the built binary.

**How to avoid:**
Never add `+server.ts` routes expecting them to run inside the Tauri app. For data fetching, call external APIs directly from `+page.ts` load functions (as the existing artist page already does). For backend logic, use Tauri commands (`invoke`) to call Rust code. For features that genuinely need a server (ActivityPub inbox, anything requiring secret keys), that server must be external to the Tauri binary.

If an AP outbox/WebFinger serving component is added, test it as a separate Cloudflare Worker / Netlify Function — not as a `+server.ts` in the Mercury SvelteKit project.

**Warning signs:**
- Any new `+server.ts` file that is not the RSS feed (those are also non-functional in the built app — they serve the external web, not the desktop client)
- Feature spec that says "add an API route" without specifying it will run in a Cloudflare Worker, not in the Tauri app
- Development testing passing but production testing never done

**Phase to address:** ActivityPub phase and any phase adding data-fetching routes — establish the rule "no new +server.ts for in-app use" as a documented constraint before writing code

---

### Pitfall 3: HTTP Signatures for ActivityPub Are Mandatory and Non-Trivial

**What goes wrong:**
Mastodon verifies every incoming ActivityPub request with HTTP signatures (RFC 9421 as of Mastodon 4.5). When Mercury pushes a `Create` activity to a follower's inbox, Mastodon will:
1. Extract the `keyId` from the `Signature` header
2. Fetch the Actor's public key from `keyId` URL
3. Reconstruct the signed string from the headers list
4. Verify the RSA-SHA256 signature

If any of these steps fail — wrong header order, missing `Digest` header, wrong encoding, date outside 12 hours, missing or malformed `(request-target)` pseudo-header — Mastodon silently rejects the POST with a 401 or 403. The activity is never delivered. There is no error message. The actor appears to work but followers never see updates.

Implementing correct HTTP signatures from scratch is error-prone. Common failures: incorrectly constructing the signing string from the `headers` parameter, forgetting the `Digest: SHA-256=...` header on POST requests, using the wrong base64 encoding scheme, key ID URL not resolving to a public key, date header more than 12 hours old (clock skew on the serverless function).

**Why it happens:**
HTTP signatures are documented but the documentation is spread across multiple specs (draft-cavage, RFC 9421, ActivityPub, Mastodon's own extension). Each implementation has subtle differences. Testing is hard because the only meaningful test is "does Mastodon accept it" — there is no offline validator.

**How to avoid:**
Use an existing ActivityPub/HTTP signature library rather than implementing from scratch. In Rust: `activitypub_federation` crate (used by Lemmy) handles all signing. In Node.js / Cloudflare Workers: `@misskey-dev/node-http-message-signatures` or similar. Do not write signing code by hand.

Generate a 2048-bit RSA keypair per Actor. Store the private key in the serverless function's environment variables (encrypted at rest by Cloudflare). Embed the public key in the Actor JSON. Never rotate the key unless absolutely necessary — key rotation requires updating the Actor JSON and invalidating all existing follows.

**Warning signs:**
- Custom signing string construction code
- Any "it works in dev with a mock" comment
- Mastodon follows appearing to succeed (the Follow POST is accepted) but `Create` activities never showing up in followers' feeds (signing only affects outbound pushes)

**Phase to address:** ActivityPub phase — verify signing end-to-end with a live Mastodon test account before shipping

---

### Pitfall 4: Embed Synchronization for Listening Rooms Is Impossible at the Platform Level — Design Around It

**What goes wrong:**
The listening rooms feature plans synchronized embed playback via Nostr coordination. The naive design is: host publishes current track position via Nostr; guests receive it and seek to the same position in the iframe. This cannot work because:

- **Bandcamp**: No postMessage API. The iframe has no JavaScript interface. You cannot programmatically seek, pause, or detect playback state from the parent page.
- **Spotify**: The Spotify Web Playback SDK requires OAuth and a Premium account. The embed iframe does not expose a control API.
- **SoundCloud**: Has a postMessage Widget API, but it is async and cannot seek to a specific timestamp without a race condition.
- **YouTube**: Has a postMessage API that can seek, but it requires the `enablejsapi=1` parameter and the iframe to have loaded and signaled ready.

Attempting to synchronize playback position across four platforms with incompatible APIs — over Nostr relays with 200-2000ms latency — will produce a feature that "works sometimes" for one platform and never works for others.

**Why it happens:**
Developers imagine the host publishing `{ platform: 'bandcamp', trackId: 'X', position: 42 }` and guests seeking to second 42. This is technically sound as a data model but impossible at the embed layer — you cannot command the iframe.

**How to avoid:**
Reframe the feature. "Synchronized listening rooms" means the host controls which track/embed is playing, not what timestamp is active. The useful version of the feature is:

- Host publishes a Nostr event: `{ embed: { platform, url } }` (what to listen to, not where in the track)
- Guests receive it and the embed switches to that URL — they start from the beginning
- Host controls are: "play this", "switch to this track", "end session"
- No seek synchronization — accept that guests start fresh when track switches

This is feasible because it only requires posting and receiving Nostr events, not controlling iframe playback state. The NIP-53 Live Activities spec (kind:30311 + kind:1311) already describes exactly this pattern for streaming URLs.

**Warning signs:**
- Any design doc that shows `currentPosition: 42.3` in the Nostr event payload
- Tests for "guests seek to host position"
- Platform-specific seek code for Bandcamp (no API exists)

**Phase to address:** Listening rooms phase — establish "what we control vs. what we cannot" before any implementation

---

### Pitfall 5: Nostr Event Clock Skew Breaks Listening Room State Ordering

**What goes wrong:**
Listening room state is built from Nostr events sorted by `created_at` timestamp. Nostr's `created_at` is set by the client (no server-authoritative clock). Users' system clocks can be minutes apart. A guest with a clock 3 minutes ahead can publish a "change track" event that appears to come after the host's "end session" event, causing the room to re-open after it was closed. Events arrive out of insertion order from relays. The last-event-wins logic breaks.

Additionally, Nostr relay latency varies from <100ms to >2000ms depending on the relay. Mercury's current relay pool (`nos.lol`, `relay.damus.io`, `nostr.mom`, `relay.nostr.band`) are general-purpose relays with no latency guarantees. For a listening room where the host changes tracks and expects guests to switch within 1-2 seconds, relay latency of 2000ms creates noticeable desync.

**Why it happens:**
Nostr is designed for social content where clock skew of a few minutes is irrelevant. Listening room state changes (track switches) are more time-sensitive. The NIP-53 pattern assumes state changes are low-frequency (stream goes live/ends) not high-frequency (track changes every 3 minutes).

**How to avoid:**
- Use a monotonic event counter tag (`["seq", "N"]`) in addition to `created_at`. State machine advances on the highest `seq`, not the most recent `created_at`. Host increments `seq` on every state change.
- Design listening rooms so only the host can change track (guest events are chat messages, not state changes). This eliminates most clock skew issues — only the host's clock matters for sequencing.
- Accept latency. Frame the room switch as "host queues next track; guests receive and switch within ~5 seconds." Do not promise sub-second sync.
- Subscribe to all listening room state events with `closeOnEose: false` and deduplicate by `seq` number, not by event ID or timestamp.

**Warning signs:**
- State machine based purely on `created_at` ordering
- Guest-controlled track switching
- UI showing "now at 0:42" (position sync — revisit Pitfall 4)

**Phase to address:** Listening rooms phase — define the state machine and event schema before writing any subscription code

---

### Pitfall 6: Patreon / Ko-fi MusicBrainz Coverage Is Sparse — Feature Must Degrade Gracefully

**What goes wrong:**
The plan is to surface artist support links (Patreon, Ko-fi) from MusicBrainz URL relationships. MusicBrainz has `patronage` and `crowdfunding` relationship types and already maps `patreon.com` and `ko-fi.com` URLs to those types (confirmed in `categorize.ts`). The pitfall is data coverage: MusicBrainz's community-maintained URL relationships are filled in primarily for well-known artists. The long tail of niche/underground artists — Mercury's core audience — will have these fields empty the vast majority of the time.

If the UI shows a "Support This Artist" section that appears only for 2% of artists and is blank for 98%, users will either not notice it or assume the feature is broken for most artists.

**Why it happens:**
MusicBrainz coverage for mainstream artists is high; for niche artists it is low. No official statistics exist on the coverage rate of `patronage`/`crowdfunding` relationship types, but community observation confirms it is sparse for the underground/experimental artists Mercury targets.

**How to avoid:**
The `support` category in `CategorizedLinks` is already implemented — artist pages already receive Patreon/Ko-fi links when MB has them. The feature is already done for artists who have the data.

The implementation risk is in how the UI handles the empty case. Do not add a dedicated "Support This Artist" card that renders only sometimes — it will look like a broken feature. Instead, integrate support links seamlessly into the existing links section where `streaming`, `social`, and `official` links already appear. The `support` category links appear when data exists; the section does not render when empty. This is already how the existing link categories work.

The secondary risk: do not make a MB data-import run specifically to populate support links before shipping. MusicBrainz data is live-fetched. Coverage will improve organically as the MB community adds data.

**Warning signs:**
- UI mockup showing "Support This Artist" as a dedicated hero card
- Any plan to pre-populate or cache support link data
- "Show a CTA to add this artist to MB" — adds complexity with low value

**Phase to address:** Sustainability phase — confirm the UI degrade gracefully before writing any new link components

---

### Pitfall 7: Artist Stats Dashboard Creates MusicBrainz API Rate Limit Pressure

**What goes wrong:**
The artist stats dashboard shows discovery metrics. If the stats page triggers new MB API calls (for artist metadata, tag recounts, or discovery signals), and many users browse the stats page for many artists in quick succession, Mercury will hit MusicBrainz's rate limit (1 request per second per IP) across all concurrent users. MB rate limiting returns HTTP 503 with a `Retry-After` header. The existing code already enforces a 1100ms delay between MB requests in the `+server.ts` routes — but those routes don't run in the built Tauri app. The `+page.ts` fetch calls to MB have no rate limiting logic at all.

**Why it happens:**
Each user's desktop app makes MB API calls independently (good — no shared rate limit problem for that). The issue arises if the stats dashboard fires multiple MB API calls per page render without client-side caching. Each page navigation that calls `fetch('https://musicbrainz.org/...')` multiple times rapidly will exhaust the 1 req/sec limit for that user's IP.

**How to avoid:**
The stats dashboard should be derived from the local SQLite database (artist tag counts, uniqueness scores, discovery timestamps) — not from new MB API calls. MB API data (releases, links) is already fetched when the user visits the artist page; the stats page should reuse that cached data, not re-fetch from MB. Implement an in-memory or SQLite-backed cache for MB responses (24hr TTL, matching the intent of the dead `+server.ts` `CACHE_TTL = 86400`).

**Warning signs:**
- Stats dashboard that triggers `fetch('https://musicbrainz.org/...')` directly
- Multiple simultaneous MB API calls on the same page (releases + links + tags)
- No request deduplication when navigating back to the same artist quickly

**Phase to address:** Artist tools phase — define the data sources for the stats dashboard before implementation (local SQLite = yes; fresh MB calls = no)

---

### Pitfall 8: AI Auto-News Generation Without Rate Limiting and Source Attribution Will Hallucinate

**What goes wrong:**
AI auto-news for artist pages means asking the local AI model (Qwen2.5 3B via llama.cpp sidecar) to generate "news" about an artist. A 3B parameter model with a knowledge cutoff has no reliable knowledge of recent music releases, tours, or events. It will confidently generate plausible-sounding but factually wrong "news" — tour dates that never happened, albums that don't exist, collaborations that are made up. This is the hallucination failure mode, which is a fundamental property of these models at this size.

Additionally, the existing AI bio generation (`PROMPTS.artistSummary`) is specifically scoped to summarize available context (tags + country). "Auto-news" without a reliable factual input source is a different and more dangerous prompt pattern.

**Why it happens:**
The feature is easy to add syntactically — add a prompt, get text. But LLMs don't know what they don't know. Qwen2.5 3B will generate text that reads as news without having any actual news.

**How to avoid:**
Reframe "AI auto-news" as "AI-enhanced recent activity from MB data" — the AI summarizes actual MusicBrainz release data (dates, albums, release types) into a readable paragraph, rather than inventing news. The source of truth is the MB release list already fetched for the artist page. The AI converts structured data to natural language (low hallucination risk) rather than inventing content (high hallucination risk).

Alternatively, scope it to "AI-written description of recent releases" — "Released three albums in the past two years: [Album A] (2023), [Album B] (2024), [Album C] (2024)" generated from MB data. Add a "Based on MusicBrainz data" attribution so users know it reflects catalog data, not news.

**Warning signs:**
- Prompts asking the model "What is new with [artist]?" without providing actual data as context
- No source attribution in the output
- No factual grounding step before the generation prompt

**Phase to address:** Artist tools phase — define the prompt pattern (data-grounded summary, not free-form news) before implementation

---

### Pitfall 9: Self-Hosted Static Site Generator Output Has XSS Risk from Artist Data

**What goes wrong:**
The artist tools plan includes a self-hosted static site generator — Mercury generates HTML files from artist data for the artist to host themselves. Artist data comes from MusicBrainz (artist name, tags, biography). Wikipedia biography text (fetched from the Wikipedia API) is HTML-fragment content. If this HTML is injected directly into generated site templates without sanitization, a Wikipedia article that contains `<script>` tags or event handler attributes would produce a generated site with XSS.

Additionally, artist name and tag values from MusicBrainz can contain special characters (`<`, `>`, `&`, `"`) that must be HTML-escaped before insertion into templates. Failure to escape produces malformed HTML.

**Why it happens:**
Template literals in JavaScript (`\`<h1>${artist.name}</h1>\``) do not automatically escape HTML. This is the standard XSS vector in hand-rolled HTML generators. Developers forget because they are used to frameworks that escape by default.

**How to avoid:**
- Use a templating engine that escapes by default (`handlebars`, `mustache`, `eta`) rather than string interpolation
- For Wikipedia bio HTML: sanitize with a trusted library (`DOMPurify` on the Node side during generation, or the `sanitize-html` npm package) before inserting into templates
- Define an allowlist of HTML tags permitted in the generated output (typically just `<p>`, `<a>`, `<strong>`, `<em>`, `<br>`)
- Test with an artist whose name contains `<script>alert('xss')</script>` before shipping

**Warning signs:**
- Template string interpolation: `` `<h1>${artistName}</h1>` `` without a prior escape call
- Wikipedia bio inserted with `.innerHTML` or unescaped template rendering
- No sanitization step in the generation pipeline

**Phase to address:** Artist tools phase (site generator) — establish the template and sanitization approach before writing the generator

---

### Pitfall 10: ActivityPub Actor Private Key Must Not Live in the Desktop App

**What goes wrong:**
ActivityPub actors require an RSA keypair. The private key is used to sign outgoing HTTP requests when pushing Create activities to follower inboxes. If the private key is stored in the desktop app (in the Tauri store, in IndexedDB, or in a local file), an attacker who compromises the user's machine can extract the private key and impersonate that actor on the Fediverse — posting arbitrary content to all followers, forever, until followers manually unfollow.

Additionally, the desktop app cannot send signed HTTP requests to remote Mastodon inboxes because it is behind NAT (see Pitfall 1). So the private key in the desktop app is both insecure and non-functional.

**Why it happens:**
Mercury already uses Nostr keypairs stored locally (IndexedDB via NDK). It is tempting to apply the same pattern to ActivityPub. But Nostr keys and AP keys have different threat models: Nostr is used to sign social content; AP keys are used to push content to external servers. The push requires the key to be on a reachable server.

**How to avoid:**
The AP private key must live on the serverless infrastructure (Cloudflare Worker secrets, Netlify environment variables). It is generated once during setup and stored as an encrypted environment variable. The desktop app never sees the private key. The desktop app produces the content; the serverless layer signs and delivers it. This is the correct architecture and follows the $0 infrastructure constraint (Cloudflare secrets are free).

**Warning signs:**
- Any code that generates or stores an RSA keypair in the Tauri app
- Any code that imports a private key from a Tauri store to sign HTTP requests
- Any plan to sign AP activities client-side in the SvelteKit frontend

**Phase to address:** ActivityPub phase — establish key architecture (serverless-only) as the first design decision

---

### Pitfall 11: Pre-Commit Test Gate Will Not Catch Tauri Runtime Failures from New Routes

**What goes wrong:**
Mercury's pre-commit gate runs `npm run check` and `npm run build` (72 checks, code-only mode). Both will pass for any new `+server.ts` route, any new SvelteKit load function, and any new TypeScript module — regardless of whether they work in the built Tauri binary. The gate confirms: TypeScript compiles, SvelteKit build succeeds, Rust compiles. It does not confirm: "this feature works in the running Tauri app."

For v1.3 features that involve new data flows (AP actor JSON generation, listening room state, stats dashboard), the code-only gate is necessary but not sufficient. Bugs that only manifest at runtime in the Tauri app — wrong API responses, missing Tauri plugin permissions, NDK connection failures in listening rooms, iframe embed URLs that 404 — will pass the gate and ship.

**Why it happens:**
The 12 Tauri E2E tests require a running app and are deliberately excluded from the pre-commit gate (they are in the full suite). This was an accepted design decision for v1.2. For v1.3, each new major feature will have runtime behaviors that are not covered by existing E2E tests.

**How to avoid:**
After each v1.3 phase, add at least 2-3 Tauri E2E tests to the manifest (marked `requiresApp: true`). These tests run on the full suite, not the pre-commit gate. They verify that the new feature is reachable and renders correctly in the running app. The pre-commit gate remains fast; the full suite covers runtime behavior.

Specifically:
- AP phase: test that AP actor JSON is generated with correct `@context` and `type` fields
- Listening rooms: test that a room can be created and the host embed loads
- Stats dashboard: test that stats page renders with data
- Support links: test that the `support` category links appear when MB data has them

**Warning signs:**
- "The build passes" being used as evidence that a feature works
- New phases shipping with zero new E2E test entries in the manifest
- Existing E2E tests not updated when routes or component structure changes

**Phase to address:** Every v1.3 phase — add E2E test entries to the manifest as part of phase completion criteria

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Serving AP from the Tauri app | No extra infrastructure needed | Unreachable — AP is silently broken; users can never follow | Never |
| Adding `+server.ts` routes for in-app use | Familiar SvelteKit pattern | Route is dead in built binary; silent failure at runtime | Never for in-app use; RSS feed routes exist for external web only |
| Writing HTTP signature code from scratch | No library dependency | Mastodon silently rejects every signed request; undebuggable | Never — use a library |
| Storing AP private key in Tauri store | Consistent with Nostr key pattern | Key exposed to machine compromise; key unusable for server-to-server signing anyway | Never |
| "Synchronized" listening rooms with position data | Feature sounds impressive | Technically impossible across Bandcamp/Spotify/SoundCloud iframes | Never — reframe to track-switch-only coordination |
| AI news generation without factual grounding | Easy to implement | Confident hallucinations presented as news; trust damage | Never for artist facts — always ground in MB data |
| Artist stats that re-fetch MB data | Always fresh | Rate limit pressure; 1100ms delays per request; existing MB data is already fetched | Acceptable only if data is not already available locally |
| HTML template string interpolation without escaping | Simple to write | XSS in generated sites | Never in HTML output — always use an escaping template engine |

---

## Integration Gotchas

Common mistakes when connecting v1.3 features to external systems.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| ActivityPub + Mastodon | Omitting the `Digest` header on POST requests | Always include `Digest: SHA-256=<base64-encoded-body-hash>` on any POST |
| ActivityPub + Mastodon | `keyId` URL in signature does not resolve to the actor's public key | `keyId` must be a dereferenceable URL that returns the Actor JSON with `publicKey.publicKeyPem` |
| ActivityPub + Mastodon | Date header more than 12 hours old (serverless function clock drift) | Ensure the serverless function's clock is synchronized; always use UTC; Cloudflare Workers use authoritative UTC |
| MusicBrainz + Support Links | Expecting Patreon/Ko-fi on every artist | These fields are sparse; UI must render zero links as zero links, not as an error state |
| Nostr (NDK) + Listening Rooms | Multiple subscriptions to the same room accumulating | Use the existing `activeSubscriptions` Set pattern; call the cleanup function returned by `subscribeToRoom` on component destroy |
| Nostr + Clock Skew | Sorting room state by `created_at` alone | Add a `seq` monotonic counter tag; advance state on highest `seq`, not latest timestamp |
| Bandcamp Embed + Listen Room Sync | Calling `postMessage` on a Bandcamp iframe | Bandcamp has no postMessage API; no seek or state control is possible |
| SvelteKit adapter-static + AP routes | Writing `+server.ts` for AP actor responses | These routes are dead in the built Tauri app; AP serving must be a separate Cloudflare Worker |
| AI (llama.cpp sidecar) + Artist News | Prompting "what is new with {artist}" | Model has a training cutoff and hallucinations; always provide MB data as context in the prompt |
| Static Site Generator + Wikipedia HTML | Inserting raw Wikipedia API HTML into templates | Wikipedia HTML may contain inline scripts and event handlers; always sanitize before inserting |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Listening room subscribing to all kind:40 events to find Mercury rooms | Room list loads slowly as global Nostr event count grows | Use `#t: ['mercury']` filter in every subscription (already implemented in `loadRooms`); ensure this stays in place for listening room subscriptions | At ~10,000 Mercury-tagged events |
| Stats dashboard re-fetching MB artist data on every visit | Stats page is slow; MB rate limit hit on rapid browsing | Cache MB responses in SQLite (24hr TTL) or in-memory `Map` per session | Immediately — 1 user rapidly browsing 10 artists hits 503 |
| ActivityPub actor JSON regenerated on every follower check | Serverless function CPU time spikes | Pre-generate actor JSON as static files; only the inbox endpoint needs dynamic handling | At ~100 follow requests/hour |
| AI auto-news generation blocking artist page render | Page appears stuck during LLM inference | Generate news in a background process; render page from existing data, progressively enhance with AI content | Immediately — llama.cpp 3B inference takes 2-10 seconds |
| Nostr room subscriptions never closed on navigation | NDK subscription count grows with each room visited; memory leak | Return and call cleanup function from `subscribeToRoom` in `onDestroy`; test by navigating between 10 rooms | At ~5 rooms visited in a session |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| AP private key stored in Tauri/IndexedDB | Machine compromise = actor impersonated; key extracted offline | AP private key lives exclusively in Cloudflare Worker secrets; never in the desktop app |
| Generating AP actor JSON with MBID in the stable URL, then allowing artist MBID to change | Fediverse followers lose the actor permanently (the ID must never change) | Use a Mercury-internal stable ID for AP actors, not the MBID; MB MBIDs are stable but this removes the dependency |
| Site generator template injection via artist name | XSS in generated HTML files | Escape all MusicBrainz data before template insertion; use a library with auto-escaping |
| Listening room that allows any pubkey to post state change events | Malicious user can hijack the room's embed for all guests | Gate state-change events on the host's pubkey; reject state changes from non-host pubkeys in the UI |
| Nostr DM private key reused for AP HTTP signatures | If Nostr key is compromised, AP actor is also compromised | Use independent keypairs for Nostr (existing) and ActivityPub (new); never share keys across protocols |

---

## UX Pitfalls

Common user experience mistakes for these specific features.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| "Support This Artist" hero card that is empty 98% of the time | Users think the feature is broken; empty state looks like a bug | Render support links inline in the existing links section; section disappears when empty |
| Listening room with a "Sync" button that doesn't work on Bandcamp | Users press Sync; nothing happens; frustration | Do not show a sync button; the room model is "host queues track; guests switch"; no explicit sync action |
| ActivityPub "Follow on Mastodon" button that requires manual copy-paste | High friction; few users complete the action | Pre-fill the Mastodon search field by constructing a URL like `https://mastodon.social/authorize_interaction?uri=@actor@domain`; opens Mastodon search |
| AI-generated news with no attribution | Users don't know the content is AI-generated; trust damage when it's wrong | Always label AI-generated content; "AI summary based on MusicBrainz catalog data" |
| Backer credits screen that shows no content until a backer is added | Looks broken at launch | Ship with "Mercury is free and open. Help keep it that way — [donate link]" as static content; backer names appear below when they exist |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **ActivityPub Actor JSON:** Confirm `id`, `inbox`, `outbox`, `publicKey`, `following`, `followers` are all present and resolve correctly — missing any one of these causes Mastodon to reject the actor silently
- [ ] **ActivityPub WebFinger:** Confirm `Content-Type: application/jrd+json` is set — without it, Mastodon's actor lookup fails even if the JSON is correct
- [ ] **HTTP Signatures:** Confirm a live Mastodon account can follow the AP actor successfully end-to-end — not just that the actor JSON looks right
- [ ] **Listening Room Cleanup:** Confirm `subscribeToRoom` cleanup function is called on every route that opens a room; navigate away and back 5 times; verify subscription count does not grow
- [ ] **Support Links Degrade:** Verify artist page with no MB support links renders correctly (no empty section, no broken UI)
- [ ] **AI News Grounding:** Verify the AI news prompt includes actual MB release data as context, not just the artist name
- [ ] **Stats Dashboard Data Source:** Confirm stats are derived from local SQLite (uniqueness scores, tag counts, discovery signals) not from new MB API calls
- [ ] **Site Generator Escaping:** Generate a site for an artist whose name contains `"`, `<`, `>`, `&`; verify HTML is valid and unescaped characters do not appear
- [ ] **Pre-commit Gate Still Passes:** After every new file/route/module is added, confirm `node tools/test-suite/run.mjs --code-only` passes all 72 checks
- [ ] **Tauri E2E Tests Added:** Confirm new manifest entries exist for every major v1.3 feature before marking each phase complete

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| AP serving from desktop discovered after implementation | HIGH | Extract AP serving to a Cloudflare Worker; repoint actor `id` to new domain; all existing follows break (actor ID changed) |
| +server.ts route that silently fails in built app | MEDIUM | Move API call logic to +page.ts load function (direct fetch); or wrap in a Tauri command if server-side logic is needed |
| HTTP signatures rejected by Mastodon | MEDIUM | Add debug logging to the signing function; compare against Mastodon's example signatures; use `activitypub_federation` Rust crate as reference |
| Listening room with position sync shipped before embed API research | MEDIUM | Remove position sync; reframe to track-switch-only; update UI copy |
| AI news hallucination complaint | LOW-MEDIUM | Add "Based on MusicBrainz data" attribution; update prompt to be data-grounded; do not need to remove the feature |
| XSS in site generator output | HIGH | Hotfix: add HTML escaping/sanitization; regenerate affected sites; notify users whose sites were generated before the fix |
| AP private key compromise (key stored in desktop app) | HIGH | Rotate key: generate new keypair, update actor JSON, wait for Mastodon instances to re-fetch actor key; existing signed content cannot be retroactively invalidated |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| AP served from desktop (Pitfall 1) | ActivityPub phase — first design decision | A Mastodon account can look up and follow an actor; inbox receives Follow POST |
| +server.ts dead in built app (Pitfall 2) | Every phase — no new +server.ts for in-app use | `npm run build` + `tauri build` + run app; all features work in binary |
| HTTP signatures mandatory (Pitfall 3) | ActivityPub phase — use library, test with live Mastodon | A live Mastodon account receives a `Create` activity from Mercury |
| Embed sync impossible (Pitfall 4) | Listening rooms phase — establish track-switch-only model before coding | No code references `currentPosition`; no seek calls to any embed API |
| Nostr clock skew (Pitfall 5) | Listening rooms phase — define event schema with seq counter | Room state advances correctly when two events arrive with reversed timestamps |
| Sparse MB support link coverage (Pitfall 6) | Sustainability phase — verify UI degrades correctly | Artist page with no support links has no empty UI component |
| MB rate limit pressure (Pitfall 7) | Artist tools phase — define stats data sources as SQLite-first | Stats dashboard makes zero MB API calls on page render |
| AI hallucination in news (Pitfall 8) | Artist tools phase — establish data-grounded prompt pattern | AI news prompt is audited to confirm MB release data is included as context |
| XSS in site generator (Pitfall 9) | Artist tools phase (site generator) — use escaping template engine | Test with `<script>` in artist name; generated HTML is escaped |
| AP private key in desktop app (Pitfall 10) | ActivityPub phase — first design decision (key on serverless only) | No RSA key generation code exists in the SvelteKit or Rust layer |
| Pre-commit gate misses runtime failures (Pitfall 11) | Every v1.3 phase — add E2E tests to manifest | At least 2 new `requiresApp` manifest entries per phase |

---

## Sources

- ActivityPub W3C specification — inbox requirement for follow/push: https://www.w3.org/TR/activitypub/
- Paul Kinlan — "Adding ActivityPub to your static site" — confirmed inbox cannot be static: https://paul.kinlan.me/adding-activity-pub-to-your-static-site/
- Maho.dev — ActivityPub static site guide part 3 — content-type pitfalls, dual id/url problem, signing requirements: https://maho.dev/2024/02/a-guide-to-implementing-activitypub-in-a-static-site-or-any-website-part-3/
- Mastodon ActivityPub documentation — actor requirements, inbox behavior: https://docs.joinmastodon.org/spec/activitypub/
- Mastodon security documentation — HTTP signature requirements, RSA-SHA256, 12-hour date window: https://docs.joinmastodon.org/spec/security/
- Tauri+SvelteKit +server.ts gap — community report confirming server routes dead in built app: https://github.com/tauri-apps/tauri/discussions/6423
- Tauri official docs — SvelteKit setup confirms adapter-static, server routes not available: https://v2.tauri.app/start/frontend/sveltekit/
- Nostr NIP-53 Live Activities specification — kind:30311 host/guest model, presence via kind:10312: https://github.com/nostr-protocol/nips/blob/master/53.md
- SoundCloud Widget API — async postMessage, no seek timestamp guarantee: https://developers.soundcloud.com/docs/api/html5-widget
- MusicBrainz artist-URL relationship types — patronage UUID `6f77d54e`, crowdfunding UUID `93883cf6`: https://musicbrainz.org/relationships/artist-url
- Direct code review: `D:/Projects/Mercury/src/routes/artist/[slug]/+page.ts` — confirms artist page already calls MB directly, bypassing +server.ts
- Direct code review: `D:/Projects/Mercury/src/lib/embeds/categorize.ts` — confirms `patreon.com` and `ko-fi.com` already in friendly name map; `patronage` → `support` category already mapped
- Direct code review: `D:/Projects/Mercury/src/lib/comms/rooms.svelte.ts` — confirms `#t: ['mercury']` filter, `activeSubscriptions` Set dedup pattern, and cleanup function return pattern already established for NIP-28 rooms

---
*Pitfalls research for: Mercury v1.3 "The Open Network" — ActivityPub outbound, Nostr listening rooms, artist tools, sustainability links added to existing Tauri 2.0 + SvelteKit + NDK desktop app*
*Researched: 2026-02-24*
