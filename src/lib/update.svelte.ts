/**
 * Reactive update state and helpers.
 * Wraps the check_for_update / install_update Tauri commands.
 */

interface UpdateInfo {
	checking: boolean;
	available: boolean;
	version: string | null;
	notes: string | null;
	critical: boolean;
	installing: boolean;
	restarting: boolean;
	dismissed: boolean;
	error: string | null;
	downloaded: number;
	total: number | null;
}

export const updateState: UpdateInfo = $state({
	checking: false,
	available: false,
	version: null,
	notes: null,
	critical: false,
	installing: false,
	restarting: false,
	dismissed: false,
	error: null,
	downloaded: 0,
	total: null
});

async function getInvoke(): Promise<typeof import('@tauri-apps/api/core').invoke> {
	const { invoke } = await import('@tauri-apps/api/core');
	return invoke;
}

export async function checkForUpdate(): Promise<void> {
	if (updateState.checking) return;
	updateState.checking = true;
	try {
		const invoke = await getInvoke();
		const result = await invoke<{ available: boolean; version: string | null; notes: string | null; critical: boolean }>(
			'check_for_update'
		);
		updateState.available = result.available;
		updateState.version = result.version;
		updateState.notes = result.notes;
		updateState.critical = result.critical;
	} catch (err) {
		// Non-fatal — update check is best-effort
		console.warn('Update check failed:', err);
	} finally {
		updateState.checking = false;
	}
}

export async function installUpdate(): Promise<void> {
	updateState.installing = true;
	updateState.error = null;
	updateState.downloaded = 0;
	updateState.total = null;

	// Listen for download progress and restarting events from Rust
	const unlisteners: (() => void)[] = [];
	try {
		const { listen } = await import('@tauri-apps/api/event');
		unlisteners.push(
			await listen<{ downloaded: number; total: number | null }>('update-progress', (event) => {
				updateState.downloaded = event.payload.downloaded;
				updateState.total = event.payload.total;
			})
		);
		unlisteners.push(
			await listen('update-restarting', () => {
				updateState.installing = false;
				updateState.restarting = true;
			})
		);
	} catch {
		// Non-fatal if event listening fails
	}

	try {
		const invoke = await getInvoke();
		// Save current version so we can detect the update after restart
		try {
			const current = await invoke<string>('get_app_version');
			localStorage.setItem('blacktape_pre_update_version', current);
		} catch {}
		// This call doesn't return on success — Rust exits the process after a delay
		await invoke('install_update');
	} catch (err) {
		console.error('Install failed:', err);
		updateState.error = String(err);
		updateState.installing = false;
		updateState.restarting = false;
		for (const fn of unlisteners) fn();
	}
}

export function dismissUpdate(): void {
	updateState.dismissed = true;
}

// --- "Just updated" detection ---
export const justUpdatedTo: { version: string | null } = $state({ version: null });

export function dismissJustUpdated(): void {
	justUpdatedTo.version = null;
	try { localStorage.removeItem('blacktape_pre_update_version'); } catch {}
}

/** Call on app startup to detect if we just came back from an update. */
export async function detectJustUpdated(): Promise<void> {
	try {
		const prev = localStorage.getItem('blacktape_pre_update_version');
		if (!prev) return;
		localStorage.removeItem('blacktape_pre_update_version');
		const invoke = await getInvoke();
		const current = await invoke<string>('get_app_version');
		if (current !== prev) {
			justUpdatedTo.version = current;
		}
	} catch {}
}
