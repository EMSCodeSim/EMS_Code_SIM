'use strict';

const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');
const attempts = new Map();

function env(name) {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name];
}
function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'Pragma': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    },
    body: JSON.stringify(body)
  };
}
function address(event) {
  return String(event.headers?.['x-nf-client-connection-ip'] || event.headers?.['x-forwarded-for'] || 'unknown').split(',')[0].trim();
}
function tooManyAttempts(event) {
  const key = address(event);
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter(time => now - time < 60_000);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > 15;
}
function authorized(event) {
  const expected = env('EMS_REPORT_CLASS_ADMIN_TOKEN') || '';
  const header = event.headers?.authorization || event.headers?.Authorization || '';
  const supplied = String(header).match(/^Bearer\s+(.+)$/i)?.[1] || '';
  if (expected.length < 32 || !supplied) return false;
  const expectedHash = crypto.createHash('sha256').update(expected).digest();
  const suppliedHash = crypto.createHash('sha256').update(supplied).digest();
  return crypto.timingSafeEqual(expectedHash, suppliedHash);
}
function allowedOrigin(event) {
  const origin = event.headers?.origin || event.headers?.Origin;
  if (!origin) return true;
  try { return ['emscodesim.com', 'www.emscodesim.com'].includes(new URL(origin).hostname); }
  catch (_) { return false; }
}

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed.' });
  if (!allowedOrigin(event)) return response(403, { error: 'Request origin not allowed.' });
  if (tooManyAttempts(event)) return response(429, { error: 'Too many roster requests. Wait one minute and try again.' });
  if (!authorized(event)) return response(401, { error: 'Administrator access required.' });
  const databaseUrl = env('EMS_REPORT_CLASS_ROSTER_DATABASE_URL');
  if (!databaseUrl) return response(503, { error: 'Roster access is not configured.' });
  try {
    const sql = neon(databaseUrl);
    const rows = await sql`SELECT learner_name, written_test_score, ai_narrative_score, completed_at
      FROM public.ems_report_class_roster_view
      ORDER BY completed_at DESC
      LIMIT 501`;
    return response(200, {
      records: rows.slice(0, 500).map(row => ({
        learnerName: row.learner_name,
        writtenTestScore: row.written_test_score,
        aiNarrativeScore: row.ai_narrative_score,
        completedAt: row.completed_at
      })),
      truncated: rows.length > 500
    });
  } catch (error) {
    console.error('Class roster query failed:', error.message);
    return response(500, { error: 'The roster could not be loaded. Try again later.' });
  }
};
