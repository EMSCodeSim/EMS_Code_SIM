'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const read = relative => fs.readFileSync(path.join(process.cwd(), relative), 'utf8');
const includesAll = (content, values, label) => values.forEach(value => assert(content.includes(value), `${label} is missing ${value}`));

const scenarioSession = read('vitals/scenario-session.js');
includesAll(scenarioSession, ['SCENARIO_CATALOG', 'saveFinding', 'state.findings[canonical] = saved', 'restoreStateToRecord'], 'Scenario session');

const vitalSimulator = read('vitals/scenario-vital-sims.js');
includesAll(vitalSimulator, ['leftReactionInput', 'rightReactionInput', 'gazeInput', 'trackingInput', 'Normal reference', 'Patient sample', 'cool and wet', 'expectedFinding', 'accurate', 'Accuracy will be reviewed at the end of the scenario', 'addReturnPaths', 'contextReturnLink', 'patientHomeLink'], 'Scenario vital simulator');
assert(!vitalSimulator.includes('id="leftSize"') && !vitalSimulator.includes('id="rightSize"'), 'Scenario pupils must not require pupil-size fields.');
assert(!vitalSimulator.includes('Finding not accepted') && !vitalSimulator.includes('fail('), 'Scenario vitals must save learner entries without forcing a correct answer.');


const bpScenario = read('vitals/bp-scenario.html');
includesAll(bpScenario, ['expectedFinding', 'accurate', 'Accuracy will be reviewed at the end of the scenario'], 'Scenario blood pressure');
assert(!bpScenario.includes('Reading not accepted. Repeat the blood pressure'), 'Scenario blood pressure must not force a correct reading before saving.');

const optionalNarrativePages = [
  'airway-assessment.html','breathing-assessment.html','perfusion-assessment.html','abdominal-assessment.html',
  'chest-assessment.html','motor-sensory-assessment.html','trauma-assessment.html','pediatric-assessment-triangle.html',
  'pain-opqrst.html','sample-history.html','clinical-impression.html','treatment-reassessment.html'
];
for (const name of optionalNarrativePages) {
  const html = read(`vitals/${name}`);
  assert(/id="pcrText"/.test(html), `${name} should retain an optional note field.`);
  assert(!/id="pcrText"[^>]*\brequired\b/.test(html), `${name} must not require an intermediate narrative.`);
}
assert(/id="pcrText"[^>]*\brequired\b/.test(read('vitals/pcr-handoff.html')), 'The final PCR/handoff activity should retain the full narrative requirement.');

const registry = read('vitals/scenario-tool-registry.js');
includesAll(registry, [
  '/vitals/airway-assessment.html', '/vitals/breathing-assessment.html', '/vitals/perfusion-assessment.html',
  '/vitals/avpu-scenario.html', '/vitals/pupil-scenario.html', '/vitals/motor-sensory-assessment.html',
  '/vitals/gcs.html', '/vitals/breath-sounds-scenario.html', '/vitals/chest-assessment.html',
  '/vitals/skin-scenario.html', '/vitals/abdominal-assessment.html', '/vitals/trauma-assessment.html',
  '/vitals/pain-opqrst.html', '/vitals/sample-history.html', '/vitals/pediatric-assessment-triangle.html', '/vitals/nines.html'
], 'Assessment registry');

const crosslinks = read('vitals/assessment-crosslinks.js');
includesAll(crosslinks, ['Respiratory rate', 'Breath sounds', 'SpO₂', 'Treat recorded', 'returnTo: currentReturn', 'Patient home'], 'Assessment cross-links');

const treatment = read('vitals/treatment-reassessment.js');
includesAll(treatment, [
  "['monitor'", "['position'", "['suction'", "['opa'", "['npa'", "['bvm'", "['lma'", "['intubation'", "['cric'",
  'Return to ${returnLabel}', 'Recorded finding:'
], 'Treatment simulator');

const scenarioPages = fs.readdirSync(path.join(process.cwd(), 'vitals'))
  .filter(name => /-scenario\.html$/.test(name));
for (const name of scenarioPages) {
  const html = read(`vitals/${name}`);
  includesAll(html, ['/vitals/patient-record.js', '/vitals/scenario-session.js'], name);
}

console.log(`Scenario contract verification passed for ${scenarioPages.length} scenario simulator pages.`);
