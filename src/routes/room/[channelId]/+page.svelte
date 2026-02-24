<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { isTauri } from '$lib/platform';
	import { PROJECT_NAME } from '$lib/config';
	import {
		roomState,
		joinRoom,
		leaveRoom,
		setActiveVideo,
		submitSuggestion,
		retractSuggestion,
		approveQueueItem,
		rejectQueueItem,
		checkActiveRoom
	} from '$lib/comms/listening-room.svelte.js';
	import { youtubeEmbedUrl } from '$lib/embeds/youtube.js';
	import { generateAvatarSvg } from '$lib/identity/avatar.js';

	const channelId = $derived($page.params.channelId);

	onMount(async () => {
		if (!isTauri()) return;
		// Full room join logic implemented in Plan 02
		// For now: check if a room is active to set up state
		if (channelId) await checkActiveRoom(channelId);
	});

	onDestroy(async () => {
		if (roomState.isInRoom) await leaveRoom();
	});
</script>

<svelte:head>
	<title>Listening Room — {PROJECT_NAME}</title>
</svelte:head>

<div class="room-page" data-testid="room-page">
	<p class="loading-state">Loading room...</p>
</div>

<style>
	.room-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-lg);
	}

	.loading-state {
		color: var(--text-muted);
		font-style: italic;
	}
</style>
