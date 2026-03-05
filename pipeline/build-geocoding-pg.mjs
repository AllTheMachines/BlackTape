/**
 * Geocodes artists in the Hetzner PostgreSQL database to city-level coordinates
 * via Wikidata SPARQL. Ported from build-geocoding.mjs (SQLite).
 *
 * Writes city_lat, city_lng, city_precision columns on the artists table.
 *
 * Precision hierarchy:
 *   'city'    — artist has a P19 (place of birth) with P625 coordinates
 *   'region'  — birth city has a P131 (admin territory) with P625 coordinates
 *   'country' — fallback to P27 (country of citizenship) centroid
 *   'none'    — sentinel: no Wikidata result; skip on re-run
 *
 * Artists without a country code (country IS NULL) are skipped entirely.
 *
 * Usage: node pipeline/build-geocoding-pg.mjs
 * (run on the Hetzner server — connects to localhost Postgres)
 *
 * Idempotent: uses city_precision IS NULL as "not yet geocoded" check.
 * Resumable: re-running after network interruption picks up where it left off.
 * Rate limiting: 1100ms sleep between Wikidata SPARQL batches.
 */

import postgres from 'postgres';

const sql = postgres({
  host: 'localhost',
  port: 5432,
  database: 'blacktape',
  username: 'blacktape',
  password: 'bt_local_dev_2026',
  max: 3,
  connect_timeout: 30,
  ssl: false,
});

const WIKIDATA_SPARQL_URL = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'BlackTape/0.3.2 (https://github.com/AllTheMachines/BlackTape; music discovery pipeline)';

const BATCH_SIZE = 50;
const SLEEP_MS = 1100;

// ---------------------------------------------------------------------------
// Wikidata SPARQL fetch — three-tier precision hierarchy
// ---------------------------------------------------------------------------

