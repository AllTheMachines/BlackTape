import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import postgres from 'postgres';

const sql = postgres({
  host: 'localhost',
  port: 5432,
  database: 'blacktape',
  username: 'blacktape',
  password: 'bt_local_dev_2026',
  max: 10,
});

const app = new Hono();

app.use('/*', cors({ origin: '*' }));

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }));

// ---------------------------------------------------------------------------
// SQL translator: SQLite dialect → PostgreSQL
//
// The SvelteKit app sends raw SQLite-flavoured SQL via POST /query.
// This translator normalises the key differences so we can run it on Postgres.
// ---------------------------------------------------------------------------

function translateSQL(rawSql, rawParams) {
  let s = rawSql;
  const params = rawParams ? [...rawParams] : [];

  // 1. FTS5 pattern: FROM artists_fts f JOIN artists a ON a.id = f.rowid WHERE artists_fts MATCH ?
  //    → FROM artists a WHERE (a.name ILIKE $N OR a.sort_name ILIKE $N)
  if (/artists_fts/i.test(s)) {
    // Find which positional ? corresponds to the MATCH param
    const beforeMatch = s.split(/artists_fts\s+MATCH\s+\?/i)[0];
    const ftsIdx = (beforeMatch.match(/\?/g) || []).length;

    const ftsParam = params[ftsIdx];
    const isPrefix = typeof ftsParam === 'string' && ftsParam.endsWith('*');
    const term = isPrefix ? ftsParam.slice(0, -1) : ftsParam;
    const pgParam = isPrefix ? term + '%' : '%' + term + '%';

    // Replace the FROM/JOIN block
    s = s.replace(
      /FROM\s+artists_fts\s+f\s+JOIN\s+artists\s+a\s+ON\s+a\.id\s*=\s*f\.rowid/gi,
      'FROM artists a'
    );
    // Replace the MATCH clause — inject two ? (name + sort_name)
    s = s.replace(
      /WHERE\s+artists_fts\s+MATCH\s+\?/gi,
      'WHERE (a.name ILIKE ? OR a.sort_name ILIKE ?)'
    );
    // Remove f.rank references from ORDER BY
    s = s.replace(/,\s*f\.rank\b/gi, '');
    s = s.replace(/\bf\.rank\s*,/gi, '');
    s = s.replace(/\bf\.rank\b/gi, '');

    // Replace the FTS param with two copies of pgParam
    params.splice(ftsIdx, 1, pgParam, pgParam);
  }

  // 2. GROUP_CONCAT → STRING_AGG
  //    GROUP_CONCAT(x, sep) → STRING_AGG(x, sep)
  //    GROUP_CONCAT(x)      → STRING_AGG(x, ',')
  s = s.replace(/GROUP_CONCAT\(([^,)]+),\s*([^)]+)\)/gi, 'STRING_AGG($1, $2)');
  s = s.replace(/GROUP_CONCAT\(([^)]+)\)/gi, (_, inner) => {
    // If inner already handled (has comma from previous replace), skip
    return `STRING_AGG(${inner}, ',')`;
  });

  // 3. Boolean comparisons: ended = 0 → ended = false, ended = 1 → ended = true
  s = s.replace(/\.ended\s*=\s*0\b/g, '.ended = false');
  s = s.replace(/\.ended\s*=\s*1\b/g, '.ended = true');
  s = s.replace(/\ba\.ended\s*=\s*0\b/g, 'a.ended = false');
  s = s.replace(/\ba\.ended\s*=\s*1\b/g, 'a.ended = true');

  // 4. strftime('%Y', 'now') → EXTRACT(YEAR FROM CURRENT_DATE)::integer
  s = s.replace(/strftime\('%Y',\s*'now'\)/gi, "EXTRACT(YEAR FROM CURRENT_DATE)::integer");

  // 5. Convert ? positional params to $1, $2, $3... (PostgreSQL style)
  let paramIndex = 0;
  s = s.replace(/\?/g, () => `$${++paramIndex}`);

  return { sql: s, params };
}

// ---------------------------------------------------------------------------
// POST /query — SQLite-compatible passthrough for the SvelteKit app
// ---------------------------------------------------------------------------

app.post('/query', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const { sql: rawSql, params: rawParams = [] } = body;
  if (!rawSql || typeof rawSql !== 'string') {
    return c.json({ error: 'Missing sql field' }, 400);
  }

  try {
    const { sql: pgSql, params } = translateSQL(rawSql, rawParams);
    const results = await sql.unsafe(pgSql, params);
    return c.json({ results: Array.from(results) });
  } catch (err) {
    console.error('Query error:', err.message);
    console.error('  SQL:', rawSql.slice(0, 200));
    return c.json({ error: err.message }, 500);
  }
});

// ---------------------------------------------------------------------------
// Typed REST endpoints (future — currently the /query passthrough handles all)
// ---------------------------------------------------------------------------

app.get('/api/artists/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json({ error: 'Invalid id' }, 400);
  try {
    const [artist] = await sql`
      SELECT a.id, a.mbid, a.name, a.slug, a.type, a.country,
             a.begin_year, a.end_year, a.ended,
             STRING_AGG(at.tag, ', ' ORDER BY at.count DESC) AS tags
      FROM artists a
      LEFT JOIN artist_tags at ON at.artist_id = a.id
      WHERE a.id = ${id}
      GROUP BY a.id
    `;
    if (!artist) return c.json({ error: 'Not found' }, 404);
    return c.json(artist);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// ---------------------------------------------------------------------------

const port = parseInt(process.env.PORT || '3000');
console.log(`BlackTape API listening on port ${port}`);
serve({ fetch: app.fetch, port });
