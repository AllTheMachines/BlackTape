<script lang="ts">
  import { closeChat } from '$lib/comms/notifications.svelte.js';
</script>

<div class="ai-gate-prompt">
  <div class="icon">🛡️</div>
  <h3>AI moderation required</h3>
  <p>
    Every scene room needs an AI moderator to help keep the space safe.
    Configure an AI model in Settings — you can use any API provider or
    download a free open-source model.
  </p>
  <a href="/settings" onclick={closeChat} class="go-settings">
    Open Settings →
  </a>
</div>

<style>
  .ai-gate-prompt {
    padding: 24px; display: flex; flex-direction: column; align-items: center;
    gap: 12px; text-align: center;
  }
  .icon { font-size: 2rem; }
  h3 { color: var(--text-primary); font-size: 1rem; margin: 0; }
  p { color: var(--text-secondary); font-size: 0.875rem; line-height: 1.5; margin: 0; }
  .go-settings {
    margin-top: 8px; padding: 8px 20px; background: var(--accent);
    color: var(--bg-primary); border-radius: 6px; text-decoration: none;
    font-size: 0.875rem; font-weight: 600;
  }
</style>
