<script lang="ts">
	/**
	 * SiteGenDialog — Export artist page as a self-contained static HTML site.
	 *
	 * State machine:
	 *   confirming  — Preview dialog: shows artist name, release count, tag count, bio availability
	 *   picking     — OS folder picker is open (waiting on user)
	 *   generating  — Rust command running, downloading covers
	 *   success     — Generation complete: shows output path + cover count + "Open folder" button
	 *   error       — Generation failed: shows error message
	 *
	 * Tauri-only — the parent artist page gates with {#if tauriMode}.
	 * No isTauri guard needed inside this component.
	 */

	type DialogState = 'confirming' | 'picking' | 'generating' | 'success' | 'error';

	let {
		artist,
		releases,
		bio,
		onclose,
	}: {
		artist: { name: string; slug: string; tags: string | null; mbid: string };
		releases: Array<{
			mbid: string;
			title: string;
			year: number | null;
			type: string;
			coverArtUrl: string | null;
			links: Array<{ url: string; platform: string }>;
		}>;
		bio: string | null;
		onclose: () => void;
	} = $props();

	let dialogState = $state<DialogState>('confirming');
	let errorMessage = $state('');
	let generationResult = $state<{ output_dir: string; cover_count: number } | null>(null);

	let tagList = $derived(
		artist.tags ? artist.tags.split(', ').filter(Boolean) : []
	);

	async function handleConfirm() {
		dialogState = 'picking';

		const { open } = await import('@tauri-apps/plugin-dialog');
		const selected = await open({ directory: true, multiple: false, title: 'Choose export folder' });

		if (!selected) {
			// User cancelled the folder picker — go back to confirming
			dialogState = 'confirming';
			return;
		}

		dialogState = 'generating';

		try {
			const { invoke } = await import('@tauri-apps/api/core');

			const artistPayload = {
				name: artist.name,
				slug: artist.slug,
				tags: artist.tags ?? '',
				country: null,
				type: null,
				begin_year: null,
				ended: false,
				bio: bio ?? null,
				releases: releases.map(r => ({
					mbid: r.mbid,
					title: r.title,
					year: r.year,
					type: r.type,
					cover_art_url: r.coverArtUrl ?? null,
					links: r.links.map(l => ({ url: l.url, platform: l.platform })),
				})),
			};

			const result = await invoke<{ output_dir: string; cover_count: number }>(
				'generate_artist_site',
				{ outputDir: selected, artist: artistPayload }
			);

			generationResult = result;
			dialogState = 'success';
		} catch (e) {
			errorMessage = String(e);
			dialogState = 'error';
		}
	}

	async function handleOpenFolder() {
		if (!generationResult) return;
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('open_in_explorer', { path: generationResult.output_dir }).catch(() => {});
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onclose();
		}
	}

	function handleBackdropKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}
</script>

<!-- svelte-ignore a11y_interactive_supports_focus a11y_click_events_have_key_events -->
<div
	class="backdrop"
	onclick={handleBackdropClick}
	onkeydown={handleBackdropKeydown}
	role="dialog"
	aria-modal="true"
	aria-label="Export artist site"
	tabindex="-1"
