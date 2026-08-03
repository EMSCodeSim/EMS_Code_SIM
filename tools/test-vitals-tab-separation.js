'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'vitals', 'visual-patient.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'vitals', 'visual-patient.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(/data-panel="vitalsPanel"[^>]*><span>♥<\/span>Vitals<\/button>/.test(html), 'Bottom navigation must include a Vitals tab.');
assert(/Vital signs are located in the separate Vitals tab/.test(html), 'Assessment panel should direct learners to the Vitals tab.');
assert(!/buildAssessmentCategory\(box, 'vitals'/.test(js), 'Vitals category must not be rendered in Assessment.');
assert(/\(registry\?\.assessmentTools \|\| \[\]\)\.forEach/.test(js), 'Assessment menu should be built from assessment tools only.');
assert(/!MEASURABLE_TOOL_KEYS\.has\(tool\.key\)/.test(js), 'Measurable vital keys must be excluded from Assessment.');
console.log('Vitals tab separation test passed.');
