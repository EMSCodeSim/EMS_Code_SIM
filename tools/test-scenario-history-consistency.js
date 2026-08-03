'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const definitionsSource = fs.readFileSync(path.join(__dirname, '..', 'vitals', 'scenario-definitions.js'), 'utf8');
const source = fs.readFileSync(path.join(__dirname, '..', 'vitals', 'scenario-runtime.js'), 'utf8');
const sandbox = {
  window: {},
  document: { addEventListener() {}, documentElement: { classList: { add() {} } }, body: null },
  setTimeout() {},
  console
};
sandbox.window.addEventListener = () => {};
vm.createContext(sandbox);
vm.runInContext(definitionsSource, sandbox);
vm.runInContext(source, sandbox);

const profiles = sandbox.window.EMSCodeSimScenarioRuntime.PROFILES;
const expected = {
  asthma: [/shortness of breath/i, /albuterol/i, /asthma/i, /dust/i],
  stroke: [/speech/i, /right/i, /last known well|last-known-well/i, /09:10/i],
  hypoglycemia: [/confusion/i, /insulin/i, /skipped breakfast|no food/i, /diabetes/i],
  trauma: [/collision/i, /chest pain/i, /abdominal pain/i, /steering wheel/i],
  pediatric: [/fever/i, /cough/i, /work of breathing|breathing/i, /caregiver/i]
};
const labels = ['S:', 'A:', 'M:', 'P:', 'L:', 'E:'];

for (const [id, profile] of Object.entries(profiles)) {
  if (!profile.sample) throw new Error(`${id}: missing scenario-specific SAMPLE history`);
  for (const label of labels) {
    if (!profile.sample.detail.includes(label)) throw new Error(`${id}: SAMPLE detail missing ${label}`);
  }
  const combined = `${profile.dispatch} ${profile.scene} ${profile.sample.description} ${profile.sample.detail} ${profile.sample.example}`;
  for (const pattern of expected[id]) {
    if (!pattern.test(combined)) throw new Error(`${id}: expected history detail ${pattern}`);
  }
  if (!profile.sample.normality || !profile.sample.priority || !profile.sample.action) {
    throw new Error(`${id}: missing classification, priority, or action`);
  }
}

console.log(`Scenario history consistency passed for ${Object.keys(profiles).length} profiles.`);
