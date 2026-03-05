export interface WikiResult {
	found: boolean;
	title: string;
	extract: string;
	url: string;
	thumbnail?: string;
}

export async function fetchWikipedia(artistName: string): Promise<WikiResult> {
	const candidates = [
		`${artistName} (band)`,
		`${artistName} (musician)`,
		artistName
	];

	for (const title of candidates) {
		const encoded = encodeURIComponent(title);
		try {
			const res = await fetch(
				`https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`
			);
			if (!res.ok) continue;
			const data = await res.json();

			// Skip disambiguation pages or pages with no extract
			if (data.type === 'disambiguation') continue;
			if (!data.extract) continue;

			return {
				found: true,
				title: data.title ?? title,
				extract: data.extract,
				url:
					data.content_urls?.desktop?.page ??
					`https://en.wikipedia.org/wiki/${encoded}`,
				thumbnail: data.thumbnail?.source
			};
		} catch {
			continue;
		}
	}

	return { found: false, title: '', extract: '', url: '' };
}
