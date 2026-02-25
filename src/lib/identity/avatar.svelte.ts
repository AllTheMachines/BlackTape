/**
 * Avatar module — generative pixel-art avatar system.
 *
 * Three modes: generative (DiceBear from taste seed), edited (user pixel art),
 * preset (bundled pixel art). Mode stored in user_identity table under 'avatar_mode'.
 *
 * Same seed derivation pattern as palette.ts tasteTagsToHue().
 */
import { createAvatar } from '@dicebear/core';
import * as pixelArt from '@dicebear/pixel-art';
import type { TasteTag } from '$lib/taste/profile.svelte';

export type AvatarMode = 'generative' | 'edited' | 'preset';

export const GRID_SIZE = 16;
export const EMPTY_PIXELS = Array(GRID_SIZE * GRID_SIZE).fill('transparent');

export const avatarState = $state({
	mode: 'generative' as AvatarMode,
	svgString: '', // Current rendered SVG (generative or preset)
	editedPixels: [] as string[], // 256-element color array for edited mode
	isLoaded: false
});

/** Derive a seed string from top-5 taste tags (alphabetically sorted by tag name). */
export function tasteTagsToAvatarSeed(tags: TasteTag[]): string {
	const top5 = tags
		.filter((t) => t.weight > 0)
		.sort((a, b) => b.weight - a.weight)
		.slice(0, 5)
		.sort((a, b) => a.tag.localeCompare(b.tag))
		.map((t) => t.tag)
		.join('|');
	return top5 || 'mercury-default';
}

/** Generate a DiceBear pixel-art SVG from a seed string. Returns SVG markup string. */
export function generateAvatarSvg(seed: string): string {
	const avatar = createAvatar(pixelArt, {
		seed,
		size: 128
	});
	return avatar.toString();
}

/** Load avatar state from taste.db (mode + pixels if edited). */
export async function loadAvatarState(tags: TasteTag[]): Promise<void> {
	try {
		const { invoke } = await import('@tauri-apps/api/core');

		const mode = ((await invoke<string | null>('get_identity_value', {
			key: 'avatar_mode'
		})) as AvatarMode) ?? 'generative';
		avatarState.mode = mode;

		if (mode === 'edited') {
			const pixelData = await invoke<string | null>('get_identity_value', { key: 'avatar_data' });
			avatarState.editedPixels = pixelData ? JSON.parse(pixelData) : [...EMPTY_PIXELS];
		} else {
			// Generative: build SVG from taste seed
			const seed = tasteTagsToAvatarSeed(tags);
			avatarState.svgString = generateAvatarSvg(seed);
			avatarState.editedPixels = [...EMPTY_PIXELS];
		}
	} catch {
		// Web fallback: generate from empty seed
		avatarState.svgString = generateAvatarSvg('mercury-default');
		avatarState.editedPixels = [...EMPTY_PIXELS];
	} finally {
		avatarState.isLoaded = true;
	}
}

/** Persist the current avatar mode and data to taste.db. */
export async function saveAvatarMode(mode: AvatarMode, pixels?: string[]): Promise<void> {
	try {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('set_identity_value', { key: 'avatar_mode', value: mode });
		if (mode === 'edited' && pixels) {
			await invoke('set_identity_value', { key: 'avatar_data', value: JSON.stringify(pixels) });
			avatarState.editedPixels = pixels;
		}
		avatarState.mode = mode;
	} catch {
		// No-op on web
	}
}
