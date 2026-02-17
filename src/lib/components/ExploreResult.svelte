<script lang="ts">
	let {
		number,
		artistName,
		description,
		slug
	}: {
		number: number;
		artistName: string;
		description: string;
		slug: string | null;
	} = $props();
</script>

<div class="explore-result">
	<span class="result-number">{number}.</span>
	<div class="result-content">
		<div class="result-header">
			{#if slug}
				<a href="/artist/{slug}" class="artist-name linked">{artistName}</a>
			{:else}
				<span class="artist-name plain">{artistName}</span>
			{/if}
		</div>
		<p class="result-description">{description}</p>
	</div>
</div>

<style>
	.explore-result {
		display: flex;
		align-items: flex-start;
		gap: var(--space-md);
		padding: var(--space-md) 0;
		border-bottom: 1px solid var(--border-subtle);
	}

	.explore-result:last-child {
		border-bottom: none;
	}

	.result-number {
		font-size: 1.4rem;
		font-weight: 600;
		color: var(--text-muted);
		font-feature-settings: 'tnum';
		font-variant-numeric: tabular-nums;
		min-width: 2rem;
		text-align: right;
		line-height: 1.65;
		flex-shrink: 0;
	}

	.result-content {
		flex: 1;
		min-width: 0;
	}

	.result-header {
		margin-bottom: var(--space-xs);
	}

	.artist-name {
		font-size: 1.1rem;
		font-weight: 600;
		line-height: 1.65;
	}

	.artist-name.linked {
		color: var(--text-accent);
		text-decoration: none;
	}

	.artist-name.linked:hover {
		text-decoration: underline;
	}

	.artist-name.plain {
		color: var(--text-primary);
	}

	.result-description {
		font-size: 0.9rem;
		color: var(--text-secondary);
		line-height: 1.65;
		margin: 0;
	}
</style>
