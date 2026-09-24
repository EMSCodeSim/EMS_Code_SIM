'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data', 'ems-drills.json'), 'utf8'));
const security = require('../netlify/functions/lib/ems-drill-security');

function loadEngineUtils() {
  const code = fs.readFileSync(path.join(root, 'ems-drill-engine.js'), 'utf8');
  const sandbox = { window: {}, console };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(code, sandbox);
  return sandbox.EMS_DRILL_ENGINE_UTILS;
}

function testCatalogShape() {
  assert.ok(Array.isArray(catalog.categories) && catalog.categories.length >= 8, 'categories present');
  assert.ok(Array.isArray(catalog.drills) && catalog.drills.length >= 10, 'initial drill pack size');
  const ids = new Set();
  for (const drill of catalog.drills) {
    assert.ok(drill.id && /^ems-[\w-]+-\d{3}$/.test(drill.id), `stable id ${drill.id}`);
    assert.ok(!ids.has(drill.id), `unique id ${drill.id}`);
    ids.add(drill.id);
    assert.ok(Number.isInteger(drill.version) && drill.version >= 1, `version for ${drill.id}`);
    assert.ok(drill.title && drill.summary && drill.categoryId, `metadata for ${drill.id}`);
    assert.ok(['self', 'evaluator'].includes(drill.completionType), `completionType for ${drill.id}`);
    assert.ok(['individual', 'crew'].includes(drill.crewType), `crewType for ${drill.id}`);
    assert.ok(Array.isArray(drill.components) && drill.components.length, `components for ${drill.id}`);
    assert.ok(drill.content && Array.isArray(drill.content.activities) && drill.content.activities.length, `activities for ${drill.id}`);
    const seoPage = path.join(root, 'ems-drills', `${drill.slug}.html`);
    assert.ok(fs.existsSync(seoPage), `SEO page missing for ${drill.slug}`);
  }
  assert.ok(catalog.drills.some((drill) => drill.completionType === 'evaluator'), 'includes evaluator drill');
  assert.ok(catalog.drills.some((drill) => drill.crewType === 'crew'), 'includes crew drill');
  console.log('✓ catalog shape');
}

function testSecurityContract() {
  const secret = 'unit-test-shared-secret';
  const { token, payload } = security.createLaunchToken({
    drillId: 'ems-respiratory-distress-001',
    drillVersion: 1,
    assignmentId: 'asg_123',
    requirementId: 'req_9',
    returnUrl: 'https://responderroadmap.com/my-assignments',
    callbackUrl: 'https://responderroadmap.com/api/v1/integrations/emscodesim/complete',
    attemptNumber: 1
  }, secret);

  const ok = security.verifySignedToken(token, { secret, expectedDrillId: 'ems-respiratory-distress-001' });
  assert.equal(ok.ok, true);
  assert.equal(ok.payload.assignmentId, 'asg_123');

  const expired = security.createLaunchToken({
    drillId: 'ems-respiratory-distress-001',
    assignmentId: 'asg_123',
    exp: Math.floor(Date.now() / 1000) - 10
  }, secret);
  assert.equal(security.verifySignedToken(expired.token, { secret }).error, 'token_expired');

  const mismatched = security.verifySignedToken(token, { secret, expectedDrillId: 'ems-stroke-assessment-001' });
  assert.equal(mismatched.error, 'drill_mismatch');

  const badSig = token.replace(/\.[^.]+$/, '.AAAA');
  assert.equal(security.verifySignedToken(badSig, { secret }).error, 'invalid_signature');

  const completionIdA = security.createCompletionId(payload, 1);
  const completionIdB = security.createCompletionId(payload, 1);
  const completionIdC = security.createCompletionId(payload, 2);
  assert.equal(completionIdA, completionIdB);
  assert.notEqual(completionIdA, completionIdC);

  const body = JSON.stringify({ completionId: completionIdA });
  const signature = security.signRequestBody(body, secret);
  assert.equal(security.verifyRequestSignature(body, signature, secret), true);
  assert.equal(security.verifyRequestSignature(body, 'sha256=deadbeef', secret), false);
  assert.equal(security.isSafeReturnUrl('https://responderroadmap.com/my-task-books/1'), true);
  assert.equal(security.isSafeReturnUrl('https://evil.example/phish'), false);
  console.log('✓ security contract');
}

