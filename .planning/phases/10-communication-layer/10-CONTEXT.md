# Phase 10: Communication Layer - Context

**Gathered:** 2026-02-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Add messaging infrastructure so users who found each other in Phase 9 can actually talk. Three communication layers: private DMs, persistent scene rooms organized by genre/vibe/tags, and ephemeral live listening parties. Zero server cost is a hard constraint. Infrastructure protocol decision (Matrix, P2P, Nostr, relay) is deferred to research — the UX decisions here are protocol-agnostic.

</domain>

<decisions>
## Implementation Decisions

### Chat UI & Feel
- Messaging lives as an **overlay/modal** — opens on top of whatever the user is browsing, no navigation required
- DMs and scene rooms use the **same chat interface** — unified UI, just different participant counts and labels
- Notification style: **badge on nav icon only** — unobtrusive, no toasts or interruptions while browsing
- **Mercury links unfurl inline** — paste an artist/release page URL and it renders as a mini card (cover art, name, tags) inside the chat

### Scene Rooms & Discovery
- **Any user can create a room** — no threshold or restriction (beyond the AI requirement below)
- Rooms are discoverable through **all three paths**: tag browsing (same taxonomy as artists), rooms surfaced on artist/tag pages, and a standalone rooms directory
- Room naming: **name + at least one required tag** — ensures discoverability; a **content safety filter** runs on room names at creation time (no offensive or spam names)
- Inactive rooms **auto-archive** after a period of no messages — archived rooms stay searchable but don't appear in the active directory

### Ephemeral Sessions (Live Listening Parties)
- Core use case: **"I'm playing this album, come listen with me"** — a live, shared listening moment tied to specific music
- When a session ends: **nothing is preserved** — messages, participants, and context are fully deleted. No taste signals, no receipts. Full privacy.
- Entry points: **both** — a "Start a listening party" action on artist/album pages AND the ability to create one from within the chat overlay
- Visibility: **host chooses at creation** — private (invite-only links) or public (visible in discovery/active sessions feed)

### Moderation UX
- When a user flags a message: **nothing visible changes** — the flag is logged silently, the room owner gets a notification queue, no public disruption
- Room owner moderation tools: **delete messages + kick + ban + slow mode**
- Room owners can **appoint co-moderators** from existing members (owner retains authority)
- If owner is absent: **nothing automatic** — room continues via community flagging; no auto-promotion

### AI System (Critical — Gates Room Creation)
- **Configuring an AI model is required to create a room** — not to join or participate, only to create. This ensures every room has AI moderation coverage from day one. Primary rationale: preventing child abuse and harmful content at the infrastructure level.
- AI configuration lives in **Settings** (accessible anytime) AND is **prompted contextually** when a user tries to create a room without it configured
- Configuration options: **paste an API key** (any provider — OpenAI, Anthropic, etc.) OR **download an open-source model** — user's choice
- This is a **platform-wide setting** — the configured model powers all AI features across Mercury (taste features, moderation, etc.)

### AI in Communication (Phase 10 scope)
- **AI moderation bot**: room owner's AI actively monitors their room for harmful content
- **AI taste translation**: when two users connect via DM, AI explains WHY their tastes overlap — what's the musical bridge
- **AI matchmaking context**: suggests conversation starters based on taste overlap/divergence

### Claude's Discretion
- Communication infrastructure protocol (Matrix vs Nostr vs P2P vs relay) — deferred to research, pick based on zero-server-cost constraint and ecosystem maturity at build time
- Exact slow mode timer options (1 min, 5 min, etc.)
- Auto-archive threshold (30 days, 60 days of inactivity)
- Content safety filter implementation (word list, ML model, etc.)
- How open-source models are downloaded and managed locally

</decisions>

<specifics>
## Specific Ideas

- Child safety is not optional — AI moderation gate on room creation is a hard requirement, not a nice-to-have
- The "bring your own AI" system is truly open: any API provider, any open-source model. Mercury doesn't pick a winner.
- Ephemeral sessions are genuinely ephemeral — no partial preservation, no "just the tracklist." If it's gone, it's gone.
- Mercury links in chat should feel natural — you paste what you're looking at and it unfurls, like iMessage link previews

</specifics>

<deferred>
## Deferred Ideas

- **AI bots as room participants** — users inviting AI bots (e.g., a DJ bot that suggests tracks based on the room's taste profile) into scene rooms. Deferred from Phase 10 to Phase 11 (Scene Building). Rationale: implementing a Nostr keypair operated by the local AI requires its own identity lifecycle, UX patterns for bot presence, and interaction design that goes beyond the communication layer's scope. This is a Phase 11 scene-building feature, not a prerequisite for DMs, rooms, or sessions. The ROADMAP Phase 10 success criteria (items 1-8) do not include AI bots. Revisit during Phase 11 planning.

</deferred>

---

*Phase: 10-communication-layer*
*Context gathered: 2026-02-23*
