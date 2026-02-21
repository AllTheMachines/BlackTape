import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data }) => {
	if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) {
		return data;
	}
	if (!data.genre) return data;
	try {
		const { getProvider } = await import('$lib/db/provider');
		const { getGenreBySlug, getGenreKeyArtists, getGenreSubgraph } = await import(
			'$lib/db/queries'
		);
		const db = await getProvider();
		const genre = await getGenreBySlug(db, data.genre.slug);
		if (!genre) return data;
		const [keyArtists, subgraph] = await Promise.all([
			getGenreKeyArtists(db, genre.mb_tag ?? genre.name.toLowerCase()),
			getGenreSubgraph(db, genre.slug)
		]);
		return { ...data, genre, keyArtists, subgraph };
	} catch {
		return data;
	}
};
