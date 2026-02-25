<script lang="ts">
	let {
		relationships
	}: {
		relationships: {
			members: Array<{ name: string; mbid: string }>;
			influencedBy: Array<{ name: string; mbid: string }>;
			influenced: Array<{ name: string; mbid: string }>;
			labels: string[];
		}
	} = $props();

	let showAllMembers = $state(false);
	let showAllInfluencedBy = $state(false);
	let showAllInfluenced = $state(false);

	let visibleMembers = $derived(showAllMembers ? relationships.members : relationships.members.slice(0, 20));
	let visibleInfluencedBy = $derived(showAllInfluencedBy ? relationships.influencedBy : relationships.influencedBy.slice(0, 20));
	let visibleInfluenced = $derived(showAllInfluenced ? relationships.influenced : relationships.influenced.slice(0, 20));
</script>

{#if relationships.members.length > 0}
	<section class="rel-section">
		<h3>Members</h3>
		<div class="rel-chips">
			{#each visibleMembers as m (m.mbid)}
				<a href="https://musicbrainz.org/artist/{m.mbid}" class="rel-chip" target="_blank" rel="noopener noreferrer">{m.name}</a>
			{/each}
			{#if relationships.members.length > 20 && !showAllMembers}
				<button class="show-all-btn" onclick={() => showAllMembers = true}>Show all {relationships.members.length}</button>
			{/if}
		</div>
	</section>
{/if}

{#if relationships.influencedBy.length > 0 || relationships.influenced.length > 0}
	<section class="rel-section">
		<h3>Influences</h3>
		{#if relationships.influencedBy.length > 0}
			<p class="subsection-label">Influenced by</p>
			<div class="rel-chips">
				{#each visibleInfluencedBy as a (a.mbid)}
					<a href="https://musicbrainz.org/artist/{a.mbid}" class="rel-chip" target="_blank" rel="noopener noreferrer">{a.name}</a>
				{/each}
				{#if relationships.influencedBy.length > 20 && !showAllInfluencedBy}
					<button class="show-all-btn" onclick={() => showAllInfluencedBy = true}>Show all {relationships.influencedBy.length}</button>
				{/if}
			</div>
		{/if}
		{#if relationships.influenced.length > 0}
			<p class="subsection-label">Influenced</p>
			<div class="rel-chips">
				{#each visibleInfluenced as a (a.mbid)}
					<a href="https://musicbrainz.org/artist/{a.mbid}" class="rel-chip" target="_blank" rel="noopener noreferrer">{a.name}</a>
				{/each}
				{#if relationships.influenced.length > 20 && !showAllInfluenced}
					<button class="show-all-btn" onclick={() => showAllInfluenced = true}>Show all {relationships.influenced.length}</button>
				{/if}
			</div>
		{/if}
	</section>
{/if}

{#if relationships.labels.length > 0}
	<section class="rel-section">
		<h3>Labels</h3>
		<p class="labels-text">{relationships.labels.join(' · ')}</p>
	</section>
{/if}

<style>
	.rel-section {
		margin-bottom: var(--space-lg);
	}

	h3 {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--t-3);
		margin: 0 0 var(--space-sm);
	}

	.rel-chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.rel-chip {
		display: inline-flex;
		align-items: center;
		height: 22px;
		padding: 0 7px;
		background: var(--bg-4);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		font-size: 10px;
		color: var(--t-3);
		text-decoration: none;
		white-space: nowrap;
		transition: border-color 0.1s, color 0.1s;
	}

	.rel-chip:hover {
		border-color: var(--acc);
		color: var(--t-2);
		text-decoration: none;
	}

	.show-all-btn {
		height: 22px;
		padding: 0 7px;
		background: none;
		border: 1px solid var(--b-2);
		border-radius: var(--r);
		font-size: 10px;
		color: var(--t-3);
		cursor: pointer;
	}

	.show-all-btn:hover {
		border-color: var(--b-1);
		color: var(--t-2);
	}

	.subsection-label {
		font-size: 0.7rem;
		color: var(--t-3);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		margin: var(--space-sm) 0 var(--space-xs);
	}

	.labels-text {
		font-size: 0.85rem;
		color: var(--t-2);
		margin: 0;
	}
</style>
