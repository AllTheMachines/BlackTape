# Phase 21: ActivityPub Outbound - Research

**Researched:** 2026-02-24
**Domain:** ActivityPub JSON-LD / WebFinger / Tauri static file export / Rust RSA key generation
**Confidence:** HIGH (AP spec verified via W3C/Mastodon docs + multiple cross-sources; Tauri patterns verified from codebase)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Actor identity form**
- Minimal fields only: handle (username portion), display name, hosting URL
- Handle is just the username part — no @domain — app shows a live preview like `@steve@yourdomain.com` derived from handle + hosting URL
- No avatar or bio fields in this phase
- Validation fires on export attempt, not on each keystroke
- New dedicated "Fediverse" (or "ActivityPub") section added at the bottom of the Settings page

**Outbox content**
- Only curator posts (from the Curator/Blog tool, Phase 12) become AP activities
- Artist discoveries, scene follows, and listening room activity are NOT included
- All historical curator posts are included on export (no limit)
- Full post content goes in the AP note body — no truncation or "read more" link
- Outbox is idempotent: activities use the original post timestamps, not an export timestamp, so the same content always produces the same file

**Export workflow**
- Export button lives in the Fediverse Settings section, collocated with the identity config
- Tauri file picker dialog opens to choose the output directory
- Existing files (actor.json, webfinger.json, outbox.json) are overwritten silently — no confirmation prompt
- Export button is disabled (grayed out with tooltip) until all three identity fields are filled
- Success feedback: toast notification showing "Exported 3 files to /path/to/dir"

**Self-hosting guidance**
- Inline help block in the Fediverse Settings section explains what to do with the files
- After export (or always visible), show the exact URL paths the files must be served at, computed from the hosting URL + handle — user can copy-paste
- No "Test Connection" or verify button — user confirms it works by trying to follow in Mastodon
- Guidance is generic ("any static host that serves files at these paths") — no specific hosting services named

### Claude's Discretion
- Exact visual design of the Fediverse Settings section (layout, spacing, how the preview handle is displayed)
- Wording of the inline help/instruction block
- Tooltip text on the disabled Export button
- How webfinger.json query-string routing is communicated (exact path explanation wording)

### Deferred Ideas (OUT OF SCOPE)
- AP WebFinger + live Fediverse follow (inbound follows, notifications) — already deferred to v1.4 serverless Worker per ROADMAP.md
- Test Connection / verify actor is live button — no server needed for this phase, out of scope
- Avatar and bio fields in actor identity — future enhancement if requested
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| APUB-01 | User can configure an ActivityPub actor identity (handle, display name, hosting URL) in Settings | `user_identity` table (key/value store) already exists in taste.db; `set_identity_value` / `get_identity_value` Tauri commands already registered; Settings page pattern is established |
| APUB-02 | User can export AP actor files (actor.json, webfinger.json, outbox.json) to a local directory for self-hosting | `dialog:allow-open` already in capabilities; `open({ directory: true })` pattern used in SiteGenDialog; `write_json_to_path` Tauri command already exists; new Rust module `activitypub.rs` is the pattern |
| APUB-03 | Exported AP actor is valid and followable from Mastodon/Fediverse instances when uploaded to the configured hosting URL | RSA keypair must be generated and persisted; exact JSON-LD structures documented below; WebFinger pitfall (query-string routing) documented; Mastodon followability requires `inbox` URL even if static |
</phase_requirements>

---

## Summary

This phase generates three static JSON files that together constitute a valid ActivityPub actor: `actor.json` (the person/identity document), `webfinger.json` (the discovery endpoint), and `outbox.json` (the collection of public posts). No server is required. The user uploads these files to any static host at the correct paths, and Mastodon instances can discover and follow the actor.

The critical technical challenge is that Mastodon requires HTTP Signatures which in turn require an RSA-2048 keypair. The public key goes in `actor.json`; the private key is never exported and must be securely stored in `user_identity` table. Without a keypair, Mastodon will refuse to interact with the actor.

