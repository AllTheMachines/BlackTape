/**
 * Theme Engine — Reactive state and DOM application.
 *
 * Manages the taste-based color palette as Svelte 5 reactive state.
 * Applies palette overrides to document.documentElement.style at runtime,
 * using OKLCH values that match the base theme.css defaults.
 *
 * Three modes:
 * - 'taste'  — palette generated from user's top taste tags
 * - 'manual' — palette generated from user-chosen hue (0-360)
 * - 'default' — no overrides; theme.css achromatic defaults apply
 */

import { tasteTagsToHue, generatePalette, TASTE_PALETTE_KEYS } from './palette';
import type { TasteTag } from '$lib/taste/profile.svelte';

export interface ThemeState {
	mode: 'taste' | 'manual' | 'default';
	manualHue: number;
	computedHue: number;
	palette: Record<string, string>;
}

/** Global reactive theme state. */
export const themeState: ThemeState = $state({
	mode: 'default',
	manualHue: 220,
	computedHue: 0,
	palette: {}
});

/**
 * Apply a palette to the document root with a smooth color transition.
 *
 * Adds a CSS transition to :root before applying, then removes it
 * after 600ms to avoid permanent performance overhead from transitions.
 */
export function applyPalette(palette: Record<string, string>): void {
	const root = document.documentElement;

	// Add transition for smooth color fade
	root.style.setProperty('transition', 'background-color 0.5s, border-color 0.5s, color 0.5s');

	// Apply all palette overrides
	for (const [key, value] of Object.entries(palette)) {
		root.style.setProperty(key, value);
	}

	// Remove transition after animation completes to avoid permanent overhead
	setTimeout(() => {
		root.style.removeProperty('transition');
	}, 600);

	// Update reactive state
	themeState.palette = palette;
}

/**
 * Clear all taste-engine-managed CSS custom properties from the document root.
 * Reverts to the static defaults defined in theme.css.
 */
export function clearPalette(): void {
	const root = document.documentElement;

	// Add transition for smooth fade back to defaults
	root.style.setProperty('transition', 'background-color 0.5s, border-color 0.5s, color 0.5s');

	for (const key of TASTE_PALETTE_KEYS) {
		root.style.removeProperty(key);
	}

	setTimeout(() => {
		root.style.removeProperty('transition');
	}, 600);

	themeState.palette = {};
}

/**
 * Initialize the theme engine on app startup.
 *
 * Reads saved mode + hue from preferences and applies the correct palette.
 * Called once from the root layout's onMount after loading taste profile.
 */
export function initTheme(
	tags: TasteTag[],
	savedPrefs: { mode: string; manualHue: string }
): void {
	const mode = (savedPrefs.mode as ThemeState['mode']) || 'default';
	const manualHue = parseInt(savedPrefs.manualHue, 10) || 220;

	themeState.mode = mode;
	themeState.manualHue = manualHue;

	if (mode === 'taste' && tags.length > 0) {
		const hue = tasteTagsToHue(tags);
		themeState.computedHue = hue;
		applyPalette(generatePalette(hue));
	} else if (mode === 'manual') {
		themeState.computedHue = manualHue;
		applyPalette(generatePalette(manualHue));
	} else {
		// 'default' mode — let theme.css achromatic values show
		clearPalette();
	}
}

/**
 * Update the theme when the taste profile changes.
 *
 * Only acts if mode is 'taste' — manual and default modes are unaffected
 * by profile changes. Called from taste profile load/recompute hooks.
 */
export function updateThemeFromTaste(tags: TasteTag[]): void {
	if (themeState.mode !== 'taste') return;
	if (tags.length === 0) return;

	const hue = tasteTagsToHue(tags);
	themeState.computedHue = hue;
	applyPalette(generatePalette(hue));
}
