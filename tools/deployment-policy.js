'use strict';

const path = require('path');

const RETIRED_FILES = Object.freeze([
  'generate_gpt_readme.js',
  'netlify/functions/gpt4-turbo.js',
  'scripts/app.js',
  'scripts/checklist.js',
  'scripts/grading.js',
  'scripts/handoff_inline.js',
  'scripts/mic.js',
  'scripts/router.js',
  'scenarios/chest_pain_002/chat_log.json',
  'scenarios/chest_pain_002/config.json',
  'scenarios/chest_pain_002/dispatch.txt',
  'scenarios/chest_pain_002/ems_database_part1.json',
  'scenarios/chest_pain_002/ems_database_part2.json',
  'scenarios/chest_pain_002/ems_database_part3.json',
  'scenarios/chest_pain_002/patient.txt'
]);

const RETIRED_DIRECTORIES = Object.freeze([
  'legacy-medical-simulator'
]);

const SOURCE_ONLY_DIRECTORIES = Object.freeze([
  '.git',
  '.netlify',
  'node_modules',
  'dist',
  'tools',
  'tests',
  'test-results',
  'playwright-report',
  'docs/updates',
  'netlify',
  'netlify-functions-dist'
]);

const SOURCE_ONLY_ROOT_FILES = new Set([
  '.gitignore',
  'package.json',
  'package-lock.json',
  'netlify.toml',
  'playwright.config.js',
  'DELETE_THESE_RETIRED_FILES.txt',
  'FILES_TO_DELETE.txt'
]);

function normalize(relativePath) {
  return String(relativePath || '')
    .split(path.sep)
    .join('/')
    .replace(/^\.\//, '')
    .replace(/^\/+|\/+$/g, '');
}

function isWithin(relativePath, directory) {
  const relative = normalize(relativePath);
  const parent = normalize(directory);
  return relative === parent || relative.startsWith(`${parent}/`);
}

function isRetiredPath(relativePath) {
  const relative = normalize(relativePath);
  return RETIRED_FILES.includes(relative) || RETIRED_DIRECTORIES.some(directory => isWithin(relative, directory));
}

function isSourceOnlyDirectory(relativePath) {
  const relative = normalize(relativePath);
  return SOURCE_ONLY_DIRECTORIES.some(directory => isWithin(relative, directory));
}

function isInternalRootDocument(relativePath) {
  const relative = normalize(relativePath);
  if (relative.includes('/')) return false;
  if (/\.(?:md|zip)$/i.test(relative)) return true;
  if (/^(?:INSTALL|INSTALLATION|NEXT_UPDATE|UPDATE|RECOMMENDED_UPDATE|SUGGESTED_CHANGES)/i.test(relative) && /\.txt$/i.test(relative)) return true;
  if (/(?:README|MANIFEST|UPDATE_FILES|CHANGED_FILES|FILE_MANIFEST|FILES_TO_DELETE)/i.test(relative) && /\.txt$/i.test(relative)) return true;
  return false;
}

function shouldExcludeFromPublic(relativePath) {
  const relative = normalize(relativePath);
  if (!relative) return false;
  if (isRetiredPath(relative) || isSourceOnlyDirectory(relative)) return true;
  if (!relative.includes('/') && SOURCE_ONLY_ROOT_FILES.has(relative)) return true;
  return isInternalRootDocument(relative);
}

module.exports = {
  RETIRED_FILES,
  RETIRED_DIRECTORIES,
  SOURCE_ONLY_DIRECTORIES,
  SOURCE_ONLY_ROOT_FILES,
  normalize,
  isWithin,
  isRetiredPath,
  isSourceOnlyDirectory,
  isInternalRootDocument,
  shouldExcludeFromPublic
};
