# Work Handoff - 2026-03-05

## Current Task
Rabbit Hole AI companion panel — complete and committed.

## What Was Built This Session

### AI Companion in Rabbit Hole (`src/routes/rabbit-hole/+layout.svelte`)
A right-column panel (220px) added to the Rabbit Hole layout containing:

1. **"AI Companion" header** — matches RightSidebar style
2. **Instant helper message** — appears immediately on each new page, no API call:
   - Artist: "You're exploring [Name]. Click tags to dive into related genres, or hit Continue → to keep going. Ask me anything about them."
   - Tag: "You're browsing [tag] music. Click an artist chip to explore them, or tap a tag to go deeper."
3. **3 contextual suggestion chips** — clickable, send directly to AI:
   - Artist: "What does X sound like?", "What's their most essential album?", "Who should I explore next?"
   - Tag: "What defines X music?", "Key artists in X?", "What era did this emerge from?"
4. **Chat clears and resets** on every trail navigation (new artist/tag)
5. **Link rendering** — AI responses with `[text](url)` render as clickable buttons:
   - Internal `/path` links → `goto(href)`
   - External links → Tauri shell `open()`
6. **System prompt** tells the AI it can include links, gives it internal route patterns
7. **Context-aware** — AI knows current artist/tag and full exploration trail

### Layout fix
- Panel uses `overflow-y: auto` (not `flex: 1` on messages) — input always visible
- Root cause of previous invisible input: `height: 100vh` on shell + `flex: 1` on messages pushed input below visible viewport

### ArtistSummary changes (`src/lib/components/ArtistSummary.svelte`)
- `autoGenerate` prop added — Rabbit Hole passes `true` to always auto-generate
- `aiAvailable` state — shows "Generate summary" button when AI configured but no cache
- Both changes are backward compatible

## Remaining / Next Steps
- Test the AI companion panel visually — does it look right now?
- The `--t-4` variable is used in trail separators (original code) but not defined in theme — has always been this way, not a regression
- If user wants further polish: keyboard nav (#12), reload button (#79), UI containers (#69)

## Key Files
- `src/routes/rabbit-hole/+layout.svelte` — main file with AI panel
- `src/lib/components/ArtistSummary.svelte` — autoGenerate prop + generate button
- `src/lib/components/RabbitHoleArtistCard.svelte` — passes autoGenerate={true}

## Git
- Committed: `ac68995b` — all 196 tests passing

## Resume Command
After running `/clear`, run `/resume` to continue.
