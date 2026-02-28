<script lang="ts">
	import AiSettings from '$lib/components/AiSettings.svelte';
	import TasteEditor from '$lib/components/TasteEditor.svelte';
	import ListeningHistory from '$lib/components/ListeningHistory.svelte';
	import SpotifySettings from '$lib/components/SpotifySettings.svelte';
	import { spotifyState } from '$lib/spotify/state.svelte';
	import { aiState } from '$lib/ai/state.svelte';
	import { isTauri } from '$lib/platform';
	import { onMount } from 'svelte';
	import { themeState, applyPalette, clearPalette } from '$lib/theme/engine.svelte';
	import { generatePalette, tasteTagsToHue } from '$lib/theme/palette';
	import { saveThemePreference, saveLayoutPreference, saveUserTemplates, saveServiceOrder } from '$lib/theme/preferences.svelte';
	import { streamingState } from '$lib/player/streaming.svelte';
	import { TEMPLATE_LIST, createUserTemplateRecord, expandUserTemplate } from '$lib/theme/templates';
	import type { LayoutTemplate } from '$lib/theme/templates';
	import { tasteProfile } from '$lib/taste/profile.svelte';
	import { layoutState } from '$lib/theme/layout-state.svelte';

	let tauriMode = $state(false);
	let newTemplateName = $state('');


	const SERVICE_LABELS: Record<string, string> = {
		bandcamp: 'Bandcamp',
		spotify: 'Spotify',
		soundcloud: 'SoundCloud',
		youtube: 'YouTube'
	};

	// ─── Identity state ───────────────────────────────────────────────────────────
	let identityHandle = $state('');
	let avatarModeLocal = $state<'generative' | 'edited'>('generative');

	// ─── Import state (session-only — never persisted to disk) ───────────────────
	let spotifyClientId = $state('');
	let spotifyStatus = $state('');

	let lastfmUsername = $state('');
	let lastfmApiKey = $state('');
	let lastfmStatus = $state('');

	let appleDeveloperToken = $state('');
	let appleStatus = $state('');

	let csvStatus = $state('');

	// ─── Export state ─────────────────────────────────────────────────────────────
	let exportStatus = $state('');

	async function saveIdentityHandle() {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('set_identity_value', { key: 'handle', value: identityHandle });
	}

	async function handleAvatarModeChange(mode: 'generative' | 'edited') {
		avatarModeLocal = mode;
		const { saveAvatarMode } = await import('$lib/identity/avatar.svelte');
		await saveAvatarMode(mode);
	}

	// ─── Import helpers ───────────────────────────────────────────────────────────

	/** Match artist names to Mercury MBIDs via Rust, add to a named collection. */
	async function matchAndImport(platformName: string, artistNames: string[]): Promise<string> {
		if (artistNames.length === 0) return 'No artists found.';
		const { invoke } = await import('@tauri-apps/api/core');
		const { createCollection, addToCollection } = await import('$lib/taste/collections.svelte');

		type MatchResult = { name: string; mbid: string | null; slug: string | null };
		let matched: MatchResult[] = [];
		try {
			matched = await invoke<MatchResult[]>('match_artists_batch', { names: artistNames });
		} catch {
			return 'match_artists_batch not available — import aborted.';
		}

		const hits = matched.filter((m) => m.mbid !== null);
		if (hits.length === 0) return `Matched 0 / ${artistNames.length} artists.`;

		const collectionName = `Imported from ${platformName}`;
		const collectionId = await createCollection(collectionName);
		if (!collectionId) return 'Could not create collection.';

		for (const hit of hits) {
			await addToCollection(collectionId, 'artist', hit.mbid!, hit.name, hit.slug ?? undefined);
		}
		return `Matched ${hits.length} / ${artistNames.length} artists — saved to "${collectionName}".`;
	}

	async function handleSpotifyImport() {
		spotifyStatus = 'Fetching your top artists...';
		try {
			const { getValidAccessToken } = await import('$lib/spotify/auth');
			const { fetchTopArtistsWithToken } = await import('$lib/taste/import/spotify');
			const token = await getValidAccessToken();
			const artists = await fetchTopArtistsWithToken(token);
			spotifyStatus = 'Matching artists...';
			spotifyStatus = await matchAndImport('Spotify', artists.map((a) => a.name));
		} catch (e: unknown) {
			spotifyStatus = `Error: ${e instanceof Error ? e.message : String(e)}`;
		}
	}

	async function handleLastFmImport() {
		lastfmStatus = 'Fetching scrobbles...';
		try {
			const { importFromLastFm } = await import('$lib/taste/import/lastfm');
			const artists = await importFromLastFm(
				lastfmUsername.trim(),
				lastfmApiKey.trim(),
				(page, total) => {
					lastfmStatus = `Fetching page ${page} / ${total}...`;
				}
			);
			lastfmStatus = 'Matching artists...';
			lastfmStatus = await matchAndImport('Last.fm', artists.map((a) => a.name));
		} catch (e: unknown) {
			lastfmStatus = `Error: ${e instanceof Error ? e.message : String(e)}`;
		}
	}

	async function handleAppleImport() {
		appleStatus = 'Authorizing with Apple Music...';
		try {
			const { importFromAppleMusic } = await import('$lib/taste/import/apple');
			const artists = await importFromAppleMusic(appleDeveloperToken.trim());
			appleStatus = 'Matching artists...';
			appleStatus = await matchAndImport('Apple Music', artists.map((a) => a.name));
		} catch (e: unknown) {
			appleStatus = `Error: ${e instanceof Error ? e.message : String(e)}`;
		}
	}

	function readFileAsText(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => resolve(e.target?.result as string ?? '');
			reader.onerror = () => reject(new Error('Failed to read file'));
			reader.readAsText(file);
		});
	}

	function parseCsvArtists(csvText: string): string[] {
		const lines = csvText.split('\n');
		if (lines.length === 0) return [];
		const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
		const artistIdx = header.findIndex((h) => h === 'artist');
		if (artistIdx === -1) return [];
		const names = new Set<string>();
		for (let i = 1; i < lines.length; i++) {
			const cols = lines[i].split(',');
			const name = cols[artistIdx]?.trim().replace(/"/g, '');
			if (name) names.add(name);
		}
		return [...names];
	}

	async function handleCsvImport(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		csvStatus = 'Reading file...';
		try {
			const text = await readFileAsText(file);
			const names = parseCsvArtists(text);
			if (names.length === 0) {
				csvStatus = 'No "Artist" column found in CSV.';
				return;
			}
			csvStatus = `Parsed ${names.length} artists — matching...`;
			csvStatus = await matchAndImport('CSV', names);
		} catch (err: unknown) {
			csvStatus = `Error: ${err instanceof Error ? err.message : String(err)}`;
		}
	}

	async function handleExportAll() {
		exportStatus = 'Exporting...';
		try {
			const { exportAllUserData } = await import('$lib/taste/import/index');
			await exportAllUserData();
			exportStatus = 'Export complete.';
		} catch (e: unknown) {
			exportStatus = `Error: ${e instanceof Error ? e.message : String(e)}`;
		}
	}

	onMount(async () => {
		tauriMode = isTauri();
		if (tauriMode) {
			const { invoke } = await import('@tauri-apps/api/core');
			identityHandle = (await invoke<string | null>('get_identity_value', { key: 'handle' })) ?? '';
			const { loadAvatarState, avatarState } = await import('$lib/identity/avatar.svelte');
			await loadAvatarState(tasteProfile.tags);
			avatarModeLocal = (avatarState.mode === 'edited' ? 'edited' : 'generative') as 'generative' | 'edited';
		}
	});

	// ─── Theme handlers ──────────────────────────────────────────────────────────

	function handleThemeModeChange(mode: 'default' | 'taste' | 'manual') {
		themeState.mode = mode;
		saveThemePreference('theme_mode', mode);

		if (mode === 'default') {
			clearPalette();
		} else if (mode === 'taste' && tasteProfile.tags.length > 0) {
			const hue = tasteTagsToHue(tasteProfile.tags);
			themeState.computedHue = hue;
			const palette = generatePalette(hue);
			themeState.palette = palette;
			applyPalette(palette);
		} else if (mode === 'manual') {
			const palette = generatePalette(themeState.manualHue);
			themeState.palette = palette;
			applyPalette(palette);
		}
	}

	function handleHueChange(hue: number) {
		themeState.manualHue = hue;
		saveThemePreference('theme_manual_hue', String(hue));
		const palette = generatePalette(hue);
		themeState.palette = palette;
		applyPalette(palette);
	}

	// ─── Layout handlers ─────────────────────────────────────────────────────────

	function handleLayoutChange(templateId: string) {
		layoutState.template = templateId as LayoutTemplate;
		saveLayoutPreference(templateId);
	}

	function handleSaveAsTemplate() {
		const name = newTemplateName.trim();
		if (!name) return;
		// Determine base panes from active template
		const activeConfig =
			TEMPLATE_LIST.find((t) => t.id === layoutState.template) ??
			layoutState.userTemplates.map(expandUserTemplate).find((t) => t.id === layoutState.template);
		const basePanes = activeConfig?.panes ?? 'three';
		const record = createUserTemplateRecord(name, basePanes);
		layoutState.userTemplates = [...layoutState.userTemplates, record];
		saveUserTemplates(layoutState.userTemplates);
		newTemplateName = '';
	}

	function handleDeleteUserTemplate(id: string) {
		layoutState.userTemplates = layoutState.userTemplates.filter((t) => t.id !== id);
		saveUserTemplates(layoutState.userTemplates);
		// If deleted template was active, fall back to cockpit
		if (layoutState.template === id) handleLayoutChange('cockpit');
	}

	// ─── Streaming handler ───────────────────────────────────────────────────────

	function moveService(idx: number, direction: -1 | 1): void {
		const newIdx = idx + direction;
		if (newIdx < 0 || newIdx >= streamingState.serviceOrder.length) return;
		const order = [...streamingState.serviceOrder];
		const [moved] = order.splice(idx, 1);
		order.splice(newIdx, 0, moved);
		streamingState.serviceOrder = order;
		saveServiceOrder(order);
	}
</script>

<svelte:head>
	<title>Settings</title>
</svelte:head>

{#if !tauriMode}
	<div class="desktop-only">
		<div class="desktop-only-icon">
			<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
				<rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
				<line x1="8" y1="21" x2="16" y2="21" />
				<line x1="12" y1="17" x2="12" y2="21" />
			</svg>
		</div>
		<h2>Settings are only available in the desktop app</h2>
		<p>AI features and local configuration require the BlackTape desktop application.</p>
	</div>
{:else}
	<div class="settings-page">
		<h1>Settings</h1>

		<!-- Appearance (Theme) -->
		<div class="settings-section">
			<h2>Appearance</h2>
			<p class="section-desc">
				Your taste shapes your colors. Choose how BlackTape looks.
			</p>

			<div class="setting-row">
				<span class="setting-label">Theme Mode</span>
				<div class="radio-group">
					<label class="radio-option">
						<input type="radio" name="theme-mode" value="default"
							checked={themeState.mode === 'default'}
							onchange={() => handleThemeModeChange('default')} />
						<span>Default</span>
						<span class="radio-desc">Classic dark theme</span>
					</label>
					<label class="radio-option">
						<input type="radio" name="theme-mode" value="taste"
							checked={themeState.mode === 'taste'}
							disabled={!tasteProfile.hasEnoughData}
							onchange={() => handleThemeModeChange('taste')} />
						<span>Taste</span>
						<span class="radio-desc">Colors from your music taste{!tasteProfile.hasEnoughData ? ' (need more data)' : ''}</span>
					</label>
					<label class="radio-option">
						<input type="radio" name="theme-mode" value="manual"
							checked={themeState.mode === 'manual'}
							onchange={() => handleThemeModeChange('manual')} />
						<span>Custom</span>
						<span class="radio-desc">Pick your own hue</span>
					</label>
				</div>
			</div>

			{#if themeState.mode === 'manual'}
				<div class="setting-row">
					<label for="hue-slider" class="setting-label">Hue ({themeState.manualHue}deg)</label>
					<input id="hue-slider" type="range" min="0" max="360" step="1"
						value={themeState.manualHue}
						oninput={(e) => handleHueChange(parseInt(e.currentTarget.value))}
						class="hue-slider" />
					<div class="hue-preview" style:background="oklch(0.72 0.12 {themeState.manualHue})"></div>
				</div>
			{/if}
		</div>

		<!-- Layout -->
		<div class="settings-section">
			<h2>Layout</h2>
			<p class="section-desc">
				Choose your workspace arrangement. Panel sizes are remembered per template.
			</p>

			<div class="template-grid">
				{#each TEMPLATE_LIST as tmpl}
					<button
						class="template-card"
						class:active={layoutState.template === tmpl.id}
						onclick={() => handleLayoutChange(tmpl.id)}>
						<span class="template-name">{tmpl.label}</span>
						{#if layoutState.template === tmpl.id}
							<span class="template-desc">{tmpl.description}</span>
						{/if}
					</button>
				{/each}
			</div>

			{#if layoutState.userTemplates.length > 0}
				<h3 class="sub-section-label">My Layouts</h3>
				<div class="template-grid">
					{#each layoutState.userTemplates as userTmpl}
						<div class="template-card user-template" class:active={layoutState.template === userTmpl.id}>
							<button class="template-select-btn" onclick={() => handleLayoutChange(userTmpl.id)}>
								<span class="template-name">{userTmpl.label}</span>
								<span class="template-desc">{userTmpl.basePanes === 'three' ? '3-pane' : userTmpl.basePanes === 'two' ? '2-pane' : 'single column'}</span>
							</button>
							<button class="template-delete-btn" onclick={() => handleDeleteUserTemplate(userTmpl.id)} title="Delete">×</button>
						</div>
					{/each}
				</div>
			{/if}

			<div class="save-template-row">
				<input
					type="text"
					placeholder="Name this layout..."
					bind:value={newTemplateName}
					class="template-name-input"
					maxlength={40} />
				<button
					class="save-template-btn"
					onclick={handleSaveAsTemplate}
					disabled={!newTemplateName.trim()}>
					Save layout
				</button>
			</div>
		</div>

		<!-- Streaming Preference -->
		<div class="settings-section">
			<h2>Streaming</h2>
			<p class="section-desc">
				Use the arrows to set your preferred service order. The top service loads by default on artist and release pages.
			</p>

			<div class="service-order-list">
				{#each streamingState.serviceOrder as service, i}
					<div class="service-row" role="listitem">
						<span class="service-name">
							{#if i === 0}<span class="service-badge">default</span>{/if}
							{SERVICE_LABELS[service] ?? service}
						</span>
						<div class="service-arrows">
							<button class="arrow-btn" onclick={() => moveService(i, -1)} disabled={i === 0} aria-label="Move up">▲</button>
							<button class="arrow-btn" onclick={() => moveService(i, 1)} disabled={i === streamingState.serviceOrder.length - 1} aria-label="Move down">▼</button>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Spotify -->
		{#if tauriMode}
			<div class="settings-section">
				<h2>Spotify</h2>
				<SpotifySettings />
			</div>
		{/if}

		<!-- Identity -->
		<div class="settings-section">
			<h2>Identity</h2>
			<p class="section-desc">
				Set your handle and choose how your avatar is generated.
			</p>

			<div class="setting-row">
				<label for="handle-input" class="setting-label">Handle</label>
				<input
					id="handle-input"
					type="text"
					class="text-input"
					bind:value={identityHandle}
					placeholder="@yourhandle"
					onblur={saveIdentityHandle}
					maxlength={40}
				/>
			</div>

			<div class="setting-row">
				<span class="setting-label">Avatar</span>
				<div class="btn-group">
					<button
						class="btn-toggle"
						class:active={avatarModeLocal === 'generative'}
						onclick={() => handleAvatarModeChange('generative')}
					>Generative</button>
					<button
						class="btn-toggle"
						class:active={avatarModeLocal === 'edited'}
						onclick={() => handleAvatarModeChange('edited')}
					>Custom</button>
				</div>
			</div>

			<div class="setting-row">
				<a href="/profile" class="profile-link">View your full profile →</a>
			</div>
		</div>

		<!-- Import Listening History -->
		<div class="settings-section">
			<h2>Import Listening History</h2>
			<p class="section-desc">
				Import your top artists from another service to seed your shelves. Credentials are session-only and never saved to disk.
			</p>

			<!-- Spotify -->
			<div class="import-card">
				<div class="import-card-header">
					<span class="import-platform">Spotify</span>
					{#if spotifyState.connected}
						<span class="connected-badge">Connected</span>
					{/if}
				</div>
				{#if spotifyState.connected}
					<p class="import-card-desc">Import your top 50 artists from your Spotify listening history into a shelf.</p>
					<div class="import-card-actions">
						<button class="import-btn" onclick={handleSpotifyImport}>
							Import from Spotify
						</button>
						{#if spotifyStatus}
							<span class="import-status">{spotifyStatus}</span>
						{/if}
					</div>
				{:else}
					<p class="import-card-desc">Connect your Spotify account in the <strong>Spotify</strong> section above, then come back here to import your listening history.</p>
				{/if}
			</div>

			<!-- Last.fm -->
			<div class="import-card">
				<div class="import-card-header">
					<span class="import-platform">Last.fm</span>
				</div>
				<p class="import-card-desc">Requires your Last.fm username and an API key (<a href="https://www.last.fm/api/account/create" target="_blank" rel="noopener noreferrer">last.fm/api/account/create</a>).</p>
				<div class="import-card-fields">
					<input
						type="text"
						class="text-input"
						bind:value={lastfmUsername}
						placeholder="Username"
					/>
					<input
						type="text"
						class="text-input"
						bind:value={lastfmApiKey}
						placeholder="API Key"
					/>
				</div>
				<div class="import-card-actions">
					<button
						class="import-btn"
						onclick={handleLastFmImport}
						disabled={!lastfmUsername.trim() || !lastfmApiKey.trim()}
					>Import from Last.fm</button>
					{#if lastfmStatus}
						<span class="import-status">{lastfmStatus}</span>
					{/if}
				</div>
			</div>

			<!-- Apple Music -->
			<div class="import-card">
				<div class="import-card-header">
					<span class="import-platform">Apple Music</span>
					<span class="badge-advanced">Advanced</span>
				</div>
				<p class="import-card-desc">Requires an Apple Developer Token (MusicKit key). See <a href="https://developer.apple.com/documentation/musickit" target="_blank" rel="noopener noreferrer">Apple MusicKit docs</a> for setup. Loads MusicKit JS on demand.</p>
				<div class="import-card-fields">
					<input
						type="text"
						class="text-input"
						bind:value={appleDeveloperToken}
						placeholder="Developer Token"
					/>
				</div>
				<div class="import-card-actions">
					<button
						class="import-btn"
						onclick={handleAppleImport}
						disabled={!appleDeveloperToken.trim()}
					>Import from Apple Music</button>
					{#if appleStatus}
						<span class="import-status">{appleStatus}</span>
					{/if}
				</div>
			</div>

			<!-- CSV -->
			<div class="import-card">
				<div class="import-card-header">
					<span class="import-platform">CSV</span>
				</div>
				<p class="import-card-desc">Upload any CSV with an <code>Artist</code> column. Works with Last.fm CSV exports, Spotify data downloads, and custom spreadsheets.</p>
				<div class="import-card-actions">
					<label class="import-file-label">
						Choose CSV file
						<input
							type="file"
							accept=".csv"
							onchange={handleCsvImport}
							class="import-file-input"
						/>
					</label>
					{#if csvStatus}
						<span class="import-status">{csvStatus}</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Your Data -->
		<div class="settings-section">
			<h2>Your Data</h2>
			<p class="section-desc">
				Exports your identity, shelves, taste profile, and listening history as a single JSON file. You own your data.
			</p>
			<div class="export-row">
				<button class="export-btn" onclick={handleExportAll}>Export All Data</button>
				{#if exportStatus}
					<span class="import-status">{exportStatus}</span>
				{/if}
			</div>
		</div>

		<div class="section-separator"></div>

		<AiSettings />

		{#if aiState.enabled}
			<div class="section-separator"></div>
			<div class="settings-section">
				<h2>Taste Profile</h2>
				<p class="section-desc">
					Control what the AI thinks you like. Adjust tag weights, add your own, and pin artist anchors.
				</p>
				<TasteEditor />
			</div>
		{/if}

		<div class="section-separator"></div>
		<div class="settings-section">
			<h2>Listening History</h2>
			<p class="section-desc">
				Tracks you listen to past 70% are recorded and shape your taste profile. Your history stays local — it never leaves your device.
			</p>
			<ListeningHistory />
		</div>

	</div>
{/if}

<style>
	.desktop-only {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		text-align: center;
		padding:  20px;
		color: var(--t-2);
	}

	.desktop-only-icon {
		color: var(--t-3);
		margin-bottom: var(--space-lg);
	}

	.desktop-only h2 {
		font-size: 1.2rem;
		font-weight: 500;
		color: var(--t-1);
		margin: 0 0 var(--space-sm);
	}

	.desktop-only p {
		font-size: 0.85rem;
		margin: 0;
	}

	.settings-page {
		padding: 20px;
	}

	.settings-page h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--t-1);
		margin: 0 0 var(--space-lg);
	}

	.section-separator {
		height: 1px;
		background: var(--b-1);
		margin: var(--space-sm) 0;
	}

	.settings-section {
		padding: 20px;
		background: var(--bg-2);
		border: 1px solid var(--b-1);
		border-radius: 0;
		margin-bottom: var(--space-lg);
	}

	.settings-section h2 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--t-1);
		margin: 0 0 var(--space-xs);
	}

	.section-desc {
		font-size: 0.8rem;
		color: var(--t-2);
		margin: 0 0 var(--space-md);
		line-height: 1.5;
	}

	/* ─── Setting rows ─────────────────────────────────────────────────── */

	.setting-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
		flex-wrap: wrap;
	}

	.setting-label {
		font-size: 0.8rem;
		color: var(--t-2);
		min-width: 120px;
		flex-shrink: 0;
	}

	/* ─── Radio group (theme mode) ─────────────────────────────────────── */

	.radio-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.radio-option {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		cursor: pointer;
		font-size: 0.85rem;
		color: var(--t-1);
	}

	.radio-option input[type='radio'] {
		accent-color: var(--acc);
		cursor: pointer;
	}

	.radio-option input[type='radio']:disabled {
		cursor: not-allowed;
		opacity: 0.4;
	}

	.radio-option input[type='radio']:disabled + span {
		opacity: 0.5;
	}

	.radio-desc {
		font-size: 0.7rem;
		color: var(--t-3);
	}

	/* ─── Hue slider ───────────────────────────────────────────────────── */

	.hue-slider {
		flex: 1;
		min-width: 120px;
		accent-color: oklch(0.72 0.12 var(--accent-hue, 220));
	}

	.hue-preview {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 1px solid var(--b-2);
		flex-shrink: 0;
	}

	/* ─── Template grid ────────────────────────────────────────────────── */

	.template-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
	}

	.template-card {
		background: var(--bg-3);
		border: 1px solid var(--b-1);
		padding: var(--space-sm);
		border-radius: 0;
		cursor: pointer;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 4px;
		overflow: hidden;
		transition: border-color 0.15s, background 0.15s;
	}

	.template-card:hover {
		background: var(--bg-3);
		border-color: var(--b-2);
	}

	.template-card.active {
		border-color: var(--acc);
		background: var(--bg-3);
	}

	.template-name {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--t-1);
	}

	.template-desc {
		font-size: 0.7rem;
		color: var(--t-3);
	}

	/* ─── User templates ───────────────────────────────────────────────── */

	.user-template {
		position: relative;
		flex-direction: row;
		align-items: center;
		padding: 0;
		overflow: hidden;
	}

	.template-select-btn {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: var(--space-sm);
		background: none;
		border: none;
		cursor: pointer;
		text-align: center;
	}

	.template-delete-btn {
		flex-shrink: 0;
		padding: var(--space-xs);
		background: none;
		border: none;
		border-left: 1px solid var(--b-1);
		color: var(--t-3);
		cursor: pointer;
		font-size: 1rem;
		line-height: 1;
		align-self: stretch;
		display: flex;
		align-items: center;
		transition: color 0.15s;
	}

	.template-delete-btn:hover {
		color: var(--acc);
	}

	.sub-section-label {
		font-size: 0.75rem;
		color: var(--t-3);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin-top: var(--space-sm);
		margin-bottom: var(--space-xs);
		font-weight: 500;
	}

	/* ─── Save template row ────────────────────────────────────────────── */

	.save-template-row {
		display: flex;
		gap: var(--space-sm);
		margin-top: var(--space-sm);
	}

	.template-name-input {
		flex: 1;
		background: var(--bg-3);
		color: var(--t-1);
		border: 1px solid var(--b-2);
		padding: var(--space-xs) var(--space-sm);
		border-radius: 0;
		font-size: 0.85rem;
		outline: none;
		transition: border-color 0.15s;
	}

	.template-name-input:focus {
		border-color: var(--b-3);
	}

	.template-name-input::placeholder {
		color: var(--t-3);
	}

	.save-template-btn {
		background: var(--bg-3);
		color: var(--t-1);
		border: 1px solid var(--b-2);
		padding: var(--space-xs) var(--space-sm);
		border-radius: 0;
		cursor: pointer;
		font-size: 0.85rem;
		white-space: nowrap;
		transition: border-color 0.15s, background 0.15s;
	}

	.save-template-btn:hover:not(:disabled) {
		border-color: var(--b-3);
		background: var(--bg-3);
	}

	.save-template-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* ─── Text input (shared) ──────────────────────────────────────────── */

	.text-input {
		background: var(--bg-3);
		color: var(--t-1);
		border: 1px solid var(--b-2);
		padding: var(--space-xs) var(--space-sm);
		border-radius: 0;
		font-size: 0.85rem;
		outline: none;
		transition: border-color 0.15s;
		min-width: 200px;
	}

	.text-input:focus {
		border-color: var(--b-3);
	}

	.text-input::placeholder {
		color: var(--t-3);
	}

	/* ─── Avatar mode toggle ────────────────────────────────────────────── */

	.btn-group {
		display: flex;
		gap: 0;
		border: 1px solid var(--b-2);
		border-radius: 0;
		overflow: hidden;
	}

	.btn-toggle {
		background: var(--bg-3);
		color: var(--t-2);
		border: none;
		padding: var(--space-xs) var(--space-sm);
		font-size: 0.8rem;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
	}

	.btn-toggle + .btn-toggle {
		border-left: 1px solid var(--b-2);
	}

	.btn-toggle.active {
		background: var(--acc);
		color: #fff;
	}

	/* ─── Profile link ──────────────────────────────────────────────────── */

	.profile-link {
		font-size: 0.8rem;
		color: var(--acc);
		text-decoration: none;
	}

	.profile-link:hover {
		text-decoration: underline;
	}

	/* ─── Import cards ──────────────────────────────────────────────────── */

	.import-card {
		background: var(--bg-3);
		border: 1px solid var(--b-1);
		border-radius: 0;
		padding: var(--space-md);
		margin-top: var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.import-card-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.import-platform {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--t-1);
	}

	.badge-advanced {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 6px;
		border-radius: 0;
		background: var(--bg-3);
		color: var(--t-3);
		border: 1px solid var(--b-1);
	}

	.import-card-desc {
		font-size: 0.78rem;
		color: var(--t-3);
		line-height: 1.5;
		margin: 0;
	}

	.import-card-desc a {
		color: var(--acc);
		text-decoration: none;
	}

	.import-card-desc a:hover {
		text-decoration: underline;
	}

	.import-card-desc code {
		font-size: 0.75rem;
		background: var(--bg-3);
		padding: 1px 4px;
		border-radius: 0;
		color: var(--t-2);
	}

	.import-card-fields {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.import-card-actions {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.import-btn {
		background: var(--bg-3);
		color: var(--t-1);
		border: 1px solid var(--b-2);
		padding: var(--space-xs) var(--space-sm);
		border-radius: 0;
		cursor: pointer;
		font-size: 0.8rem;
		white-space: nowrap;
		transition: border-color 0.15s, background 0.15s;
	}

	.import-btn:hover:not(:disabled) {
		border-color: var(--b-3);
		background: var(--bg-3);
	}

	.import-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.import-file-label {
		background: var(--bg-3);
		color: var(--t-1);
		border: 1px solid var(--b-2);
		padding: var(--space-xs) var(--space-sm);
		border-radius: 0;
		cursor: pointer;
		font-size: 0.8rem;
		white-space: nowrap;
		transition: border-color 0.15s, background 0.15s;
	}

	.import-file-label:hover {
		border-color: var(--b-3);
		background: var(--bg-3);
	}

	.import-file-input {
		display: none;
	}

	.import-status {
		font-size: 0.78rem;
		color: var(--t-2);
		font-style: italic;
	}

	/* ─── Export row ────────────────────────────────────────────────────── */

	.export-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.export-btn {
		background: var(--bg-3);
		color: var(--t-1);
		border: 1px solid var(--b-2);
		padding: var(--space-sm) var(--space-md);
		border-radius: 0;
		cursor: pointer;
		font-size: 0.85rem;
		transition: border-color 0.15s, background 0.15s;
	}

	.export-btn:hover {
		border-color: var(--b-3);
		background: var(--bg-3);
	}

	/* ─── Streaming preference ─────────────────────────────────────────── */

	.platform-select {
		background: var(--bg-3);
		color: var(--t-1);
		border: 1px solid var(--b-2);
		padding: var(--space-xs) var(--space-sm);
		border-radius: 0;
		font-size: 0.85rem;
		outline: none;
		cursor: pointer;
		transition: border-color 0.15s;
	}

	.platform-select:focus {
		border-color: var(--b-3);
	}

	/* ─── Streaming service order ─────────────────────────────── */
	.service-order-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-width: 320px;
	}

	.service-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		background: var(--bg-3);
		border: 1px solid var(--b-1);
		border-radius: 0;
	}

	.service-name {
		font-size: 13px;
		color: var(--t-1);
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.service-badge {
		font-size: 0.6rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 1px 5px;
		background: color-mix(in oklch, var(--acc) 15%, transparent);
		color: var(--acc);
		border: 1px solid color-mix(in oklch, var(--acc) 40%, transparent);
	}

	.service-arrows {
		display: flex;
		gap: 2px;
	}

	.arrow-btn {
		background: none;
		border: 1px solid var(--b-1);
		color: var(--t-2);
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 18px;
		line-height: 1;
		border-radius: 0;
		transition: border-color 0.1s, color 0.1s;
		overflow: hidden;
	}

	.arrow-btn:hover:not(:disabled) {
		border-color: var(--b-3);
		color: var(--t-1);
	}

	.arrow-btn:disabled {
		opacity: 0.25;
		cursor: not-allowed;
	}
</style>
