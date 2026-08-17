'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const gradeJs = fs.readFileSync(path.join(root, 'vitals/scenario-patient-satisfaction-grade.js'), 'utf8');
const registry = fs.readFileSync(path.join(root, 'vitals/scenario-tool-registry.js'), 'utf8');
const visualPatient = fs.readFileSync(path.join(root, 'vitals/visual-patient.js'), 'utf8');
const visualHtml = fs.readFileSync(path.join(root, 'vitals/visual-patient.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'vitals/visual-patient.css'), 'utf8');

assert(!/return\d+/.test(gradeJs), 'Satisfaction grade must not use returnNN identifiers (needs a space after return).');
assert(gradeJs.includes('return 100') && gradeJs.includes('return 55'), 'Comfort score numeric returns must remain present.');
assert(gradeJs.includes('showClinicalCoaching'), 'Satisfaction grade must keep clinical coaching visible.');
assert(!gradeJs.includes('function hideClinical'), 'Satisfaction grade must not hide the clinical coaching panels.');
assert(registry.includes('scenario-patient-satisfaction-grade.js'), 'Patient workspace must load the satisfaction grading script.');
assert(visualPatient.includes('function buildHorseCallGrade') && visualPatient.includes('function openHorseCallGrade'), 'Clinical horse call grade helpers must remain available.');
assert(visualHtml.includes('id="horseGradeWorkspace"') && visualHtml.includes('id="openHorseCallGrade"'), 'Grade workspace and Grade call control must remain in the patient page.');
assert(visualHtml.includes('id="gradeScenarioFromPatient"'), 'Progress panel grade control must remain available.');
assert(visualHtml.includes('id="horseGradeModeLabel"') && visualHtml.includes('id="horseGradeHeaderTitle"') && visualHtml.includes('id="horseClinicalCoachingHead"'), 'Grade workspace must expose mode/header/coaching hooks for the UI.');
assert(css.includes('.horse-grade-workspace') && css.includes('.horse-grade-layout'), 'Horse grade workspace must have overlay styles.');
assert(/\.horse-grade-workspace[\s\S]*position:\s*absolute/.test(css), 'Grade overlay must cover the patient stage.');

console.log('Scenario grading contract passed: comfort-score returns, grade workspace markup/CSS, and open helpers are intact.');
