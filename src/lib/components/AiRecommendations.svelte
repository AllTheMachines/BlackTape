<script lang="ts">
	import { onMount } from 'svelte';
	import { getAiProvider } from '$lib/ai/engine';
	import { PROMPTS } from '$lib/ai/prompts';
	import { tasteProfile } from '$lib/taste/profile.svelte';

	let {
		artistName,
		artistTags,
		artistMbid
	}: { artistName: string; artistTags: string; artistMbid: string } = $props();

	/** Recommended artist — either matched in DB (with slug) or plain text */
	interface RecommendedArtist {
		name: string;
		slug: string | null;
	}

	let recommendations = $state<RecommendedArtist[]>([]);
	let isLoading = $state(false);
	let shouldShow = $state(false);

	/** Session-level cache: artistMbid -> recommendations */
	const cache = new Map<string, RecommendedArtist[]>();

	onMount(() => {
		const provider = getAiProvider();
		if (!provider || !tasteProfile.hasEnoughData) return;

		shouldShow = true;
		loadRecommendations();
	});

	async function loadRecommendations() {
		// Check cache first
		const cached = cache.get(artistMbid);
		if (cached) {
			recommendations = cached;
			return;
		}

		isLoading = true;

		try {
			const provider = getAiProvider();
			if (!provider) return;

			// Build taste description from top 10 tags by weight
			const tasteDescription = tasteProfile.tags
				.sort((a, b) => b.weight - a.weight)
				.slice(0, 10)
				.map((t) => t.tag)
				.join(', ');

			const response = await provider.complete(
				PROMPTS.recommendation(artistName, tasteDescription),
				{ temperature: 0.7, maxTokens: 200 }
			);

			// Parse response: one artist name per line, strip numbering/descriptions
			const artistNames = response
				.split('\n')
				.map((line) => line.replace(/^\d+[\.\)\-]\s*/, '').trim())
				.filter((line) => line.length > 0 && line.length < 100);

			if (artistNames.length === 0) {
				shouldShow = false;
				return;
			}

			// Try to match each name in mercury.db
			const results: RecommendedArtist[] = [];

			for (const recName of artistNames) {
				try {
					const { getProvider } = await import('$lib/db/provider');
					const { searchArtists } = await import('$lib/db/queries');

					const db = await getProvider();
					const matches = await searchArtists(db, recName, 3);

					// Find exact or close match
					const exact = matches.find(
						(m) => m.name.toLowerCase() === recName.toLowerCase()
					);

					if (exact) {
						results.push({ name: exact.name, slug: exact.slug });
					} else {
						results.push({ name: recName, slug: null });
					}
				} catch {
					results.push({ name: recName, slug: null });
				}
			}

			recommendations = results;
			cache.set(artistMbid, results);
		} catch (err) {
			console.error('Recommendation generation failed:', err);
			shouldShow = false;
		} finally {
			isLoading = false;
		}
	}
</script>

{#if shouldShow}
	<section class="recommendations">
		<h2 class="section-title">You might also like</h2>

		{#if isLoading}
			<div class="skeleton-list">
				<div class="skeleton-line"></div>
				<div class="skeleton-line"></div>
				<div class="skeleton-line"></div>
			</div>
		{:else if recommendations.length > 0}
			<div class="rec-list">
				{#each recommendations as rec}
					{#if rec.slug}
						<a href="/artist/{rec.slug}" class="rec-artist rec-link">{rec.name}</a>
					{:else}
						<span class="rec-artist rec-plain">{rec.name}</span>
					{/if}
				{/each}
			</div>
		{/if}
	</section>
{/if}

<style>
	.recommendations {
		display: flex;
		flex-direction: column;
	}

	.section-title {
		font-size: 1.1rem;
		font-weight: 500;
		color: var(--text-accent);
		margin: 0 0 var(--space-md);
		letter-spacing: 0.02em;
	}

	/* Skeleton loading */
	.skeleton-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.skeleton-line {
		height: 1.1rem;
		background: var(--bg-elevated);
		border-radius: 0;
		animation: skeleton-pulse 1.5s ease-in-out infinite;
	}

	.skeleton-line:nth-child(1) { width: 45%; }
	.skeleton-line:nth-child(2) { width: 55%; }
	.skeleton-line:nth-child(3) { width: 40%; }

	@keyframes skeleton-pulse {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 0.8; }
	}

	/* Recommendation list */
	.rec-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.rec-artist {
		font-size: 0.95rem;
		line-height: 1.6;
	}

	.rec-link {
		color: var(--text-primary);
		text-decoration: none;
		transition: color 0.15s;
	}

	.rec-link:hover {
		color: var(--text-accent);
		text-decoration: underline;
	}

	.rec-plain {
		color: var(--text-secondary);
	}
</style>
