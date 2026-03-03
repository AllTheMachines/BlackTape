// MusicBrainz PostgreSQL COPY format column definitions.
// Slim version: only tables needed for the discovery index (artists + tags + country).

export const TABLES = {
  artist: [
    'id', 'gid', 'name', 'sort_name', 'begin_date_year', 'begin_date_month',
    'begin_date_day', 'end_date_year', 'end_date_month', 'end_date_day',
    'type', 'area', 'gender', 'comment', 'edits_pending', 'last_updated',
    'ended', 'begin_area', 'end_area'
  ],

  artist_type: [
    'id', 'name', 'parent', 'child_order', 'description', 'gid'
  ],

  area: [
    'id', 'gid', 'name', 'type', 'edits_pending', 'last_updated',
    'begin_date_year', 'begin_date_month', 'begin_date_day',
    'end_date_year', 'end_date_month', 'end_date_day', 'ended', 'comment'
  ],

  // Derived tables (from mbdump-derived.tar.bz2)
  artist_tag: [
    'artist', 'tag', 'count', 'last_updated'
  ],

  tag: [
    'id', 'name', 'ref_count'
  ],

  // MusicBrainz canonical genre list (~1,900 curated genres)
  genre: [
    'id', 'gid', 'name', 'comment', 'edits_pending', 'last_updated'
  ]
};

// Which archive each table comes from
export const TABLE_ARCHIVES = {
  'mbdump.tar.bz2': [
    'artist', 'artist_type', 'area', 'genre'
  ],
  'mbdump-derived.tar.bz2': [
    'artist_tag', 'tag'
  ]
};
