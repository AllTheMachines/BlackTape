const Database = require('./node_modules/better-sqlite3');
const DB = 'C:/Users/User/AppData/Roaming/com.mercury.app/mercury.db';
const db = new Database(DB, { readonly: true });

const artists = db.prepare('SELECT COUNT(*) as n FROM artists').get();
const tags = db.prepare('SELECT COUNT(*) as n FROM artist_tags').get();
const tagged = db.prepare('SELECT COUNT(DISTINCT artist_id) as n FROM artist_tags').get();
console.log(`Artists: ${artists.n} | Tagged artists: ${tagged.n} | Tag entries: ${tags.n}`);

// Columns
const cols = db.prepare('PRAGMA table_info(artists)').all().map(c => c.name);
console.log('Artist cols:', cols.join(', '));

// Top tags
const topTags = db.prepare('SELECT tag, artist_count FROM tag_stats ORDER BY artist_count DESC LIMIT 30').all();
console.log('\nTop tags:', topTags.map(t => `${t.tag}(${t.artist_count})`).join(', '));

// Artists with doom metal
const doom = db.prepare(`
  SELECT a.name, a.country, a.slug, COUNT(*) as tag_count
  FROM artists a JOIN artist_tags at ON a.id = at.artist_id
  WHERE a.id IN (SELECT artist_id FROM artist_tags WHERE tag = 'doom metal')
  GROUP BY a.id ORDER BY tag_count DESC LIMIT 10
`).all();
console.log('\nDoom metal artists (most tags first):');
doom.forEach(r => console.log(`  ${r.name} (${r.country||'?'}) slug=${r.slug} tags=${r.tag_count}`));

// Artists with shoegaze + many tags
const shoegaze = db.prepare(`
  SELECT a.name, a.country, a.slug, COUNT(*) as tag_count
  FROM artists a JOIN artist_tags at ON a.id = at.artist_id
  WHERE a.id IN (SELECT artist_id FROM artist_tags WHERE tag = 'shoegaze')
  GROUP BY a.id ORDER BY tag_count DESC LIMIT 10
`).all();
console.log('\nShoegaze artists:');
shoegaze.forEach(r => console.log(`  ${r.name} (${r.country||'?'}) slug=${r.slug} tags=${r.tag_count}`));

// Artists with post-punk + UK
const postpunk = db.prepare(`
  SELECT a.name, a.country, a.slug, COUNT(*) as tag_count
  FROM artists a JOIN artist_tags at ON a.id = at.artist_id
  WHERE a.id IN (
    SELECT artist_id FROM artist_tags WHERE tag = 'post-punk'
    INTERSECT
    SELECT artist_id FROM artist_tags WHERE tag IN ('united kingdom','uk')
  )
  GROUP BY a.id ORDER BY tag_count DESC LIMIT 10
`).all();
console.log('\nPost-punk UK artists:');
postpunk.forEach(r => console.log(`  ${r.name} (${r.country||'?'}) slug=${r.slug} tags=${r.tag_count}`));

// Artists with most tags (for tag cloud shot)
const mostTags = db.prepare(`
  SELECT a.name, a.country, a.slug, COUNT(*) as tag_count
  FROM artists a JOIN artist_tags at ON a.id = at.artist_id
  GROUP BY a.id ORDER BY tag_count DESC LIMIT 15
`).all();
console.log('\nArtists with most tags:');
mostTags.forEach(r => console.log(`  ${r.name} (${r.country||'?'}) slug=${r.slug} tags=${r.tag_count}`));

// Krautrock artists
const kraut = db.prepare(`
  SELECT a.name, a.country, a.slug, COUNT(*) as tag_count
  FROM artists a JOIN artist_tags at ON a.id = at.artist_id
  WHERE a.id IN (SELECT artist_id FROM artist_tags WHERE tag = 'krautrock')
  GROUP BY a.id ORDER BY tag_count DESC LIMIT 10
`).all();
console.log('\nKrautrock artists:');
kraut.forEach(r => console.log(`  ${r.name} (${r.country||'?'}) slug=${r.slug} tags=${r.tag_count}`));

// Industrial + electronic
const industrial = db.prepare(`
  SELECT a.name, a.country, a.slug, COUNT(*) as tag_count
  FROM artists a JOIN artist_tags at ON a.id = at.artist_id
  WHERE a.id IN (
    SELECT artist_id FROM artist_tags WHERE tag = 'industrial'
    INTERSECT
    SELECT artist_id FROM artist_tags WHERE tag = 'electronic'
  )
  GROUP BY a.id ORDER BY tag_count DESC LIMIT 10
`).all();
console.log('\nIndustrial + electronic artists:');
industrial.forEach(r => console.log(`  ${r.name} (${r.country||'?'}) slug=${r.slug} tags=${r.tag_count}`));

db.close();
