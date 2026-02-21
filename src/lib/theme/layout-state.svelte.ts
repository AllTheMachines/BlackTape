/**
 * Shared reactive layout state — used by both root layout and settings page.
 *
 * Extracting this to a module ensures the active template and user templates
 * are in sync across both the ControlBar (in root layout) and the Settings page
 * template picker without requiring prop drilling or separate state.
 */

import type { UserTemplateRecord } from './templates';
import { DEFAULT_TEMPLATE } from './templates';

export const layoutState = $state({
	/** Currently active layout template ID (built-in or user-created) */
	template: DEFAULT_TEMPLATE as string,
	/** User-created layout templates loaded from taste.db */
	userTemplates: [] as UserTemplateRecord[]
});
