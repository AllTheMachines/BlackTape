import type { RequestHandler } from './$types';
import { D1Provider } from '$lib/db/d1-provider';
import { json } from '@sveltejs/kit';

/**
 * GET /api/scenes — Returns a snapshot of proto-scenes for web browsing.
 *
 * Since scenes are detected client-side in Tauri (using taste.db), the web
 * path generates proto-scenes from tag co-occurrence data in D1. These are
 * not AI-detected (no taste profile on web) but give users a browsable
 * directory of niche tag combinations that form scene-like clusters.
 */
export const GET: RequestHandler = async ({ platform }) => {
	if (!platform?.env?.DB) {
		return json({ scenes: [] });
	}

	const db = new D1Provider(platform.env.DB);

	// Generate proto-scenes from top niche tag pairs.
	// Niche filter: < 200 artists per tag (excludes mainstream genres).
	// Minimum signal: at least 5 artists shared between both tags.
	let pairs: Array<{ tag_a: string; tag_b: string; shared_artists: number }> = [];
	try {
		pairs = await db.all<{ tag_a: string; tag_b: string; shared_artists: number }>(
			`SELECT tc.tag_a, tc.tag_b, tc.shared_artists
			 FROM tag_cooccurrence tc
			 JOIN tag_stats ts_a ON ts_a.tag = tc.tag_a
			 JOIN tag_stats ts_b ON ts_b.tag = tc.tag_b
			 WHERE ts_a.artist_count < 200
			   AND ts_b.artist_count < 200
			   AND tc.shared_artists >= 5
			 ORDER BY tc.shared_artists DESC
			 LIMIT 20`
		);
	} catch {
		// tag_cooccurrence may not exist on all DB versions — return empty gracefully
		return json({ scenes: [] });
	}

	// Map each pair to a minimal scene-like object for display
	const scenes = pairs.map((p) => ({
		slug: p.tag_a,
		name: p.tag_a
			.split('-')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' '),
		tags: [p.tag_a, p.tag_b],
		artistMbids: [] as string[],
		listenerCount: 0,
		isEmerging: false,
		detectedAt: 0
	}));

	return json({ scenes });
};
