/**
 * Page-level pool of successfully-loaded cover image URLs.
 *
 * Components register images on successful load. CoverPlaceholder
 * reads from the pool when it has no direct source — so covers from
 * other cards on the same page feed into orphaned placeholders.
 *
 * Module-level $state means the pool is shared across all components
 * in the current page without prop drilling.
 */

let urls = $state<string[]>([]);

export const coverPool = {
	get urls() { return urls; },

	register(url: string | null | undefined) {
		if (!url) return;
		if (urls.includes(url)) return;
		urls = [url, ...urls].slice(0, 24);
	}
};
