<script lang="ts">
	import type { PlatformLinks } from '$lib/embeds/types';
	import { PLATFORM_PRIORITY } from '$lib/embeds/types';
	import { spotifyEmbedUrl } from '$lib/embeds/spotify';
	import { youtubeEmbedUrl, isYoutubeChannel } from '$lib/embeds/youtube';
	import ExternalLink from './ExternalLink.svelte';

	let {
		links,
		soundcloudEmbedHtml
	}: {
		links: PlatformLinks;
		soundcloudEmbedHtml?: string;
	} = $props();

	/** Track which embeds the user has clicked to load. */
	let loadedEmbeds = $state<Record<string, boolean>>({});

	function revealEmbed(key: string) {
		loadedEmbeds[key] = true;
	}
</script>

<div class="embed-player">
	{#each PLATFORM_PRIORITY as platform}
		{@const urls = links[platform]}
		{#if urls.length > 0}
			<div class="platform-section">
				{#if platform === 'bandcamp'}
					{#each urls as url}
						<ExternalLink {url} platform="bandcamp" />
					{/each}

				{:else if platform === 'spotify'}
					{#each urls as url}
						{@const embed = spotifyEmbedUrl(url)}
						{#if embed}
							{@const key = `spotify-${url}`}
							{#if loadedEmbeds[key]}
								<div class="iframe-wrap">
									<iframe
										src={embed}
										width="100%"
										height="352"
										frameborder="0"
										allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
										loading="lazy"
										title="Spotify player"
									></iframe>
								</div>
							{:else}
								<button class="embed-trigger platform-spotify" onclick={() => revealEmbed(key)}>
									Play on Spotify
								</button>
							{/if}
							<ExternalLink {url} platform="spotify" label="Open in Spotify" />
						{:else}
							<ExternalLink {url} platform="spotify" />
						{/if}
					{/each}

				{:else if platform === 'soundcloud'}
					{#if soundcloudEmbedHtml}
						<div class="iframe-wrap soundcloud-embed">
							{@html soundcloudEmbedHtml}
						</div>
					{:else}
						{#each urls as url}
							<ExternalLink {url} platform="soundcloud" />
						{/each}
					{/if}

				{:else if platform === 'youtube'}
					{#each urls as url}
						{@const embed = youtubeEmbedUrl(url)}
						{#if embed}
							{@const key = `youtube-${url}`}
							{#if loadedEmbeds[key]}
								<div class="iframe-wrap video-wrap">
									<iframe
										src={embed}
										width="100%"
										height="100%"
										frameborder="0"
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
										allowfullscreen
										loading="lazy"
										title="YouTube player"
									></iframe>
								</div>
							{:else}
								<button class="embed-trigger platform-youtube" onclick={() => revealEmbed(key)}>
									Play on YouTube
								</button>
							{/if}
						{:else if isYoutubeChannel(url)}
							<ExternalLink {url} platform="youtube" label="Visit YouTube Channel" />
						{:else}
							<ExternalLink {url} platform="youtube" />
						{/if}
					{/each}
				{/if}
			</div>
		{/if}
	{/each}
</div>

<style>
	.embed-player {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.platform-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.iframe-wrap {
		width: 100%;
		border: 1px solid var(--border-subtle);
		border-radius: var(--card-radius);
		overflow: hidden;
	}

	.iframe-wrap iframe {
		display: block;
	}

	.video-wrap {
		position: relative;
		padding-bottom: 56.25%; /* 16:9 aspect ratio */
		height: 0;
	}

	.video-wrap iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	/* SoundCloud oEmbed HTML sometimes includes its own iframe */
	.soundcloud-embed :global(iframe) {
		width: 100% !important;
		border: none;
	}

	.embed-trigger {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: var(--space-md) var(--space-lg);
		background: var(--bg-elevated);
		border: 1px solid var(--border-default);
		border-radius: var(--card-radius);
		color: var(--text-primary);
		font-size: 0.95rem;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.embed-trigger:hover {
		background: var(--bg-hover);
		border-color: var(--border-hover);
	}

	.embed-trigger.platform-spotify {
		border-color: color-mix(in srgb, var(--spotify-color) 40%, transparent);
		color: var(--spotify-color);
	}
	.embed-trigger.platform-spotify:hover {
		border-color: var(--spotify-color);
	}

	.embed-trigger.platform-youtube {
		border-color: color-mix(in srgb, var(--youtube-color) 40%, transparent);
		color: var(--youtube-color);
	}
	.embed-trigger.platform-youtube:hover {
		border-color: var(--youtube-color);
	}
</style>
