<script lang="ts">
	import { updateState, installUpdate } from '$lib/update.svelte';
	import { PROJECT_NAME } from '$lib/config';

	const progress = $derived(
		updateState.total
			? Math.round((updateState.downloaded / updateState.total) * 100)
			: null
	);

	const downloadedMB = $derived(
		updateState.downloaded ? (updateState.downloaded / 1024 / 1024).toFixed(1) : null
	);

	const totalMB = $derived(
		updateState.total ? (updateState.total / 1024 / 1024).toFixed(1) : null
	);
</script>

{#if updateState.available && updateState.critical}
	<div
		class="critical-overlay"
		role="alertdialog"
		aria-modal="true"
		aria-label="Critical update required"
	>
		<div class="critical-dialog">
			{#if updateState.restarting}
				<h2 class="critical-heading restarting-heading">Restarting {PROJECT_NAME}...</h2>
			{:else}
				<h2 class="critical-heading">Critical Update Required</h2>

				<p class="critical-version">
					{PROJECT_NAME} {updateState.version} must be installed to continue.
				</p>

				{#if updateState.notes}
					<p class="critical-notes">{updateState.notes}</p>
				{/if}

				{#if updateState.installing}
					<div class="progress-info">
						{#if progress !== null}
							Downloading — {downloadedMB} / {totalMB} MB ({progress}%)
						{:else}
							Downloading...
						{/if}
					</div>
				{:else if updateState.error}
					<p class="error-text">{updateState.error}</p>
					<button class="install-btn" onclick={installUpdate}>Retry</button>
				{:else}
					<button class="install-btn" onclick={installUpdate}>Install Update</button>
				{/if}
			{/if}
		</div>
	</div>
{/if}

<style>
	.critical-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		z-index: 2000;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.critical-dialog {
		background: var(--bg-2);
		border: 1px solid #dc2626;
		width: 400px;
		max-width: calc(100vw - 2rem);
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		text-align: center;
	}

	.critical-heading {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #dc2626;
	}

	.critical-version {
		margin: 0;
		font-size: 0.85rem;
		color: var(--t-2);
	}

	.critical-notes {
		margin: 0;
		font-size: 0.8rem;
		color: var(--t-3);
		line-height: 1.5;
	}

	.install-btn {
		margin-top: 0.5rem;
		padding: 0.6rem 1.5rem;
		font-size: 0.85rem;
		font-weight: 600;
		font-family: var(--font-sans);
		background: #dc2626;
		color: #fff;
		border: none;
		cursor: pointer;
		transition: background 0.15s;
	}

	.install-btn:hover:not(:disabled) {
		background: #b91c1c;
	}

	.install-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.progress-info {
		font-size: 0.8rem;
		color: var(--t-2);
	}

	.error-text {
		margin: 0;
		font-size: 0.8rem;
		color: #dc2626;
	}

	.restarting-heading {
		animation: pulse-restart 1s ease-in-out infinite;
	}

	@keyframes pulse-restart {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
</style>
