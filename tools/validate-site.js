'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  RETIRED_FILES,
  RETIRED_DIRECTORIES,
  normalize,
  isRetiredPath,
  shouldExcludeFromPublic
} = require('./deployment-policy');

const projectRoot = path.resolve(__dirname, '..');
const rootArgIndex = process.argv.indexOf('--root');
const root = rootArgIndex >= 0 && process.argv[rootArgIndex + 1]
  ? path.resolve(projectRoot, process.argv[rootArgIndex + 1])
  : projectRoot;
const deploymentMode = process.argv.includes('--deployment');

if (!fs.existsSync(root)) {
  console.error(`Validation root does not exist: ${root}`);
  process.exit(1);
}

const ignoredDirectoryNames = new Set(['.git', 'node_modules', 'dist', 'test-results', 'playwright-report', 'netlify-functions-dist']);
const errors = [];
const warnings = [];
const files = [];
let retiredSourceCount = 0;

function relative(file) {
  return normalize(path.relative(root, file));
}

function shouldIgnoreSource(relativePath, isDirectory) {
  if (deploymentMode) return false;
  const normalized = normalize(relativePath);
  if (isRetiredPath(normalized)) return true;
  if (isDirectory && RETIRED_DIRECTORIES.some(directory => normalized === directory || normalized.startsWith(`${directory}/`))) return true;
  return false;
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    const relativePath = relative(full);
    if (entry.isDirectory() && ignoredDirectoryNames.has(entry.name)) continue;
    if (shouldIgnoreSource(relativePath, entry.isDirectory())) {
      retiredSourceCount += 1;
      continue;
    }
    if (entry.isDirectory()) walk(full);
    else files.push(full);
  }
}
walk(root);

function targetCandidates(full, clean) {
  const candidates = [full];
  if (clean === '/' || clean.endsWith('/')) candidates.push(path.join(full, 'index.html'));
  if (!path.extname(full)) candidates.push(`${full}.html`, path.join(full, 'index.html'));
  return candidates;
}

function isRetiredTarget(candidate) {
  const candidateRelative = normalize(path.relative(root, candidate));
  return candidateRelative && !candidateRelative.startsWith('..') && isRetiredPath(candidateRelative);
}

