<script lang="ts">
  import { flaggedMessages, deleteRoomMessage, kickUser, banUser } from '$lib/comms/moderation.js';
  import { roomsState } from '$lib/comms/rooms.svelte.js';

  let { channelId }: { channelId: string } = $props();

  // Flagged message event IDs for this channel
  const flagged = $derived([...(flaggedMessages.get(channelId) ?? [])]);

  // Resolve full message objects from room state
  const flaggedMessages_ = $derived(
    flagged.map(id => roomsState.messages.get(channelId)?.find(m => m.id === id)).filter(Boolean)
  );

  async function handleDelete(msgId: string) {
    await deleteRoomMessage(channelId, msgId);
    flaggedMessages.get(channelId)?.delete(msgId);
  }

  async function handleKick(pubkey: string) { await kickUser(channelId, pubkey); }
  function handleBan(pubkey: string) { banUser(channelId, pubkey); }

  function dismiss(msgId: string) { flaggedMessages.get(channelId)?.delete(msgId); }
</script>

<div class="mod-queue">
  <h4>Moderation Queue ({flaggedMessages_.length})</h4>
  {#if flaggedMessages_.length === 0}
    <p class="empty">No flagged messages.</p>
  {:else}
    {#each flaggedMessages_ as msg (msg?.id)}
      {#if msg}
        <div class="flag-item">
          <div class="flag-meta">
            <code class="sender">{msg.senderPubkey.slice(0, 12)}…</code>
            <span class="content">"{msg.content.slice(0, 100)}{msg.content.length > 100 ? '…' : ''}"</span>
          </div>
          <div class="flag-actions">
            <button onclick={() => handleDelete(msg.id)} class="action-btn delete">Delete</button>
            <button onclick={() => handleKick(msg.senderPubkey)} class="action-btn kick">Kick</button>
            <button onclick={() => handleBan(msg.senderPubkey)} class="action-btn ban">Ban</button>
            <button onclick={() => dismiss(msg.id)} class="action-btn dismiss">Dismiss</button>
          </div>
        </div>
      {/if}
    {/each}
  {/if}
</div>

<style>
  .mod-queue { padding: 12px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
  h4 { color: var(--text-primary); font-size: 0.85rem; margin: 0; }
  .empty { color: var(--text-secondary); font-size: 0.8rem; }
  .flag-item { border: 1px solid var(--border); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
  .flag-meta { display: flex; flex-direction: column; gap: 4px; }
  .sender { font-size: 0.7rem; color: var(--text-secondary); }
  .content { font-size: 0.8rem; color: var(--text-primary); font-style: italic; }
  .flag-actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .action-btn { border: none; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 0.75rem; font-weight: 600; }
  .delete { background: #c33; color: white; }
  .kick { background: #c73; color: white; }
  .ban { background: #600; color: white; }
  .dismiss { background: var(--bg-tertiary); color: var(--text-secondary); border: 1px solid var(--border); }
</style>
