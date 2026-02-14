<script lang="ts">
	import { PROJECT_NAME, PROJECT_TAGLINE } from '$lib/config';
</script>

<svelte:head>
	<title>{PROJECT_NAME}</title>
	<meta name="description" content={PROJECT_TAGLINE} />
</svelte:head>

<main>
	<div class="hero">
		<h1>{PROJECT_NAME}</h1>
		<p class="tagline">{PROJECT_TAGLINE}</p>

		<div class="search-container">
			<input
				type="search"
				placeholder="Search artists, releases, tags..."
				disabled
				aria-label="Search"
			/>
			<p class="search-hint">Coming soon. Indexing 2.6 million artists from open databases.</p>
		</div>
	</div>
</main>

<style>
	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
		background: #0a0a0a;
		color: #e0e0e0;
		min-height: 100vh;
	}

	main {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		padding: 2rem;
	}

	.hero {
		text-align: center;
		max-width: 600px;
	}

	h1 {
		font-size: 3.5rem;
		font-weight: 300;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		margin: 0 0 0.5rem;
		color: #fff;
	}

	.tagline {
		font-size: 1.1rem;
		color: #888;
		margin: 0 0 3rem;
		font-weight: 300;
	}

	.search-container {
		width: 100%;
	}

	input[type='search'] {
		width: 100%;
		padding: 1rem 1.5rem;
		font-size: 1.1rem;
		background: #141414;
		border: 1px solid #2a2a2a;
		border-radius: 8px;
		color: #666;
		outline: none;
		box-sizing: border-box;
		transition: border-color 0.2s;
	}

	input[type='search']:hover {
		border-color: #3a3a3a;
	}

	.search-hint {
		font-size: 0.85rem;
		color: #555;
		margin-top: 1rem;
	}
</style>
