'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const scenarios = JSON.parse(fs.readFileSync(path.join(root, 'netlify', 'functions', 'data', 'narrative-lab-scenarios.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'narrative-writing-lab.html'), 'utf8');
const client = fs.readFileSync(path.join(root, 'narrative-writing-lab.js'), 'utf8');
const grader = fs.readFileSync(path.join(root, 'netlify', 'functions', 'narrative-grader.js'), 'utf8');

assert.strictEqual(scenarios.length, 10, 'Narrative lab must ship with 10 scenarios');
assert.strictEqual(new Set(scenarios.map(item => item.id)).size, scenarios.length, 'Scenario IDs must be unique');
for (const scenario of scenarios) {
  for (const field of ['id', 'title', 'category', 'level', 'dispatch', 'scene', 'history', 'findings', 'vitals', 'care', 'response', 'disposition', 'requiredFacts']) {
    assert.ok(scenario[field], `${scenario.id || 'scenario'} is missing ${field}`);
  }
  for (const field of ['history', 'findings', 'vitals', 'care', 'requiredFacts']) assert.ok(Array.isArray(scenario[field]) && scenario[field].length, `${scenario.id}.${field} must be a non-empty array`);
}

for (const requiredId of ['scenarioGrid', 'narrativeText', 'gradeBtn', 'categoryScores', 'exampleNarrative', 'reviseBtn']) assert.ok(html.includes(`id="${requiredId}"`), `Missing lab element #${requiredId}`);
assert.ok(client.includes("/.netlify/functions/narrative-grader"), 'Client must call the server-side grader');
assert.ok(grader.includes("store: false"), 'AI grading requests must disable response storage');
assert.ok(grader.includes("env('OPENAI_BASE_URL')"), 'Grader must support Netlify AI Gateway');
assert.ok(grader.includes('Use only the supplied scenario as ground truth'), 'Grader must anchor feedback to supplied facts');
assert.ok(grader.includes('unsupportedStatements'), 'Grader must report unsupported documentation');
assert.ok(!client.includes('OPENAI_API_KEY'), 'Client must never contain the OpenAI API key name');

console.log(`Narrative Writing Lab verified: ${scenarios.length} scenarios, secure AI endpoint, rubric feedback, and revision workflow.`);
