<script lang="ts">
	interface MbArtistCredit {
		artist?: { name: string };
		name?: string;
		'join-phrase'?: string;
	}

	interface MbLabelInfo {
		label?: { name: string };
		'catalog-number'?: string;
	}

	interface MbTrack {
		title?: string;
		recording?: {
			title?: string;
			'artist-credit'?: MbArtistCredit[];
		};
	}

	interface MbMedium {
		tracks?: MbTrack[];
	}

	interface MbRelease {
		'artist-credit'?: MbArtistCredit[];
		'label-info'?: MbLabelInfo[];
		media?: MbMedium[];
	}

	let { releaseMbid }: { releaseMbid: string } = $props();

	let expanded = $state(false);
	let loading = $state(false);
	let credits = $state<{
		artistCredits: Array<{ name: string; joinPhrase: string }>;
		labels: Array<{ name: string; catalogNumber: string }>;
		tracks: Array<{ title: string; credits: Array<{ name: string }> }>;
	} | null>(null);
	let error = $state<string | null>(null);

	async function toggle() {
		expanded = !expanded;
		if (expanded && !credits && !loading) {
			loading = true;
			error = null;
			try {
				// MusicBrainz API — browse by release-group MBID (same pattern as page.server.ts)
				// inc=artist-credits for release-level credits, labels for label info, recordings for track credits
				const url = `https://musicbrainz.org/ws/2/release?release-group=${releaseMbid}&inc=artist-credits+labels+recordings&limit=1&fmt=json`;
				const resp = await fetch(url, { headers: { 'User-Agent': 'Mercury/0.1.0' } });
				if (!resp.ok) throw new Error(`MusicBrainz ${resp.status}`);
				const data = await resp.json() as { releases?: MbRelease[] };
				// Browse endpoint returns { releases: [...] }, take first release
				const rel: MbRelease = (data.releases ?? [])[0] ?? {};
				credits = {
					artistCredits: (rel['artist-credit'] ?? []).map((ac: MbArtistCredit) => ({
						name: ac.artist?.name ?? ac.name ?? '',
						joinPhrase: ac['join-phrase'] ?? ''
					})),
					labels: (rel['label-info'] ?? []).map((li: MbLabelInfo) => ({
						name: li.label?.name ?? '',
						catalogNumber: li['catalog-number'] ?? ''
					})).filter((l) => l.name),
					tracks: (rel.media ?? []).flatMap((m: MbMedium) =>
						(m.tracks ?? []).map((t: MbTrack) => ({
							title: t.title ?? t.recording?.title ?? '',
							credits: (t.recording?.['artist-credit'] ?? []).map((ac: MbArtistCredit) => ({
								name: ac.artist?.name ?? ac.name ?? ''
							}))
						}))
					)
				};
			} catch {
				error = 'Credits unavailable — MusicBrainz may be rate-limiting. Try again in a moment.';
			} finally {
				loading = false;
			}
		}
	}
</script>

<div class="liner-notes">
	<button class="liner-toggle" onclick={toggle} aria-expanded={expanded}>
		<span>Liner Notes</span>
		<span class="toggle-icon">{expanded ? '▲' : '▼'}</span>
	</button>

	{#if expanded}
		<div class="liner-content">
			{#if loading}
				<p class="liner-loading">Loading credits…</p>
			{:else if error}
				<p class="liner-error">{error}</p>
			{:else if credits}
				{#if credits.artistCredits.length > 0}
					<div class="liner-section">
						<h4>Artist Credits</h4>
						<p>{credits.artistCredits.map(ac => ac.name + ac.joinPhrase).join('')}</p>
					</div>
				{/if}

				{#if credits.labels.length > 0}
					<div class="liner-section">
						<h4>Label</h4>
						{#each credits.labels as label}
							<p>{label.name}{label.catalogNumber ? ` · ${label.catalogNumber}` : ''}</p>
						{/each}
					</div>
				{/if}

				{#if credits.tracks.some(t => t.credits.length > 0)}
					<div class="liner-section">
						<h4>Track Credits</h4>
						{#each credits.tracks.filter(t => t.credits.length > 0) as track}
							<div class="track-credit">
								<span class="track-title">{track.title}</span>
								<span class="track-artists">{track.credits.map(c => c.name).join(', ')}</span>
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>

<style>
	.liner-notes {
		border-top: 1px solid var(--border-subtle, #333);
		margin-top: 2rem;
	}

	.liner-toggle {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.875rem 0;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 1rem;
		font-weight: 500;
		color: inherit;
		text-align: left;
	}

	.liner-toggle:hover {
		color: var(--text-accent, #60a5fa);
	}

	.toggle-icon {
		font-size: 0.7rem;
		color: var(--text-muted, #888);
	}

	.liner-content {
		padding-bottom: 1.5rem;
	}

	.liner-section {
		margin-bottom: 1.25rem;
	}

	.liner-section h4 {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--text-muted, #888);
		margin-bottom: 0.4rem;
		margin-top: 0;
	}

	.liner-section p {
		margin: 0;
		font-size: 0.9rem;
		color: var(--text-primary);
	}

	.liner-loading,
	.liner-error {
		color: var(--text-muted, #888);
		font-size: 0.9rem;
		padding: 0.5rem 0;
		margin: 0;
	}

	.track-credit {
		display: flex;
		gap: 0.75rem;
		padding: 0.25rem 0;
		font-size: 0.85rem;
	}

	.track-title {
		color: var(--text-muted, #888);
		flex-shrink: 0;
	}

	.track-artists {
		color: var(--text-primary);
	}
</style>
