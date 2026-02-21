/**
 * Layout Template Definitions
 *
 * Defines the built-in layout templates for the Mercury cockpit UI.
 * Templates control how PaneForge splits the screen into panels.
 *
 * Three built-in templates:
 * - cockpit  — Full 3-pane: left sidebar + main + right sidebar
 * - focus    — 2-pane: main + right context panel
 * - minimal  — Single column, classic layout
 *
 * User templates are stored as UserTemplateRecord in taste.db and
 * expanded to full TemplateConfig via expandUserTemplate() at runtime.
 */

export type LayoutTemplate = 'cockpit' | 'focus' | 'minimal' | string;

export interface TemplateConfig {
	id: LayoutTemplate;
	label: string;
	description: string;
	panes: 'three' | 'two' | 'one';
	/** PaneForge autoSaveId — unique per template so sizes persist independently */
	autoSaveId: string;
	leftDefault: number; // default % width for left pane
	mainDefault: number; // default % width for main pane
	rightDefault: number; // default % width for right pane (0 = not shown)
	leftMin: number; // minimum % width for left pane
	mainMin: number; // minimum % width for main pane
	rightMin: number; // minimum % for right pane
}

export const LAYOUT_TEMPLATES: Record<string, TemplateConfig> = {
	cockpit: {
		id: 'cockpit',
		label: 'Cockpit',
		description: 'Full 3-pane layout — sidebars + main content',
		panes: 'three',
		autoSaveId: 'mercury-cockpit',
		leftDefault: 22,
		mainDefault: 56,
		rightDefault: 22,
		leftMin: 12,
		mainMin: 35,
		rightMin: 12
	},
	focus: {
		id: 'focus',
		label: 'Focus',
		description: 'Main content + context sidebar',
		panes: 'two',
		autoSaveId: 'mercury-focus',
		leftDefault: 0,
		mainDefault: 70,
		rightDefault: 30,
		leftMin: 0,
		mainMin: 45,
		rightMin: 15
	},
	minimal: {
		id: 'minimal',
		label: 'Minimal',
		description: 'Single column — classic layout',
		panes: 'one',
		autoSaveId: 'mercury-minimal',
		leftDefault: 0,
		mainDefault: 100,
		rightDefault: 0,
		leftMin: 0,
		mainMin: 100,
		rightMin: 0
	}
};

export const DEFAULT_TEMPLATE: LayoutTemplate = 'cockpit';
export const TEMPLATE_LIST: TemplateConfig[] = Object.values(LAYOUT_TEMPLATES);

// ─── User Templates ───────────────────────────────────────────────────────────

/** Minimal shape stored in taste.db (JSON array under key 'user_layout_templates') */
export interface UserTemplateRecord {
	id: string; // 'user-1706123456789' (timestamp-based, unique)
	label: string; // user-provided name e.g. 'Late Night Setup'
	basePanes: 'three' | 'two' | 'one'; // pane config copied from active template at save time
}

/** Expand a stored UserTemplateRecord to a full TemplateConfig for use in PanelLayout */
export function expandUserTemplate(record: UserTemplateRecord): TemplateConfig {
	// Use matching built-in as size/min defaults
	const base = TEMPLATE_LIST.find((t) => t.panes === record.basePanes) ?? LAYOUT_TEMPLATES.cockpit;
	return {
		...base,
		id: record.id,
		label: record.label,
		description: 'Custom layout',
		autoSaveId: `mercury-user-${record.id}`
	};
}

/** Create a new UserTemplateRecord from the currently active template */
export function createUserTemplateRecord(
	label: string,
	basePanes: 'three' | 'two' | 'one'
): UserTemplateRecord {
	return { id: `user-${Date.now()}`, label, basePanes };
}
