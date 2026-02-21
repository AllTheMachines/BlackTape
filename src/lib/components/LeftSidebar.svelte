<script lang="ts">
	import { page } from '$app/stores';
	import TagChip from '$lib/components/TagChip.svelte';

	// Quick nav links — all main sections
	const navLinks = [
		{ href: '/discover', label: 'Discover' },
		{ href: '/style-map', label: 'Style Map' },
		{ href: '/kb', label: 'Knowledge Base' },
		{ href: '/time-machine', label: 'Time Machine' },
		{ href: '/crate', label: 'Dig (Crate)' },
		{ href: '/library', label: 'Library' },
		{ href: '/explore', label: 'Explore' },
		{ href: '/settings', label: 'Settings' }
	] as const;

	// Discovery filter state
	let tagInput = $state('');
	let selectedTags = $state<string[]>([]);
	let decade = $state(0); // 0 = all, otherwise e.g. 1990
	let nicheLevel = $state('all'); // 'all' | 'mainstream' | 'eclectic' | 'niche' | 'very-niche'

	// Search results for sidebar suggestion panel
	let sidebarResults = $state<{ name: string; slug: string; tags: string[] }[]>([]);
	let fetchTimer: ReturnType<typeof setTimeout> | null = null;

	const decadeLabels = [
		{ value: 0, label: 'All' },
		{ value: 1950, label: '1950s' },
		{ value: 1960, label: '1960s' },
		{ value: 1970, label: '1970s' },
		{ value: 1980, label: '1980s' },
		{ value: 1990, label: '1990s' },
		{ value: 2000, label: '2000s' },
		{ value: 2010, label: '2010s' },
		{ value: 2020, label: '2020s' }
	];

	function addTag(tag: string) {
		const trimmed = tag.trim().toLowerCase();
		if (!trimmed || selectedTags.includes(trimmed) || selectedTags.length >= 5) return;
		selectedTags = [...selectedTags, trimmed];
		tagInput = '';
		scheduleFetch();
	}

	function removeTag(tag: string) {
		selectedTags = selectedTags.filter((t) => t !== tag);
		scheduleFetch();
	}

	function handleTagKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			addTag(tagInput);
		} else if (e.key === 'Backspace' && tagInput === '' && selectedTags.length > 0) {
			selectedTags = selectedTags.slice(0, -1);
			scheduleFetch();
		}
	}

	function scheduleFetch() {
		if (fetchTimer) clearTimeout(fetchTimer);
		fetchTimer = setTimeout(fetchSidebarResults, 300);
	}

	async function fetchSidebarResults() {
		if (selectedTags.length === 0 && nicheLevel === 'all') {
			sidebarResults = [];
			return;
		}

		try {
			const params = new URLSearchParams();
			if (selectedTags.length > 0) {
				params.set('q', selectedTags[0]);
				params.set('mode', 'tag');
			}
			params.set('limit', '5');

			const res = await fetch(`/api/search?${params}`);
			if (!res.ok) return;
			const data = await res.json() as { results?: { name: string; slug: string; tags: string[] }[] };
			sidebarResults = data.results ?? [];
		} catch {
			sidebarResults = [];
		}
	}

	function isActive(href: string): boolean {
		const pathname = $page.url.pathname;
		if (href === '/') return pathname === '/';
		return pathname.startsWith(href);
	}
</script>

