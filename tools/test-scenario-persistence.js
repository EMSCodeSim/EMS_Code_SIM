'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

class MemoryStorage {
  constructor(seed = new Map()) { this.store = seed; }
  getItem(key) { return this.store.has(String(key)) ? this.store.get(String(key)) : null; }
  setItem(key, value) { this.store.set(String(key), String(value)); }
  removeItem(key) { this.store.delete(String(key)); }
  clear() { this.store.clear(); }
  key(index) { return [...this.store.keys()][index] ?? null; }
  get length() { return this.store.size; }
}

function createRuntime(storageMap, search = '?case=stroke&mode=scenario&resume=1') {
  const listeners = new Map();
  const storage = new MemoryStorage(storageMap);
  class CustomEvent {
    constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
  }
  const window = {
    addEventListener(type, handler) {
      const handlers = listeners.get(type) || [];
      handlers.push(handler);
      listeners.set(type, handlers);
    },
    dispatchEvent(event) {
      (listeners.get(event.type) || []).forEach(handler => handler(event));
      return true;
    }
  };
  const context = vm.createContext({
    window,
    localStorage: storage,
    location: { search, pathname: '/vitals/pulse-ox-scenario.html' },
    URLSearchParams,
    CustomEvent,
    Date,
    JSON,
    console,
    structuredClone,
    setTimeout: callback => { callback(); return 1; },
    clearTimeout: () => {}
  });
  const load = relative => vm.runInContext(
    fs.readFileSync(path.join(process.cwd(), relative), 'utf8'),
    context,
    { filename: relative }
  );
  load('vitals/patient-record.js');
  load('vitals/scenario-session.js');
  return { context, window, storage };
}

const sharedStorage = new Map();
let runtime = createRuntime(sharedStorage);
let api = runtime.window.EMSCodeSimPatientRecord;
let session = runtime.window.EMSCodeSimScenarioSession;

const created = session.sync('stroke');
assert(created, 'Direct scenario entry should create or restore a patient record.');
assert.strictEqual(created.scenarioId, 'stroke');
assert.strictEqual(created.title, 'Possible Acute Stroke');

session.saveFinding('scene_size_up', 'Scene size-up completed: 7/9 guided decisions matched the expected sequence', {
  label: 'Scene size-up and first impression',
  answers: [
    { key: 'ppe', question: 'What PPE should you use?', selected: 'Gloves and eye protection as indicated', expected: 'Gloves and eye protection as indicated', correct: true },
    { key: 'spine', question: 'Is cervical-spine stabilization needed now?', selected: 'Manual stabilization is indicated', expected: 'Not indicated from the information currently available', correct: false }
  ],
  score: 7,
  maxScore: 9,
  accurate: false,
  reviewAtDebrief: true,
  source: 'guided-scenario-entry'
});

session.saveFinding('spo2', '91%', {
  learnerFinding: '91%',
  expectedFinding: '96%',
  accurate: false,
  correct: false,
  reviewAtDebrief: true,
  normality: 'normal',
  expectedNormality: 'normal',
  status: 'normal',
  source: 'scenario-spo2-simulator',
  locked: true
});

let patientRecord = JSON.parse(runtime.storage.getItem('emscodesim_patient_record_stroke'));
let scenarioState = JSON.parse(runtime.storage.getItem('emscodesim_scenario_stroke'));
assert.strictEqual(patientRecord.findings.scene_size_up.score, 7);
assert.strictEqual(patientRecord.findings.scene_size_up.maxScore, 9);
assert.strictEqual(patientRecord.findings.scene_size_up.answers.length, 2);
assert.strictEqual(scenarioState.findings.scene_size_up.answers[1].correct, false);
assert.strictEqual(patientRecord.findings.spo2.value, '91%');
assert.strictEqual(patientRecord.findings.spo2.expectedFinding, '96%');
assert.strictEqual(patientRecord.findings.spo2.accurate, false);
assert.strictEqual(scenarioState.findings.spo2.value, '91%');
assert.strictEqual(scenarioState.lastFinding, 'spo2');

session.saveFinding('airway', 'Airway patent; no obstruction or secretions.', {
  normality: 'normal', status: 'normal', source: '/vitals/airway-assessment.html'
});
session.addTreatment({ name: 'Continue monitoring', treatment: 'monitor', context: 'airway' });
session.addReassessment({ response: 'unchanged', nextAction: 'monitor' });

patientRecord = JSON.parse(runtime.storage.getItem('emscodesim_patient_record_stroke'));
scenarioState = JSON.parse(runtime.storage.getItem('emscodesim_scenario_stroke'));
assert.strictEqual(patientRecord.findings.airway.value, 'Airway patent; no obstruction or secretions.');
assert.strictEqual(patientRecord.treatments.at(-1).treatment, 'monitor');
assert.strictEqual(scenarioState.treatments.at(-1).context, 'airway');
assert.strictEqual(scenarioState.reassessments.at(-1).nextAction, 'monitor');
assert(Array.isArray(patientRecord.careLog), 'Patient record should include a chronological care log.');
assert(patientRecord.careLog.some(event => event.key === 'scene_size_up' && event.type === 'finding'));
assert(patientRecord.careLog.some(event => event.key === 'spo2' && event.category === 'vital'));
assert(patientRecord.careLog.some(event => event.type === 'treatment' && event.category === 'treatment'));
assert(patientRecord.careLog.some(event => event.type === 'reassessment' && event.category === 'treatment'));
assert.strictEqual(scenarioState.careLog.length, patientRecord.careLog.length, 'Scenario state should mirror the complete care log.');

