# Phase 33: Artist Claim Form - Research

**Researched:** 2026-02-27
**Domain:** SvelteKit form, Cloudflare Workers KV, Resend email notification
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Claim link placement on artist page**
- Placed near the artist name / header area (top of page, contextually obvious)
- Visually: small, quiet text link — secondary text color, small font. Very subtle
- Exact text: "Are you {Artist Name}? Claim this page" (artist name interpolated from page data)
- Navigates in the same tab — standard SvelteKit navigation, browser back returns to artist page
- Link uses query param: `/claim?artist={artistName}` (human-readable name, not MBID)

**Form design + fields**
- Artist name field: pre-filled from `?artist=` query param, read-only (locked)
- If `/claim` visited with no query param: show form with empty, editable artist name field
- Email field: standard email input, required
- Message field: required, with placeholder: "Link your website, Bandcamp, social profiles, or any proof you're this artist"
- Validation: email format must be valid + message must not be empty. Block submission otherwise
- Page includes brief intro paragraph explaining what claiming means

**Confirmation experience**
- On successful submit: form disappears, replaced by a confirmation message
- Confirmation copy: warm thank-you + "we'll be in touch" framing + link back to the artist page
- No history UI — no list of past claims, no "you already submitted" detection
- Duplicate submissions allowed silently (no deduplication logic in v1)

**External storage (scope change from roadmap)**
- Claims must be persisted externally — NOT localStorage
- Steve needs: (1) a dashboard/list to review all claims, and (2) a notification email per new submission
- Use the existing Cloudflare Workers + KV setup in `D:/Projects/blacktapesite/worker/`
- The claim payload to store: artist name, email, message, timestamp
- Alternative approaches to investigate: GitHub Issues API, email-only via Formspree/Resend

**Claude's Discretion**
- Exact intro paragraph wording
- Confirmation message exact copy (tone: warm, human, not corporate)
- Form layout and spacing
- Error message wording for validation failures

### Deferred Ideas (OUT OF SCOPE)

- Artist profile editing / verification dashboard — future milestone
- Showing claimed status on artist pages (e.g. "✓ Claimed") — future phase once backend is built
- Preventing duplicate claims per artist — future phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLAIM-01 | Artist claim form at /claim — fields: artist name, email, message; "Is this you? Claim this page" link on all artist pages; submissions stored in localStorage | Note: REQUIREMENTS.md still says localStorage but CONTEXT.md explicitly overrides this to external storage via Cloudflare Worker. CONTEXT.md wins. Research supports Cloudflare Worker KV + Resend email approach. |
</phase_requirements>

---

## Summary

The existing Cloudflare Worker at `D:/Projects/blacktapesite/worker/index.js` already handles a nearly identical use case: the `/contact` endpoint accepts `{ name, email, message }`, stores each submission to Cloudflare KV under a timestamped key, and sends a notification email via Resend. The artist claim form is structurally the same — it just swaps `name` for `artistName` and adds the claim-specific framing. The worker needs a new `/claim` endpoint added, and the existing admin endpoint extended to display claims separately.

The Mercury frontend work is two pieces: (1) a new `/claim` route with a standard SvelteKit `+page.svelte` that reads `?artist=` from `$page.url.searchParams`, renders the form, and POSTs to the worker; and (2) a small addition to the artist page (`+page.svelte`) that renders the claim link near the artist name using project CSS tokens (`var(--t-3)`, `var(--acc)`, `var(--b-1)`). No new libraries are needed on the Mercury side. On the worker side, the only addition is a new route handler and a minor CORS allowlist check (Tauri apps send `null` or `tauri://localhost` as origin — this needs handling).

The Tauri CORS concern is the main technical risk: `fetch()` calls from inside a Tauri WebView2 app may send `Origin: null` or `Origin: tauri://localhost`, neither of which is in the current allowedOrigins array. The fix is adding `tauri://localhost` and a null-origin fallback to the worker's CORS handling. This is verified behavior based on how Tauri WebView2 origin headers work.

