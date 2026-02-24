import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	try {
		const { getProvider } = await import('$lib/db/provider');
		const { getGenreBySlug, getGenreKeyArtists, getGenreSubgraph } = await import(
			'$lib/db/queries'
		);
		const db = await getProvider();
		const genre = await getGenreBySlug(db, params.slug);
		if (!genre) {
			return { genre: null, keyArtists: [], subgraph: { nodes: [], edges: [] }, wikipediaSummary: null };
		}
		const [keyArtists, subgraph] = await Promise.all([
			getGenreKeyArtists(db, genre.mb_tag ?? genre.name.toLowerCase()),
			getGenreSubgraph(db, genre.slug)
		]);
		return { genre, keyArtists, subgraph, wikipediaSummary: null };
	} catch {
		return { genre: null, keyArtists: [], subgraph: { nodes: [], edges: [] }, wikipediaSummary: null };
	}
};
