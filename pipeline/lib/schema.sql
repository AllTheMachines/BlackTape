-- Mercury discovery index schema
-- Slim: artists + tags + country. That's the style map.
-- Everything else (releases, URLs, bios) is fetched live from the internet.
--
-- Pipeline execution order:
--   1. pipeline/import.js          — Phases A-E: extract MB dumps, build artists + artist_tags + artists_fts
--   2. pipeline/build-tag-stats.mjs — Phase F: creates tag_stats + tag_cooccurrence (NOT in this file)
--   3. pipeline/build-genre-data.mjs — Phase G: creates genres + genre_relationships (defined below)
--
-- NOTE: tag_stats and tag_cooccurrence tables are created at runtime by build-tag-stats.mjs,
-- not defined in this schema file.

-- Core artist table (discovery essentials only)
CREATE TABLE IF NOT EXISTS artists (
  id INTEGER PRIMARY KEY,
  mbid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT,
  type TEXT,            -- 'Person', 'Group', 'Orchestra', etc.
  country TEXT,
  begin_year INTEGER,
  ended INTEGER DEFAULT 0
);

-- Community tags with vote counts (the style map data)
CREATE TABLE IF NOT EXISTS artist_tags (
  artist_id INTEGER NOT NULL REFERENCES artists(id),
  tag TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (artist_id, tag)
);

-- Full-text search index (standalone — not synced to artists table)
CREATE VIRTUAL TABLE IF NOT EXISTS artists_fts USING fts5(
  name,
  tags,
  tokenize='porter unicode61'
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_artist_tags_artist ON artist_tags(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_tags_tag ON artist_tags(tag);
CREATE INDEX IF NOT EXISTS idx_artists_mbid ON artists(mbid);
CREATE INDEX IF NOT EXISTS idx_artists_slug ON artists(slug);

-- Phase G: Genre encyclopedia entities
CREATE TABLE IF NOT EXISTS genres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'genre',    -- 'genre' | 'scene' | 'city'
  wikidata_id TEXT,
  wikipedia_title TEXT,
  inception_year INTEGER,
  origin_city TEXT,
  origin_lat REAL,
  origin_lng REAL,
  mb_tag TEXT
);

-- Phase G: Genre parent/child + influenced-by relationships
CREATE TABLE IF NOT EXISTS genre_relationships (
  from_id INTEGER NOT NULL REFERENCES genres(id),
  to_id INTEGER NOT NULL REFERENCES genres(id),
  rel_type TEXT NOT NULL DEFAULT 'subgenre',   -- 'subgenre' | 'influenced_by' | 'scene_of'
  PRIMARY KEY (from_id, to_id, rel_type)
);

CREATE INDEX IF NOT EXISTS idx_genre_slug ON genres(slug);
CREATE INDEX IF NOT EXISTS idx_genre_mb_tag ON genres(mb_tag);
CREATE INDEX IF NOT EXISTS idx_genre_rel_from ON genre_relationships(from_id);
CREATE INDEX IF NOT EXISTS idx_genre_rel_to ON genre_relationships(to_id);

-- Phase 12: Curator attribution — tracks which bloggers first featured each artist
-- collection-add trigger: Tauri client calls /api/curator-feature?slug=[slug]&curator=[handle]&source=collection on artist add to public collection
CREATE TABLE IF NOT EXISTS curator_features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_mbid TEXT NOT NULL,
  curator_handle TEXT NOT NULL,
  featured_at INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'embed',
  UNIQUE(artist_mbid, curator_handle)
);
CREATE INDEX IF NOT EXISTS idx_cf_artist ON curator_features(artist_mbid);
CREATE INDEX IF NOT EXISTS idx_cf_curator ON curator_features(curator_handle);
