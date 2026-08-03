const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const patient = fs.readFileSync(path.join(root, 'vitals', 'visual-patient.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'vitals', 'visual-patient.css'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(patient.includes('RAPID_PRIMARY_CHOICES'), 'Rapid ABC choices must be defined.');
assert(patient.includes('recordRapidPrimary'), 'Rapid ABC decisions must be saved.');
assert(patient.includes("saveFinding(key, choice.value, 'rapid-primary-assessment'"), 'Rapid ABC findings must identify their source.');
assert(patient.includes('expectedNormality') && patient.includes('reviewAtDebrief'), 'Rapid ABC decisions must retain grading metadata.');
assert(patient.includes('data-primary-key') && patient.includes('data-primary-choice'), 'Primary assessment must render inline decision controls.');
assert(patient.includes("return 'Choose the rapid finding'"), 'The patient answer must not be shown before learner selection.');
assert(css.includes('.rapid-primary-choices'), 'Rapid ABC controls must have responsive styles.');

console.log('Rapid primary assessment checks passed.');
