<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { themeState } from '$lib/theme/engine.svelte';
	import type { TemplateConfig } from '$lib/theme/templates';

	let reloading = $state(false);

	async function reloadPage() {
		reloading = true;
		await invalidateAll();
		reloading = false;
	}

	interface Props {
		currentTemplateId: string;
		allTemplates: TemplateConfig[];
		onTemplateChange: (templateId: string) => void;
	}

	let { currentTemplateId, allTemplates, onTemplateChange }: Props = $props();

	let searchQuery = $state('');
	let artistSuggestions = $state<Array<{ name: string; slug: string; tags: string | null }>>([]);
	let tagSuggestions = $state<Array<{ tag: string; artist_count: number }>>([]);
	let showDropdown = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	async function fetchSuggestions(q: string) {
		if (q.length < 2) {
			artistSuggestions = [];
			tagSuggestions = [];
			showDropdown = false;
			return;
		}
		try {
			const { getProvider } = await import('$lib/db/provider');
			const { searchArtistsAutocomplete, searchTagsAutocomplete } = await import('$lib/db/queries');
			const db = await getProvider();
			[artistSuggestions, tagSuggestions] = await Promise.all([
				searchArtistsAutocomplete(db, q, 4),
				searchTagsAutocomplete(db, q, 3)
			]);
			showDropdown = artistSuggestions.length > 0 || tagSuggestions.length > 0;
		} catch {
			artistSuggestions = [];
			tagSuggestions = [];
			showDropdown = false;
		}
	}

	function handleSearchInput() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => fetchSuggestions(searchQuery), 200);
	}

	function handleSearchBlur() {
		setTimeout(() => { showDropdown = false; }, 150);
	}

	function selectArtist(slug: string) {
		showDropdown = false;
		searchQuery = '';
		goto('/artist/' + slug);
	}

	function selectTag(tag: string) {
		showDropdown = false;
		searchQuery = '';
		goto('/search?q=' + encodeURIComponent(tag) + '&mode=tag');
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
	<!-- Left Group: Back button + Search -->
	<div class="bar-group bar-left">
		{#if $page.url.pathname !== '/'}
			<button class="back-btn" onclick={() => history.back()} title="Go back" aria-label="Go back">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="15 18 9 12 15 6" />
				</svg>
			</button>
		{/if}
		<button class="reload-btn" onclick={reloadPage} disabled={reloading} title="Reload page" aria-label="Reload page">
			<svg class:spinning={reloading} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="23 4 23 10 17 10" />
				<path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
			</svg>
		</button>
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
				oninput={handleSearchInput}
				onblur={handleSearchBlur}
				autocomplete="off"
			/>
			{#if showDropdown}
				<div class="search-dropdown">
					{#if artistSuggestions.length > 0}
						<div class="dd-group-label">Artists</div>
						{#each artistSuggestions as a}
							<button class="dd-item" onmousedown={() => selectArtist(a.slug)}>
								<span class="dd-name">{a.name}</span>
								{#if a.tags}<span class="dd-tags">{a.tags}</span>{/if}
							</button>
						{/each}
					{/if}
					{#if tagSuggestions.length > 0}
						<div class="dd-group-label">Tags</div>
						{#each tagSuggestions as t}
							<button class="dd-item dd-tag" onmousedown={() => selectTag(t.tag)}>{t.tag}</button>
						{/each}
					{/if}
					<a class="dd-see-all" href="/search?q={encodeURIComponent(searchQuery)}">See all results</a>
				</div>
			{/if}
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

	.bar-right {
		flex-shrink: 0;
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 5px;
	}

	/* Back button */
	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: var(--bg-4);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		color: var(--t-1);
		cursor: pointer;
		flex-shrink: 0;
		transition: color 0.1s, background 0.1s;
	}

	:global(.back-btn svg) {
		display: block;
		width: 15px;
		height: 15px;
		flex-shrink: 0;
	}

	.back-btn:hover {
		color: var(--t-1);
		background: var(--bg-5);
	}

	/* Reload */
	.reload-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		background: var(--bg-4);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		color: var(--t-3);
		cursor: pointer;
		flex-shrink: 0;
		transition: color 0.1s, background 0.1s;
	}

	.reload-btn:hover:not(:disabled) {
		color: var(--t-1);
		background: var(--bg-5);
	}

	.reload-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	:global(.reload-btn svg) {
		display: block;
		flex-shrink: 0;
	}

	:global(.spinning) {
		animation: spin-reload 0.6s linear infinite;
	}

	@keyframes spin-reload {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
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
		position: relative;
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

	/* Search dropdown */
	.search-dropdown {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		background: var(--bg-4);
		border: 1px solid var(--b-2);
		z-index: 200;
		display: flex;
		flex-direction: column;
	}

	.dd-group-label {
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--t-3);
		padding: 4px 8px 2px;
	}

	.dd-item {
		background: none;
		border: none;
		color: var(--t-2);
		font-size: 11px;
		text-align: left;
		padding: 4px 8px;
		cursor: pointer;
		font-family: inherit;
		display: flex;
		align-items: baseline;
		gap: 6px;
		white-space: nowrap;
		overflow: hidden;
	}

	.dd-item:hover {
		background: var(--bg-5);
		color: var(--t-1);
	}

	.dd-name {
		flex-shrink: 0;
	}

	.dd-tags {
		font-size: 10px;
		color: var(--t-3);
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.dd-tag {
		color: var(--t-3);
		font-size: 10px;
	}

	.dd-see-all {
		font-size: 10px;
		color: var(--acc);
		padding: 4px 8px 6px;
		text-decoration: none;
		border-top: 1px solid var(--b-1);
	}

	.dd-see-all:hover {
		text-decoration: underline;
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
