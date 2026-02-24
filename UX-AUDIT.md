# Mercury — Full UX Audit
### From the perspective of a music nerd who digs deep

*Written after exploring every route, reading every component, and thinking hard about the experience.*

---

## Framing

Mercury is built around a genuinely compelling idea: discovery through atomic tags, where niche is rewarded and the internet is the database. That idea is solid. But right now the app is a collection of powerful rooms that don't quite know they're in the same building. A music nerd using this app will keep bumping up against invisible walls — moments where the obvious next question has no answer, where you can feel what the feature *should* do but it just isn't there yet.

What follows is a room-by-room walkthrough of everything I found.

---

## 1. Home Page — The First Impression

The home page is clean. Big search bar, name, tagline. It sets the right tone — minimal, no clutter, says what it is.

**What's missing:**

- There's no orientation for a first-time user. You land and you have a search box. What do you search for? If you don't already know an artist name or a genre tag, you're stuck staring at a blinking cursor. There's no "try searching for: shoegaze, or try browsing by decade, or here are some scenes you might not know" entry point. The onboarding gap is real.
- The tagline — "A music search engine with taste." — is good but doesn't hint at the depth underneath. Someone landing here doesn't know there's a genre graph, a time machine, scene rooms, crate digging. There's no teaser.
- No "what's new" or "currently active scenes" on the home page. Every visit looks identical. A music nerd wants to know: what's happening *now*?

---

## 2. Search — Where Most Journeys Start

The search page works. You type a name or a tag, you get artists. But it's thin.

**What doesn't make sense:**

- You can search by artist name OR by tag, but there's no visual affordance for this. Nothing tells you "you can also type a tag like 'krautrock'". A new user will only use it as a name search.
- Results show "Name match" or "Tagged: {tag}" as a badge, but the two modes feel accidental rather than intentional. When you search a tag you get a tag-filtered artist list — but so does the Discover page. What's the difference? Why would I use search vs. Discover for tags? The boundary is fuzzy.
- No search by country, city, label, year, or decade. MusicBrainz has all of this. "Find me post-punk bands from Manchester" should be possible. Right now it isn't.
- No search autocomplete. Typing "board" should surface "Boards of Canada" before I finish. This is a fundamental usability gap on a search-first tool.
- Search results show artists only. No releases. If I search "OK Computer" nothing happens because that's not an artist name. A record nerd wants to find things by album title.
- The "Your Library" local results section (Tauri) is great — real differentiation. But it's capped at 10 with a "See all" link that presumably goes to the Library page, which is a full file browser. The mental model jump is jarring. Why not show local results inline with discovery results?

---

## 3. The Artist Page — The Heart of the App

This is where most time gets spent. It's the best-developed part of Mercury. It already has a lot: bio, tags, streaming links, discography, support links, AI recommendations, embed widget, share buttons, save to shelf. Good foundation.

**What makes no sense:**

- **"Explore {tags[0]} scene →"** links to `/kb/genre/{tag}` — the genre detail page. But it says "scene" even when the tag is a genre like "jazz" or "shoegaze". "Explore shoegaze scene" is fine. "Explore jazz scene" sounds odd. The first tag is used regardless of whether it maps to a scene or a genre. It should respect the type.
- **"Scene rooms for {tags[0]} →"** is a button that opens the chat overlay in rooms view. But the chat overlay has no context about what tag you came from. You click it, the rooms panel opens, and... now what? It doesn't pre-filter to that tag's room or scroll to it. The button raises an expectation it can't fulfill.
- The **Mastodon share button** is labeled "↑" — an up arrow. That's the entire label. No tooltip text visible, no icon, just an up arrow. Without the `title="Share on Mastodon"` attribute (which shows on hover) this is completely inscrutable. A user who isn't hovering has no idea what it does.
- The **"Export site" button** lives in the artist name row — next to the heart, RSS, Save to Shelf, share arrow. That's a lot of action buttons crammed into one horizontal row. On smaller windows this wraps badly. "Export site" is a power user feature that doesn't need to live in the header.
- Only **two tabs**: Overview and Stats. Stats is a niche feature (the uniqueness score breakdown). What about a "Members" tab? A "Recordings" tab? A "Timeline" tab? The tab system exists but is underutilized.

**What's missing:**

