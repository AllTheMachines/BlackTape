<script lang="ts">
	import type { BuyLink } from '$lib/affiliates/types';

	let { links }: { links: BuyLink[] } = $props();
</script>

<section class="buy-on">
	<span class="buy-label">Buy on</span>
	<div class="buy-links">
		{#each links as link (link.platform)}
			<a
				href={link.url}
				target="_blank"
				rel="noopener noreferrer"
				class="buy-link platform-{link.platform}"
				aria-label="{link.label}{link.isDirect ? '' : ' — search results'}"
			>
				{link.label}
				{#if !link.isDirect}
					<span
						class="search-indicator"
						title="Opens platform search — not a direct product page"
						aria-hidden="true"
					>?</span>
				{/if}
			</a>
		{/each}
	</div>
</section>

<style>
	.buy-on {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) 0;
		border-top: 1px solid var(--border-subtle);
	}

	.buy-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		white-space: nowrap;
		min-width: 4rem;
	}

	.buy-links {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.buy-link {
		font-size: 0.8rem;
		font-weight: 500;
		padding: 4px 10px;
		border-radius: 4px;
		text-decoration: none;
		background: var(--bg-elevated);
		border: 1px solid var(--border-default);
		color: var(--text-secondary);
		transition: border-color 0.15s, background 0.15s, color 0.15s;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.buy-link:hover {
		background: var(--bg-hover);
		color: var(--text-primary);
		text-decoration: none;
	}

	.search-indicator {
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--text-muted);
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: 50%;
		width: 14px;
		height: 14px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		cursor: help;
	}

	/* Subtle platform-specific accent colors */
	.platform-bandcamp:hover {
		border-color: var(--bandcamp-color);
		color: var(--bandcamp-color);
	}

	.platform-amazon:hover {
		border-color: #ff9900;
		color: #ff9900;
	}

	.platform-apple-music:hover {
		border-color: #fc3c44;
		color: #fc3c44;
	}

	.platform-beatport:hover {
		border-color: #01ff95;
		color: #01ff95;
	}

	.platform-discogs:hover {
		border-color: #333333;
		color: var(--text-primary);
	}

	@media (max-width: 600px) {
		.buy-on {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-sm);
		}

		.buy-links {
			gap: var(--space-xs);
		}
	}
</style>
