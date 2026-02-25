<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { isTauri } from '$lib/platform';
	import { PROJECT_NAME } from '$lib/config';
	import {
		roomState,
		openRoom,
		joinRoom,
		leaveRoom,
		setActiveVideo,
		submitSuggestion,
		retractSuggestion,
		approveQueueItem,
		rejectQueueItem,
		checkActiveRoom,
		type QueueItem
	} from '$lib/comms/listening-room.svelte.js';
	import { ndkState } from '$lib/comms/nostr.svelte.js';
	import { generateAvatarSvg } from '$lib/identity/avatar.svelte.js';

	const channelId = $derived($page.params.channelId);

	// ─── Page-level state ─────────────────────────────────────────────────────
	let pageLoading = $state(true);
	let roomNotFound = $state(false);
	let videoInputUrl = $state('');
	let videoInputError = $state<string | null>(null);
	let suggestionUrl = $state('');
	let suggestionError = $state<string | null>(null);

	// ─── Derived ──────────────────────────────────────────────────────────────
	const pendingQueue = $derived(roomState.queue.filter((i) => i.state === 'pending'));

	// ─── Lifecycle ────────────────────────────────────────────────────────────
	onMount(async () => {
		if (!isTauri()) return;
		if (!channelId) {
			pageLoading = false;
			roomNotFound = true;
			return;
		}
		const result = await checkActiveRoom(channelId);
		if (result.active && result.hostPubkey) {
			// Room exists — join it
			await joinRoom(channelId, result.hostPubkey, result.activeVideoUrl);
		} else {
			// No active room — show "start room" option
			roomNotFound = true;
		}
		pageLoading = false;
	});

	onDestroy(async () => {
		if (roomState.isInRoom) await leaveRoom();
	});

	// ─── Handlers ─────────────────────────────────────────────────────────────
	async function handleSetVideo() {
		videoInputError = null;
		try {
			await setActiveVideo(videoInputUrl.trim());
			videoInputUrl = '';
		} catch (e) {
			videoInputError = e instanceof Error ? e.message : 'Invalid YouTube URL';
		}
	}

	async function handleSuggest() {
		suggestionError = null;
		try {
			await submitSuggestion(suggestionUrl.trim());
			suggestionUrl = '';
		} catch (e) {
			suggestionError = e instanceof Error ? e.message : 'Invalid YouTube URL';
		}
	}

	async function handleApprove(item: QueueItem) {
		await approveQueueItem(item);
	}

	async function handleReject(item: QueueItem) {
		await rejectQueueItem(item);
	}

	async function handleRetract() {
		await retractSuggestion();
	}
</script>

<svelte:head>
	<title>Listening Room — {PROJECT_NAME}</title>
</svelte:head>

