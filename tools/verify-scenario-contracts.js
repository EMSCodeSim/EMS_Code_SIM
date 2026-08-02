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


const guidedStart = read('vitals/scenario-guided-start.js');
includesAll(guidedStart, [
  'What PPE should you use?', 'Is the scene safe?', 'How many patients are present?', 'What is the NOI or MOI?',
  'What additional resources may be needed?', 'Is cervical-spine stabilization needed now?', 'What is your general impression?',
  'What is the initial AVPU level?', 'What is the initial patient priority?', "saveFinding('scene_size_up'",
  'reviewAtDebrief: true', 'answers', 'score', 'maxScore'
], 'Guided scene size-up');
assert(!guidedStart.includes('return false') || guidedStart.includes('missed choice'), 'Guided scene-size-up decisions must not block progress for an incorrect answer.');

const visualPatient = read('vitals/visual-patient.html');
includesAll(visualPatient, ['/vitals/scenario-guided-start.css', '/vitals/scenario-guided-start.js', 'sceneGuideQuestion', 'Skip guided start', 'nremt-skill-sheets.html'], 'Visual patient guided start');
const visualPatientJs = read('vitals/visual-patient.js');
includesAll(visualPatientJs, [
  'SCENE AND FIRST IMPRESSION', 'Primary assessment', "buildPrimaryCard(box, 'airway', 2)",
  "buildPrimaryCard(box, 'breathing', 3)", "buildPrimaryCard(box, 'perfusion', 4)",
  'Choose the assessment tools needed to evaluate'
], 'Assessment-tab clinical ordering');
assert(!visualPatientJs.includes('What you can say now'), 'Primary assessment cards must not reveal picture-based conclusions to the learner.');
assert(!visualPatientJs.includes('Use assessment and vital tools before deciding adequacy.'), 'Primary assessment cards should not contain prescriptive coaching text.');
assert(!visualPatient.includes('Vitals obtained') && !visualPatient.includes('Log entries') && !visualPatient.includes('Care events'), 'The patient home must not display summary-count boxes.');
assert(guidedStart.includes("if ($('sceneGuideComplete')) $('sceneGuideComplete').hidden = true;"), 'Completed scene size-up must collapse instead of remaining on the patient screen.');
assert(visualPatientJs.indexOf("buildSceneSizeUpCard(box)") < visualPatientJs.indexOf("buildPrimaryCard(box, 'airway', 2)"), 'Scene size-up must appear before airway in the assessment tab.');
assert(visualPatientJs.indexOf("buildPrimaryCard(box, 'airway', 2)") < visualPatientJs.indexOf("buildPrimaryCard(box, 'breathing', 3)"), 'Airway must appear before breathing.');
assert(visualPatientJs.indexOf("buildPrimaryCard(box, 'breathing', 3)") < visualPatientJs.indexOf("buildPrimaryCard(box, 'perfusion', 4)"), 'Breathing must appear before circulation.');
assert(guidedStart.includes('else showReady();') && !guidedStart.includes('else startGuide(false);'), 'Scene size-up must not autoplay when a scenario opens.');
assert(!visualPatient.includes('id="reviewSceneGuide"'), 'Scene size-up must be launched only from the Assessment tab.');
assert(!visualPatient.includes('id="nextActionCard"'), 'The patient home should not display a prescriptive recommended-next-action card.');

const skillSheetPage = read('nremt-skill-sheets.html');
includesAll(skillSheetPage, [
  'E201_NREMT.pdf','E202_NREMT.pdf','E203_NREMT.pdf','E204_NREMT.pdf','E211_NREMT.pdf',
  'E212_NREMT.pdf','E213_NREMT.pdf','E215_NREMT.pdf','E216_NREMT.pdf','E217_NREMT.pdf',
  'Practice companion—not an official testing authority'
], 'NREMT skill-sheet library');

const progressSync = read('vitals/scenario-progress-sync.js');
includesAll(progressSync, ["'/vitals/visual-patient.html'", "has('scene_size_up')"], 'Scenario progress synchronization');

const registry = read('vitals/scenario-tool-registry.js');
includesAll(registry, [
  '/vitals/visual-patient.html', 'scene_size_up', '/vitals/airway-assessment.html', '/vitals/breathing-assessment.html', '/vitals/perfusion-assessment.html',
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
