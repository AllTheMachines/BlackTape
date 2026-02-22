/**
 * CSV import — accepts any CSV with an "Artist" or "Artist Name" column.
 *
 * Compatible with: Last.fm export CSV, Mercury export JSON (handled separately),
 * and generic CSVs from other sources.
 *
 * Uses native string processing — no library needed for this format.
 * Handles basic quoted fields (removes wrapping quotes, does not handle embedded quotes).
 */

export function parseCsvArtists(csvText: string): string[] {
	const lines = csvText.trim().split(/\r?\n/);
	if (lines.length < 2) throw new Error('CSV has no data rows');

	const headers = lines[0]
		.split(',')
		.map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
	const artistCol = headers.findIndex(
		(h) => h === 'artist' || h === 'artist name' || h === 'artistname'
	);
	if (artistCol === -1)
		throw new Error(
			'No "Artist" column found in CSV. Expected column header: Artist or Artist Name'
		);

	const names = new Set<string>();
	for (const line of lines.slice(1)) {
		if (!line.trim()) continue;
		const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
		const name = cols[artistCol]?.trim();
		if (name) names.add(name);
	}

	return [...names];
}

/**
 * Read a File object as text. Use in component: `<input type="file" accept=".csv">`.
 */
export function readFileAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsText(file);
	});
}
