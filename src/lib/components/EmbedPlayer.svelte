<script lang="ts">
	import type { PlatformLinks, PlatformType } from '$lib/embeds/types';
	import { spotifyEmbedUrl } from '$lib/embeds/spotify';
	import { youtubeEmbedUrl, isYoutubeChannel } from '$lib/embeds/youtube';
	import ExternalLink from './ExternalLink.svelte';
	import { onDestroy } from 'svelte';
	import { streamingState, setActiveSource, clearActiveSource, type StreamingSource } from '$lib/player/streaming.svelte';
	import { spotifyState } from '$lib/spotify/state.svelte';

	let {
		links,
		soundcloudEmbedHtml,
		artistName,
		autoLoad = false,
		activeService = null
	}: {
		links: PlatformLinks;
		soundcloudEmbedHtml?: string;
		artistName?: string;
		autoLoad?: boolean;
		activeService?: PlatformType | null;
	} = $props();

	/** Track which embeds the user has clicked to load. */
	let loadedEmbeds = $state<Record<string, boolean>>({});

	/** Spotify Connect state — one per URL key. */
	let spotifyConnectState = $state<Record<string, 'idle' | 'loading' | 'playing' | 'error'>>({});
	let spotifyConnectError = $state<Record<string, string>>({});

	async function playOnSpotifyDesktop(url: string) {
		const key = `spotify-${url}`;
		spotifyConnectState[key] = 'loading';
		spotifyConnectError[key] = '';
		try {
			const { extractSpotifyArtistId, extractSpotifyAlbumId, getArtistTopTracks, playTracksOnSpotify, playAlbumOnSpotify } = await import('$lib/spotify/api');
			const { getValidAccessToken } = await import('$lib/spotify/auth');
			const token = await getValidAccessToken();

			const albumId = extractSpotifyAlbumId(url);
			if (albumId) {
				// Release page: play the full album as context
				const result = await playAlbumOnSpotify(albumId, token);
				if (result === 'ok') { spotifyConnectState[key] = 'playing'; }
				else if (result === 'no_device') { spotifyConnectState[key] = 'error'; spotifyConnectError[key] = 'Open Spotify Desktop and start playing anything, then try again.'; }
				else if (result === 'premium_required') { spotifyConnectState[key] = 'error'; spotifyConnectError[key] = 'Spotify Premium is required.'; }
				else if (result === 'token_expired') { spotifyConnectState[key] = 'error'; spotifyConnectError[key] = 'Spotify session expired — reconnect in Settings.'; }
				return;
			}

			const artistId = extractSpotifyArtistId(url);
			if (artistId) {
				// Artist page (via EmbedPlayer): play top tracks
				const trackUris = await getArtistTopTracks(artistId, token);
				const result = await playTracksOnSpotify(trackUris, token);
				if (result === 'ok') { spotifyConnectState[key] = 'playing'; }
				else if (result === 'no_device') { spotifyConnectState[key] = 'error'; spotifyConnectError[key] = 'Open Spotify Desktop and start playing anything, then try again.'; }
				else if (result === 'premium_required') { spotifyConnectState[key] = 'error'; spotifyConnectError[key] = 'Spotify Premium is required.'; }
				else if (result === 'token_expired') { spotifyConnectState[key] = 'error'; spotifyConnectError[key] = 'Spotify session expired — reconnect in Settings.'; }
				return;
			}

			spotifyConnectState[key] = 'error';
			spotifyConnectError[key] = 'Could not find this release on Spotify.';
		} catch {
			spotifyConnectState[key] = 'error';
			spotifyConnectError[key] = 'Could not connect to Spotify.';
		}
	}

	function revealEmbed(key: string) {
		loadedEmbeds[key] = true;
	}

	/** Platform order respects user's service order from streamingState. */
	let orderedPlatforms = $derived(
		streamingState.serviceOrder.filter(s =>
			['bandcamp', 'spotify', 'soundcloud', 'youtube'].includes(s)
		) as PlatformType[]
	);

	/** The active platform: parent override first, then first platform with links. */
	let activePlatform = $derived(
		activeService
			?? (orderedPlatforms.find(p => (links[p] ?? []).length > 0) as PlatformType | undefined)
			?? null
	);

	/** SoundCloud widget ref — stored so we can call .pause() on source change. */
	let scWidget = $state<{ pause: () => void; bind: (event: string, handler: (...args: unknown[]) => void) => void } | null>(null);

	/** YouTube Error 153 (or 100/101/150) — video not embeddable. */
	let youtubeError = $state(false);

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

	/**
	 * Detect YouTube embed errors from postMessage data.
	 * 100=not found, 101/150=embedding disabled by uploader, 153=config/policy error
	 */
	function detectYouTubeError(data: unknown): boolean {
		if (typeof data === 'string') {
			try {
				const d = JSON.parse(data) as Record<string, unknown>;
				return d['event'] === 'onError' && [100, 101, 150, 153].includes(Number(d['info']));
			} catch { return false; }
		}
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

		if (source === 'youtube' && detectYouTubeError(event.data)) {
			youtubeError = true;
		}
	}

	// Register postMessage listener on mount; clean up on destroy.
	if (typeof window !== 'undefined') {
		window.addEventListener('message', handleEmbedMessage);
	}

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
			pause: () => void;
		};
		type SCWidgetConstructor = ((iframe: HTMLIFrameElement) => SCWidget) & {
			Events: { PLAY: string; PLAY_PROGRESS: string };
		};
		const sc = (window as unknown as { SC: { Widget: SCWidgetConstructor } }).SC;

		const iframe = containerEl.querySelector('iframe') as HTMLIFrameElement | null;
		if (!iframe) return;

		const widget = sc.Widget(iframe);
		// Store widget ref so we can call pause() when another source becomes active
		scWidget = widget as typeof scWidget;

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

	// Pause SoundCloud when another source becomes active
	$effect(() => {
		if (streamingState.activeSource !== 'soundcloud' && scWidget) {
			try { scWidget.pause(); } catch { /* SC Widget may not be bound yet */ }
		}
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('message', handleEmbedMessage);
		}
		// Only clear if this EmbedPlayer's service was the active one.
		// If source was switched via {#key} remount, the new EmbedPlayer already
		// called setActiveSource — don't clobber it.
		const myService = activePlatform;
		if (myService && streamingState.activeSource === myService) {
			clearActiveSource();
		} else if (!myService) {
			clearActiveSource();
		}
	});
