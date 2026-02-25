<script lang="ts">
	import { PaneGroup, Pane, PaneResizer } from 'paneforge';
	import type { Snippet } from 'svelte';
	import { LAYOUT_TEMPLATES, type LayoutTemplate } from '$lib/theme/templates';

	interface Props {
		template: LayoutTemplate;
		sidebar?: Snippet;
		context?: Snippet;
		children: Snippet;
		hasPlayer?: boolean;
	}

	let {
		template,
		sidebar,
		context,
		children,
		hasPlayer = false
	}: Props = $props();

	let config = $derived(LAYOUT_TEMPLATES[template] ?? LAYOUT_TEMPLATES['cockpit']);

	// Collapse state for sidebars
	let leftCollapsed = $state(false);
	let rightCollapsed = $state(false);
</script>

<div
	class="panel-layout"
	style:height="calc(100vh - var(--header-height){hasPlayer ? ' - var(--player-height)' : ''})"
>
	{#if config.panes === 'three'}
		<PaneGroup direction="horizontal" autoSaveId={config.autoSaveId} class="pane-group">
			<!-- Left Sidebar Pane -->
			<Pane
				defaultSize={config.leftDefault}
				minSize={config.leftMin}
				collapsible={true}
				collapsedSize={2}
				onCollapse={() => { leftCollapsed = true; }}
				onExpand={() => { leftCollapsed = false; }}
			>
				<div class="sidebar-pane left-sidebar" class:collapsed={leftCollapsed}>
					{#if leftCollapsed}
						<button
							class="expand-btn expand-btn-left"
							onclick={() => { leftCollapsed = false; }}
							aria-label="Expand left sidebar"
							title="Expand sidebar"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="9 18 15 12 9 6" />
							</svg>
						</button>
					{:else if sidebar}
						<button
							class="collapse-btn collapse-btn-left"
							onclick={() => { leftCollapsed = true; }}
							aria-label="Collapse left sidebar"
							title="Collapse sidebar"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="15 18 9 12 15 6" />
							</svg>
						</button>
						{@render sidebar()}
					{/if}
				</div>
			</Pane>

			<PaneResizer class="pane-resizer" />

			<!-- Main Content Pane -->
			<Pane defaultSize={config.mainDefault} minSize={config.mainMin}>
				<div class="main-pane">
					{@render children()}
				</div>
			</Pane>

			<PaneResizer class="pane-resizer" />

			<!-- Right Sidebar Pane -->
			<Pane
				defaultSize={config.rightDefault}
				minSize={config.rightMin}
				collapsible={true}
				collapsedSize={2}
				onCollapse={() => { rightCollapsed = true; }}
				onExpand={() => { rightCollapsed = false; }}
			>
				<div class="sidebar-pane right-sidebar" class:collapsed={rightCollapsed}>
					{#if rightCollapsed}
						<button
							class="expand-btn expand-btn-right"
							onclick={() => { rightCollapsed = false; }}
							aria-label="Expand right sidebar"
							title="Expand sidebar"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="15 18 9 12 15 6" />
							</svg>
						</button>
					{:else if context}
						<button
							class="collapse-btn collapse-btn-right"
							onclick={() => { rightCollapsed = false; }}
							aria-label="Collapse right sidebar"
							title="Collapse sidebar"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="9 18 15 12 9 6" />
							</svg>
						</button>
						{@render context()}
					{/if}
				</div>
			</Pane>
		</PaneGroup>

	{:else if config.panes === 'two'}
		<PaneGroup direction="horizontal" autoSaveId={config.autoSaveId} class="pane-group">
			<!-- Main Content Pane -->
			<Pane defaultSize={config.mainDefault} minSize={config.mainMin}>
				<div class="main-pane">
					{@render children()}
				</div>
			</Pane>

			<PaneResizer class="pane-resizer" />

			<!-- Right Sidebar Pane -->
			<Pane
				defaultSize={config.rightDefault}
				minSize={config.rightMin}
				collapsible={true}
				collapsedSize={2}
				onCollapse={() => { rightCollapsed = true; }}
				onExpand={() => { rightCollapsed = false; }}
			>
				<div class="sidebar-pane right-sidebar" class:collapsed={rightCollapsed}>
					{#if rightCollapsed}
						<button
							class="expand-btn expand-btn-right"
							onclick={() => { rightCollapsed = false; }}
							aria-label="Expand right sidebar"
							title="Expand sidebar"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="15 18 9 12 15 6" />
							</svg>
						</button>
					{:else if context}
						<button
							class="collapse-btn collapse-btn-right"
							onclick={() => { rightCollapsed = false; }}
							aria-label="Collapse right sidebar"
							title="Collapse sidebar"
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="9 18 15 12 9 6" />
							</svg>
						</button>
						{@render context()}
					{/if}
				</div>
			</Pane>
		</PaneGroup>

	{:else}
		<!-- minimal: single column, no PaneForge -->
		<div class="main-pane minimal-main">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.panel-layout {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		width: 100%;
	}

	:global(.pane-group) {
		flex: 1;
		display: flex;
		height: 100%;
	}

	.main-pane {
		height: 100%;
		overflow-y: auto;
	}

	.minimal-main {
		width: 100%;
		height: 100%;
		overflow-y: auto;
	}

	.sidebar-pane {
		height: 100%;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		position: relative;
		background: var(--bg-1);
	}

	.sidebar-pane.collapsed {
		align-items: center;
		background: var(--bg-surface);
		border-right: 1px solid var(--b-1);
	}

	.left-sidebar:not(.collapsed) {
		border-right: 1px solid var(--b-1);
	}

	.right-sidebar:not(.collapsed) {
		border-left: 1px solid var(--b-1);
	}

	.expand-btn,
	.collapse-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 4px;
		border-radius: 4px;
		transition: color 0.15s;
		flex-shrink: 0;
	}

	.expand-btn {
		margin-top: var(--space-sm);
		width: 24px;
		height: 24px;
	}

	.collapse-btn {
		position: absolute;
		top: var(--space-xs);
		z-index: 1;
	}

	.collapse-btn-left {
		right: var(--space-xs);
	}

	.collapse-btn-right {
		left: var(--space-xs);
	}

	.expand-btn:hover,
	.collapse-btn:hover {
		color: var(--text-primary);
		background: var(--bg-hover);
	}

	:global(.pane-resizer) {
		width: 4px;
		background: transparent;
		cursor: col-resize;
		flex-shrink: 0;
		transition: background 0.15s;
	}

	:global(.pane-resizer:hover),
	:global(.pane-resizer[data-active]) {
		background: var(--border-subtle);
	}
</style>
