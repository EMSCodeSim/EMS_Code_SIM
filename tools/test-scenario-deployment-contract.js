'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const netlify = read('netlify.toml');
const patientHtml = read('vitals/visual-patient.html');
const bootstrap = read('vitals/horse-crush-bootstrap.js');
const horseUiFix = read('vitals/horse-crush-ui-fix.js');
const definitions = read('vitals/scenario-definitions.js');

function assertRevalidatedHeader(pattern) {
  const marker = `for = "${pattern}"`;
  const start = netlify.indexOf(marker);
  assert(start >= 0, `Missing Netlify cache rule for ${pattern}`);
  const nextHeader = netlify.indexOf('[[headers]]', start + marker.length);
  const nextRedirect = netlify.indexOf('[[redirects]]', start + marker.length);
  const endings = [nextHeader, nextRedirect].filter(index => index >= 0);
  const end = endings.length ? Math.min(...endings) : netlify.length;
  const block = netlify.slice(start, end);
  assert(
    /Cache-Control\s*=\s*"[^"]*max-age=0[^"]*must-revalidate[^"]*"/.test(block),
    `${pattern} must be revalidated instead of served as a long-lived cached asset`
  );
}

assertRevalidatedHeader('/vitals/*.js');
assertRevalidatedHeader('/vitals/*.css');

const scriptOrder = [
  '/vitals/patient-record.js',
  '/vitals/scenario-definitions.js',
  '/vitals/scenario-session.js',
  '/vitals/scenario-runtime.js',
  '/vitals/horse-crush-bootstrap.js',
  '/vitals/horse-crush-scenario.js',
  '/vitals/visual-patient.js',
  '/vitals/scenario-guided-start.js'
];

let previousIndex = -1;
scriptOrder.forEach(src => {
  const index = patientHtml.indexOf(src);
  assert(index >= 0, `visual-patient.html must load ${src}`);
  assert(index > previousIndex, `${src} is out of scenario dependency order`);
  previousIndex = index;
});

assert(
  /const\s+CATALOG\s*=\s*Object\.freeze\(/.test(definitions),
  'Scenario catalog is expected to remain immutable'
);
assert(
  definitions.includes('horse_crush:'),
  'Canonical scenario definitions must include horse_crush'
);
assert(
  !/defs\.(?:CATALOG|PROFILES|PHASE_PLANS|PATIENT_CASES|CONDITION_STAGES|TREATMENT_PLANS)\s*\[.*?\]\s*\|\|=/.test(bootstrap),
  'Horse bootstrap must never mutate canonical scenario definition groups'
);
assert(
  bootstrap.includes('EMSCodeSimScenarioBootstrapStatus'),
  'Horse bootstrap must publish a diagnostic status instead of silently patching definitions'
);
assert(
  bootstrap.includes("loadOnce('data-scenario-learning-upgrade'"),
  'Horse bootstrap must request the shared learning upgrade'
);
assert(
  bootstrap.includes("loadOnce('data-condition-alert-priority'"),
  'Horse bootstrap must request condition alert priority handling'
);
assert(
  bootstrap.includes("loadOnce('data-horse-crush-ui-fix'"),
  'Horse bootstrap must request the desktop horse assessment routing fix'
);
assert(
  horseUiFix.includes("event.target.closest?.('#assessmentTools [data-assessment-item]')"),
  'Horse assessment routing fix must intercept desktop assessment-item clicks'
);
assert(
  horseUiFix.includes('openDesktopAbcFollowup(button, key)'),
  'Horse assessment routing fix must route ABC item clicks to the visible desktop follow-up workspace'
);
assert(
  horseUiFix.includes("window.EMSCodeSimScenarioSession.saveFinding(key, value, payload, CASE_ID)"),
  'Horse desktop ABC findings must save through the shared scenario session'
);
assert(
  horseUiFix.includes('horse.performExam(key)'),
  'Horse assessment routing fix must route focused assessment items to the horse exam engine'
);

console.log('Scenario deployment contract OK');
