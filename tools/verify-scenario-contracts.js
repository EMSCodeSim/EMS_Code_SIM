'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const read = relative => fs.readFileSync(path.join(process.cwd(), relative), 'utf8');
const includesAll = (content, values, label) => values.forEach(value => assert(content.includes(value), `${label} is missing ${value}`));

const scenarioSession = read('vitals/scenario-session.js');
includesAll(scenarioSession, [
  'SCENARIO_CATALOG', 'saveFinding', 'state.findings[canonical] = saved', 'restoreStateToRecord',
  'PARTNER_PREFIX', 'assignPartnerTask', 'assignedAt', 'dueAt', "status: 'pending'", 'resolvePartnerTasks'
], 'Scenario session');

const vitalSimulator = read('vitals/scenario-vital-sims.js');
includesAll(vitalSimulator, [
  'leftReactionInput', 'rightReactionInput', 'gazeInput', 'trackingInput', 'Normal reference', 'Patient sample',
  'cool and wet', 'expectedFinding', 'accurate', 'Accuracy will be reviewed at the end of the scenario',
  'addReturnPaths', 'patientHomeLink', '← Return to Patient'
], 'Scenario vital simulator');
assert(!vitalSimulator.includes('contextReturnLink'), 'Scenario vital simulators should expose one patient-home return path, not a competing context return.');
assert(!vitalSimulator.includes('id="leftSize"') && !vitalSimulator.includes('id="rightSize"'), 'Scenario pupils must not require pupil-size fields.');
assert(!vitalSimulator.includes('Finding not accepted') && !vitalSimulator.includes('fail('), 'Scenario vitals must save learner entries without forcing a correct answer.');

const bpScenario = read('vitals/bp-scenario.html');
includesAll(bpScenario, ['expectedFinding', 'accurate', 'Accuracy will be reviewed at the end of the scenario', 'Return to Patient'], 'Scenario blood pressure');
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
assert(guidedStart.includes("if ($('sceneGuideComplete')) $('sceneGuideComplete').hidden = true;"), 'Completed scene size-up must collapse instead of remaining on the patient screen.');
assert(guidedStart.includes('else showReady();') && !guidedStart.includes('else startGuide(false);'), 'Scene size-up must not autoplay when a scenario opens.');

const visualPatient = read('vitals/visual-patient.html');
includesAll(visualPatient, [
  '/vitals/scenario-guided-start.css', '/vitals/scenario-guided-start.js', 'sceneGuideQuestion', 'Skip guided start',
  'scenarioProgress', 'infoUpdateCollapse', 'sceneClueLayer', '/vitals/scenario-phase-model.js'
], 'Visual patient home');
assert(!visualPatient.includes('id="nextActionCard"'), 'The patient home must not display a next-action card.');
assert(!visualPatient.includes('Vitals obtained') && !visualPatient.includes('Log entries') && !visualPatient.includes('Care events'), 'The patient home must not display summary-count boxes.');
assert(!visualPatient.includes('id="reviewSceneGuide"'), 'Scene size-up must be launched only from the Assessment tab.');

const visualPatientJs = read('vitals/visual-patient.js');
includesAll(visualPatientJs, [
  'buildSceneSizeUpCard(box)', 'buildPrimaryAssessmentCard(box)', 'Primary Assessment', 'primary-assessment-row',
  'buildRecommendedAssessments', 'buildAssessmentFilters', 'Focused Assessment', 'History', 'buildVitals',
  'current?.startedAt', 'assignPartnerTask', 'resolvePartnerTasks', 'isInformationUpdate', 'infoUpdateCollapse',
  'checkScenarioCompletion', 'essentialComplete'
], 'Patient-picture scenario home');
assert(!visualPatientJs.includes('buildRapidABCCard'), 'Rapid ABC must be combined into the unified Primary Assessment card.');
assert(!visualPatientJs.includes('openRapidABC'), 'The patient home must not retain a separate Rapid ABC modal.');
assert(!visualPatientJs.includes('updateNextAction'), 'The patient home must not calculate or display a patient-screen next-action card.');
assert(visualPatientJs.indexOf('buildSceneSizeUpCard(box)') < visualPatientJs.indexOf('buildPrimaryAssessmentCard(box)'), 'Scene size-up must appear before the unified Primary Assessment.');
assert(visualPatientJs.lastIndexOf('buildPrimaryAssessmentCard(box)') < visualPatientJs.lastIndexOf('buildRecommendedAssessments(box, tools)'), 'Primary Assessment must appear before recommended assessment tools.');
assert(visualPatientJs.lastIndexOf('buildRecommendedAssessments(box, tools)') < visualPatientJs.lastIndexOf("buildAssessmentCategory(box, 'focused'"), 'Recommended next actions must appear before the categorized tool lists.');
assert(!visualPatientJs.includes('What you can say now'), 'Primary assessment must not reveal picture-based conclusions to the learner.');
assert(!visualPatientJs.includes("buildAssessmentCategory(box, 'vitals'"), 'Measurable vital signs must remain in the separate Vitals tab.');

