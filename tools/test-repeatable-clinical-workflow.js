const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'vitals/visual-patient.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'vitals/visual-patient.html'), 'utf8');
const checks = [
  ['chief complaint sorter', js.includes('Quick sort by chief complaint') && js.includes('COMPLAINT_SORTS')],
  ['repeat vital action', js.includes("complete ? 'Reassess' : 'Perform'") && js.includes('Assign reassessment')],
  ['repeat treatment action', js.includes('Give another dose') && js.includes('Perform again')],
  ['EMT care library', js.includes('EMT_TREATMENT_LIBRARY') && js.includes("id:'aspirin'") && js.includes("id:'naloxone'") && js.includes("id:'cpr_aed'")],
  ['transport remains treatment', js.includes('buildTransportTreatment') && !html.includes('data-panel="transportPanel"')],
  ['end and reset controls', html.includes('endScenarioFromProgress') && html.includes('resetScenarioFromProgress') && js.includes('function resetScenario()')]
];
const failed = checks.filter(([,ok]) => !ok);
if (failed.length) { console.error('Failed:', failed.map(([name]) => name).join(', ')); process.exit(1); }
console.log('Repeatable clinical workflow checks passed.');