- **Band members / lineup history.** This is huge for a music nerd. MusicBrainz has member-of relationships. For a band like The Fall with 60+ members or Can with lineup changes, this is core information. Nowhere to be found.
- **Influenced by / influences.** MusicBrainz has artist relationships: "influenced by", "is tribute to", "was member of", "collaborated with". These are gold for deep discovery. Clicking on The Velvet Underground and not being able to see who they influenced is a missed opportunity.
- **Label history.** Which record labels was this artist on? ECM, Rough Trade, Sub Pop, Touch and Go — labels have identities. A music nerd navigates by label as much as by genre. No label data is shown anywhere.
- **Discography has no filter or sort.** If an artist has 80 releases, it shows up to 50 in a flat grid with a "Show all 80" button. No way to filter by type (albums only, EPs only, singles only, compilations only). No sort by date (default appears to be MusicBrainz order, which is chaotic). A music nerd approaching a new artist wants to find the canonical albums first.
- **The "Listen On" bar works correctly** — platforms, sorted by user preference. But if there are no streaming links in MusicBrainz, this section disappears entirely. There's no fallback "Search on YouTube" or "Search on Bandcamp" button. For obscure artists with no links indexed, you hit a dead end.
- **Cover art.** Artist pages have no image. Just a name. Some artists have photos on Wikipedia, on MB. Even a small artist portrait in the header would transform the feel. Right now all artist pages look identical structurally.
- **Recording count vs. release count.** The discography shows releases (albums/EPs) but not individual recordings/tracks. For a jazz musician with 200 albums and 2,000 recorded tracks, or a DJ with thousands of tracks across compilations, you can't find individual song appearances. No "Appears on" section.
- **No "related artists" or "fans also like"** in the sense of human curation. The AI Recommendations section provides this but it's gated behind AI being enabled. There should always be some baseline similarity shown (tag-based similar artists as a fallback).
- **The "Discovered by" curators section** links to `/new-rising?curator={handle}`. Clicking a curator name shows their list of artists. But curators have no profile page, no bio, no way to follow them directly. You can't discover curators as entities — you can only see their artifacts.
- **No "Edit on MusicBrainz" link.** When data is missing or wrong, there's no escape hatch. A power user should be able to click "Fix this on MusicBrainz" and be taken directly to the MB edit page for this artist.
- **Year display confusion.** It shows "begin_year — present" or "begin_year" for disbanded bands (if `ended` is false). But "ended" might be wrong in the data. And showing just the start year without an end year for disbanded bands is misleading. "1979" with no end year — is this band active? It needs a clear "active" or "disbanded" indicator.

---

## 4. The Release / Album Page

When you click an album in the discography, you get the release page. It has: cover art, title, artist, year, type badge, tracklist, credits, liner notes, Buy On bar, Save to Shelf.

**What makes no sense:**

- **Credits are just "name | role" pairs.** Not linked to anything. If Boris Blank produced this album, his name is plain text. You can't click through to Boris Blank's artist page. For a music nerd, producer credits are how you find new music — following Adrian Sherwood, Steve Albini, or Ennio Morricone through discographies is a core discovery pattern. Dead credits are a missed opportunity.
- **"Tracklist not available from MusicBrainz"** is the fallback. But it's shown as a message at the bottom of the page, below where the tracklist would be. The page looks complete — then at the end you find there's no tracklist. It should be more prominent, ideally shown immediately in the tracklist section header.
- **Buy On bar** — where does it link? To what? The component name implies purchase links but MusicBrainz data on where to buy is sparse. If there are no purchase links, does the section disappear? This section is opaque.
- **No "play this album" button.** You're on an album page. You want to hear it. There are streaming links on the artist page but not here. The inline player on the artist page requires clicking an individual release card — it's hidden. Why not surface it more prominently on the release page itself?
- **No "also appears on" or "reissued as".** MusicBrainz tracks release relationships (reissue of, limited edition of, bootleg of). A collector needs to know: is this the original or the 2012 remaster? Which pressing is this? None of this is surfaced.

**What's missing:**

- **Pressing/edition information.** Country of manufacture, catalog number, format (vinyl / CD / digital), matrix numbers. Discogs has all of this and it's how collectors navigate. Even just showing the catalog number would be huge.
- **Release date vs. recording date.** An album can be recorded in 1972 and released in 1978. That difference matters — for live recordings, for archival releases, for posthumous releases. Only release year is shown.
- **A link back to all releases of the same type.** "Other albums by this artist" or "Other EPs" — a breadcrumb that lets you continue browsing the discography without going back.
- **Track-level streaming.** Right now to play music you click the inline player on a release card from the discography grid, which embeds a YouTube/SoundCloud iframe. This is clunky and happens on the artist page, not the release page. Ideally the release page itself has playback.

---

## 5. Discover — The Core Feature

Discover is the tag-filter browsing system. Pick tags, see artists. Artists with more niche combinations surface first. The idea is correct.

**What makes no sense:**

- **The TagFilter shows "popular tags" at the top.** But popular tags are by definition the most common ones — jazz, rock, pop. The users who most need this tool are the ones hunting for niche combinations. The popular tags are the last thing a digger wants to browse. There should be an option to show "rare" or "unusual" tags, or at least let users search within the tag list.
- **Result count is shown as a sentence** — "Showing 47 artists tagged with shoegaze + post-punk." But there's no pagination. All 47 load at once. What happens when you get 500 artists? Does the grid just get huge? There's no infinite scroll, no "load more", no limit shown.
- **No sort on results.** Always shows the same order (presumably by uniqueness score descending). You can't sort by "recently active" or "alphabetical" or "most releases". If I've already seen the top 20, I want to sort differently to find new ones.
- **No "save this search" or bookmark this filter combination.** A music nerd builds up filter sets they return to. Bookmarking the URL works (the tags are in the URL params) but there's no in-app affordance for it. No "Save this vibe" button.
- **The "Scene rooms for this vibe →" button** appears when tags are selected. This is a nice feature. But if there's no active room for these tags, clicking it opens an empty chat panel. No feedback. Nothing tells you "there are no active rooms for this combination right now."