**Primary recommendation:** Add a `/claim` endpoint to the existing `blacktape-signups` Cloudflare Worker (KV + Resend), then build the `/claim` SvelteKit page and claim link in Mercury. No new infrastructure needed.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SvelteKit | 2.x (already installed) | `/claim` route, form page | Project standard — all routes use it |
| Svelte 5 | 5.x (already installed) | `$state`, `$derived`, `$page` store | Project standard — all components use runes |
| Cloudflare Workers | Deployed (blacktape-signups) | Backend endpoint for claim storage | Already running, same worker handles /subscribe and /contact |
| Cloudflare KV | Bound as `EMAILS` | Persistent key-value storage for claims | Already provisioned — binding ID `9dbc29aae0824f67981a09d1475c9e44` |
| Resend | Configured in worker | Email notification per claim | Already integrated — RESEND_API_KEY in worker constants |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `$app/stores` (`$page`) | SvelteKit built-in | Read `?artist=` query param | Used in claim page script to pre-fill artist name field |
| `$app/navigation` (`goto`) | SvelteKit built-in | Not needed for this phase | Navigation is plain `<a>` href links |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cloudflare Worker (existing) | GitHub Issues API | Simpler admin view but requires GitHub OAuth, no email notification built in |
| Cloudflare Worker (existing) | Formspree/Resend direct | No admin dashboard; no way to list all claims without email inbox |
| Cloudflare KV | Cloudflare D1 (SQL) | D1 is overkill for this — KV already provisioned and working for contacts |

**Decision:** Use existing Cloudflare Worker. The `/contact` endpoint in `index.js` is the exact pattern needed. Copy it, rename fields, done. No new infrastructure.

**Installation:** No new dependencies. Cloudflare worker deployed via `cd D:/Projects/blacktapesite/worker && npx wrangler deploy`.

---

## Architecture Patterns

### Recommended Project Structure

```
D:/Projects/Mercury/src/routes/
├── claim/
│   └── +page.svelte        # New: /claim form page

D:/Projects/blacktapesite/worker/
└── index.js                # Extend: add /claim endpoint (new route handler)
```

The `/claim` route follows the same pattern as other simple Mercury routes (`/about`, `/backers`): a single `+page.svelte` with no `+page.ts` loader (data comes from URL params at runtime, not SSR).

### Pattern 1: Reading Query Params in a SvelteKit Page (No +page.ts)

**What:** Use `$page.url.searchParams` in the component script to read `?artist=` at mount time.
**When to use:** When the data arrives via URL parameter and needs no server-side loading.
**Example:**
```typescript
// Source: existing Mercury pattern — LeftSidebar.svelte line 41
import { page } from '$app/stores';

// In component script (reactive):
let artistName = $derived($page.url.searchParams.get('artist') ?? '');
// Or: read once in onMount for a read-only field
import { onMount } from 'svelte';
let artistName = $state('');
let artistParam = $state('');  // track whether param was provided
onMount(() => {
    artistParam = $page.url.searchParams.get('artist') ?? '';
    artistName = artistParam;
});
```

### Pattern 2: Cloudflare Worker Endpoint (add /claim handler)

**What:** New route handler in `index.js` — mirrors existing `/contact` handler exactly.
**When to use:** Whenever a new claim arrives.
**Example:**
```javascript
// Source: D:/Projects/blacktapesite/worker/index.js lines 72-106 (adapted)
if (request.method === 'POST' && url.pathname === '/claim') {
    let artistName, email, message;
    try {
        const body = await request.json();
        artistName = body.artistName?.trim();
        email = body.email?.trim().toLowerCase();
        message = body.message?.trim();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...cors },
        });
    }

    if (!artistName || !email || !message) {
        return new Response(JSON.stringify({ error: 'Missing fields' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...cors },
        });
    }

    const key = `claim:${Date.now()}:${email}`;
    await env.EMAILS.put(key, JSON.stringify({ artistName, email, message, date: new Date().toISOString() }));

    await sendEmail(
        `Artist claim: ${artistName}`,
        `<p><strong>Artist:</strong> ${artistName}</p>
         <p><strong>From:</strong> ${email}</p>
         <p><strong>Message:</strong></p>
         <p>${message.replace(/\n/g, '<br>')}</p>`
    );

    return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json', ...cors },
    });
}
```