>
	<div class="card" data-testid="site-gen-dialog">

		{#if dialogState === 'confirming'}
			<h2 class="heading">Export site for {artist.name}</h2>

			<ul class="summary-list">
				<li>Bio: {bio ? 'included' : 'not available'}</li>
				<li>{releases.length} release{releases.length === 1 ? '' : 's'}</li>
				<li>{tagList.length} tag{tagList.length === 1 ? '' : 's'}</li>
			</ul>

			<p class="note">
				Cover art will be downloaded at generation time. Missing covers will be replaced with a placeholder.
			</p>

			<div class="button-row">
				<button
					class="btn btn-primary"
					data-testid="site-gen-confirm-btn"
					onclick={handleConfirm}
				>
					Export site
				</button>
				<button class="btn btn-secondary" onclick={onclose}>
					Cancel
				</button>
			</div>

		{:else if dialogState === 'picking'}
			<div class="spinner-wrap">
				<span class="spinner" aria-hidden="true"></span>
				<p class="spinner-text">Choose a folder&hellip;</p>
			</div>

		{:else if dialogState === 'generating'}
			<div class="spinner-wrap">
				<span class="spinner" aria-hidden="true"></span>
				<p class="spinner-text">Generating site&hellip; downloading covers.</p>
				<p class="note">Cover downloads may take a few seconds for artists with many releases.</p>
			</div>

		{:else if dialogState === 'success'}
			<div data-testid="site-gen-success">
				<h2 class="heading heading-success">Site exported!</h2>

				<p class="output-path-label">Saved to:</p>
				<code class="output-path">{generationResult?.output_dir}</code>

				<p class="cover-count">
					{generationResult?.cover_count} cover image{generationResult?.cover_count === 1 ? '' : 's'} downloaded.
				</p>

				<div class="button-row">
					<button
						class="btn btn-primary"
						data-testid="site-gen-open-folder-btn"
						onclick={handleOpenFolder}
					>
						Open folder
					</button>
					<button class="btn btn-secondary" onclick={onclose}>
						Done
					</button>
				</div>
			</div>

		{:else if dialogState === 'error'}
			<h2 class="heading heading-error">Export failed</h2>
			<pre class="error-text">{errorMessage}</pre>
			<div class="button-row">
				<button class="btn btn-secondary" onclick={onclose}>Close</button>
			</div>
		{/if}

	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.card {
		background: #1c1c1c;
		border: 1px solid #333;
		border-radius: 8px;
		padding: 1.5rem;
		max-width: 480px;
		width: 100%;
		margin: 1rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
	}

	.heading {
		font-size: 1.2rem;
		font-weight: 500;
		color: #e0e0e0;
		margin: 0 0 1rem;
		letter-spacing: 0.01em;
	}

	.heading-success {
		color: #7ec87e;
	}

	.heading-error {
		color: #e07e7e;
	}

	/* Summary list */
	.summary-list {
		list-style: none;
		margin: 0 0 1rem;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.summary-list li {
		font-size: 0.9rem;
		color: #bbb;
		padding-left: 1rem;
		position: relative;
	}

	.summary-list li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: #555;
	}

	/* Note text */
	.note {
		font-size: 0.8rem;
		color: #888;
		margin: 0 0 1.25rem;
		line-height: 1.5;
		font-style: italic;
	}

	/* Buttons */
	.button-row {
		display: flex;
		gap: 0.75rem;
		margin-top: 1.25rem;
	}

	.btn {
		padding: 0.45rem 1rem;
		border-radius: 5px;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s, color 0.15s;
		line-height: 1.4;
	}

	.btn-primary {
		background: #5a4fe8;
		border: 1px solid #5a4fe8;
		color: #fff;
	}

	.btn-primary:hover {
		background: #6b5ff5;
		border-color: #6b5ff5;
	}

	.btn-secondary {
		background: none;
		border: 1px solid #444;
		color: #aaa;
	}

	.btn-secondary:hover {
		border-color: #666;
		color: #ccc;
	}

	/* Spinner states */
	.spinner-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 0;
	}

	.spinner {
		display: block;
		width: 28px;
		height: 28px;
		border: 3px solid #333;
		border-top-color: #7c6af7;
		border-radius: 50%;
		animation: spin 0.75s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.spinner-text {
		color: #aaa;
		font-size: 0.9rem;
		margin: 0;
		text-align: center;
	}

	/* Success state */
	.output-path-label {
		font-size: 0.8rem;
		color: #888;
		margin: 0 0 0.25rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.output-path {
		display: block;
		font-family: monospace;
		font-size: 0.82rem;
		color: #b5c8ff;
		background: #141414;
		border: 1px solid #333;
		border-radius: 4px;
		padding: 0.4rem 0.6rem;
		word-break: break-all;
		margin-bottom: 0.75rem;
	}

	.cover-count {
		font-size: 0.85rem;
		color: #aaa;
		margin: 0;
	}

	/* Error state */
	.error-text {
		font-family: monospace;
		font-size: 0.78rem;
		color: #e07e7e;
		background: #1a1010;
		border: 1px solid #4a2020;
		border-radius: 4px;
		padding: 0.5rem 0.75rem;
		overflow-x: auto;
		white-space: pre-wrap;
		word-break: break-word;
		margin: 0.5rem 0 0;
		max-height: 180px;
		overflow-y: auto;
	}
</style>
