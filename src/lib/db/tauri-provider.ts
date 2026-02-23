/**
 * TauriProvider — implements DbProvider using direct Rust rusqlite commands.
 *
 * Bypasses @tauri-apps/plugin-sql entirely. In production Tauri builds,
 * Database.load() hangs indefinitely; invoking a Rust command with rusqlite
 * works correctly.
 *
 * All queries go through the generic `query_mercury_db` Rust command which
 * accepts arbitrary SQL + params and returns rows as JSON objects.
 */

import type { DbProvider } from './provider';

let instance: TauriProvider | null = null;

export class TauriProvider implements DbProvider {
	private constructor() {}

	static async getInstance(): Promise<TauriProvider> {
		if (!instance) {
			instance = new TauriProvider();
		}
		return instance;
	}

	async all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
		const { invoke } = await import('@tauri-apps/api/core');
		try {
			const result = await invoke<T[]>('query_mercury_db', { sql, params });
			console.log('[TauriProvider] ok, rows:', Array.isArray(result) ? result.length : typeof result);
			return result;
		} catch (e) {
			console.error('[TauriProvider] invoke error:', e, '\nsql:', sql.slice(0, 80));
			throw e;
		}
	}

	async get<T>(sql: string, ...params: unknown[]): Promise<T | null> {
		const results = await this.all<T>(sql, ...params);
		return results[0] ?? null;
	}
}
