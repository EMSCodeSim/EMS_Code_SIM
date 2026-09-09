'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const client = read('vitals/scenario-ai-question-layer.js');
const registry = read('vitals/scenario-tool-registry.js');
const fn = read('netlify/functions/scenario-question-labels.js');
const policy = require('./deployment-policy');

assert(registry.includes('scenario-ai-question-layer.js'), 'Patient workspace must load the AI Quick Response layer.');
assert(client.includes("const ACTIVE_SCENARIOS = new Set(['asthma'])"), 'AI Quick Response pilot must remain limited to asthma.');
assert(client.includes("const ENDPOINT = '/api/scenario-question-labels'"), 'Client must use the scoped friendly API route.');
assert(client.includes('MAX_QUICK_REPLIES = 4'), 'Quick Response must remain limited to four choices.');
assert(client.includes('buttonByQuestionId(item.id)'), 'Quick Response choices must map back to existing deterministic question IDs.');
assert(client.includes('target.click()'), 'Quick Response must proxy the existing interview workflow instead of replacing it.');
assert(client.includes('FALLBACK_WORDING'), 'An instant no-AI fallback is required.');
assert(!client.includes('OPENAI_API_KEY'), 'API keys must never appear in browser code.');

assert(fn.includes("https://api.openai.com/v1/responses"), 'Question endpoint must use the OpenAI Responses API.');
assert(fn.includes("Netlify.env.get('OPENAI_API_KEY')"), 'OpenAI API key must be read server-side from Netlify environment variables.');
assert(fn.includes("path:'/api/scenario-question-labels'"), 'Netlify function must expose the scoped friendly route.');
assert(fn.includes("body?.scenarioId !== 'asthma'"), 'Server must reject non-asthma scenarios during the pilot.');
assert(fn.includes('ASTHMA_QUESTIONS'), 'Server must maintain a fixed question-ID allowlist.');
assert(fn.includes('allowedIds.has(item.id)'), 'AI output IDs must be validated against the approved candidate set.');
assert(fn.includes("source:'fallback'"), 'Server failures must return a safe fallback result.');
assert(!fn.includes('About two hours ago'), 'Server prompt must not contain the patient answer for onset.');
assert(!fn.includes('albuterol rescue inhaler'), 'Server prompt must not contain the patient medication answer.');
assert(!fn.includes('138/84'), 'Server prompt must not contain patient vitals.');
assert(!policy.isRetiredPath('netlify/functions/scenario-question-labels.js'), 'New AI question endpoint must not be excluded as a retired function.');

const context = { window:{} };
vm.createContext(context);
vm.runInContext(read('vitals/scenario-interviews.js'), context, { filename:'scenario-interviews.js' });
const asthma = context.window.EMSCodeSimScenarioInterviews?.get?.('asthma');
assert(asthma, 'Asthma interview profile must be available.');
for (const question of asthma.questions) {
  const escaped = question.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert(new RegExp(`\\b${escaped}\\s*:`).test(fn), `Server allowlist is missing asthma question ID: ${question.id}`);
}

console.log('AI Quick Response safety contract passed: asthma-only, four-choice, deterministic question mapping, server-side allowlist, and no clinical-answer authority.');