### Pattern 3: Claim Link on Artist Page

**What:** A small quiet text link below the artist name, using project CSS tokens.
**When to use:** Every artist page render, always visible.
**Example:**
```svelte
<!-- Source: project pattern from about-page secondary links, var(--t-3) for quiet secondary text -->
<!-- Place after artist name row, below header meta line -->
<a
    href="/claim?artist={encodeURIComponent(data.artist.name)}"
    class="claim-link"
>Are you {data.artist.name}? Claim this page</a>

<style>
.claim-link {
    display: inline-block;
    margin-top: 4px;
    font-size: 0.75rem;
    color: var(--t-3);
    text-decoration: none;
}
.claim-link:hover {
    color: var(--acc);
    text-decoration: underline;
}
</style>
```

### Pattern 4: Form State Machine in Svelte 5

**What:** Three states — idle, loading, submitted — using `$state` runes. Mirrors blacktapesite contact page exactly.
**When to use:** Any async form submission with confirmation.
**Example:**
```svelte
<script lang="ts">
    import { page } from '$app/stores';
    import { onMount } from 'svelte';

    let artistName = $state('');
    let artistReadOnly = $state(false);
    let artistParam = $state('');  // original artist from URL (used in confirmation back-link)
    let email = $state('');
    let message = $state('');
    let submitted = $state(false);
    let loading = $state(false);
    let error = $state('');

    onMount(() => {
        const param = $page.url.searchParams.get('artist') ?? '';
        if (param) {
            artistName = param;
            artistReadOnly = true;
            artistParam = param;
        }
    });

    async function handleSubmit(e: Event) {
        e.preventDefault();
        error = '';
        if (!artistName.trim()) { error = 'Artist name is required.'; return; }
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            error = 'A valid email address is required.'; return;
        }
        if (!message.trim()) { error = 'Please tell us how to verify this is you.'; return; }
        loading = true;
        try {
            const res = await fetch('https://blacktape-signups.theaterofdelays.workers.dev/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ artistName: artistName.trim(), email: email.trim(), message: message.trim() }),
            });
            if (!res.ok) throw new Error();
            submitted = true;
        } catch {
            error = 'Something went wrong — please try again.';
        } finally {
            loading = false;
        }
    }
</script>
```

### Anti-Patterns to Avoid

