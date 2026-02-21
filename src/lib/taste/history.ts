/**
 * Play history — frontend wrappers for Tauri play history commands.
 *
 * All functions are Tauri-only (dynamic imports). Safe to import from web —
 * functions will return empty/no-op if invoke fails.
 */

export interface PlayRecord {
	id: number;
	track_path: string;
	artist_name: string | null;
	track_title: string | null;
	album_name: string | null;
	played_at: number;
	duration_secs: number;
}

export async function getPlayHistory(limit?: number): Promise<PlayRecord[]> {
	try {
		const { invoke } = await import('@tauri-apps/api/core');
		return await invoke<PlayRecord[]>('get_play_history', {
			limit: limit ?? null
		});
	} catch {
		return [];
	}
}

export async function deletePlay(id: number): Promise<void> {
	try {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('delete_play', { id });
	} catch {
		// Ignore
	}
}

export async function clearPlayHistory(): Promise<void> {
	try {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('clear_play_history');
	} catch {
		// Ignore
	}
}

export async function getPlayCount(): Promise<number> {
	try {
		const { invoke } = await import('@tauri-apps/api/core');
		return await invoke<number>('get_play_count');
	} catch {
		return 0;
	}
}

/**
 * Export full play history as JSON and trigger file save via Tauri dialog.
 * Falls back to console if dialog not available.
 */
export async function exportPlayHistory(): Promise<void> {
	try {
		const { invoke } = await import('@tauri-apps/api/core');
		const json = await invoke<string>('export_play_history');

		// Try Tauri dialog + fs for file save
		try {
			const { save } = await import('@tauri-apps/plugin-dialog');
			const path = await save({
				defaultPath: 'mercury-listening-history.json',
				filters: [{ name: 'JSON', extensions: ['json'] }]
			});
			if (path) {
				// Use writeTextFile if plugin-fs available, else blob download
				try {
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore — plugin-fs may not be installed; try/catch handles absence gracefully
					const { writeTextFile } = await import('@tauri-apps/plugin-fs');
					await (writeTextFile as (path: string, contents: string) => Promise<void>)(path, json);
				} catch {
					// plugin-fs not available — invoke Rust to write the file
					await invoke('export_play_history_to_path', { path, json });
				}
			}
		} catch {
			// Dialog not available — fallback: download via browser blob (web context)
			const blob = new Blob([json], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'mercury-listening-history.json';
			a.click();
			URL.revokeObjectURL(url);
		}
	} catch (e) {
		console.error('Failed to export play history:', e);
	}
}
