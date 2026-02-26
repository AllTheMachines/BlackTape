const Database = require('./pipeline/node_modules/better-sqlite3');
const db = new Database('./pipeline/data/mercury.db', { readonly: true });

const artists = db.prepare('SELECT COUNT(*) as n FROM artists').get();
const tags = db.prepare('SELECT COUNT(*) as n FROM artist_tags').get();
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name).join(', '));
console.log('Artists:', artists.n, '| Tag entries:', tags.n);

const cols = db.prepare('PRAGMA table_info(artists)').all();
console.log('Artist columns:', cols.map(c => c.name).join(', '));

const tagCols = db.prepare('PRAGMA table_info(artist_tags)').all();
console.log('artist_tags columns:', tagCols.map(c => c.name).join(', '));

// Artists with most tags
const topTagged = db.prepare(`
  SELECT a.name, a.country, a.mbid, COUNT(at.tag) as tag_count
  FROM artists a
  JOIN artist_tags at ON a.id = at.artist_id
  GROUP BY a.id
  ORDER BY tag_count DESC
  LIMIT 20
`).all();
console.log('\nTop tagged artists:');
topTagged.forEach(r => console.log(`  ${r.name} (${r.country}) — ${r.tag_count} tags`));

// Artists with interesting doom/metal/shoegaze/post-punk tags
const niche = db.prepare(`
  SELECT DISTINCT a.name, a.country, COUNT(at.tag) as tag_count
  FROM artists a
  JOIN artist_tags at ON a.id = at.artist_id
  WHERE a.id IN (
    SELECT artist_id FROM artist_tags WHERE tag IN ('doom metal', 'shoegaze', 'post-punk', 'krautrock', 'noise rock', 'lo-fi', 'cassette culture', 'drone', 'dark ambient')
  )
  GROUP BY a.id
  ORDER BY tag_count DESC
  LIMIT 15
`).all();
console.log('\nNiche artists (doom/shoegaze/post-punk/krautrock etc):');
niche.forEach(r => console.log(`  ${r.name} (${r.country}) — ${r.tag_count} tags`));

db.close();