</script>

<div class="embed-player">
	{#each orderedPlatforms as platform}
		{@const urls = links[platform]}
		{#if urls.length > 0 && (!autoLoad || !activePlatform || platform === activePlatform)}
			<div class="platform-section">
				{#if platform === 'bandcamp'}
					{#each urls as url}
						<ExternalLink {url} platform="bandcamp" label="Visit on Bandcamp" />
					{/each}

				{:else if platform === 'spotify'}
					{#each urls as url}
						{@const key = `spotify-${url}`}
						{#if spotifyState.connected}
							{@const cstate = spotifyConnectState[key] ?? 'idle'}
							<button
								class="embed-trigger platform-spotify"
								class:playing={cstate === 'playing'}
								onclick={() => playOnSpotifyDesktop(url)}
								disabled={cstate === 'loading'}
							>
								{cstate === 'loading' ? 'Connecting…' : cstate === 'playing' ? '▶ Playing in Spotify' : '▶ Play in Spotify Desktop'}
							</button>
							{#if spotifyConnectError[key]}
								<p class="spotify-connect-error">{spotifyConnectError[key]}</p>
							{/if}
							<ExternalLink {url} platform="spotify" label="Open in Spotify" />
						{:else}
							{@const embed = spotifyEmbedUrl(url)}
							{#if embed}
								{#if autoLoad && activePlatform === 'spotify' || loadedEmbeds[key]}
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
							{#if youtubeError}
								<!-- Error 153 or similar — video not embeddable -->
								<ExternalLink {url} platform="youtube" label="Watch on YouTube" />
							{:else if autoLoad && activePlatform === 'youtube' || loadedEmbeds[key]}
								<div class="iframe-wrap video-wrap">
									<iframe
										src={embed}
										width="100%"
										height="100%"
										frameborder="0"
										referrerpolicy="no-referrer-when-downgrade"
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
		border-radius: 0;
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
		border-radius: 0;
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

	.embed-trigger.playing {
		opacity: 0.7;
		cursor: default;
	}

	.spotify-connect-error {
		font-size: 0.75rem;
		color: #ef4444;
		margin: 4px 0 0;
	}
</style>
