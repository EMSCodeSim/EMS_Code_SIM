'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const read = relative => fs.readFileSync(path.join(process.cwd(), relative), 'utf8');

const loopSrc = read('vitals/scenario-learning-loop.js');
const registrySrc = read('vitals/scenario-tool-registry.js');
const debriefJs = read('vitals/scenario-debrief.js');
const debriefHtml = read('vitals/scenario-debrief.html');
const patientJs = read('vitals/visual-patient.js');
const css = read('vitals/scenario-learning-loop.css');

assert(loopSrc.includes('EMSCodeSimLearningLoop'), 'Learning loop API must be exported');
assert(loopSrc.includes('WEAKNESS_CATALOG'), 'Weakness catalog must exist');
assert(loopSrc.includes('COACHING_BY_CASE'), 'Scenario-aware coaching tracks must exist');
assert(loopSrc.includes('asthma:') && loopSrc.includes('horse_crush:'), 'Breathing and horse-crush coaching must be defined');
assert(loopSrc.includes('Clinical thinking') || loopSrc.includes('clinical thinking') || loopSrc.includes("'Clinical thinking'"), 'Hint level labels must distinguish clinical thinking');
assert(loopSrc.includes('Open Breathing Assessment') || loopSrc.includes('Breathing Assessment'), 'Level 3 breathing guidance must exist');
assert(loopSrc.includes('assessmentMode') && loopSrc.includes("trainingMode() === 'assessment'") || loopSrc.includes("mode === 'assessment'"), 'Assessment mode gate must exist');
assert(loopSrc.includes('ll-coach-dock') || loopSrc.includes('learningLoopCoach'), 'In-call coach dock must exist');
assert(loopSrc.includes('buildDebriefModel') && loopSrc.includes('needsPractice'), 'Actionable debrief model required');
assert(loopSrc.includes('Practice Respiratory Assessment') || loopSrc.includes('practiceLabel: \'Practice Respiratory Assessment\''), 'Breathing remediation label required');
assert(loopSrc.includes('Retry This Patient') || loopSrc.includes('retryScenario'), 'Retry path required');
assert(loopSrc.includes('Return to Patient') || loopSrc.includes('returnToPatient'), 'Return-to-patient path required');
assert(loopSrc.includes('Improved') && loopSrc.includes('compareImprovement'), 'Retry improvement comparison required');
assert(loopSrc.includes('sessionStorage') && loopSrc.includes('emscodesim_learning_loop_attempts_v1'), 'Session attempt storage required');
assert(!/Now click|Click this next|Now select oxygen/i.test(loopSrc), 'Must not use click-by-click tutorial coaching');

assert(registrySrc.includes('scenario-learning-loop.js'), 'Tool registry must load learning loop on patient page');
assert(registrySrc.includes('scenario-learning-loop.css'), 'Tool registry must load learning loop styles');
assert(registrySrc.includes('training'), 'buildUrl must preserve training mode');

assert(debriefHtml.includes('scenario-learning-loop.js'), 'Debrief page must load learning loop');
assert(debriefHtml.includes('scenario-learning-loop.css'), 'Debrief page must load learning loop CSS');
assert(debriefJs.includes('enhanceFullDebrief'), 'Debrief engine must mount remediation panel');
assert(debriefJs.includes('breathing_assessment'), 'AI lesson map should include breathing assessment');

assert(patientJs.includes('EMSCodeSimLearningLoop'), 'Patient runtime must integrate learning loop hooks');
assert(patientJs.includes('enhanceHorseGrade') || patientJs.includes('snapshotAttempt'), 'Patient runtime must snapshot/enhance grade');
assert(patientJs.includes('EMSCodeSimVisualPatient'), 'Horse grade helper API must be exposed');

assert(css.includes('safe-area-inset-bottom'), 'Coach UI must respect safe-area insets');
assert(css.includes('min-height: 48px') || css.includes('min-height:48px'), 'Touch targets should be large');

// Runtime behavior checks in a vm sandbox
const storage = new Map();
const sessionStorage = {
  getItem: key => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key)
};

