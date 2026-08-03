'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const window = {};
const context = { window, Date, Object, Array, String, Boolean, Number, Math, Set, Map };
vm.runInNewContext(fs.readFileSync(path.join(process.cwd(), 'vitals/scenario-definitions.js'), 'utf8'), context, { filename: 'vitals/scenario-definitions.js' });
vm.runInNewContext(fs.readFileSync(path.join(process.cwd(), 'vitals/scenario-phase-model.js'), 'utf8'), context, { filename: 'vitals/scenario-phase-model.js' });

const phases = window.EMSCodeSimScenarioPhases;
const at = second => `2026-08-02T10:00:${String(second).padStart(2, '0')}.000Z`;
const base = {
  id: 'asthma', scenarioId: 'asthma',
  findings: {
    scene_size_up: { value: 'Complete' }, airway: { value: 'Patent' }, breathing: { value: 'Labored' }, perfusion: { value: 'Adequate' },
    respirations: { value: '30/min' }, breath_sounds: { value: 'Wheezes' }, spo2: { value: '89%' }
  },
  impressions: { primary: 'Asthma exacerbation', action: 'Priority transport' },
  documentation: { handoff: 'Complete' },
  treatments: [{ treatment: 'Bronchodilator', targetKeys: ['breathing','breath_sounds','respirations','spo2'], reassessmentRequired: true, recordedAt: at(20) }],
  reassessments: []
};

let status = phases.targetedReassessmentStatus(base);
assert.strictEqual(status.total, 4);
assert.deepStrictEqual(Array.from(status.missing, item => item.key).sort(), ['breath_sounds','breathing','respirations','spo2']);
assert.strictEqual(status.complete, false);

base.reassessments.push({ targetKeys: ['spo2'], comparison: 'improved', recordedAt: at(30) });
status = phases.targetedReassessmentStatus(base);
assert.strictEqual(status.completed, 1, 'One SpO2 reassessment must not satisfy all bronchodilator targets.');
assert.strictEqual(status.complete, false);

base.reassessments.push({ targetKeys: ['breathing'], comparison: 'improved', recordedAt: at(31) });
base.reassessments.push({ targetKeys: ['breath_sounds'], comparison: 'improved', recordedAt: at(32) });
base.reassessments.push({ targetKeys: ['respirations'], comparison: 'improved', recordedAt: at(33) });
status = phases.targetedReassessmentStatus(base);
assert.strictEqual(status.complete, true, 'Every affected treatment target should require a post-treatment reassessment.');
assert.strictEqual(phases.evaluate(base).essentialComplete, true);

base.treatments.push({ treatment: 'Oxygen', targetKeys: ['breathing','respirations','spo2'], reassessmentRequired: true, recordedAt: at(40) });
status = phases.targetedReassessmentStatus(base);
assert.strictEqual(status.complete, false, 'A newer treatment should make its targets due again.');
assert.deepStrictEqual(Array.from(status.missing, item => item.key).sort(), ['breathing','respirations','spo2']);

base.reassessments.push({ targetKeys: ['breathing','respirations','spo2'], comparison: 'improved', recordedAt: at(50) });
status = phases.targetedReassessmentStatus(base);
assert.strictEqual(status.complete, true, 'One formal reassessment may cover multiple targets only when those targets are explicitly recorded.');

base.treatments.push({ treatment: 'Unsafe intervention', targetKeys: ['airway'], reassessmentRequired: false, classification: 'contraindicated', recordedAt: at(55) });
assert.strictEqual(phases.targetedReassessmentStatus(base).complete, true, 'Contraindicated or unnecessary decisions should be graded but should not create a false clinical reassessment requirement.');

console.log('Targeted reassessment test passed: every treatment target must be formally reassessed after the most recent relevant intervention.');
