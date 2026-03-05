<script lang="ts">
	import { page, navigating } from '$app/stores';
	import { goto } from '$app/navigation';
	import { helpTopicForPath } from '$lib/help';

	const MAX_TAGS = 5;

	// Discovery modes — condensed view when on any discovery route
	const DISCOVERY_MODES = [
		{ href: '/discover', label: 'Discover', icon: '◉', comingSoon: false },
		{ href: '/explore', label: 'Oracle', icon: '◬', comingSoon: false },
		{ href: '/rabbit-hole', label: 'Rabbit Hole', icon: '◈', comingSoon: false },
		{ href: '/world-map', label: 'World Map', icon: '◎', comingSoon: true }
	] as const;

	// Navigation groups — Discover, Library, Account
	const navGroups = [
		{
			label: 'Discover',
			links: DISCOVERY_MODES as unknown as { href: string; label: string; icon: string }[]
		},
		{
			label: 'Library',
			links: [
				{ href: '/library', label: 'Library', icon: '▤' }
			]
		},
		{
			label: 'Account',
			links: [
				{ href: '/profile', label: 'Profile', icon: '◐' },
				{ href: '/settings', label: 'Settings', icon: '⚙' },
				{ href: '/about', label: 'About', icon: '◌' }
			]
		}
	];

	// Discovery filter state — derived from URL so it stays in sync with TagFilter
	let activeTags = $derived(
		$page.url.searchParams.get('tags')?.split(',').filter(Boolean) ?? []
	);

	let tagInput = $state('');

	/** Navigate to /discover with the given tag list. */
	function applyTags(tags: string[]) {
		const params = new URLSearchParams();
		if (tags.length > 0) {
			params.set('tags', tags.join(','));
		}
		goto(`/discover${tags.length > 0 ? '?' + params : ''}`, { keepFocus: true, noScroll: true });
	}

	function addTag(tag: string) {
		const trimmed = tag.trim().toLowerCase();
		if (!trimmed || activeTags.includes(trimmed) || activeTags.length >= MAX_TAGS) return;
		tagInput = '';
		applyTags([...activeTags, trimmed]);
	}

	function removeTag(tag: string) {
		applyTags(activeTags.filter((t) => t !== tag));
	}

	function handleTagKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			addTag(tagInput);
		} else if (e.key === 'Backspace' && tagInput === '' && activeTags.length > 0) {
			applyTags(activeTags.slice(0, -1));
		}
	}

	function isActive(href: string): boolean {
		const pathname = $page.url.pathname;
		if (href === '/') return pathname === '/';
		return pathname.startsWith(href);
	}

	/** True when a navigation is in-flight toward this href. */
	function isPending(href: string): boolean {
		const dest = $navigating?.to?.url?.pathname ?? null;
		if (!dest) return false;
		if (href === '/') return dest === '/';
		return dest.startsWith(href);
	}

	/** True when we're on the Discover page — show filter controls. */
	let isOnDiscover = $derived($page.url.pathname === '/discover');


</script>

