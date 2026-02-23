<script lang="ts">
  import { createSession, type SessionVisibility } from '$lib/comms/sessions.svelte.js';
  import { chatState } from '$lib/comms/notifications.svelte.js';

  let artistName = $state('');
  let releaseName = $state('');
  let visibility = $state<SessionVisibility>('public');
  let creating = $state(false);
  let inviteCode = $state<string | null>(null);
  let error = $state<string | null>(null);

  // Optional: pre-filled from artist/release page context
  let { prefillArtist = '', prefillRelease = '' }: { prefillArtist?: string; prefillRelease?: string } = $props();

  $effect(() => {
    if (prefillArtist) artistName = prefillArtist;
    if (prefillRelease) releaseName = prefillRelease;
  });

  async function handleCreate() {
    if (!artistName.trim()) { error = 'Artist name required.'; return; }
    creating = true;
    error = null;
    try {
      const id = await createSession(artistName.trim(), visibility, { releaseName: releaseName.trim() || undefined });
      // Retrieve invite code from state for private sessions
      const { sessionsState } = await import('$lib/comms/sessions.svelte.js');
      inviteCode = sessionsState.mySession?.inviteCode ?? null;
      // Navigate to session view
      chatState.view = 'session-view';
      chatState.activeSessionId = id;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to start session.';
    } finally {
      creating = false;
    }
  }
</script>

<div class="session-creator">
  <h3>Start a Listening Party</h3>
  {#if error}<p class="error">{error}</p>{/if}

  <label>
    Artist <span class="required">*</span>
    <input bind:value={artistName} placeholder="Who are you listening to?" />
  </label>
  <label>
    Release (optional)
    <input bind:value={releaseName} placeholder="Album or EP name…" />
  </label>

  <div class="visibility-row">
    <span>Visibility</span>
    <label class="radio-opt">
      <input type="radio" bind:group={visibility} value="public" />
      Public
    </label>
    <label class="radio-opt">
      <input type="radio" bind:group={visibility} value="private" />
      Private (invite link)
    </label>
  </div>

  <button onclick={handleCreate} disabled={creating || !artistName.trim()} class="start-btn">
    {creating ? 'Starting…' : 'Start Party'}
  </button>

  {#if inviteCode && visibility === 'private'}
    <div class="invite-code">
      <span>Invite code:</span>
      <code>{inviteCode}</code>
      <p class="note">Share this code. When the party ends, it's gone.</p>
    </div>
  {/if}
</div>

<style>
  .session-creator { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
  h3 { color: var(--text-primary); font-size: 0.95rem; margin: 0; }
  label { display: flex; flex-direction: column; gap: 6px; font-size: 0.8rem; color: var(--text-secondary); }
  input { background: var(--bg-primary); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; padding: 8px; font-size: 0.875rem; font-family: inherit; }
  .visibility-row { display: flex; align-items: center; gap: 16px; font-size: 0.8rem; color: var(--text-secondary); }
  .radio-opt { flex-direction: row; align-items: center; gap: 4px; }
  .start-btn { background: var(--accent); color: var(--bg-primary); border: none; border-radius: 6px; padding: 10px; cursor: pointer; font-weight: 600; }
  .start-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .invite-code { background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
  code { font-family: monospace; font-size: 1.2rem; font-weight: 700; color: var(--accent); letter-spacing: 0.1em; }
  .note { font-size: 0.7rem; color: var(--text-secondary); margin: 0; }
  .required { color: var(--accent); }
  .error { color: #e55; font-size: 0.8rem; margin: 0; }
</style>