A second critical finding: Phase 12 (Curator/Blog Tools) did not build user-authored blog posts — it built embed widgets, RSS feeds, and curator attribution for external bloggers. There is no `curator_posts` table in taste.db. The "curator posts" the CONTEXT.md references either (a) do not yet exist and the outbox will be empty for all users at launch, or (b) refer to a planned but not-yet-built post system. The planner must decide: either note the outbox starts empty and that is acceptable, or add a minimal curator post table as part of this phase's scope.

**Primary recommendation:** Implement as a new `activitypub.rs` Rust module (following `site_gen.rs` pattern) with one Tauri command `export_activitypub`. Generate RSA keypair on first export and persist private key in `user_identity` table. Return a result struct listing the 3 file paths. The SvelteKit `FediverseSettings` component handles the UI — collocated form + export button + path display.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `rsa` (Rust crate) | 0.9.x | RSA-2048 key generation, PKCS8/PKCS1 PEM export | Pure Rust, no OpenSSL dependency, implements needed traits; project STATE.md confirms `rsa` and `sha2` were already evaluated as low-risk additive deps |
| `rand` (Rust crate) | 0.8.x | CSPRNG for key generation | Already a transitive dep; required by `rsa` crate |
| `serde_json` | 1.x | JSON serialization | Already in Cargo.toml |
| `@tauri-apps/plugin-dialog` | 2.x | Folder picker dialog | Already installed; `dialog:allow-open` already in capabilities/default.json |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pkcs8` / `pkcs1` (Rust) | auto (via rsa features) | PEM encoding traits | Enabled via `rsa = { features = ["pem"] }` |
| `chrono` (Rust) | if needed | ISO 8601 timestamps for AP activities | Only needed if `SystemTime` ISO formatting is cumbersome; check if already available |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `rsa` crate | `openssl` Rust binding | openssl requires system OpenSSL or vendored C; adds complexity. rsa is pure Rust and simpler |
| Rust-side key generation | JS-side WebCrypto | WebCrypto SubtleCrypto can generate RSA-OAEP; but private key export as PEM is awkward in browser and the key needs to persist in SQLite via existing Rust identity system |

**Installation:**
```bash
# Add to Cargo.toml [dependencies]:
rsa = { version = "0.9", features = ["pem"] }
rand = "0.8"
```

No new npm packages required. Zero new npm packages was already confirmed as the v1.3 policy (STATE.md).

---

## Architecture Patterns

### Recommended Project Structure

```
src-tauri/src/
├── activitypub.rs       # New module: key gen, JSON builders, export command
├── lib.rs               # Register new commands + mod activitypub
└── ai/taste_db.rs       # No changes — identity keys stored via existing set_identity_value

src/lib/components/
└── FediverseSettings.svelte  # New component: identity form + export button + path display

src/routes/settings/
└── +page.svelte         # Add <FediverseSettings> component at bottom of settings page
```

### Pattern 1: Rust Module for AP Export (follows site_gen.rs pattern)

**What:** A self-contained Rust module with payload structs, JSON builders, and one async Tauri command.
**When to use:** Any feature requiring multi-file generation from user data.

```rust
// src-tauri/src/activitypub.rs
// Source: site_gen.rs pattern in this codebase

use rsa::{RsaPrivateKey, RsaPublicKey, pkcs8::EncodePrivateKey, pkcs1::EncodeRsaPublicKey};
use rsa::pkcs8::LineEnding;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Deserialize)]
pub struct ActorIdentity {
    pub handle: String,
    pub display_name: String,
    pub hosting_url: String,  // e.g. "https://yourdomain.com" (no trailing slash)
}

#[derive(Serialize)]
pub struct ApExportResult {
    pub actor_path: String,
    pub webfinger_path: String,
    pub outbox_path: String,
    pub post_count: usize,
}

