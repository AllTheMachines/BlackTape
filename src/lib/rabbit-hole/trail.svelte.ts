/**
 * Rabbit Hole history trail store.
 * Tracks visited artists and genre/tag pages during a session.
 * Persisted to localStorage — survives app restart.
 * Cap: 20 items. Branching history: clicking a past item does NOT remove subsequent items.
 */

export type TrailItem =
	| { type: 'artist'; slug: string; name: string }
	| { type: 'tag'; slug: string; name: string };

const TRAIL_KEY = 'mercury:rabbit-hole-trail';
const TRAIL_CAP = 20;

export const trailState = $state({
	items: [] as TrailItem[],
	currentIndex: -1
});

/**
 * Push a new item onto the trail.
 * Enforces cap by dropping the oldest (leftmost) item when over 20.
 * Does NOT deduplicate — visiting the same artist twice creates two trail entries.
 */
export function pushTrailItem(item: TrailItem): void {
	trailState.items = [...trailState.items, item].slice(-TRAIL_CAP);
	trailState.currentIndex = trailState.items.length - 1;
	saveTrail();
}

/**
 * Jump to a prior trail item by index.
 * Items after the clicked index remain in the trail (branching, not linear truncation).
 * Navigate to the item's route separately — this only updates the active index.
 */
export function jumpToTrailIndex(index: number): void {
	if (index < 0 || index >= trailState.items.length) return;
	trailState.currentIndex = index;
	saveTrail();
}

/** Persist trail to localStorage. */
function saveTrail(): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(
			TRAIL_KEY,
			JSON.stringify({
				items: trailState.items,
				currentIndex: trailState.currentIndex
			})
		);
	} catch {
		/* Storage unavailable — fail silently */
	}
}

/**
 * Load trail from localStorage.
 * Call in the Rabbit Hole sub-layout's onMount.
 */
export function loadTrail(): void {
	if (typeof window === 'undefined') return;
	try {
		const raw = localStorage.getItem(TRAIL_KEY);
		if (!raw) return;
		const data = JSON.parse(raw) as { items?: TrailItem[]; currentIndex?: number };
		if (Array.isArray(data.items)) {
			trailState.items = data.items.slice(-TRAIL_CAP);
			trailState.currentIndex =
				typeof data.currentIndex === 'number'
					? data.currentIndex
					: trailState.items.length - 1;
		}
	} catch {
		/* Corrupt storage — fail silently */
	}
}

/** Clear the trail (used if user explicitly resets). */
export function clearTrail(): void {
	trailState.items = [];
	trailState.currentIndex = -1;
	if (typeof window !== 'undefined') {
		try {
			localStorage.removeItem(TRAIL_KEY);
		} catch {
			/* ignore */
		}
	}
}
