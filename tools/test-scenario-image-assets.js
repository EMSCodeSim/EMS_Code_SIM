const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sources = [
  'vitals/scenario-definitions.js',
  'vitals/scenario-launcher.js',
  'vitals/scenario-learning-upgrade.js'
];

const urls = new Set();
for (const relative of sources) {
  const sourcePath = path.join(root, relative);
  if (!fs.existsSync(sourcePath)) throw new Error(`Scenario image source is missing: ${relative}`);
  const source = fs.readFileSync(sourcePath, 'utf8');
  for (const match of source.matchAll(/(?:image|src)\s*:\s*['"]([^'"]+\.(?:png|jpe?g|webp|svg))['"]/gi)) {
    urls.add(match[1]);
  }
}

if (!urls.size) throw new Error('No scenario image paths found.');

const missing = [];
const empty = [];
for (const url of urls) {
  if (!url.startsWith('/')) continue;
  const filePath = path.join(root, url.replace(/^\//, ''));
  if (!fs.existsSync(filePath)) {
    missing.push(url);
    continue;
  }
  if (fs.statSync(filePath).size === 0) empty.push(url);
}

if (missing.length) {
  throw new Error(`Scenario image assets are missing:\n${missing.map(x => `- ${x}`).join('\n')}`);
}
if (empty.length) {
  throw new Error(`Scenario image assets are empty:\n${empty.map(x => `- ${x}`).join('\n')}`);
}

for (const required of [
  '/vitals/assets/horse-crush/patient-initial.webp',
  '/vitals/assets/scenario-asthma-learning.svg',
  '/vitals/assets/scenario-stroke-learning.svg',
  '/vitals/assets/scenario-hypoglycemia-learning.svg'
]) {
  if (!urls.has(required)) throw new Error(`Finished learning scenario does not reference required artwork: ${required}`);
}

// Horse-crush focused exams use template-built asset URLs, so the generic
// literal-URL scan above cannot see them. Validate every photo used by the
// scenario explicitly and require the scenario runtime to reference each one.
const horseScenarioPath = path.join(root, 'vitals/horse-crush-scenario.js');
const horseScenario = fs.readFileSync(horseScenarioPath, 'utf8');
const horseAssets = [
  'map-arrival.webp',
  'patient-initial.webp',
  'exam-neck-back.webp',
  'exam-chest.webp',
  'exam-abdomen.webp',
  'exam-pelvis.webp',
  'exam-leg.webp',
  'movement-blankets.webp',
  'movement-scoop.webp'
];
for (const filename of horseAssets) {
  if (!horseScenario.includes(filename)) {
    throw new Error(`Horse scenario no longer references required photo: ${filename}`);
  }
  const filePath = path.join(root, 'vitals/assets/horse-crush', filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Horse scenario photo is missing: /vitals/assets/horse-crush/${filename}`);
  }
  if (fs.statSync(filePath).size === 0) {
    throw new Error(`Horse scenario photo is empty: /vitals/assets/horse-crush/${filename}`);
  }
}

console.log(`Scenario image asset check passed for ${urls.size} configured images across ${sources.length} scenario sources plus ${horseAssets.length} horse-crush photos.`);
