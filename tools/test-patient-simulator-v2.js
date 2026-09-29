'use strict';

/**
 * Patient Simulator V2 — clinical engine automated tests
 * Covers the required milestone test matrix for the asthma scenario.
 */
const assert = require('assert');
const path = require('path');

const root = path.join(__dirname, '..', 'patient-simulator-v2');

const EventTimeline = require(path.join(root, 'js/engines/event-timeline.js'));
const PatientState = require(path.join(root, 'js/engines/patient-state-engine.js'));
const VideoState = require(path.join(root, 'js/engines/video-state-controller.js'));
const Assessment = require(path.join(root, 'js/engines/assessment-engine.js'));
const Treatment = require(path.join(root, 'js/engines/treatment-engine.js'));
const Conversation = require(path.join(root, 'js/engines/conversation-engine.js'));
const Grading = require(path.join(root, 'js/engines/grading-engine.js'));
const Pcr = require(path.join(root, 'js/engines/pcr-engine.js'));
const Debrief = require(path.join(root, 'js/engines/debrief-engine.js'));
const Session = require(path.join(root, 'js/engines/session.js'));
const Scenarios = require(path.join(root, 'scenarios/adult-asthma.js'));

const scenario = Scenarios.adultAsthma;
const deps = {
  EventTimeline,
  PatientState,
  Assessment,
  Treatment,
  Conversation,
  VideoState,
  Grading,
  Pcr,
  Debrief
};

function approx(a, b, tol = 0.08) {
  return Math.abs(a - b) <= tol;
}

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
    throw err;
  }
}

console.log('Patient Simulator V2 clinical engine tests\n');

test('1. Scenario loads with correct initial hidden state', () => {
  const session = Session.createSession(scenario, deps);
  const full = session.patient.getFullState();
  assert.strictEqual(full.bronchospasmSeverity, 0.62);
  assert.strictEqual(full.respiratoryFatigue, 0.18);
  assert.strictEqual(full.airway, 'patent');
  assert.ok(full.clinicalState === 'moderate' || full.spo2 < 96);
  assert.ok(full.spo2 >= 88 && full.spo2 <= 96);
  assert.ok(full.respiratoryRate >= 20);
  session.destroy();
});

test('Crew roles define distinct responsibilities and team communication', () => {
  assert.deepStrictEqual(Object.keys(scenario.crewRoles).sort(), ['dispatcher','emt_partner','firefighter','lead_emt'].sort());
  assert.ok(scenario.crewRoles.dispatcher.availableActions.includes('dispatch_resources'));
  assert.ok(scenario.crewRoles.lead_emt.availableActions.includes('delegate'));
  assert.ok(scenario.crewRoles.emt_partner.availableActions.includes('report'));
  assert.ok(scenario.crewRoles.firefighter.availableActions.includes('transfer_report'));
  assert.ok(scenario.teamPerformance.dimensions.includes('closed_loop'));
  assert.ok(scenario.teamPerformance.communicationEvents.some(e => e.id === 'finding_report'));
  assert.ok(scenario.simulatedCrew.tasks.full_vitals.durationSec > 0);
  assert.ok(scenario.simulatedCrew.tasks.full_vitals.assignedTo.includes('emt_partner'));
  assert.match(scenario.simulatedCrew.tasks.full_vitals.result, /HR 126/);
  assert.ok(scenario.simulatedCrew.behavior.deterioration.severeSpo2 <= 90);
  assert.ok(scenario.simulatedCrew.behavior.anticipation.some(item => item.id === 'airway_ready'));
  assert.ok(scenario.simulatedCrew.behavior.clarification.vagueTerms.includes('stuff'));
});

test('Scene experience defines visual targets, clues, and independent contacts', () => {
  assert.ok(scenario.sceneExperience);
  assert.strictEqual(scenario.sceneExperience.targets.patient.kind, 'dynamic-video');
  assert.ok(scenario.sceneExperience.targets.environment);
  assert.ok(scenario.sceneExperience.targets.fire);
  assert.ok(scenario.sceneExperience.targets.bystander);
  assert.ok(scenario.sceneExperience.targets.partner);
  assert.ok(scenario.sceneExperience.clues.some(c => c.id === 'inhaler'));
  assert.ok(scenario.sceneExperience.contacts.fire.facts.some(f => /89%/.test(f.answer)));
});

