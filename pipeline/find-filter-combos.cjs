const Database = require('./node_modules/better-sqlite3');
const DB = 'C:/Users/User/AppData/Roaming/com.mercury.app/mercury.db';
const db = new Database(DB, { readonly: true });

// Check what country + tag combos have results
const checks = [
  { tags: ['doom metal'], country: 'Finland' },
  { tags: ['doom metal'], country: 'United States' },
  { tags: ['shoegaze'], country: 'Japan' },
  { tags: ['post-punk'], country: 'United Kingdom' },
  { tags: ['black metal'], country: 'Norway' },
  { tags: ['coldwave'], country: null },
  { tags: ['krautrock'], country: null },
  { tags: ['krautrock'], country: 'Germany' },
  { tags: ['experimental', 'ambient'], country: null },
  { tags: ['drone', 'metal'], country: null },
];

for (const { tags, country } of checks) {
  let q = `SELECT COUNT(DISTINCT a.id) as n FROM artists a JOIN artist_tags at ON a.id = at.artist_id`;
  let joins = '';
  let where = '';

  tags.forEach((tag, i) => {
    joins += ` JOIN artist_tags at${i} ON a.id = at${i}.artist_id AND at${i}.tag = ?`;
  });

  if (country) where = ` WHERE a.country LIKE ?`;

  const result = db.prepare(`SELECT COUNT(DISTINCT a.id) as n FROM artists a${joins}${where}`).get(
    ...tags, ...(country ? [`%${country}%`] : [])
  );
  console.log(`${tags.join('+')} ${country||''}: ${result.n} artists`);
}

// Find artists with the best "press-worthy" tags (not year numbers, not sentence fragments)
// Check quality tags on Skinfields
const skinfields = db.prepare(`SELECT tag FROM artist_tags WHERE artist_id = (SELECT id FROM artists WHERE slug = 'skinfields') ORDER BY count DESC`).all();
console.log('\nSkinfields tags:', skinfields.map(t => t.tag).join(', '));

const mugwart = db.prepare(`SELECT tag FROM artist_tags WHERE artist_id = (SELECT id FROM artists WHERE slug = 'mugwart') ORDER BY count DESC`).all();
console.log('\nMugwart tags:', mugwart.map(t => t.tag).join(', '));

const edisons = db.prepare(`SELECT tag FROM artist_tags WHERE artist_id = (SELECT id FROM artists WHERE slug = 'edison-s-children') ORDER BY count DESC`).all();
console.log('\nEdisons Children tags:', edisons.map(t => t.tag).join(', '));

const kllk = db.prepare(`SELECT tag FROM artist_tags WHERE artist_id = (SELECT id FROM artists WHERE slug = 'k-l-l-k') ORDER BY count DESC`).all();
console.log('\nK.L.L.K. tags:', kllk.map(t => t.tag).join(', '));

// Find artists with quality-looking tags and niche score (for Shot 12 - tag cloud)
const qualityTagged = db.prepare(`
  SELECT a.name, a.country, a.slug, COUNT(*) as tc,
    AVG(1.0 / ts.artist_count) * 1000 AS score
  FROM artists a
  JOIN artist_tags at ON a.id = at.artist_id
  JOIN tag_stats ts ON at.tag = ts.tag
  WHERE a.id IN (
    SELECT artist_id FROM artist_tags
    WHERE tag IN ('krautrock','kosmische musik','motorik','coldwave','darkwave','noise rock','post-punk','industrial','post-rock','drone','shoegaze','black metal','doom metal','progressive rock','art rock','ambient','experimental')
  )
  GROUP BY a.id
  HAVING tc >= 12 AND score >= 8
  ORDER BY tc DESC
  LIMIT 15
`).all();
console.log('\nQuality genre artists (12+ tags, niche score):');
qualityTagged.forEach(r => {
  const tags = db.prepare(`SELECT tag FROM artist_tags WHERE artist_id = (SELECT id FROM artists WHERE name = ?) ORDER BY count DESC LIMIT 15`).all(r.name);
  console.log(`  ${r.name} (${r.country||'?'}) tags=${r.tc} score=${r.score.toFixed(0)} slug=${r.slug}`);
  console.log(`    ${tags.map(t=>t.tag).join(', ')}`);
});

db.close();
