/**
 * Generate a URL-safe slug from an artist name.
 *
 * Lowercases, strips diacritics via NFD normalization,
 * replaces non-alphanumeric runs with hyphens, and trims edges.
 */
export function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // strip diacritics
		.replace(/[^a-z0-9]+/g, '-') // non-alphanumeric -> hyphen
		.replace(/^-|-$/g, ''); // trim leading/trailing hyphens
}
