<script lang="ts">
	/**
	 * ExportDialog — export queue tracks as M3U or Traktor NML playlist,
	 * with optional file copy to a destination folder.
	 *
	 * Props:
	 *   tracks   — array of PlayerTrack from the queue
	 *   onclose  — called when the dialog is dismissed
	 */
	import type { PlayerTrack } from '$lib/player/state.svelte';

	let { tracks, onclose }: { tracks: PlayerTrack[]; onclose: () => void } = $props();

	type Format = 'm3u' | 'nml';

	let format = $state<Format>('m3u');
	let copyFiles = $state(false);
	let isExporting = $state(false);
	let result = $state<string | null>(null);
	let errorMsg = $state<string | null>(null);

	const localCount = $derived(tracks.filter((t) => t.path).length);

	async function handleExport() {
		if (isExporting) return;

		isExporting = true;
		result = null;
		errorMsg = null;

		try {
			const { open } = await import('@tauri-apps/plugin-dialog');
			const { invoke } = await import('@tauri-apps/api/core');

			// Let user pick a destination folder
			const folder = await open({ directory: true, multiple: false, title: 'Choose export folder' });
			if (!folder || typeof folder !== 'string') {
				isExporting = false;
				return; // user cancelled
			}

			const exportTracks = tracks.map((t) => ({
				path: t.path ?? '',
				title: t.title,
				artist: t.artist,
				album: t.album,
				duration_secs: t.durationSecs
			}));

			const parts: string[] = [];

			// Write playlist file
			const ext = format === 'nml' ? 'nml' : 'm3u';
			const playlistName = `blacktape-queue.${ext}`;
			const playlistPath = `${folder}/${playlistName}`.replace(/\\/g, '/');

			const playlistResult: string = await invoke(
				format === 'nml' ? 'export_queue_nml' : 'export_queue_m3u',
				{ tracks: exportTracks, outputPath: playlistPath }
			);
			parts.push(playlistResult);

			// Optionally copy files
			if (copyFiles) {
				const copyResult: string = await invoke('copy_tracks_to_folder', {
					tracks: exportTracks,
					outputDir: folder
				});
				parts.push(copyResult);
			}

			result = parts.join(' ');
		} catch (err) {
			errorMsg = String(err);
		} finally {
			isExporting = false;
		}
	}
</script>

<div class="export-overlay" role="presentation" onclick={onclose}>
	<div
		class="export-dialog"
		role="dialog"
		aria-label="Export queue"
		data-testid="export-dialog"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="dialog-header">
			<h2>Export queue</h2>
			<button class="close-btn" onclick={onclose} aria-label="Close">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>

		<p class="summary">
			{tracks.length} track{tracks.length !== 1 ? 's' : ''} in queue — {localCount} with local files.
		</p>

		{#if localCount === 0}
			<p class="no-local">No local files in the queue. Add tracks from your Library to export them.</p>
		{:else}
			<div class="section">
				<span class="label">Playlist format</span>
				<div class="format-row">
					<label class="format-option" class:selected={format === 'm3u'}>
						<input type="radio" name="format" value="m3u" bind:group={format} />
						<span class="format-name">M3U</span>
						<span class="format-desc">Universal — works with VLC, foobar2000, most players</span>
					</label>
					<label class="format-option" class:selected={format === 'nml'}>
						<input type="radio" name="format" value="nml" bind:group={format} />
						<span class="format-name">Traktor NML</span>
						<span class="format-desc">Native Instruments Traktor DJ collection format</span>
					</label>
				</div>
			</div>

			<div class="section">
				<label class="copy-row">
					<input type="checkbox" bind:checked={copyFiles} />
					<span>Also copy MP3/FLAC files to the export folder</span>
				</label>
			</div>

			{#if result}
				<p class="success" data-testid="export-result">{result}</p>
			{/if}

			{#if errorMsg}
				<p class="error">{errorMsg}</p>
			{/if}

			<div class="actions">
				<button class="btn-cancel" onclick={onclose}>Cancel</button>
				<button
					class="btn-export"
					onclick={handleExport}
					disabled={isExporting || localCount === 0}
					data-testid="export-btn"
				>
					{#if isExporting}
						Exporting…
					{:else if result}
						Done
					{:else}
						Export
					{/if}
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.export-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.export-dialog {
		background: var(--bg-2);
		border: 1px solid var(--b-1);
		border-radius: var(--r);
		width: 420px;
		max-width: calc(100vw - 2rem);
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.dialog-header h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.close-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.25rem;
		opacity: 0.5;
		line-height: 1;
		transition: opacity 0.15s;
	}

	.close-btn:hover {
		opacity: 1;
	}

	.summary {
		margin: 0;
		font-size: 0.85rem;
		opacity: 0.6;
	}

	.no-local {
		margin: 0;
		font-size: 0.85rem;
		opacity: 0.7;
		font-style: italic;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		opacity: 0.5;
	}

	.format-row {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.format-option {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--b-1);
		border-radius: var(--r);
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}

	.format-option.selected {
		border-color: var(--acc);
		background: color-mix(in oklch, var(--acc) 10%, transparent);
	}

	.format-option input[type='radio'] {
		margin-top: 0.15rem;
		accent-color: var(--acc);
	}

	.format-name {
		font-size: 0.85rem;
		font-weight: 600;
	}

	.format-desc {
		font-size: 0.75rem;
		opacity: 0.6;
		margin-left: 0.25rem;
	}

	.copy-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		cursor: pointer;
	}

	.copy-row input[type='checkbox'] {
		accent-color: var(--acc);
	}

	.success {
		margin: 0;
		font-size: 0.85rem;
		color: var(--acc);
	}

	.error {
		margin: 0;
		font-size: 0.85rem;
		opacity: 0.8;
		color: #e05;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.btn-cancel {
		background: none;
		border: 1px solid var(--b-1);
		border-radius: var(--r);
		padding: 0.4rem 1rem;
		font-size: 0.85rem;
		cursor: pointer;
		opacity: 0.7;
		transition: opacity 0.15s;
	}

	.btn-cancel:hover {
		opacity: 1;
	}

	.btn-export {
		background: var(--acc);
		color: var(--bg-0);
		border: none;
		border-radius: var(--r);
		padding: 0.4rem 1.25rem;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.btn-export:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