<aside class="left-sidebar" aria-label="Navigation and discovery">
	<!-- Quick Nav -->
	<section class="sidebar-section nav-section">
		<h4 class="section-label">Navigation</h4>
		<nav class="quick-nav">
			{#each navLinks as link}
				<a
					href={link.href}
					class="nav-link"
					class:active={isActive(link.href)}
				>
					{link.label}
				</a>
			{/each}
		</nav>
	</section>

	<div class="section-divider"></div>

	<!-- Discovery Filters -->
	<section class="sidebar-section filter-section">
		<h4 class="section-label">Discovery Filters</h4>

		<!-- Tag Input -->
		<div class="filter-group">
			<label class="filter-label" for="sidebar-tag-input">Tags</label>
			<input
				id="sidebar-tag-input"
				class="tag-input"
				type="text"
				placeholder={selectedTags.length >= 5 ? 'Max 5 tags' : 'Add a tag...'}
				bind:value={tagInput}
				disabled={selectedTags.length >= 5}
				onkeydown={handleTagKeydown}
				oninput={scheduleFetch}
			/>
			{#if selectedTags.length > 0}
				<div class="selected-tags">
					{#each selectedTags as tag}
						<span class="tag-remove-wrap">
							<TagChip {tag} clickable={false} />
							<button
								class="tag-remove-btn"
								onclick={() => removeTag(tag)}
								aria-label="Remove tag {tag}"
							>×</button>
						</span>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Decade Selector -->
		<div class="filter-group">
			<label class="filter-label" for="sidebar-decade">Decade</label>
			<select
				id="sidebar-decade"
				class="filter-select"
				bind:value={decade}
				onchange={scheduleFetch}
			>
				{#each decadeLabels as d}
					<option value={d.value}>{d.label}</option>
				{/each}
			</select>
		</div>

		<!-- Niche Score -->
		<div class="filter-group">
			<label class="filter-label" for="sidebar-niche">Niche Score</label>
			<select
				id="sidebar-niche"
				class="filter-select"
				bind:value={nicheLevel}
				onchange={scheduleFetch}
			>
				<option value="all">All</option>
				<option value="mainstream">Mainstream</option>
				<option value="eclectic">Eclectic</option>
				<option value="niche">Niche</option>
				<option value="very-niche">Very Niche</option>
			</select>
		</div>

		<!-- Sidebar Results -->
		{#if sidebarResults.length > 0}
			<div class="sidebar-results">
				<h5 class="results-label">Results</h5>
				{#each sidebarResults as artist}
					<a href="/artist/{artist.slug}" class="result-card">
						<span class="result-name">{artist.name}</span>
						{#if artist.tags?.length}
							<span class="result-tags">{artist.tags.slice(0, 2).join(', ')}</span>
						{/if}
					</a>
				{/each}
			</div>
		{:else if selectedTags.length > 0 || nicheLevel !== 'all'}
			<div class="no-results">No matches found</div>
		{/if}
	</section>
</aside>

<style>
	.left-sidebar {
		height: 100%;
		overflow-y: auto;
		padding: var(--space-sm);
		background: var(--bg-base);
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.sidebar-section {
		padding: var(--space-sm) 0;
	}

	.section-divider {
		height: 1px;
		background: var(--border-subtle);
		margin: var(--space-xs) 0;
	}

	.section-label {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		margin: 0 0 var(--space-xs) 0;
	}

	/* Quick Nav */
	.quick-nav {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.nav-link {
		display: block;
		padding: 3px var(--space-xs);
		font-size: 0.75rem;
		color: var(--text-muted);
		text-decoration: none;
		border-radius: 3px;
		transition: color 0.1s, background 0.1s;
	}

	.nav-link:hover {
		color: var(--text-secondary);
		background: var(--bg-hover);
		text-decoration: none;
	}

	.nav-link.active {
		color: var(--text-accent);
		background: var(--bg-elevated);
	}

	/* Filter Controls */
	.filter-group {
		margin-bottom: var(--space-sm);
	}

	.filter-label {
		display: block;
		font-size: 0.65rem;
		color: var(--text-muted);
		margin-bottom: 3px;
	}

	.tag-input,
	.filter-select {
		width: 100%;
		box-sizing: border-box;
		background: var(--bg-elevated);
		border: 1px solid var(--border-default);
		border-radius: 3px;
		color: var(--text-primary);
		font-size: 0.75rem;
		padding: 3px 6px;
		font-family: inherit;
	}

	.tag-input:focus,
	.filter-select:focus {
		outline: none;
		border-color: var(--text-accent);
	}

	.tag-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.selected-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 3px;
		margin-top: var(--space-xs);
	}

	.tag-remove-wrap {
		display: inline-flex;
		align-items: center;
		gap: 2px;
	}

	.tag-remove-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 0.75rem;
		padding: 0 2px;
		line-height: 1;
	}

	.tag-remove-btn:hover {
		color: var(--text-primary);
	}

	/* Sidebar Results */
	.sidebar-results {
		margin-top: var(--space-sm);
		border-top: 1px solid var(--border-subtle);
		padding-top: var(--space-xs);
	}

	.results-label {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		margin: 0 0 var(--space-xs) 0;
	}

	.result-card {
		display: flex;
		flex-direction: column;
		gap: 1px;
		padding: 4px 0;
		text-decoration: none;
		border-bottom: 1px solid var(--border-subtle);
		transition: background 0.1s;
		border-radius: 2px;
	}

	.result-card:last-child {
		border-bottom: none;
	}

	.result-card:hover {
		background: var(--bg-hover);
	}

	.result-name {
		font-size: 0.75rem;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.result-tags {
		font-size: 0.65rem;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.no-results {
		font-size: 0.7rem;
		color: var(--text-muted);
		text-align: center;
		padding: var(--space-sm) 0;
		font-style: italic;
	}
</style>
