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

console.log(`Scenario image asset check passed for ${urls.size} configured images across ${sources.length} scenario sources.`);
