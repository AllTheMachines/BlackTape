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

	function handleSubmit(e: Event) {
		e.preventDefault();
		const trimmed = query.trim();
		if (!trimmed) return;
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
		/>
	</form>
</div>

<style>
	.search-bar {
		width: 100%;
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
</style>