const findings = {};
const documentation = { trainingMode: 'learning' };
const record = {
  id: 'asthma-test',
  scenarioId: 'asthma',
  startedAt: new Date(Date.now() - 120000).toISOString(),
  findings,
  treatments: [],
  reassessments: [],
  careLog: [],
  documentation,
  title: 'Breathing Problem'
};

const sandbox = {
  window: {
    EMSCodeSimPatientRecord: {
      active: () => record,
      setDocumentation: patch => Object.assign(documentation, patch),
      clear: () => {}
    },
    EMSCodeSimScenarioPhases: {
      evaluate: () => ({ caseId: 'asthma', essentialComplete: false, missing: ['Breathing assessment'], phases: [] }),
      hasReassessmentAfterTreatment: () => false,
      labelFor: key => key
    },
    EMSCodeSimScenarioDefinitions: {
      PHASE_PLANS: {
        asthma: { requiredFindings: ['scene_size_up', 'airway', 'breathing', 'perfusion', 'respirations', 'breath_sounds', 'spo2'], appropriateFindings: [], notIndicatedFindings: [] },
        horse_crush: { requiredFindings: ['arrival_parking'], appropriateFindings: [], notIndicatedFindings: [] }
      }
    },
    EMSCodeSimToolRegistry: {
      assessmentTools: [
        { key: 'breathing', label: 'Breathing assessment', url: '/vitals/respiratory-assessment-visual.html' },
        { key: 'sample', label: 'SAMPLE history', url: '/vitals/sample-history.html' },
        { key: 'breath_sounds', label: 'Breath sounds', url: '/vitals/breath-sounds-scenario.html' }
      ],
      vitalTools: [{ key: 'spo2', label: 'SpO₂', url: '/vitals/pulse-ox-scenario.html' }],
      buildUrl: (path, options = {}) => {
        const query = new URLSearchParams({ mode: 'scenario', resume: '1', case: options.caseId || 'asthma' });
        if (options.returnTo) query.set('return', options.returnTo);
        if (options.training) query.set('training', options.training);
        return `${path}?${query}`;
      }
    },
    EMSCodeSimScenarioSession: { partnerTaskKey: id => `emscodesim_partner_tasks_${id}` },
    addEventListener: () => {},
    dispatchEvent: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    setTimeout: () => 0,
    CustomEvent: function CustomEvent() {}
  },
  document: {
    readyState: 'complete',
    body: { appendChild() {}, classList: { contains: () => false, add() {}, remove() {}, toggle() {} } },
    documentElement: {},
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
      style: {},
      classList: { add() {}, remove() {}, toggle() {} },
      setAttribute() {},
      appendChild() {},
      addEventListener() {},
      querySelector: () => null,
      querySelectorAll: () => [],
      dataset: {}
    }),
    head: { appendChild() {} },
    addEventListener: () => {}
  },
  location: { pathname: '/vitals/visual-patient.html', search: '?case=asthma&training=learning', href: 'http://localhost/vitals/visual-patient.html?case=asthma&training=learning', origin: 'http://localhost' },
  sessionStorage,
  localStorage: sessionStorage,
  URLSearchParams,
  URL,
  Date,
  Math,
  Object,
  Array,
  String,
  Number,
  Boolean,
  JSON,
  console
};
sandbox.window.document = sandbox.document;
sandbox.window.location = sandbox.location;
sandbox.window.sessionStorage = sessionStorage;
sandbox.window.localStorage = sessionStorage;
sandbox.window.URLSearchParams = URLSearchParams;
sandbox.window.URL = URL;
sandbox.self = sandbox.window;

vm.runInNewContext(loopSrc, sandbox, { filename: 'scenario-learning-loop.js' });
const loop = sandbox.window.EMSCodeSimLearningLoop;
assert(loop, 'Learning loop failed to initialize in sandbox');
assert(loop.learningMode(), 'Sandbox should be learning mode');
assert(!loop.assessmentMode(), 'Sandbox should not be assessment mode');

const breathing = loop.toolForWeakness('breathing_assessment');
assert(breathing && /respiratory-assessment-visual/.test(breathing.href), 'Breathing weakness must map to respiratory assessment tool');
assert(/training=learning/.test(breathing.href) || breathing.href.includes('case=asthma'), 'Practice URL must preserve scenario context');

