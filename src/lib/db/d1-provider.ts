/**
 * D1Provider — wraps Cloudflare D1Database behind the DbProvider interface.
 *
 * Used in SvelteKit server routes where `platform.env.DB` provides a D1Database.
 * This is a thin adapter — all it does is translate the DbProvider method
 * signatures to D1's prepare/bind/all pattern.
 */

import type { DbProvider } from './provider';

export class D1Provider implements DbProvider {
	constructor(private db: D1Database) {}

	async all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
		const { results } = await this.db
			.prepare(sql)
			.bind(...params)
			.all<T>();
		return results;
	}

	async get<T>(sql: string, ...params: unknown[]): Promise<T | null> {
		const results = await this.all<T>(sql, ...params);
		return results[0] ?? null;
	}
}