**What's missing:**

- **Filter by country.** "Show me post-punk bands from the UK" is a completely natural request. Country filter would transform Discover from a genre explorer into a geography + genre explorer. MusicBrainz has this data.
- **Filter by decade.** "Show me krautrock from the 70s" — right now you'd have to go to Time Machine for this, a separate page with a different interface. It should be a Discover filter.
- **Filter by "I haven't seen before" / exclude artists in my shelves.** If I've already saved 40 post-punk artists, I want to discover the 41st, not keep seeing the same ones. A "hide saved artists" toggle would be powerful.
- **"Similar tags" suggestions.** When I select "shoegaze", show me related tags that often co-occur: "dream pop", "noise rock", "indie rock". The Style Map has this data. Surface it inside Discover.
- **Artist count per tag.** In the tag list, show how many artists have each tag. Right now it's just a list of pill buttons. Seeing "post-punk (847)" vs "zolo (12)" immediately communicates rarity.

---

## 6. Knowledge Base — The Genre Graph

The KB is one of the most distinctive features. A navigable map of genre relationships, with Wikipedia summaries, AI fallbacks, key artists, scene maps. This is already impressive.

**What makes no sense:**

- The genre/scene page says **"Know this scene? Write it."** with a link to `/about`. The About page has nothing about contributing genre descriptions. This is a dead end disguised as a contribution pathway. If you want community contributions, there needs to be an actual mechanism — even just a link to a GitHub file or a MusicBrainz page.
- **"Explore {genre} in Discover" appears twice** on genre pages — once at the top and once at the bottom (footer). Identical link, identical text. One of them should be something else (maybe "Listen to {genre} on YouTube" or "See artists ranked by uniqueness").
- **Key Artists section** shows artists but doesn't explain how they were selected. Are these the most unique? The most tagged? The most popular? The most MusicBrainz-documented? No context. A music nerd wants to know if this is a canonical list or a random sample.
- The **genre type badge** (genre / scene / city) is shown in tiny uppercase at the top but doesn't change how the page is structured much. A city page and a scene page look the same. Cities should show a map by default, not optionally.

**What's missing:**

- **Timeline of activity.** When was this genre most active? A sparkline showing "artists formed in this genre by decade" would be extraordinary — you could visually see shoegaze peaking in the late 80s/early 90s, or vaporwave emerging around 2010.
- **"Defining releases."** Key Albums for this genre. The 10 records that define drone metal, the 5 records that define hauntology. MusicBrainz doesn't have this but it could be AI-generated or community-curated.
- **Genre overlap statistics.** "65% of artists in this genre are also tagged with X." This is the Style Map data surfaced contextually.
- **Geographic concentration.** "This genre is primarily from: Japan (34%), UK (22%), US (18%)." A genre's geography is part of its identity.
- **No audio on genre pages.** You're reading about musique concrète and there's no example. Even a link to a canonical YouTube playlist or a Bandcamp curated list would help someone who's never heard the genre.
- **Sub-genre navigation.** If I'm on "post-punk" I can see related genres, but not "sub-genres of post-punk" distinctly from "genres related to post-punk". The relationship type (parent/child/sibling) isn't shown.

---

## 7. Time Machine — Browse by Year

Decade buttons + a year slider + optional tag filter + artist grid. This is a lovely feature. As a music nerd, being able to say "show me ambient artists that formed in 1978" is genuinely exciting.

**What makes no sense:**

- **The year display is very large** — the number takes up a lot of space — but the slider is the only way to interact with it. You can't click the year and type a specific year. If I want exactly 1963, I need to find it on a slider. Text input would be better.
- **Decade buttons snap to the midpoint year** (e.g., "70s" → 1975). That's arbitrary. Why not start at the beginning of the decade? "70s" → 1970 makes more sense.
- **The GenreGraphEvolution component shows "how genres emerge/change over time"** — but what does it actually animate? The code mentions it exists but there's no description of what the visualization looks like in practice. If it's working, it's potentially one of the best features in the app. If it's a stub, it needs to either ship or be removed.
- The tag filter shows **placeholder text "Filter by genre tag (e.g. jazz, punk, ambient)..."** but there's no autocomplete. You have to know the exact tag string. Wrong spelling = no results, no feedback.
- **50 artists per load, no pagination.** If there are 500 jazz artists from 1971, you see 50 randomly. There's no way to see more. For a prolific year or a popular genre, this is a hard cap with no escape valve.

**What's missing:**

- **"What was happening in {year}"** — the code mentions this section exists, but it's just a text snippet. This is a chance for something great: major albums released that year, cultural context, genre movements. Even pulling from Wikipedia's "{year} in music" article would be remarkable.
- **Cross-reference with your taste.** "Of these artists from 1973, you've heard 3 of them (in your library/shelves)." Shows you what you know vs. what's new.
- **Play something from this year.** A "Surprise me" button that auto-plays a track from an artist from the selected year. The discovery moment.
- **Connect to the genre graph.** "In 1971, these genres were emerging: krautrock, glam rock, prog rock." The Time Machine and the Knowledge Base are natural complements that don't talk to each other.

