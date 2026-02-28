<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { HELP_CONTENT } from '$lib/help-content';
	import { helpTopicForPath } from '$lib/help';
	import { PROJECT_NAME } from '$lib/config';

	let topic = $derived($page.params.topic ?? 'search');
	let content = $derived(HELP_CONTENT[topic] ?? HELP_CONTENT['search']);

	// All topics for the sidebar index
	const ALL_TOPICS: { label: string; topic: string }[] = [
		{ label: 'Search', topic: 'search' },
		{ label: 'Discover', topic: 'discover' },
		{ label: 'Style Map', topic: 'style-map' },
		{ label: 'Knowledge Base', topic: 'knowledge-base' },
		{ label: 'Time Machine', topic: 'time-machine' },
		{ label: 'Crate Dig', topic: 'crate-dig' },
		{ label: 'New & Rising', topic: 'new-rising' },
		{ label: 'Library', topic: 'library' },
		{ label: 'Player & Queue', topic: 'player' },
		{ label: 'Scenes', topic: 'scenes' },
		{ label: 'Listening Rooms', topic: 'listening-rooms' },
		{ label: 'Artist Page', topic: 'artist-page' },
		{ label: 'Release Page', topic: 'release-page' },
		{ label: 'Profile & Shelves', topic: 'profile' },
		{ label: 'Settings', topic: 'settings' },
		{ label: 'About', topic: 'about' },
	];
</script>

<svelte:head>
	<title>Help: {content.title} — {PROJECT_NAME}</title>
</svelte:head>

<div class="help-layout">
	<nav class="help-nav">
		<div class="help-nav-header">
			<button class="back-link" onclick={() => history.back()}>← Back</button>
			<span class="help-nav-title">Help</span>
		</div>
		<ul class="help-nav-list">
			{#each ALL_TOPICS as t}
				<li>
					<a
						href="/help/{t.topic}"
						class="help-nav-item"
						class:active={t.topic === topic}
					>{t.label}</a>
				</li>
			{/each}
		</ul>
	</nav>

	<article class="help-content">
		<h1 class="help-title">{content.title}</h1>
		<p class="help-intro">{content.intro}</p>

		{#each content.sections as section}
			<section class="help-section">
				<h2 class="help-h2">{section.heading}</h2>
				<p class="help-body">{section.body}</p>
			</section>
		{/each}

		{#if content.related && content.related.length > 0}
			<div class="help-related">
				<span class="help-related-label">See also:</span>
				{#each content.related as rel}
					<a href="/help/{rel.topic}" class="help-related-link">{rel.label}</a>
				{/each}
			</div>
		{/if}
	</article>
</div>

<style>
	.help-layout {
		display: flex;
		min-height: 100%;
	}

	.help-nav {
		width: 180px;
		flex-shrink: 0;
		border-right: 1px solid var(--b-1);
		padding: 16px 0;
		position: sticky;
		top: 0;
		height: 100vh;
		overflow-y: auto;
		box-sizing: border-box;
	}

	.help-nav-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 12px 12px;
		border-bottom: 1px solid var(--b-1);
		margin-bottom: 8px;
	}

	.back-link {
		background: none;
		border: none;
		color: var(--acc);
		font-size: 0.8rem;
		cursor: pointer;
		font-family: inherit;
		padding: 0;
	}

	.back-link:hover {
		text-decoration: underline;
	}

	.help-nav-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--t-3);
	}

	.help-nav-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.help-nav-item {
		display: block;
		padding: 5px 12px;
		font-size: 0.82rem;
		color: var(--t-3);
		text-decoration: none;
		border-left: 2px solid transparent;
		transition: color 0.1s, background 0.1s;
	}

	.help-nav-item:hover {
		color: var(--t-2);
		background: var(--bg-3);
	}

	.help-nav-item.active {
		color: var(--t-1);
		border-left-color: var(--acc);
		background: var(--bg-3);
	}

	.help-content {
		flex: 1;
		padding: 28px 32px;
		max-width: 680px;
	}

	.help-title {
		font-size: 1.4rem;
		font-weight: 600;
		color: var(--t-1);
		margin: 0 0 12px 0;
	}

	.help-intro {
		font-size: 0.95rem;
		color: var(--t-2);
		line-height: 1.7;
		margin: 0 0 24px 0;
		padding-bottom: 20px;
		border-bottom: 1px solid var(--b-1);
	}

	.help-section {
		margin-bottom: 20px;
	}

	.help-h2 {
		font-size: 0.85rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--t-2);
		margin: 0 0 6px 0;
	}

	.help-body {
		font-size: 0.88rem;
		color: var(--t-3);
		line-height: 1.75;
		margin: 0;
	}

	.help-related {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 32px;
		padding-top: 16px;
		border-top: 1px solid var(--b-1);
	}

	.help-related-label {
		font-size: 0.8rem;
		color: var(--t-3);
	}

	.help-related-link {
		font-size: 0.8rem;
		color: var(--acc);
		text-decoration: none;
		padding: 2px 8px;
		border: 1px solid color-mix(in srgb, var(--acc) 40%, transparent);
	}

	.help-related-link:hover {
		background: color-mix(in srgb, var(--acc) 10%, transparent);
	}
</style>
