<script lang="ts">
	import { PROJECT_NAME } from '$lib/config';

	let props: {
		dbPath: string;
		onRetry: () => void;
	} = $props();

	let checking = $state(false);

	async function handleRetry() {
		checking = true;
		try {
			await props.onRetry();
		} finally {
			checking = false;
		}
	}
</script>

<div class="setup">
	<div class="icon">
		<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
			<ellipse cx="12" cy="5" rx="9" ry="3" />
			<path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3" />
			<path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
		</svg>
	</div>

	<h1>{PROJECT_NAME} needs a database</h1>

	<p class="description">
		The search index is a local SQLite database that powers all discovery.
		It's not bundled with the app because of its size — you'll need to download it separately.
	</p>

	<div class="steps">
		<h2>Setup</h2>
		<ol>
			<li>
				Download <code>mercury.db.gz</code> from the
				<a href="https://github.com/mercury-app/releases" target="_blank" rel="noopener noreferrer">releases page</a>
			</li>
			<li>Decompress the file to get <code>mercury.db</code></li>
			<li>Place it at the path shown below</li>
		</ol>
	</div>

	<div class="path-box">
		<span class="path-label">Expected location</span>
		<code class="path-value">{props.dbPath}</code>
	</div>

	<button class="retry-btn" onclick={handleRetry} disabled={checking}>
		{#if checking}
			Checking...
		{:else}
			Check Again
		{/if}
	</button>
</div>

<style>
	.setup {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: calc(100vh - var(--header-height));
		padding: var(--space-xl);
		text-align: center;
		max-width: 600px;
		margin: 0 auto;
	}

	.icon {
		color: var(--text-muted);
		margin-bottom: var(--space-lg);
	}

	h1 {
		font-size: 1.8rem;
		font-weight: 300;
		letter-spacing: 0.05em;
		color: var(--text-accent);
		margin: 0 0 var(--space-md);
	}

	.description {
		color: var(--text-secondary);
		line-height: 1.7;
		margin: 0 0 var(--space-xl);
	}

	.steps {
		text-align: left;
		width: 100%;
		margin-bottom: var(--space-xl);
	}

	.steps h2 {
		font-size: 0.85rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--text-secondary);
		margin: 0 0 var(--space-sm);
	}

	.steps ol {
		margin: 0;
		padding-left: var(--space-lg);
		color: var(--text-primary);
		line-height: 2;
	}

	.steps a {
		color: var(--link-color);
	}

	.steps a:hover {
		text-decoration: underline;
	}

	.steps code {
		font-family: var(--font-mono);
		font-size: 0.9em;
		color: var(--text-accent);
		background: var(--bg-elevated);
		padding: 0.1em 0.4em;
		border-radius: 0;
	}

	.path-box {
		width: 100%;
		background: var(--bg-surface);
		border: 1px solid var(--border-default);
		border-radius: 0;
		padding: var(--space-md);
		margin-bottom: var(--space-xl);
	}

	.path-label {
		display: block;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--text-muted);
		margin-bottom: var(--space-xs);
	}

	.path-value {
		font-family: var(--font-mono);
		font-size: 0.85rem;
		color: var(--text-primary);
		word-break: break-all;
	}

	.retry-btn {
		padding: var(--space-sm) var(--space-xl);
		font-size: 0.9rem;
		font-family: var(--font-sans);
		background: var(--bg-elevated);
		border: 1px solid var(--border-default);
		border-radius: 0;
		color: var(--text-primary);
		cursor: pointer;
		transition: border-color 0.2s, background 0.2s;
	}

	.retry-btn:hover:not(:disabled) {
		border-color: var(--border-hover);
		background: var(--bg-hover);
	}

	.retry-btn:disabled {
		color: var(--text-muted);
		cursor: not-allowed;
	}

	@media (max-width: 600px) {
		h1 {
			font-size: 1.4rem;
		}

		.path-value {
			font-size: 0.75rem;
		}
	}
</style>
