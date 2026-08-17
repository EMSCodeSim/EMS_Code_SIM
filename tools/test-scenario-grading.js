'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const gradeJs = read('vitals/scenario-patient-satisfaction-grade.js');
const registry = read('vitals/scenario-tool-registry.js');
const visualPatient = read('vitals/visual-patient.js');
const visualHtml = read('vitals/visual-patient.html');
const css = read('vitals/visual-patient.css');
const encounterValidation = read('vitals/horse-encounter-validation.js');
const followupCleanup = read('vitals/scenario-assessment-followup-cleanup.css');
const domainWorkspaceCss = read('vitals/scenario-domain-workspace.css');
const domainWorkspace = read('vitals/scenario-domain-workspace.js');
const deploymentPolicy = read('tools/deployment-policy.js');
const headers = read('_headers');
const netlify = read('netlify.toml');

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
assert(css.includes('body.horse-grade-open .horse-grade-workspace') && css.includes('position:fixed'), 'Production grade review must open as a fixed workspace overlay.');
assert(encounterValidation.includes("#horseGradeWorkspace .horse-grade-feedback"), 'Encounter debrief must prefer the grade feedback panel as its host.');
assert(encounterValidation.includes('#horseGradeWorkspace'), 'Encounter debrief must attach to the live horse grade workspace.');
assert(followupCleanup.includes('#assessmentPanel:not([hidden])') && followupCleanup.includes('#assessmentPanel[hidden]'), 'Assessment panel flex layout must not override [hidden] or it blocks History/Treatment.');
assert(followupCleanup.includes('data-active-domain="historyPanel"') && followupCleanup.includes('data-active-domain="treatmentPanel"'), 'Assessment options must stay hidden while History/Treatment own the right rail.');
assert(domainWorkspace.includes('showOnlyDomainPanel') && domainWorkspace.includes("data-active-domain"), 'Domain workspace must exclusively show the selected clinical panel.');
assert(domainWorkspace.includes('domain-assessment-suppressed') && domainWorkspace.includes("setProperty('display', 'none', 'important')"), 'Assessment suppression must force display:none important when another domain is active.');
assert(domainWorkspace.includes('emsAssessmentPanelParking') && domainWorkspace.includes('parkAssessmentPanel'), 'Inactive Assessment panel must be parked outside the action sheet so it cannot push History down.');
assert(domainWorkspaceCss.includes('.action-sheet[hidden]') && /action-sheet\[hidden\][\s\S]*?display:\s*none/.test(domainWorkspaceCss), 'Hidden desktop action sheet must stay display:none.');
assert(deploymentPolicy.includes("'vitals/assessment-workspace.html'"), 'Retired assessment workspace must remain excluded by deployment policy.');
assert(!fs.existsSync(path.join(root, 'vitals/assessment-workspace.html')), 'Competing assessment workspace page must stay removed from source.');
assert(headers.includes('/vitals/scenario-patient-satisfaction-grade.js'), 'Satisfaction grade script must be revalidated by CDN headers.');
assert(netlify.includes('for = "/vitals/scenario-patient-satisfaction-grade.js"'), 'Netlify must revalidate the satisfaction grade script after deploys.');

console.log('Scenario grading production contract passed: comfort-score returns, overlay markup/CSS, debrief host, and deploy cache rules are intact.');
