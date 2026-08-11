'use strict';

const fs = require('fs');
const assert = require('assert');

const js = fs.readFileSync('vitals/scenario-learning-upgrade.js', 'utf8');
const css = fs.readFileSync('vitals/scenario-learning-upgrade.css', 'utf8');
const launcher = fs.readFileSync('vitals/scenario-launcher.js', 'utf8');

for (const caseId of ['horse_crush', 'asthma', 'stroke', 'hypoglycemia']) {
  assert(js.includes(`${caseId}: {`) || js.includes(`${caseId}:{`), `Reasoning engine is missing ${caseId}`);
}

for (const asset of [
  '/vitals/assets/horse-crush/patient-initial.webp',
  '/vitals/assets/scenario-asthma-learning.svg',
  '/vitals/assets/scenario-stroke-learning.svg',
  '/vitals/assets/scenario-hypoglycemia-learning.svg'
]) {
  assert(js.includes(asset) || launcher.includes(asset), `Finished scenario artwork is not referenced: ${asset}`);
}

assert(js.includes('reasoningDecisions'), 'Clinical choices must persist in dedicated reasoning metadata.');
assert(js.includes('setDocumentation'), 'Clinical choices must save through patient documentation metadata.');
assert(!js.includes("saveFinding(checkpoint") && !js.includes("setFinding?.(key"), 'Reasoning choices must not be stored as patient findings.');
assert(!js.includes("normality: option") && !js.includes("status: option"), 'Learner correctness must not create normal/abnormal patient findings.');
assert(js.includes("mode()!=='assessment'") && js.includes('Correctness and rationale stay hidden until call review.'), 'Assessment Mode must defer correctness feedback until review.');
assert(js.includes('Discover → Decide → Treat → Reassess'), 'Patient screen must reinforce the discovery-to-reassessment learning loop.');
assert(js.includes('blood_glucose') && js.includes('Last known well') && js.includes('distal CSM') && js.includes('work of breathing'), 'Core case-specific reasoning objectives are missing.');
assert(css.includes('.clinical-reasoning-board') && css.includes('.reasoning-options'), 'Reasoning UI styles are missing.');

console.log('Scenario reasoning regression checks passed for horse crush, asthma, stroke, and hypoglycemia.');
