const Database = require('./node_modules/better-sqlite3');
const db = new Database('./data/mercury.db', { readonly: true });
const artists = db.prepare('SELECT COUNT(*) as n FROM artists').get();
const tags = db.prepare('SELECT COUNT(*) as n FROM artist_tags').get();
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name).join(', '));
console.log('Artists:', artists.n, '| Tag entries:', tags.n);

const cols = db.prepare('PRAGMA table_info(artists)').all();
console.log('Artist columns:', cols.map(c => c.name).join(', '));

const tagCols = db.prepare('PRAGMA table_info(artist_tags)').all();
console.log('artist_tags columns:', tagCols.map(c => c.name).join(', '));

// Top tagged artists
const top = db.prepare(`
  SELECT a.name, a.country, COUNT(*) as cnt
  FROM artists a JOIN artist_tags at ON a.id = at.artist_id
  GROUP BY a.id ORDER BY cnt DESC LIMIT 20
`).all();
console.log('\nTop tagged artists:');
top.forEach(r => console.log(`  ${r.name} (${r.country||'?'}) — ${r.cnt} tags`));

// Niche artists
const niche = db.prepare(`
  SELECT DISTINCT a.name, a.country, COUNT(*) as cnt
  FROM artists a JOIN artist_tags at ON a.id = at.artist_id
  WHERE a.id IN (
    SELECT artist_id FROM artist_tags
    WHERE tag IN ('doom metal','shoegaze','post-punk','krautrock','noise rock','lo-fi','drone','dark ambient','industrial','black metal','post-rock')
  )
  GROUP BY a.id ORDER BY cnt DESC LIMIT 15
`).all();
console.log('\nNiche artists:');
niche.forEach(r => console.log(`  ${r.name} (${r.country||'?'}) — ${r.cnt} tags`));

// Available tags
const topTags = db.prepare('SELECT tag, COUNT(*) as n FROM artist_tags GROUP BY tag ORDER BY n DESC LIMIT 30').all();
console.log('\nTop tags:', topTags.map(t => `${t.tag}(${t.n})`).join(', '));

db.close();
