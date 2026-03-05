<script lang="ts">
	import { isTauri } from '$lib/platform';
	import { streamingPref } from '$lib/theme/preferences.svelte';
	import { getProvider } from '$lib/db/provider';
	import { getRandomArtistByTag } from '$lib/db/queries';
	import { getWikiThumbnail } from '$lib/wiki-thumbnail';
	import ArtistSummary from '$lib/components/ArtistSummary.svelte';

	interface CachedTrack {
		title: string;
		track_number: number;
		length_ms: number | null;
	}
	interface CachedRelease {
		id: number;
		mbid: string;
		title: string;
		release_type: string;
		first_release_year: number | null;
		tracks: CachedTrack[];
	}

	interface Props {
		artist: any; // ArtistResult
		similarArtists: any[]; // SimilarArtistResult[]
		links: any[]; // { platform: string; url: string }[]
		sortedTags?: string[]; // pre-sorted by vote count DESC; overrides artist.tags parsing
		uniquenessScore?: number | null;
		onTagClick?: (tag: string) => void;
		onSimilarArtistClick?: (slug: string, name: string) => void;
		onOpenInRabbitHole?: (slug: string) => void;
		showOpenInRabbitHole?: boolean;
	}

	let {
		artist,
		similarArtists,
		links,
		sortedTags,
		uniquenessScore,
		onTagClick,
		onSimilarArtistClick,
		onOpenInRabbitHole,
		showOpenInRabbitHole = false
	}: Props = $props();

	let releases = $state<CachedRelease[]>([]);
	let releasesLoading = $state(false);
	let showAllReleases = $state(false);
	let continueLoading = $state(false);

	const TOP_RELEASES = 3;
	let visibleReleases = $derived(showAllReleases ? releases : releases.slice(0, TOP_RELEASES));

	let releasesForSummary = $derived(
		releases.map(r => ({ title: r.title, year: r.first_release_year, type: r.release_type }))
	);

	let tagList = $derived(
		sortedTags && sortedTags.length > 0
			? sortedTags
			: (artist?.tags ? artist.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [])
	);
	let hasLinks = $derived(links && links.length > 0);
	let artistPhotoUrl = $state<string | null>(null);

	$effect(() => {
		const mbid = artist?.mbid;
		if (!mbid || !isTauri()) return;
		releasesLoading = true;
		releases = [];
		import('@tauri-apps/api/core').then(({ invoke }) =>
			invoke<CachedRelease[]>('get_or_cache_releases', { artistMbid: mbid })
		).then(result => {
			releases = (result ?? []).map(r => ({ ...r, tracks: r.tracks ?? [] }));
		}).catch(() => {
			// best-effort — no tracks available
		}).finally(() => {
			releasesLoading = false;
		});
	});

	$effect(() => {
		const name = artist?.name;
		if (!name) { artistPhotoUrl = null; return; }
		artistPhotoUrl = null;
		getWikiThumbnail(name).then(url => { artistPhotoUrl = url; }).catch(() => {});
	});

	function handleTagClickInternal(tag: string) {
		if (onTagClick) {
			onTagClick(tag);
		} else {
			navigateToTagDefault(tag);
		}
	}

	function navigateToTagDefault(tag: string) {
		// Default: navigate to rabbit-hole tag route
		const slug = encodeURIComponent(tag.trim());
		window.location.href = `/rabbit-hole/tag/${slug}`;
	}

	function handleSimilarArtistClickInternal(slug: string, name: string) {
		if (onSimilarArtistClick) {
			onSimilarArtistClick(slug, name);
		} else {
			navigateToArtistDefault(slug);
		}
	}

	function navigateToArtistDefault(slug: string) {
		window.location.href = `/rabbit-hole/artist/${slug}`;
	}

	async function handlePlay() {
		if (!links || links.length === 0) return;
		const pref = streamingPref.platform;
		const preferred = links.find((l: { platform: string; url: string }) => l.platform === pref);
		const link = preferred ?? links[0];
		if (!link) return;
		try {
			const { open } = await import('@tauri-apps/plugin-shell');
			await open(link.url);
		} catch {
			/* ignore */
		}
	}

	async function handleContinue() {
		if (!artist || continueLoading) return;
		continueLoading = true;
		try {
			if (similarArtists.length > 0) {
				const pick = similarArtists[Math.floor(Math.random() * similarArtists.length)];
				handleSimilarArtistClickInternal(pick.slug, pick.name);
			} else {
				// Fallback: random artist sharing primary tag
				const primaryTag = (artist.tags ?? '').split(',')[0]?.trim();
				if (!primaryTag) return;
				const db = await getProvider();
				const fallback = await getRandomArtistByTag(db, primaryTag, artist.id);
				if (fallback) {
					handleSimilarArtistClickInternal(fallback.slug, fallback.name);
				}
			}
		} catch {
			/* ignore */
		} finally {
			continueLoading = false;
		}
	}

	function formatDuration(ms: number | null): string {
		if (!ms) return '';
		const s = Math.floor(ms / 1000);
		const m = Math.floor(s / 60);
		const sec = s % 60;
		return `${m}:${sec.toString().padStart(2, '0')}`;
	}
