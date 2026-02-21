import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { D1Provider } from '$lib/db/d1-provider';
import { getAllGenreGraph } from '$lib/db/queries';

export const GET: RequestHandler = async ({ platform }) => {
	if (!platform?.env?.DB) {
		return json({ nodes: [], edges: [] });
	}
	const db = new D1Provider(platform.env.DB);
	const graph = await getAllGenreGraph(db);
	return json(graph);
};
