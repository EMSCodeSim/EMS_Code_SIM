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

for (const retired of [...RETIRED_FILES, ...RETIRED_DIRECTORIES]) {
  if (fs.existsSync(path.join(out, retired))) throw new Error(`Retired path was copied into deployment: ${retired}`);
}

for (const sourceOnly of ['tools', 'tests', 'docs/updates', 'netlify', 'netlify-functions-dist', 'package.json', 'netlify.toml']) {
  if (fs.existsSync(path.join(out, sourceOnly))) throw new Error(`Source-only path was copied into deployment: ${sourceOnly}`);
}

console.log(`Built dist with ${copied} files (${(bytes / 1024 / 1024).toFixed(1)} MB).`);
