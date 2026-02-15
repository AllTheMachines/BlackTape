<script lang="ts">
	import { PROJECT_NAME, PROJECT_TAGLINE } from '$lib/config';
	import SearchBar from '$lib/components/SearchBar.svelte';
</script>

<svelte:head>
	<title>{PROJECT_NAME}</title>
	<meta name="description" content={PROJECT_TAGLINE} />
</svelte:head>

<div class="hero">
	<h1>{PROJECT_NAME}</h1>
	<p class="tagline">{PROJECT_TAGLINE}</p>

	<div class="search-container">
		<SearchBar size="large" />
	</div>
</div>

<style>
	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: calc(100vh - var(--header-height));
		padding: var(--space-xl);
		text-align: center;
	}

	h1 {
		font-size: 3.5rem;
		font-weight: 300;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		margin: 0 0 var(--space-sm);
		color: var(--text-accent);
	}

	.tagline {
		font-size: 1.1rem;
		color: var(--text-secondary);
		margin: 0 0 var(--space-2xl);
		font-weight: 300;
	}

	.search-container {
		width: 100%;
		max-width: 560px;
	}

	@media (max-width: 600px) {
		h1 {
			font-size: 2.2rem;
		}

		.tagline {
			font-size: 0.95rem;
		}
	}
</style>
