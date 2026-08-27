'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'vitals/scenario-scorecard-challenge.js'), 'utf8');
const registry = fs.readFileSync(path.join(root, 'vitals/scenario-tool-registry.js'), 'utf8');
const redirects = fs.readFileSync(path.join(root, '_redirects'), 'utf8');
const debrief = fs.readFileSync(path.join(root, 'vitals/scenario-debrief.html'), 'utf8');

assert(registry.includes('/vitals/scenario-scorecard-challenge.js'), 'tool registry must load scorecard challenge module');
assert(debrief.includes('/vitals/scenario-scorecard-challenge.js'), 'debrief page must load scorecard challenge module');
assert(/\/sim\/:scenario\s+\/vitals\/visual-patient\.html\?case=:scenario/.test(redirects), 'short /sim/:scenario challenge URL must redirect');

const documentStub = {
  readyState: 'complete',
  body: {
    prepend() {},
    appendChild() {},
    classList: { add() {}, remove() {}, toggle() {} }
  },
  head: { appendChild() {} },
  getElementById() { return null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement(tag) {
    return {
      tagName: String(tag).toUpperCase(),
      style: {},
      dataset: {},
      classList: { add() {}, remove() {}, toggle() {} },
      setAttribute() {},
      appendChild() {},
      remove() {},
      addEventListener() {},
      querySelector() { return null; },
      insertAdjacentElement() {}
    };
  },
  addEventListener() {}
};

const storage = new Map();
const context = {
  window: {},
  document: documentStub,
  location: { search: '?case=horse_crush&ref=challenge&score=88&user=Alex', href: 'https://emscodesim.com/vitals/visual-patient.html?case=horse_crush&ref=challenge&score=88&user=Alex', pathname: '/vitals/visual-patient.html', hash: '' },
  history: { replaceState() {} },
  URL,
  URLSearchParams,
  sessionStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); }
  },
  navigator: { clipboard: { writeText: async () => {} } },
  console,
  setTimeout,
  clearTimeout,
  requestAnimationFrame(cb) { return setTimeout(cb, 0); }
};
context.window = context;
context.globalThis = context;

vm.runInNewContext(src, context, { timeout: 2000 });

assert(context.EMSCodeSimScorecardChallenge, 'module must export EMSCodeSimScorecardChallenge');
assert.strictEqual(context.EMSCodeSimScorecardChallenge.clinicalTitle(96).title, 'Clinical Specialist');
assert.strictEqual(context.EMSCodeSimScorecardChallenge.clinicalTitle(69).title, 'BLS Remediation Needed');
assert.strictEqual(
  context.EMSCodeSimScorecardChallenge.buildShareUrl({ scenarioId: 'horse_crush', score: 91, user: 'Sam' }),
  'https://emscodesim.com/sim/horse_crush?ref=challenge&score=91&user=Sam'
);

const saved = context.EMSCodeSimScorecardChallenge.readChallenge();
assert(saved, 'challenge query params must hydrate session state');
assert.strictEqual(saved.score, 88);
assert.strictEqual(saved.user, 'Alex');
assert.strictEqual(saved.scenarioId, 'horse_crush');

console.log('Scenario scorecard challenge contract OK');
