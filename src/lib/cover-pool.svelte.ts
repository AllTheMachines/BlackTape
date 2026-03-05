/**
 * Page-level pool of successfully-loaded cover image URLs.
 *
 * Components register images on successful load. CoverPlaceholder
 * reads from the pool when it has no direct source — so covers from
 * other cards on the same page feed into orphaned placeholders.
 */

export const coverPool = $state({
	urls: [] as string[]
});

export function registerCover(url: string | null | undefined) {
	if (!url) return;
	if (coverPool.urls.includes(url)) return;
	coverPool.urls = [url, ...coverPool.urls].slice(0, 24);
}

export function clearCoverPool() {
	coverPool.urls = [];
}
