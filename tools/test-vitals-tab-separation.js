'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'vitals', 'visual-patient.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'vitals', 'visual-patient.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(/id="desktopPatientMonitor"/.test(html), 'Desktop patient monitor must be present.');
assert(/id="desktopVitalAction"/.test(html), 'Desktop monitor must provide vital action controls.');
assert(/id="desktopVitalTake"/.test(html) && /id="desktopVitalPartner"/.test(html), 'Desktop vitals must support take myself or assign to partner.');
assert(/data-panel="vitalsPanel"/.test(html), 'Mobile/fallback navigation must retain access to the Vitals panel.');
assert(/desktop-hide-vitals-nav/.test(html), 'Desktop Vitals navigation control must be marked for hiding when monitor-driven vitals are active.');
assert(!/buildAssessmentCategory\(box, 'vitals'/.test(js), 'Vitals category must not be rendered in Assessment.');
assert(/\(registry\?\.assessmentTools \|\| \[\]\)\.forEach/.test(js), 'Assessment menu should be built from assessment tools only.');
assert(/!MEASURABLE_TOOL_KEYS\.has\(tool\.key\)/.test(js), 'Measurable vital keys must be excluded from Assessment.');
console.log('Monitor-driven vitals separation test passed.');
