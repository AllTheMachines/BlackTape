const Database = require('./node_modules/better-sqlite3');
const DB = 'C:/Users/User/AppData/Roaming/com.mercury.app/mercury.db';
const db = new Database(DB, { readonly: true });

// Compute uniqueness score the same way the app does
// score = AVG(1.0 / tag_artist_count) * 1000
const niche = db.prepare(`
  SELECT
    a.name, a.country, a.slug,
    COUNT(at.tag) as tag_count,
    AVG(1.0 / ts.artist_count) * 1000 AS uniqueness_score
  FROM artists a
  JOIN artist_tags at ON a.id = at.artist_id
  JOIN tag_stats ts ON at.tag = ts.tag
  WHERE ts.artist_count > 0
  GROUP BY a.id
  HAVING tag_count >= 10
  ORDER BY uniqueness_score DESC
  LIMIT 30
`).all();
console.log('\n=== Very Niche artists (score >=100, 10+ tags) ===');
niche.filter(r => r.uniqueness_score >= 100).forEach(r => {
  console.log(`  ${r.name} (${r.country||'?'}) score=${r.uniqueness_score.toFixed(1)} tags=${r.tag_count} slug=${r.slug}`);
});
console.log('\n=== Niche artists (score 8-100, 10+ tags) ===');
niche.filter(r => r.uniqueness_score >= 8 && r.uniqueness_score < 100).forEach(r => {
  console.log(`  ${r.name} (${r.country||'?'}) score=${r.uniqueness_score.toFixed(1)} tags=${r.tag_count} slug=${r.slug}`);
});

// Find good shoegaze/post-punk/doom artists with NICHE badge
const genreNiche = db.prepare(`
  SELECT
    a.name, a.country, a.slug,
    COUNT(at.tag) as tag_count,
    AVG(1.0 / ts.artist_count) * 1000 AS uniqueness_score,
    GROUP_CONCAT(at.tag, ', ') as tags
  FROM artists a
  JOIN artist_tags at ON a.id = at.artist_id
  JOIN tag_stats ts ON at.tag = ts.tag
  WHERE ts.artist_count > 0
    AND a.id IN (
      SELECT artist_id FROM artist_tags
      WHERE tag IN ('doom metal','shoegaze','post-punk','krautrock','noise rock','noise pop','dark ambient','industrial','coldwave','darkwave','ethereal wave','post-rock','drone','sludge metal')
    )
  GROUP BY a.id
  HAVING tag_count >= 8 AND uniqueness_score >= 8
  ORDER BY uniqueness_score DESC
  LIMIT 20
`).all();
console.log('\n=== Niche/Very Niche genre artists (8+ tags, niche score) ===');
genreNiche.forEach(r => {
  const badge = r.uniqueness_score >= 100 ? 'VERY NICHE' : 'NICHE';
  console.log(`  [${badge}] ${r.name} (${r.country||'?'}) score=${r.uniqueness_score.toFixed(1)} tags=${r.tag_count} slug=${r.slug}`);
  console.log(`         tags: ${r.tags.substring(0,100)}`);
});

// Finnish metal / Japan / obscure country combos
const finland = db.prepare(`
  SELECT a.name, a.country, a.slug, COUNT(*) as tc
  FROM artists a JOIN artist_tags at ON a.id = at.artist_id
  WHERE a.country LIKE '%Finland%' OR a.country LIKE '%Fin%' OR a.id IN (
    SELECT artist_id FROM artist_tags WHERE tag IN ('finnish','finland')
  )
  GROUP BY a.id ORDER BY tc DESC LIMIT 10
`).all();
console.log('\nFinnish artists:');
finland.forEach(r => console.log(`  ${r.name} (${r.country||'?'}) tags=${r.tc} slug=${r.slug}`));

const japan = db.prepare(`
  SELECT a.name, a.country, a.slug, COUNT(*) as tc
  FROM artists a JOIN artist_tags at ON a.id = at.artist_id
  WHERE a.country LIKE '%Japan%' OR a.id IN (
    SELECT artist_id FROM artist_tags WHERE tag IN ('japanese','japan')
  )
  GROUP BY a.id ORDER BY tc DESC LIMIT 10
`).all();
console.log('\nJapanese artists:');
japan.forEach(r => console.log(`  ${r.name} (${r.country||'?'}) tags=${r.tc} slug=${r.slug}`));

db.close();