async function fetchWikidataBatch(mbids) {
  const valuesClause = mbids.map(id => `"${id}"`).join(' ');
  const sparql = `
    SELECT ?mbid
           (SAMPLE(?lat) AS ?lat)
           (SAMPLE(?lng) AS ?lng)
           (SAMPLE(?precisionVal) AS ?precisionVal)
    WHERE {
      VALUES ?mbid { ${valuesClause} }
      ?artist wdt:P434 ?mbid .
      OPTIONAL {
        ?artist wdt:P19 ?birthCity .
        ?birthCity wdt:P625 ?cityCoord .
        BIND(geof:latitude(?cityCoord) AS ?lat)
        BIND(geof:longitude(?cityCoord) AS ?lng)
        BIND("city" AS ?precisionVal)
      }
      OPTIONAL {
        ?artist wdt:P19 ?birthCity2 .
        ?birthCity2 wdt:P131 ?region .
        ?region wdt:P625 ?regionCoord .
        BIND(geof:latitude(?regionCoord) AS ?lat)
        BIND(geof:longitude(?regionCoord) AS ?lng)
        BIND("region" AS ?precisionVal)
      }
      OPTIONAL {
        ?artist wdt:P27 ?country .
        ?country wdt:P625 ?countryCoord .
        BIND(geof:latitude(?countryCoord) AS ?lat)
        BIND(geof:longitude(?countryCoord) AS ?lng)
        BIND("country" AS ?precisionVal)
      }
    }
    GROUP BY ?mbid
  `;

  const url = `${WIKIDATA_SPARQL_URL}?query=${encodeURIComponent(sparql)}`;
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/sparql-results+json',
        'User-Agent': USER_AGENT
      }
    });
    if (!response.ok) {
      console.warn(`[geocoding] Wikidata returned HTTP ${response.status}`);
      return [];
    }
    const data = await response.json();
    return data?.results?.bindings ?? [];
  } catch (err) {
    console.warn(`[geocoding] Wikidata unreachable: ${err.message}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
  console.log('[geocoding] Connected to PostgreSQL');

  // Step A — Add columns (idempotent)
  await sql`ALTER TABLE artists ADD COLUMN IF NOT EXISTS city_lat REAL`;
  await sql`ALTER TABLE artists ADD COLUMN IF NOT EXISTS city_lng REAL`;
  await sql`ALTER TABLE artists ADD COLUMN IF NOT EXISTS city_precision TEXT`;
  console.log('[geocoding] Columns ready (city_lat, city_lng, city_precision)');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_artists_city
    ON artists(city_lat, city_lng)
    WHERE city_lat IS NOT NULL
  `;

  // Step B — Fetch artists needing geocoding
  const artists = await sql`
    SELECT id, mbid::text
    FROM artists
    WHERE country IS NOT NULL AND city_precision IS NULL
    ORDER BY id
  `;
  console.log(`[geocoding] ${artists.length} artists to geocode...`);

  if (artists.length === 0) {
    console.log('[geocoding] Nothing to do — all artists already processed.');
    await sql.end();
    console.log('Done.');
    return;
  }

  // Precision rank — higher wins
  const RANK = { city: 3, region: 2, country: 1 };

  let processed = 0;
  let totalGeocoded = 0;

  // Step C — Batch loop (50 MBIDs per SPARQL query)
  for (let i = 0; i < artists.length; i += BATCH_SIZE) {
    const batch = artists.slice(i, i + BATCH_SIZE);
    const mbids = batch.map(a => a.mbid);

    const bindings = await fetchWikidataBatch(mbids);

    // Build geoMap: mbid -> { lat, lng, precision }
    const geoMap = {};
    for (const row of bindings) {
      const mbid = row.mbid?.value;
      if (!mbid) continue;
      const lat = parseFloat(row.lat?.value);
      const lng = parseFloat(row.lng?.value);
      const precision = row.precisionVal?.value;
      if (!isNaN(lat) && !isNaN(lng) && precision) {
        const existingRank = RANK[geoMap[mbid]?.precision] ?? 0;
        if ((RANK[precision] ?? 0) > existingRank) {
          geoMap[mbid] = { lat, lng, precision };
        }
      }
    }

    // Write geocoded results
    for (const [mbid, geo] of Object.entries(geoMap)) {
      await sql`
        UPDATE artists
        SET city_lat = ${geo.lat}, city_lng = ${geo.lng}, city_precision = ${geo.precision}
        WHERE mbid::text = ${mbid}
      `;
    }

    // Mark artists with no Wikidata result as 'none'
    const noDataMbids = mbids.filter(m => !geoMap[m]);
    if (noDataMbids.length > 0) {
      await sql`
        UPDATE artists
        SET city_precision = 'none'
        WHERE mbid::text = ANY(${noDataMbids})
        AND city_precision IS NULL
      `;
    }

    processed += batch.length;
    totalGeocoded += Object.keys(geoMap).length;

    if (processed % 1000 === 0 || i + BATCH_SIZE >= artists.length) {
      console.log(
        `[geocoding] ${processed}/${artists.length} processed, ` +
        `${Object.keys(geoMap).length} geocoded in last batch ` +
        `(${totalGeocoded} total geocoded so far)`
      );
    }

    // Rate limit: 1100ms between Wikidata requests (not after the last batch)
    if (i + BATCH_SIZE < artists.length) {
      await new Promise(r => setTimeout(r, SLEEP_MS));
    }
  }

  // Step D — Report
  const [{ geocoded }] = await sql`
    SELECT COUNT(*) AS geocoded FROM artists
    WHERE city_precision IN ('city', 'region', 'country')
  `;
  const [{ city_level }] = await sql`SELECT COUNT(*) AS city_level FROM artists WHERE city_precision = 'city'`;
  const [{ region_level }] = await sql`SELECT COUNT(*) AS region_level FROM artists WHERE city_precision = 'region'`;
  const [{ country_level }] = await sql`SELECT COUNT(*) AS country_level FROM artists WHERE city_precision = 'country'`;
  const [{ none_level }] = await sql`SELECT COUNT(*) AS none_level FROM artists WHERE city_precision = 'none'`;

  console.log(
    `[geocoding] Complete: ${geocoded} artists geocoded ` +
    `(${city_level} city-level, ${region_level} region-level, ${country_level} country-level). ` +
    `${none_level} artists had no Wikidata match.`
  );

  await sql.end();
  console.log('Done.');
})();
