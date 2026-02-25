<script lang="ts">
	import { queueState, clearQueue } from '$lib/player/queue.svelte';
	import { playerState } from '$lib/player/state.svelte';
	import { tasteProfile } from '$lib/taste/profile.svelte';

	interface Props {
		pagePath: string;
		artistData?: { tags?: string[]; name?: string } | null;
		genreData?: { name?: string; subgenres?: string[]; related?: string[]; key_artists?: string[] } | null;
	}

	let { pagePath, artistData = null, genreData = null }: Props = $props();

	let queueExpanded = $state(true);
	let nowPlayingExpanded = $state(true);

	const isArtistPage = $derived(pagePath.startsWith('/artist/'));
	const isGenrePage = $derived(pagePath.startsWith('/kb/genre/'));

	function formatDuration(secs: number): string {
		if (!isFinite(secs) || secs < 0) return '0:00';
		const totalSeconds = Math.floor(secs);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}

	function jumpTo(index: number) {
		import('$lib/player/queue.svelte').then(({ setQueue }) => {
			setQueue(queueState.tracks, index);
		});
	}

	function removeTrack(e: Event, index: number) {
		e.stopPropagation();
		import('$lib/player/queue.svelte').then(({ removeFromQueue }) => {
			removeFromQueue(index);
		});
	}

	const topTasteTags = $derived(
		tasteProfile.tags
			.slice()
			.sort((a, b) => b.weight - a.weight)
			.slice(0, 5)
	);
</script>

