'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const netlify = read('netlify.toml');
const redirects = read('_redirects');
const patientHtml = read('vitals/visual-patient.html');
const bootstrap = read('vitals/horse-crush-bootstrap.js');
const horseUiFix = read('vitals/horse-crush-ui-fix.js');
const horsePhotoFix = read('vitals/horse-photo-layer-fix.js');
const horseScenarioCss = read('vitals/horse-crush-scenario.css');
const definitions = read('vitals/scenario-definitions.js');
const registry = read('vitals/scenario-tool-registry.js');
const miniOverlay = read('vitals/scenario-mini-sim-overlay.js');
const embeddedMiniSim = read('vitals/scenario-mini-sim-embedded.js');
const visualAssessmentSuite = read('vitals/visual-assessment-suite.js');

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
assert(!/^@@\s*$/m.test(redirects), '_redirects must not contain patch hunk markers');
assert(!/^\+/m.test(redirects), '_redirects must not contain patch-added line markers');

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

assert(patientHtml.includes('/vitals/horse-crush-scenario.css'), 'Horse scenario stylesheet must be linked synchronously from visual-patient.html');
assert(/const\s+CATALOG\s*=\s*Object\.freeze\(/.test(definitions), 'Scenario catalog is expected to remain immutable');
assert(definitions.includes('horse_crush:'), 'Canonical scenario definitions must include horse_crush');
assert(!/defs\.(?:CATALOG|PROFILES|PHASE_PLANS|PATIENT_CASES|CONDITION_STAGES|TREATMENT_PLANS)\s*\[.*?\]\s*\|\|=/.test(bootstrap), 'Horse bootstrap must never mutate canonical scenario definition groups');
assert(bootstrap.includes('EMSCodeSimScenarioBootstrapStatus'), 'Horse bootstrap must publish a diagnostic status instead of silently patching definitions');
assert(bootstrap.includes("loadOnce('data-scenario-learning-upgrade'"), 'Horse bootstrap must request the shared learning upgrade');
assert(bootstrap.includes("loadOnce('data-condition-alert-priority'"), 'Horse bootstrap must request condition alert priority handling');
assert(bootstrap.includes("loadOnce('data-horse-crush-ui-fix'"), 'Horse bootstrap must request the desktop horse assessment routing fix');
assert(bootstrap.includes("loadOnce('data-horse-photo-layer-fix'"), 'Horse bootstrap must load the patient-photo layer guard');
assert(bootstrap.includes('installDesktopLayoutGuard()'), 'Horse bootstrap must install the synchronous desktop layout guard before shared learning helpers load');
assert(bootstrap.includes('display: flex !important') && bootstrap.includes('flex-direction: column !important'), 'Horse desktop right column must follow the real update/cue/workspace/nav DOM order instead of a fixed three-row grid');
assert(bootstrap.includes('flex: 1 1 0 !important') && bootstrap.includes('height: auto !important'), 'Horse desktop action sheet must receive the remaining right-column height');
assert(bootstrap.includes('#reasoningDiscoveryCue') && bootstrap.includes('position: static !important'), 'The learning cue must participate in normal horse desktop layout instead of overlaying clinical controls');
assert(bootstrap.includes('installScenarioTransitionGuard()') && bootstrap.includes('clearScenarioControlOverlay'), 'Horse transport and handoff transitions must clear the scenario control modal/backdrop');
assert(bootstrap.includes("#handoffFromProgress, #transportScenarioQuick"), 'Horse scenario transition guard must cover both progress handoff and quick transport controls');
assert(horseScenarioCss.includes('grid-template-rows:auto auto auto minmax(0,1fr)'), 'Horse action sheet must reserve a bounded row for the active clinical panel');
assert(horseUiFix.includes('relocateReasoningBoard') && horseUiFix.includes("document.getElementById('findingsPanel')"), 'The detailed horse reasoning board must live inside the Record panel instead of consuming permanent desktop workspace height');
assert(horseUiFix.includes("event.target.closest?.('#assessmentTools [data-assessment-item]')"), 'Horse assessment routing fix must intercept desktop assessment-item clicks');
assert(horseUiFix.includes('openDesktopAbcFollowup(button, key)'), 'Horse assessment routing fix must route ABC item clicks to the visible desktop follow-up workspace');
assert(horseUiFix.includes("lung_sounds:") && horseUiFix.includes("openAssessmentSim(key, button)"), 'Horse Chest Breath Sounds button must open the breath-sounds mini sim');
assert(horseUiFix.includes("Pupils / PERL") && horseUiFix.includes('/vitals/pupil.html'), 'Horse Pupils / PERL button must open the site PERL simulator');
assert(embeddedMiniSim.includes("pathname !== '/vitals/pupil.html'") || embeddedMiniSim.includes("installPerlAdapter"), 'Embedded mini sims must adapt the PERL pupil trainer');
assert(horseUiFix.includes('window.EMSCodeSimScenarioSession.saveFinding(key, value, payload, CASE_ID)'), 'Horse desktop ABC findings must save through the shared scenario session');
assert(horseUiFix.includes('horse.performExam(key)'), 'Horse assessment routing fix must route focused assessment items to the horse exam engine');
assert(horseUiFix.includes('promoteHiddenTransportForm') && horseUiFix.includes('form.horse-transport-selection-form'), 'Horse desktop transport form must be promoted out of the retired hidden question box');
assert(horseUiFix.includes("document.getElementById('treatmentTools')") && horseUiFix.includes("document.getElementById('treatmentPanel')"), 'Horse transport promotion must target the visible Treatment workspace');
assert(horseUiFix.includes('closeScenarioControlOverlay') && horseUiFix.includes("document.getElementById('scenarioControlDialog')"), 'Horse transport promotion must close stale scenario controls before showing the Treatment workspace');

assert(registry.includes('/vitals/scenario-mini-sim-overlay.js'), 'Scenario tool registry must load the shared mini-sim overlay');
assert(miniOverlay.includes('ensureWorkspaceOverPatient'), 'Shared mini-sim overlay must keep the simulator inside the patient stage');
assert(miniOverlay.includes("clue.insertAdjacentElement('afterend', node)"), 'Mini-sim overlay must be placed over the patient window after the clue layer');
assert(miniOverlay.includes("document.body.classList.add('sim-workspace-open')"), 'Opening a mini sim must enter the shared overlay state');
assert(miniOverlay.includes("autosaveclose', '1'"), 'Embedded mini sims must use the autosave-and-close contract');
assert(miniOverlay.includes('/vitals/scenario-mini-sim-embedded.css') && miniOverlay.includes('/vitals/scenario-mini-sim-embedded.js'), 'Shared overlay must inject the compact embedded mini-sim experience');
assert(!miniOverlay.includes("document.querySelector('.patient-control-column')"), 'Shared mini sims must not be relocated to the clinical side column');

assert(horsePhotoFix.includes('EMSCodeSimMiniSimOverlay') && horsePhotoFix.includes('ensureWorkspaceOverPatient'), 'Horse compatibility layer must defer to the shared patient-window overlay');
assert(!horsePhotoFix.includes("document.querySelector('.patient-control-column')"), 'Horse compatibility layer must not restore the retired sidecar behavior');
assert(horsePhotoFix.includes("version: '2.0'"), 'Horse patient-layer compatibility guard must use the overlay-era contract');

assert(embeddedMiniSim.includes('ems-discovery-locked'), 'Embedded vital sims must hide documentation until the measurement is completed');
assert(embeddedMiniSim.includes("setFlow(3)"), 'Embedded mini sims must advance to Document only after discovery');
assert(embeddedMiniSim.includes("['pulse','respirations','spo2','bgl','temperature']"), 'Shared discovery gate must cover all device vital simulators');
assert(embeddedMiniSim.includes("sim === 'pupils'") && embeddedMiniSim.includes("sim === 'skin'") && embeddedMiniSim.includes("sim === 'mental-status'") && embeddedMiniSim.includes("sim === 'breath-sounds'"), 'Shared discovery gate must cover observation-based vital mini sims');
assert(read('vitals/breath-sounds-auscultation.js').includes('stageMarkup') && read('vitals/breath-sounds-scenario.html').includes('breath-sounds-auscultation.js'), 'Breath-sounds scenario must load the rebuilt anatomical auscultation stage');
assert(visualAssessmentSuite.includes('function interpret(config={})'), 'Visual assessment suite must require learner interpretation before saving findings');
assert(visualAssessmentSuite.includes('reviewAtDebrief:true'), 'Visual assessment grading data must remain hidden until debrief');

console.log('Scenario deployment contract OK');
