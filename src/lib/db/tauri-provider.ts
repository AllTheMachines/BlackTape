/**
 * TauriProvider — wraps @tauri-apps/plugin-sql behind the DbProvider interface.
 *
 * Used in the Tauri desktop build where the SQLite database is a local file.
 * Uses a lazy singleton pattern: the database connection is opened once on
 * first use via `Database.load()`.
 *
 * All imports of @tauri-apps/plugin-sql are dynamic so this module never
 * causes build failures in the web context (it's tree-shaken out or
 * dynamically imported only when isTauri() is true).
 */

import type { DbProvider } from './provider';

// Type alias for the Database class from @tauri-apps/plugin-sql.
// We don't import the actual class at the top level to avoid build errors.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TauriDatabase = { select<T>(sql: string, params?: unknown[]): Promise<T>; close(): Promise<void> };

let instance: TauriProvider | null = null;

export class TauriProvider implements DbProvider {
	private db: TauriDatabase | null = null;

	private constructor() {}

	/**
	 * Get or create the singleton TauriProvider instance.
	 * The actual database connection is opened lazily on first query.
	 */
	static async getInstance(): Promise<TauriProvider> {
		if (!instance) {
			instance = new TauriProvider();
		}
		return instance;
	}

	/** Ensure the database connection is open. */
	private async ensureDb(): Promise<TauriDatabase> {
		if (!this.db) {
			const { default: Database } = await import('@tauri-apps/plugin-sql');
			this.db = await Database.load('sqlite:mercury.db') as unknown as TauriDatabase;
		}
		return this.db;
	}

	async all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
		const db = await this.ensureDb();
		// tauri-plugin-sql takes bind parameters as an array
		return db.select<T[]>(sql, params) as unknown as T[];
	}

	async get<T>(sql: string, ...params: unknown[]): Promise<T | null> {
		const results = await this.all<T>(sql, ...params);
		return results[0] ?? null;
	}
}
