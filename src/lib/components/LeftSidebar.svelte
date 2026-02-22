<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	const MAX_TAGS = 5;

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

	/** True when we're on the Discover page — show filter controls. */
	let isOnDiscover = $derived($page.url.pathname === '/discover');
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

	<!-- Discovery Filters — shown on Discover page, or as a link to get there -->
	<section class="sidebar-section filter-section">
		<h4 class="section-label">Discovery Filters</h4>

		{#if !isOnDiscover}
			<p class="filter-hint">
				<a href="/discover" class="discover-link">Go to Discover</a> to filter by tags.
			</p>
		{:else}
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

	/* Filter hint (when not on /discover) */
	.filter-hint {
		font-size: 0.7rem;
		color: var(--text-muted);
		margin: 0;
		line-height: 1.5;
	}

	.discover-link {
		color: var(--text-accent);
		text-decoration: none;
	}

	.discover-link:hover {
		text-decoration: underline;
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

	.tag-input {
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

	.tag-input:focus {
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

	.tag-chip-inline {
		display: inline-flex;
		align-items: center;
		padding: 2px 6px;
		background: var(--tag-bg);
		color: var(--tag-text);
		border: 1px solid var(--tag-border);
		border-radius: 999px;
		font-size: 0.75rem;
		white-space: nowrap;
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

	.clear-btn {
		background: none;
		border: 1px solid var(--border-default);
		border-radius: 3px;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 0.65rem;
		padding: 2px 6px;
		width: 100%;
		text-align: center;
		transition: color 0.1s, border-color 0.1s;
	}

	.clear-btn:hover {
		color: var(--text-primary);
		border-color: var(--border-hover);
	}
</style>