- **Sending MBID instead of artist name in URL param:** The URL should use `/claim?artist=Band+Name`, not `?mbid=abc123`. Human-readable. CONTEXT.md explicitly specifies this.
- **Using `$page.url.searchParams` reactively for read-only pre-fill:** For a read-only pre-filled field, read the param once in `onMount`, not as a `$derived` — the value won't change after mount and reactive derivation adds unnecessary coupling.
- **Blocking all null-origin requests in the worker:** Tauri WebView2 sends `Origin: null` on some fetch calls. The CORS guard must handle this explicitly (see Pitfall 2 below).
- **Using the KV `EMAILS` namespace for claim keys without a prefix:** The existing admin endpoint uses `claim:` prefix for contact messages. Use `claim:` prefix for artist claims too so they show up in the admin list correctly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email notifications | Custom SMTP integration | Resend (already in worker) | Already configured, `sendEmail()` function exists in index.js |
| Admin dashboard for claims | Custom web UI | Worker's `/admin?key=xxx` endpoint | Already built — dumps all KV entries as plain text; extend it to show claims |
| Form validation | Complex regex library | Inline regex (same as existing worker) | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` is sufficient, already used in worker |
| URL encoding for artist name | Custom encoder | `encodeURIComponent()` native | Available everywhere, no library needed |
| Persistent storage | New database | Cloudflare KV (already provisioned) | Binding already set up in wrangler.toml |

**Key insight:** The blacktapesite worker is already a complete backend for exactly this feature. Adding `/claim` is ~30 lines of code that copies the `/contact` pattern.

---

## Common Pitfalls

### Pitfall 1: Tauri CORS Origin Header
**What goes wrong:** The Mercury app is a Tauri desktop app. When it calls `fetch()` to the Cloudflare Worker, the `Origin` header may be `null` (empty WebView2 context) or `tauri://localhost`. Neither is in the worker's current `allowedOrigins` array.
**Why it happens:** Tauri WebView2 does not send a web origin like `https://example.com`. The CORS check `allowedOrigins.includes(origin)` will fail, and the worker will return `Access-Control-Allow-Origin: https://blacktape.org` which the WebView will reject.
**How to avoid:** Add Tauri origins to the worker's allowedOrigins:
```javascript
const allowedOrigins = [
    'https://blacktape.org',
    'https://blacktape.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'tauri://localhost',         // Add: Tauri production
    'http://tauri.localhost',    // Add: Tauri dev on some platforms
];
// Also handle null origin (fallback to permissive for desktop app context):
const corsOrigin = allowedOrigins.includes(origin) || !origin
    ? (origin || '*')
    : 'https://blacktape.org';
```
**Warning signs:** Form submission silently fails; browser console shows CORS error; `loading` state never resolves.

### Pitfall 2: Artist Name with Special Characters in Query Param
**What goes wrong:** Artist names like "Sigur Rós", "!!!","AC/DC" contain characters that corrupt URL params if not encoded.
**Why it happens:** If the claim link uses string interpolation without encoding: `/claim?artist={data.artist.name}` — the name gets embedded raw, breaking the URL.
**How to avoid:** Always wrap the artist name with `encodeURIComponent()` in the link href:
```svelte
href="/claim?artist={encodeURIComponent(data.artist.name)}"
```
And in the `/claim` page, `$page.url.searchParams.get('artist')` automatically URL-decodes it — no manual decoding needed.
**Warning signs:** Artist name shows garbled characters in form; form field is truncated at `&` or `=` in the name.

### Pitfall 3: Read-Only Field Still Being Submitted as Empty
**What goes wrong:** If the artist name input has `readonly` attribute but its `$state` binding is never initialized, the POST body sends `artistName: ""`.
**Why it happens:** `readonly` prevents user editing but doesn't affect the bound value. If `onMount` hasn't run yet (or SSR context confusion), the initial `$state('')` value is what gets submitted.
**How to avoid:** Set `artistName = param` in `onMount` before the user can interact. Because Mercury is adapter-static with Tauri (no SSR), `onMount` always runs client-side. This is safe.
**Warning signs:** Worker returns 400 "Missing fields" despite form appearing filled in.

### Pitfall 4: Incorrect Admin Endpoint Key Prefix
**What goes wrong:** Claims don't appear in the admin dashboard when Steve checks it.
**Why it happens:** The admin endpoint splits keys as `signups` (no prefix) vs `contacts` (prefix `contact:`). If claims use a different prefix format, they'll be silently miscategorized.
**How to avoid:** Use `claim:${Date.now()}:${email}` as the KV key. Then extend the admin endpoint to also list `claim:` prefixed keys.
**Warning signs:** Steve can see contact messages but not claim submissions in `/admin`.

