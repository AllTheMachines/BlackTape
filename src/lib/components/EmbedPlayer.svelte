<script lang="ts">
	import type { PlatformLinks, PlatformType } from '$lib/embeds/types';
	import { PLATFORM_PRIORITY } from '$lib/embeds/types';
	import { spotifyEmbedUrl } from '$lib/embeds/spotify';
	import { youtubeEmbedUrl, isYoutubeChannel } from '$lib/embeds/youtube';
	import ExternalLink from './ExternalLink.svelte';
	import { streamingPref } from '$lib/theme/preferences.svelte';
	import { onDestroy } from 'svelte';
	import { setActiveSource, clearActiveSource, type StreamingSource } from '$lib/player/streaming.svelte';

	let {
		links,
		soundcloudEmbedHtml,
		artistName  // NEW: passed from artist page for embed play attribution
	}: {
		links: PlatformLinks;
		soundcloudEmbedHtml?: string;
		artistName?: string;
	} = $props();

	/** Track which embeds the user has clicked to load. */
	let loadedEmbeds = $state<Record<string, boolean>>({});

	function revealEmbed(key: string) {
		loadedEmbeds[key] = true;
	}

	/** Maps embed origins to StreamingSource identifiers. */
	const EMBED_ORIGINS: Record<string, StreamingSource> = {
		'open.spotify.com': 'spotify',
		'www.youtube.com': 'youtube',
		'www.youtube-nocookie.com': 'youtube',
		'w.soundcloud.com': 'soundcloud',
		'bandcamp.com': 'bandcamp'
	};

	/**
	 * Detect whether a postMessage event represents playback starting.
	 * Schema is undocumented for Spotify; verified from community reports as of Feb 2026.
	 * YouTube schema from: https://developers.google.com/youtube/iframe_api_reference#Events
	 */
	function detectPlayEvent(data: unknown, source: StreamingSource): boolean {
		if (source === 'spotify') {
			if (typeof data === 'object' && data !== null) {
				const d = data as Record<string, unknown>;
				// Known Spotify embed event types as of Feb 2026 — verify in dev with console.log
				return d['type'] === 'playback_update' || d['type'] === 'player_state_changed';
			}
			return false;
		}
		if (source === 'youtube') {
			if (typeof data === 'string') {
				try {
					const d = JSON.parse(data) as Record<string, unknown>;
					return d['event'] === 'onStateChange' && d['info'] === 1; // 1 = playing
				} catch { return false; }
			}
			return false;
		}
		// SoundCloud handled by Widget API — not via postMessage
		return false;
	}

	/** Handle postMessage events from embed iframes. */
	function handleEmbedMessage(event: MessageEvent): void {
		let source: StreamingSource = null;
		try {
			const hostname = new URL(event.origin).hostname;
			// Check exact hostname match first, then youtube.com substring for nocookie variants
			source = EMBED_ORIGINS[hostname] ?? (hostname.includes('youtube.com') ? 'youtube' : null);
		} catch {
			return;
		}
		if (!source) return;

		const isPlay = detectPlayEvent(event.data, source);
		if (isPlay) {
			import('$lib/player/audio.svelte').then(({ pause }) => pause());
			setActiveSource(source);
		}
	}

	// Register postMessage listener on mount; clean up on destroy.
	if (typeof window !== 'undefined') {
		window.addEventListener('message', handleEmbedMessage);
	}

	/** Platform order respects user's streaming preference — preferred platform shown first. */
	let orderedPlatforms = $derived(
		streamingPref.platform
			? [streamingPref.platform, ...PLATFORM_PRIORITY.filter(p => p !== streamingPref.platform)] as PlatformType[]
			: PLATFORM_PRIORITY
	);

	// SoundCloud widget hook — runs after iframe is rendered
	async function hookSoundCloudWidget(containerEl: HTMLElement): Promise<void> {
		// Load SoundCloud Widget API (singleton — checks window.SC first)
		if (!(window as unknown as { SC?: unknown }).SC) {
			await new Promise<void>((resolve, reject) => {
				const script = document.createElement('script');
				script.src = 'https://w.soundcloud.com/player/api.js';
				script.onload = () => resolve();
				script.onerror = () => reject(new Error('SC Widget API failed to load'));
				document.head.appendChild(script);
			});
		}

		type SCWidget = {
			bind: (event: string, handler: (...args: unknown[]) => void) => void;
		};
		type SCWidgetConstructor = ((iframe: HTMLIFrameElement) => SCWidget) & {
			Events: { PLAY: string; PLAY_PROGRESS: string };
		};
		const sc = (window as unknown as { SC: { Widget: SCWidgetConstructor } }).SC;

		const iframe = containerEl.querySelector('iframe') as HTMLIFrameElement | null;
		if (!iframe) return;

		const widget = sc.Widget(iframe);
		let progressFired = false;

		widget.bind(sc.Widget.Events.PLAY, () => {
			progressFired = false;  // reset on new play start
			// Audio coordination: pause local playback, set active source
			import('$lib/player/audio.svelte').then(({ pause }) => pause());
			import('$lib/player/streaming.svelte').then(({ setActiveSource }) => setActiveSource('soundcloud'));
		});

		widget.bind(sc.Widget.Events.PLAY_PROGRESS, (data: unknown) => {
			const pos = (data as { relativePosition: number }).relativePosition;
			if (!progressFired && pos >= 0.70) {
				progressFired = true;
				// Fire-and-forget: record embed play
				import('$lib/player/playback.svelte').then(({ recordEmbedPlay }) => {
					recordEmbedPlay({ artistName: artistName ?? null });
				});
			}
		});
	}

	$effect(() => {
		// After any SC embed is revealed, attempt to hook the widget
		for (const [key, loaded] of Object.entries(loadedEmbeds)) {
			if (loaded && key.startsWith('sc-')) {
				// Find the SC embed container
				const containers = document.querySelectorAll('.sc-embed-container');
				containers.forEach((el) => {
					if (!(el as HTMLElement).dataset.hooked) {
						(el as HTMLElement).dataset.hooked = 'true';
						hookSoundCloudWidget(el as HTMLElement).catch(() => {
							// Best-effort — SC Widget API may fail in some contexts
						});
					}
				});
			}
		}
	});

	// Hook SC widget on mount if soundcloudEmbedHtml is already set (non-click-to-load path)
	$effect(() => {
		if (soundcloudEmbedHtml) {
			// Use setTimeout to ensure the DOM has rendered the injected HTML
			setTimeout(() => {
				const containers = document.querySelectorAll('.sc-embed-container');
				containers.forEach((el) => {
					if (!(el as HTMLElement).dataset.hooked) {
						(el as HTMLElement).dataset.hooked = 'true';
						hookSoundCloudWidget(el as HTMLElement).catch(() => {
							// Best-effort — SC Widget API may fail in some contexts
						});
					}
				});
			}, 500);
		}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('message', handleEmbedMessage);
		}
		clearActiveSource();
	});
</script>

<div class="embed-player">
	{#each orderedPlatforms as platform}
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
						<div class="iframe-wrap soundcloud-embed sc-embed-container">
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
