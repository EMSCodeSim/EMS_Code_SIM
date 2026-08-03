'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const html = read('vitals/visual-patient.html');
const js = read('vitals/visual-patient.js');
const css = read('vitals/visual-patient.css');

assert(html.includes('data-panel="historyPanel"'), 'History must be present in the bottom navigation.');
assert(html.includes('id="historyPanel"'), 'Patient history panel is missing.');
assert(html.includes('id="historyCustomInput"'), 'Custom patient question input is missing.');
assert(html.includes('/vitals/scenario-interviews.js'), 'Scenario interview data is not loaded.');
assert(!html.includes('data-panel="transportPanel"'), 'Transport must remain inside Treatment, not return as a bottom tab.');
assert(js.includes("['sample','pain'].includes(tool.key)"), 'SAMPLE and OPQRST must be removed from the general assessment list.');
['buildHistory','askInterviewQuestion','askCustomInterviewQuestion','saveInterviewMilestones','historyBadge'].forEach(marker => {
  assert(js.includes(marker), `Patient interview workflow is missing ${marker}.`);
});
assert(css.includes('grid-template-columns:repeat(5,minmax(0,1fr))'), 'Bottom navigation is not configured for five phone-friendly controls.');
assert(css.includes('.history-response-card'), 'Patient response styling is missing.');

const context = { window:{} };
vm.createContext(context);
vm.runInContext(read('vitals/scenario-interviews.js'), context, { filename:'scenario-interviews.js' });
const engine = context.window.EMSCodeSimScenarioInterviews;
assert(engine, 'Scenario interview engine did not initialize.');

const expected = ['asthma','stroke','hypoglycemia','trauma','pediatric'];
expected.forEach(id => {
  const profile = engine.get(id);
  assert(profile.responder, `${id}: responder is missing.`);
  assert(profile.communication, `${id}: communication status is missing.`);
  assert(profile.opening, `${id}: opening patient response is missing.`);
  assert(profile.categories.length >= 4, `${id}: interview categories are incomplete.`);
  assert(profile.questions.length >= 10, `${id}: not enough interview questions.`);
  const ids = new Set(profile.questions.map(question => question.id));
  profile.sampleRequired.forEach(key => assert(ids.has(key), `${id}: SAMPLE milestone references missing question ${key}.`));
  profile.questions.forEach(question => {
    assert(question.label && question.prompt && question.response, `${id}: incomplete question ${question.id}.`);
  });
  const allergy = engine.findQuestion(id, 'Do you have any allergies?');
  assert(allergy?.id === 'allergies', `${id}: custom allergy question does not resolve correctly.`);
});

console.log('Patient interview test passed: History replaces the old transport position, supports focused and custom questions, records local history, and preserves transport inside Treatment.');