/// Generate or retrieve the RSA keypair from user_identity table.
/// Returns (private_key_pem, public_key_pem).
fn ensure_rsa_keypair(conn: &rusqlite::Connection) -> Result<(String, String), String> {
    // Try to load existing private key from user_identity
    let existing: Option<String> = conn.query_row(
        "SELECT value FROM user_identity WHERE key = 'ap_private_key_pem'",
        [],
        |row| row.get(0),
    ).ok();

    if let Some(private_pem) = existing {
        // Derive public key from stored private key
        let priv_key = RsaPrivateKey::from_pkcs8_pem(&private_pem)
            .map_err(|e| format!("Failed to parse stored key: {}", e))?;
        let pub_key = RsaPublicKey::from(&priv_key);
        let pub_pem = pub_key.to_pkcs1_pem(LineEnding::LF)
            .map_err(|e| format!("Failed to encode public key: {}", e))?
            .to_string();
        return Ok((private_pem, pub_pem));
    }

    // Generate new 2048-bit RSA keypair
    let mut rng = rand::thread_rng();
    let priv_key = RsaPrivateKey::new(&mut rng, 2048)
        .map_err(|e| format!("Failed to generate key: {}", e))?;
    let pub_key = RsaPublicKey::from(&priv_key);

    let private_pem = priv_key.to_pkcs8_pem(LineEnding::LF)
        .map_err(|e| format!("Failed to encode private key: {}", e))?
        .to_string();
    let pub_pem = pub_key.to_pkcs1_pem(LineEnding::LF)
        .map_err(|e| format!("Failed to encode public key: {}", e))?
        .to_string();

    // Persist private key in user_identity
    conn.execute(
        "INSERT INTO user_identity (key, value) VALUES ('ap_private_key_pem', ?1)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        rusqlite::params![private_pem],
    ).map_err(|e| format!("Failed to store private key: {}", e))?;

    Ok((private_pem, pub_pem))
}
```

### Pattern 2: actor.json JSON-LD Structure

**What:** The minimum actor document Mastodon requires to follow the actor.
**When to use:** Always — this is the canonical structure.

```json
// Source: W3C ActivityPub spec + Mastodon documentation
// https://www.w3.org/TR/activitypub/ + https://docs.joinmastodon.org/spec/activitypub/
{
  "@context": [
    "https://www.w3.org/ns/activitystreams",
    "https://w3id.org/security/v1"
  ],
  "type": "Person",
  "id": "https://yourdomain.com/ap/actor.json",
  "url": "https://yourdomain.com",
  "preferredUsername": "steve",
  "name": "Steve's Mercury Curation",
  "summary": "Music curator on Mercury",
  "inbox": "https://yourdomain.com/ap/inbox",
  "outbox": "https://yourdomain.com/ap/outbox.json",
  "followers": "https://yourdomain.com/ap/followers.json",
  "following": "https://yourdomain.com/ap/following.json",
  "manuallyApprovesFollowers": false,
  "discoverable": true,
  "publicKey": {
    "id": "https://yourdomain.com/ap/actor.json#main-key",
    "owner": "https://yourdomain.com/ap/actor.json",
    "publicKeyPem": "-----BEGIN RSA PUBLIC KEY-----\n...\n-----END RSA PUBLIC KEY-----\n"
  }
}
```

**CRITICAL notes:**
1. `@context` MUST include both `activitystreams` AND `security/v1` — the security context is required for `publicKey`.
2. `inbox` URL is required even though it will not respond (Mastodon will not process the actor without it). Use `https://yourdomain.com/ap/inbox` — it will return 404 but the actor profile will still be fetchable.
3. `publicKeyPem` newlines must be `\n` (literal) not actual newlines in JSON.
4. `id` should be the stable URL where `actor.json` is served — NOT the actor's profile page.

### Pattern 3: webfinger.json Structure

**What:** The WebFinger discovery document.
**When to use:** Required for `@handle@domain.com` lookups.

