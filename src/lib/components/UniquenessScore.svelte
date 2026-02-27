<script lang="ts">
	/**
	 * Displays an artist's uniqueness score as a categorical label.
	 * Score is the raw value from getArtistUniquenessScore() (0.06–1000 range, * 1000 applied in query).
	 * Null score means no tags — badge is hidden.
	 */
	let { score, tagCount = 0 }: { score: number | null; tagCount?: number } = $props();

	type ScoreTier = {
		label: string;
		className: string;
		description: string;
	};

	function getScoreTier(s: number, tags: number): ScoreTier {
		// Thresholds calibrated against real tag_stats distribution (241K artists with tags):
		// Score = AVG(1 / tag_artist_count) * 1000
		// P25=0.36, P50=1.47, P75=8.4, P90=107, P95=334
		// Very Niche: top ~10% (score >= 100) — ultra-rare tag combinations
		// Niche: top ~25% (score 8–100) — uncommon genre profile
		// Eclectic: P25–P75 (score 0.36–8) — broad or mixed genre profile
		// Mainstream: bottom ~25% (score < 0.36) — common, well-tagged genres
		if (s >= 100) return { label: 'Very Niche', className: 'very-niche', description: 'Extremely rare tag combination' };
		if (s >= 8) return { label: 'Niche', className: 'niche', description: 'Uncommon genre profile' };
		if (s >= 0.36) return { label: 'Eclectic', className: 'eclectic', description: 'Broad genre profile' };
		return { label: 'Mainstream', className: 'mainstream', description: 'Widely tagged genres' };
	}

	let tier = $derived(score !== null && score > 0 ? getScoreTier(score, tagCount) : null);
</script>

{#if tier}
	<span class="uniqueness-badge {tier.className}" title={tier.description}>
		{tier.label}
	</span>
{/if}

<style>
	.uniqueness-badge {
		display: inline-block;
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 2px 7px;
		border-radius: 0;
		border: 1px solid currentColor;
		opacity: 0.9;
	}

	.very-niche {
		color: var(--text-accent);
		border-color: var(--text-accent);
		background: color-mix(in srgb, var(--text-accent) 10%, transparent);
	}

	.niche {
		color: #7dd3a8;
		border-color: #7dd3a8;
		background: color-mix(in srgb, #7dd3a8 10%, transparent);
	}

	.eclectic {
		color: var(--text-secondary);
		border-color: var(--border-default);
		background: transparent;
	}

	.mainstream {
		color: var(--text-muted);
		border-color: var(--border-subtle);
		background: transparent;
	}
</style>
