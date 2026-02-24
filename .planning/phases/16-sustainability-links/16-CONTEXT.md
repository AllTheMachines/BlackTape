# Phase 16: Sustainability Links - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Add visible, non-intrusive sustainability support to Mercury:
1. Artist funding links (Patreon/Ko-fi/crowdfunding) on artist pages, separate from social/info links
2. Mastodon share button on artist and scene pages (URL-scheme only, one-way)
3. Mercury's own support links (Ko-fi, GitHub Sponsors, Open Collective) in the About screen
4. Backer credits screen listing Mercury supporters fetched from a Nostr list event

This phase uses the existing link pipeline from Phase 15 (`categorize.ts`). No new social integrations, no following/feed features — those are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Funding link presentation (artist pages)
- Separate labeled "Support" section, visually distinct from the info and social link sections
- Each funding link displayed as: icon + platform name as a text link (e.g., ♥ Patreon | ☕ Ko-fi)
- Section is hidden entirely when no funding links exist — no empty "Support" heading
- Section sits after info/social links, near the bottom of the artist page (non-intrusive positioning)

### Mastodon share UX
- Small share icon in the artist page header (and scene page header)
- Always visible, not hidden in an overflow menu
- Pre-populated post text: "[Artist Name] on Mercury — [mercury://artist/ID]" (artist name + deep link, no extra copy)
- Instance routing: use a universal redirect service (e.g., sharetomastodon.app) — user picks their instance on the redirect page, no Mercury-side setup needed

### Mercury About screen
- Add a "Support" section near the bottom of the About screen, after version/credits info
- Tone: mission-led — one sentence explaining the project's values, then the links
  - Exact copy: *"Mercury runs on no ads, no tracking, no VC money — just people who care about music."*
- Links listed: Ko-fi | GitHub Sponsors | Open Collective
- "View backers" link adjacent to the Support section, linking to the Backer Credits screen

### Backer credits screen
- Simple scrollable list of backer names (no grid, no tiers)
- Fetch on screen open, show a loading state while fetching from Nostr
- If fetch fails or returns nothing: quiet message "Could not load backers" + retry button
- Small CTA at the bottom: "Want to be listed? Support Mercury" → links back to support options

### Claude's Discretion
- Exact icon choices for each funding platform (use recognizable brand icons if available, fallback to generic heart/coin icon)
- Nostr relay selection and fetch implementation details
- Loading skeleton vs spinner for backer list loading state
- Exact typography, spacing, and color treatment within the "Support" section

</decisions>

<specifics>
## Specific Ideas

- Mercury's mission statement for About: *"Mercury runs on no ads, no tracking, no VC money — just people who care about music."* (exact copy, use this)
- Mastodon share is one-way only — Mastodon has zero influence on Mercury, no data flows back
- The "View backers" link in About and the "Want to be listed?" CTA in Backer Credits should point to the same support links

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 16-sustainability-links*
*Context gathered: 2026-02-24*
