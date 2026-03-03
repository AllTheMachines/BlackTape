/**
 * Phase G: Genre encyclopedia pipeline step
 *
 * Fetches music genre hierarchy from Wikidata SPARQL, geocodes scene cities
 * via Nominatim, and persists everything into `genres` + `genre_relationships`
 * tables in mercury.db.
 *
 * Usage: node pipeline/build-genre-data.mjs
 *
 * Idempotent: DELETE-before-INSERT, safe to re-run.
 * Rate limiting: 1100ms delay between Nominatim requests (1 req/sec limit).
 */

import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'data', 'mercury.db');
const SCHEMA_PATH = join(__dirname, 'lib', 'schema.sql');
const MB_GENRE_PATH = join(__dirname, 'data', 'extracted', 'genre');

const WIKIDATA_SPARQL_URL = 'https://query.wikidata.org/sparql';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'Mercury/0.1.0 (https://github.com/mercury-music/mercury; music discovery tool)';

// SPARQL query: fetch music genres with parent, inception year, country of origin, and influenced-by
const SPARQL_QUERY = `
SELECT DISTINCT ?genre ?genreLabel ?genreId ?parentGenre ?parentGenreLabel
                ?inceptionYear ?originLabel ?influencedBy ?influencedByLabel WHERE {
  ?genre wdt:P31 wd:Q188451 .
  BIND(STRAFTER(STR(?genre), "entity/") AS ?genreId)
  OPTIONAL { ?genre wdt:P279 ?parentGenre . }
  OPTIONAL { ?genre wdt:P571 ?inception . BIND(YEAR(?inception) AS ?inceptionYear) }
  OPTIONAL {
    ?genre wdt:P495 ?origin .
    ?origin rdfs:label ?originLabel .
    FILTER(LANG(?originLabel) = "en")
  }
  OPTIONAL { ?genre wdt:P737 ?influencedBy . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 5000
`;

// SPARQL query: fetch local music scenes (Q1640824) with city, country, and inception year.
// City label is used as origin_city; geocodeScenes() fills in lat/lng via Nominatim.
const SPARQL_SCENES_QUERY = `
SELECT DISTINCT ?scene ?sceneLabel ?sceneId ?cityLabel ?countryLabel ?inceptionYear WHERE {
  ?scene wdt:P31 wd:Q1640824 .
  BIND(STRAFTER(STR(?scene), "entity/") AS ?sceneId)
  OPTIONAL { ?scene wdt:P131 ?city }
  OPTIONAL { ?scene wdt:P17 ?country }
  OPTIONAL { ?scene wdt:P571 ?inception . BIND(YEAR(?inception) AS ?inceptionYear) }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
  FILTER(!CONTAINS(STR(?sceneLabel), "Q"))
}
LIMIT 1000
`;

// --- Utilities ---

/**
 * Convert a genre name to a URL-safe slug.
 * Collision-safe: append first 8 chars of Wikidata Q-number if needed.
 */
function slugify(name, wikidataId = '') {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || wikidataId.slice(1, 9);
}

/** Sleep for ms milliseconds */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Normalize a genre name for matching against MusicBrainz canonical names.
 * Strips trailing " music", " genre", " style" (Wikidata uses "rock music", MB uses "rock").
 */
function normalizeName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+(music|genre|style)$/i, '');
}

/**
 * Load the MusicBrainz canonical genre list from the extracted dump file.
 * Returns a Map<lowercase_name, canonical_name> for matching.
 * The file is tab-separated with columns: id, gid, name, comment, edits_pending, last_updated
 */
function loadMbGenres() {
  if (!existsSync(MB_GENRE_PATH)) {
    console.warn('[Phase G] MB genre file not found at', MB_GENRE_PATH);
    console.warn('[Phase G] Run "node pipeline/import.js" to extract it from mbdump.tar.bz2');
    return new Map();
  }

  const content = readFileSync(MB_GENRE_PATH, 'utf-8');
  const lookup = new Map(); // lowercase name -> canonical name

  for (const line of content.split('\n')) {
    if (!line) continue;
    const parts = line.split('\t');
    const name = parts[2]; // column index 2 = name
    if (name && name !== '\\N') {
      lookup.set(name.toLowerCase(), name);
    }
  }

  console.log(`[Phase G] Loaded ${lookup.size} MusicBrainz canonical genres`);
  return lookup;
}

