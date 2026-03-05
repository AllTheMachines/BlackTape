<script lang="ts">
	import { updateState, installUpdate, dismissUpdate, justUpdatedTo, dismissJustUpdated } from '$lib/update.svelte';
	import { PROJECT_NAME } from '$lib/config';
</script>

{#if justUpdatedTo.version}
	<div class="update-banner success" role="status">
		<span class="update-text">Updated to {PROJECT_NAME} {justUpdatedTo.version}</span>
		<button class="install-btn" onclick={dismissJustUpdated}>OK</button>
	</div>
{:else if updateState.available && !updateState.critical && !updateState.dismissed}
	<div class="update-banner" class:restarting={updateState.restarting || updateState.installing} role="status">
		{#if updateState.restarting}
			<span class="update-text">Update installed — reopening...</span>
		{:else if updateState.installing}
			<span class="update-text">Downloading update...</span>
		{:else if updateState.error}
			<span class="update-text">Update failed — {updateState.error}</span>
			<div class="update-actions">
				<button class="install-btn" onclick={installUpdate}>Retry</button>
				<button class="dismiss-btn" onclick={dismissUpdate}>Later</button>
			</div>
		{:else}
			<span class="update-text">{PROJECT_NAME} {updateState.version} is available</span>
			<div class="update-actions">
				<button class="install-btn" onclick={installUpdate}>Install Now</button>
				<button class="dismiss-btn" onclick={dismissUpdate} aria-label="Dismiss update notification">
					Later
				</button>
			</div>
		{/if}
	</div>
{/if}

<style>
	.update-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		padding: 6px var(--space-lg);
		background: #1a1a2e;
		color: #e0e0e0;
		font-size: 0.78rem;
		z-index: 90;
	}

	.update-text {
		font-weight: 500;
	}

	.update-actions {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-shrink: 0;
	}

	.install-btn {
		padding: 3px 10px;
		font-size: 0.75rem;
		font-family: var(--font-sans);
		background: var(--acc);
		border: 1px solid var(--acc);
		border-radius: 0;
		color: #000;
		cursor: pointer;
		transition: background 0.15s;
	}

	.install-btn:hover:not(:disabled) {
		filter: brightness(1.15);
	}

	.install-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.dismiss-btn {
		padding: 3px 8px;
		font-size: 0.75rem;
		font-family: var(--font-sans);
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.8);
		cursor: pointer;
		transition: color 0.15s;
	}

	.dismiss-btn:hover {
		color: #fff;
	}

	.update-banner.restarting {
		justify-content: center;
		animation: pulse-restart 1s ease-in-out infinite;
	}

	.update-banner.success {
		background: #1a2e1a;
	}

	@keyframes pulse-restart {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}
</style>