<aside class="left-sidebar" aria-label="Navigation and discovery">
	<!-- Grouped Nav -->
	<nav class="sidebar-nav">
		{#each navGroups as group}
			<div class="nav-group">
				<span class="nav-lbl">{group.label}</span>
				{#if group.label === 'Discover'}
					{#each DISCOVERY_MODES as mode}
						{#if mode.comingSoon}
							<span class="nav-item nav-item--soon" title="Coming soon">
								<span class="nav-ico">{mode.icon}</span>
								{mode.label}
							</span>
						{:else}
							<a href={mode.href} class="nav-item" class:active={isActive(mode.href)} class:pending={isPending(mode.href)}>
								<span class="nav-ico">{mode.icon}</span>
								{mode.label}
							</a>
						{/if}
					{/each}
				{:else}
					{#each group.links as link}
						<a href={link.href} class="nav-item" class:active={isActive(link.href)} class:pending={isPending(link.href)}>
							<span class="nav-ico">{link.icon}</span>
							{link.label}
						</a>
					{/each}
				{/if}
			</div>
		{/each}
	</nav>

	<!-- Discovery Filters — shown on Discover page, or as a link to get there -->
	{#if !isOnDiscover}
		<div class="filter-hint-wrap">
			<p class="filter-hint">
				<a href="/discover" class="discover-link">Go to Discover</a> to filter by tags.
			</p>
		</div>
	{/if}

	<!-- Help link — always at the bottom -->
	<div class="sidebar-help">
		<a href="/help/{helpTopicForPath($page.url.pathname)}" class="help-link">? Help</a>
	</div>

	{#if isOnDiscover}
		<div class="filter-section">
			<span class="nav-lbl">Discovery Filters</span>

			<!-- Tag Input -->
			<div class="filter-group">
				<label class="filter-label" for="sidebar-tag-input">Tags</label>
				<input
					id="sidebar-tag-input"
					class="tag-input"
					type="text"
					placeholder={activeTags.length >= MAX_TAGS ? 'Max 5 tags' : 'Add a tag...'}
					bind:value={tagInput}
					disabled={activeTags.length >= MAX_TAGS}
					onkeydown={handleTagKeydown}
				/>
				{#if activeTags.length > 0}
					<div class="selected-tags">
						{#each activeTags as tag}
							<span class="tag-remove-wrap">
								<span class="tag-chip-inline">{tag}</span>
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

			{#if activeTags.length > 0}
				<button class="clear-btn" onclick={() => applyTags([])}>Clear all filters</button>
			{/if}
		</div>
	{/if}
</aside>

<style>
	.left-sidebar {
		width: var(--sidebar);
		height: 100%;
		background: var(--bg-1);
		border-right: 1px solid var(--b-1);
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		overflow-x: hidden;
	}

	.sidebar-nav {
		flex-shrink: 0;
	}

	.nav-group {
		border-bottom: 1px solid var(--b-0);
		padding: 5px 0;
	}

	.nav-lbl {
		font-size: 9px;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--t-3);
		padding: 5px 12px 2px;
		display: block;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 9px;
		height: 28px;
		padding: 0 12px;
		cursor: pointer;
		color: var(--t-3);
		font-size: 11px;
		border-left: 2px solid transparent;
		text-decoration: none;
		transition: background 0.1s, color 0.1s;
	}

	.nav-item:hover {
		background: #181818;
		color: var(--t-2);
		text-decoration: none;
	}

	.nav-item:active {
		background: #1c1c1c;
		color: var(--t-1);
	}

	.nav-item.active {
		background: #1c1c1c;
		color: var(--t-1);
		border-left-color: var(--acc);
	}

	.nav-item.active .nav-ico {
		color: var(--acc);
	}

	.nav-item--soon {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.nav-item.pending {
		background: #181818;
		color: var(--t-2);
		border-left-color: var(--t-3);
		opacity: 0.8;
	}

	.nav-item.pending .nav-ico {
		color: var(--t-2);
	}

	.nav-ico {
		width: 14px;
		text-align: center;
		font-size: 11px;
		flex-shrink: 0;
		color: inherit;
	}

	/* Discovery mode switcher — shown when on a discovery route */
	.discovery-mode-switcher {
		padding: 4px 12px 6px;
	}

	.active-mode-row {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 4px 0;
		margin-bottom: 6px;
	}

	.active-mode-icon {
		font-size: 14px;
		color: var(--acc);
		width: 14px;
		text-align: center;
		flex-shrink: 0;
	}

	.active-mode-name {
		font-size: 12px;
		font-weight: 600;
		color: var(--t-1);
	}

	.mode-switch-grid {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
	}

	.mode-switch-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		background: var(--bg-4);
		color: var(--t-3);
		font-size: 11px;
		text-decoration: none;
		transition: all 0.1s;
	}

	.mode-switch-btn:hover {
		border-color: var(--acc);
		color: var(--t-1);
	}

	.mode-switch-btn:active {
		opacity: 0.7;
	}

	.mode-switch-btn.active {
		background: var(--acc);
		border-color: var(--acc);
		color: var(--bg-1);
	}

	.mode-switch-btn.pending {
		border-color: var(--t-3);
		color: var(--t-2);
		opacity: 0.7;
	}

	/* Discovery Filters */
	.filter-hint-wrap {
		padding: 8px 12px;
		border-top: 1px solid var(--b-0);
	}

	.filter-hint {
		font-size: 10px;
		color: var(--t-3);
		margin: 0;
		line-height: 1.5;
	}

	.discover-link {
		color: var(--acc);
		text-decoration: none;
	}

	.discover-link:hover {
		text-decoration: underline;
	}

	.filter-section {
		padding: 5px 0;
		border-top: 1px solid var(--b-0);
	}

	.filter-group {
		padding: 0 12px;
		margin-bottom: 6px;
	}

	.filter-label {
		display: block;
		font-size: 9px;
		color: var(--t-3);
		margin-bottom: 3px;
	}

	.tag-input {
		width: 100%;
		box-sizing: border-box;
		background: var(--bg-4);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		color: var(--t-1);
		font-size: 11px;
		padding: 3px 6px;
		font-family: inherit;
		outline: none;
	}

	.tag-input:focus {
		border-color: var(--acc);
	}

	.tag-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.selected-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 3px;
		margin-top: 4px;
	}

	.tag-remove-wrap {
		display: inline-flex;
		align-items: center;
		gap: 2px;
	}

	.tag-chip-inline {
		display: inline-flex;
		align-items: center;
		padding: 1px 5px;
		background: var(--bg-4);
		color: var(--t-2);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		font-size: 10px;
		white-space: nowrap;
	}

	.tag-remove-btn {
		background: none;
		border: none;
		color: var(--t-3);
		cursor: pointer;
		font-size: 12px;
		padding: 0 2px;
		line-height: 1;
	}

	.tag-remove-btn:hover {
		color: var(--t-1);
	}

	.clear-btn {
		display: block;
		width: calc(100% - 24px);
		margin: 0 12px;
		background: none;
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		color: var(--t-3);
		cursor: pointer;
		font-size: 10px;
		padding: 3px 6px;
		text-align: center;
		font-family: inherit;
		transition: color 0.1s, border-color 0.1s;
	}

	.clear-btn:hover {
		color: var(--t-1);
		border-color: var(--b-3);
	}

	.sidebar-help {
		margin-top: auto;
		padding: 8px 12px;
		border-top: 1px solid var(--b-0);
	}

	.help-link {
		font-size: 10px;
		color: var(--t-3);
		text-decoration: none;
		transition: color 0.1s;
	}

	.help-link:hover {
		color: var(--acc);
	}
</style>