function testActivityGrading() {
  const utils = loadEngineUtils();
  const mcq = utils.gradeActivity({
    type: 'mcq',
    choices: [
      { id: 'a', text: 'wrong', correct: false, feedback: 'no' },
      { id: 'b', text: 'right', correct: true, feedback: 'yes' }
    ]
  }, { choiceId: 'b' });
  assert.equal(mcq.passed, true);

  const order = utils.gradeActivity({
    type: 'ordered-steps',
    correctOrder: ['1', '2', '3']
  }, { order: ['1', '3', '2'] });
  assert.equal(order.passed, false);

  const narrative = utils.gradeActivity({
    type: 'narrative',
    requiredTerms: ['chest', 'ETA'],
    minWords: 5,
    maxWords: 40
  }, { text: 'Medic 1 with a chest pain patient, ETA eight minutes.' });
  assert.equal(narrative.passed, true);

  const evaluator = utils.gradeActivity({
    type: 'evaluator-checklist',
    requireAll: true,
    items: [{ id: 'e1', text: 'seal' }, { id: 'e2', text: 'rate' }]
  }, { checked: ['e1'] });
  assert.equal(evaluator.passed, false);
  console.log('✓ activity grading');
}

function testCompleteHandlerIdempotency() {
  process.env.EMSCODESIM_ROADMAP_SHARED_SECRET = 'unit-test-shared-secret';
  process.env.EMS_DRILL_ALLOW_UNSIGNED_DEV = '1';
  delete require.cache[require.resolve('../netlify/functions/ems-drill-complete')];
  delete require.cache[require.resolve('../netlify/functions/lib/ems-drill-security')];
  const complete = require('../netlify/functions/ems-drill-complete');
  const { token, payload } = security.createLaunchToken({
    drillId: 'ems-radio-report-001',
    assignmentId: 'asg_radio',
    attemptNumber: 1
  }, 'unit-test-shared-secret');

  const completionId = security.createCompletionId(payload, 1);
  const body = {
    token,
    completion: {
      drillId: 'ems-radio-report-001',
      drillVersion: 1,
      assignmentId: 'asg_radio',
      completionId,
      status: 'completed',
      completedAt: new Date().toISOString(),
      durationSeconds: 320,
      score: 90,
      passed: true,
      attemptNumber: 1
    }
  };

  return complete.handler({ httpMethod: 'POST', body: JSON.stringify(body) })
    .then((first) => {
      const parsed = JSON.parse(first.body);
      assert.equal(parsed.ok, true);
      assert.equal(parsed.completionId, completionId);
      return complete.handler({ httpMethod: 'POST', body: JSON.stringify(body) });
    })
    .then((second) => {
      const parsed = JSON.parse(second.body);
      assert.equal(parsed.ok, true);
      assert.equal(parsed.duplicate, true);
      console.log('✓ completion idempotency');
    });
}

function testSessionHandler() {
  process.env.EMSCODESIM_ROADMAP_SHARED_SECRET = 'unit-test-shared-secret';
  delete require.cache[require.resolve('../netlify/functions/ems-drill-session')];
  const session = require('../netlify/functions/ems-drill-session');
  const { token } = security.createLaunchToken({
    drillId: 'ems-pcr-narrative-001',
    assignmentId: 'asg_pcr',
    returnUrl: 'https://responderroadmap.com/my-assignments'
  }, 'unit-test-shared-secret');

  return session.handler({
    httpMethod: 'POST',
    body: JSON.stringify({ token, drillId: 'ems-pcr-narrative-001' })
  }).then((result) => {
    const parsed = JSON.parse(result.body);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.session.assignmentId, 'asg_pcr');
    console.log('✓ session validation');
  });
}

async function main() {
  testCatalogShape();
  testSecurityContract();
  testActivityGrading();
  await testSessionHandler();
  await testCompleteHandlerIdempotency();
  console.log('EMS Drills tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
