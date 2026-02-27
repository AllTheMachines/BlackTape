# Phase 33: Artist Claim Form - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

A `/claim` route where artists can submit a claim request for their artist page. Every artist page links to `/claim` with the artist name pre-filled. Form submission is stored externally (not localStorage) so Steve can review claims and follow up with artists via email.

**Scope note:** The roadmap originally specified "localStorage only / no backend required." Steve has explicitly changed this — claims must reach him for artist outreach. The researcher should investigate using the existing Cloudflare setup (blacktapesite project, Cloudflare Workers + D1) for claim storage and notification emails.

</domain>

<decisions>
## Implementation Decisions

### Claim link on artist page
- Placed near the artist name / header area (top of page, contextually obvious)
- Visually: small, quiet text link — secondary text color, small font. Very subtle so it doesn't distract music fans
- Exact text: "Are you {Artist Name}? Claim this page" (artist name interpolated from page data)
- Navigates in the same tab — standard SvelteKit navigation, browser back returns to artist page
- Link uses query param: `/claim?artist={artistName}` (human-readable name, not MBID)

### Form design + fields
- Artist name field: pre-filled from `?artist=` query param, read-only (locked)
- If `/claim` is visited with no query param: show form with an empty, editable artist name field
- Email field: standard email input, required
- Message field: required, with placeholder that prompts verification: e.g. "Link your website, Bandcamp, social profiles, or any proof you're this artist"
- Validation: email format must be valid + message must not be empty. Block submission otherwise
- Page includes a brief intro paragraph explaining what claiming means: e.g. "Claim your page to manage your profile, add links, and connect with fans"

### Confirmation experience
- On successful submit: form disappears, replaced by a confirmation message
- Confirmation copy: warm thank-you + "we'll be in touch" framing + link back to the artist page
- No history UI — no list of past claims, no "you already submitted" detection
- Duplicate submissions allowed silently (no deduplication logic in v1)

### External storage (scope change from roadmap)
- Claims must be persisted externally — NOT localStorage
- Steve needs: (1) a dashboard/list to review all claims, and (2) a notification email per new submission
- Researcher should investigate: Cloudflare D1 database + Cloudflare Workers API endpoint (Steve has an existing Cloudflare setup in the `blacktapesite` project at `D:/Projects/blacktapesite`)
- Alternative approaches to investigate if D1 isn't suitable: GitHub Issues API (each claim = issue), email-only via a service like Formspree/Resend
- The claim payload to store: artist name, email, message, timestamp

### Claude's Discretion
- Exact intro paragraph wording
- Confirmation message exact copy (tone: warm, human, not corporate)
- Form layout and spacing
- Error message wording for validation failures

</decisions>

<specifics>
## Specific Ideas

- Steve's intent: when artist profiles gain editing capabilities in a future milestone, he wants to be able to email the artists who previously claimed their page
- The Cloudflare project is at `D:/Projects/blacktapesite` — researcher should check what's already set up (Workers, D1 bindings, etc.) to find the path of least resistance

</specifics>

<deferred>
## Deferred Ideas

- Artist profile editing / verification dashboard — future milestone (the backend claim list is a prerequisite for this)
- Showing claimed status on artist pages (e.g. "✓ Claimed") — future phase once backend is built
- Preventing duplicate claims per artist — future phase

</deferred>

---

*Phase: 33-artist-claim-form*
*Context gathered: 2026-02-27*
