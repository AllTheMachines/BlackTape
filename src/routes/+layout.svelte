<script lang="ts">
	import '$lib/styles/theme.css';
	import { PROJECT_NAME } from '$lib/config';
	import favicon from '$lib/assets/favicon.svg';
	import { navigating, page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { isTauri } from '$lib/platform';
	import Player from '$lib/components/Player.svelte';
	import { playerState } from '$lib/player/state.svelte';
	import { aiState, loadAiSettings, initializeAi } from '$lib/ai/state.svelte';
	import { loadTasteProfile, tasteProfile } from '$lib/taste/profile.svelte';
	import { loadPlaybackSettings } from '$lib/player/playback.svelte';
	import { onMount } from 'svelte';
	import PanelLayout from '$lib/components/PanelLayout.svelte';
	import LeftSidebar from '$lib/components/LeftSidebar.svelte';
	import RightSidebar from '$lib/components/RightSidebar.svelte';
	import ControlBar from '$lib/components/ControlBar.svelte';
	import { initTheme, updateThemeFromTaste, themeState } from '$lib/theme/engine.svelte';
	import { loadThemePreferences, loadLayoutPreference, saveLayoutPreference, loadStreamingPreference, loadUserTemplates } from '$lib/theme/preferences.svelte';
	import type { LayoutTemplate } from '$lib/theme/templates';
	import { DEFAULT_TEMPLATE, LAYOUT_TEMPLATES, TEMPLATE_LIST, expandUserTemplate } from '$lib/theme/templates';
	import { layoutState } from '$lib/theme/layout-state.svelte';
	import { initNostr } from '$lib/comms/nostr.svelte.js';
	import { subscribeToIncomingDMs } from '$lib/comms/dms.svelte.js';
	import { totalUnread, chatState, openChat } from '$lib/comms/notifications.svelte.js';
	import ChatOverlay from '$lib/components/chat/ChatOverlay.svelte';

	let { children } = $props();

	let showPlayer = $state(false);
	let tauriMode = $state(false);
	let canGoBack = $derived($page.url.pathname !== '/');

	/** All templates for ControlBar — built-ins + user templates */
	let allTemplateConfigs = $derived([
		...TEMPLATE_LIST,
		...layoutState.userTemplates.map(expandUserTemplate)
	]);

	onMount(async () => {
		tauriMode = isTauri();

		// Initialize Nostr communication layer — fire-and-forget, does not block layout render
		// Runs on both web and Tauri — IndexedDB available in all environments
		initNostr().then(() => subscribeToIncomingDMs()).catch(e => console.warn('[comms] Nostr init:', e));

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

	/** Handle template change from ControlBar or Settings. */
	function handleTemplateChange(templateId: string) {
		layoutState.template = templateId as LayoutTemplate;
		if (tauriMode) {
			saveLayoutPreference(templateId);
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if $navigating}
	<div class="loading-bar" aria-hidden="true"></div>
{/if}

<header>
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
			<button
				class="nav-chat-btn"
				class:active={chatState.open}
				onclick={() => openChat('dms')}
				aria-label="Open chat"
				title="Messages"
			>
				Chat
				{#if totalUnread() > 0}
					<span class="nav-badge">{totalUnread() > 99 ? '99+' : totalUnread()}</span>
				{/if}
			</button>
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
			<a href="/kb" class="nav-link" class:active={$page.url.pathname.startsWith('/kb')}>Knowledge Base</a>
			<a href="/time-machine" class="nav-link" class:active={$page.url.pathname.startsWith('/time-machine')}>Time Machine</a>
			<a href="/about" class="nav-link">About</a>
			<button class="nav-chat-btn" onclick={() => openChat('dms')} aria-label="Open chat" title="Messages">
				Chat
				{#if totalUnread() > 0}<span class="nav-badge">{totalUnread() > 99 ? '99+' : totalUnread()}</span>{/if}
			</button>
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
		Some links on release pages are affiliate links. Mercury may earn a small commission if you make a purchase — at no extra cost to you. This helps fund open infrastructure.
	</p>
	<nav class="footer-nav">
		<a href="/about" class="footer-link">About</a>
	</nav>
</footer>

{#if isTauri()}
	<Player />
{/if}

<!-- Chat overlay — present on all pages, slides in on demand -->
<ChatOverlay />

<style>
	header {
		position: sticky;
		top: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		height: var(--header-height);
		padding: 0 var(--space-lg);
		background: var(--bg-surface);
		border-bottom: 1px solid var(--border-subtle);
	}

	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 4px;
		margin-right: var(--space-xs);
		border-radius: 4px;
		transition: color 0.15s;
	}

	.back-btn:hover {
		color: var(--text-primary);
	}

	.site-name {
		font-size: 0.85rem;
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-secondary);
		text-decoration: none;
	}

	.site-name:hover {
		color: var(--text-primary);
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
		color: var(--text-muted);
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
		color: var(--text-secondary);
		text-decoration: none;
	}

	.nav-link.active {
		color: var(--text-accent);
	}

	.nav-chat-btn {
		position: relative;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.75rem;
		padding: 4px 8px;
		color: var(--text-muted);
		border-radius: 4px;
		margin-left: var(--space-lg);
		transition: color 0.15s, background 0.15s;
	}

	.nav-chat-btn:hover,
	.nav-chat-btn.active {
		color: var(--text-primary);
		background: var(--bg-tertiary, var(--bg-elevated));
	}

	.nav-badge {
		position: absolute;
		top: 0;
		right: 0;
		background: var(--text-accent);
		color: var(--bg-primary, var(--bg-surface));
		border-radius: 10px;
		font-size: 0.6rem;
		font-weight: 700;
		padding: 1px 4px;
		min-width: 16px;
		text-align: center;
		line-height: 1.4;
	}

	.ai-indicator {
		display: flex;
		align-items: center;
		gap: 5px;
		margin-left: auto;
		padding: 4px 8px;
		font-size: 0.7rem;
		color: var(--text-muted);
		cursor: default;
	}

	.ai-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.ai-dot.ready {
		background: var(--text-accent);
	}

	.ai-dot.error {
		background: #ef4444;
	}

	.ai-dot.pulsing {
		background: var(--text-muted);
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
		border-top: 1px solid var(--border-subtle);
		margin-top: auto;
	}

	.affiliate-disclosure {
		font-size: 0.7rem;
		color: var(--text-muted);
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
		color: var(--text-muted);
		text-decoration: none;
	}

	.footer-link:hover {
		color: var(--text-secondary);
	}

	.loading-bar {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 2px;
		z-index: 200;
		background: var(--text-accent);
		animation: loading-slide 1.2s ease-in-out infinite;
	}

	@keyframes loading-slide {
		0% {
			transform: scaleX(0);
			transform-origin: left;
		}
		50% {
			transform: scaleX(1);
			transform-origin: left;
		}
		50.01% {
			transform-origin: right;
		}
		100% {
			transform: scaleX(0);
			transform-origin: right;
		}
	}
</style>
