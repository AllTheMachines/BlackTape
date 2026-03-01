<script lang="ts">
	import { updateState, installUpdate, dismissUpdate } from '$lib/update.svelte';
</script>

{#if updateState.available && !updateState.dismissed}
	<div class="update-banner" role="status">
		<span class="update-text">
			BlackTape {updateState.version} is available
		</span>
		<div class="update-actions">
			<button
				class="install-btn"
				onclick={installUpdate}
				disabled={updateState.installing}
			>
				{updateState.installing ? 'Downloading...' : 'Install Now'}
			</button>
			<button class="dismiss-btn" onclick={dismissUpdate} aria-label="Dismiss update notification">
				Later
			</button>
		</div>
	</div>
{/if}

<style>
	.update-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		padding: 6px var(--space-lg);
		background: var(--acc);
		color: #fff;
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
		background: rgba(255, 255, 255, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.4);
		border-radius: 0;
		color: #fff;
		cursor: pointer;
		transition: background 0.15s;
	}

	.install-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.35);
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
</style>
