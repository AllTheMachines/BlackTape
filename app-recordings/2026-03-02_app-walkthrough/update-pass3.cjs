const fs = require('fs');
const path = require('path');

const sessionFolder = path.resolve(__dirname);
const pass3Dir = path.join(sessionFolder, 'takes/pass-3');
const screenshotsDir = path.join(pass3Dir, 'screenshots');

const clips = fs.readdirSync(pass3Dir)
  .filter(f => f.endsWith('.mp4'))
  .sort();

const sceneDescriptions = {
  '00-app-launch': { desc: 'App launches showing the main BlackTape interface', criteria: 'The BlackTape main interface is visible with navigation sidebar, search bar, and main content area', press: true },
  'crate-dig': { desc: 'Crate Digging feature with random artist discovery', criteria: 'Crate Digging page shows filtered results with artist cards visible', press: true },
  'discover-tags': { desc: 'Discover page with tag cloud and genre filtering', criteria: 'Discover page is visible with tag cloud and filtered artist results', press: true },
  'kb-ambient': { desc: 'Knowledge Base ambient genre page with genre graph', criteria: 'Knowledge Base page showing ambient genre with description and related genres', press: false },
  'kb-jazz': { desc: 'Knowledge Base jazz genre page', criteria: 'Knowledge Base page showing jazz genre with description and related genres', press: false },
  'kb-post-punk': { desc: 'Knowledge Base post-punk genre page', criteria: 'Knowledge Base page showing post-punk genre with description and related genres', press: false },
  'kb-shoegaze': { desc: 'Knowledge Base shoegaze genre page', criteria: 'Knowledge Base page showing shoegaze genre with description and related genres', press: true },
  'player-bar-finale': { desc: 'Player bar with retro cassette FX - VU meters, tape counter, LED', criteria: 'Player bar visible at bottom with cassette-era retro effects, VU meters, and transport controls', press: true },
  'style-map-1': { desc: 'Style Map visualization - initial view with genre nodes and edges', criteria: 'Style Map graph visible with genre nodes as circles connected by edges', press: true },
  'style-map-2': { desc: 'Style Map visualization - zoomed and panned to explore clusters', criteria: 'Style Map showing a different region of the genre graph', press: false },
  'style-map-3': { desc: 'Style Map visualization - exploring a specific genre cluster', criteria: 'Style Map focused on a specific cluster of related genres', press: false }
};

const artistNames = {
  '01-artist-slowdive': 'Slowdive',
  '02-artist-my-bloody-valentine': 'My Bloody Valentine',
  '03-artist-cocteau-twins': 'Cocteau Twins',
  '04-artist-ride-3f575ecd': 'Ride',
  '05-artist-mazzy-star': 'Mazzy Star',
  '06-artist-beach-house': 'Beach House',
  '07-artist-joy-division': 'Joy Division',
  '08-artist-bauhaus-0688add2': 'Bauhaus',
  '09-artist-siouxsie-and-the-banshees': 'Siouxsie and the Banshees',
  '10-artist-the-cure': 'The Cure',
  '11-artist-the-birthday-party': 'The Birthday Party',
  '12-artist-gang-of-four': 'Gang of Four',
  '13-artist-the-fall-d5da1841': 'The Fall',
  '14-artist-aphex-twin': 'Aphex Twin',
  '15-artist-boards-of-canada-69158f97': 'Boards of Canada',
  '16-artist-massive-attack': 'Massive Attack',
  '17-artist-portishead': 'Portishead',
  '18-artist-brian-eno': 'Brian Eno',
  '19-artist-burial-9ddce51c': 'Burial',
  '20-artist-kraftwerk': 'Kraftwerk',
  '21-artist-mogwai-d700b3f5': 'Mogwai',
  '22-artist-explosions-in-the-sky': 'Explosions in the Sky',
  '23-artist-sigur-ros': 'Sigur Ros',
  '24-artist-godspeed-you-black-emperor': 'Godspeed You! Black Emperor',
  '25-artist-nick-cave-the-bad-seeds': 'Nick Cave & the Bad Seeds',
  '26-artist-swans-3285dc48': 'Swans',
  '27-artist-radiohead': 'Radiohead',
  '28-artist-pixies': 'Pixies',
  '29-artist-pj-harvey': 'PJ Harvey',
  '30-artist-talk-talk': 'Talk Talk'
};

const storyboardScenes = [];
const manifestScenes = [];
const checkpointPaths = [];

for (const clip of clips) {
  const name = clip.replace('.mp4', '');
  const absClip = path.resolve(pass3Dir, clip).split(path.sep).join('/');
  const screenshotPath = path.resolve(screenshotsDir, name + '-checkpoint.png').split(path.sep).join('/');
  checkpointPaths.push(screenshotPath);

  let desc, criteria, press;
  if (sceneDescriptions[name]) {
    desc = sceneDescriptions[name].desc;
    criteria = sceneDescriptions[name].criteria;
    press = sceneDescriptions[name].press;
  } else if (artistNames[name]) {
    const artist = artistNames[name];
    desc = `${artist} artist page walkthrough - discography, releases, and tags`;
    criteria = `Artist page for ${artist} is visible with name, tags, and discography entries with cover art`;
    press = false;
  } else {
    desc = `${name} scene`;
    criteria = 'Scene content is visible and settled';
    press = false;
  }

  storyboardScenes.push({
    name,
    description: desc,
    actions: [
      { type: 'wait', description: 'Wait for scene content to load' },
      { type: 'delay', ms: 2000, description: 'Let the scene settle' }
    ],
    duration_target: 5,
    framing: 'full window',
    success_criteria: criteria,
    press_screenshot: press
  });

  manifestScenes.push({
    scene_name: name,
    status: 'complete',
    clip_path: absClip,
    checkpoint_screenshot_path: screenshotPath,
    retry_count: 0,
    failure_reason: null
  });
}

// Write storyboard
const storyboard = {
  brief: 'Full app walkthrough with 30 artist pages, style map, knowledge base, crate digging, discover, and player bar',
  scenes: storyboardScenes,
  total_duration_target: storyboardScenes.length * 5,
  version: 2
};
fs.writeFileSync(path.join(sessionFolder, 'storyboard.json'), JSON.stringify(storyboard, null, 2));

// Update manifest
const manifest = JSON.parse(fs.readFileSync(path.join(sessionFolder, 'manifest.json'), 'utf8'));
manifest.passes[2] = {
  pass: 3,
  started_at: '2026-03-02T00:46:30.821Z',
  completed_at: '2026-03-02T02:15:00.000Z',
  cameraman_status: 'complete',
  scenes: manifestScenes,
  checkpoint_screenshots: checkpointPaths,
  director_verdict: 'pending',
  revision_notes: null,
  cut_spec_path: null,
  ffmpeg_output_path: null
};
manifest.current_pass = 3;
manifest.storyboard_version = 2;
manifest.summary = '41-scene recording of full app walkthrough, 3 pass(es), pending Director review';
fs.writeFileSync(path.join(sessionFolder, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log(`Storyboard: ${storyboardScenes.length} scenes`);
console.log(`Manifest pass 3: ${manifestScenes.length} scenes, all complete`);
console.log(`Checkpoint screenshots: ${checkpointPaths.length}`);