// --- Wikidata fetch ---

/**
 * Fetch music genre data from Wikidata SPARQL endpoint.
 * Returns the bindings array, or empty array on network/parse failure.
 */
async function fetchWikidataGenres() {
  console.log('[Phase G] Fetching genre data from Wikidata...');

  const url = `${WIKIDATA_SPARQL_URL}?query=${encodeURIComponent(SPARQL_QUERY)}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/sparql-results+json',
        'User-Agent': USER_AGENT
      }
    });

    if (!response.ok) {
      console.warn(`[Phase G] Wikidata returned HTTP ${response.status} — proceeding with empty dataset`);
      return [];
    }

    const data = await response.json();
    const bindings = data?.results?.bindings ?? [];
    console.log(`[Phase G] Wikidata returned ${bindings.length} rows`);
    return bindings;
  } catch (err) {
    console.warn(`[Phase G] Wikidata unreachable: ${err.message} — proceeding with empty dataset`);
    return [];
  }
}

/**
 * Fetch local music scene data from Wikidata SPARQL endpoint.
 * Returns the bindings array, or empty array on network/parse failure.
 */
async function fetchWikidataScenes() {
  console.log('[Phase G] Fetching music scene data from Wikidata...');

  const url = `${WIKIDATA_SPARQL_URL}?query=${encodeURIComponent(SPARQL_SCENES_QUERY)}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/sparql-results+json',
        'User-Agent': USER_AGENT
      }
    });

    if (!response.ok) {
      console.warn(`[Phase G] Wikidata returned HTTP ${response.status} for scenes — skipping`);
      return [];
    }

    const data = await response.json();
    const bindings = data?.results?.bindings ?? [];
    console.log(`[Phase G] Wikidata returned ${bindings.length} scene rows`);
    return bindings;
  } catch (err) {
    console.warn(`[Phase G] Wikidata unreachable for scenes: ${err.message} — skipping`);
    return [];
  }
}

// --- Normalization and insert ---

/**
 * Process SPARQL bindings, deduplicate genres, build slug map, and insert into DB.
 * Returns arrays of parent-child pairs and influenced-by pairs for relationship inserts.
 */