### Pitfall 5: encodeURIComponent on artistParam for Back-Link
**What goes wrong:** After submission, the confirmation shows a "Back to {artist} page" link but can't construct it because the artist slug isn't available on the `/claim` page.
**Why it happens:** The `/claim` route only receives the artist name, not the slug. The artist page URL is `/artist/{slug}`, not `/artist/{name}`.
**How to avoid:** The confirmation link should go to the search results for the artist name OR simply go back using `history.back()` or link to `/search?q={artistName}`. Don't attempt to reconstruct the artist slug. Alternatively, the claim link could pass both: `/claim?artist={name}&from={slug}`, then the confirmation reads `from` to construct the back URL.
**Warning signs:** Back link on confirmation page 404s or shows wrong artist.

---

## Code Examples

### Worker: Extended Admin Endpoint to include claims

```javascript
// Source: adapted from D:/Projects/blacktapesite/worker/index.js lines 109-133
if (request.method === 'GET' && url.pathname === '/admin') {
    if (url.searchParams.get('key') !== ADMIN_KEY) {
        return new Response('Unauthorized', { status: 401 });
    }

    const list = await env.EMAILS.list();
    const signups = list.keys.filter(k => !k.name.startsWith('contact:') && !k.name.startsWith('claim:'));
    const contacts = list.keys.filter(k => k.name.startsWith('contact:'));
    const claims = list.keys.filter(k => k.name.startsWith('claim:'));

    const claimLines = await Promise.all(claims.map(async k => {
        const val = await env.EMAILS.get(k.name);
        try {
            const { artistName, email, message, date } = JSON.parse(val);
            return `[${date}] ${artistName} — ${email}\n${message}`;
        } catch { return k.name; }
    }));

    // ... rest of response includes claimLines
}
```

### Mercury: Claim link placement in artist page header

```svelte
<!-- Source: pattern from existing artist page secondary links — var(--t-3) small text -->
<!-- Location: after .artist-name-row in artist-header, before any tab navigation -->
<div class="artist-claim-row">
    <a
        href="/claim?artist={encodeURIComponent(data.artist.name)}"
        class="artist-claim-link"
    >Are you {data.artist.name}? Claim this page</a>
</div>

<style>
.artist-claim-row {
    margin-top: 2px;
}
.artist-claim-link {
    font-size: 0.75rem;
    color: var(--t-3);
    text-decoration: none;
}
.artist-claim-link:hover {
    color: var(--acc);
    text-decoration: underline;
}
</style>
```

### Mercury: Complete /claim page structure

```svelte
<!-- src/routes/claim/+page.svelte -->
<script lang="ts">
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import { PROJECT_NAME } from '$lib/config';

    const WORKER_URL = 'https://blacktape-signups.theaterofdelays.workers.dev/claim';

    let artistName = $state('');
    let artistReadOnly = $state(false);
    let fromSlug = $state('');        // for back-link in confirmation
    let email = $state('');
    let message = $state('');
    let submitted = $state(false);
    let loading = $state(false);
    let error = $state('');

    onMount(() => {
        const artistParam = $page.url.searchParams.get('artist') ?? '';
        const fromParam = $page.url.searchParams.get('from') ?? '';
        if (artistParam) {
            artistName = artistParam;
            artistReadOnly = true;
        }
        fromSlug = fromParam;
    });

    async function handleSubmit(e: Event) {
        e.preventDefault();
        error = '';
        if (!artistName.trim()) { error = 'Artist name is required.'; return; }
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            error = 'Please enter a valid email address.'; return;
        }
        if (!message.trim()) { error = 'Please add a message so we can verify your claim.'; return; }
        loading = true;
        try {
            const res = await fetch(WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    artistName: artistName.trim(),
                    email: email.trim(),
                    message: message.trim(),
                }),
            });
            if (!res.ok) throw new Error();
            submitted = true;
        } catch {
            error = 'Something went wrong. Please try again.';
        } finally {
            loading = false;
        }
    }
</script>
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| localStorage-only (original roadmap) | Cloudflare Worker + KV + Resend (CONTEXT.md decision) | Steve explicitly overrode this to enable artist outreach |
| New backend infrastructure | Extend existing `blacktape-signups` worker | Same worker already handles /subscribe and /contact |
| Separate KV namespace | Reuse existing `EMAILS` KV with `claim:` key prefix | Provisioning already done, no wrangler changes needed for KV |

**The requirement text in REQUIREMENTS.md is stale** — it still says "stored in localStorage." CONTEXT.md explicitly supersedes this. The planner should treat Cloudflare Worker storage as the locked decision.

---

## Open Questions

1. **How should the confirmation link back to the artist page work?**
   - What we know: `/claim` receives the artist name but not the slug. The artist page URL is `/artist/{slug}`.
   - What's unclear: Should the confirmation link go to `/artist/{slug}` (requires passing `from` param), `/search?q={artistName}`, or use `history.back()`?
   - Recommendation: Pass `?from={slug}` in the claim link URL so the confirmation can construct a proper back-link. Update claim link to: `/claim?artist={encodeURIComponent(data.artist.name)}&from={data.artist.slug}`. This is zero extra complexity on the Mercury side.

2. **Should the CORS null-origin fallback return `*` or the specific Tauri origin?**
   - What we know: Tauri on Windows sends either `null` or `tauri://localhost` as the Origin header.
   - What's unclear: Whether `Access-Control-Allow-Origin: *` causes any Tauri-specific issues with the Cloudflare response.
   - Recommendation: Use `tauri://localhost` in the explicit allowlist. If origin is empty/null, return `*` as the ACAO header — this is safe for a public write-only endpoint.