```json
// Source: RFC 7033 (WebFinger) + Mastodon documentation
{
  "subject": "acct:steve@yourdomain.com",
  "aliases": [
    "https://yourdomain.com/ap/actor.json"
  ],
  "links": [
    {
      "rel": "self",
      "type": "application/activity+json",
      "href": "https://yourdomain.com/ap/actor.json"
    }
  ]
}
```

**CRITICAL WebFinger hosting pitfall:**
WebFinger requires serving `GET /.well-known/webfinger?resource=acct:handle@domain.com`. This is a dynamic query-string endpoint — the `resource` parameter is the key. On static hosts, there is no query string routing. Solutions:
- Most static hosts (nginx, Caddy) can be configured to serve `.well-known/webfinger` as a file ignoring query strings
- Mastodon's WebFinger lookup sends the resource query but many static implementations serve the same JSON regardless of `?resource=` value (works when a domain hosts only one AP actor)
- The exported file should be named `webfinger.json` in the app, but the user must deploy it to `/.well-known/webfinger` (no `.json` extension) or configure their server to serve it with `Content-Type: application/jrd+json`
- **Key guidance to communicate:** The webfinger file goes to `/.well-known/webfinger` (no extension). Static hosts need explicit Content-Type configuration, or may use a `.json` extension with URL rewrite rules.

### Pattern 4: outbox.json Structure

**What:** An `OrderedCollection` of `Create` + `Note` activities.
**When to use:** Required for post history to be visible on Mastodon.

```json
// Source: W3C ActivityPub spec + https://maho.dev/2024/02/a-guide-to-implementing-activitypub-in-a-static-site-or-any-website-part-4/
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "type": "OrderedCollection",
  "id": "https://yourdomain.com/ap/outbox.json",
  "totalItems": 1,
  "orderedItems": [
    {
      "type": "Create",
      "id": "https://yourdomain.com/ap/activities/1706745600",
      "actor": "https://yourdomain.com/ap/actor.json",
      "published": "2024-02-01T00:00:00Z",
      "to": ["https://www.w3.org/ns/activitystreams#Public"],
      "cc": ["https://yourdomain.com/ap/followers.json"],
      "object": {
        "type": "Note",
        "id": "https://yourdomain.com/ap/notes/1706745600",
        "attributedTo": "https://yourdomain.com/ap/actor.json",
        "content": "<p>Post content here</p>",
        "published": "2024-02-01T00:00:00Z",
        "to": ["https://www.w3.org/ns/activitystreams#Public"],
        "cc": ["https://yourdomain.com/ap/followers.json"],
        "url": "https://yourdomain.com"
      }
    }
  ]
}
```

**Notes on empty outbox:**
- `totalItems: 0` with `orderedItems: []` is valid and well-formed
- Mastodon may not proactively pull outbox content when someone follows (instance-dependent behavior)
- Posts become visible primarily via the inbox federation mechanism (future v1.4 scope)
- An empty outbox is acceptable for APUB-03 — the actor is still "followable"

**Idempotency:** Use UNIX timestamp of original post as activity ID component (or a stable hash). Same post always generates same activity ID. This is the "same content = same file" guarantee the CONTEXT.md requires.

### Pattern 5: SvelteKit Component (follows settings page pattern)

```typescript
// src/lib/components/FediverseSettings.svelte
// Follows pattern from Settings page identity section

// State
let apHandle = $state('');       // username only, e.g. "steve"
let apDisplayName = $state('');  // display name, e.g. "Steve's Mercury"
let apHostingUrl = $state('');   // base URL, e.g. "https://yourdomain.com"
let exportStatus = $state('');

// Derived preview
let handlePreview = $derived(
  apHandle.trim() && apHostingUrl.trim()
    ? `@${apHandle.trim()}@${new URL(apHostingUrl.trim()).hostname}`
    : ''
);

// Disabled state
let canExport = $derived(
  apHandle.trim().length > 0 &&
  apDisplayName.trim().length > 0 &&
  apHostingUrl.trim().length > 0
);

// On load: hydrate from user_identity
// On save: invoke('set_identity_value', { key: 'ap_handle', value: apHandle })
// On export: open({ directory: true }) then invoke('export_activitypub', { outputDir, identity })
```