const sample = loop.toolForWeakness('sample');
assert(sample && /sample-history/.test(sample.href), 'SAMPLE weakness must map to SAMPLE interview');

const track = loop.activeTrack(record);
assert(track && track.id === 'primary_abc', 'Asthma learner missing ABCs should get primary coaching track');
assert(track.hints[1].prompt.includes('difficulty breathing') || track.hints[1].prompt.includes('life threats'), 'Level 1 hint must be clinical thinking');
assert(track.hints[3].prompt.includes('Breathing') || track.hints[3].why.includes('adequacy'), 'Level 3 must guide breathing adequacy reasoning');

// Assessment mode must not expose coaching evaluation side effects through learningMode gate
documentation.trainingMode = 'assessment';
sandbox.location.search = '?case=asthma&training=assessment';
assert(loop.assessmentMode(), 'Assessment mode detection failed');
assert(!loop.learningMode(), 'Learning mode should be false in assessment');

documentation.trainingMode = 'learning';
sandbox.location.search = '?case=asthma&training=learning';

// Debrief model should identify missing breathing work
const model = loop.buildDebriefModel(record, { opportunities: ['Missing before scenario end: Breathing assessment.'], critical: [], score: 42 });
assert(model.needsPractice.some(item => item.id === 'breathing_assessment' || item.id === 'life_threats'), 'Debrief must flag breathing/life-threat practice needs');
assert(model.strengths, 'Debrief must include strengths array');
assert(model.retryScenario.includes('reset=1'), 'Retry URL must reset the scenario');
assert(model.returnToPatient.includes('visual-patient.html'), 'Return URL must target patient home');

// Horse-crush coaching differs from asthma
sandbox.location.search = '?case=horse_crush&training=learning';
record.scenarioId = 'horse_crush';
record.id = 'horse-test';
const horseTrack = loop.activeTrack(record);
assert(horseTrack && /trauma|scene|abc|threat/i.test(horseTrack.hints[1].prompt + horseTrack.id), 'Horse-crush coaching must emphasize trauma priorities');
assert(horseTrack.id !== 'respiratory_detail', 'Horse-crush must not use asthma respiratory detail track as first coach');

// Improvement comparison across attempts
record.startedAt = new Date(Date.now() - 3600000).toISOString();
documentation.learningLoop = {
  highestHintLevel: { scene_abc: 3 },
  assistedCompletions: ['distal_csm'],
  independentCompletions: [],
  skippedCritical: ['distal_csm'],
  hints: { scene_abc: [1, 2, 3] }
};
loop.snapshotAttempt(record, {
  score: 40,
  opportunities: [],
  critical: [],
});
// Force previous needsPractice to include distal_csm for comparison
const stored = JSON.parse(sessionStorage.getItem('emscodesim_learning_loop_attempts_v1'));
stored.horse_crush[0].needsPractice = [{ id: 'distal_csm', label: 'Distal CSM', hintLevel: 3 }];
sessionStorage.setItem('emscodesim_learning_loop_attempts_v1', JSON.stringify(stored));

record.startedAt = new Date().toISOString();
record.findings.airway = { value: 'Patent', recordedAt: new Date().toISOString() };
record.findings.breathing = { value: 'Adequate', recordedAt: new Date().toISOString() };
record.findings.perfusion = { value: 'Radial pulses present', recordedAt: new Date().toISOString() };
record.findings.distal_csm = { value: 'Present', recordedAt: new Date().toISOString() };
documentation.learningLoop = {
  highestHintLevel: {},
  assistedCompletions: [],
  independentCompletions: ['distal_csm', 'airway_assessment', 'breathing_assessment', 'circulation_perfusion'],
  skippedCritical: [],
  hints: {}
};
loop.snapshotAttempt(record, { score: 78, opportunities: [], critical: [] });
const improvements = loop.compareImprovement(record);
assert(Array.isArray(improvements), 'Improvement comparison must return an array');
assert(improvements.some(item => item.id === 'distal_csm' && item.improved), 'Retry should detect distal CSM improvement');

console.log('Scenario learning-loop checks passed: coaching, weakness mapping, debrief remediation, and mode gating.');
