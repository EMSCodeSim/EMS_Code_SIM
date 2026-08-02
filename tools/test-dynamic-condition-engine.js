const fs=require('fs');
const src=fs.readFileSync('vitals/visual-patient.js','utf8');
const required=[
  'const CONDITION_STAGES =',
  "evaluatePatientCondition('patient-home')",
  "type:'condition_change'",
  "source:'dynamic-condition-engine'",
  "PATIENT CONDITION CHANGE",
  "pendingTargets",
  "blockedBy"
];
const missing=required.filter(x=>!src.includes(x));
if(missing.length){console.error('Dynamic condition engine missing:',missing);process.exit(1)}
for(const id of ['asthma','stroke','hypoglycemia','trauma','pediatric']){
  const block=src.match(new RegExp(`${id}: \\[([\\s\\S]*?)\\n    \\]`));
  if(!block||!(block[1].match(/after:/g)||[]).length){console.error('Missing condition stages for',id);process.exit(1)}
}
console.log('Dynamic condition engine checks passed.');
