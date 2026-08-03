'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

class MemoryStorage {
  constructor() { this.store = new Map(); }
  getItem(key) { return this.store.has(String(key)) ? this.store.get(String(key)) : null; }
  setItem(key, value) { this.store.set(String(key), String(value)); }
  removeItem(key) { this.store.delete(String(key)); }
}

function runtime(storage) {
  const listeners = new Map();
  class CustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }
  const window = {
    addEventListener(type, handler) { const list = listeners.get(type) || []; list.push(handler); listeners.set(type, list); },
    dispatchEvent(event) { (listeners.get(event.type) || []).forEach(handler => handler(event)); return true; }
  };
  const context = vm.createContext({
    window, localStorage: storage, location: { search: '?case=asthma', pathname: '/vitals/visual-patient.html' },
    URLSearchParams, CustomEvent, Date, JSON, console, structuredClone,
    setTimeout: () => 1, clearTimeout: () => {}
  });
  const load = file => vm.runInContext(fs.readFileSync(path.join(process.cwd(), file), 'utf8'), context, { filename: file });
  load('vitals/patient-record.js');
  load('vitals/scenario-definitions.js');
  load('vitals/scenario-session.js');
  return window;
}

const storage = new MemoryStorage();
let window = runtime(storage);
let api = window.EMSCodeSimPatientRecord;
let session = window.EMSCodeSimScenarioSession;

session.sync('asthma');
session.saveFinding('airway', 'Patent', { normality: 'normal', source: 'recovery-test' });
session.addTreatment({ name: 'Oxygen', treatment: 'oxygen', source: 'recovery-test' });

const recordKey = 'emscodesim_patient_record_asthma';
const original = api.load('asthma');
const originalEvents = original.careLog.length;
assert(storage.getItem(`${recordKey}_shadow`), 'Patient records should have a valid shadow copy.');
assert(storage.getItem(`${recordKey}_backup`), 'Patient records should preserve a last-known-good backup after subsequent saves.');

storage.setItem(recordKey, '{broken-json');
const recovered = api.load('asthma');
assert.strictEqual(recovered.findings.airway.value, 'Patent');
assert.strictEqual(recovered.treatments.at(-1).treatment, 'oxygen');
assert.strictEqual(recovered.careLog.length, originalEvents, 'Recovery must not duplicate care events.');
assert(api.recoveryStatus(), 'A recovery status should be recorded for the launcher.');
assert.doesNotThrow(() => JSON.parse(storage.getItem(recordKey)), 'The damaged primary patient record should be repaired.');

const stateKey = 'emscodesim_scenario_asthma';
session.writeState('asthma', { ...session.readState('asthma'), done: ['scene', 'primary'] });
session.writeState('asthma', { ...session.readState('asthma'), done: ['scene', 'primary', 'vitals'] });
storage.setItem(stateKey, 'not-json');
const recoveredState = session.readState('asthma');
assert(recoveredState.done.includes('vitals'), 'Scenario progress should recover from its protected copy.');
assert.doesNotThrow(() => JSON.parse(storage.getItem(stateKey)), 'The damaged scenario state should be repaired.');

session.assignPartnerTask({ key: 'blood_pressure', label: 'Blood pressure', value: '132/84 mmHg', delaySeconds: 20 }, 'asthma');
let tasks = session.readPartnerTasks('asthma');
tasks.blood_pressure.status = 'completing';
tasks.blood_pressure.dueAt = new Date(Date.now() - 1000).toISOString();
session.writePartnerTasks('asthma', tasks);
storage.setItem('emscodesim_partner_tasks_asthma', '{partial-write');

window = runtime(storage);
api = window.EMSCodeSimPatientRecord;
session = window.EMSCodeSimScenarioSession;
session.resolvePartnerTasks('asthma');
tasks = session.readPartnerTasks('asthma');
const finalRecord = api.load('asthma');
assert.strictEqual(tasks.blood_pressure.status, 'complete', 'An interrupted completing partner task should finish after recovery.');
assert.strictEqual(finalRecord.findings.blood_pressure.value, '132/84 mmHg');
const bpEvents = finalRecord.careLog.filter(event => event.key === 'blood_pressure' && event.source === 'partner-assignment');
assert.strictEqual(bpEvents.length, 1, 'Recovered partner completion must not create duplicate care-log events.');

console.log('Scenario crash recovery test passed: patient record, progress, and interrupted partner tasks recover without duplicate events.');
