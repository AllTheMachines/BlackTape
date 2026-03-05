<script lang="ts">
	import { isTauri } from '$lib/platform';
	import { tasteProfile } from '$lib/taste/profile.svelte';

	let { mbid, releaseName, artistName, artistSlug }: {
		mbid: string;
		releaseName: string;
		artistName: string;
		artistSlug: string;
	} = $props();

	let tauriMode = $state(false);
	let toggling = $state(false);

	// Reactive — always reflects actual tasteProfile state
	let favorited = $derived(tasteProfile.favoriteReleases.some(r => r.release_mbid === mbid));

	$effect(() => {
		tauriMode = isTauri();
	});

	async function toggle() {
		if (toggling) return;
		toggling = true;
		try {
			const { addFavoriteRelease, removeFavoriteRelease } = await import('$lib/taste/favorites');
			if (favorited) {
				await removeFavoriteRelease(mbid);
			} else {
				await addFavoriteRelease(mbid, releaseName, artistName, artistSlug);
			}
		} catch (err) {
			console.error('Failed to toggle release favorite:', err);
		} finally {
			toggling = false;
		}
	}
</script>

{#if tauriMode}
	<button
		class="favorite-btn"
		class:favorited
		onclick={toggle}
		disabled={toggling}
		title={favorited ? 'Remove from favorites' : 'Add to favorites'}
		aria-label={favorited ? `Remove ${releaseName} from favorites` : `Add ${releaseName} to favorites`}
	>
		<svg width="18" height="18" viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2">
			<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
		</svg>
	</button>
{/if}

<style>
	.favorite-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		padding: 4px;
		cursor: pointer;
		color: var(--text-muted);
		border-radius: 0;
		transition: color 0.2s, transform 0.15s;
	}

	.favorite-btn:hover {
		color: var(--text-accent);
		transform: scale(1.1);
	}

	.favorite-btn.favorited {
		color: var(--text-accent);
	}

	.favorite-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>
