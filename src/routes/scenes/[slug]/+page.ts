import type { PageLoad } from './$types';
import type { DetectedScene, SceneArtist } from '$lib/scenes';

export const load: PageLoad = async ({ params }) => {
	const { scenesState, loadScenes } = await import('$lib/scenes');

	if (!scenesState.isLoaded) {
		await loadScenes();
	}

	const scene: DetectedScene | null = scenesState.scenes.find(s => s.slug === params.slug) ?? null;
	if (!scene) {
		return { scene: null, artists: [], topTracks: [] };
	}

	const { getProvider } = await import('$lib/db/provider');
	const db = await getProvider();
	const artists: SceneArtist[] = [];

	for (const mbid of scene.artistMbids.slice(0, 20)) {
		try {
			const a = await db.get<{ mbid: string; name: string; slug: string; country: string | null; tags: string | null }>(
				'SELECT mbid, name, slug, country, (SELECT GROUP_CONCAT(tag, ", ") FROM artist_tags WHERE artist_id = a.id LIMIT 5) as tags FROM artists a WHERE mbid = ?',
				mbid
			);
			if (a) artists.push({ ...a, isSuggested: false });
		} catch { /* skip missing artists gracefully */ }
	}

	const topTracks: Array<{ title: string; artistName: string; artistSlug: string; mbid: string }> = [];
	const artistsForTracks = artists.slice(0, 5);
	for (const artist of artistsForTracks) {
		try {
			const tracks = await db.all<{ title: string; mbid: string }>(
				`SELECT r.title, r.mbid
				 FROM recordings r
				 JOIN artists a ON a.id = r.artist_id
				 WHERE a.mbid = ?
				 ORDER BY r.id ASC
				 LIMIT 2`,
				artist.mbid
			);
			for (const t of tracks) {
				topTracks.push({ title: t.title, mbid: t.mbid, artistName: artist.name, artistSlug: artist.slug });
			}
		} catch { /* recordings table may not exist — skip gracefully */ }
	}

	return { scene, artists, topTracks };
};
