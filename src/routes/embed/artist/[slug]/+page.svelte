<script lang="ts">
	import { onMount } from 'svelte';

	let { data } = $props();

	let isDark = $state(false);

	onMount(() => {
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		isDark = mq.matches;
		mq.addEventListener('change', (e) => {
			isDark = e.matches;
		});
	});
</script>

<div class="card" class:dark={isDark}>
	{#if !data.artist}
		<p class="not-found">Artist not found</p>
	{:else}
		<img
			src={data.coverArt}
			alt={data.artist.name}
			class="cover"
			onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
		/>
		<div class="info">
			<a
				href="{data.siteUrl}/artist/{data.artist.slug}"
				target="_blank"
				rel="noopener"
				class="artist-name"
			>
				{data.artist.name}
			</a>

			{#if data.bio}
				<p class="bio">{data.bio}</p>
			{/if}

			<div class="tags">
				{#each data.tags.slice(0, 5) as tag}
					<span class="tag">{tag}</span>
				{/each}
				{#if data.artist.country}
					<span class="country">{data.artist.country}</span>
				{/if}
			</div>

			<a
				href="{data.siteUrl}/artist/{data.artist.slug}"
				target="_blank"
				rel="noopener"
				class="listen-link"
			>
				Listen on Mercury →
			</a>
		</div>

		<span class="powered-by">
			Powered by <a href={data.siteUrl} target="_blank" rel="noopener">Mercury</a>
		</span>
	{/if}
</div>

<style>
	.card {
		--card-bg: #ffffff;
		--card-text: #111111;
		--card-text-muted: #555555;
		--card-border: #e0e0e0;
		--tag-bg: #f0f0f0;
		--tag-text: #333333;
		--link-color: #1a73e8;

		display: flex;
		flex-direction: row;
		align-items: flex-start;
		gap: 12px;
		width: 400px;
		min-height: 200px;
		background: var(--card-bg);
		color: var(--card-text);
		border: 1px solid var(--card-border);
		border-radius: 8px;
		padding: 12px;
		box-sizing: border-box;
		overflow: hidden;
		font-family: system-ui, -apple-system, sans-serif;
		position: relative;
	}

	.card.dark {
		--card-bg: #1a1a1a;
		--card-text: #f0f0f0;
		--card-text-muted: #aaaaaa;
		--card-border: #333333;
		--tag-bg: #2a2a2a;
		--tag-text: #cccccc;
		--link-color: #7ab4f5;
	}

	.cover {
		width: 80px;
		height: 80px;
		object-fit: cover;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.artist-name {
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--card-text);
		text-decoration: none;
		line-height: 1.2;
	}

	.artist-name:hover {
		text-decoration: underline;
	}

	.bio {
		font-size: 11px;
		color: var(--card-text-muted);
		margin: 0;
		opacity: 0.75;
		line-height: 1.3;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-top: 4px;
	}

	.tag {
		background: var(--tag-bg);
		color: var(--tag-text);
		border-radius: 999px;
		padding: 2px 8px;
		font-size: 11px;
	}

	.country {
		background: var(--tag-bg);
		color: var(--card-text-muted);
		border-radius: 999px;
		padding: 2px 8px;
		font-size: 11px;
		font-style: italic;
	}

	.listen-link {
		display: inline-block;
		margin-top: 6px;
		font-size: 12px;
		color: var(--link-color);
		text-decoration: none;
		font-weight: 500;
	}

	.listen-link:hover {
		text-decoration: underline;
	}

	.powered-by {
		position: absolute;
		bottom: 8px;
		right: 10px;
		font-size: 10px;
		color: var(--card-text-muted);
		opacity: 0.6;
	}

	.powered-by a {
		color: inherit;
		text-decoration: none;
	}

	.powered-by a:hover {
		text-decoration: underline;
	}

	.not-found {
		color: var(--card-text-muted);
		font-size: 0.9rem;
		padding: 12px;
	}
</style>
