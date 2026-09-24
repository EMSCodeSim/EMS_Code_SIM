'use strict';

const crypto = require('crypto');

const ISSUER = 'responderroadmap';
const AUDIENCE = 'emscodesim';
const TOKEN_TTL_SECONDS = 60 * 60 * 6; // 6 hours

function env(name, fallback = '') {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name] || fallback;
}

function sharedSecret() {
  return env('EMSCODESIM_ROADMAP_SHARED_SECRET') || env('ROADMAP_EMSCODESIM_SHARED_SECRET') || '';
}

function roadmapCallbackUrl() {
  return env('ROADMAP_COMPLETION_CALLBACK_URL') || env('RESPONDER_ROADMAP_COMPLETION_URL') || '';
}

function base64url(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  return buffer.toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function fromBase64url(value) {
  const padded = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, 'base64');
}

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function signPayload(payload, secret = sharedSecret()) {
  if (!secret) throw new Error('Shared secret is not configured.');
  const body = base64url(JSON.stringify(payload));
  const signature = base64url(crypto.createHmac('sha256', secret).update(body).digest());
  return `${body}.${signature}`;
}

function verifySignedToken(token, options = {}) {
  const secret = options.secret || sharedSecret();
  if (!secret) return { ok: false, error: 'shared_secret_missing' };
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { ok: false, error: 'invalid_token_format' };
  }

  const [body, signature] = token.split('.');
  if (!body || !signature) return { ok: false, error: 'invalid_token_format' };

  const expected = base64url(crypto.createHmac('sha256', secret).update(body).digest());
  if (!timingSafeEqualString(signature, expected)) {
    return { ok: false, error: 'invalid_signature' };
  }

  let payload;
  try {
    payload = JSON.parse(fromBase64url(body).toString('utf8'));
  } catch {
    return { ok: false, error: 'invalid_payload' };
  }

  if (!payload || typeof payload !== 'object') return { ok: false, error: 'invalid_payload' };
  if (payload.iss && payload.iss !== ISSUER) return { ok: false, error: 'invalid_issuer' };
  if (payload.aud && payload.aud !== AUDIENCE) return { ok: false, error: 'invalid_audience' };
  if (!payload.drillId || !payload.assignmentId) return { ok: false, error: 'missing_required_claims' };

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && Number(payload.exp) < now) return { ok: false, error: 'token_expired' };
  if (payload.nbf && Number(payload.nbf) > now) return { ok: false, error: 'token_not_yet_valid' };

  if (options.expectedDrillId && payload.drillId !== options.expectedDrillId) {
    return { ok: false, error: 'drill_mismatch' };
  }

  return { ok: true, payload };
}

function createLaunchToken(input, secret = sharedSecret()) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    v: 1,
    iss: ISSUER,
    aud: AUDIENCE,
    drillId: input.drillId,
    drillVersion: Number(input.drillVersion || 1),
    assignmentId: input.assignmentId,
    requirementId: input.requirementId || null,
    membershipId: input.membershipId || null,
    departmentId: input.departmentId || null,
    returnUrl: input.returnUrl || null,
    callbackUrl: input.callbackUrl || roadmapCallbackUrl() || null,
    attemptNumber: Number(input.attemptNumber || 1),
    iat: now,
    exp: Number(input.exp || now + TOKEN_TTL_SECONDS),
    jti: input.jti || crypto.randomUUID()
  };
  return { token: signPayload(payload, secret), payload };
}

function createCompletionId(payload, attemptNumber) {
  const seed = [
    payload.assignmentId || '',
    payload.drillId || '',
    String(attemptNumber || payload.attemptNumber || 1),
    payload.jti || ''
  ].join('|');
  return 'cmp_' + crypto.createHash('sha256').update(seed).digest('hex').slice(0, 24);
}

function signRequestBody(bodyText, secret = sharedSecret()) {
  if (!secret) throw new Error('Shared secret is not configured.');
  return 'sha256=' + crypto.createHmac('sha256', secret).update(bodyText).digest('hex');
}

function verifyRequestSignature(bodyText, signatureHeader, secret = sharedSecret()) {
  if (!secret) return false;
  const provided = String(signatureHeader || '').trim();
  const expected = signRequestBody(bodyText, secret);
  return timingSafeEqualString(provided, expected);
}

function isSafeReturnUrl(value) {
  if (!value || typeof value !== 'string') return false;
  if (value.startsWith('responderroadmap:')) return true;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    return host === 'responderroadmap.com'
      || host.endsWith('.responderroadmap.com')
      || host === 'localhost'
      || host === '127.0.0.1';
  } catch {
    return false;
  }
}

module.exports = {
  ISSUER,
  AUDIENCE,
  TOKEN_TTL_SECONDS,
  sharedSecret,
  roadmapCallbackUrl,
  signPayload,
  verifySignedToken,
  createLaunchToken,
  createCompletionId,
  signRequestBody,
  verifyRequestSignature,
  isSafeReturnUrl,
  env
};
