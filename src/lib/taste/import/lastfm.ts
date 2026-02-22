/**
 * Last.fm import — public API, API key only (no OAuth).
 *
 * Paginates user.getRecentTracks at 200 tracks per page.
 * Aggregates by artist play count, returns top artists sorted by count.
 *
 * NOTE: Cap at 50 pages (10,000 tracks) to avoid extremely long import times.
 * Users with 100k+ scrobbles may want to use the CSV export path instead.
 */

export interface LastFmArtist {
	name: string;
	playCount: number;
}

export async function importFromLastFm(
	username: string,
	apiKey: string,
	onProgress?: (page: number, totalPages: number) => void
): Promise<LastFmArtist[]> {
	let page = 1;
	let totalPages = 1;
	const artistCounts = new Map<string, number>();
	const MAX_PAGES = 50;

	do {
		const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${apiKey}&format=json&limit=200&page=${page}`;
		const res = await fetch(url);
		if (!res.ok) throw new Error(`Last.fm API error: ${res.status}`);
		const data = (await res.json()) as {
			recenttracks: {
				'@attr': { totalPages: string };
				track: Array<{ artist: { '#text': string } }>;
			};
		};

		totalPages = Math.min(parseInt(data.recenttracks['@attr'].totalPages, 10), MAX_PAGES);
		onProgress?.(page, totalPages);

		const tracks = data.recenttracks.track;
		for (const track of tracks) {
			const name = track.artist['#text']?.trim();
			if (name) artistCounts.set(name, (artistCounts.get(name) ?? 0) + 1);
		}

		page++;
		if (page <= totalPages) {
			await new Promise((r) => setTimeout(r, 200)); // rate limit guard
		}
	} while (page <= totalPages);

	return [...artistCounts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 200)
		.map(([name, playCount]) => ({ name, playCount }));
}
