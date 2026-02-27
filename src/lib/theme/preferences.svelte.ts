/**
 * Theme and user preferences — persistence via taste.db ai_settings.
 *
 * All preferences are stored as key-value strings in the ai_settings table
 * using the existing get_all_ai_settings / set_ai_setting Tauri commands.
 * No new Rust commands are needed.
 *
 * Keys used:
 * - theme_mode          — 'taste' | 'manual' | 'default'
 * - theme_manual_hue    — '0'..'360' as string
 * - preferred_platform  — 'bandcamp' | 'spotify' | 'soundcloud' | 'youtube' | ''
 * - layout_template     — 'cockpit' | 'focus' | 'minimal'
 * - user_layout_templates — JSON array of UserTemplateRecord
 */

import type { UserTemplateRecord } from './templates';

/** Reactive streaming platform preference — readable by components without invoking. */
export const streamingPref = $state({ platform: '' as string });

/** Dynamically import Tauri invoke to avoid breaking web builds. */
async function getInvoke(): Promise<typeof import('@tauri-apps/api/core').invoke> {
	const { invoke } = await import('@tauri-apps/api/core');
	return invoke;
}

// ─── Theme preferences ────────────────────────────────────────────────────────

/**
 * Load theme mode and manual hue from taste.db.
 * Returns defaults if not set: mode='default', manualHue='220'.
 */
export async function loadThemePreferences(): Promise<{ mode: string; manualHue: string }> {
	try {
		const invoke = await getInvoke();
		const settings = await invoke<Record<string, string>>('get_all_ai_settings');
		return {
			mode: settings['theme_mode'] || 'default',
			manualHue: settings['theme_manual_hue'] || '220'
		};
	} catch (err) {
		console.error('Failed to load theme preferences:', err);
		return { mode: 'default', manualHue: '220' };
	}
}

/**
 * Save a single theme preference to taste.db.
 */
export async function saveThemePreference(
	key: 'theme_mode' | 'theme_manual_hue',
	value: string
): Promise<void> {
	try {
		const invoke = await getInvoke();
		await invoke('set_ai_setting', { key, value });
	} catch (err) {
		console.error(`Failed to save theme preference ${key}:`, err);
	}
}

// ─── Streaming platform preference ───────────────────────────────────────────

/**
 * Load the user's preferred streaming platform from taste.db.
 * Also updates the reactive streamingPref state.
 * Returns '' (no preference) if not set.
 */
export async function loadStreamingPreference(): Promise<string> {
	try {
		const invoke = await getInvoke();
		const settings = await invoke<Record<string, string>>('get_all_ai_settings');
		const platform = settings['preferred_platform'] || '';
		streamingPref.platform = platform;
		return platform;
	} catch (err) {
		console.error('Failed to load streaming preference:', err);
		return '';
	}
}

/**
 * Save the user's preferred streaming platform to taste.db.
 * Also updates the reactive streamingPref state.
 */
export async function saveStreamingPreference(platform: string): Promise<void> {
	try {
		const invoke = await getInvoke();
		await invoke('set_ai_setting', { key: 'preferred_platform', value: platform });
		streamingPref.platform = platform;
	} catch (err) {
		console.error('Failed to save streaming preference:', err);
	}
}

// ─── Layout template preference ───────────────────────────────────────────────

/**
 * Load the user's chosen layout template from taste.db.
 * Returns 'cockpit' if not set — cockpit is the default per user decision.
 */
export async function loadLayoutPreference(): Promise<string> {
	try {
		const invoke = await getInvoke();
		const settings = await invoke<Record<string, string>>('get_all_ai_settings');
		return settings['layout_template'] || 'cockpit';
	} catch (err) {
		console.error('Failed to load layout preference:', err);
		return 'cockpit';
	}
}

/**
 * Save the user's chosen layout template to taste.db.
 */
export async function saveLayoutPreference(template: string): Promise<void> {
	try {
		const invoke = await getInvoke();
		await invoke('set_ai_setting', { key: 'layout_template', value: template });
	} catch (err) {
		console.error('Failed to save layout preference:', err);
	}
}

// ─── User layout templates ────────────────────────────────────────────────────

/**
 * Load all user-created layout templates from taste.db.
 * Returns an empty array if none are saved or on error.
 */
export async function loadUserTemplates(): Promise<UserTemplateRecord[]> {
	try {
		const invoke = await getInvoke();
		const settings = await invoke<Record<string, string>>('get_all_ai_settings');
		const raw = settings['user_layout_templates'];
		if (!raw) return [];
		try {
			return JSON.parse(raw) as UserTemplateRecord[];
		} catch {
			return [];
		}
	} catch (err) {
		console.error('Failed to load user templates:', err);
		return [];
	}
}

/**
 * Save the full array of user-created layout templates to taste.db.
 */
export async function saveUserTemplates(templates: UserTemplateRecord[]): Promise<void> {
	try {
		const invoke = await getInvoke();
		await invoke('set_ai_setting', {
			key: 'user_layout_templates',
			value: JSON.stringify(templates)
		});
	} catch (err) {
		console.error('Failed to save user templates:', err);
	}
}

// ─── Streaming service order ──────────────────────────────────────────────────

const KNOWN_SERVICES = ['bandcamp', 'spotify', 'soundcloud', 'youtube'];
const DEFAULT_SERVICE_ORDER = ['bandcamp', 'spotify', 'soundcloud', 'youtube'];

/**
 * Load the user's streaming service priority order from taste.db.
 * Returns DEFAULT_SERVICE_ORDER if not set or if the stored value is invalid.
 * Validates that the parsed array contains exactly 4 entries, all known services.
 */
export async function loadServiceOrder(): Promise<string[]> {
	try {
		const invoke = await getInvoke();
		const settings = await invoke<Record<string, string>>('get_all_ai_settings');
		const raw = settings['streaming_service_order'];
		if (!raw) return DEFAULT_SERVICE_ORDER;
		const parsed = JSON.parse(raw) as unknown;
		if (
			Array.isArray(parsed) &&
			parsed.length === 4 &&
			parsed.every((s): s is string => typeof s === 'string' && KNOWN_SERVICES.includes(s))
		) {
			return parsed as string[];
		}
		return DEFAULT_SERVICE_ORDER;
	} catch {
		return DEFAULT_SERVICE_ORDER;
	}
}

/**
 * Save the streaming service priority order to taste.db.
 * Call after each drag-to-reorder interaction in Settings → Streaming.
 */
export async function saveServiceOrder(order: string[]): Promise<void> {
	try {
		const invoke = await getInvoke();
		await invoke('set_ai_setting', {
			key: 'streaming_service_order',
			value: JSON.stringify(order)
		});
	} catch (err) {
		console.error('Failed to save service order:', err);
	}
}
