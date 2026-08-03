'use strict';
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('vitals/scenario-definitions.js', 'utf8');
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'vitals/scenario-definitions.js' });
const definitions = sandbox.window.EMSCodeSimScenarioDefinitions;
if (!definitions) throw new Error('Scenario definitions did not load.');
const errors = definitions.validate();
if (errors.length) throw new Error(`Scenario definition errors:\n- ${errors.join('\n- ')}`);
for (const id of Object.keys(definitions.CATALOG)) {
  const scenario = definitions.get(id);
  if (!scenario.profile?.sample?.detail) throw new Error(`${id}: SAMPLE history is missing.`);
  if (!scenario.patient?.primary) throw new Error(`${id}: primary assessment display is missing.`);
  if (!scenario.phasePlan?.requiredFindings?.length) throw new Error(`${id}: required assessment plan is missing.`);
  if (!scenario.treatmentPlans?.length) throw new Error(`${id}: treatment plan is missing.`);
}
console.log(`Scenario definition validation passed for ${Object.keys(definitions.CATALOG).length} scenarios.`);
