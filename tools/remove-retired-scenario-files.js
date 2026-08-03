'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const retiredFiles = [
  'styles/assessment-workspace.css',
  'styles/assessment-workspace.html',
  'styles/assessment-workspace.js',
  'vitals/assessment-workspace.css',
  'vitals/assessment-workspace.html',
  'vitals/assessment-workspace.js'
];

let removed = 0;
for (const relativePath of retiredFiles) {
  const absolutePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(absolutePath)) continue;
  fs.rmSync(absolutePath, { force: true });
  removed += 1;
  console.log(`Removed retired file: ${relativePath}`);
}

console.log(
  removed
    ? `Scenario cleanup complete: removed ${removed} retired file${removed === 1 ? '' : 's'}.`
    : 'Scenario cleanup complete: no retired files were present.'
);
