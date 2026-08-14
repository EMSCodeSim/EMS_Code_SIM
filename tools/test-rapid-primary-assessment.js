const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const patient = fs.readFileSync(path.join(root, 'vitals', 'visual-patient.js'), 'utf8');
const guide = fs.readFileSync(path.join(root, 'vitals', 'scenario-guided-start.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'vitals', 'visual-patient.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'vitals', 'visual-patient.html'), 'utf8');
const horseCss = fs.readFileSync(path.join(root, 'vitals', 'horse-crush-scenario.css'), 'utf8');
const horseBootstrap = fs.readFileSync(path.join(root, 'vitals', 'horse-crush-bootstrap.js'), 'utf8');
const horseUiFix = fs.readFileSync(path.join(root, 'vitals', 'horse-crush-ui-fix.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(guide.includes('PRIMARY_CASES') && guide.includes('PRIMARY_OPTIONS'), 'Photo-based ABC cases and choices must be defined.');
assert(guide.includes('What is your initial airway finding?'), 'The photo guide must assess airway.');
assert(guide.includes('What is your initial breathing finding?'), 'The photo guide must assess breathing.');
assert(guide.includes('What is your initial circulation finding?'), 'The photo guide must assess circulation.');
assert(guide.includes('Not enough information at this time'), 'Initial ABC must allow uncertainty.');
assert(guide.includes("source: 'guided-primary-assessment'"), 'Initial ABC findings must identify their source.');
assert(guide.includes('expectedNormality') && guide.includes('reviewAtDebrief: true'), 'Initial ABC decisions must retain deferred grading metadata.');
assert(guide.includes('PRIMARY ASSESSMENT FINDING') && guide.includes('What you find during the rapid check'), 'ABC steps must send neutral findings to the information window.');
assert(guide.includes('Save and begin ABC'), 'Scene size-up must transition directly to the initial ABC guide.');
assert(patient.includes('startPrimary') && patient.includes('Begin initial ABC in right assessment screen'), 'Assessment menu must launch ABC in the right assessment screen.');
assert(patient.includes("rightWorkflow.appendChild(guide)"), 'ABC runtime must safeguard placement inside the right clinical workflow.');
assert(html.indexOf('id="sceneGuide"') > html.indexOf('class="patient-control-column"'), 'The shared ABC guide must live inside the right clinical column.');
assert(html.includes('id="horseCurrentAssessment"') && html.includes('ABC Assessment'), 'The right clinical column must provide the current ABC assessment workspace.');
assert(horseCss.includes('ABC desktop placement — keep the patient photo clear'), 'Desktop ABC placement override must be present.');
assert(horseCss.includes('.patient-stage #sceneGuide') && horseCss.includes('display:none!important'), 'The ABC guide must not cover the desktop patient photo.');
assert(!patient.includes('data-primary-choice'), 'The assessment menu must not use inline answer-revealing ABC choices.');
assert(css.includes('.primary-photo-launch') && css.includes('.state-uncertain'), 'Photo ABC controls and uncertainty states must be styled.');
assert(html.includes('sceneGuideEyebrow'), 'The shared photo guide must support a dynamic phase heading.');


assert(html.includes('role="log"') && html.includes('aria-relevant="additions text"'), 'Scenario communications must expose an accessible live log.');
assert(horseBootstrap.includes('showLoadError') && horseBootstrap.includes("script.addEventListener('error'"), 'Horse bootstrap must provide visible module-load recovery.');
assert(!horseUiFix.includes('data-horse-parking') && !horseUiFix.includes('relocateArrivalDecision'), 'Retired parking workflow code must not execute in production.');
assert(horseUiFix.includes('requestAnimationFrame') && horseUiFix.includes('refreshQueued'), 'Horse UI mutation refreshes must be frame-throttled.');
assert(horseCss.includes('prefers-reduced-motion:reduce'), 'Scenario UI must honor reduced-motion preferences.');

console.log('Right-screen rapid primary and production-readiness checks passed.');
