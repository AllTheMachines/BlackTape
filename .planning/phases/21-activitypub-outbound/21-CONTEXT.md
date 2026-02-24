# Phase 21: ActivityPub Outbound - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Configure an ActivityPub actor identity in Settings and export three static JSON files (actor.json, webfinger.json, outbox.json) to a user-chosen local directory for self-hosting. When uploaded to the configured hosting URL, the actor becomes followable from Mastodon. No server required — pure static file export. Inbound follows, notifications, and live publishing are explicitly out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Actor identity form
- Minimal fields only: handle (username portion), display name, hosting URL
- Handle is just the username part — no @domain — app shows a live preview like `@steve@yourdomain.com` derived from handle + hosting URL
- No avatar or bio fields in this phase
- Validation fires on export attempt, not on each keystroke
- New dedicated "Fediverse" (or "ActivityPub") section added at the bottom of the Settings page

### Outbox content
- Only curator posts (from the Curator/Blog tool, Phase 12) become AP activities
- Artist discoveries, scene follows, and listening room activity are NOT included
- All historical curator posts are included on export (no limit)
- Full post content goes in the AP note body — no truncation or "read more" link
- Outbox is idempotent: activities use the original post timestamps, not an export timestamp, so the same content always produces the same file

### Export workflow
- Export button lives in the Fediverse Settings section, collocated with the identity config
- Tauri file picker dialog opens to choose the output directory
- Existing files (actor.json, webfinger.json, outbox.json) are overwritten silently — no confirmation prompt
- Export button is disabled (grayed out with tooltip) until all three identity fields are filled
- Success feedback: toast notification showing "Exported 3 files to /path/to/dir"

### Self-hosting guidance
- Inline help block in the Fediverse Settings section explains what to do with the files
- After export (or always visible), show the exact URL paths the files must be served at, computed from the hosting URL + handle — user can copy-paste
- No "Test Connection" or verify button — user confirms it works by trying to follow in Mastodon
- Guidance is generic ("any static host that serves files at these paths") — no specific hosting services named

### Claude's Discretion
- Exact visual design of the Fediverse Settings section (layout, spacing, how the preview handle is displayed)
- Wording of the inline help/instruction block
- Tooltip text on the disabled Export button
- How webfinger.json query-string routing is communicated (exact path explanation wording)

</decisions>

<specifics>
## Specific Ideas

- The handle preview showing `@handle@domain.com` should update live as the user types, built from the handle + hosting URL fields
- The exact URL paths block should be copy-paste ready, e.g. `https://yourdomain.com/.well-known/webfinger` and `https://yourdomain.com/ap/actor.json`

</specifics>

<deferred>
## Deferred Ideas

- AP WebFinger + live Fediverse follow (inbound follows, notifications) — already deferred to v1.4 serverless Worker per ROADMAP.md
- Test Connection / verify actor is live button — no server needed for this phase, out of scope
- Avatar and bio fields in actor identity — future enhancement if requested

</deferred>

---

*Phase: 21-activitypub-outbound*
*Context gathered: 2026-02-24*
