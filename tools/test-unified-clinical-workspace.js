const fs=require('fs');
const html=fs.readFileSync('vitals/visual-patient.html','utf8');
const js=fs.readFileSync('vitals/visual-patient.js','utf8');
const css=fs.readFileSync('vitals/visual-patient.css','utf8');
for (const token of ['persistentClinicalBar','clinicalTaskDrawer','sheet-patient-context','treatmentSearch']) if(!html.includes(token)) throw new Error('Missing '+token);
for (const token of ['renderUnifiedClinicalBar','enforceSingleOpen','filterTreatmentMenu']) if(!js.includes(token)) throw new Error('Missing '+token);
if(!css.includes('Unified phone-first clinical workspace')) throw new Error('Missing workspace CSS');
console.log('Unified clinical workspace UI test passed');
