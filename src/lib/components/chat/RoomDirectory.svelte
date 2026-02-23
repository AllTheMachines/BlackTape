<script lang="ts">
  import { roomsState, loadRooms, subscribeToRoom } from '$lib/comms/rooms.svelte.js';
  import { chatState } from '$lib/comms/notifications.svelte.js';

  let filterTag = $state('');
  let showCreator = $state(false);

  $effect(() => { loadRooms(filterTag || undefined); });

  async function joinRoom(roomId: string) {
    await subscribeToRoom(roomId);
    chatState.view = 'room-view';
    chatState.activeRoomId = roomId;
    // Store cleanup for when overlay closes — handled in root layout
  }
</script>

<div class="room-directory">
  <div class="dir-header">
    <input bind:value={filterTag} placeholder="Filter by tag…" class="filter-input" />
    <button onclick={() => showCreator = !showCreator} class="create-btn">
      {showCreator ? 'Cancel' : '+ New Room'}
    </button>
  </div>

  {#if showCreator}
    {#await import('./RoomCreator.svelte') then { default: RoomCreator }}
      <RoomCreator />
    {/await}
  {/if}

  {#if roomsState.loading}
    <p class="status">Loading rooms…</p>
  {:else if roomsState.rooms.length === 0}
    <p class="status">No active rooms found. Be the first to create one.</p>
  {:else}
    <ul class="room-list">
      {#each roomsState.rooms as room (room.id)}
        <li class="room-item">
          <button class="room-btn" onclick={() => joinRoom(room.id)}>
            <span class="room-name">{room.name}</span>
            <div class="room-tags">
              {#each room.tags.slice(0, 3) as tag}
                <span class="room-tag">{tag}</span>
              {/each}
            </div>
            {#if room.description}
              <span class="room-desc">{room.description.slice(0, 80)}{room.description.length > 80 ? '…' : ''}</span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .room-directory { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .dir-header { display: flex; gap: 8px; padding: 12px; border-bottom: 1px solid var(--border); }
  .filter-input { flex: 1; background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; font-size: 0.8rem; }
  .create-btn { background: var(--accent); color: var(--bg-primary); border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 0.8rem; white-space: nowrap; }
  .status { color: var(--text-secondary); font-size: 0.875rem; text-align: center; padding: 20px; }
  .room-list { list-style: none; margin: 0; padding: 8px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 6px; }
  .room-btn { width: 100%; text-align: left; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
  .room-btn:hover { border-color: var(--accent); }
  .room-name { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
  .room-tags { display: flex; gap: 4px; flex-wrap: wrap; }
  .room-tag { background: var(--bg-primary); border: 1px solid var(--border); border-radius: 3px; padding: 1px 6px; font-size: 0.65rem; color: var(--text-secondary); }
  .room-desc { font-size: 0.75rem; color: var(--text-secondary); }
</style>