3. **Does wrangler.toml need updating to deploy the new `/claim` endpoint?**
   - What we know: The worker is a single `index.js` — all routes are handled in one function. Adding a new route handler to `index.js` requires no `wrangler.toml` changes. Only `npx wrangler deploy` is needed.
   - What's unclear: Whether any KV list quota limits are a concern at scale. At claim volumes expected for v1, this is not a concern.
   - Recommendation: No `wrangler.toml` changes. Just modify `index.js`, deploy.

---

## Sources

### Primary (HIGH confidence)
- `D:/Projects/blacktapesite/worker/index.js` — full source of existing worker. `/contact` pattern is the direct template for `/claim`. CORS handling, KV storage, Resend email — all verified by reading the file.
- `D:/Projects/blacktapesite/worker/wrangler.toml` — confirms KV binding `EMAILS` with id `9dbc29aae0824f67981a09d1475c9e44`; worker name `blacktape-signups`
- `D:/Projects/Mercury/src/routes/artist/[slug]/+page.svelte` — artist page structure verified; `data.artist.name` and `data.artist.slug` are the correct field references; `$page` store imported from `$app/stores`
- `D:/Projects/Mercury/src/lib/components/LeftSidebar.svelte` line 41 — confirms `$page.url.searchParams.get()` is the established project pattern for reading URL params
- `D:/Projects/blacktapesite/src/routes/contact/+page.svelte` — confirmed Svelte 5 form pattern with `$state`, `onsubmit`, fetch to worker URL `https://blacktape-signups.theaterofdelays.workers.dev/contact`

### Secondary (MEDIUM confidence)
- Tauri WebView2 CORS behavior: Tauri apps may send `Origin: null` or `Origin: tauri://localhost`. Based on project STATE.md accumulated context (multiple prior phases dealt with Tauri-specific WebView2 behaviors) and general Tauri documentation patterns. Should be verified at integration time.

### Tertiary (LOW confidence)
- None — all critical claims verified from project source files.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from existing project files; no new libraries
- Architecture: HIGH — worker pattern copied directly from existing `/contact` handler; form pattern from blacktapesite contact page
- Pitfalls: MEDIUM-HIGH — Tauri CORS is a real concern based on project history with WebView2 quirks; URL encoding is a well-known web pattern; others derived from reading the actual code

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable tech stack; Cloudflare Worker API stable)
