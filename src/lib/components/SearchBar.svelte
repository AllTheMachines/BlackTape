<script lang="ts">
	import { goto } from '$app/navigation';

	let props: {
		initialQuery?: string;
		initialMode?: 'artist' | 'tag';
		size?: 'large' | 'normal';
	} = $props();

	let query = $state(props.initialQuery ?? '');
	let mode: 'artist' | 'tag' = $state(props.initialMode ?? 'artist');
	let size = $derived(props.size ?? 'large');

	let suggestions = $state<Array<{ name: string; slug: string; tags: string | null }>>([]);
	let showSuggestions = $state(false);
	let activeIndex = $state(-1);
	let debounceTimer = $state<ReturnType<typeof setTimeout> | null>(null);

	async function fetchSuggestions(q: string) {
		if (q.length < 2 || mode !== 'artist') {
			suggestions = [];
			showSuggestions = false;
			activeIndex = -1;
			return;
		}
		try {
			const { getProvider } = await import('$lib/db/provider');
			const { searchArtistsAutocomplete } = await import('$lib/db/queries');
			const db = await getProvider();
			suggestions = await searchArtistsAutocomplete(db, q);
			showSuggestions = suggestions.length > 0;
		} catch {
			suggestions = [];
			showSuggestions = false;
		}
	}

	function handleInput() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => fetchSuggestions(query), 200);
	}

	function selectSuggestion(slug: string) {
		showSuggestions = false;
		suggestions = [];
		activeIndex = -1;
		goto(`/artist/${slug}`);
	}

	function handleBlur() {
		setTimeout(() => {
			showSuggestions = false;
			activeIndex = -1;
		}, 150);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!showSuggestions || suggestions.length === 0) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			activeIndex = Math.min(activeIndex + 1, suggestions.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			activeIndex = Math.max(activeIndex - 1, -1);
		} else if (e.key === 'Enter' && activeIndex >= 0) {
			e.preventDefault();
			selectSuggestion(suggestions[activeIndex].slug);
		} else if (e.key === 'Escape') {
			showSuggestions = false;
			activeIndex = -1;
		}
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		const trimmed = query.trim();
		if (!trimmed) return;
		showSuggestions = false;
		goto(`/search?q=${encodeURIComponent(trimmed)}&mode=${mode}`);
	}
</script>

<div class="search-bar" class:large={size === 'large'} class:normal={size === 'normal'}>
	<div class="mode-toggle">
		<button
			class="mode-btn"
			class:active={mode === 'artist'}
			onclick={() => (mode = 'artist')}
			type="button"
		>
			Artists
		</button>
		<button
			class="mode-btn"
			class:active={mode === 'tag'}
			onclick={() => (mode = 'tag')}
			type="button"
		>
			Tags
		</button>
	</div>

	<form onsubmit={handleSubmit}>
		<input
			type="search"
			bind:value={query}
			placeholder={mode === 'artist' ? 'Search artists...' : 'Search by tag...'}
			aria-label={mode === 'artist' ? 'Search artists' : 'Search by tag'}
			oninput={handleInput}
			onblur={handleBlur}
			onkeydown={handleKeydown}
		/>
	</form>

	{#if showSuggestions && suggestions.length > 0}
		<ul class="autocomplete-list" role="listbox" data-testid="autocomplete-dropdown">
			{#each suggestions as s, i}
				<li role="option" aria-selected={activeIndex === i}>
					<button
						type="button"
						class="autocomplete-item"
						class:active={activeIndex === i}
						onmousedown={() => selectSuggestion(s.slug)}
						data-testid="autocomplete-item"
					>
						<span class="ac-name">{s.name}</span>
						{#if s.tags}
							<span class="ac-genre">{s.tags}</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.search-bar {
		width: 100%;
		position: relative;
	}

	.mode-toggle {
		display: flex;
		gap: var(--space-xs);
		margin-bottom: var(--space-sm);
		justify-content: center;
	}

	.mode-btn {
		padding: var(--space-xs) var(--space-md);
		font-size: 0.8rem;
		font-family: var(--font-sans);
		letter-spacing: 0.05em;
		text-transform: uppercase;
		background: transparent;
		border: 1px solid var(--border-default);
		border-radius: var(--input-radius);
		color: var(--text-muted);
		cursor: pointer;
		transition:
			color 0.15s,
			border-color 0.15s,
			background 0.15s;
	}

	.mode-btn:hover {
		color: var(--text-secondary);
		border-color: var(--border-hover);
	}

	.mode-btn.active {
		color: var(--text-primary);
		border-color: var(--border-hover);
		background: var(--bg-elevated);
	}

	form {
		width: 100%;
	}

	input[type='search'] {
		width: 100%;
		background: var(--bg-elevated);
		border: 1px solid var(--border-default);
		border-radius: var(--input-radius);
		color: var(--text-primary);
		outline: none;
		transition: border-color 0.2s;
	}

	input[type='search']::placeholder {
		color: var(--text-muted);
	}

	input[type='search']:focus {
		border-color: var(--border-hover);
	}

	input[type='search']:hover {
		border-color: var(--border-hover);
	}

	/* Large variant (landing page) */
	.large input[type='search'] {
		padding: var(--space-md) var(--space-lg);
		font-size: 1.1rem;
	}

	.large .mode-btn {
		padding: var(--space-xs) var(--space-lg);
		font-size: 0.85rem;
	}

	/* Normal variant (search results header) */
	.normal input[type='search'] {
		padding: var(--space-sm) var(--space-md);
		font-size: 0.95rem;
	}

	.normal .mode-toggle {
		margin-bottom: var(--space-xs);
	}

	.normal .mode-btn {
		padding: 2px var(--space-sm);
		font-size: 0.75rem;
	}

	/* Autocomplete dropdown */
	.autocomplete-list {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		z-index: 100;
		list-style: none;
		margin: 2px 0 0;
		padding: 0;
		background: var(--bg-elevated);
		border: 1px solid var(--border-default);
		border-radius: var(--r, 2px);
		overflow: hidden;
	}

	.autocomplete-item {
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
		width: 100%;
		padding: var(--space-xs) var(--space-md);
		background: transparent;
		border: none;
		border-radius: 0;
		text-align: left;
		cursor: pointer;
		color: var(--text-primary);
		font-size: 0.9rem;
	}

	.autocomplete-item:hover,
	.autocomplete-item.active {
		background: var(--bg-hover);
	}

	.ac-name {
		font-weight: 500;
		color: var(--text-primary);
	}

	.ac-genre {
		font-size: 0.75rem;
		color: var(--text-muted);
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
