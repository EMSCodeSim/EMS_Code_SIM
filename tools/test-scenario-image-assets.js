const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const definitionsPath = path.join(root, 'vitals', 'scenario-definitions.js');
const source = fs.readFileSync(definitionsPath, 'utf8');

const matches = [...source.matchAll(/image:\s*['"]([^'"]+)['"]/g)];
if (!matches.length) throw new Error('No scenario image paths found.');

const missing = [];
for (const match of matches) {
  const url = match[1];
  if (!url.startsWith('/')) continue;
  const filePath = path.join(root, url.replace(/^\//, ''));
  if (!fs.existsSync(filePath)) missing.push(url);
}

if (missing.length) {
  throw new Error(`Scenario image assets are missing:\n${missing.map(x => `- ${x}`).join('\n')}`);
}
console.log(`Scenario image asset check passed for ${matches.length} configured images.`);
