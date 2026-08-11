'use strict';

const fs = require('fs');
const path = require('path');
const {
  RETIRED_FILES,
  RETIRED_DIRECTORIES,
  normalize,
  shouldExcludeFromPublic
} = require('./deployment-policy');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
let copied = 0;
let bytes = 0;

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

function copyDir(source, destination, relativeBase = '') {
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const relative = normalize(relativeBase ? `${relativeBase}/${entry.name}` : entry.name);
    if (shouldExcludeFromPublic(relative)) continue;

    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destinationPath, { recursive: true });
      copyDir(sourcePath, destinationPath, relative);
      if (fs.existsSync(destinationPath) && fs.readdirSync(destinationPath).length === 0) {
        fs.rmdirSync(destinationPath);
      }
      continue;
    }

    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.copyFileSync(sourcePath, destinationPath);
    const size = fs.statSync(sourcePath).size;
    copied += 1;
    bytes += size;
  }
}

copyDir(root, out);

for (const required of ['index.html', '_redirects', 'robots.txt', 'sitemap.xml', 'offline-reference-sw.js', 'emt-prep-module2.js']) {
  if (!fs.existsSync(path.join(out, required))) throw new Error(`Build missing required file: ${required}`);
}

const requiredScenarioImages = [
  'vitals/assets/scenario-patient-adult-v3.png',
  'vitals/assets/scenario-patient-pediatric-v3.png',
  'vitals/assets/scenario-patient-horse-crush.webp',
  'vitals/assets/horse-crush/patient-initial.webp',
  'vitals/assets/scenario-asthma-learning.svg',
  'vitals/assets/scenario-stroke-learning.svg',
  'vitals/assets/scenario-hypoglycemia-learning.svg'
];
for (const relative of requiredScenarioImages) {
  const builtPath = path.join(out, relative);
  if (!fs.existsSync(builtPath)) throw new Error(`Build missing scenario image asset: ${relative}`);
  if (fs.statSync(builtPath).size === 0) throw new Error(`Build produced empty scenario image asset: ${relative}`);
}

for (const retired of [...RETIRED_FILES, ...RETIRED_DIRECTORIES]) {
  if (fs.existsSync(path.join(out, retired))) throw new Error(`Retired path was copied into deployment: ${retired}`);
}

for (const sourceOnly of ['tools', 'tests', 'docs/updates', 'netlify', 'netlify-functions-dist', 'package.json', 'netlify.toml']) {
  if (fs.existsSync(path.join(out, sourceOnly))) throw new Error(`Source-only path was copied into deployment: ${sourceOnly}`);
}

// Netlify exposes COMMIT_REF/DEPLOY_ID/CONTEXT during production builds. Publishing
// those values gives us a no-guessing way to prove exactly which commit is live.
// Local/CI builds still generate the file with explicit local fallbacks.
const buildInfo = {
  app: 'EMSCodeSim',
  commit: process.env.COMMIT_REF || process.env.GITHUB_SHA || 'local',
  deployId: process.env.DEPLOY_ID || null,
  context: process.env.CONTEXT || process.env.DEPLOY_CONTEXT || 'local',
  branch: process.env.BRANCH || process.env.HEAD || process.env.GITHUB_REF_NAME || 'local',
  builtAt: new Date().toISOString()
};
fs.writeFileSync(path.join(out, 'build-info.json'), `${JSON.stringify(buildInfo, null, 2)}\n`, 'utf8');
copied += 1;
bytes += fs.statSync(path.join(out, 'build-info.json')).size;

console.log(`Build provenance: ${buildInfo.commit} (${buildInfo.context}/${buildInfo.branch}).`);
console.log(`Verified ${requiredScenarioImages.length} required scenario patient images in dist.`);
console.log(`Built dist with ${copied} files (${(bytes / 1024 / 1024).toFixed(1)} MB).`);