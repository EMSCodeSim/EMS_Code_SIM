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

const listeners = new Map();
const localStorage = new MemoryStorage();
class CustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }
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
  localStorage,
  location: { search: '?case=asthma&mode=scenario&resume=1', pathname: '/vitals/visual-patient.html' },
  URLSearchParams,
  CustomEvent,
  Date,
  JSON,
  Math,
  console,
  structuredClone,
  setTimeout: callback => { callback(); return 1; },
  clearTimeout: () => {}
});

for (const relative of ['vitals/patient-record.js', 'vitals/scenario-definitions.js', 'vitals/scenario-session.js']) {
  vm.runInContext(fs.readFileSync(path.join(process.cwd(), relative), 'utf8'), context, { filename: relative });
}

const api = window.EMSCodeSimPatientRecord;
const session = window.EMSCodeSimScenarioSession;
session.sync('asthma');

session.saveFinding('scene_size_up', 'Scene safe; one patient; standard PPE', {
  recordedAt: '2026-08-01T18:00:00-06:00', source: 'care-log-test'
});
session.saveFinding('sample_history', 'SAMPLE history obtained', {
  recordedAt: '2026-08-01T18:01:00-06:00',
  details: 'S: dyspnea. A: NKDA. M: albuterol. P: asthma. L: lunch. E: worsened today.',
  source: 'care-log-test'
});
session.saveFinding('pain_opqrst', 'OPQRST obtained', {
  recordedAt: '2026-08-01T18:02:00-06:00',
  details: 'O: gradual. P: exertion. Q: tightness. R: chest. S: 6/10. T: one hour.',
  source: 'care-log-test'
});
session.saveFinding('pulse', '104/min; regular; strong', {
  recordedAt: '2026-08-01T18:03:00-06:00', source: 'care-log-test'
});
session.saveFinding('pulse', '96/min; regular; strong', {
  recordedAt: '2026-08-01T18:04:00-06:00', source: 'care-log-test-reassessment'
});
session.addTreatment({
  name: 'Oxygen by nasal cannula', description: 'Oxygen by nasal cannula at 2 L/min',
  time: '2026-08-01T18:05:00-06:00', source: 'care-log-test'
});
session.addReassessment({
  response: 'Breathing improved', nextAction: 'Continue monitoring',
  time: '2026-08-01T18:06:00-06:00', source: 'care-log-test'
});

const record = api.active();
const all = api.listCareLog(record, 'all');
const vitals = api.listCareLog(record, 'vitals');
const treatments = api.listCareLog(record, 'treatments');

assert.strictEqual(all.length, 7, 'All findings and care actions should appear in one log.');
assert.deepStrictEqual(Array.from(all.map(event => event.recordedAt)), [
  '2026-08-01T18:00:00-06:00',
  '2026-08-01T18:01:00-06:00',
  '2026-08-01T18:02:00-06:00',
  '2026-08-01T18:03:00-06:00',
  '2026-08-01T18:04:00-06:00',
  '2026-08-01T18:05:00-06:00',
  '2026-08-01T18:06:00-06:00'
], 'Care log should preserve the exact order of patient care.');
assert.strictEqual(vitals.length, 2, 'Repeat vital signs should remain separate entries.');
assert.deepStrictEqual(Array.from(vitals.map(event => event.value)), ['104/min; regular; strong', '96/min; regular; strong']);
assert.strictEqual(treatments.length, 2, 'Treatment filter should include the treatment and its reassessment.');
assert.strictEqual(treatments[0].type, 'treatment');
assert.strictEqual(treatments[1].type, 'reassessment');
assert(all.some(event => event.key === 'sample' && event.category === 'history'), 'SAMPLE should be present in the care log.');
assert(all.some(event => event.key === 'pain' && event.category === 'history'), 'OPQRST should be present in the care log.');
assert.strictEqual(record.findings.pulse.value, '96/min; regular; strong', 'Finding summary should keep the latest value while the log keeps both.');

console.log('Patient-care log test passed: history, repeat vitals, treatment, reassessment, filtering, and time order are preserved.');
