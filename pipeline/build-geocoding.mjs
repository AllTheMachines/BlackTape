/**
 * Standalone pipeline script: geocodes artists in mercury.db to city-level
 * coordinates via Wikidata SPARQL.
 *
 * Writes city_lat, city_lng, city_precision columns on the artists table.
 *
 * Precision hierarchy:
 *   'city'    — artist has a P19 (place of birth) with P625 coordinates
 *   'region'  — birth city has a P131 (admin territory) with P625 coordinates
 *   'country' — fallback to P27 (country of citizenship) centroid
 *   'none'    — sentinel: no Wikidata result; skip on re-run
 *
 * Artists without a country code (country IS NULL) are skipped entirely —
 * they emit NULL lat/lng and are omitted from the World Map.
 *
 * Usage: node pipeline/build-geocoding.mjs
 *
 * Idempotent: uses city_precision IS NULL as "not yet geocoded" check.
 * Resumable: re-running after network interruption picks up where it left off.
 * Rate limiting: 1100ms sleep between Wikidata SPARQL batches.
 */

import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'data', 'mercury.db');

const WIKIDATA_SPARQL_URL = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'BlackTape/0.3.0 (https://github.com/nicholasgasior/blacktape; music discovery pipeline)';

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
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = MEMORY');
  db.pragma('cache_size = -64000');

  // Step B — Add columns (idempotent)
  const hasCol = db.prepare(
    "SELECT COUNT(*) as n FROM pragma_table_info('artists') WHERE name='city_lat'"
  ).get().n > 0;

  if (!hasCol) {
    db.exec("ALTER TABLE artists ADD COLUMN city_lat REAL;");
    db.exec("ALTER TABLE artists ADD COLUMN city_lng REAL;");
    db.exec("ALTER TABLE artists ADD COLUMN city_precision TEXT;");
    console.log('[geocoding] Added city_lat/city_lng/city_precision columns.');
  } else {
    console.log('[geocoding] Columns already exist, skipping ALTER TABLE.');
  }

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_artists_city ON artists(city_lat, city_lng) WHERE city_lat IS NOT NULL;"
  );

  // Step C — Fetch artists needing geocoding
  // Only artists with a country code; skip already-processed (city_precision IS NOT NULL)
  // LIMIT 500000 allows partial runs — remove for full 2.6M geocoding run
  const artists = db.prepare(
    "SELECT id, mbid FROM artists WHERE country IS NOT NULL AND city_precision IS NULL LIMIT 500000"
  ).all();
  console.log(`[geocoding] ${artists.length} artists to geocode...`);

  if (artists.length === 0) {
    console.log('[geocoding] Nothing to do — all artists already processed.');
    db.close();
    console.log('Done.');
    return;
  }

  // Prepared statements
  const updateStmt = db.prepare(
    "UPDATE artists SET city_lat = ?, city_lng = ?, city_precision = ? WHERE mbid = ?"
  );
  const markNoneStmt = db.prepare(
    "UPDATE artists SET city_precision = 'none' WHERE mbid = ? AND city_precision IS NULL"
  );

  // Precision rank — higher wins
  const RANK = { city: 3, region: 2, country: 1 };

  let processed = 0;
  let totalGeocoded = 0;

  // Step D — Batch loop (50 MBIDs per SPARQL query)
  for (let i = 0; i < artists.length; i += BATCH_SIZE) {
    const batch = artists.slice(i, i + BATCH_SIZE);
    const mbids = batch.map(a => a.mbid);

    const bindings = await fetchWikidataBatch(mbids);

    // Build geoMap: mbid -> { lat, lng, precision }
    // SAMPLE() aggregation in SPARQL can still return multiple rows per mbid
    // when multiple OPTIONAL blocks match — apply explicit rank here.
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

    // Write geocoded results in a single transaction
    const writeMany = db.transaction((entries) => {
      for (const [mbid, geo] of entries) {
        updateStmt.run(geo.lat, geo.lng, geo.precision, mbid);
      }
    });
    writeMany(Object.entries(geoMap));

    // Mark artists with no Wikidata result as 'none' — skip on re-runs
    const noDataMbids = mbids.filter(m => !geoMap[m]);
    const markNone = db.transaction((mbidList) => {
      for (const mbid of mbidList) {
        markNoneStmt.run(mbid);
      }
    });
    markNone(noDataMbids);

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

  // Step E — Report and close
  const geocoded = db.prepare(
    "SELECT COUNT(*) as n FROM artists WHERE city_precision IN ('city', 'region', 'country')"
  ).get();
  const cityLevel = db.prepare(
    "SELECT COUNT(*) as n FROM artists WHERE city_precision = 'city'"
  ).get();
  const regionLevel = db.prepare(
    "SELECT COUNT(*) as n FROM artists WHERE city_precision = 'region'"
  ).get();
  const countryLevel = db.prepare(
    "SELECT COUNT(*) as n FROM artists WHERE city_precision = 'country'"
  ).get();
  const noneLevel = db.prepare(
    "SELECT COUNT(*) as n FROM artists WHERE city_precision = 'none'"
  ).get();

  console.log(
    `[geocoding] Complete: ${geocoded.n} artists geocoded ` +
    `(${cityLevel.n} city-level, ${regionLevel.n} region-level, ${countryLevel.n} country-level). ` +
    `${noneLevel.n} artists had no Wikidata match.`
  );

  db.close();
  console.log('Done.');
})();
