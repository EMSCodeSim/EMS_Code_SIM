'use strict';

const fs = require('fs');
const path = require('path');
const {
  verifySignedToken,
  createCompletionId,
  signRequestBody,
  isSafeReturnUrl,
  roadmapCallbackUrl,
  sharedSecret,
  env
} = require('./lib/ems-drill-security');

const completionCache = new Map();
const catalogPath = path.join(__dirname, 'data', 'ems-drills.json');

function response(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      ...headers
    },
    body: JSON.stringify(body)
  };
}

function readCatalog() {
  return JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
}

function findDrill(drillId) {
  const catalog = readCatalog();
  return (catalog.drills || []).find((drill) => drill.id === drillId) || null;
}

async function forwardToRoadmap(callbackUrl, completion, secret) {
  if (!callbackUrl) {
    return { ok: false, error: 'callback_url_missing', queued: true };
  }

  const bodyText = JSON.stringify({
    event: 'ems_drill.completed',
    ...completion
  });
  const signature = signRequestBody(bodyText, secret);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const result = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EMSCodeSim-Signature': signature,
        'X-EMSCodeSim-Event': 'ems_drill.completed'
      },
      body: bodyText,
      signal: controller.signal
    });
    const text = await result.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch (_) { parsed = { raw: text }; }
    if (!result.ok) {
      return { ok: false, error: 'roadmap_rejected', status: result.status, body: parsed };
    }
    return { ok: true, status: result.status, body: parsed };
  } catch (error) {
    return { ok: false, error: 'roadmap_unreachable', message: String(error && error.message || error) };
  } finally {
    clearTimeout(timer);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return response(204, {}, {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-EMSCodeSim-Signature'
    });
  }

  if (event.httpMethod !== 'POST') {
    return response(405, { ok: false, error: 'method_not_allowed' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return response(400, { ok: false, error: 'invalid_json' });
  }

  const token = payload.token;
  const completion = payload.completion || {};
  const secret = sharedSecret();

  if (!secret && env('EMS_DRILL_ALLOW_UNSIGNED_DEV') !== '1') {
    return response(503, { ok: false, error: 'shared_secret_missing', message: 'Configure EMSCODESIM_ROADMAP_SHARED_SECRET.' });
  }

  const verified = verifySignedToken(token, {
    secret: secret || 'dev-only-secret',
    expectedDrillId: completion.drillId
  });

  if (!verified.ok) {
    return response(401, { ok: false, error: verified.error });
  }

  const claims = verified.payload;
  if (completion.assignmentId && completion.assignmentId !== claims.assignmentId) {
    return response(409, { ok: false, error: 'assignment_mismatch' });
  }
  if (completion.drillId !== claims.drillId) {
    return response(409, { ok: false, error: 'drill_mismatch' });
  }

  const drill = findDrill(claims.drillId);
  if (!drill) {
    return response(404, { ok: false, error: 'unknown_drill' });
  }

  const attemptNumber = Number(completion.attemptNumber || claims.attemptNumber || 1);
  const completionId = completion.completionId || createCompletionId(claims, attemptNumber);

  if (completionCache.has(completionId)) {
    return response(200, {
      ok: true,
      duplicate: true,
      completionId,
      sync: completionCache.get(completionId)
    });
  }

  const record = {
    drillId: claims.drillId,
    drillVersion: Number(completion.drillVersion || claims.drillVersion || drill.version || 1),
    assignmentId: claims.assignmentId,
    requirementId: claims.requirementId || null,
    membershipId: claims.membershipId || null,
    departmentId: claims.departmentId || null,
    completionId,
    status: completion.status || 'completed',
    completedAt: completion.completedAt || new Date().toISOString(),
    durationSeconds: Number(completion.durationSeconds || 0),
    score: completion.score == null ? null : Number(completion.score),
    passed: completion.passed !== false,
    evaluatorId: completion.evaluatorId || null,
    attemptNumber
  };

  const callbackUrl = claims.callbackUrl || roadmapCallbackUrl();
  let sync = { ok: true, skipped: true, reason: 'no_callback_configured' };

  if (callbackUrl) {
    sync = await forwardToRoadmap(callbackUrl, record, secret || 'dev-only-secret');
  }

  if (sync.ok) {
    completionCache.set(completionId, sync);
  }

  return response(sync.ok ? 200 : 202, {
    ok: true,
    completionId,
    queued: !sync.ok,
    returnUrl: isSafeReturnUrl(claims.returnUrl) ? claims.returnUrl : null,
    sync
  });
};
