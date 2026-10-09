'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'critical-thinking-lab.html'), 'utf8');
const client = fs.readFileSync(path.join(root, 'critical-thinking-lab.js'), 'utf8');
const coach = fs.readFileSync(path.join(root, 'netlify', 'functions', 'critical-thinking-coach.js'), 'utf8');
const scenarios = JSON.parse(fs.readFileSync(path.join(root, 'netlify', 'functions', 'data', 'narrative-lab-scenarios.json'), 'utf8'));

for (const id of ['startPanel', 'workPanel', 'debriefPanel', 'caseSelect', 'decisionForm', 'decisionTrail', 'aiDebrief']) {
  assert.ok(html.includes(`id="${id}"`), `Missing critical-thinking UI element #${id}`);
}
assert.ok(client.includes("fetch('/data/narrative-lab-scenarios.json'"), 'Lab must load the current published scenario catalog');
assert.ok(client.includes("/.netlify/functions/critical-thinking-coach"), 'Lab must request server-side AI feedback');
assert.ok(client.includes("localStorage.setItem(STORAGE_KEY"), 'Learner progress must persist between visits on the same device');
assert.ok(client.includes("data-mode=\"group\"" ) || html.includes('data-mode="group"'), 'Lab must support team discussion mode');
assert.ok(coach.includes("require('./data/narrative-lab-scenarios.json')"), 'AI coach must use the canonical case data');
assert.ok(coach.includes('store:false'), 'AI requests must not be stored by the model provider');
assert.ok(coach.includes('possibleIdentifier(raw)'), 'AI endpoint must reject likely patient identifiers');
assert.ok(coach.includes('Do not provide patient-care instructions'), 'AI coach must stay in formative reflection scope');
assert.ok(coach.includes('requestBuckets') && coach.includes('Too many debrief requests'), 'AI endpoint must be rate limited');
assert.ok(scenarios.length >= 5, 'Lab must have multiple scenarios to choose from');
for (const scenario of scenarios) for (const field of ['id','title','dispatch','scene','history','findings','vitals','response','care','disposition']) assert.ok(scenario[field], `${scenario.id} is missing ${field}`);

console.log(`Clinical Judgment Lab verified: ${scenarios.length} curated cases, solo and team modes, device-local progress, and guarded AI debrief.`);
