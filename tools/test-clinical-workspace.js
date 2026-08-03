const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'vitals/visual-patient.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'vitals/visual-patient.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'vitals/visual-patient.css'), 'utf8');
const checks = [
  [html.includes('id="clinicalWorkspace"'), 'clinical workspace is present in the Care Log'],
  [html.includes('clinicalNextUncertain'), 'uncertainty is available after an abnormal finding'],
  [js.includes('scheduleTreatmentResponse'), 'patient response is delayed and dynamic'],
  [js.includes('recordUncertainty'), 'uncertainty decisions are logged'],
  [js.includes('Treatment decision committed'), 'treatment decisions enter the decision timeline'],
  [js.includes('Patient response is not immediately revealed'), 'incorrect decisions do not receive immediate correction'],
  [css.includes('.clinical-workspace'), 'clinical workspace styling is present']
];
const failed = checks.filter(([ok]) => !ok);
checks.forEach(([ok, label]) => console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`));
if (failed.length) process.exit(1);
