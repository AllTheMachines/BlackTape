/**
 * Reactive update state and helpers.
 * Wraps the check_for_update / install_update Tauri commands.
 */

interface UpdateInfo {
	checking: boolean;
	available: boolean;
	version: string | null;
	notes: string | null;
	installing: boolean;
	dismissed: boolean;
}

export const updateState: UpdateInfo = $state({
	checking: false,
	available: false,
	version: null,
	notes: null,
	installing: false,
	dismissed: false
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
		const result = await invoke<{ available: boolean; version: string | null; notes: string | null }>(
			'check_for_update'
		);
		updateState.available = result.available;
		updateState.version = result.version;
		updateState.notes = result.notes;
	} catch (err) {
		// Non-fatal — update check is best-effort
		console.warn('Update check failed:', err);
	} finally {
		updateState.checking = false;
	}
}

export async function installUpdate(): Promise<void> {
	updateState.installing = true;
	try {
		const invoke = await getInvoke();
		await invoke('install_update');
		// App restarts — this line won't be reached normally
	} catch (err) {
		console.error('Install failed:', err);
		updateState.installing = false;
	}
}

export function dismissUpdate(): void {
	updateState.dismissed = true;
}
