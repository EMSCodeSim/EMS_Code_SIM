'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const window = {};
const context = { window, Date, Object, Array, String, Boolean, Number, Math };
vm.runInNewContext(fs.readFileSync(path.join(process.cwd(), 'vitals/scenario-definitions.js'), 'utf8'), context, { filename: 'vitals/scenario-definitions.js' });
vm.runInNewContext(fs.readFileSync(path.join(process.cwd(), 'vitals/scenario-phase-model.js'), 'utf8'), context, { filename: 'vitals/scenario-phase-model.js' });

const phases = window.EMSCodeSimScenarioPhases;
assert(phases, 'Scenario phase model should be available.');

const at = second => `2026-08-02T10:00:${String(second).padStart(2, '0')}.000Z`;
const finding = recordedAt => ({ value: 'Recorded', recordedAt });
const record = {
  id: 'asthma',
  scenarioId: 'asthma',
  findings: {
    scene_size_up: finding(at(1)),
    airway: finding(at(2)),
    breathing: finding(at(3)),
    perfusion: finding(at(4)),
    respirations: finding(at(5)),
    breath_sounds: finding(at(6)),
    spo2: finding(at(7))
  },
  treatments: [{ treatment: 'oxygen', recordedAt: at(20) }],
  reassessments: [{ response: 'improved', recordedAt: at(15) }],
  impressions: { primary: 'Asthma exacerbation', action: 'Rapid transport' },
  documentation: { handoff: 'MIST handoff complete' }
};

let result = phases.evaluate(record);
assert.strictEqual(result.phases.find(phase => phase.id === 'treatment').complete, true, 'Treatment should be its own completed phase.');
assert.strictEqual(result.phases.find(phase => phase.id === 'reassessment').complete, false, 'A reassessment recorded before treatment must not satisfy post-treatment reassessment.');
assert.strictEqual(result.essentialComplete, false);

record.reassessments.push({ response: 'SpO2 improved', recordedAt: at(30) });
result = phases.evaluate(record);
assert.strictEqual(result.phases.find(phase => phase.id === 'reassessment').complete, true);
assert.strictEqual(result.essentialComplete, true, 'Patient-specific essential actions should complete without optional/not-indicated tools.');
assert.strictEqual(phases.classification('asthma', 'blood_pressure'), 'appropriate');
assert.strictEqual(phases.classification('asthma', 'rule_of_nines'), 'not-indicated');

record.documentation.debrief = { savedAt: at(40) };
result = phases.evaluate(record);
assert.strictEqual(result.phases.find(phase => phase.id === 'debrief').complete, true);

console.log('Scenario phase test passed: patient-specific requirements, treatment, reassessment, transport, handoff, and debrief are tracked independently.');
