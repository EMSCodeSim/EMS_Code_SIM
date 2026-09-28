/**
 * Patient Simulator V2 — fact-grounded patient / hospital phrasing.
 * Never invents vitals, allergies, history, doses, or progression.
 * Falls back cleanly when AI is unavailable.
 */
const OPENAI_URL = 'https://api.openai.com/v1/responses';
const REQUESTS_PER_MINUTE = 12;
const MAX_BODY_BYTES = 12_000;
const requestBuckets = new Map();

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

function cleanText(value, max = 500) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function rateLimited(request, context) {
  const key = String(context?.ip || request.headers.get('x-nf-client-connection-ip') || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const recent = (requestBuckets.get(key) || []).filter(x => now - x < 60_000);
  recent.push(now);
  requestBuckets.set(key, recent);
  return recent.length > REQUESTS_PER_MINUTE;
}

function outputText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text.trim();
  const parts = [];
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (typeof content?.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

function hospitalFallback(report) {
  const hasVitals = /\b(spo2|o2|bp|hr|rr)\b/i.test(report);
  const hasTx = /albuterol|oxygen|nebul/i.test(report);
  if (hasVitals && hasTx) return 'Receiving: Copy that. We have a bay ready — continue respiratory support and update us if she tires.';
  if (hasTx) return 'Receiving: Copy, bronchodilator noted. Include current SpO₂ and work of breathing on arrival.';
  return 'Receiving: Copy, Medic. Transmit vitals and treatments when able — we will be ready.';
}

export default async (request, context) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  if (rateLimited(request, context)) return json({ source: 'fallback', reason: 'rate_limited', reply: null }, 429);

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: 'Request too large.' }, 413);

  let body;
  try { body = JSON.parse(raw || '{}'); }
  catch { return json({ error: 'Invalid JSON.' }, 400); }

  const scenarioId = cleanText(body.scenarioId, 40).toLowerCase();
  if (scenarioId !== 'adult-asthma') return json({ error: 'Unsupported scenario.' }, 400);

  const mode = cleanText(body.mode, 20) || 'patient';

  if (mode === 'hospital') {
    const report = cleanText(body.report, 2000);
    const fallback = hospitalFallback(report);
    const apiKey = Netlify.env.get('OPENAI_API_KEY');
    if (!apiKey) return json({ source: 'fallback', reason: 'ai_not_configured', reply: fallback });
    try {
      const model = Netlify.env.get('EMSCODESIM_V2_CHAT_MODEL') || Netlify.env.get('OPENAI_NARRATIVE_MODEL') || 'gpt-4.1-mini';
      const response = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          store: false,
          instructions: 'You are a receiving ED radio nurse in an EMS training simulation. Reply in 1-2 short realistic sentences acknowledging the report. Do not invent clinical findings. Do not give medical orders beyond acknowledging readiness. Educational simulation only.',
          input: `Radio report from EMS:\n${report || '(empty report)'}`,
          max_output_tokens: 120
        })
      });
      const payload = await response.json().catch(() => ({}));
      const reply = cleanText(outputText(payload), 280);
      if (!response.ok || !reply) return json({ source: 'fallback', reason: 'ai_unavailable', reply: fallback });
      return json({ source: 'ai', reply });
    } catch {
      return json({ source: 'fallback', reason: 'ai_unavailable', reply: fallback });
    }
  }

  const question = cleanText(body.question, 400);
  const factKey = cleanText(body.factKey, 60);
  const factValue = body.factValue;
  const fallback = cleanText(body.allowedReplyFallback, 400) || 'I\'m having a hard time talking.';
  const speech = cleanText(body.clinicalSpeech, 40);

  if (!question) return json({ error: 'Missing question.' }, 400);

  // Hard local short-circuit for severe speech limitation
  if (speech === 'unable_to_speak') return json({ source: 'local', reply: '…air…' });
  if (speech === 'single_words') return json({ source: 'local', reply: fallback.length < 40 ? fallback : 'Can\'t… talk…' });

  const apiKey = Netlify.env.get('OPENAI_API_KEY');
  if (!apiKey) return json({ source: 'fallback', reason: 'ai_not_configured', reply: fallback });

  const factBlob = typeof factValue === 'string' || typeof factValue === 'number' || typeof factValue === 'boolean'
    ? String(factValue)
    : JSON.stringify(factValue ?? null);

  try {
    const model = Netlify.env.get('EMSCODESIM_V2_CHAT_MODEL') || Netlify.env.get('OPENAI_NARRATIVE_MODEL') || 'gpt-4.1-mini';
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        store: false,
        instructions: `You are a patient in an EMS educational simulation with acute asthma.\nPhrase a brief natural first-person answer using ONLY the supplied fact.\nDo NOT invent vital signs, allergies, medications, doses, hospitalizations, intubation history, or new clinical facts.\nDo NOT volunteer the entire SAMPLE/OPQRST history.\nIf the fact is insufficient, say you are having trouble talking and ask what they need.\nKeep the answer under 45 words. Educational simulation only.`,
        input: JSON.stringify({ question, factKey, fact: factBlob, speech }),
        max_output_tokens: 120
      })
    });
    const payload = await response.json().catch(() => ({}));
    const reply = cleanText(outputText(payload), 320);
    if (!response.ok || !reply) return json({ source: 'fallback', reason: 'ai_unavailable', reply: fallback });

    // Reject obvious invention of numbers that look like vitals/doses if not present in fact
    if (/\b\d+\s*%\b/.test(reply) && !/%/.test(factBlob)) return json({ source: 'fallback', reason: 'unsafe_ai_output', reply: fallback });
    if (/\b\d+\s*mg\b/i.test(reply) && !/\bmg\b/i.test(factBlob)) return json({ source: 'fallback', reason: 'unsafe_ai_output', reply: fallback });

    return json({ source: 'ai', reply, factKey });
  } catch {
    return json({ source: 'fallback', reason: 'ai_unavailable', reply: fallback });
  }
};

export const config = { path: '/api/patient-simulator-v2-chat' };