const firstPulse = session.saveFinding('pulse', '88/min; regular; strong', { source: 'persistence-test', normality: 'normal' });
const secondPulse = session.saveFinding('pulse', '104/min; regular; weak', { source: 'persistence-test-reassessment', normality: 'not-normal' });
patientRecord = JSON.parse(runtime.storage.getItem('emscodesim_patient_record_stroke'));
const pulseEvents = patientRecord.careLog.filter(event => event.key === 'pulse');
assert.strictEqual(pulseEvents.length, 2, 'Repeat vital signs should create separate chronological events.');
assert.strictEqual(patientRecord.findings.pulse.value, secondPulse.value, 'The findings summary should retain the newest pulse.');
assert.strictEqual(pulseEvents[0].value, firstPulse.value);
assert.strictEqual(pulseEvents[1].value, secondPulse.value);

session.saveFinding('sample_history', 'SAMPLE history obtained', { details: 'S: weakness. A: NKDA. M: insulin. P: diabetes. L: skipped breakfast. E: became confused at work.', source: 'sample-history-test' });
session.saveFinding('pain_opqrst', 'OPQRST symptom assessment obtained', { details: 'O: sudden. P: exertion. Q: pressure. R: left arm. S: 8/10. T: 20 minutes.', source: 'opqrst-test' });
patientRecord = JSON.parse(runtime.storage.getItem('emscodesim_patient_record_stroke'));
assert(patientRecord.findings.sample, 'SAMPLE should use the canonical history key.');
assert(patientRecord.findings.pain, 'OPQRST should use the canonical pain/history key.');
assert(patientRecord.careLog.some(event => event.key === 'sample' && event.category === 'history'));
assert(patientRecord.careLog.some(event => event.key === 'pain' && event.category === 'history'));

// Partner assignments must persist while the learner navigates away and resolve on the next scenario page load.
session.assignPartnerTask({ key: 'blood_pressure', label: 'Blood pressure', value: '148/92 mmHg', delaySeconds: 30 }, 'stroke');
let partnerTasks = session.readPartnerTasks('stroke');
assert.strictEqual(partnerTasks.blood_pressure.status, 'pending');
assert(partnerTasks.blood_pressure.assignedAt && partnerTasks.blood_pressure.dueAt, 'Partner tasks should store assignment and expected-completion times.');
partnerTasks.blood_pressure.dueAt = new Date(Date.now() - 1000).toISOString();
session.writePartnerTasks('stroke', partnerTasks);

runtime = createRuntime(sharedStorage);
api = runtime.window.EMSCodeSimPatientRecord;
session = runtime.window.EMSCodeSimScenarioSession;
partnerTasks = session.readPartnerTasks('stroke');
patientRecord = api.load('stroke');
assert.strictEqual(partnerTasks.blood_pressure.status, 'complete', 'A due partner task should complete after navigation/page restoration.');
assert.strictEqual(patientRecord.findings.blood_pressure.value, '148/92 mmHg');
assert.strictEqual(patientRecord.findings.blood_pressure.source, 'partner-assignment');
assert(patientRecord.careLog.some(event => event.key === 'blood_pressure' && event.source === 'partner-assignment'), 'Partner vital should be written to the care log.');

// Partner skills must remain sequential: the second skill cannot start until the first is complete.
session.assignPartnerTask({ key: 'pulse', label: 'Pulse', value: '92/min; regular; strong', delaySeconds: 30 }, 'stroke');
session.assignPartnerTask({ key: 'respirations', label: 'Respirations', value: '18/min; regular; unlabored', delaySeconds: 30 }, 'stroke');
partnerTasks = session.readPartnerTasks('stroke');
assert.strictEqual(partnerTasks.pulse.status, 'pending');
assert.strictEqual(partnerTasks.respirations.status, 'queued');
partnerTasks.pulse.dueAt = new Date(Date.now() - 1000).toISOString();
session.writePartnerTasks('stroke', partnerTasks);
session.resolvePartnerTasks('stroke');
partnerTasks = session.readPartnerTasks('stroke');
patientRecord = api.load('stroke');
assert.strictEqual(patientRecord.findings.pulse.value, '92/min; regular; strong');
assert.strictEqual(partnerTasks.pulse.status, 'complete');
assert.strictEqual(partnerTasks.respirations.status, 'pending', 'The next queued partner skill should begin only after the first finishes.');
assert(partnerTasks.respirations.startedAt && partnerTasks.respirations.dueAt);

// A completed task whose finding was lost must be repaired automatically.
delete patientRecord.findings.pulse;
patientRecord.careLog = patientRecord.careLog.filter(event => !(event.key === 'pulse' && event.source === 'partner-assignment'));
runtime.storage.setItem('emscodesim_patient_record_stroke', JSON.stringify(patientRecord));
session.resolvePartnerTasks('stroke');
patientRecord = api.load('stroke');
assert.strictEqual(patientRecord.findings.pulse.value, '92/min; regular; strong', 'Completed partner results should be recovered if the patient record loses them.');

// Simulate a partial storage loss: the patient record loses SpO2 while scenario state retains it.
delete patientRecord.findings.spo2;
runtime.storage.setItem('emscodesim_patient_record_stroke', JSON.stringify(patientRecord));

runtime = createRuntime(sharedStorage);
api = runtime.window.EMSCodeSimPatientRecord;
session = runtime.window.EMSCodeSimScenarioSession;
session.sync('stroke');

const restored = api.load('stroke');
assert.strictEqual(restored.findings.spo2.value, '91%', 'Scenario state should restore a missing learner-entered finding.');
assert.strictEqual(restored.findings.spo2.expectedFinding, '96%');
assert.strictEqual(restored.findings.spo2.accurate, false);
assert.strictEqual(session.readState('stroke').findings.spo2.value, '91%');

console.log('Scenario persistence test passed: direct entry, mirrored saves, persistent partner tasks, treatment/reassessment, and recovery all work.');
