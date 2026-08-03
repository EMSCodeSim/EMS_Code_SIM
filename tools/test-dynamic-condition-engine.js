'use strict';
const fs=require('fs');
const vm=require('vm');
const definitions=fs.readFileSync('vitals/scenario-definitions.js','utf8');
const visual=fs.readFileSync('vitals/visual-patient.js','utf8');
const sandbox={window:{},console};
vm.createContext(sandbox);
vm.runInContext(definitions,sandbox);
const stages=sandbox.window.EMSCodeSimScenarioDefinitions?.CONDITION_STAGES;
if(!stages){console.error('Scenario condition definitions are unavailable.');process.exit(1)}
for(const id of ['asthma','stroke','hypoglycemia','trauma','pediatric']){
  if(!Array.isArray(stages[id])||!stages[id].length||!stages[id].every(stage=>Number.isFinite(stage.after))){
    console.error('Missing or invalid condition stages for',id);process.exit(1);
  }
}
const required=["evaluatePatientCondition('patient-home')","type:'condition_change'","source:'dynamic-condition-engine'","PATIENT CONDITION CHANGE","pendingTargets","blockedBy"];
const missing=required.filter(x=>!visual.includes(x));
if(missing.length){console.error('Dynamic condition engine missing:',missing);process.exit(1)}
console.log('Dynamic condition engine checks passed.');