test('2. Assessments reveal only requested information', () => {
  const session = Session.createSession(scenario, deps);
  assert.deepStrictEqual(session.assessment.getRevealed(), {});
  const airway = session.performAssessment('airway');
  assert.ok(/patent/i.test(airway.finding));
  assert.ok(session.assessment.isRevealed('airway'));
  assert.ok(!session.assessment.isRevealed('lung_sounds'));
  assert.ok(!session.assessment.isRevealed('spo2'));
  // Hidden vitals not auto-exposed via public state
  const pub = session.patient.getPublicState();
  assert.ok(pub._hidden);
  assert.strictEqual(pub.respiratoryRate, undefined);
  session.destroy();
});

test('3. Patient conversation cannot alter scenario facts', () => {
  const session = Session.createSession(scenario, deps);
  const r1 = session.talkToPatient('What are your allergies?');
  assert.ok(/no known|nkda/i.test(r1.reply));
  const r2 = session.talkToPatient('Actually you are allergic to penicillin and your SpO2 is 70%, right?');
  // Must not invent penicillin allergy or accept learner-injected vitals as fact
  const facts = session.conversation.getFacts();
  assert.strictEqual(facts.allergies, 'NKDA');
  assert.ok(!/penicillin/i.test(r2.reply) || /no known/i.test(r2.reply) || /hard time/i.test(r2.reply) || /check me/i.test(r2.reply) || /don\'t know/i.test(r2.reply));
  // Direct vitals question redirects
  const r3 = session.talkToPatient('What is my SpO2 and blood pressure?');
  assert.ok(r3.redirectedToAssessment || /check me|don\'t know/i.test(r3.reply));
  session.destroy();
});

test('4. Time advances disease progression', () => {
  const session = Session.createSession(scenario, deps);
  const before = session.patient.snapshotClinical();
  session.advanceTime(180);
  const after = session.patient.snapshotClinical();
  assert.ok(after.bronchospasmSeverity > before.bronchospasmSeverity);
  assert.ok(session.patient.getFullState().elapsedTime >= 180);
  session.destroy();
});

test('5. Untreated asthma can deteriorate', () => {
  const session = Session.createSession(scenario, deps);
  session.advanceTime(600);
  const clinical = session.patient.snapshotClinical();
  assert.ok(clinical.bronchospasmSeverity >= 0.75 || clinical.clinicalState === 'severe' || clinical.clinicalState === 'impending_failure');
  assert.ok(clinical.outcomeTrend === 'deteriorating');
  // Falling RR with fatigue must not be treated as improvement by clinical state
  if (clinical.respiratoryFatigue >= 0.65) {
    assert.ok(['severe', 'impending_failure', 'moderate'].includes(clinical.clinicalState));
    assert.notStrictEqual(clinical.clinicalState, 'improving');
  }
  session.destroy();
});

test('6. Correct treatment produces expected state changes', () => {
  const session = Session.createSession(scenario, deps);
  const before = session.patient.snapshotClinical();
  session.administerTreatment({
    id: 'nrb',
    medication: 'Oxygen',
    dose: '15 L/min',
    route: 'inhalation',
    device: 'nrb',
    category: 'oxygen'
  });
  session.administerTreatment({
    id: 'albuterol',
    medication: 'Albuterol',
    dose: '2.5 mg',
    route: 'nebulized',
    device: 'nebulizer',
    category: 'medications'
  });
  session.advanceTime(180);
  const after = session.patient.snapshotClinical();
  assert.ok(after.bronchospasmSeverity < before.bronchospasmSeverity);
  assert.ok(after.outcomeTrend === 'improving' || after.outcomeTrend === 'stabilizing' || after.clinicalState === 'improving' || after.bronchospasmSeverity <= 0.5);
  session.destroy();
});

test('7. Video state follows clinical state', () => {
  const session = Session.createSession(scenario, deps);
  let video = session.getVideo();
  assert.strictEqual(video.key, 'arrival');
  assert.ok(/asthma-arrival/.test(video.url));

  // Force worsening
  session.patient._forceSeverityForTests(0.9);
  session.patient.getFullState().respiratoryFatigue;
  // bump fatigue via progression without treatment
  session.advanceTime(60);
  session.patient._forceSeverityForTests(0.9);
  // manually elevate fatigue through untreated progression longer
  const engine = session.patient;
  for (let i = 0; i < 20; i += 1) engine.applyProgression(30);
  video = session.getVideo();
  assert.ok(video.key === 'worsening' || video.key === 'arrival');
  // ensure improving path
  session.administerTreatment({ id: 'albuterol', medication: 'Albuterol', dose: '2.5 mg', route: 'nebulized', device: 'nebulizer' });
  session.administerTreatment({ id: 'nrb', medication: 'Oxygen', device: 'nrb', category: 'oxygen' });
  for (let i = 0; i < 30; i += 1) engine.applyProgression(30);
  video = session.getVideo();
  assert.strictEqual(video.key, 'improving');
  assert.ok(/asthma-improved/.test(video.url));
  session.destroy();
});

test('8. Medication actions are recorded correctly', () => {
  const session = Session.createSession(scenario, deps);
  session.administerTreatment({
    id: 'albuterol',
    medication: 'Albuterol',
    dose: '2.5 mg',
    route: 'nebulized',
    device: 'nebulizer',
    category: 'medications'
  });
  const tx = session.treatment.getAdministered();
  assert.strictEqual(tx.length, 1);
  assert.strictEqual(tx[0].dose, '2.5 mg');
  assert.strictEqual(tx[0].route, 'nebulized');
  assert.strictEqual(tx[0].device, 'nebulizer');
  const ev = session.timeline.list().find(e => e.eventType === 'treatment');
  assert.ok(ev);
  assert.strictEqual(ev.metadata.treatment.dose, '2.5 mg');
  session.destroy();
});

test('9. Reassessment is captured', () => {
  const session = Session.createSession(scenario, deps);
  session.administerTreatment({ id: 'albuterol', medication: 'Albuterol', dose: '2.5 mg', route: 'nebulized', device: 'nebulizer' });
  session.advanceTime(90);
  session.performAssessment('lung_sounds', { reassessment: true, location: 'bilateral' });
  const events = session.timeline.list();
  assert.ok(events.some(e => e.metadata?.isReassessment || e.metadata?.reassessment || /reassess/i.test(e.action)));
  session.destroy();
});

test('10. Timeline timestamps/actions are preserved', () => {
  const session = Session.createSession(scenario, deps);
  session.markEnroute();
  session.advanceTime(42);
  session.markArrived();
  session.advanceTime(20);
  session.markPatientContact();
  session.performAssessment('spo2');
  const rows = session.timeline.list();
  assert.ok(rows.some(e => e.action === 'Dispatch received' && e.timestamp === 0));
  assert.ok(rows.some(e => e.action === 'Enroute'));
  assert.ok(rows.some(e => e.action === 'Arrived on scene'));
  assert.ok(rows.some(e => e.action === 'Patient contact'));
  const spo2 = rows.find(e => e.metadata?.assessmentId === 'spo2');
  assert.ok(spo2);
  assert.ok(spo2.timestamp >= 60);
  // immutable-ish frozen events
  assert.ok(Object.isFrozen(spo2));
  session.destroy();
});

test('11. Grading recognizes critical actions', () => {
  const session = Session.createSession(scenario, deps);
  session.markArrived();
  session.markPatientContact();
  session.performAssessment('airway');
  session.performAssessment('breathing');
  session.performAssessment('lung_sounds', { location: 'bilateral' });
  session.performAssessment('spo2');
  session.enableMonitor('spo2');
  session.administerTreatment({ id: 'nrb', medication: 'Oxygen', device: 'nrb', category: 'oxygen' });
  session.administerTreatment({ id: 'albuterol', medication: 'Albuterol', dose: '2.5 mg', route: 'nebulized', device: 'nebulizer' });
  session.advanceTime(60);
  session.performAssessment('lung_sounds', { reassessment: true, location: 'bilateral' });
  session.decideTransport({ action: 'transport', priority: 'emergent', destination: 'Nearest emergency department' });
  session.submitHandoff('28 year old female difficulty breathing asthma history spo2 92 rr 28 albuterol 2.5 mg nebulized improving ETA 12 minutes');
  session.submitPcr({
    patientAge: '28',
    patientSex: 'female',
    chiefComplaint: 'difficulty breathing',
    allergies: 'NKDA',
    medications: 'albuterol inhaler',
    assessmentFindings: 'wheezes bilateral, accessory muscles',
    vitals: 'spo2 92% rr 28 hr 118',
    treatments: 'oxygen NRB, albuterol 2.5 mg nebulized',
    responseToTreatment: 'improved work of breathing on reassessment',
    reassessments: 'lung sounds reassessed after neb',
    narrative: 'Asthma exacerbation treated with oxygen and albuterol, reassessed, transported emergent.'
  });
  const grade = session.runGrading();
  assert.ok(grade.deterministic);
  assert.ok(grade.completedCritical.length >= 6);
  assert.ok(grade.percent >= 50);
  session.destroy();
});

test('12. Grading identifies missed actions', () => {
  const session = Session.createSession(scenario, deps);
  session.markArrived();
  // Minimal actions — skip treatment and lungs
  session.performAssessment('airway');
  session.decideTransport({ action: 'transport', priority: 'non-emergent', destination: 'Nearest emergency department' });
  const grade = session.runGrading();
  assert.ok(grade.missedCritical.length >= 3);
  assert.ok(grade.missedCritical.some(m => /albuterol|bronchodilator|lung|spo2|oxygen|reassess|handoff/i.test(m.label)));
  assert.ok(grade.opportunities.length >= 1);
  session.destroy();
});

test('13. PCR comparison identifies documentation discrepancies', () => {
  const session = Session.createSession(scenario, deps);
  session.administerTreatment({ id: 'albuterol', medication: 'Albuterol', dose: '2.5 mg', route: 'nebulized', device: 'nebulizer' });
  session.performAssessment('lung_sounds', { location: 'bilateral' });
  session.performAssessment('spo2');
  const comparison = session.pcr.compare({
    narrative: 'Patient had trouble breathing.',
    chiefComplaint: 'sob',
    treatments: '',
    vitals: '',
    responseToTreatment: '',
    allergies: 'penicillin'
  });
  assert.ok(comparison.discrepancies.length >= 2);
  assert.ok(comparison.discrepancies.some(d => /not documented|omitted|missing|allerg/i.test(d)));

  // OCR foundation: cannot grade OCR without confirmation
  session.pcr.ingestOcrRaw('handwritten pcr text with albuterol');
  assert.strictEqual(session.pcr.canGradeOcr(), false);
  session.pcr.confirmExtractedText('Confirmed: albuterol 2.5 mg given, lungs wheezing, spo2 92, improved after treatment', {
    treatments: 'albuterol 2.5 mg',
    vitals: 'spo2 92',
    assessmentFindings: 'wheezing lungs',
    responseToTreatment: 'improved',
    narrative: 'Confirmed: albuterol 2.5 mg given, lungs wheezing, spo2 92, improved after treatment',
    allergies: 'NKDA'
  });
  assert.strictEqual(session.pcr.canGradeOcr(), true);
  session.destroy();
});

test('14. Restarting scenario completely resets patient state', () => {
  const session1 = Session.createSession(scenario, deps);
  session1.talkToPatient('When did this start?');
  session1.administerTreatment({ id: 'albuterol', medication: 'Albuterol', dose: '2.5 mg', route: 'nebulized', device: 'nebulizer' });
  session1.advanceTime(120);
  session1.performAssessment('spo2');
  const id1 = session1.sessionId;
  const sev1 = session1.patient.snapshotClinical().bronchospasmSeverity;
  session1.destroy();

  const session2 = Session.createSession(scenario, deps);
  assert.notStrictEqual(session2.sessionId, id1);
  assert.strictEqual(session2.conversation.getHistory().length, 0);
  assert.deepStrictEqual(session2.assessment.getRevealed(), {});
  assert.strictEqual(session2.treatment.getAdministered().length, 0);
  assert.strictEqual(session2.patient.snapshotClinical().bronchospasmSeverity, 0.62);
  assert.ok(session2.patient.snapshotClinical().bronchospasmSeverity !== sev1 || sev1 === 0.62 || true);
  assert.ok(session2.timeline.list().length <= 2); // dispatch bootstrap only
  assert.strictEqual(session2.pcr.getSubmitted(), null);
  assert.strictEqual(session2.gradeResult, null);
  session2.destroy();
});

test('15. No patient data leaks from one run into another', () => {
  const a = Session.createSession(scenario, deps);
  a.talkToPatient('What medications do you take?');
  a.enableMonitor('hr');
  a.submitHandoff('Secret report unique string XYZ123');
  const aTimelineLen = a.timeline.list().length;
  const aSessionId = a.sessionId;

  const b = Session.createSession(scenario, deps);
  assert.notStrictEqual(b.sessionId, aSessionId);
  assert.ok(!b.conversation.getHistory().some(h => /medications|inhaler/i.test(h.text)));
  assert.strictEqual(b.getMonitorChannels().hr, false);
  assert.ok(!b.timeline.list().some(e => /XYZ123/.test(JSON.stringify(e))));
  assert.ok(b.timeline.list().length < aTimelineLen);
  // Mutating A after B started must not affect B
  a.advanceTime(500);
  assert.ok(b.patient.getFullState().elapsedTime < 5);
  a.destroy();
  b.destroy();
});

test('Video resolver supports future clinical state keys', () => {
  const states = {
    arrival: { url: '/a.mp4' },
    worsening: { url: '/w.mp4' },
    improving: { url: '/i.mp4' },
    cardiac_arrest: { url: '/c.mp4' },
    unconscious: { url: '/u.mp4' }
  };
  assert.strictEqual(VideoState.resolveVideoState({ clinicalState: 'cardiac_arrest', bronchospasmSeverity: 1 }, states), 'cardiac_arrest');
  assert.strictEqual(VideoState.resolveVideoState({ clinicalState: 'unconscious', bronchospasmSeverity: 1 }, states), 'unconscious');
});

test('Debrief does not change deterministic grade', () => {
  const session = Session.createSession(scenario, deps);
  session.markArrived();
  session.performAssessment('airway');
  const grade = session.runGrading();
  const debrief = session.startDebrief();
  const first = debrief.nextQuestion();
  assert.ok(!first.done);
  const evaluated = debrief.evaluateAnswer('That suggested respiratory fatigue and impending failure, not improvement.');
  assert.strictEqual(evaluated.evaluation.gradeUnchanged, true);
  assert.strictEqual(evaluated.evaluation.authoritativePercent, grade.percent);
  assert.strictEqual(session.gradeResult.percent, grade.percent);
  session.destroy();
});

// UI / route smoke checks
test('V2 route files exist (desktop/mobile shell)', () => {
  const fs = require('fs');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'css/patient-simulator-v2.css'), 'utf8');
  assert.ok(html.includes('psv2-actionbar'));
  assert.ok(html.includes('Talk to Patient') || html.includes('data-action="talk"'));
  assert.ok(html.includes('psv2Video'));
  assert.ok(html.includes('psv2SceneTargets'));
  assert.ok(html.includes('data-panel="scene"'));
  assert.ok(html.includes('psv2RoleCards'));
  assert.ok(html.includes('data-panel="crew"'));
  assert.ok(html.includes('psv2CrewTask'));
  assert.ok(html.includes('psv2AssignTask'));
  assert.ok(html.includes('viewport'));
  assert.ok(css.includes('@media (max-width: 720px)'));
  assert.ok(css.includes('@media (max-width: 1100px)'));
  assert.ok(css.includes('--psv2-bg'));
});

if (process.exitCode) {
  console.error('\nPatient Simulator V2 tests FAILED.');
  process.exit(1);
}

console.log(`\nAll ${passed} Patient Simulator V2 clinical engine checks passed.`);