function insertGenres(db, bindings, mbGenreLookup) {
  // Deduplicate: one row per unique genre Wikidata ID
  const genreMap = new Map(); // wikidataId -> { name, label, inceptionYear, originCity, ...}

  for (const row of bindings) {
    const wdId = row.genreId?.value;
    const name = row.genreLabel?.value;

    if (!wdId || !name) continue;
    // Skip Wikidata internal labels (e.g. "Q12345")
    if (/^Q\d+$/.test(name)) continue;

    if (!genreMap.has(wdId)) {
      genreMap.set(wdId, {
        wdId,
        name,
        inceptionYear: row.inceptionYear ? parseInt(row.inceptionYear.value, 10) : null,
        originCity: row.originLabel?.value ?? null,
        parents: [],
        influences: []
      });
    }

    const entry = genreMap.get(wdId);

    // Collect parent genre references
    if (row.parentGenre?.value) {
      const parentWdId = row.parentGenre.value.replace('http://www.wikidata.org/entity/', '');
      const parentLabel = row.parentGenreLabel?.value;
      if (parentWdId && !/^Q\d+$/.test(parentLabel ?? '')) {
        if (!entry.parents.includes(parentWdId)) entry.parents.push(parentWdId);
      }
    }

    // Collect influenced-by references
    if (row.influencedBy?.value) {
      const influencedWdId = row.influencedBy.value.replace('http://www.wikidata.org/entity/', '');
      const influencedLabel = row.influencedByLabel?.value;
      if (influencedWdId && !/^Q\d+$/.test(influencedLabel ?? '')) {
        if (!entry.influences.includes(influencedWdId)) entry.influences.push(influencedWdId);
      }
    }
  }

  // Build slug map, checking for collisions
  const slugCounts = new Map();
  for (const entry of genreMap.values()) {
    const base = slugify(entry.name);
    slugCounts.set(base, (slugCounts.get(base) ?? 0) + 1);
  }

  // Clear existing data for idempotency
  db.exec('DELETE FROM genre_relationships; DELETE FROM genres;');

  const insertGenre = db.prepare(`
    INSERT OR IGNORE INTO genres
      (slug, name, type, wikidata_id, wikipedia_title, inception_year, origin_city, mb_tag)
    VALUES
      (@slug, @name, @type, @wikidataId, @wikipediaTitle, @inceptionYear, @originCity, @mbTag)
  `);

  // Track wdId -> db id for relationship inserts
  const wdIdToDbId = new Map();

  // Relationship pairs to process after genre inserts
  const parentPairs = [];    // [childDbId, parentWdId]
  const influencePairs = []; // [genreDbId, influencedByWdId]

  const insertMany = db.transaction(() => {
    for (const entry of genreMap.values()) {
      const baseSlug = slugify(entry.name);
      // Use collision-safe slug if base slug collides
      const slug = (slugCounts.get(baseSlug) ?? 0) > 1
        ? `${baseSlug}-${entry.wdId.slice(1, 9)}`
        : baseSlug;

      // All Wikidata Q188451 items are music genres, not geographic scenes.
      // origin_city stores P495 (country/region of origin) for display only.
      const type = 'genre';

      // mb_tag: space-separated name matching artist_tags.tag format
      // Try normalized, dehyphenated, then raw lowercase — first MB match wins
      const normalized = normalizeName(entry.name);
      const dehyphenated = normalized.replace(/-/g, ' ');
      const mbTag = mbGenreLookup.get(normalized)?.toLowerCase()
                 ?? mbGenreLookup.get(dehyphenated)?.toLowerCase()
                 ?? mbGenreLookup.get(entry.name.toLowerCase())?.toLowerCase()
                 ?? entry.name.toLowerCase()
                 ?? null;

      // wikipedia_title: use name for runtime Wikipedia summary lookup
      const wikipediaTitle = entry.name;

      insertGenre.run({
        slug,
        name: entry.name,
        type,
        wikidataId: entry.wdId,
        wikipediaTitle,
        inceptionYear: entry.inceptionYear,
        originCity: entry.originCity,
        mbTag
      });

      // Fetch the id we just inserted (or existing if IGNORE fired)
      const row = db.prepare('SELECT id FROM genres WHERE slug = ?').get(slug);
      if (row) {
        wdIdToDbId.set(entry.wdId, row.id);
      }
    }
  });

  insertMany();

  // Collect relationship pairs now that all genres are inserted
  for (const entry of genreMap.values()) {
    const fromId = wdIdToDbId.get(entry.wdId);
    if (!fromId) continue;

    for (const parentWdId of entry.parents) {
      parentPairs.push({ childId: fromId, parentWdId });
    }
    for (const influencedWdId of entry.influences) {
      influencePairs.push({ genreId: fromId, influencedWdId });
    }
  }

  const genreCount = db.prepare('SELECT COUNT(*) as n FROM genres').get().n;
  return { genreCount, wdIdToDbId, parentPairs, influencePairs };
}

// --- Relationship insert ---

/**
 * Insert parent-child (subgenre) and influenced-by relationships into genre_relationships.
 */
function insertRelationships(db, wdIdToDbId, parentPairs, influencePairs) {
  const insertRel = db.prepare(`
    INSERT OR IGNORE INTO genre_relationships (from_id, to_id, rel_type)
    VALUES (@fromId, @toId, @relType)
  `);

  let relCount = 0;

  const insertAllRels = db.transaction(() => {
    // Subgenre relationships: from=child, to=parent
    for (const { childId, parentWdId } of parentPairs) {
      const parentId = wdIdToDbId.get(parentWdId);
      if (!parentId || parentId === childId) continue;
      insertRel.run({ fromId: childId, toId: parentId, relType: 'subgenre' });
      relCount++;
    }

    // Influenced-by relationships: from=genre, to=influencer
    for (const { genreId, influencedWdId } of influencePairs) {
      const influencedId = wdIdToDbId.get(influencedWdId);
      if (!influencedId || influencedId === genreId) continue;
      insertRel.run({ fromId: genreId, toId: influencedId, relType: 'influenced_by' });
      relCount++;
    }
  });

  insertAllRels();
  return relCount;
}