const launcher = read('vitals/scenario-launcher.js');
includesAll(launcher, ['/vitals/visual-patient.html', '`Resume ${', 'function start(caseId)'], 'Scenario launcher');
assert(!launcher.includes('openAssessmentWorkspace'), 'The launcher must not route into a competing guided-assessment home.');

const workspace = read('vitals/assessment-workspace.js');
assert(workspace.includes("if (routeRecord || routeParams.get('mode')"), 'The legacy assessment workspace must redirect active scenarios to the patient-picture home.');

const phaseModel = read('vitals/scenario-phase-model.js');
includesAll(phaseModel, [
  'Required', 'Clinically appropriate', 'Optional unless assigned', 'notIndicatedFindings',
  'Immediate treatment', 'Reassessment', 'Impression & transport', 'Handoff', 'Debrief',
  'hasReassessmentAfterTreatment', 'essentialComplete'
], 'Scenario phase model');

const progressSync = read('vitals/scenario-progress-sync.js');
includesAll(progressSync, [
  "treatment: treatmentComplete", "reassessment: reassessmentComplete", 'lastReassessment >= lastTreatment',
  "state.phaseProgress.treatment && state.phaseProgress.reassessment", 'legacy route was opened'
], 'Scenario progress synchronization');

const crosslinks = read('vitals/assessment-crosslinks.js');
includesAll(crosslinks, ['Continue to Patient Home', 'scenario-assessment-actions', 'scenario-grade-hidden', 'scenarioHome'], 'Assessment return flow');
assert(!crosslinks.includes('All assessment tools'), 'Assessment pages must not offer a competing all-tools destination.');
assert(!crosslinks.includes('Patient home'), 'Assessment pages must not add a second patient-home link beside the primary return control.');

const scenarioFlow = read('vitals/scenario-flow.js');
includesAll(scenarioFlow, ['recorded', 'Return to Patient', 'Continue with:', 'esf-primary'], 'Post-assessment confirmation');
assert(!scenarioFlow.includes('Patient record'), 'Post-assessment confirmation must not present the patient record as a competing primary destination.');

const treatment = read('vitals/treatment-reassessment.js');
includesAll(treatment, [
  "['monitor'", "['position'", "['suction'", "['opa'", "['npa'", "['bvm'", "['lma'", "['intubation'", "['cric'",
  'Return to Patient', 'Continue with:', 'Recorded finding:'
], 'Treatment simulator');

const skillSheetPage = read('nremt-skill-sheets.html');
includesAll(skillSheetPage, [
  'E201_NREMT.pdf','E202_NREMT.pdf','E203_NREMT.pdf','E204_NREMT.pdf','E211_NREMT.pdf',
  'E212_NREMT.pdf','E213_NREMT.pdf','E215_NREMT.pdf','E216_NREMT.pdf','E217_NREMT.pdf',
  'Practice companion—not an official testing authority'
], 'NREMT skill-sheet library');

const registry = read('vitals/scenario-tool-registry.js');
includesAll(registry, [
  '/vitals/visual-patient.html', 'scene_size_up', '/vitals/airway-assessment.html', '/vitals/breathing-assessment.html', '/vitals/perfusion-assessment.html',
  '/vitals/avpu-scenario.html', '/vitals/pupil-scenario.html', '/vitals/motor-sensory-assessment.html',
  '/vitals/gcs.html', '/vitals/breath-sounds-scenario.html', '/vitals/chest-assessment.html',
  '/vitals/skin-scenario.html', '/vitals/abdominal-assessment.html', '/vitals/trauma-assessment.html',
  '/vitals/pain-opqrst.html', '/vitals/sample-history.html', '/vitals/pediatric-assessment-triangle.html', '/vitals/nines.html'
], 'Assessment registry');

const scenarioPages = fs.readdirSync(path.join(process.cwd(), 'vitals'))
  .filter(name => /-scenario\.html$/.test(name));
for (const name of scenarioPages) {
  const html = read(`vitals/${name}`);
  includesAll(html, ['/vitals/patient-record.js', '/vitals/scenario-session.js'], name);
}

console.log(`Scenario contract verification passed for ${scenarioPages.length} scenario simulator pages.`);
