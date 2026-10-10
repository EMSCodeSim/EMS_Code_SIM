'use strict';

async function database() {
  const connectionString = globalThis.Netlify?.env?.get?.('EMSCODESIM_DATABASE_URL') || process.env.EMSCODESIM_DATABASE_URL;
  if (!connectionString) throw new Error('EMSCodeSim database connection is not configured.');
  const { neon } = await import('@neondatabase/serverless');
  return neon(connectionString);
}

exports.handler = async () => {
  try {
    const sql = await database();
    const result = await sql`DELETE FROM critical_thinking_sessions WHERE expires_at <= now() RETURNING token_hash`;
    return { statusCode: 200, body: JSON.stringify({ deleted: result.length }) };
  } catch (error) {
    console.error('Critical-thinking session cleanup error:', error?.message || error);
    return { statusCode: 500, body: 'Session cleanup failed.' };
  }
};

exports.config = { schedule: '@daily' };
