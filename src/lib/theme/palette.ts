/**
 * OKLCH Palette Generation
 *
 * Pure functions for converting taste tags to hue values and generating
 * full color palettes in OKLCH color space. No side effects.
 *
 * The same tags always produce the same hue — deterministic by design.
 * Two different people see two different Mercurys.
 */

import type { TasteTag } from '$lib/taste/profile.svelte';

/**
 * Convert taste tags to a deterministic hue (0-360).
 *
 * Algorithm:
 * 1. Filter to tags with weight > 0
 * 2. Sort by weight descending, take top 5
 * 3. Sort alphabetically (same inputs always same order)
 * 4. Join with '|' and hash to 0-360 using djb2-style hash
 */
export function tasteTagsToHue(tags: TasteTag[]): number {
	const eligible = tags
		.filter((t) => t.weight > 0)
		.sort((a, b) => b.weight - a.weight)
		.slice(0, 5)
		.sort((a, b) => a.tag.localeCompare(b.tag));

	if (eligible.length === 0) return 220; // Default hue (blue)

	const key = eligible.map((t) => t.tag).join('|');

	let hash = 5381;
	for (let i = 0; i < key.length; i++) {
		hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
	}

	return ((hash % 360) + 360) % 360;
}

/**
 * CSS custom property names managed by the theme engine.
 * Used by clearPalette() to know which properties to remove.
 */
export const TASTE_PALETTE_KEYS: string[] = [
	'--bg-base',
	'--bg-surface',
	'--bg-elevated',
	'--bg-hover',
	'--border-subtle',
	'--border-default',
	'--border-hover',
	'--link-color',
	'--tag-bg',
	'--tag-text',
	'--tag-border',
	'--progress-color',
	'--player-bg',
	'--player-border',
	'--acc',
	'--acc-bg',
	'--acc-bg-h',
	'--b-acc'
];

/**
 * Generate a full OKLCH palette from a single seed hue.
 *
 * Returns a map of CSS custom property names to OKLCH value strings.
 * Text colors (--text-*) are intentionally excluded — they stay at
 * fixed lightness values for WCAG AA readability regardless of hue.
 */
export function generatePalette(hue: number): Record<string, string> {
	return {
		'--bg-base': `oklch(0.05 0.01 ${hue})`,
		'--bg-surface': `oklch(0.10 0.015 ${hue})`,
		'--bg-elevated': `oklch(0.14 0.02 ${hue})`,
		'--bg-hover': `oklch(0.18 0.025 ${hue})`,
		'--border-subtle': `oklch(0.12 0.015 ${hue})`,
		'--border-default': `oklch(0.17 0.02 ${hue})`,
		'--border-hover': `oklch(0.22 0.025 ${hue})`,
		'--link-color': `oklch(0.72 0.12 ${hue})`,
		'--tag-bg': `oklch(0.13 0.04 ${hue})`,
		'--tag-text': `oklch(0.72 0.12 ${hue})`,
		'--tag-border': `oklch(0.22 0.05 ${hue})`,
		'--progress-color': `oklch(0.72 0.12 ${hue})`,
		'--player-bg': `oklch(0.04 0.01 ${hue})`,
		'--player-border': `oklch(0.10 0.015 ${hue})`,
		/* Accent — the most visible theme color, used throughout the UI */
		'--acc': `oklch(0.72 0.15 ${hue})`,
		'--acc-bg': `oklch(0.72 0.15 ${hue} / 0.1)`,
		'--acc-bg-h': `oklch(0.72 0.15 ${hue} / 0.18)`,
		'--b-acc': `oklch(0.72 0.15 ${hue} / 0.3)`
	};
}
