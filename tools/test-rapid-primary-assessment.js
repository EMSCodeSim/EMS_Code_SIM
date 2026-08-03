const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const patient = fs.readFileSync(path.join(root, 'vitals', 'visual-patient.js'), 'utf8');
const guide = fs.readFileSync(path.join(root, 'vitals', 'scenario-guided-start.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'vitals', 'visual-patient.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'vitals', 'visual-patient.html'), 'utf8');

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
assert(patient.includes('startPrimary') && patient.includes('Begin initial ABC over patient photo'), 'Assessment menu must launch the photo-based ABC guide.');
assert(!patient.includes('data-primary-choice'), 'The assessment menu must not use inline answer-revealing ABC choices.');
assert(css.includes('.primary-photo-launch') && css.includes('.state-uncertain'), 'Photo ABC controls and uncertainty states must be styled.');
assert(html.includes('sceneGuideEyebrow'), 'The shared photo guide must support a dynamic phase heading.');

console.log('Photo-based rapid primary assessment checks passed.');
