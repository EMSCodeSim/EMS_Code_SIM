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

session.saveFinding('spo2', '96%', {
  normality: 'normal',
  status: 'normal',
  source: 'scenario-spo2-simulator',
  locked: true
});

let patientRecord = JSON.parse(runtime.storage.getItem('emscodesim_patient_record_stroke'));
let scenarioState = JSON.parse(runtime.storage.getItem('emscodesim_scenario_stroke'));
assert.strictEqual(patientRecord.findings.spo2.value, '96%');
assert.strictEqual(scenarioState.findings.spo2.value, '96%');
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

// Simulate a partial storage loss: the patient record loses SpO2 while scenario state retains it.
delete patientRecord.findings.spo2;
runtime.storage.setItem('emscodesim_patient_record_stroke', JSON.stringify(patientRecord));

runtime = createRuntime(sharedStorage);
api = runtime.window.EMSCodeSimPatientRecord;
session = runtime.window.EMSCodeSimScenarioSession;
session.sync('stroke');

const restored = api.load('stroke');
assert.strictEqual(restored.findings.spo2.value, '96%', 'Scenario state should restore a missing patient-record finding.');
assert.strictEqual(session.readState('stroke').findings.spo2.value, '96%');

console.log('Scenario persistence test passed: direct entry, mirrored saves, treatment/reassessment, and recovery all work.');
