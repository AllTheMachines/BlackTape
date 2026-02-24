<script lang="ts">
	import { PROJECT_NAME } from '$lib/config';
	import { isTauri } from '$lib/platform';

	async function minimize() {
		const { getCurrentWindow } = await import('@tauri-apps/api/window');
		const appWindow = getCurrentWindow();
		await appWindow.minimize();
	}

	async function toggleMaximize() {
		const { getCurrentWindow } = await import('@tauri-apps/api/window');
		const appWindow = getCurrentWindow();
		await appWindow.toggleMaximize();
	}

	async function close() {
		const { getCurrentWindow } = await import('@tauri-apps/api/window');
		const appWindow = getCurrentWindow();
		await appWindow.close();
	}
</script>

<div class="titlebar" data-tauri-drag-region>
	<span class="titlebar-logo">{PROJECT_NAME}</span>

	{#if isTauri()}
		<div class="titlebar-controls">
			<button class="ctrl-btn" onclick={minimize} title="Minimize" aria-label="Minimize">−</button>
			<button class="ctrl-btn" onclick={toggleMaximize} title="Maximize" aria-label="Maximize">□</button>
			<button class="ctrl-btn close" onclick={close} title="Close" aria-label="Close">×</button>
		</div>
	{/if}
</div>

<style>
	.titlebar {
		width: 100%;
		height: 28px;
		background: var(--bg-1);
		border-bottom: 1px solid var(--b-1);
		display: flex;
		align-items: center;
		padding: 0 10px;
		flex-shrink: 0;
		user-select: none;
		-webkit-user-select: none;
		position: relative;
		z-index: 9999;
	}

	.titlebar-logo {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--acc);
		pointer-events: none;
	}

	.titlebar-controls {
		margin-left: auto;
		display: flex;
		align-items: center;
	}

	.ctrl-btn {
		width: 28px;
		height: 28px;
		background: transparent;
		border: none;
		color: var(--t-3);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		line-height: 1;
		transition: background 0.1s, color 0.1s;
		padding: 0;
	}

	.ctrl-btn:hover {
		background: var(--bg-4);
		color: var(--t-2);
	}

	.ctrl-btn.close:hover {
		background: #c0392b;
		color: white;
	}
</style>