---

## 8. Scenes — Music Micro-Communities

The Scenes page detects communities from collective listening (Tauri only). It's a genuinely original feature — emergent micro-scenes from tag co-occurrence and listening patterns.

**What makes no sense:**

- **"Detecting scenes..."** runs on page mount. For a new user with no library data, this runs and finds nothing. But there's no explanation of *why* there are no scenes — it just says "No scenes detected yet. Add artists to library..." A new user doesn't understand the mechanism. "Scenes emerge from your listening patterns — the more you use Mercury, the more appear" would help.
- **The collaborative playlists vote button** — "Request collaborative playlists" with a Nostr-backed vote count. This is interesting but feels like it belongs in a feature request forum, not on the Scenes page. It's a beta feature poll embedded inside a production feature page. Either build it or cut the CTA.
- **Scene detail pages** have an "AI description" — "This {tag1}, {tag2}, {tag3}... scene is..." — generated with temperature 0.7 and max 60 tokens. 60 tokens is extremely short. The result will be a sentence or two, often generic. Either generate something worth reading (more tokens, better prompt) or don't generate at all.
- **"Community suggested" artists** on scene pages are "muted/italicized" — visually de-emphasized. But community suggestion is a feature worth celebrating. If users are actively suggesting artists for scenes, that's social proof and engagement. Don't hide it.

**What's missing:**

- **Scene RSS feeds.** The New & Rising page has RSS. Artist pages have RSS. Why don't Scenes? A scene feed — "new artists discovered in this scene" — is exactly what a dedicated fan wants to subscribe to.
- **Cross-scene artists.** "This artist appears in 3 scenes" — and showing which ones. Artists that bridge multiple scenes are interesting by definition.
- **Scene history.** When did this scene first appear? Has it grown? A graph of scene size over time (as more artists are added to the library).
- **Scene vs. genre distinction is unclear.** The app has both Scenes (auto-detected from listening) and genres in the KB (graph-based). These overlap but aren't connected. A scene about "cold wave + minimal synth" should link to the KB cold wave genre page. Right now they're parallel systems that don't know about each other.

---

## 9. Listening Rooms — Collaborative Play

This is ambitious: Nostr-backed listening rooms where a host controls YouTube playback and guests can suggest videos.

**What makes no sense:**

