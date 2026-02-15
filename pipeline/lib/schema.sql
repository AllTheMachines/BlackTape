-- Mercury discovery index schema
-- Slim: artists + tags + country. That's the style map.
-- Everything else (releases, URLs, bios) is fetched live from the internet.

-- Core artist table (discovery essentials only)
CREATE TABLE IF NOT EXISTS artists (
  id INTEGER PRIMARY KEY,
  mbid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
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
