'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const enginePath = path.join(__dirname, '..', 'quiz', 'practice-exam-engine.js');
const quizPath = path.join(__dirname, '..', 'quiz', 'emt_quiz.json');
const source = fs.readFileSync(enginePath, 'utf8');
const sandbox = { window: {}, console };
vm.runInNewContext(source, sandbox);
const api = sandbox.window.EMSCodeSimPracticeExam;
if (!api) throw new Error('Practice exam engine did not load');

const pool = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
if (pool.length < 150) throw new Error(`Expected expanded bank, got ${pool.length}`);
if (pool.some(q => !q.topic || !(q.reason || q.explanation))) {
  throw new Error('Every question needs topic and reason/explanation');
}

for (const modeId of Object.keys(api.MODES)) {
  const built = api.buildExam(pool, modeId);
  const mode = api.MODES[modeId];
  if (built.questions.length !== mode.count) {
    throw new Error(`${modeId}: expected ${mode.count} questions, got ${built.questions.length}`);
  }
  const topics = new Set(built.questions.map(q => q.topic));
  if (topics.size < 5) throw new Error(`${modeId}: expected broad domain coverage, got ${[...topics]}`);
  const answers = {};
  built.questions.forEach((q, i) => { if (i % 2 === 0) answers[i] = q.answer; });
  const scored = api.scoreExam(built.questions, answers);
  if (scored.total !== mode.count) throw new Error(`${modeId}: score total mismatch`);
  if (scored.correct < 1) throw new Error(`${modeId}: expected some correct answers`);
  if (!Object.keys(scored.byTopic).length) throw new Error(`${modeId}: missing topic breakdown`);
}

if (api.formatTime(65) !== '1:05') throw new Error('formatTime failed');
console.log(`Practice exam engine checks passed (${pool.length} questions).`);
