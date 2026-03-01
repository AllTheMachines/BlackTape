<script lang="ts">
	import type { ReleaseGroup, PlatformType } from '$lib/embeds/types';
	import CoverPlaceholder from './CoverPlaceholder.svelte';
	import { spotifyEmbedUrl } from '$lib/embeds/spotify';
	import { youtubeEmbedUrl } from '$lib/embeds/youtube';
	import { getWikiThumbnail } from '$lib/wiki-thumbnail';
	import { coverPool } from '$lib/cover-pool.svelte';

	let {
		release,
		artistSlug,
		artistName = '',
		onplayinline
	}: {
		release: ReleaseGroup;
		artistSlug: string;
		artistName?: string;
		onplayinline?: (embedHtml: string) => void;
	} = $props();

	let releaseHref = $derived(`/artist/${artistSlug}/release/${release.mbid}`);

	let coverError = $state(false);

	// Fetch the artist's Wikipedia thumbnail eagerly — cached, so one network
	// request per artist name regardless of how many cards are on the page.
	// Ready by the time cover art fails (or immediately if coverArtUrl is null).
	let artistThumb = $state<string | null>(null);

	$effect(() => {
		if (artistName) {
			getWikiThumbnail(artistName).then(url => {
				artistThumb = url;
			});
		}
	});

	/** First letter of release title for placeholder. */
	let initial = $derived(release.title.charAt(0).toUpperCase());

	/** Type badge color class. */
	let typeClass = $derived(
		release.type === 'Album' ? 'badge-album' :
		release.type === 'EP' ? 'badge-ep' :
		release.type === 'Single' ? 'badge-single' : 'badge-other'
	);

	const PLATFORM_ICONS: Record<PlatformType, string> = {
		bandcamp: 'BC',
		spotify: 'SP',
		soundcloud: 'SC',
		youtube: 'YT'
	};

	const PLATFORM_LABELS: Record<PlatformType, string> = {
		bandcamp: 'Bandcamp',
		spotify: 'Spotify',
		soundcloud: 'SoundCloud',
		youtube: 'YouTube'
	};

	async function handleLinkClick(e: MouseEvent, url: string, platform: PlatformType) {
		// Bandcamp and Spotify open in new tab
		if (platform === 'bandcamp' || platform === 'spotify') {
			return; // default <a> behavior
		}

		// SoundCloud and YouTube expand inline
		e.preventDefault();

		if (platform === 'youtube') {
			const embed = youtubeEmbedUrl(url);
			if (embed && onplayinline) {
				onplayinline(`<iframe src="${embed}" width="100%" height="300" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy" title="YouTube player – ${release.title}"></iframe>`);
			}
		} else if (platform === 'soundcloud') {
			// Fetch oEmbed via our proxy
			try {
				const resp = await fetch(`/api/soundcloud-oembed?url=${encodeURIComponent(url)}`);
				if (resp.ok) {
					const data = await resp.json() as { html: string | null };
					if (data.html && onplayinline) {
						onplayinline(data.html);
					}
				}
			} catch {
				// Fall back to opening in new tab
				window.open(url, '_blank', 'noopener,noreferrer');
			}
		}
	}
</script>

<div class="release-card">
	<a href={releaseHref} class="cover-art-link" aria-label="View {release.title} details">
		<div class="cover-art">
			{#if !coverError && release.coverArtUrl}
				<img
					src={release.coverArtUrl}
					alt="{release.title} cover art"
					loading="lazy"
					onerror={() => coverError = true}
					onload={() => coverPool.register(release.coverArtUrl)}
				/>
			{:else}
				<CoverPlaceholder name={release.title} sources={artistThumb ? [artistThumb] : []} />
			{/if}
		</div>
	</a>

	<div class="release-info">
		<a href={releaseHref} class="release-title-link">
			<span class="release-title">{release.title}</span>
		</a>
		<div class="release-meta">
			{#if release.year}
				<span class="release-year">{release.year}</span>
			{/if}
			<span class="type-badge {typeClass}">{release.type}</span>
		</div>

		{#if release.links.length > 0}
			<div class="release-links">
				{#each release.links as link}
					<a
						href={link.url}
						target="_blank"
						rel="noopener noreferrer"
						class="release-link platform-{link.platform}"
						title="{PLATFORM_LABELS[link.platform]}"
						onclick={(e) => handleLinkClick(e, link.url, link.platform)}
					>
						{PLATFORM_ICONS[link.platform]}
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.release-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		width: 100%;
		min-width: 0;
	}

	.cover-art-link {
		display: block;
		text-decoration: none;
		color: inherit;
	}

	.cover-art-link:hover {
		text-decoration: none;
	}

	.release-title-link {
		display: block;
		overflow: hidden;
		text-decoration: none;
		color: inherit;
	}

	.release-title-link:hover .release-title {
		color: var(--text-primary);
		text-decoration: none;
	}

	.cover-art {
		width: 100%;
		aspect-ratio: 1;
		border-radius: 0;
		overflow: hidden;
		background: var(--bg-elevated);
		border: 1px solid var(--border-subtle);
	}

	.cover-art img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}


	.release-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.release-title {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.release-meta {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.release-year {
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.type-badge {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 1px 5px;
		border-radius: 0;
		background: var(--bg-hover);
		color: var(--text-secondary);
	}

	.badge-album {
		background: color-mix(in srgb, var(--link-color) 15%, transparent);
		color: var(--link-color);
	}

	.badge-ep {
		background: color-mix(in srgb, var(--spotify-color) 15%, transparent);
		color: var(--spotify-color);
	}

	.badge-single {
		background: color-mix(in srgb, var(--soundcloud-color) 15%, transparent);
		color: var(--soundcloud-color);
	}

	.release-links {
		display: flex;
		gap: var(--space-xs);
		margin-top: 2px;
	}

	.release-link {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: 0;
		text-decoration: none;
		background: var(--bg-elevated);
		border: 1px solid var(--border-default);
		transition: border-color 0.15s, background 0.15s;
	}

	.release-link:hover {
		text-decoration: none;
		background: var(--bg-hover);
	}

	.platform-bandcamp {
		color: var(--bandcamp-color);
		border-color: color-mix(in srgb, var(--bandcamp-color) 30%, transparent);
	}
	.platform-bandcamp:hover {
		border-color: var(--bandcamp-color);
	}

	.platform-spotify {
		color: var(--spotify-color);
		border-color: color-mix(in srgb, var(--spotify-color) 30%, transparent);
	}
	.platform-spotify:hover {
		border-color: var(--spotify-color);
	}

	.platform-soundcloud {
		color: var(--soundcloud-color);
		border-color: color-mix(in srgb, var(--soundcloud-color) 30%, transparent);
	}
	.platform-soundcloud:hover {
		border-color: var(--soundcloud-color);
	}

	.platform-youtube {
		color: var(--youtube-color);
		border-color: color-mix(in srgb, var(--youtube-color) 30%, transparent);
	}
	.platform-youtube:hover {
		border-color: var(--youtube-color);
	}

</style>
