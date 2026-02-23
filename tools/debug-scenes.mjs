import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Database = require('../pipeline/node_modules/better-sqlite3');

const TASTE_DB = 'C:/Users/User/AppData/Roaming/com.mercury.app/taste.db';
const MERC_DB = 'C:/Users/User/AppData/Roaming/com.mercury.app/mercury.db';

const taste = new Database(TASTE_DB, { readonly: true });
const favorites = taste.prepare('SELECT artist_mbid, artist_name FROM favorite_artists').all();
taste.close();

console.log(`\n=== Favorites (${favorites.length}) ===`);
favorites.forEach(f => console.log(' -', f.artist_name, f.artist_mbid));

const merc = new Database(MERC_DB, { readonly: true });

console.log('\n=== Tag co-occurrence stats ===');
const coocCount = merc.prepare('SELECT COUNT(*) as n FROM tag_cooccurrence').get();
const tagStatsCount = merc.prepare('SELECT COUNT(*) as n FROM tag_stats').get();
console.log(' tag_cooccurrence rows:', coocCount.n);
console.log(' tag_stats rows:', tagStatsCount.n);
console.log(' Sample cooc pairs:');
merc.prepare('SELECT tag_a, tag_b, shared_artists FROM tag_cooccurrence LIMIT 5').all()
  .forEach(r => console.log(`   ${r.tag_a} + ${r.tag_b} = ${r.shared_artists} shared`));

console.log('\n=== Favorites in mercury.db ===');
let inMercury = 0;
for (const fav of favorites) {
  const artist = merc.prepare('SELECT id, name FROM artists WHERE mbid = ?').get(fav.artist_mbid);
  if (!artist) {
    console.log(` ${fav.artist_name} — NOT FOUND in mercury.db`);
    continue;
  }
  inMercury++;
  const tags = merc.prepare('SELECT tag, count FROM artist_tags WHERE artist_id = ? ORDER BY count DESC LIMIT 8').all(artist.id);
  const coocTags = tags.filter(t => {
    const r = merc.prepare('SELECT COUNT(*) as n FROM tag_cooccurrence WHERE tag_a = ? OR tag_b = ?').get(t.tag, t.tag);
    return r.n > 0;
  });
  console.log(` ${fav.artist_name} — all tags: [${tags.map(t => t.tag).join(', ')}]`);
  console.log(`   in cooc: [${coocTags.map(t => t.tag).join(', ')}]`);
}
console.log(`\n${inMercury}/${favorites.length} favorites found in mercury.db`);

merc.close();
