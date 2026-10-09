'use strict';

const { createHash, randomBytes } = require('crypto');
const scenarios = require('./data/narrative-lab-scenarios.json');
const requestBuckets = new Map();
const tokenPattern = /^[a-f0-9]{48}$/;
const piiPattern = /\b(?:patient name|full name|date of birth|\bdob\b|home address|phone number|incident number|report number)\s*(?:is|:|#)/i;

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    },
    body: JSON.stringify(body)
  };
}

function clientAddress(event) {
  return String(event.headers?.['x-nf-client-connection-ip'] || event.headers?.['x-forwarded-for'] || 'unknown').split(',')[0].trim();
}

function rateLimited(event) {
  const key = clientAddress(event);
  const now = Date.now();
  const recent = (requestBuckets.get(key) || []).filter(value => now - value < 60_000);
  recent.push(now);
  requestBuckets.set(key, recent);
  return recent.length > 40;
}

function clean(value, max = 1600) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

function readDecisions(value) {
  if (!Array.isArray(value) || value.length > 5) throw new Error('The decision trail is invalid.');
  const decisions = value.map((item, index) => {
    const action = clean(item?.action);
    const reasoning = clean(item?.reasoning);
    if (index >= 5 || action.length > 1600 || reasoning.length > 1600) throw new Error('A decision is too long.');
    if ((action || reasoning) && (action.length < 8 || reasoning.length < 12)) throw new Error('Complete both parts of each recorded decision before saving.');
    if (piiPattern.test(`${action} ${reasoning}`)) throw new Error('Remove possible patient-identifying information before saving this session.');
    return { action, reasoning };
  });
  return decisions;
}

async function database() {
  const { getDatabase } = await import('@netlify/database');
  return getDatabase();
}

function sessionView(row) {
  return {
    scenarioId: row.scenario_id,
    level: row.learner_level,
    mode: row.mode,
    currentStage: row.current_stage,
    decisions: row.decisions,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at
  };
}

exports.handler = async event => {
  if (!['GET', 'POST'].includes(event.httpMethod)) return response(405, { error: 'Method not allowed.' });
  if (rateLimited(event)) return response(429, { error: 'Too many session requests. Wait one minute and try again.' });

  try {
    const db = await database();
    if (event.httpMethod === 'GET') {
      const token = String(event.queryStringParameters?.token || '');
      if (!tokenPattern.test(token)) return response(400, { error: 'Enter a valid room link or code.' });
      const rows = await db.sql`SELECT scenario_id, learner_level, mode, current_stage, decisions, updated_at, expires_at FROM critical_thinking_sessions WHERE token_hash = ${tokenHash(token)} AND expires_at > now() LIMIT 1`;
      if (!rows.length) return response(404, { error: 'This room was not found or has expired.' });
      return response(200, { session: sessionView(rows[0]) });
    }

    const raw = String(event.body || '');
    if (Buffer.byteLength(raw) > 14_000) return response(413, { error: 'The session update is too large.' });
    let body;
    try { body = JSON.parse(raw || '{}'); } catch (_) { return response(400, { error: 'Invalid request.' }); }

    if (body.action === 'create') {
      const scenario = scenarios.find(item => item.id === clean(body.scenarioId, 80));
      if (!scenario) return response(400, { error: 'Choose a valid case.' });
      if (!['Beginner', 'EMT', 'Paramedic'].includes(body.level)) return response(400, { error: 'Choose a valid learner level.' });
      if (!['solo', 'group'].includes(body.mode)) return response(400, { error: 'Choose solo or group practice.' });
      const token = randomBytes(24).toString('hex');
      await db.sql`DELETE FROM critical_thinking_sessions WHERE expires_at <= now()`;
      await db.sql`INSERT INTO critical_thinking_sessions (token_hash, scenario_id, learner_level, mode) VALUES (${tokenHash(token)}, ${scenario.id}, ${body.level}, ${body.mode})`;
      return response(201, { token, expiresInDays: 30 });
    }

    if (body.action === 'save') {
      const token = String(body.token || '');
      if (!tokenPattern.test(token)) return response(400, { error: 'Enter a valid room link or code.' });
      const currentStage = Number(body.currentStage);
      if (!Number.isInteger(currentStage) || currentStage < 0 || currentStage > 4) return response(400, { error: 'The current stage is invalid.' });
      const decisions = readDecisions(body.decisions);
      const updated = await db.sql`UPDATE critical_thinking_sessions SET current_stage = ${currentStage}, decisions = ${JSON.stringify(decisions)}::jsonb, updated_at = now() WHERE token_hash = ${tokenHash(token)} AND expires_at > now() RETURNING updated_at, expires_at`;
      if (!updated.length) return response(404, { error: 'This room was not found or has expired.' });
      return response(200, { saved: true, updatedAt: updated[0].updated_at, expiresAt: updated[0].expires_at });
    }

    return response(400, { error: 'Choose a supported session action.' });
  } catch (error) {
    console.error('Critical-thinking session error:', error?.message || error);
    return response(503, { error: 'Shared session storage is temporarily unavailable. Your device copy remains available.' });
  }
};

exports._test = { tokenPattern, tokenHash, readDecisions };
