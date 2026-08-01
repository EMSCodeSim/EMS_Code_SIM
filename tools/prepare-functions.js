'use strict';

const fs = require('fs');
const path = require('path');
const { normalize, isRetiredPath } = require('./deployment-policy');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'netlify', 'functions');
const out = path.join(root, 'netlify-functions-dist');
let copied = 0;

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

function copyActiveFunctions(directory, relativeBase = '') {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relativeFromFunctions = normalize(relativeBase ? `${relativeBase}/${entry.name}` : entry.name);
    const projectRelative = normalize(`netlify/functions/${relativeFromFunctions}`);
    if (isRetiredPath(projectRelative)) continue;

    const sourcePath = path.join(directory, entry.name);
    const destinationPath = path.join(out, relativeFromFunctions);
    if (entry.isDirectory()) {
      copyActiveFunctions(sourcePath, relativeFromFunctions);
      continue;
    }

    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.copyFileSync(sourcePath, destinationPath);
    copied += 1;
  }
}

copyActiveFunctions(source);

if (copied === 0) fs.writeFileSync(path.join(out, '.gitkeep'), '');

if (fs.existsSync(path.join(out, 'gpt4-turbo.js'))) {
  throw new Error('Retired GPT endpoint entered the clean functions staging directory.');
}

console.log(`Prepared ${copied} active Netlify function file${copied === 1 ? '' : 's'} in netlify-functions-dist.`);