<aside class="right-sidebar" aria-label="Context panel">
	{#if isArtistPage && artistData}
		<!-- Artist Context -->
		<section class="sidebar-section">
			<h4 class="section-label">Related Tags</h4>
			{#if artistData.tags && artistData.tags.length > 0}
				<div class="tag-list">
					{#each artistData.tags.slice(0, 10) as tag}
						<a href="/search?q={encodeURIComponent(tag)}&mode=tag" class="related-tag">{tag}</a>
					{/each}
				</div>
			{:else}
				<p class="empty-hint">No tags available</p>
			{/if}
		</section>

		<div class="section-divider"></div>

		<!-- Queue in artist context -->
		<section class="sidebar-section collapsible-section">
			<button
				class="section-header-btn"
				onclick={() => { queueExpanded = !queueExpanded; }}
				aria-expanded={queueExpanded}
			>
				<h4 class="section-label">Queue ({queueState.tracks.length})</h4>
				<span class="chevron" class:open={queueExpanded}>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="6 9 12 15 18 9" />
					</svg>
				</span>
			</button>

			{#if queueExpanded}
				{@render queuePanel()}
			{/if}
		</section>

	{:else if isGenrePage && genreData}
		<!-- Genre Context -->
		<section class="sidebar-section">
			<h4 class="section-label">Subgenres</h4>
			{#if genreData.subgenres && genreData.subgenres.length > 0}
				<div class="tag-list">
					{#each genreData.subgenres as sub}
						<a href="/kb/genre/{sub.toLowerCase().replace(/\s+/g, '-')}" class="related-tag">{sub}</a>
					{/each}
				</div>
			{:else}
				<p class="empty-hint">No subgenres listed</p>
			{/if}
		</section>

		{#if genreData.related && genreData.related.length > 0}
			<div class="section-divider"></div>
			<section class="sidebar-section">
				<h4 class="section-label">Related Genres</h4>
				<div class="tag-list">
					{#each genreData.related as rel}
						<a href="/kb/genre/{rel.toLowerCase().replace(/\s+/g, '-')}" class="related-tag">{rel}</a>
					{/each}
				</div>
			</section>
		{/if}

		{#if genreData.key_artists && genreData.key_artists.length > 0}
			<div class="section-divider"></div>
			<section class="sidebar-section">
				<h4 class="section-label">Key Artists</h4>
				<ul class="artist-list">
					{#each genreData.key_artists as artist}
						<li class="artist-item">{artist}</li>
					{/each}
				</ul>
			</section>
		{/if}

	{:else}
		<!-- Default Context -->

		<!-- Now Playing -->
		{#if playerState.currentTrack}
			<section class="sidebar-section collapsible-section">
				<button
					class="section-header-btn"
					onclick={() => { nowPlayingExpanded = !nowPlayingExpanded; }}
					aria-expanded={nowPlayingExpanded}
				>
					<h4 class="section-label">Now Playing</h4>
					<span class="chevron" class:open={nowPlayingExpanded}>
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="6 9 12 15 18 9" />
						</svg>
					</span>
				</button>
				{#if nowPlayingExpanded}
					<div class="now-playing">
						<div class="np-title">{playerState.currentTrack.title}</div>
						<div class="np-artist">{playerState.currentTrack.artist}</div>
					</div>
				{/if}
			</section>
			<div class="section-divider"></div>
		{/if}

		<!-- Queue -->
		<section class="sidebar-section collapsible-section">
			<button
				class="section-header-btn"
				onclick={() => { queueExpanded = !queueExpanded; }}
				aria-expanded={queueExpanded}
			>
				<h4 class="section-label">Queue ({queueState.tracks.length})</h4>
				<span class="chevron" class:open={queueExpanded}>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="6 9 12 15 18 9" />
					</svg>
				</span>
			</button>

			{#if queueExpanded}
				{@render queuePanel()}
			{/if}
		</section>

		{#if topTasteTags.length > 0}
			<div class="section-divider"></div>
			<section class="sidebar-section">
				<h4 class="section-label">Your Taste</h4>
				<div class="taste-tags">
					{#each topTasteTags as tt}
						<a href="/search?q={encodeURIComponent(tt.tag)}&mode=tag" class="related-tag taste-tag">
							{tt.tag}
						</a>
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</aside>

{#snippet queuePanel()}
	{#if queueState.tracks.length === 0}
		<p class="empty-hint queue-empty">Queue empty — play something</p>
	{:else}
		<div class="queue-actions-bar">
			<button class="clear-queue-btn" onclick={clearQueue}>Clear</button>
		</div>
		<div class="queue-list">
			{#each queueState.tracks as track, i}
				<div
					class="queue-item"
					class:active={i === queueState.currentIndex}
					role="button"
					tabindex="0"
					onclick={() => jumpTo(i)}
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') jumpTo(i); }}
				>
					<span class="q-index">{i + 1}</span>
					<div class="q-info">
						<span class="q-title">{track.title}</span>
						<span class="q-artist">{track.artist}</span>
					</div>
					<span class="q-dur">{formatDuration(track.durationSecs)}</span>
					<button
						class="q-remove"
						onclick={(e) => removeTrack(e, i)}
						aria-label="Remove {track.title}"
					>
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>
			{/each}
		</div>
	{/if}
{/snippet}

<style>
	.right-sidebar {
		height: 100%;
		overflow-y: auto;
		padding: var(--space-sm);
		background: var(--bg-2);
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.sidebar-section {
		padding: var(--space-sm) 0;
	}

	.collapsible-section {
		padding-top: 0;
	}

	.section-divider {
		height: 1px;
		background: var(--border-subtle);
		margin: var(--space-xs) 0;
	}

	.section-label {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		margin: 0;
	}

	.section-header-btn {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--space-sm) 0;
		color: inherit;
		font-family: inherit;
	}

	.chevron {
		color: var(--text-muted);
		transition: transform 0.15s;
		display: flex;
		align-items: center;
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	/* Tag / Related Lists */
	.tag-list,
	.taste-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 3px;
		margin-top: var(--space-xs);
	}

	.related-tag {
		display: inline-block;
		font-size: 0.7rem;
		padding: 2px 6px;
		background: var(--tag-bg);
		color: var(--tag-text);
		border: 1px solid var(--tag-border);
		border-radius: 999px;
		text-decoration: none;
		transition: background 0.1s, border-color 0.1s;
		white-space: nowrap;
	}

	.related-tag:hover {
		background: var(--bg-elevated);
		border-color: var(--text-accent);
		text-decoration: none;
	}

	.taste-tag {
		border-color: var(--text-accent);
	}

	/* Artist / Genre Lists */
	.artist-list {
		list-style: none;
		padding: 0;
		margin: var(--space-xs) 0 0 0;
	}

	.artist-item {
		font-size: 0.75rem;
		color: var(--text-secondary);
		padding: 2px 0;
	}

	/* Now Playing */
	.now-playing {
		padding: var(--space-xs) 0;
	}

	.np-title {
		font-size: 0.75rem;
		color: var(--text-primary);
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.np-artist {
		font-size: 0.7rem;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Empty hints */
	.empty-hint {
		font-size: 0.7rem;
		color: var(--text-muted);
		font-style: italic;
		margin: var(--space-xs) 0 0 0;
	}

	.queue-empty {
		text-align: center;
		padding: var(--space-sm) 0;
	}

	/* Queue */
	.queue-actions-bar {
		display: flex;
		justify-content: flex-end;
		margin-bottom: var(--space-xs);
	}

	.clear-queue-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 0.7rem;
		cursor: pointer;
		padding: 2px 4px;
		border-radius: 3px;
	}

	.clear-queue-btn:hover {
		color: var(--text-secondary);
		background: var(--bg-hover);
	}

	.queue-list {
		display: flex;
		flex-direction: column;
		gap: 1px;
		max-height: 300px;
		overflow-y: auto;
	}

	.queue-item {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: 3px var(--space-xs);
		border-radius: 3px;
		cursor: pointer;
		transition: background 0.1s;
	}

	.queue-item:hover {
		background: var(--bg-hover);
	}

	.queue-item.active {
		background: var(--bg-elevated);
	}

	.q-index {
		font-size: 0.65rem;
		color: var(--text-muted);
		min-width: 16px;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.q-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.q-title {
		font-size: 0.75rem;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.queue-item.active .q-title {
		color: var(--text-accent);
	}

	.q-artist {
		font-size: 0.65rem;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.q-dur {
		font-size: 0.65rem;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
		flex-shrink: 0;
	}

	.q-remove {
		display: flex;
		align-items: center;
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 2px;
		border-radius: 2px;
		opacity: 0;
		transition: opacity 0.15s;
		flex-shrink: 0;
	}

	.queue-item:hover .q-remove {
		opacity: 1;
	}

	.q-remove:hover {
		color: var(--text-primary);
		background: var(--bg-hover);
	}
</style>
