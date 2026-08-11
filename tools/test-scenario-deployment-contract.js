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
const horseScenarioCss = read('vitals/horse-crush-scenario.css');
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
  patientHtml.includes('/vitals/horse-crush-scenario.css'),
  'Horse scenario stylesheet must be linked synchronously from visual-patient.html'
);
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
  bootstrap.includes('installDesktopLayoutGuard()'),
  'Horse bootstrap must install the synchronous desktop layout guard before shared learning helpers load'
);
assert(
  bootstrap.includes('display: flex !important') && bootstrap.includes('flex-direction: column !important'),
  'Horse desktop right column must follow the real update/cue/workspace/nav DOM order instead of a fixed three-row grid'
);
assert(
  bootstrap.includes('flex: 1 1 0 !important') && bootstrap.includes('height: auto !important'),
  'Horse desktop action sheet must receive the remaining right-column height'
);
assert(
  bootstrap.includes('#reasoningDiscoveryCue') && bootstrap.includes('position: static !important'),
  'The learning cue must participate in normal horse desktop layout instead of overlaying clinical controls'
);
assert(
  horseScenarioCss.includes('grid-template-rows:auto auto auto minmax(0,1fr)'),
  'Horse action sheet must reserve a bounded row for the active clinical panel'
);
assert(
  horseUiFix.includes('relocateReasoningBoard') && horseUiFix.includes("document.getElementById('findingsPanel')"),
  'The detailed horse reasoning board must live inside the Record panel instead of consuming permanent desktop workspace height'
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
  horseUiFix.includes('window.EMSCodeSimScenarioSession.saveFinding(key, value, payload, CASE_ID)'),
  'Horse desktop ABC findings must save through the shared scenario session'
);
assert(
  horseUiFix.includes('horse.performExam(key)'),
  'Horse assessment routing fix must route focused assessment items to the horse exam engine'
);

console.log('Scenario deployment contract OK');
