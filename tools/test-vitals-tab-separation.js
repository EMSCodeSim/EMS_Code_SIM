'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'vitals', 'visual-patient.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'vitals', 'visual-patient.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Mobile retains the legacy Vitals panel, while desktop uses the right-side patient monitor.
assert(/class="desktop-hide-vitals-nav"[^>]*data-panel="vitalsPanel"/.test(html), 'Vitals control must remain available for mobile but be marked hidden on desktop.');
assert(/id="desktopPatientMonitor"/.test(html), 'Desktop must include the patient monitor.');
assert(/id="desktopMonitorVitalGrid"/.test(html), 'Desktop patient monitor must include the clickable vital grid.');
assert(/Vital signs are controlled from the patient monitor on desktop/.test(html), 'Assessment panel should direct desktop learners to the patient monitor.');
assert(/openDesktopVitalAction\(tool\)/.test(js), 'Desktop monitor vitals must open the obtain/assign action.');
assert(/Assign to partner/.test(html), 'Desktop vital action must support partner assignment.');
assert(!/buildAssessmentCategory\(box, 'vitals'/.test(js), 'Vitals category must not be rendered in Assessment.');
assert(/\(registry\?\.assessmentTools \|\| \[\]\)\.forEach/.test(js), 'Assessment menu should be built from assessment tools only.');
assert(/!MEASURABLE_TOOL_KEYS\.has\(tool\.key\)/.test(js), 'Measurable vital keys must be excluded from Assessment.');
console.log('Desktop monitor / mobile vitals separation test passed.');
