<script lang="ts">
	import { goto } from '$app/navigation';
	import { themeState } from '$lib/theme/engine.svelte';
	import type { TemplateConfig } from '$lib/theme/templates';

	interface Props {
		currentTemplateId: string;
		allTemplates: TemplateConfig[];
		onTemplateChange: (templateId: string) => void;
	}

	let { currentTemplateId, allTemplates, onTemplateChange }: Props = $props();

	let searchQuery = $state('');
	let navInput = $state('');

	function handleNav(e: Event) {
		e.preventDefault();
		const val = navInput.trim();
		if (!val) return;
		const path = val.startsWith('/') ? val : '/' + val;
		goto(path);
		navInput = '';
	}

	// Split templates into built-ins and user templates for optgroup rendering
	const builtinIds = ['cockpit', 'focus', 'minimal'];
	const builtinTemplates = $derived(allTemplates.filter((t) => builtinIds.includes(t.id)));
	const userTemplates = $derived(allTemplates.filter((t) => !builtinIds.includes(t.id)));

	// Compute the theme indicator color from current theme hue
	const themeHue = $derived(themeState.computedHue || themeState.manualHue || 220);
	const themeColor = $derived(
		themeState.mode === 'default'
			? 'oklch(0.45 0.0 0)'
			: `oklch(0.72 0.12 ${themeHue})`
	);

	function handleSearch(e: Event) {
		e.preventDefault();
		if (searchQuery.trim()) {
			goto(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
		}
	}

	function handleTemplateChange(e: Event) {
		const value = (e.currentTarget as HTMLSelectElement).value;
		onTemplateChange(value);
	}
</script>

<div class="control-bar" role="toolbar" aria-label="Global controls">
	<!-- Left Group: Search -->
	<div class="bar-group bar-left">
		<form class="search-form" onsubmit={handleSearch}>
			<label for="control-bar-search" class="sr-only">Search artists and tags</label>
			<svg
				class="search-icon"
				width="13"
				height="13"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<circle cx="11" cy="11" r="8" />
				<line x1="21" y1="21" x2="16.65" y2="16.65" />
			</svg>
			<input
				id="control-bar-search"
				class="search-input"
				type="search"
				placeholder="Search..."
				bind:value={searchQuery}
				autocomplete="off"
			/>
		</form>
	</div>

	<!-- Center Group: Address bar -->
	<div class="bar-group bar-center">
		<form class="nav-form" onsubmit={handleNav}>
			<input
				class="nav-input"
				type="text"
				placeholder="/artist/radiohead"
				bind:value={navInput}
				autocomplete="off"
				spellcheck="false"
			/>
		</form>
	</div>

	<!-- Right Group: Layout switcher + Theme indicator -->
	<div class="bar-group bar-right">
		<label for="layout-switcher" class="sr-only">Layout</label>
		<select
			id="layout-switcher"
			class="layout-select"
			value={currentTemplateId}
			onchange={handleTemplateChange}
		>
			{#each builtinTemplates as tmpl}
				<option value={tmpl.id}>{tmpl.label}</option>
			{/each}
			{#if userTemplates.length > 0}
				<optgroup label="My Layouts">
					{#each userTemplates as tmpl}
						<option value={tmpl.id}>{tmpl.label}</option>
					{/each}
				</optgroup>
			{/if}
		</select>

		<a
			href="/settings"
			class="theme-indicator"
			title="Theme settings (hue: {themeHue}°)"
			aria-label="Open theme settings"
		>
			<span
				class="theme-dot"
				style:background={themeColor}
			></span>
		</a>
	</div>
</div>

<style>
	.control-bar {
		display: flex;
		align-items: center;
		gap: 8px;
		height: var(--topbar);
		padding: 0 12px;
		background: var(--bg-1);
		border-bottom: 1px solid var(--b-1);
		flex-shrink: 0;
	}

	/* Screen reader only helper */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	.bar-group {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.bar-left {
		flex-shrink: 0;
	}

	.bar-center {
		flex: 1;
		justify-content: center;
	}

	.nav-form {
		width: 100%;
		max-width: 400px;
	}

	.nav-input {
		width: 100%;
		background: var(--bg-4);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		color: var(--t-1);
		font-size: 11px;
		font-family: inherit;
		padding: 2px 8px;
		height: 26px;
		outline: none;
		box-sizing: border-box;
	}

	.nav-input::placeholder {
		color: var(--t-3);
	}

	.nav-input:focus {
		border-color: var(--acc);
	}

	.bar-right {
		flex-shrink: 0;
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 5px;
	}

	/* Search */
	.search-form {
		display: flex;
		align-items: center;
		gap: 5px;
		background: var(--bg-4);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		padding: 0 6px;
		width: 190px;
		height: 26px;
	}

	.search-form:focus-within {
		border-color: var(--acc);
	}

	.search-icon {
		color: var(--t-3);
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		background: none;
		border: none;
		outline: none;
		color: var(--t-1);
		font-size: 11px;
		font-family: inherit;
		padding: 0;
	}

	.search-input::placeholder {
		color: var(--t-3);
	}

	/* Layout Switcher */
	.layout-select {
		background: var(--bg-4);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		color: var(--t-2);
		font-size: 11px;
		font-family: inherit;
		padding: 2px 4px;
		height: 26px;
		cursor: pointer;
	}

	.layout-select:focus {
		outline: none;
		border-color: var(--acc);
	}

	/* Theme Indicator */
	.theme-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		background: var(--bg-4);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		text-decoration: none;
		transition: background 0.1s;
	}

	.theme-indicator:hover {
		background: var(--bg-5);
		text-decoration: none;
	}

	.theme-dot {
		display: block;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
</style>
