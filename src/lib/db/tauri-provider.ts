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
		// DEBUG: timeout + logging to diagnose hang
		const shortSql = sql.trim().slice(0, 80).replace(/\s+/g, ' ');
		console.log('[TauriProvider] invoke query_mercury_db:', shortSql, params);
		const result = await Promise.race([
			invoke<T[]>('query_mercury_db', { sql, params }),
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error(`query_mercury_db timed out (15s): ${shortSql}`)), 15000)
			)
		]);
		console.log('[TauriProvider] invoke done, rows:', (result as unknown[]).length);
		return result;
	}

	async get<T>(sql: string, ...params: unknown[]): Promise<T | null> {
		const results = await this.all<T>(sql, ...params);
		return results[0] ?? null;
	}
}
