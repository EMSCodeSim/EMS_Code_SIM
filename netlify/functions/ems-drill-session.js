'use strict';

const { verifySignedToken, isSafeReturnUrl, sharedSecret, env } = require('./lib/ems-drill-security');

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return response(204, {});
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
  const drillId = payload.drillId || null;
  const secret = sharedSecret();

  if (!token) {
    return response(400, { ok: false, error: 'token_required' });
  }

  if (!secret && env('EMS_DRILL_ALLOW_UNSIGNED_DEV') !== '1') {
    return response(503, {
      ok: false,
      error: 'shared_secret_missing',
      message: 'Configure EMSCODESIM_ROADMAP_SHARED_SECRET on EMSCodeSim and Responder Roadmap.'
    });
  }

  const verified = verifySignedToken(token, {
    secret: secret || 'dev-only-secret',
    expectedDrillId: drillId || undefined
  });

  if (!verified.ok) {
    const messages = {
      token_expired: 'This Responder Roadmap launch link has expired. Reopen the assignment and tap Start Drill again.',
      invalid_signature: 'This launch token failed signature verification.',
      drill_mismatch: 'This launch token is for a different EMS drill.',
      invalid_token_format: 'This launch token is malformed.'
    };
    return response(401, {
      ok: false,
      error: verified.error,
      message: messages[verified.error] || 'Invalid launch token.'
    });
  }

  const claims = verified.payload;
  return response(200, {
    ok: true,
    session: {
      drillId: claims.drillId,
      drillVersion: claims.drillVersion || 1,
      assignmentId: claims.assignmentId,
      requirementId: claims.requirementId || null,
      membershipId: claims.membershipId || null,
      departmentId: claims.departmentId || null,
      attemptNumber: claims.attemptNumber || 1,
      returnUrl: isSafeReturnUrl(claims.returnUrl) ? claims.returnUrl : null,
      callbackUrlConfigured: Boolean(claims.callbackUrl),
      exp: claims.exp,
      jti: claims.jti
    }
  });
};