// --- Scene insert ---

/**
 * Insert local music scenes (type='scene') from SPARQL bindings into the genres table.
 * Uses INSERT OR IGNORE so slug collisions with existing genres are skipped.
 * origin_city stores the city label (or country as fallback) for geocodeScenes() to fill.
 */
function insertScenes(db, bindings, mbGenreLookup) {
  // Deduplicate by Wikidata ID
  const sceneMap = new Map();

  for (const row of bindings) {
    const wdId = row.sceneId?.value;
    const name = row.sceneLabel?.value;

    if (!wdId || !name) continue;
    if (/^Q\d+$/.test(name)) continue;

    if (!sceneMap.has(wdId)) {
      sceneMap.set(wdId, {
        wdId,
        name,
        // Prefer city label (P131) for geocoding; fall back to country label (P17)
        originCity: row.cityLabel?.value ?? row.countryLabel?.value ?? null,
        inceptionYear: row.inceptionYear ? parseInt(row.inceptionYear.value, 10) : null
      });
    }
  }

  if (sceneMap.size === 0) {
    console.log('[Phase G] No scenes to insert.');
    return 0;
  }

  // Detect slug collisions within the scene set itself
  const slugCounts = new Map();
  for (const entry of sceneMap.values()) {
    const base = slugify(entry.name);
    slugCounts.set(base, (slugCounts.get(base) ?? 0) + 1);
  }

  const insertScene = db.prepare(`
    INSERT OR IGNORE INTO genres
      (slug, name, type, wikidata_id, wikipedia_title, inception_year, origin_city, mb_tag)
    VALUES
      (@slug, @name, @type, @wikidataId, @wikipediaTitle, @inceptionYear, @originCity, @mbTag)
  `);

  const insertMany = db.transaction(() => {
    for (const entry of sceneMap.values()) {
      const baseSlug = slugify(entry.name);
      const slug = (slugCounts.get(baseSlug) ?? 0) > 1
        ? `${baseSlug}-${entry.wdId.slice(1, 9)}`
        : baseSlug;

      // mb_tag: space-separated name matching artist_tags.tag format
      const normalized = normalizeName(entry.name);
      const dehyphenated = normalized.replace(/-/g, ' ');
      const mbTag = mbGenreLookup.get(normalized)?.toLowerCase()
                 ?? mbGenreLookup.get(dehyphenated)?.toLowerCase()
                 ?? mbGenreLookup.get(entry.name.toLowerCase())?.toLowerCase()
                 ?? entry.name.toLowerCase()
                 ?? null;

      insertScene.run({
        slug,
        name: entry.name,
        type: 'scene',
        wikidataId: entry.wdId,
        wikipediaTitle: entry.name,
        inceptionYear: entry.inceptionYear,
        originCity: entry.originCity,
        mbTag
      });
    }
  });

  insertMany();

  const sceneCount = db.prepare("SELECT COUNT(*) as n FROM genres WHERE type = 'scene'").get().n;
  return sceneCount;
}

// --- Nominatim geocoding ---

/**
 * Geocode scene cities via Nominatim (1100ms between requests).
 * Updates origin_lat/origin_lng in genres table.
 */
async function geocodeScenes(db) {
  const scenes = db.prepare(`
    SELECT id, origin_city FROM genres
    WHERE type = 'scene' AND origin_city IS NOT NULL AND origin_lat IS NULL
  `).all();

  if (scenes.length === 0) {
    console.log('[Phase G] No scene cities to geocode.');
    return;
  }

  console.log(`[Phase G] Geocoding ${scenes.length} scene cities via Nominatim...`);

  const updateCoords = db.prepare(
    'UPDATE genres SET origin_lat = ?, origin_lng = ? WHERE id = ?'
  );

  let geocoded = 0;
  let failed = 0;

  for (const scene of scenes) {
    try {
      const encodedCity = encodeURIComponent(scene.origin_city);
      const url = `${NOMINATIM_URL}?q=${encodedCity}&format=json&limit=1&featuretype=city`;

      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT }
      });

      if (response.ok) {
        const results = await response.json();
        if (results.length > 0) {
          const { lat, lon } = results[0];
          updateCoords.run(parseFloat(lat), parseFloat(lon), scene.id);
          geocoded++;
        } else {
          failed++;
        }
      } else {
        failed++;
      }
    } catch (err) {
      console.warn(`[Phase G] Geocoding failed for "${scene.origin_city}": ${err.message}`);
      failed++;
    }

    // Progress log every 10 cities
    if ((geocoded + failed) % 10 === 0) {
      console.log(`[Phase G] Geocoded ${geocoded} cities (${failed} not found)...`);
    }

    // Respect Nominatim 1 req/sec rate limit
    await sleep(1100);
  }

  console.log(`[Phase G] Geocoding complete: ${geocoded} found, ${failed} not found.`);
}

