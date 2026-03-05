import { API_BASE_URL } from '$lib/config';

export interface ArtistCorrection {
	slug: string;
	artistName: string;
	bio?: string;
	foundingYear?: number | null;
	country?: string | null;
	additionalTags?: string[];
	source: 'wikipedia' | 'manual';
	sourceUrl?: string;
	wikiTitle?: string;
	correctedAt: string;
}

export function saveLocalCorrection(c: ArtistCorrection): void {
	try {
		localStorage.setItem(`bt:correction:${c.slug}`, JSON.stringify(c));
	} catch {
		/* Storage unavailable */
	}
}

export function getLocalCorrection(slug: string): ArtistCorrection | null {
	try {
		const raw = localStorage.getItem(`bt:correction:${slug}`);
		if (!raw) return null;
		return JSON.parse(raw) as ArtistCorrection;
	} catch {
		return null;
	}
}

export function clearLocalCorrection(slug: string): void {
	try {
		localStorage.removeItem(`bt:correction:${slug}`);
	} catch {
		/* ignore */
	}
}

export async function submitToServer(c: ArtistCorrection): Promise<void> {
	try {
		await fetch(`${API_BASE_URL}/api/corrections`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(c)
		});
	} catch {
		// fire-and-forget — ignore errors
	}
}