</script>

<div class="rh-card-wrap">
	<div class="rh-card">

		<!-- Header -->
		<div class="rh-card-header">
			{#if artistPhotoUrl}
				<img src={artistPhotoUrl} alt={artist.name} class="rh-artist-photo" />
			{/if}
			<a href="/artist/{artist.slug}" class="rh-artist-name">{artist.name}</a>
			{#if artist.country}
				<span class="rh-country">{artist.country}</span>
			{/if}
			{#if artist.begin_year}
				<span class="rh-year">est. {artist.begin_year}</span>
			{/if}
			{#if artist.type && artist.type !== 'Person'}
				<span class="rh-type-badge">{artist.type}</span>
			{/if}
			{#if artist.ended}
				<span class="rh-disbanded-badge">Disbanded</span>
			{/if}
			{#if uniquenessScore !== null && uniquenessScore !== undefined}
				<span class="rh-uniqueness-badge {uniquenessScore >= 100 ? 'very-niche' : uniquenessScore >= 8 ? 'niche' : uniquenessScore >= 0.36 ? 'eclectic' : 'mainstream'}">{uniquenessScore >= 100 ? 'Very Niche' : uniquenessScore >= 8 ? 'Niche' : uniquenessScore >= 0.36 ? 'Eclectic' : 'Mainstream'}</span>
			{/if}
		</div>
		<a href="/artist/{artist.slug}" class="rh-open-artist">Open artist page &rarr;</a>

		<!-- Tags -->
		{#if tagList.length > 0}
			<div class="rh-tags">
				{#each tagList as tag}
					<button class="rh-tag-chip" onclick={() => handleTagClickInternal(tag)}>{tag}</button>
				{/each}
			</div>
		{/if}

		<!-- AI Summary -->
		{#key artist.mbid}
			<ArtistSummary
				artistMbid={artist.mbid}
				artistName={artist.name}
				artistTags={artist.tags ?? ''}
				releases={releasesForSummary}
				autoGenerate={true}
			/>
		{/key}

		<!-- Similar Artists -->
		{#if similarArtists.length > 0}
			<div class="rh-section">
				<div class="rh-section-label">Similar Artists</div>
				<div class="rh-similar-row">
					{#each similarArtists as sa}
						<button class="rh-similar-chip" onclick={() => handleSimilarArtistClickInternal(sa.slug, sa.name)} style="opacity: {Math.min(1, 0.4 + (sa.score ?? 0) * 2)}">
							<span class="rh-chip-name">{sa.name}</span>
							{#if sa.country || sa.begin_year}
								<span class="rh-chip-hint">{sa.country ?? ''}{sa.country && sa.begin_year ? ' · ' : ''}{sa.begin_year ? `${Math.floor(sa.begin_year / 10) * 10}s` : ''}{(sa.country || sa.begin_year) && sa.score ? ' · ' : ''}{sa.score ? `${Math.round(sa.score * 100)}% match` : ''}</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Releases / Tracks -->
		<div class="rh-section">
			<div class="rh-section-label">Releases</div>
			{#if releasesLoading}
				<div class="rh-loading-hint">Loading releases...</div>
			{:else if releases.length === 0}
				<div class="rh-loading-hint">No releases cached yet.</div>
			{:else}
				<div class="rh-releases">
					{#each visibleReleases as rel}
						<div class="rh-release">
							<div class="rh-release-header">
								<span class="rh-release-title">{rel.title}</span>
								<span class="rh-release-meta">
									{rel.first_release_year ?? ''}
									{#if rel.tracks?.length > 0}&middot; {rel.tracks.length} tracks{/if}
								</span>
							</div>
							{#if rel.tracks?.length > 0}
								<div class="rh-tracks">
									{#each rel.tracks.slice(0, 5) as track}
										<div class="rh-track">
											<span class="rh-track-num">{track.track_number}</span>
											<span class="rh-track-title">{track.title}</span>
											{#if track.length_ms}
												<span class="rh-track-dur">{formatDuration(track.length_ms)}</span>
											{/if}
										</div>
									{/each}
									{#if rel.tracks.length > 5}
										<div class="rh-track-more">+{rel.tracks?.length - 5} more tracks</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
				{#if releases.length > TOP_RELEASES}
					<button class="rh-show-more" onclick={() => (showAllReleases = !showAllReleases)}>
						{showAllReleases ? 'Show less' : `Show all ${releases.length} releases`}
					</button>
				{/if}
			{/if}
		</div>

		<!-- Actions -->
		<div class="rh-actions">
			<button
				class="rh-play-btn"
				onclick={handlePlay}
				disabled={!hasLinks}
				title={hasLinks ? `Play on ${streamingPref.platform}` : 'No streaming links available'}
			>
				&#9654; Play
			</button>
			<button
				class="rh-continue-btn"
				onclick={handleContinue}
				disabled={continueLoading}
			>
				{continueLoading ? 'Finding...' : similarArtists.length > 0 ? 'Continue \u2192' : 'Explore \u2192'}
			</button>
			{#if showOpenInRabbitHole && onOpenInRabbitHole}
				<button class="rh-open-rh-btn" onclick={() => onOpenInRabbitHole!(artist.slug)}>
					Open in Rabbit Hole &rarr;
				</button>
			{/if}
		</div>

	</div>
</div>

<style>
	.rh-card-wrap {
		padding: var(--space-xl);
		display: flex;
		justify-content: center;
	}

	.rh-card {
		width: 100%;
		max-width: 680px;
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.rh-card-header {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.rh-artist-photo {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
		border: 1px solid var(--b-1);
	}

	.rh-artist-name {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--t-1);
		text-decoration: none;
	}

	.rh-artist-name:hover {
		color: var(--acc);
	}

	.rh-country {
		font-size: 0.875rem;
		color: var(--t-3);
		background: var(--bg-3);
		padding: 2px 8px;
		border-radius: 999px;
	}

	.rh-year {
		font-size: 0.8125rem;
		color: var(--t-4);
	}

	.rh-open-artist {
		font-size: 0.8125rem;
		color: var(--t-3);
		text-decoration: none;
		transition: color 0.15s;
	}

	.rh-open-artist:hover {
		color: var(--acc);
	}

	.rh-type-badge {
		font-size: 0.6875rem;
		color: var(--t-3);
		background: var(--bg-3);
		padding: 2px 7px;
		border-radius: 999px;
		border: 1px solid var(--b-1);
	}

	.rh-disbanded-badge {
		font-size: 0.6875rem;
		color: var(--t-4);
		background: var(--bg-3);
		padding: 2px 7px;
		border-radius: 999px;
		border: 1px solid var(--b-1);
		opacity: 0.7;
	}

	.rh-uniqueness-badge {
		font-size: 0.6rem;
		font-weight: 600;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		padding: 2px 7px;
		border-radius: 0;
		border: 1px solid currentColor;
	}
	.rh-uniqueness-badge.very-niche { color: var(--acc); }
	.rh-uniqueness-badge.niche { color: #7dd3a8; }
	.rh-uniqueness-badge.eclectic { color: var(--t-3); }
	.rh-uniqueness-badge.mainstream { color: var(--t-4); }

	.rh-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.rh-tag-chip {
		padding: 3px 10px;
		background: var(--bg-3);
		border: 1px solid var(--b-1);
		border-radius: 999px;
		color: var(--t-2);
		font-size: 0.75rem;
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}

	.rh-tag-chip:hover {
		border-color: var(--acc);
		color: var(--t-1);
	}

	.rh-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.rh-section-label {
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--t-4);
	}

	.rh-similar-row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.rh-similar-chip {
		padding: 4px 12px;
		background: var(--bg-2);
		border: 1px solid var(--b-2);
		border-radius: 999px;
		color: var(--t-2);
		font-size: 0.8125rem;
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}

	.rh-similar-chip:hover {
		border-color: var(--acc);
		color: var(--t-1);
	}

	.rh-chip-name {
		display: block;
	}

	.rh-chip-hint {
		display: block;
		font-size: 0.6875rem;
		color: var(--t-4);
		margin-top: 1px;
	}

	.rh-loading-hint {
		color: var(--t-4);
		font-size: 0.8125rem;
	}

	.rh-releases {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.rh-release {
		background: var(--bg-2);
		border: 1px solid var(--b-1);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.rh-release-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: 8px 12px;
		gap: var(--space-sm);
	}

	.rh-release-title {
		font-weight: 500;
		font-size: 0.875rem;
		color: var(--t-1);
	}

	.rh-release-meta {
		font-size: 0.75rem;
		color: var(--t-4);
		flex-shrink: 0;
	}

	.rh-tracks {
		border-top: 1px solid var(--b-1);
		padding: 4px 0;
	}

	.rh-track {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: 3px 12px;
		font-size: 0.8125rem;
	}

	.rh-track-num {
		color: var(--t-4);
		min-width: 18px;
		text-align: right;
		font-size: 0.75rem;
	}

	.rh-track-title {
		flex: 1;
		color: var(--t-2);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.rh-track-dur {
		color: var(--t-4);
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
	}

	.rh-track-more {
		padding: 3px 12px;
		font-size: 0.75rem;
		color: var(--t-4);
	}

	.rh-show-more {
		background: none;
		border: none;
		color: var(--acc);
		font-size: 0.8125rem;
		cursor: pointer;
		padding: 4px 0;
		text-align: left;
	}

	.rh-show-more:hover {
		text-decoration: underline;
	}

	.rh-actions {
		display: flex;
		gap: var(--space-md);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--b-1);
		flex-wrap: wrap;
	}

	.rh-play-btn {
		padding: 9px 20px;
		background: var(--acc);
		border: none;
		border-radius: var(--radius-sm);
		color: #000;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.rh-play-btn:hover:not(:disabled) {
		opacity: 0.85;
	}

	.rh-play-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.rh-continue-btn {
		padding: 9px 20px;
		background: var(--bg-3);
		border: 1px solid var(--b-2);
		border-radius: var(--radius-sm);
		color: var(--t-1);
		font-size: 0.875rem;
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}

	.rh-continue-btn:hover:not(:disabled) {
		border-color: var(--acc);
	}

	.rh-continue-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.rh-open-rh-btn {
		padding: 9px 20px;
		background: var(--bg-3);
		border: 1px solid var(--b-2);
		border-radius: var(--radius-sm);
		color: var(--acc);
		font-size: 0.875rem;
		cursor: pointer;
		transition: border-color 0.15s;
	}

	.rh-open-rh-btn:hover {
		border-color: var(--acc);
	}
</style>