// --- MB genre backfill ---

/**
 * Insert MusicBrainz canonical genres that weren't matched by any Wikidata entry.
 * These won't have Wikidata enrichment (no inception_year, origin_city, relationships)
 * but they will have working artist_tags bridges via mb_tag.
 */
function insertUnmatchedMbGenres(db, mbGenreLookup, matchedMbNames) {
  const insertGenre = db.prepare(`
    INSERT OR IGNORE INTO genres
      (slug, name, type, wikidata_id, wikipedia_title, inception_year, origin_city, mb_tag)
    VALUES
      (@slug, @name, @type, @wikidataId, @wikipediaTitle, @inceptionYear, @originCity, @mbTag)
  `);

  let inserted = 0;

  const insertMany = db.transaction(() => {
    for (const [lowerName, canonicalName] of mbGenreLookup) {
      if (matchedMbNames.has(lowerName)) continue;

      const slug = slugify(canonicalName);
      if (!slug) continue;

      insertGenre.run({
        slug,
        name: canonicalName,
        type: 'genre',
        wikidataId: null,
        wikipediaTitle: canonicalName,
        inceptionYear: null,
        originCity: null,
        mbTag: lowerName // already lowercase — matches artist_tags.tag format
      });
      inserted++;
    }
  });

  insertMany();
  console.log(`[Phase G] Inserted ${inserted} additional MusicBrainz-only genres`);
  return inserted;
}

// --- Main ---

async function main() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Apply schema (idempotent — CREATE IF NOT EXISTS)
  const schema = readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);

  // Step 0: Load MusicBrainz canonical genre list for name matching
  const mbGenreLookup = loadMbGenres();

  // Step 1: Fetch from Wikidata
  const bindings = await fetchWikidataGenres();

  if (bindings.length === 0 && mbGenreLookup.size === 0) {
    console.warn('[Phase G] No genre data from Wikidata or MusicBrainz. Exiting cleanly.');
    db.close();
    process.exit(0);
  }

  // Step 2: Insert Wikidata genres (with fixed mb_tag using MB name matching)
  const { genreCount, wdIdToDbId, parentPairs, influencePairs } = insertGenres(db, bindings, mbGenreLookup);

  // Step 3: Insert relationships
  const relCount = insertRelationships(db, wdIdToDbId, parentPairs, influencePairs);

  console.log(`[Phase G] Inserted ${genreCount} Wikidata genres (${relCount} relationships)`);

  // Step 4: Fetch and insert local music scenes (Q1640824)
  const sceneBindings = await fetchWikidataScenes();
  const sceneCount = insertScenes(db, sceneBindings, mbGenreLookup);
  console.log(`[Phase G] Inserted ${sceneCount} scenes`);

  // Step 5: Insert unmatched MB genres (no Wikidata enrichment, but working artist bridges)
  if (mbGenreLookup.size > 0) {
    // Collect which MB names were matched by Wikidata entries
    const matchedMbNames = new Set();
    const allGenres = db.prepare('SELECT mb_tag FROM genres WHERE mb_tag IS NOT NULL').all();
    for (const row of allGenres) {
      matchedMbNames.add(row.mb_tag);
    }
    insertUnmatchedMbGenres(db, mbGenreLookup, matchedMbNames);
  }

  // Step 6: Geocode scene cities (fills origin_lat/origin_lng via Nominatim)
  await geocodeScenes(db);

  db.close();
  console.log('[Phase G] Genre data build complete.');
}

main().catch(err => {
  console.error('[Phase G] Fatal error:', err);
  process.exit(1);
});