<div class="room-page" data-testid="room-page">
	{#if pageLoading}
		<div class="room-loading" data-testid="room-loading">Connecting to room...</div>
	{:else if roomNotFound}
		<div class="no-room" data-testid="no-room">
			<h2>No active room for this scene</h2>
			<p>Be the first — start a listening room.</p>
			{#if isTauri()}
				<button
					class="start-room-btn"
					data-testid="start-room-btn"
					onclick={async () => {
						if (channelId) {
							await openRoom(channelId);
							roomNotFound = false;
						}
					}}
				>
					Start Room
				</button>
			{/if}
		</div>
	{:else if roomState.isInRoom}
		<!-- Room header -->
		<div class="room-header" data-testid="room-header">
			<div class="room-header-left">
				<h1 class="room-title">Listening Room</h1>
				<span class="room-scene">Scene: {channelId}</span>
			</div>
			<button
				class="leave-btn"
				data-testid="leave-room-btn"
				onclick={async () => {
					await leaveRoom();
					goto('/scenes/' + channelId);
				}}
			>
				Leave Room
			</button>
		</div>

		<!-- Main layout: player left, sidebar right -->
		<div class="room-layout">
			<!-- Player section -->
			<section class="player-section" data-testid="room-player-section">
				<div class="player-wrapper">
					{#if roomState.activeVideoUrl}
						{#key roomState.activeVideoUrl}
							<iframe
								src="{roomState.activeVideoUrl}?autoplay=1"
								title="Listening room video"
								frameborder="0"
								allow="autoplay; encrypted-media; fullscreen"
								allowfullscreen
								class="room-iframe"
								data-testid="room-iframe"
							></iframe>
						{/key}
					{:else}
						<div class="no-video-placeholder" data-testid="no-video-placeholder">
							<p>Waiting for host to set a video...</p>
						</div>
					{/if}
				</div>

				{#if roomState.isHost}
					<!-- Host video control -->
					<div class="host-controls" data-testid="host-controls">
						<label for="video-url-input" class="host-label">Set video</label>
						<div class="host-input-row">
							<input
								id="video-url-input"
								type="url"
								class="video-url-input"
								placeholder="Paste YouTube URL..."
								bind:value={videoInputUrl}
								data-testid="video-url-input"
							/>
							<button
								class="set-video-btn"
								data-testid="set-video-btn"
								disabled={!videoInputUrl.trim()}
								onclick={handleSetVideo}
							>
								Play
							</button>
						</div>
						{#if videoInputError}
							<p class="input-error" data-testid="video-input-error">{videoInputError}</p>
						{/if}
					</div>
				{:else}
					<!-- Guest suggestion input -->
					<div class="guest-controls" data-testid="guest-controls">
						<label for="suggestion-input" class="guest-label">Suggest a video</label>
						<div class="guest-input-row">
							<input
								id="suggestion-input"
								type="url"
								class="suggestion-input"
								placeholder="Paste YouTube URL..."
								bind:value={suggestionUrl}
								disabled={!!roomState.myPendingSuggestionId}
								data-testid="suggestion-input"
							/>
							<button
								class="suggest-btn"
								data-testid="suggest-btn"
								disabled={!suggestionUrl.trim() || !!roomState.myPendingSuggestionId}
								onclick={handleSuggest}
							>
								Suggest
							</button>
						</div>
						{#if roomState.myPendingSuggestionId}
							<p class="pending-note">Suggestion submitted — waiting for host approval.</p>
						{/if}
						{#if suggestionError}
							<p class="input-error" data-testid="suggestion-error">{suggestionError}</p>
						{/if}
					</div>
				{/if}
			</section>

			<!-- Sidebar: queue + participants -->
			<div class="sidebar">
				<!-- Jukebox queue section -->
				<section class="queue-section" data-testid="room-queue">
					<h3 class="section-title">Queue</h3>
					{#if pendingQueue.length === 0}
						<p class="empty-queue">No suggestions yet.</p>
					{:else}
						<ul class="queue-list">
							{#each pendingQueue as item (item.id)}
								<li class="queue-item" data-testid="queue-item">
									<span class="queue-url" title={item.youtubeUrl}>
										{item.youtubeUrl.length > 40
											? item.youtubeUrl.slice(0, 40) + '…'
											: item.youtubeUrl}
									</span>
									<span class="queue-sender">
										{roomState.participants[item.senderPubkey]?.displayName ??
											item.senderPubkey.slice(0, 8) + '...'}
									</span>
									{#if roomState.isHost}
										<div class="queue-actions">
											<button
												class="approve-btn"
												data-testid="approve-btn"
												onclick={() => handleApprove(item)}
											>
												Play
											</button>
											<button
												class="reject-btn"
												data-testid="reject-btn"
												onclick={() => handleReject(item)}
											>
												&#x2715;
											</button>
										</div>
									{:else if item.senderPubkey === ndkState.pubkey}
										<div class="queue-actions">
											<button
												class="retract-btn"
												data-testid="retract-btn"
												onclick={handleRetract}
											>
												Retract
											</button>
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</section>

				<!-- Participant list section -->
				<section class="participants-section" data-testid="room-participants">
					<h3 class="section-title">
						In this room ({Object.keys(roomState.participants).length})
					</h3>
					<ul class="participants-list">
						{#each Object.values(roomState.participants) as participant (participant.pubkey)}
							<li class="participant-item" data-testid="participant-item">
								<span class="participant-avatar">
									{@html generateAvatarSvg(participant.avatarSeed)}
								</span>
								<span class="participant-name">
									{participant.displayName}
									{#if participant.pubkey === roomState.hostPubkey}
										<span class="host-badge">host</span>
									{/if}
								</span>
							</li>
						{/each}
					</ul>
				</section>
			</div>
		</div>
	{/if}
</div>

<style>
	.room-page {		padding: 20px;
	}

	/* ── Loading / not-found states ── */

	.room-loading {
		color: var(--t-3);
		font-style: italic;
		padding: var(--space-xl) 0;
	}

	.no-room {
		text-align: center;
		padding: var(--space-xl) 0;
	}

	.no-room h2 {
		color: var(--t-1);
		margin-bottom: var(--space-md);
	}

	.no-room p {
		color: var(--t-2);
		margin-bottom: var(--space-lg);
	}

	.start-room-btn {
		background: var(--acc);
		color: #fff;
		border: none;
		border-radius: 6px;
		padding: 10px 24px;
		font-size: 1rem;
		cursor: pointer;
	}

	.start-room-btn:hover {
		opacity: 0.9;
	}

	/* ── Room header ── */

	.room-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-lg);
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--b-1);
	}

	.room-header-left {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.room-title {
		font-size: 1.4rem;
		color: var(--t-1);
		margin: 0;
	}

	.room-scene {
		font-size: 0.85rem;
		color: var(--t-3);
	}

	.leave-btn {
		background: transparent;
		border: 1px solid var(--b-1);
		border-radius: 6px;
		color: var(--t-2);
		padding: 8px 16px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: border-color 0.15s, color 0.15s;
	}

	.leave-btn:hover {
		border-color: var(--acc);
		color: var(--acc);
	}

	/* ── Room layout ── */

	.room-layout {
		display: flex;
		gap: var(--space-lg);
		align-items: flex-start;
	}

	.player-section {
		flex: 1;
		min-width: 0;
	}

	.sidebar {
		width: 320px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	/* ── Player ── */

	.player-wrapper {
		width: 100%;
		margin-bottom: var(--space-md);
	}

	.room-iframe {
		width: 100%;
		aspect-ratio: 16 / 9;
		border-radius: 8px;
		border: none;
		display: block;
	}

	.no-video-placeholder {
		width: 100%;
		aspect-ratio: 16 / 9;
		border-radius: 8px;
		background: var(--bg-3);
		border: 1px solid var(--b-1);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.no-video-placeholder p {
		color: var(--t-3);
		font-style: italic;
	}

	/* ── Host controls ── */

	.host-controls,
	.guest-controls {
		background: var(--bg-2);
		border: 1px solid var(--b-1);
		border-radius: 8px;
		padding: var(--space-md);
	}

	.host-label,
	.guest-label {
		display: block;
		font-size: 0.85rem;
		color: var(--t-2);
		margin-bottom: 8px;
		font-weight: 500;
	}

	.host-input-row,
	.guest-input-row {
		display: flex;
		gap: 8px;
	}

	.video-url-input,
	.suggestion-input {
		flex: 1;
		min-width: 0;
		padding: 8px 12px;
		border-radius: 6px;
		border: 1px solid var(--b-1);
		background: var(--bg-3);
		color: var(--t-1);
		font-size: 0.9rem;
	}

	.video-url-input:focus,
	.suggestion-input:focus {
		outline: none;
		border-color: var(--acc);
	}

	.video-url-input:disabled,
	.suggestion-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.set-video-btn,
	.suggest-btn {
		padding: 8px 16px;
		border-radius: 6px;
		border: none;
		background: var(--acc);
		color: #fff;
		font-size: 0.9rem;
		cursor: pointer;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.set-video-btn:disabled,
	.suggest-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.set-video-btn:hover:not(:disabled),
	.suggest-btn:hover:not(:disabled) {
		opacity: 0.85;
	}

	.input-error {
		color: #e05260;
		font-size: 0.82rem;
		margin-top: 6px;
	}

	.pending-note {
		color: var(--t-3);
		font-size: 0.82rem;
		margin-top: 6px;
		font-style: italic;
	}

	/* ── Queue section ── */

	.queue-section,
	.participants-section {
		background: var(--bg-2);
		border: 1px solid var(--b-1);
		border-radius: 8px;
		padding: var(--space-md);
	}

	.section-title {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--t-1);
		margin: 0 0 var(--space-md) 0;
	}

	.empty-queue {
		color: var(--t-3);
		font-size: 0.88rem;
		font-style: italic;
	}

	.queue-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.queue-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 8px;
		background: var(--bg-3);
		border-radius: 6px;
		border: 1px solid var(--b-1);
	}

	.queue-url {
		font-size: 0.82rem;
		color: var(--acc);
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.queue-sender {
		font-size: 0.78rem;
		color: var(--t-3);
	}

	.queue-actions {
		display: flex;
		gap: 6px;
		margin-top: 4px;
	}

	.approve-btn {
		padding: 4px 10px;
		border-radius: 4px;
		border: none;
		background: var(--acc);
		color: #fff;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.approve-btn:hover {
		opacity: 0.85;
	}

	.reject-btn {
		padding: 4px 8px;
		border-radius: 4px;
		border: 1px solid var(--b-1);
		background: transparent;
		color: var(--t-2);
		font-size: 0.8rem;
		cursor: pointer;
	}

	.reject-btn:hover {
		border-color: #e05260;
		color: #e05260;
	}

	.retract-btn {
		padding: 4px 10px;
		border-radius: 4px;
		border: 1px solid var(--b-1);
		background: transparent;
		color: var(--t-2);
		font-size: 0.8rem;
		cursor: pointer;
	}

	.retract-btn:hover {
		border-color: var(--acc);
		color: var(--acc);
	}

	/* ── Participants section ── */

	.participants-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.participant-item {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.participant-avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		overflow: hidden;
		flex-shrink: 0;
		display: block;
	}

	.participant-avatar :global(svg) {
		width: 28px;
		height: 28px;
	}

	.participant-name {
		font-size: 0.88rem;
		color: var(--t-1);
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.host-badge {
		font-size: 0.7rem;
		background: var(--acc);
		color: #fff;
		border-radius: 4px;
		padding: 1px 5px;
		font-weight: 600;
		letter-spacing: 0.02em;
	}
</style>
