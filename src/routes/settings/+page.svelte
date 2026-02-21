<script lang="ts">
	import AiSettings from '$lib/components/AiSettings.svelte';
	import TasteEditor from '$lib/components/TasteEditor.svelte';
	import ListeningHistory from '$lib/components/ListeningHistory.svelte';
	import { aiState } from '$lib/ai/state.svelte';
	import { isTauri } from '$lib/platform';
	import { onMount } from 'svelte';
	import { themeState, applyPalette, clearPalette } from '$lib/theme/engine.svelte';
	import { generatePalette, tasteTagsToHue } from '$lib/theme/palette';
	import { saveThemePreference, saveStreamingPreference, saveLayoutPreference, saveUserTemplates, streamingPref } from '$lib/theme/preferences.svelte';
	import { TEMPLATE_LIST, createUserTemplateRecord, expandUserTemplate } from '$lib/theme/templates';
	import type { LayoutTemplate } from '$lib/theme/templates';
	import { tasteProfile } from '$lib/taste/profile.svelte';
	import { layoutState } from '$lib/theme/layout-state.svelte';

	let tauriMode = $state(false);
	let newTemplateName = $state('');

	onMount(() => {
		tauriMode = isTauri();
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

	function handleStreamingChange(platform: string) {
		streamingPref.platform = platform;
		saveStreamingPreference(platform);
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
		<p>AI features and local configuration require the Mercury desktop application.</p>
	</div>
{:else}
	<div class="settings-page">
		<h1>Settings</h1>

		<!-- Appearance (Theme) -->
		<div class="settings-section">
			<h2>Appearance</h2>
			<p class="section-desc">
				Your taste shapes your colors. Choose how Mercury looks.
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
						<span class="template-desc">{tmpl.description}</span>
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
			<h2>Streaming Preference</h2>
			<p class="section-desc">
				Choose your preferred platform. Embeds and "Listen on" links will show it first.
			</p>

			<div class="setting-row">
				<label for="platform-select" class="setting-label">Preferred Platform</label>
				<select
					id="platform-select"
					value={streamingPref.platform}
					onchange={(e) => handleStreamingChange(e.currentTarget.value)}
					class="platform-select">
					<option value="">No preference (default order)</option>
					<option value="bandcamp">Bandcamp</option>
					<option value="spotify">Spotify</option>
					<option value="soundcloud">SoundCloud</option>
					<option value="youtube">YouTube</option>
				</select>
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
		padding: var(--space-xl);
		color: var(--text-secondary);
	}

	.desktop-only-icon {
		color: var(--text-muted);
		margin-bottom: var(--space-lg);
	}

	.desktop-only h2 {
		font-size: 1.2rem;
		font-weight: 500;
		color: var(--text-primary);
		margin: 0 0 var(--space-sm);
	}

	.desktop-only p {
		font-size: 0.85rem;
		max-width: 400px;
		margin: 0;
	}

	.settings-page {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: var(--space-lg);
	}

	.settings-page h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 var(--space-lg);
	}

	.section-separator {
		height: 1px;
		background: var(--border-subtle);
		margin: var(--space-sm) 0;
	}

	.settings-section {
		padding: var(--space-lg);
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: var(--card-radius);
		margin-bottom: var(--space-lg);
	}

	.settings-section h2 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 var(--space-xs);
	}

	.section-desc {
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin: 0 0 var(--space-md);
		line-height: 1.5;
		max-width: 560px;
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
		color: var(--text-secondary);
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
		color: var(--text-primary);
	}

	.radio-option input[type='radio'] {
		accent-color: var(--link-color);
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
		color: var(--text-muted);
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
		border: 1px solid var(--border-default);
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
		background: var(--bg-elevated);
		border: 1px solid var(--border-subtle);
		padding: var(--space-sm);
		border-radius: var(--card-radius);
		cursor: pointer;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 4px;
		transition: border-color 0.15s, background 0.15s;
	}

	.template-card:hover {
		background: var(--bg-hover);
		border-color: var(--border-default);
	}

	.template-card.active {
		border-color: var(--link-color);
		background: var(--bg-hover);
	}

	.template-name {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	.template-desc {
		font-size: 0.7rem;
		color: var(--text-muted);
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
		border-left: 1px solid var(--border-subtle);
		color: var(--text-muted);
		cursor: pointer;
		font-size: 1rem;
		line-height: 1;
		align-self: stretch;
		display: flex;
		align-items: center;
		transition: color 0.15s;
	}

	.template-delete-btn:hover {
		color: var(--text-accent);
	}

	.sub-section-label {
		font-size: 0.75rem;
		color: var(--text-muted);
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
		background: var(--bg-elevated);
		color: var(--text-primary);
		border: 1px solid var(--border-default);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--input-radius, 4px);
		font-size: 0.85rem;
		outline: none;
		transition: border-color 0.15s;
	}

	.template-name-input:focus {
		border-color: var(--border-hover);
	}

	.template-name-input::placeholder {
		color: var(--text-muted);
	}

	.save-template-btn {
		background: var(--bg-hover);
		color: var(--text-primary);
		border: 1px solid var(--border-default);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--input-radius, 4px);
		cursor: pointer;
		font-size: 0.85rem;
		white-space: nowrap;
		transition: border-color 0.15s, background 0.15s;
	}

	.save-template-btn:hover:not(:disabled) {
		border-color: var(--border-hover);
		background: var(--bg-elevated);
	}

	.save-template-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* ─── Streaming preference ─────────────────────────────────────────── */

	.platform-select {
		background: var(--bg-elevated);
		color: var(--text-primary);
		border: 1px solid var(--border-default);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--input-radius, 4px);
		font-size: 0.85rem;
		outline: none;
		cursor: pointer;
		transition: border-color 0.15s;
	}

	.platform-select:focus {
		border-color: var(--border-hover);
	}
</style>