- **The room only plays YouTube.** The whole app is about music that lives everywhere — Bandcamp, SoundCloud, Spotify — but the listening room only accepts YouTube URLs. This feels inconsistent with the "internet is the database" philosophy. A Bandcamp link to a rare press should work here.
- **"Waiting for host to set a video..."** is the guest state before anything is playing. That's fine. But there's no indication of *who* the host is, or how long the room has been active, or what was played before. A guest joining mid-session has no context.
- **The host/guest distinction is binary.** The first person in a room is the host; everyone else is a guest who can only suggest. But what if the host leaves? What happens to the room? Is there a host-transfer mechanism? If the host leaves, the room collapses even if 10 people are in it.
- **Room discovery is buried.** You find rooms via: Scenes page → active indicator, Scene detail page → Join button, Discover page → "Scene rooms for this vibe" button, Artist page → "Scene rooms for {tag}" button. But there's no "all active rooms right now" view. No global room browser. If I want to just hang out in whatever room is active right now, I can't find it without hunting.
- **The sidebar shows participants as pubkey prefixes** if they have no display name. "1a2b3c4d..." is not a useful participant name. At minimum, a generated human-readable name from the pubkey (like GitHub's "clever-otter-43") would be better than raw hex.

**What's missing:**

- **Room history / queue history.** What was played in this room in the last hour? For a DJ-style listening room, the queue log is part of the vibe. Show it.
- **Ad-hoc rooms.** Currently rooms are tied to scenes. What if I want to create a room around a specific artist, or just an open "anything goes" room? There's no way to do that.
- **Room chat.** People in a listening room presumably want to talk about what they're hearing. Is the chat overlay the mechanism for this? It's not clear.

---

## 10. Style Map — Tag Co-occurrence Graph

A visualization of how tags relate to each other by co-occurrence frequency. Node size = artist count. Edge weight = co-occurrence. Click a node to go to Discover.

**Observations:**

- This is a great data visualization concept. But it's effectively a different entry point to the same Discover page. Click any node → go to `/discover?tags={tag}`. That's the only action.
- There's no way to click two nodes and see the intersection — you'd have to go to Discover and manually add both tags. The Style Map should let you select multiple nodes and then "Explore this intersection."
- The Style Map and the Knowledge Base genre graph serve overlapping purposes. KB shows genre relationships (editorial, from data). Style Map shows genre relationships (emergent, from listening/tagging patterns). They're complements but they look similar and live in separate nav items. The connection between them isn't communicated.
- No zoom in/out control visible (may be in the component). Navigation on a dense graph without zoom is frustrating.
- **Empty state:** "Make sure mercury.db includes tag_cooccurrence data..." — this is a developer message, not a user message. A user doesn't know what tag_cooccurrence data is or how to get it.

---

## 11. New & Rising — Curation Layer

Three tabs: Newly Active, Gaining Traction, By @curator. RSS button. Clean.

**What makes no sense:**

- **"Newly Active"** is described as "Artists active since {year-1}, ordered by most recent first." But what does "active" mean? Active on Mercury (recently added)? Active as an artist (recent releases)? Active on streaming platforms? The metric is undefined.
- **"Gaining Traction"** is "ordered by tag niche score." So it's the most *unique* artists from the last year? That's a very specific ranking. "Gaining Traction" implies momentum — growing plays, growing attention. The niche score doesn't measure that. The label is misleading.
- **No filter on New & Rising.** The page is all genres, all countries, all decades. A nerd who wants to see what's new in black metal from Scandinavia has to go to Discover (different page, different tool) and add those filters manually.
- The **artist cards** on this page show: name, begin_year, country, tags (first 4). Minimal. But the "Begin year" shows the founding year of the band, not "when they were added to Mercury" or "when they released something recently." So a band from 1998 showing up on "Newly Active" with a begin year of 1998 is confusing — why are they "new"?

**What's missing:**

- **"New in my taste."** Artists newly added to Mercury that match my taste profile (my top tags). This is the personalized New & Rising that a regular user actually wants.
- **"Recently added" feed overall.** As Mercury grows, what got added to the database this week? This month? A changelog of database additions would be genuinely interesting to follow.

---

## 12. Crate Digging — Serendipitous Discovery

Filters (tag, decade, country) + "Dig" button + 20 random artists. Tauri only.

This is one of the most interesting features and one of the least developed.

**What works:** The concept is perfect. Digging through crates is exactly the metaphor. Random within filters is the right randomization model.

**What makes no sense:**

- **The "Dig" button is required** even with no filters. If I want to see 20 random artists with no criteria, I still have to click "Dig." There's no auto-load on page open. You land on an empty page. Nothing happens until you click. At minimum, auto-dig on page load with empty filters.
- **Country is a 2-char code input** — "US", "GB". A user shouldn't need to know ISO country codes. This should be a dropdown or a searchable field with country names.
- **You dig, you get 20 artists, you dig again, you get 20 different ones.** But there's no "previous dig" or "history of digs." You found something great in the last dig and clicked away — it's gone. No way to go back. At minimum, show the last 3 digs as collapsed history.
- **Results are 20 artists in a grid.** Same ArtistCard as everywhere else. No "tell me something interesting about this artist" one-liner. No "why is this interesting" context. Just the card. Crate digging is tactile and narrative — the find needs a story. "Formed in Lagos in 1974, tagged with afrobeat and highlife, never toured outside Nigeria" is a find. Just seeing the name and tags isn't.

**What's missing:**

- **"Dig in my blind spots."** Show me artists in my taste tags that I've never visited or saved. The system knows what I've seen (visit tracking exists silently). Use it.
- **"Flip the genre."** A button that keeps my decade/country filters but randomizes the genre tag. For when you want to stay in an era but hear something completely different.
- **Share a find.** When you find something great in crate digging, you want to share it. "I just dug this up: [artist]" — one-click Mastodon share for crate discoveries.

---

## 13. Explore — Natural Language Discovery

"Find me something like Boards of Canada but darker" → AI returns artist suggestions matched against the local DB. Tauri + AI enabled only.

This is the most powerful feature in the app and the most hidden. Most users will never find it or enable it.

**What makes no sense:**

- **"Explore" is in the nav as a separate item** but it requires AI to be enabled in Settings. Without AI, clicking Explore shows "Enable AI features in Settings to explore music with natural language." This is a dead nav item for most users. Either surface it as a settings prompt on the Explore page better, or integrate the AI opt-in into the Explore page itself rather than requiring a detour to Settings.
- **Refinement limit is 5.** After 5 refinements, "Start a new search." But a conversation about music can go much longer than 5 turns. Why 5? The conversation history is displayed (prior queries shown as pills) but the 5-turn limit hard-stops the session. At minimum, let the user continue with a new query that's informed by the previous context.
- **"Your taste leans toward {top 3 tags}"** — the taste hint at the top. This is the only place in the app where the user's taste profile is reflected back to them in prose. It's buried in the Explore page. This insight deserves a bigger stage.
- **Error: "Could not parse recommendations. Try rephrasing."** — the error message puts responsibility on the user. The AI failed to return a parseable response. This should be transparent: "AI response was incomplete — try again" not "try rephrasing" which implies user error.

**What's missing:**

- **Save a conversation.** The conversation history exists during the session. After navigating away, it's gone. A saved exploration session — "My search for dark ambient recommendations" — would let users build a research trail.
- **"What connects these two artists?"** A specific AI mode: input two artists, get an explanation of their relationship, shared influences, historical context. Pure nerd bait.
- **No Explore without AI.** If AI is disabled, there's no fallback. A tag-based "More like this" feature based on tag overlap alone (no AI required) would work for users who don't want AI.

---

## 14. Library — Local Music Files

The local file library is a good feature for desktop music players. But it creates an identity question for Mercury.

**What makes no sense:**

- The Library page shows local files (artist, album, title, duration) and can sort them. But there's no connection between the local library and the discovery index. If I have Grouper's "Dragging a Dead Deer Up a Hill" in my local library, I should be able to click Grouper and go to her artist page in the discovery index. Are local library artists connected to MusicBrainz artists? If so, this isn't surfaced. If not, it's a missed opportunity.
- **"Your Library" section on the Search page** shows local library results above discovery results. A track from a local file appears as: title, artist, album, duration. Clicking it plays it. But clicking the artist name — does it go to the artist's Mercury page? Or is it just text? This is unclear without testing.
- The library is scanned by folder, reads metadata from files. But what about albums with bad metadata? What about files where the artist tag is "Unknown Artist"? There's no metadata editor, no MusicBrainz lookup-and-fix for local files.

---

## 15. Profile & Collections — The Personal Layer

The profile page has: avatar, handle, Nostr, taste fingerprint, export, shelves.

**What makes no sense:**

- **Handle is "local only — no account needed."** But then there's Nostr integration that publishes taste. So the handle *does* have an external presence through Nostr. These two statements contradict each other. "Local only" creates a false sense of privacy if data is being published to Nostr.
- **Shelves can hold artists and releases, but there's no distinction visible.** A shelf named "Want to Hear" might have 10 artists and 5 albums. In the CollectionShelf display, are they shown together? How are they differentiated? A shelf is either an artist list or a release list, not both — or if it's both, the UI doesn't make that clear.
- **No way to reorder items within a shelf.** If I'm building "My Top 50 Albums" I want them in a specific order. There's no drag-to-reorder.
- **No notes per item.** Saving an artist to a shelf is a binary — in or out. A collector wants to add a note: "Heard live in 2019, transcendent." No annotation support.
- **TasteFingerprint** is described as "a unique constellation of your musical taste." What does it actually visualize? The code mentions it exists but I can't tell if it's a text summary, a chart, a visual pattern, or something else. If it's visual and beautiful, it should be on the home page. If it's sparse, it needs more data.
- **Export Play History** button — exports to what format? For what purpose? No explanation visible to the user.

**What's missing:**

- **Public shelves.** Share a shelf with a link. "My essential post-punk albums" → shareable URL. The embed system exists for artists; shelves deserve the same.
- **Collaborative shelves.** Two people building a list together. This requires the Nostr layer — the infrastructure is partially there.
- **"Smart shelves" / saved filters.** A shelf that auto-populates: "All artists I've saved in the last 30 days" or "All ambient albums in my collection."
- **Shelf statistics.** "Your 'Essential Listens' shelf: 47 artists, spanning 1968–2019, heaviest on UK and Germany." This is the kind of data that tells you something about yourself.

---

## 16. Settings — Configuration

The settings page is comprehensive: theme, layout, streaming preference, identity, import listening history (Spotify, Last.fm, Apple Music, CSV), data export, AI, taste editor, listening history, Nostr/Fediverse.

**What makes no sense:**

- **Streaming preference** affects the sort order of "Listen On" links on the artist page. But it only affects the *order* — all platforms are still shown. Setting a preference doesn't hide platforms you don't use. A Bandcamp-only person still sees Spotify, YouTube, etc. in their Listen On bar, just in a different order. The preference should optionally *hide* non-preferred platforms.
- **All import credentials (Spotify Client ID, Last.fm API key, Apple Developer Token) are "session-only — never persisted."** But these can take time to set up. Entering your Spotify Client ID every session is friction. If the concern is security, at minimum store them in Tauri's secure storage (which exists). The note "never persisted" reads as a feature but it's actually a UX burden.
- **The Settings page is one long scroll with no section anchors.** It has 8+ distinct sections. Navigation within Settings doesn't exist. If I need to get to the AI section, I scroll past Appearance, Layout, Streaming, Identity, Import — all to get to AI. An in-page anchor nav or tabbed settings would help.
- **"Built-in template cards" for layouts** — Cockpit, Duo, Solo — are shown in Settings. But the ControlBar (panel switcher) is always visible in the Tauri header. The settings and the header controls do the same thing. Layout switching should live in one place.

**What's missing:**

- **Keyboard shortcuts documentation.** Power users want keyboard shortcuts. Even a simple list in Settings would help.
- **Database status / stats.** "Your index contains X artists, Y releases, last updated Z." A user should be able to see the state of their database. Right now this info is implied (the Home page checks DB exists) but never shown explicitly.
- **Update notifications.** Is Mercury auto-updating? Manually updating? No mechanism for this is visible anywhere.

---

## 17. Navigation & Information Architecture

The main nav has 11 items (Tauri): Discover, Style Map, Scenes, Knowledge Base, Time Machine, Dig, Library, Explore, Profile, Settings, About. Plus Chat button and AI status dot.

**What makes no sense:**

- **11 items is too many.** Music apps typically organize around 4-5 core modes. The current navigation is flat — everything at the same level of importance. Discover, Explore, and Dig are all discovery tools but they're separated in the nav. KB, Style Map, and Scenes are all about genre/community mapping but they're separated.
- **"Dig" is the nav label for Crate Digging.** This is good — concise. But its position in the nav (after Library, before Explore) is odd. Dig, Explore, and Discover are the three discovery modes. They should be adjacent.
- **Chat** is a persistent button with an unread badge. But what is Chat? The explanation isn't obvious. Is it a global Nostr chat? Scene-specific rooms? DMs? The nav item provides no context. A first-time user sees a chat button, opens it, and... finds rooms? DMs? It needs a label or tooltip.
- **The AI status dot** (pulsing while loading, green when ready, red on error) in the nav is a good real-time indicator. But it's just a dot. On error, the dot turns red — but there's no way to click it to see what the error is. A click should open a status panel or navigate to AI Settings.
- **No breadcrumbs.** You're on `/kb/genre/post-punk` — how did you get there? Was it from the genre graph? From a tag on an artist page? From the KB landing page? There's a back button (browser) but no contextual path. Deep in a genre rabbit hole, orientation is lost.
- **The back button** (shown when not on home page) is a browser-level back. It works, but it's styled as part of the app header, suggesting it's smarter than it is. If you navigate: Home → Artist → release → back → Artist → another release → back, you're navigating browser history. This works but can surprise users.

---

## 18. Cross-Cutting Observations

### Things that work really well

1. **The tag system.** Atomic tags that link everywhere — from an artist to KB, from KB to Discover, from Discover to a scene room — is a sound foundation. It's genuinely different from how other apps organize music.

2. **The "Listen On" bar with streaming preference.** Respecting the user's platform choice while showing all options is the right approach. No platform exclusivity.

3. **The embed system.** Artist embed cards with iframe/script modes, QR codes, curator attribution. This is polished and well thought out. An artist finding their Mercury embed on a music blog and seeing "Discovered by @blogname" creates a real feedback loop.

4. **Visit tracking (silent).** Recording artist visits silently, with no UI, for taste-aware features is exactly right. Track quietly, use the data, never make users manage it.

5. **The uniqueness score.** Rewarding niche is the core thesis. Surfacing it as a visible badge on artist pages is a good materialization of the concept.

6. **AI as fallback, not primary.** Wikipedia bio first, AI second, community CTA third. This hierarchy is correct. AI doesn't replace human knowledge; it fills gaps.

### Things that don't cohere

1. **The discovery tools are islands.** Discover, Crate Dig, Explore, Time Machine, Style Map, Scenes, KB — these are seven different ways to find music that barely talk to each other. A user shouldn't have to know about all of them to benefit from them. They should feel like modes of one discovery system, not separate apps.

2. **Tauri vs. Web splits are confusing.** Several features are Tauri-only: Library, Crate Dig, Explore, Scenes, Profile, Settings. The web version has roughly half the nav. This is a deliberate choice, but the handling is inconsistent — sometimes you see a "desktop only" message, sometimes the nav item just isn't there. The web version needs clearer identity as a read-only discovery layer, not a broken desktop app.

3. **The social/community layer is fragmented.** Nostr DMs (chat), scene rooms (listening parties), curator system (who discovered artists), Mastodon share, Fediverse settings — all exist but don't form a coherent social experience. Who are the people in this ecosystem? How do I find them? How do I interact with them? Right now it's infrastructure without community.

4. **No "now playing" in the navigation.** The Player component shows when something is playing, but only in the Tauri panel. There's no global "currently playing" indicator that persists across navigation. If I navigate from an artist page (where I started playback) to the Library page, does the playback continue? Is there any indication?

5. **The import system in Settings is powerful but opaque.** Spotify, Last.fm, Apple Music, CSV imports — great. But what happens after import? The status says "Matched X/Y artists..." — those matched artists go into a collection called "Imported from {Platform}". But are they added to shelves? Does this affect the taste profile? Does it affect New & Rising? Does it affect what the AI knows about me? The downstream effects of imports are invisible.

---

## 19. What I Wish Was There

These are features that don't exist yet but that a music nerd would instinctively reach for:

1. **Label pages.** ECM Records, Sub Pop, Warp, Dischord, 4AD — labels have identities as strong as genres. A music nerd navigates by label constantly. "Show me all the artists on this label" is a basic request Mercury can't answer. MusicBrainz has label data.

2. **"How these two artists connect."** Input: Throbbing Gristle + Nine Inch Nails. Output: "Throbbing Gristle is considered a primary influence on NIN; both share industrial, noise, and post-punk tags; Trent Reznor has cited them in interviews." Pure AI task, zero infrastructure cost, extremely high value.

3. **A "deep cut" mode for artist discography.** "Show me the most obscure thing they ever made" — lowest availability, fewest tags, least-known releases. The collector's holy grail.

4. **Pressing/edition data from Discogs.** The pipeline already mentions Discogs. But Discogs data on pressing variants, original vs reissue, condition grades, matrix numbers — this is what serious collectors need. Even a basic "view on Discogs" link on release pages would be massive.

5. **"Today in music history."** On any given date — what major albums were released? What artists were formed or died? This is pure Wikipedia/MusicBrainz territory and would make the home page dynamic every day.

6. **A personal "music map" — geographic visualization of your taste.** Heat map of the world showing where your saved/listened artists come from. "Your taste is 40% UK, 22% US, 15% Japan." Beautiful and informative.

7. **Track-level search and linking.** Right now everything is artist-level. You can't search for a specific song, you can't link to a specific track, you can't add a specific track to a shelf. For a music nerd who cares about individual recordings (this specific live version, this b-side, this remix), the track level matters.

8. **A "what should I listen to right now" mode.** Mood-based, time-based, randomized. Not filtered by genre — filtered by energy, tempo, season, time of day. "Something for 2am" or "Something for a long drive." AI-powered or even just tag-based heuristics.

9. **Wikipedia direct links on artist and genre pages.** The app pulls Wikipedia bios (as summaries) but doesn't link back to the full article. A music nerd always wants the full article. One "Full Wikipedia article →" link would suffice.

10. **"Artists I should know but haven't heard."** Cross-reference my taste profile with critically acclaimed or historically significant artists in my genres that I haven't visited or saved. The gap list. What am I missing?

---

## 20. The Queue Gap — Confirmed by User Testing

**You cannot add tracks to the playback queue.**

This is a fundamental gap that Steve discovered through actual use. Here's the full picture of what's broken:

The app has a Player component (Tauri only) that plays audio. The Library page lets you scan local folders and see tracks. The release page shows a tracklist. The artist page has an inline player (embedded YouTube/SoundCloud iframe) that loads when you click a release card. But **none of these surfaces let you queue tracks.**

Specifically:
- On a release page, you see the tracklist. There's no "Add to queue" button on any track row. No "Queue this album" button. You can read the tracklist but not act on it.
- On the artist page, clicking a release card loads an inline iframe player (YouTube/SoundCloud). There's no queue — you can play exactly one thing at a time and clicking another replaces it.
- In the local Library, clicking a track plays it (presumably). But there's no queue management — no "play next", no "add to queue", no "queue this album". You can't build a listening session.
- There is a Player component in the Tauri shell. It exists. But there's no path from "I found a track I want to hear" to "it's in my queue."

**The queue is infrastructure without an interface.** The Player exists but the bridges into it — from release tracklist, from discovery, from library browsing — are missing.

**What this needs:**
- Track rows everywhere (Library, release tracklist, search results) need: "▶ Play now" and "+ Add to queue" actions
- Release pages need "▶ Play album" and "⊕ Queue album" buttons in the header
- Artist pages need "▶ Play discography" (shuffled or chronological)
- A persistent queue panel (accessible from the player or via keyboard shortcut) to see and reorder what's coming next
- Drag-to-reorder within the queue

**Why this matters:** Without a queue, Mercury is a catalogue you can look at but not really listen to. Every track interaction is one-shot. A music nerd builds listening sessions — a queue of things they want to hear in sequence. Without it, discovery doesn't convert into listening.

---

## 21. Priority Ranking

If I had to rank what to fix or add, in order of user impact:

**High impact, relatively low complexity:**
1. **Queue: "Add to queue" on track rows** — Library, release tracklist, search results
2. **Queue: "Play album" / "Queue album" on release pages** — the most obvious missing action
3. Search autocomplete — fundamental UX gap
4. Artist page: band members / lineup from MusicBrainz relationships
5. Artist page: "influenced by" relationships from MusicBrainz
6. Discography: filter by type (album / EP / single / compilation)
7. Discography: sort by date (newest first, oldest first)
8. Credit names on release pages → linked to artist pages
9. "Edit on MusicBrainz" link on artist and release pages
10. Tag list in Discover: show artist count per tag
11. Crate Digging: country dropdown (not freetext code)
12. Crate Digging: auto-dig on page load

**High impact, medium complexity:**
13. Queue panel — view and reorder the current queue
14. Discover: country filter
15. Discover: decade filter (merge with Time Machine logic)
16. Artist page: cover image / portrait
17. New & Rising: "New in my taste" personalized tab
18. Genre pages: timeline of activity (artists formed per decade)
19. Label pages (via MusicBrainz label data)
20. Style Map: multi-node selection → intersection Discover
21. Room discovery: "All active rooms" global view
22. Shelves: item annotation/notes
23. Shelves: public share link

**High impact, high complexity (but worth it):**
24. Track-level search and linking
25. "How these two artists connect" AI mode
26. Pressing/edition data (Discogs integration)
27. Personal music map (geographic taste visualization)
28. Discovery system integration — cross-linking all seven discovery modes into a unified experience

---

## Closing Thought

Mercury has the right bones. The philosophy — discovery through tags, uniqueness rewarded, internet as database, no algorithmic manipulation — is sound and different. The features that exist are more sophisticated than they appear on the surface.

But the experience right now is of a very smart app that doesn't trust the user to be as smart as it is. The nav hides things. The features don't introduce each other. The discovery tools each solve the same problem in a different room and never compare notes.

The artist page is close to great. The tag system is the right foundation. The embed/curator system is ahead of its time. The listening rooms are genuinely novel.

The gap is coherence — the moment when a user feels like they're inside one system that knows where everything is, rather than seven features that happen to share a database.

Fix the artist page first (members, influences, labels, credits). Then connect the discovery tools. Then worry about the social layer.

A music nerd who finds Mercury should feel like they've found their people. Right now they find a very promising tool that makes them want to come back — which is the right first step.

---

*Audit completed: 2026-02-24*
*Scope: All 24 routes, all major components, full feature inventory*
