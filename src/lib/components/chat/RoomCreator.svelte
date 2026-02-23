<script lang="ts">
  import { aiState } from '$lib/ai/state.svelte.js';
  import { createRoom } from '$lib/comms/rooms.svelte.js';
  import { chatState } from '$lib/comms/notifications.svelte.js';
  import AiGatePrompt from './AiGatePrompt.svelte';

  let name = $state('');
  let description = $state('');
  let tagInput = $state('');
  let tags = $state<string[]>([]);
  let creating = $state(false);
  let error = $state<string | null>(null);

  // AI gate: check before showing form
  const aiConfigured = $derived(aiState.enabled);

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) tags = [...tags, t];
    tagInput = '';
  }

  function removeTag(tag: string) { tags = tags.filter(t => t !== tag); }

  async function handleCreate() {
    if (!name.trim() || tags.length === 0) {
      error = 'Room name and at least one tag are required.';
      return;
    }
    creating = true;
    error = null;
    try {
      const channelId = await createRoom(name.trim(), tags, description.trim());
      // Navigate to the new room
      chatState.view = 'room-view';
      chatState.activeRoomId = channelId;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to create room.';
    } finally {
      creating = false;
    }
  }
</script>

{#if !aiConfigured}
  <AiGatePrompt />
{:else}
  <div class="room-creator">
    <h3>Create a Scene Room</h3>
    {#if error}<p class="error">{error}</p>{/if}
    <label>
      Room name <span class="required">*</span>
      <input bind:value={name} placeholder="e.g. Dark Ambient Explorers" maxlength="60" />
    </label>
    <label>
      Tags <span class="required">*</span> (at least one)
      <div class="tag-input-row">
        <input bind:value={tagInput} placeholder="e.g. shoegaze"
          onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
        <button onclick={addTag} type="button">Add</button>
      </div>
      <div class="tags">
        {#each tags as tag (tag)}
          <span class="tag">{tag} <button onclick={() => removeTag(tag)}>×</button></span>
        {/each}
      </div>
    </label>
    <label>
      Description
      <textarea bind:value={description} placeholder="What's this room about?" rows="3" maxlength="300"></textarea>
    </label>
    <button onclick={handleCreate} disabled={creating || !name.trim() || tags.length === 0} class="create-btn">
      {creating ? 'Creating…' : 'Create Room'}
    </button>
    <p class="note">A content safety check runs on the room name at creation.</p>
  </div>
{/if}

<style>
  .room-creator { padding: 16px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
  h3 { color: var(--text-primary); font-size: 0.95rem; margin: 0; }
  label { display: flex; flex-direction: column; gap: 6px; font-size: 0.8rem; color: var(--text-secondary); }
  input, textarea {
    background: var(--bg-primary); color: var(--text-primary);
    border: 1px solid var(--border); border-radius: 6px; padding: 8px;
    font-size: 0.875rem; font-family: inherit;
  }
  .tag-input-row { display: flex; gap: 6px; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .tag {
    background: var(--bg-tertiary); border: 1px solid var(--border);
    border-radius: 4px; padding: 2px 8px; font-size: 0.75rem; display: flex; align-items: center; gap: 4px;
  }
  .tag button { background: none; border: none; cursor: pointer; color: var(--text-secondary); padding: 0; }
  .create-btn { background: var(--accent); color: var(--bg-primary); border: none; border-radius: 6px; padding: 10px; cursor: pointer; font-weight: 600; }
  .create-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .required { color: var(--accent); }
  .error { color: #e55; font-size: 0.8rem; margin: 0; }
  .note { color: var(--text-secondary); font-size: 0.7rem; margin: 0; }
</style>
