const OPENAI_URL = 'https://api.openai.com/v1/responses';
const MAX_CANDIDATES = 10;
const MAX_RESULTS = 4;
const MAX_BODY_BYTES = 12_000;

// Server-side allowlist is intentional. The model never receives patient answers,
// vitals, treatment rules, scoring logic, or arbitrary user-supplied clinical text.
const ASTHMA_QUESTIONS = Object.freeze({
  chief_complaint: 'What is bothering you most?',
  symptoms: 'What symptoms are you having?',
  onset: 'When did this begin?',
  provocation: 'What makes it better or worse?',
  quality: 'How would you describe it?',
  radiation: 'Does it go anywhere?',
  severity: 'How severe is it?',
  time: 'Has it changed over time?',
  allergies: 'Do you have allergies?',
  medications: 'What medications do you take?',
  medical_history: 'What medical problems do you have?',
  last_intake: 'When did you last eat or drink?',
  events: 'What were you doing when it started?',
  prior_episodes: 'Has this happened before?'
});

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store'
    }
  });
}

function parseOutputText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text.trim();
  const parts = [];
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (typeof content?.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

function parseJsonText(text) {
  return JSON.parse(String(text || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim());
}

function normalizeCandidates(body) {
  if (body?.scenarioId !== 'asthma' || !Array.isArray(body?.candidates)) return [];
  const seen = new Set();
  return body.candidates
    .map(item => String(item?.id || '').trim())
    .filter(id => ASTHMA_QUESTIONS[id] && !seen.has(id) && seen.add(id))
    .slice(0, MAX_CANDIDATES)
    .map(id => ({ id, meaning:ASTHMA_QUESTIONS[id] }));
}

function validateQuestions(raw, allowedIds) {
  const seen = new Set();
  return (Array.isArray(raw?.questions) ? raw.questions : [])
    .map(item => ({
      id:String(item?.id || '').trim(),
      label:String(item?.label || '').replace(/\s+/g, ' ').trim()
    }))
    .filter(item => allowedIds.has(item.id) && !seen.has(item.id) && seen.add(item.id))
    .filter(item => item.label.length >= 4 && item.label.length <= 90 && item.label.endsWith('?'))
    .slice(0, MAX_RESULTS);
}

export default async (request) => {
  if (request.method !== 'POST') return json({ error:'Method not allowed.' }, 405);

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return json({ error:'Request too large.' }, 413);
  }

  let body;
  try { body = JSON.parse(rawBody || '{}'); }
  catch (_) { return json({ error:'Invalid JSON.' }, 400); }

  const candidates = normalizeCandidates(body);
  if (!candidates.length) return json({ error:'No approved asthma questions supplied.' }, 400);

  const asked = new Set((Array.isArray(body?.askedIds) ? body.askedIds : []).map(String).filter(id => ASTHMA_QUESTIONS[id]));
  const apiKey = Netlify.env.get('OPENAI_API_KEY');
  const model = Netlify.env.get('EMSCODESIM_QUESTION_MODEL') || 'gpt-5.6-luna';
  if (!apiKey) {
    return json({ questions:[], source:'fallback', reason:'ai_not_configured' });
  }

  const candidateText = candidates
    .map(item => `- ${item.id}: ${item.meaning}${asked.has(item.id) ? ' (already asked)' : ''}`)
    .join('\n');

  const instructions = `You generate ONLY quick-response button wording for a fictional EMT training simulator.\n\nRules:\n- Select up to four IDs only from the supplied approved list.\n- Prefer questions not marked already asked.\n- Keep a useful mix of focused history questions; do not turn the choices into an obvious answer key.\n- Rewrite each selected meaning as a natural question an EMT could say directly to this patient.\n- Preserve the clinical meaning exactly.\n- Do not add clinical facts, patient answers, diagnoses, hints, treatment advice, or scoring language.\n- Each label must be 90 characters or fewer and end with a question mark.\n- Return JSON only in this shape: {"questions":[{"id":"onset","label":"When did the breathing trouble start?"}]}.`;

  const input = `Scenario: adult respiratory-distress history interview.\nApproved question IDs and meanings:\n${candidateText}\n\nChoose and rewrite up to four.`;

  try {
    const response = await fetch(OPENAI_URL, {
      method:'POST',
      headers:{
        Authorization:`Bearer ${apiKey}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        model,
        instructions,
        input,
        max_output_tokens:260
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('scenario-question-labels OpenAI error', response.status, payload?.error?.message || 'unknown');
      return json({ questions:[], source:'fallback', reason:'ai_unavailable' });
    }

    const parsed = parseJsonText(parseOutputText(payload));
    const questions = validateQuestions(parsed, new Set(candidates.map(item => item.id)));
    if (!questions.length) return json({ questions:[], source:'fallback', reason:'invalid_ai_output' });
    return json({ questions, source:'ai', model });
  } catch (error) {
    console.error('scenario-question-labels failure', error?.message || error);
    return json({ questions:[], source:'fallback', reason:'ai_unavailable' });
  }
};

export const config = {
  path:'/api/scenario-question-labels'
};