### Pattern 6: Tauri `export_activitypub` Command

```rust
// Returns ApExportResult with paths to 3 written files
#[tauri::command]
pub async fn export_activitypub(
    output_dir: String,
    identity: ActorIdentity,
    state: tauri::State<'_, ai::taste_db::TasteDbState>,
) -> Result<ApExportResult, String> {
    // 1. Get/generate RSA keypair from user_identity table
    // 2. Build actor.json JSON-LD string
    // 3. Build webfinger.json JRD string
    // 4. Build outbox.json (empty or from curator_posts if table exists)
    // 5. Write 3 files to output_dir
    // 6. Return paths + post count
}
```

### Anti-Patterns to Avoid

- **Omitting `https://w3id.org/security/v1` from @context:** The `publicKey` field is defined in the security vocabulary. Without this context, Mastodon cannot parse the public key and will reject the actor.
- **Using PKCS8 `-----BEGIN PUBLIC KEY-----` format:** Mastodon expects PKCS1 RSA public key format (`-----BEGIN RSA PUBLIC KEY-----`). Use `to_pkcs1_pem()` not `to_public_key_pem()`.
- **Hardcoding literal newlines in publicKeyPem JSON:** JSON does not support literal newlines in string values. Newlines in PEM must be `\n` escape sequences. `serde_json` handles this automatically if you put the PEM string into a Rust `String` and serialize normally.
- **Generating a new keypair on every export:** The keypair must be stable — Mastodon caches actor data by key ID. Regenerating invalidates all existing follows. Always persist and reuse.
- **Not including `inbox` URL:** Even though we have no working inbox, Mastodon will not recognize the actor without an `inbox` field. Use `{hosting_url}/ap/inbox` pointing to a non-existent path — the actor profile is still fetchable.
- **WebFinger file extension confusion:** The file is exported as `webfinger.json` locally for clarity, but must be deployed to `/.well-known/webfinger` (no extension) or with server-side extension stripping.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RSA key generation | Custom crypto | `rsa` crate (RustCrypto) | Cryptographic correctness is non-trivial; RustCrypto is audited and widely used |
| JSON-LD context validation | Custom validator | Don't validate — emit correct context strings | AP context validation is not needed for outbound generation; correctness comes from following the spec |
| WebFinger query-string routing | Custom server code | Documented guidance only (user's server responsibility) | Mercury exports files; routing is the user's hosting concern |
| PEM newline handling | Custom string replace | Let serde_json serialize the PEM string naturally | serde_json correctly encodes `\n` in string values |

**Key insight:** This phase generates static JSON files. All the complexity of ActivityPub federation (signature verification, follow acceptance, delivery, inbox) is explicitly out of scope. The only crypto operation needed is generating and encoding an RSA keypair.

---

## Common Pitfalls

### Pitfall 1: Curator Posts Don't Exist Yet

**What goes wrong:** CONTEXT.md says "only curator posts (from Phase 12) become AP activities" but Phase 12 did NOT build user-authored posts. Phase 12 built embed widgets, RSS feeds, and curator attribution. There is no `curator_posts` table in taste.db.

**Why it happens:** The CONTEXT.md was written with a future state in mind — "the Curator/Blog tool" implies a post-creation UI that hasn't been built yet.

**How to avoid:** Export an empty `orderedItems: []` outbox with `totalItems: 0`. This is valid ActivityPub and the actor is still followable. Document clearly in the UI that posts will appear here when a future version adds them. Do NOT invent a curator_posts table in this phase unless explicitly tasked to do so.

**Warning signs:** If implementation tries to query a `curator_posts` table that doesn't exist, Rust will fail at compile time or runtime.

### Pitfall 2: RSA Key Format Mismatch

**What goes wrong:** Actor.json publicKeyPem contains `-----BEGIN PUBLIC KEY-----` (PKCS8/SPKI) instead of `-----BEGIN RSA PUBLIC KEY-----` (PKCS1). Mastodon rejects the key.

**Why it happens:** The `rsa` crate has two export methods: `to_public_key_pem()` (SPKI, wrong) and `to_pkcs1_pem()` (PKCS1, correct). Easy to pick the wrong one.

**How to avoid:** Always use `RsaPublicKey.to_pkcs1_pem(LineEnding::LF)` for the `publicKeyPem` field.

**Warning signs:** Mastodon logs show "could not verify HTTP signature" or "public key not found".

### Pitfall 3: @context Missing Security Vocabulary

**What goes wrong:** `publicKey` field is not recognized by Mastodon because `https://w3id.org/security/v1` is missing from the `@context` array.

**Why it happens:** Tutorials show `"@context": "https://www.w3.org/ns/activitystreams"` as the single context string, but that only covers ActivityStreams. The `publicKey` property is defined in the security vocabulary.

**How to avoid:** Always use the array form:
```json
"@context": [
  "https://www.w3.org/ns/activitystreams",
  "https://w3id.org/security/v1"
]
```

**Warning signs:** Actor is discoverable but cannot be followed (key verification fails).

### Pitfall 4: WebFinger Content-Type

**What goes wrong:** Mastodon sends `Accept: application/jrd+json` when fetching WebFinger. A static host serving `webfinger.json` with generic `text/plain` or `application/json` Content-Type may cause lookup failures.

**Why it happens:** This is a server configuration issue the user must solve on their static host. We cannot control it from the exported files.

**How to avoid:** In the UI help text, explain that the WebFinger file must be served with `Content-Type: application/jrd+json`. Many hosts work with `application/json` in practice, but the correct type is `application/jrd+json`.

**Warning signs:** Mastodon reports "No results" when searching `@handle@domain.com`.

### Pitfall 5: Non-Stable Activity IDs Break Idempotency

**What goes wrong:** Each export generates different activity IDs, causing Mastodon to treat re-exported content as new posts if a user ever gets an inbox working.

**Why it happens:** Using random UUIDs or export timestamps for IDs.

**How to avoid:** Derive activity IDs from stable post data (a hash of content + published timestamp, or just the UNIX timestamp of the post's `published` field). The CONTEXT.md explicitly requires idempotent export.

**Warning signs:** The same export run twice produces different `id` values in outbox.json.

### Pitfall 6: URL Formatting of Hosting URL

**What goes wrong:** User enters `https://yourdomain.com/` (trailing slash), causing double-slashes in generated URLs like `https://yourdomain.com//ap/actor.json`.

**Why it happens:** URL concatenation without normalization.

**How to avoid:** Strip trailing slashes from `hosting_url` before building any URL. Validate that it starts with `https://` (not `http://`). Best done in Rust before building JSON strings.

---

## Code Examples

Verified patterns from codebase and official sources:

### Tauri Folder Picker (existing pattern from SiteGenDialog.svelte)

```typescript
// Source: src/lib/components/SiteGenDialog.svelte (line 48-55)
const { open } = await import('@tauri-apps/plugin-dialog');
const selected = await open({
  directory: true,
  multiple: false,
  title: 'Choose export folder'
});
if (!selected) {
  // User cancelled — stay in current state
  return;
}
// selected is a string path
```

### Identity Storage Pattern (existing from settings/+page.svelte)

```typescript
// Source: src/routes/settings/+page.svelte onMount (line 178-180)
// Load on mount:
const { invoke } = await import('@tauri-apps/api/core');
apHandle = (await invoke<string | null>('get_identity_value', { key: 'ap_handle' })) ?? '';
apDisplayName = (await invoke<string | null>('get_identity_value', { key: 'ap_display_name' })) ?? '';
apHostingUrl = (await invoke<string | null>('get_identity_value', { key: 'ap_hosting_url' })) ?? '';

// Save on blur or explicit save:
await invoke('set_identity_value', { key: 'ap_handle', value: apHandle });
```

### Identity Keys to Store in user_identity Table

| Key | Value | Notes |
|-----|-------|-------|
| `ap_handle` | `steve` | Username part only, no @ |
| `ap_display_name` | `Steve's Mercury` | Free-form display name |
| `ap_hosting_url` | `https://yourdomain.com` | No trailing slash |
| `ap_private_key_pem` | `-----BEGIN PRIVATE KEY-----\n...` | PKCS8 format; never exported to user |

### Export Command Invocation Pattern

```typescript
// Source: site_gen.rs / SiteGenDialog.svelte pattern
const { invoke } = await import('@tauri-apps/api/core');
const result = await invoke<{
  actor_path: string;
  webfinger_path: string;
  outbox_path: string;
  post_count: number;
}>('export_activitypub', {
  outputDir: selected,  // path string from folder picker
  identity: {
    handle: apHandle.trim(),
    display_name: apDisplayName.trim(),
    hosting_url: apHostingUrl.trim().replace(/\/$/, ''),
  }
});
exportStatus = `Exported 3 files to ${selected}`;
```

### Status Feedback Pattern (existing from settings/+page.svelte)

```typescript
// Source: src/routes/settings/+page.svelte (exportStatus pattern)
let exportStatus = $state('');
// After successful export:
exportStatus = `Exported 3 files to ${selected}`;
// Rendered as:
// {#if exportStatus}<span class="import-status">{exportStatus}</span>{/if}
```

### Exported File Paths to Communicate to User

These are the exact paths that must exist on the static host. Show them in the UI:

```
Actor:      {hosting_url}/ap/actor.json
Outbox:     {hosting_url}/ap/outbox.json
WebFinger:  {hosting_url}/.well-known/webfinger   ← note: no .json extension on server
```

Local export structure (what gets written to disk):
```
{output_dir}/
├── ap/
│   ├── actor.json
│   └── outbox.json
└── .well-known/
    └── webfinger.json    ← user renames to "webfinger" when uploading
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AP required dynamic server for all operations | Static actor files are viable with inbox-less implementation | 2018 onwards — community-driven | Mercury can support AP without a server |
| Mastodon required live inbox for follow to work | Mastodon sends Follow to inbox; if no response, follow stays "pending" on follower's side (not an error) | 2022-2024 community testing | Static export is acceptable; user confirms by searching their handle on Mastodon |
| Single `@context` string | `@context` array with security vocabulary required for publicKey | AP spec since inception | Must use array form for actor documents with keys |
| PKCS8 public key (`BEGIN PUBLIC KEY`) | PKCS1 RSA public key (`BEGIN RSA PUBLIC KEY`) for publicKeyPem | ActivityPub practice since inception | Must use PKCS1 for Mastodon compatibility |

**Deprecated/outdated:**
- `Linked Data Signatures` (LDS): ActivityPub originally spec'd LD Signatures for content signing. Mastodon and most implementations now use HTTP Signatures only. For outbound static files, no signing is needed.
- NIP-04 DMs (unrelated — confirmed not to affect this phase).

---

## Open Questions

1. **Curator Posts Table Absence**
   - What we know: Phase 12 built embed tools, not a blog/post system. taste.db has no `curator_posts` table. The CONTEXT.md says outbox should contain curator posts.
   - What's unclear: Does "curator posts" refer to a future feature (outbox is intentionally empty now), or was there an expectation that Phase 12 built post storage?
   - Recommendation: Export empty outbox (`totalItems: 0`) as valid AP. Add UI copy explaining posts will appear here in a future version. Do not build post storage in this phase unless explicitly asked. If the planner decides posts ARE needed, add a minimal `curator_posts` table to taste.db as a new task.

2. **RSA Key Persistence Security**
   - What we know: Private key stored as plaintext string in SQLite `user_identity` table (same pattern as other sensitive data in this codebase).
   - What's unclear: Whether storing RSA private key in SQLite alongside other identity data is acceptable for this threat model.
   - Recommendation: Accept this pattern. Mercury is a local desktop app with no network access to taste.db. The RSA key is only used for future outbound signing (v1.4). For Phase 21, the private key is generated but never actually used to sign anything — it's included in actor.json for future compatibility only. Document the storage location in comments.

3. **Static Follow Behavior Verification**
   - What we know: When Mastodon sends a Follow activity to a non-responding inbox, the follow stays "pending" from the follower's perspective. The STATE.md acknowledges this: "AP JSON-LD output must be validated against a live Mastodon instance before Phase 21 ships — mandatory integration test."
   - What's unclear: Does Mastodon show the actor as followable at all, or does the failed inbox POST prevent even profile discovery?
   - Recommendation: APUB-03 success criterion is "followable" — this means the actor profile is searchable and the follow action completes (even if "pending"). The mandatory integration test in STATE.md must verify this.

---

## Sources

### Primary (HIGH confidence)
- [W3C ActivityPub spec](https://www.w3.org/TR/activitypub/) — Actor structure, Outbox OrderedCollection, Note/Create activity shapes
- [Mastodon ActivityPub documentation](https://docs.joinmastodon.org/spec/activitypub/) — Mastodon-specific fields (discoverable, manuallyApprovesFollowers)
- [Mastodon Security spec](https://docs.joinmastodon.org/spec/security/) — HTTP Signatures, publicKey format
- Mercury codebase (`src-tauri/src/ai/taste_db.rs`) — user_identity table, set/get_identity_value commands
- Mercury codebase (`src-tauri/capabilities/default.json`) — dialog:allow-open already enabled
- Mercury codebase (`src/lib/components/SiteGenDialog.svelte`) — folder picker pattern
- Mercury codebase (`src/routes/settings/+page.svelte`) — identity storage + status feedback patterns
- [rsa crate docs 0.9](https://docs.rs/rsa/0.9.8/rsa/) — RsaPrivateKey/RsaPublicKey PEM methods
- [Tauri Dialog plugin v2](https://v2.tauri.app/plugin/dialog/) — open() API, permissions

### Secondary (MEDIUM confidence)
- [Paul Kinlan — Adding ActivityPub to your static site](https://paul.kinlan.me/adding-activity-pub-to-your-static-site/) — Static hosting limitations confirmed (Content-Type issues)
- [Maho Pacheco — ActivityPub static site guide Part 3](https://maho.dev/2024/02/a-guide-to-implementing-activitypub-in-a-static-site-or-any-website-part-3/) — Full actor.json structure with publicKey
- [Mastodon blog — How to implement a basic ActivityPub server](https://blog.joinmastodon.org/2018/06/how-to-implement-a-basic-activitypub-server/) — Inbox requirement even for non-responding actors

### Tertiary (LOW confidence)
- Community reports on static follow behavior (multiple sources agree: follow stays "pending" when inbox doesn't respond, but profile is still discoverable)
- WebFinger static file routing: multiple nginx/static host guides confirm query-string routing is the main pitfall

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — rsa crate verified via docs.rs, Tauri dialog verified via official docs + existing codebase usage
- Architecture: HIGH — follows established site_gen.rs / SiteGenDialog.svelte patterns exactly; identity storage pattern already in production
- AP JSON-LD structures: HIGH — verified via W3C spec + Mastodon official docs
- Pitfalls: HIGH — PKCS1 vs PKCS8 key format, @context array, inbox requirement all verified from multiple official sources
- Static follow behavior: MEDIUM — documented by community; not officially spec'd (inbox non-response behavior is implementation-defined)

**Research date:** 2026-02-24
**Valid until:** 2026-03-24 (ActivityPub spec is stable; Mastodon AP implementation is slow-moving)
