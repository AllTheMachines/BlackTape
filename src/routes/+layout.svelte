<script lang="ts">
	import '$lib/styles/theme.css';
	import { PROJECT_NAME } from '$lib/config';
	import favicon from '$lib/assets/favicon.svg';
	import { navigating, page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { isTauri } from '$lib/platform';
	import Player from '$lib/components/Player.svelte';
	import { playerState } from '$lib/player/state.svelte';
	import { streamingState } from '$lib/player/streaming.svelte';
	import { aiState, loadAiSettings, initializeAi } from '$lib/ai/state.svelte';
	import { loadTasteProfile, tasteProfile } from '$lib/taste/profile.svelte';
	import { loadPlaybackSettings } from '$lib/player/playback.svelte';
	import { restoreQueueFromStorage } from '$lib/player/queue.svelte';
	import { onMount } from 'svelte';
	import PanelLayout from '$lib/components/PanelLayout.svelte';
	import LeftSidebar from '$lib/components/LeftSidebar.svelte';
	import RightSidebar from '$lib/components/RightSidebar.svelte';
	import ControlBar from '$lib/components/ControlBar.svelte';
	import { initTheme, updateThemeFromTaste, themeState } from '$lib/theme/engine.svelte';
	import { loadThemePreferences, loadLayoutPreference, saveLayoutPreference, loadStreamingPreference, loadUserTemplates, loadServiceOrder } from '$lib/theme/preferences.svelte';
	import type { LayoutTemplate } from '$lib/theme/templates';
	import { DEFAULT_TEMPLATE, LAYOUT_TEMPLATES, TEMPLATE_LIST, expandUserTemplate } from '$lib/theme/templates';
	import { layoutState } from '$lib/theme/layout-state.svelte';
	import { togglePlayPause } from '$lib/player/audio.svelte';
	import { navProgress } from '$lib/nav-progress.svelte';
	import Titlebar from '$lib/components/Titlebar.svelte';

	let { children } = $props();

	let showPlayer = $state(false);
	let tauriMode = $state(false);
	let canGoBack = $derived($page.url.pathname !== '/');
	let isEmbed = $derived($page.url.pathname.startsWith('/embed'));

	/** All templates for ControlBar — built-ins + user templates */
	let allTemplateConfigs = $derived([
		...TEMPLATE_LIST,
		...layoutState.userTemplates.map(expandUserTemplate)
	]);

	onMount(async () => {
		restoreQueueFromStorage(); // Restore persisted queue first
		tauriMode = isTauri();

		if (isTauri()) {
			await loadAiSettings();
			loadTasteProfile();  // fire-and-forget — populates tasteProfile state async
			loadPlaybackSettings();  // fire-and-forget — loads private mode + play count
			if (aiState.enabled) {
				initializeAi();
			}

			// Load layout and theme preferences
			const [themePrefs, layoutPref] = await Promise.all([
				loadThemePreferences(),
				loadLayoutPreference()
			]);
			layoutState.template = layoutPref as LayoutTemplate;

			// Load user templates into shared state
			layoutState.userTemplates = await loadUserTemplates();

			// Initialize theme engine — applies saved palette
			initTheme(tasteProfile.tags, themePrefs);

			// Load streaming preference — updates reactive streamingPref state
			await loadStreamingPreference();
			// Load service order — updates streamingState.serviceOrder for Settings UI
			const serviceOrder = await loadServiceOrder();
			streamingState.serviceOrder = serviceOrder;

			// Load Spotify connection state — hydrates spotifyState from ai_settings
			const { loadSpotifyState } = await import('$lib/spotify/auth');
			const { setSpotifyConnected } = await import('$lib/spotify/state.svelte');
			const storedSpotify = await loadSpotifyState();
			if (storedSpotify) {
				setSpotifyConnected(storedSpotify);
			}
		}
	});

	$effect(() => {
		showPlayer = isTauri() && playerState.currentTrack !== null;
	});

	/** Reactively update theme when taste profile changes (Tauri only). */
	$effect(() => {
		if (tauriMode && tasteProfile.isLoaded && themeState.mode === 'taste') {
			updateThemeFromTaste(tasteProfile.tags);
		}
	});

	/** Global spacebar handler: toggle play/pause unless a text input is focused. */
	function handleGlobalKeydown(e: KeyboardEvent) {
		if (e.key !== ' ') return;
		const tag = (e.target as HTMLElement)?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
		if ((e.target as HTMLElement)?.isContentEditable) return;
		if (!playerState.currentTrack) return;
		e.preventDefault();
		togglePlayPause();
	}

	/** Handle template change from ControlBar or Settings. */
	function handleTemplateChange(templateId: string) {
		layoutState.template = templateId as LayoutTemplate;
		if (tauriMode) {
			saveLayoutPreference(templateId);
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if isEmbed}
	{@render children()}
{:else}

{#if tauriMode}
	<Titlebar />
{/if}

{#if $navigating || (tauriMode && navProgress.active)}
	<div
		class="loading-bar"
		class:completing={tauriMode && navProgress.completing}
		data-testid="nav-progress-bar"
		aria-hidden="true"
	></div>
{/if}

<header class:hidden={tauriMode}>
	{#if canGoBack}
		<button class="back-btn" onclick={() => history.back()} title="Go back" aria-label="Go back">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="15 18 9 12 15 6" />
			</svg>
		</button>
	{/if}
	<a href="/" class="site-name">{PROJECT_NAME}</a>
	{#if tauriMode}
		<nav class="nav-links">
			<a href="/discover" class="nav-link">Discover</a>
			<a href="/style-map" class="nav-link">Style Map</a>
			<a href="/kb" class="nav-link" class:active={$page.url.pathname.startsWith('/kb')}>Knowledge Base</a>
			<a href="/time-machine" class="nav-link" class:active={$page.url.pathname.startsWith('/time-machine')}>Time Machine</a>
			<a href="/crate" class="nav-link">Dig</a>
			<a href="/library" class="nav-link">Library</a>
			<a href="/explore" class="nav-link">Explore</a>
			<a href="/profile" class="nav-link" class:active={$page.url.pathname === '/profile'}>Profile</a>
			<a href="/settings" class="nav-link">Settings</a>
			<a href="/about" class="nav-link">About</a>
		</nav>
		{#if aiState.status === 'loading' || aiState.status === 'downloading'}
			<span class="ai-indicator" title="AI is loading">
				<span class="ai-dot pulsing"></span>
				<span class="ai-label">AI</span>
			</span>
		{:else if aiState.status === 'ready'}
			<span class="ai-indicator" title="AI is ready">
				<span class="ai-dot ready"></span>
				<span class="ai-label">AI</span>
			</span>
		{:else if aiState.status === 'error'}
			<span class="ai-indicator" title="AI error: {aiState.error}">
				<span class="ai-dot error"></span>
				<span class="ai-label">AI</span>
			</span>
		{/if}
	{:else}
		<nav class="nav-links">
			<a href="/discover" class="nav-link">Discover</a>
			<a href="/style-map" class="nav-link">Style Map</a>
			<a href="/new-rising" class="nav-link" class:active={$page.url.pathname.startsWith('/new-rising')}>New & Rising</a>
			<a href="/kb" class="nav-link" class:active={$page.url.pathname.startsWith('/kb')}>Knowledge Base</a>
			<a href="/time-machine" class="nav-link" class:active={$page.url.pathname.startsWith('/time-machine')}>Time Machine</a>
			<a href="/about" class="nav-link">About</a>
		</nav>
	{/if}
</header>

{#if tauriMode}
	<!-- Tauri cockpit layout: ControlBar + PanelLayout -->
	<ControlBar
		currentTemplateId={layoutState.template}
		allTemplates={allTemplateConfigs}
		onTemplateChange={handleTemplateChange}
	/>

	<PanelLayout template={layoutState.template} hasPlayer={showPlayer}>
		{#snippet sidebar()}
			<LeftSidebar />
		{/snippet}

		{#snippet context()}
			<RightSidebar pagePath={$page.url.pathname} />
		{/snippet}

		{@render children()}
	</PanelLayout>
{:else}
	<!-- Web: standard single-column layout — unchanged -->
	<main class:has-player={showPlayer}>
		{@render children()}
	</main>
{/if}

<footer class="site-footer">
	<p class="affiliate-disclosure">
		Some links on release pages are affiliate links. BlackTape may earn a small commission if you make a purchase — at no extra cost to you. This helps fund open infrastructure.
	</p>
	<nav class="footer-nav">
		<a href="/about" class="footer-link">About</a>
	</nav>
</footer>

{#if isTauri()}
	<Player />
{/if}

{/if}

<style>
	header {
		position: sticky;
		top: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		height: var(--header-height);
		padding: 0 var(--space-lg);
		background: var(--bg-2);
		border-bottom: 1px solid var(--b-1);
	}

	header.hidden {
		display: none;
	}

	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: var(--t-3);
		cursor: pointer;
		padding: 4px;
		margin-right: var(--space-xs);
		border-radius: 0;
		transition: color 0.15s;
	}

	.back-btn:hover {
		color: var(--t-1);
	}

	.site-name {
		font-size: 0.85rem;
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--t-2);
		text-decoration: none;
	}

	.site-name:hover {
		color: var(--t-1);
		text-decoration: none;
	}

	.nav-links {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		overflow: hidden;
	}

	.nav-link {
		font-size: 0.75rem;
		color: var(--t-3);
		text-decoration: none;
		margin-left: var(--space-lg);
		transition: color 0.15s;
	}

	@media (max-width: 480px) {
		.nav-links {
			display: none;
		}
	}

	.nav-link:hover {
		color: var(--t-2);
		text-decoration: none;
	}

	.nav-link.active {
		color: var(--acc);
	}

	.ai-indicator {
		display: flex;
		align-items: center;
		gap: 5px;
		margin-left: auto;
		padding: 4px 8px;
		font-size: 0.7rem;
		color: var(--t-3);
		cursor: default;
	}

	.ai-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.ai-dot.ready {
		background: var(--acc);
	}

	.ai-dot.error {
		background: #ef4444;
	}

	.ai-dot.pulsing {
		background: var(--t-3);
		animation: ai-pulse 1.5s ease-in-out infinite;
	}

	@keyframes ai-pulse {
		0%, 100% { opacity: 0.3; }
		50% { opacity: 1; }
	}

	.ai-label {
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	main {
		width: 100%;
	}

	main.has-player {
		padding-bottom: var(--player-height);
	}

	.site-footer {
		padding: var(--space-lg);
		border-top: 1px solid var(--b-1);
		margin-top: auto;
	}

	.affiliate-disclosure {
		font-size: 0.7rem;
		color: var(--t-3);
		max-width: 860px;
		margin: 0 auto;
		text-align: center;
		line-height: 1.5;
	}

	.footer-nav {
		margin-top: var(--space-sm, 0.5rem);
		text-align: center;
	}

	.footer-link {
		font-size: 0.7rem;
		color: var(--t-3);
		text-decoration: none;
	}

	.footer-link:hover {
		color: var(--t-2);
	}

	/* Phase 1: advance from 0% to ~80% while loading (NProgress style) */
	.loading-bar {
		position: fixed;
		top: 0;
		left: 0;
		height: 2px;
		z-index: 200;
		background: var(--acc);
		width: 0%;
		animation: loading-advance 3s ease-out forwards;
		pointer-events: none;
	}

	/* Phase 2: snap to 100%, then fade out */
	.loading-bar.completing {
		animation: none;
		width: 100% !important;
		opacity: 0;
		transition: width 0.1s ease-out, opacity 0.2s ease-out 0.1s;
	}

	@keyframes loading-advance {
		from { width: 0%; }
		to   { width: 80%; }
	}
</style>
