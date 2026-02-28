export interface HelpSection {
	heading: string;
	body: string;
}

export interface HelpPage {
	title: string;
	intro: string;
	sections: HelpSection[];
	related?: { label: string; topic: string }[];
}

export const HELP_CONTENT: Record<string, HelpPage> = {
	search: {
		title: 'Search',
		intro: 'Search is the fastest way into the database. Type an artist name, a genre, a city, or a record label — BlackTape understands the intent behind your query.',
		sections: [
			{
				heading: 'Autocomplete',
				body: 'As you type, artist name suggestions appear. Press ↓ to move through them, Enter to navigate, Escape to dismiss. Suggestions are ranked by uniqueness — obscure exact matches surface before generic popular ones.'
			},
			{
				heading: 'Intent search',
				body: 'Queries that look like locations ("Berlin", "Tokyo"), labels ("Sub Pop", "Warp Records"), or tag phrases ("harsh noise wall", "bedroom pop") are routed to the right finder automatically. The result page shows a chip explaining which intent was detected.'
			},
			{
				heading: 'Song title search',
				body: 'Search for a song name to find the artists who recorded it. Results show the recording alongside the artist, so you can jump to the artist page to explore their full catalogue.'
			},
			{
				heading: 'Tag intersection',
				body: 'From any search result, click an artist\'s tag chips to open Discover pre-filtered to that tag. Combine multiple tags in Discover to drill deeper — the more tags you intersect, the more specific the results.'
			}
		],
		related: [
			{ label: 'Discover', topic: 'discover' },
			{ label: 'Artist Page', topic: 'artist-page' }
		]
	},

	discover: {
		title: 'Discover',
		intro: 'Discover is the tag-based exploration engine. Filter by genre, era, country, or any combination. Niche artists surface first — the uniqueness score rewards depth over popularity.',
		sections: [
			{
				heading: 'Filters',
				body: 'Use the left sidebar to add tags (up to 5). Add tags in the tag input and press Enter. Each tag narrows the result set — "ambient + Berlin + 1990s" returns only artists matching all three. Remove tags one at a time or clear all.'
			},
			{
				heading: 'Era filter',
				body: 'Select a decade to restrict results to artists active in that period. Works alongside tag filters — "post-punk + 1980s" surfaces the canonical underground instead of modern revival acts.'
			},
			{
				heading: 'Country filter',
				body: 'Filter by country of origin. Useful for exploring regional scenes — "experimental + Japan", "black metal + Norway", "tropicália + Brazil".'
			},
			{
				heading: 'Uniqueness score',
				body: 'Each result shows a score bar. High = niche relative to the database. Low = well-tagged with many cross-genre connections. Results are sorted to put the most niche artists first — BlackTape\'s core premise: the less well-known, the more discoverable you become.'
			},
			{
				heading: 'Cross-links',
				body: 'From Discover results you can jump to Style Map (to see how a genre connects), Time Machine (to explore an era), and artist pages (to dive in).'
			}
		],
		related: [
			{ label: 'Style Map', topic: 'style-map' },
			{ label: 'Time Machine', topic: 'time-machine' },
			{ label: 'Crate Dig', topic: 'crate-dig' }
		]
	},

	'style-map': {
		title: 'Style Map',
		intro: 'The Style Map is a force-directed graph of genre relationships. Node size = number of tagged artists. Edge weight = how often two genres appear together. Use it to navigate genre space visually.',
		sections: [
			{
				heading: 'Navigation',
				body: 'Scroll to zoom (0.15× to 8×). Click and drag on empty space to pan. The graph initialises at a comfortable scale — zoom in to see smaller nodes more clearly.'
			},
			{
				heading: 'Selecting genres',
				body: 'Click a node to select it (highlighted in amber). Click additional nodes to build a multi-genre selection. Selected genres appear in the panel on the right.'
			},
			{
				heading: 'Finding artists',
				body: 'With one or more genres selected, click "Find artists →" to run a Discover search filtered to that exact tag combination. This is the fastest path from genre exploration to actual artists.'
			},
			{
				heading: 'Reading edges',
				body: 'Thicker edges mean two genres co-occur more often across artists. Thin or absent edges mean genres rarely overlap — useful for finding genuinely distinct sounds vs. derivative ones.'
			}
		],
		related: [
			{ label: 'Discover', topic: 'discover' },
			{ label: 'Knowledge Base', topic: 'knowledge-base' }
		]
	},

	'knowledge-base': {
		title: 'Knowledge Base',
		intro: 'The Knowledge Base maps every genre, movement, and scene in the database. Each genre page shows its type, a colour-coded badge, key artists, and a mini genre graph of connected styles.',
		sections: [
			{
				heading: 'Genre types',
				body: 'Genres are typed: genre (musical style), scene (community around a sound), movement (time-bound cultural shift), mood (emotional quality). The coloured pill on each page shows which type it is.'
			},
			{
				heading: 'Key artists',
				body: 'The key artists section shows the most niche artists tagged with this genre — not the most popular. This is intentional: if you already know the headliners, these are the artists you haven\'t found yet.'
			},
			{
				heading: 'Genre graph',
				body: 'The inline genre graph shows what this style connects to. Click any connected genre to navigate to it. Explore branching paths to map your own taste trajectory.'
			},
			{
				heading: 'Browsing the index',
				body: 'The KB index lists all genres alphabetically. Use your browser\'s find (Ctrl/Cmd+F) to jump to a specific style. Every entry links to its detail page.'
			}
		],
		related: [
			{ label: 'Style Map', topic: 'style-map' },
			{ label: 'Discover', topic: 'discover' }
		]
	},

	'artist-page': {
		title: 'Artist Page',
		intro: 'The artist page is the full picture of an artist: relationships, discography, credits, streaming links, and tools to embed or share. Data comes from MusicBrainz, fetched live.',
		sections: [
			{
				heading: 'Tabs',
				body: 'Artists with MusicBrainz relationship data show an About tab alongside the Releases and Stats tabs. The About tab shows band members, collaborators, influenced-by chains, associated labels, and other relationships. Artists without relationship data show only Releases and Stats.'
			},
			{
				heading: 'Discography filters',
				body: 'Filter releases by type (Album, EP, Single, Live, Compilation, Other) using the pill filters above the discography. Sort by newest or oldest. Filters stack — "EPs, oldest first" gives you a clean chronological EP list.'
			},
			{
				heading: 'Streaming links',
				body: 'Links are grouped by category: streaming, purchase, social, press. The first link in the list is the artist\'s official site. Links known to resolve to dead domains are filtered out automatically.'
			},
			{
				heading: 'Uniqueness score',
				body: 'The score in the stats panel measures how niche this artist is relative to the full database. Score above 80 = genuinely underground. Score below 40 = heavily cross-tagged with mainstream genres.'
			},
			{
				heading: 'Sharing',
				body: 'Share to Mastodon, Bluesky, or X/Twitter via the share buttons. The Mastodon button opens a pre-filled toot, the others open the platform\'s share URL.'
			},
			{
				heading: 'Export',
				body: 'The "Export site" tool generates a self-contained HTML page for the artist — useful for archiving or sharing outside the app.'
			}
		],
		related: [
			{ label: 'Release Page', topic: 'release-page' },
			{ label: 'Discover', topic: 'discover' }
		]
	},

	'release-page': {
		title: 'Release Page',
		intro: 'The release page shows full liner notes, track listing, credits, and embedded players. Data comes from the MusicBrainz API, fetched live at load time.',
		sections: [
			{
				heading: 'Tracks',
				body: 'Each track row shows title and duration. Use the ▶ button to play in the queue, or + to add to the current queue without playing immediately. The "Play album" button enqueues all tracks and starts from the first.'
			},
			{
				heading: 'Credits',
				body: 'The credits section shows producers, engineers, and other credited contributors. Expand with "Show all credits →". Producer and engineer names link to their own artist pages if they\'re in the database — follow the chain.'
			},
			{
				heading: 'Embedded players',
				body: 'If a streaming or purchase link is available, the player bar at the bottom of the page embeds it. Supported sources: Bandcamp, Spotify, SoundCloud, YouTube. The embed reflects your streaming preference set in Settings.'
			}
		],
		related: [
			{ label: 'Player', topic: 'player' },
			{ label: 'Artist Page', topic: 'artist-page' }
		]
	},

	'crate-dig': {
		title: 'Crate Dig',
		intro: 'Crate Dig is structured serendipity. Set parameters — genre, country, era — and get a random artist that matches. Like flipping through crates at a record shop, but filtered to what you\'re actually looking for.',
		sections: [
			{
				heading: 'How it works',
				body: 'Each "Dig" runs a weighted random query against the database. The parameters you set act as hard filters — the randomness happens inside that space. Narrower parameters = more surprising results within your comfort zone. No parameters = anything in the entire database.'
			},
			{
				heading: 'Country',
				body: 'Select from the country dropdown to restrict to artists from a specific country. Leave blank to search globally. Pairs well with genre — "experimental + Japan" surfaces a deep cut from a rich scene.'
			},
			{
				heading: 'Genre / tags',
				body: 'Type a genre or tag in the filter field. Matches against the artist\'s full tag set. Combine with country and era for surgical serendipity.'
			},
			{
				heading: 'Era',
				body: 'Restrict to artists active in a particular decade. "Doom metal + 1990s" gets you the originals, not the contemporary revival.'
			},
			{
				heading: 'Digging again',
				body: 'Each "Dig again" is a new random pull with the same parameters. Keep digging until something catches — the results don\'t repeat until the pool is exhausted.'
			}
		],
		related: [
			{ label: 'Discover', topic: 'discover' },
			{ label: 'Time Machine', topic: 'time-machine' }
		]
	},

	library: {
		title: 'Library',
		intro: 'Library shows music from your local folders. Add a folder in Settings → Library to scan it. The two-pane layout shows your albums on the left and tracks on the right.',
		sections: [
			{
				heading: 'Adding music',
				body: 'Go to Settings → Library and add a folder. BlackTape scans recursively for audio files (FLAC, MP3, OGG, M4A, WAV, OPUS, AAC). New files are picked up on the next scan.'
			},
			{
				heading: 'Browsing',
				body: 'The left pane lists albums (artist + release name). Click an album to load its tracks in the right pane. The selected album is highlighted with an amber left border. Track rows show title, duration, and queue controls.'
			},
			{
				heading: 'Search / filter',
				body: 'Use the search input at the top to filter the album list in real time. Searches across artist name and album name simultaneously.'
			},
			{
				heading: 'Queue integration',
				body: 'Each track row has a ▶ button (play now) and a + button (add to queue). The entire album can be enqueued from the "Play album" button at the top of the track pane.'
			}
		],
		related: [
			{ label: 'Player', topic: 'player' },
			{ label: 'Settings', topic: 'settings' }
		]
	},

	player: {
		title: 'Player & Queue',
		intro: 'The player bar lives at the bottom of the screen. It controls playback for both local files and embedded streams. The queue panel shows what\'s playing next.',
		sections: [
			{
				heading: 'Controls',
				body: 'Play/pause (spacebar also works when no text input is focused), previous, next, shuffle, and a volume slider. The progress bar is clickable — click anywhere on it to seek.'
			},
			{
				heading: 'Queue',
				body: 'Click the queue icon (top-right of player bar) to open the queue panel. The queue shows all upcoming tracks. Drag to reorder. Click × to remove a track. The queue persists across navigation — add tracks from any page and they\'ll still be there.'
			},
			{
				heading: 'Adding to queue',
				body: 'Any track row in the app (search results, release pages, library) has a ▶ button (play now, clears queue) and a + button (add to end of queue). Release pages have a "Play album" button that enqueues the full album.'
			},
			{
				heading: 'Persistence',
				body: 'The queue is saved to local storage. Restart the app and your queue is restored. Playback position is not saved — it resumes from the start of the last track.'
			}
		],
		related: [
			{ label: 'Library', topic: 'library' },
			{ label: 'Release Page', topic: 'release-page' }
		]
	},

	scenes: {
		title: 'Scenes',
		intro: 'Scenes are communities of artists that share a sound, place, or era. BlackTape detects scenes from your library and from tag co-occurrence in the database.',
		sections: [
			{
				heading: 'Scene detection',
				body: 'When you add music to your library, BlackTape scans for scene membership — artists that cluster around a shared set of tags. Scene strength is the percentage of the scene\'s key artists you already have.'
			},
			{
				heading: 'Scene pages',
				body: 'Each scene page shows the core sound, key artists, and related scenes. Use it as a launchpad — click artists to explore, click related scenes to follow the web.'
			},
			{
				heading: 'Coming: Geographic scene map',
				body: 'A geographic map of scenes by origin city is in development. It will show hotspots of activity by decade — how cities built sounds and how those sounds spread.'
			}
		],
		related: [
			{ label: 'Discover', topic: 'discover' },
			{ label: 'Knowledge Base', topic: 'knowledge-base' }
		]
	},

	'time-machine': {
		title: 'Time Machine',
		intro: 'Time Machine is a decade-by-decade browser. Pick an era and explore the artists who defined it. Filter by genre within the era, sort by uniqueness or activity.',
		sections: [
			{
				heading: 'Browsing eras',
				body: 'Select a decade from the dropdown (1950s through 2020s). Results show artists who were active in that period based on their earliest release date in MusicBrainz.'
			},
			{
				heading: 'Sorting',
				body: 'Sort by uniqueness (most niche first — BlackTape default) or by release count (most prolific first). Both sorts within the same era give very different cuts of history.'
			},
			{
				heading: 'Pagination',
				body: 'Results are paginated. Navigate pages to explore the full roster — deeper pages surface progressively more obscure artists within the era.'
			},
			{
				heading: 'Cross-link to Discover',
				body: 'From Time Machine results, you can jump to Discover with the era pre-set. Combine with genre tags to get "experimental electronic, 1970s" — a completely different slice than browsing without tags.'
			}
		],
		related: [
			{ label: 'Discover', topic: 'discover' },
			{ label: 'Crate Dig', topic: 'crate-dig' }
		]
	},

	'new-rising': {
		title: 'New & Rising',
		intro: 'New & Rising highlights recently added artists — artists that have just entered the database or received significant tag updates. It\'s a live feed of what\'s being indexed.',
		sections: [
			{
				heading: 'What appears here',
				body: 'Artists added to MusicBrainz in the last 90 days, ranked by uniqueness. Not charting trends — database additions. The more niche, the higher it ranks.'
			},
			{
				heading: 'How it\'s different from Discover',
				body: 'Discover is a filter over the full database. New & Rising is a time window over recent additions only. Use it to catch genuinely new artists before they accumulate tags and become "known".'
			}
		],
		related: [
			{ label: 'Discover', topic: 'discover' }
		]
	},

	'listening-rooms': {
		title: 'Listening Rooms',
		intro: 'Listening Rooms are ephemeral shared spaces for listening together in sync. The host controls playback and queue; guests follow along in real time.',
		sections: [
			{
				heading: 'Opening a room',
				body: 'From a scene page, click "Open room" to create a listening room for that scene. Paste a video or stream URL to start synced playback. Share the room link with others.'
			},
			{
				heading: 'Host controls',
				body: 'As host: control playback (play/pause/seek), manage the room queue, and close the room. Guests see your actions reflected immediately.'
			},
			{
				heading: 'Presence',
				body: 'Participants are shown as avatars in the room. Presence heartbeats run on a 30-second interval — avatars fade out when someone leaves.'
			},
			{
				heading: 'Infrastructure',
				body: 'Rooms run on Nostr. No central server holds your session state. The room exists as long as participants are connected and the host hasn\'t closed it.'
			}
		],
		related: [
			{ label: 'Scenes', topic: 'scenes' },
			{ label: 'Profile', topic: 'profile' }
		]
	},

	profile: {
		title: 'Profile & Shelves',
		intro: 'Your profile is your taste identity. It stores your shelves (curated collections), your taste fingerprint (derived from listening history), and your avatar.',
		sections: [
			{
				heading: 'Shelves',
				body: 'Shelves are named collections of artists or releases — like crates on a shelf. Create a shelf from the Profile page, then save artists to it from any artist page. Shelves are stored locally — they\'re yours, not synced to any server.'
			},
			{
				heading: 'Taste fingerprint',
				body: 'The taste fingerprint is a D3 constellation derived from your listening history and saved shelves. Each node is a genre cluster; edges show co-occurrence in your taste. It updates as your listening evolves.'
			},
			{
				heading: 'Avatar',
				body: 'The avatar is generated from your identity seed — a unique visual hash of your profile. Change your handle to get a different visual. Avatars are deterministic: the same handle always produces the same avatar.'
			},
			{
				heading: 'Import',
				body: 'Import your listening history from Spotify, Last.fm, Apple Music, or CSV. The importer maps external data to the local database — artists that match by name get linked to their MusicBrainz entry.'
			},
			{
				heading: 'Export',
				body: 'Export your full profile as a JSON archive: shelves, identity, listening history, and taste settings. Use it to back up or transfer between devices.'
			}
		],
		related: [
			{ label: 'Settings', topic: 'settings' }
		]
	},

	settings: {
		title: 'Settings',
		intro: 'Settings controls appearance, AI, streaming preferences, library folders, layout templates, and your Fediverse identity. All settings are stored locally.',
		sections: [
			{
				heading: 'Appearance',
				body: 'Choose between taste-driven theming (colours derived from your most-listened genres) and manual palette selection. Adjust border radius and toggle dark/light mode.'
			},
			{
				heading: 'Layout',
				body: 'Choose a layout template: Discovery (three-pane), Cockpit (sidebar + main + context), Zen (minimal), or create a custom template. Layout preference is saved per-device.'
			},
			{
				heading: 'AI',
				body: 'Configure an AI provider for artist summaries. Supported: OpenAI, Anthropic, local (Ollama). The AI summary appears on artist pages as a one-paragraph synthesis of the artist\'s sound and significance. AI is optional — the app works fully without it.'
			},
			{
				heading: 'Streaming',
				body: 'Set your preferred streaming service for embedded players: Bandcamp, Spotify, SoundCloud, YouTube. Drag to reorder priority — the highest-ranked service with an available embed is used first. Connect Spotify for enhanced playback.'
			},
			{
				heading: 'Library',
				body: 'Add and remove local music folders. Trigger a rescan after adding new music. The scanner reads audio file metadata (FLAC, MP3, OGG, M4A, WAV, OPUS, AAC) and builds the local index.'
			}
		],
		related: [
			{ label: 'Library', topic: 'library' },
			{ label: 'Profile', topic: 'profile' }
		]
	},

	about: {
		title: 'About BlackTape',
		intro: 'BlackTape is a music discovery engine built on the premise that the most interesting music is the least played.',
		sections: [
			{
				heading: 'What it is',
				body: 'A search engine and discovery tool for music, not a streaming platform. BlackTape indexes artists from open databases, embeds players from wherever music already lives, and surfaces underground artists first.'
			},
			{
				heading: 'Data sources',
				body: 'MusicBrainz (2.6M+ artists, CC0 public domain), Discogs, and Wikidata. No proprietary data. No locked-in sources.'
			},
			{
				heading: 'Philosophy',
				body: 'No tracking, no ads, no algorithmic manipulation, no audio hosting. Open source, public good, free forever.'
			}
		],
		related: [
			{ label: 'Search', topic: 'search' },
			{ label: 'Discover', topic: 'discover' }
		]
	}
};