function existsAsSiteTarget(target) {
  const clean = target.split('#')[0].split('?')[0];
  if (!clean) return true;
  if (!clean.startsWith('/')) return false;
  const full = path.join(root, clean.replace(/^\/+/, ''));
  return targetCandidates(full, clean).some(candidate => !isRetiredTarget(candidate) && fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

function resolveRelativeTarget(htmlFile, target) {
  const clean = target.split('#')[0].split('?')[0];
  if (!clean) return true;
  if (clean.startsWith('/')) return existsAsSiteTarget(clean);
  const full = path.resolve(path.dirname(htmlFile), clean);
  return targetCandidates(full, clean).some(candidate => !isRetiredTarget(candidate) && fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

function shouldIgnoreTarget(target) {
  return !target || target.startsWith('#') || /^(?:https?:|mailto:|tel:|data:|javascript:|blob:|about:)/i.test(target) || target.includes('${') || target.includes('{{');
}

function targetRetired(htmlFile, target) {
  const clean = target.split('#')[0].split('?')[0];
  if (!clean || shouldIgnoreTarget(clean)) return false;
  const full = clean.startsWith('/')
    ? path.join(root, clean.replace(/^\/+/, ''))
    : path.resolve(path.dirname(htmlFile), clean);
  const candidateRelative = normalize(path.relative(root, full));
  return candidateRelative && !candidateRelative.startsWith('..') && isRetiredPath(candidateRelative);
}

if (deploymentMode) {
  for (const file of files) {
    const fileRelative = relative(file);
    if (shouldExcludeFromPublic(fileRelative)) errors.push(`${fileRelative}: source-only or retired file was included in deployment`);
  }
}

for (const file of files.filter(file => /\.(?:json|webmanifest)$/i.test(file))) {
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(`${relative(file)}: invalid JSON (${error.message})`);
  }
}

for (const file of files.filter(file => /\.js$/i.test(file))) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) errors.push(`${relative(file)}: JavaScript syntax error\n${(result.stderr || result.stdout).trim()}`);
}

const htmlFiles = files.filter(file => /\.html?$/i.test(file));
for (const file of htmlFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const attrPattern = /(?:^|[\s<])(?:href|src|poster|action)\s*=\s*["']([^"']+)["']/gi;
  let match;
  while ((match = attrPattern.exec(text))) {
    const target = match[1].trim();
    if (shouldIgnoreTarget(target)) continue;
    if (target.startsWith('/api/') || target.startsWith('/.netlify/')) continue;
    if (targetRetired(file, target)) {
      errors.push(`${relative(file)}: references retired target ${target}`);
      continue;
    }
    const ok = target.startsWith('/') ? existsAsSiteTarget(target) : resolveRelativeTarget(file, target);
    if (!ok) errors.push(`${relative(file)}: missing internal target ${target}`);
  }

  const srcsetPattern = /srcset\s*=\s*["']([^"']+)["']/gi;
  while ((match = srcsetPattern.exec(text))) {
    for (const item of match[1].split(',')) {
      const target = item.trim().split(/\s+/)[0];
      if (shouldIgnoreTarget(target)) continue;
      if (targetRetired(file, target)) {
        errors.push(`${relative(file)}: references retired srcset target ${target}`);
        continue;
      }
      const ok = target.startsWith('/') ? existsAsSiteTarget(target) : resolveRelativeTarget(file, target);
      if (!ok) errors.push(`${relative(file)}: missing srcset target ${target}`);
    }
  }

  if (relative(file) === 'emt-prep/module-2-emt-school-expectations.html') {
    const activities = (text.match(/data-module2-activity=/g) || []).length;
    if (activities !== 7) errors.push(`${relative(file)}: expected 7 Module 2 activities, found ${activities}`);
    if (!text.includes('/emt-prep-module2.js')) errors.push(`${relative(file)}: Module 2 renderer script is not included`);
  }
  if (relative(file) !== 'med_sim.html' && text.includes('/med_sim.html')) errors.push(`${relative(file)}: legacy medical simulator is still publicly linked`);
}

for (const required of [
  'offline-ems-reference.html', 'offline-ems-reference.js', 'offline-reference-sw.js',
  'offline-reference.webmanifest', 'data/ems-reference-pack.json',
  'icons/ems-reference-192.png', 'icons/ems-reference-512.png'
]) {
  if (!fs.existsSync(path.join(root, required))) errors.push(`Missing offline pack asset: ${required}`);
}

const sitemap = path.join(root, 'sitemap.xml');
if (fs.existsSync(sitemap)) {
  const text = fs.readFileSync(sitemap, 'utf8');
  const urls = [...text.matchAll(/<loc>https:\/\/emscodesim\.com([^<]*)<\/loc>/g)].map(match => match[1] || '/');
  for (const url of urls) {
    if (!existsAsSiteTarget(url)) errors.push(`sitemap.xml: missing target ${url}`);
  }
  if (urls.includes('/med_sim.html')) errors.push('sitemap.xml: legacy medical simulator must not be indexed');
}

if (!deploymentMode) {
  const configPath = path.join(projectRoot, 'netlify.toml');
  const config = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
  if (!/\[functions\][\s\S]*?directory\s*=\s*["']netlify-functions-dist["']/i.test(config)) {
    errors.push('netlify.toml must deploy functions only from netlify-functions-dist');
  }

  const retained = [...RETIRED_FILES, ...RETIRED_DIRECTORIES].filter(item => fs.existsSync(path.join(projectRoot, item)));
  if (retained.length) warnings.push(`${retained.length} retired source path${retained.length === 1 ? '' : 's'} retained for reference; validation and deployment exclude them automatically`);
}

const uniqueErrors = [...new Set(errors)];
const uniqueWarnings = [...new Set(warnings)];
console.log(`Validated ${htmlFiles.length} HTML files, ${files.filter(file => /\.js$/i.test(file)).length} JavaScript files, and ${files.filter(file => /\.(?:json|webmanifest)$/i.test(file)).length} JSON/manifest files${deploymentMode ? ' in dist' : ''}.`);
if (retiredSourceCount && !deploymentMode) console.log(`Ignored ${retiredSourceCount} retired source path${retiredSourceCount === 1 ? '' : 's'} during active-site validation.`);
if (uniqueWarnings.length) {
  console.log('\nWarnings:');
  uniqueWarnings.forEach(item => console.log(`- ${item}`));
}
if (uniqueErrors.length) {
  console.error('\nValidation failed:');
  uniqueErrors.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}
console.log('Validation passed: active files are valid, internal references resolve, and retired paths are not exposed.');
