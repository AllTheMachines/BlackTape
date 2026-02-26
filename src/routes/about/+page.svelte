<script lang="ts">
	import { PROJECT_NAME, PROJECT_TAGLINE } from '$lib/config';
</script>

<svelte:head>
	<title>About — {PROJECT_NAME}</title>
</svelte:head>

<div class="about-page">
	<div class="about-header">
		<h1>About {PROJECT_NAME}</h1>
		<p class="tagline">{PROJECT_TAGLINE}</p>
	</div>

	<section class="about-section">
		<h2>What {PROJECT_NAME} is</h2>
		<p>A music search engine with taste. {PROJECT_NAME} indexes artists from open databases, embeds players from wherever music already lives, and lets you discover through atomic tags. The more niche you are, the more discoverable you become.</p>
	</section>

	<section class="about-section">
		<h2>How it works</h2>
		<p>Search by artist name or tag. Intersect tags to drill into specificity. Click into genres to explore scenes, movements, and their connections. Niche artists surface first — generic artists sink. Discovery rewards depth.</p>
	</section>

	<section class="about-section">
		<h2>Why it exists</h2>
		<p>Streaming algorithms optimize for engagement, not discovery. The underground is invisible. {PROJECT_NAME} is built on the premise that the most interesting music is the least played, and a good discovery engine should surface it — not bury it.</p>
	</section>

	<section class="about-section">
		<h2>Mission</h2>
		<p>No tracking. No ads. No algorithmic manipulation. No audio hosting. A pure discovery tool — open source, public good, free forever. The community decides what happens next.</p>
	</section>

	<section class="about-section">
		<h2>Data sources</h2>
		<p>Artist data comes from <a href="https://musicbrainz.org" target="_blank" rel="noopener">MusicBrainz</a> (2.6M+ artists, CC0 public domain) and genre/scene data from <a href="https://www.wikidata.org" target="_blank" rel="noopener">Wikidata</a>. Release data fetched live from the MusicBrainz API. No proprietary data, no locked-in sources.</p>
	</section>

	<section id="support" class="about-section about-support-section">
		<h2>Support</h2>
		<p>BlackTape runs on no ads, no tracking, no VC money — just people who care about music.</p>
		<div class="support-links-row">
			<!-- TODO: Replace placeholder URLs with real account URLs when Mercury's accounts are created -->
			<a href="https://ko-fi.com/mercury" target="_blank" rel="noopener noreferrer" class="support-link-item">Ko-fi</a>
			<a href="https://github.com/sponsors/mercury" target="_blank" rel="noopener noreferrer" class="support-link-item">GitHub Sponsors</a>
			<a href="https://opencollective.com/mercury" target="_blank" rel="noopener noreferrer" class="support-link-item">Open Collective</a>
		</div>
		<a href="/backers" class="view-backers-link">View backers →</a>
	</section>

	<div class="about-ctas">
		<a href="/" class="cta-primary">Start discovering &rarr;</a>
		<a href="https://github.com/[your-repo]" target="_blank" rel="noopener" class="cta-secondary">GitHub</a>
	</div>
</div>

<style>
	.about-page {		padding: 20px;
	}

	.about-header {
		margin-bottom: var(--space-xl, 2rem);
	}

	.about-header h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--t-1);
		margin: 0 0 var(--space-xs, 0.25rem) 0;
	}

	.tagline {
		font-size: 0.9rem;
		color: var(--t-3);
		margin: 0;
	}

	.about-section {
		padding-top: var(--space-lg, 1.5rem);
		border-top: 1px solid var(--b-1);
		margin-top: var(--space-lg, 1.5rem);
	}

	.about-section h2 {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--t-2);
		margin: 0 0 var(--space-sm, 0.5rem) 0;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.about-section p {
		font-size: 0.9rem;
		color: var(--t-3);
		line-height: 1.7;
		margin: 0;
	}

	.about-section a {
		color: var(--acc);
		text-decoration: none;
	}

	.about-section a:hover {
		text-decoration: underline;
	}

	.about-ctas {
		display: flex;
		gap: var(--space-md, 1rem);
		margin-top: var(--space-xl, 2rem);
		padding-top: var(--space-lg, 1.5rem);
		border-top: 1px solid var(--b-1);
	}

	.cta-primary {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--acc);
		text-decoration: none;
		padding: var(--space-sm, 0.5rem) var(--space-md, 1rem);
		border: 1px solid var(--acc);
		border-radius: 4px;
		transition: background 0.15s, color 0.15s;
	}

	.cta-primary:hover {
		background: var(--acc);
		color: var(--bg-base, #0a0a0a);
	}

	.cta-secondary {
		font-size: 0.85rem;
		color: var(--t-3);
		text-decoration: none;
		padding: var(--space-sm, 0.5rem) var(--space-md, 1rem);
		border: 1px solid var(--b-1);
		border-radius: 4px;
		transition: color 0.15s, border-color 0.15s;
	}

	.cta-secondary:hover {
		color: var(--t-2);
		border-color: var(--t-3);
	}

	.support-links-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm, 0.5rem);
		margin-top: var(--space-sm, 0.5rem);
		margin-bottom: var(--space-sm, 0.5rem);
	}

	.support-link-item {
		font-size: 0.85rem;
		color: var(--acc);
		text-decoration: none;
		padding: 0.25rem 0.6rem;
		border: 1px solid color-mix(in srgb, var(--acc) 40%, transparent);
		border-radius: 4px;
		transition: background 0.15s, color 0.15s;
	}

	.support-link-item:hover {
		background: color-mix(in srgb, var(--acc) 15%, transparent);
	}

	.view-backers-link {
		font-size: 0.85rem;
		color: var(--t-3);
		text-decoration: none;
		display: inline-block;
		margin-top: var(--space-xs, 0.25rem);
	}

	.view-backers-link:hover {
		color: var(--t-2);
		text-decoration: underline;
	}
</style>
