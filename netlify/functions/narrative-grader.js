'use strict';

const https = require('https');
const { neon } = require('@neondatabase/serverless');
const scenarios = require('./data/narrative-lab-scenarios.json');
const requestBuckets = new Map();
const classCompletionAnswers = [0, 2, 0, 1, 1, 2, 0, 1, 2, 2];

function validateClassCompletion(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid class completion data.');
  const learnerName = String(value.learnerName || '').trim().replace(/\\s+/g, ' ');
  if (learnerName.length < 2 || learnerName.length > 120 || /[\\u0000-\\u001f\\u007f]/.test(learnerName)) throw new Error('Enter a valid learner name.');
  if (value.consent !== true || value.version !== 'ems-report-writing-class-v1') throw new Error('Class completion consent or version is invalid.');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value.submissionKey || ''))) throw new Error('Invalid class completion key.');
  if (!Array.isArray(value.quizAnswers) || value.quizAnswers.length !== classCompletionAnswers.length ||
      value.quizAnswers.some(answer => !Number.isInteger(answer) || answer < 0 || answer > 3)) {
    throw new Error('Complete all 10 written test questions.');
  }
  const correct = value.quizAnswers.reduce((sum, answer, index) => sum + (answer === classCompletionAnswers[index] ? 1 : 0), 0);
  return { submissionKey: value.submissionKey, learnerName, correct, score: correct * 10 };
}

async function saveClassCompletion(completion, aiScore) {
  const databaseUrl = env('EMS_REPORT_CLASS_DATABASE_URL');
  if (!databaseUrl) throw new Error('Database is not configured.');
  const sql = neon(databaseUrl);
  await sql`INSERT INTO ems_report_class_completions
    (submission_key, learner_name, written_test_correct, written_test_total, written_test_score, ai_narrative_score, class_version)
    VALUES (${completion.submissionKey}::uuid, ${completion.learnerName}, ${completion.correct}, 10, ${completion.score}, ${aiScore}, 'ems-report-writing-class-v1')
    ON CONFLICT (submission_key) DO NOTHING`;
}

const categoryDefinitions = [
  ['completeness', 20], ['clinical accuracy', 20], ['organization', 12], ['objectivity', 12],
  ['pertinent negatives', 10], ['medical necessity', 10], ['documentation safety', 10], ['writing quality', 6]
];

const gradeSchema = {
  type: 'object', additionalProperties: false,
  required: ['totalScore', 'summary', 'categories', 'strengths', 'priorityImprovements', 'missingFacts', 'unsupportedStatements', 'contradictions', 'lineFeedback', 'exampleNarrative'],
  properties: {
    totalScore: { type: 'integer' },
    summary: { type: 'string' },
    categories: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['name', 'score', 'maxScore', 'feedback'],
        properties: {
          name: { type: 'string', enum: categoryDefinitions.map(item => item[0]) },
          score: { type: 'integer' },
          maxScore: { type: 'integer', enum: [6, 10, 12, 20] },
          feedback: { type: 'string' }
        }
      }
    },
    strengths: { type: 'array', items: { type: 'string' } },
    priorityImprovements: { type: 'array', items: { type: 'string' } },
    missingFacts: { type: 'array', items: { type: 'string' } },
    unsupportedStatements: { type: 'array', items: { type: 'string' } },
    contradictions: { type: 'array', items: { type: 'string' } },
    lineFeedback: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['excerpt', 'coaching'], properties: { excerpt: { type: 'string' }, coaching: { type: 'string' } } }
    },
    exampleNarrative: { type: 'string' }
  }
};

function response(statusCode, body, headers = {}) {
  return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }, body: JSON.stringify(body) };
}

function clientAddress(event) {
  return String(event.headers?.['x-nf-client-connection-ip'] || event.headers?.['x-forwarded-for'] || 'unknown').split(',')[0].trim();
}

function rateLimited(event) {
  const key = clientAddress(event);
  const now = Date.now();
  const recent = (requestBuckets.get(key) || []).filter(timestamp => now - timestamp < 60_000);
  recent.push(now);
  requestBuckets.set(key, recent);
  return recent.length > 8;
}

function possibleIdentifier(text) {
  return /\b(?:patient name|full name|date of birth|dob|home address|phone number|incident number|report number)\s*(?:is|:|#)/i.test(text);
}

function env(name) {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name];
}

function callOpenAI(apiKey, baseUrl, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const base = String(baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/';
    const endpoint = new URL('responses', base);
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const request = https.request({ hostname: endpoint.hostname, port: endpoint.port || 443, path: endpoint.pathname + endpoint.search, method: 'POST', headers }, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch (_) { return reject(new Error('The AI service returned an unreadable response.')); }
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(parsed.error?.message || `AI service error (${res.statusCode}).`));
        resolve(parsed);
      });
    });
    request.setTimeout(28_000, () => request.destroy(new Error('The AI grader timed out. Please try again.')));
    request.on('error', reject);
    request.end(body);
  });
}

function extractOutputText(result) {
  if (typeof result.output_text === 'string') return result.output_text;
  for (const item of result.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') return content.text;
    }
  }
  return '';
}

function validateResult(result) {
  const expected = new Map(categoryDefinitions);
  if (!Number.isInteger(result.totalScore) || result.totalScore < 0 || result.totalScore > 100) throw new Error('The AI grader returned an invalid score.');
  if (!Array.isArray(result.categories) || result.categories.length !== expected.size) throw new Error('The AI grader returned an incomplete rubric.');
  let sum = 0;
  const seen = new Set();
  for (const category of result.categories) {
    const max = expected.get(category.name);
    if (!max || seen.has(category.name) || category.maxScore !== max || !Number.isInteger(category.score) || category.score < 0 || category.score > max) throw new Error('The AI grader returned an invalid category score.');
    seen.add(category.name); sum += category.score;
  }
  result.totalScore = sum;
  return result;
}

exports.handler = async event => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed.' }, { Allow: 'POST, OPTIONS' });
  if (rateLimited(event)) return response(429, { error: 'Too many grading requests. Wait one minute and try again.' });
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (_) { return response(400, { error: 'Invalid request.' }); }
  if (body.website) return response(400, { error: 'Invalid request.' });
  let classCompletion = null;
  if (body.classCompletion !== undefined && body.classCompletion !== null) {
    try { classCompletion = validateClassCompletion(body.classCompletion); }
    catch (error) { return response(400, { error: error.message }); }
  }
  const narrative = String(body.narrative || '').trim();
  const scenario = scenarios.find(item => item.id === body.scenarioId);
  const format = ['chronological', 'chart', 'soap'].includes(body.format) ? body.format : 'chronological';
  const level = ['Beginner', 'EMT', 'Paramedic'].includes(body.level) ? body.level : 'EMT';
  if (!scenario) return response(400, { error: 'Choose a valid scenario.' });
  if (narrative.length < 80) return response(400, { error: 'The narrative is too short to grade.' });
  if (narrative.length > 8000) return response(413, { error: 'The narrative exceeds the 8,000-character limit.' });
  if (possibleIdentifier(narrative)) return response(400, { error: 'Possible patient-identifying information was detected. Remove it before submitting.' });
  const apiKey = env('OPENAI_API_KEY');
  const baseUrl = env('OPENAI_BASE_URL');
  if (!apiKey && !baseUrl) return response(503, { error: 'AI grading is not enabled for this site yet.' });

  const instructions = `You are a strict but constructive EMS documentation instructor grading a learner's fictional PCR narrative.
Use only the supplied scenario as ground truth. Never infer that an undocumented finding was normal. Never reward invented facts.
If the learner states any assessment, history, treatment, dose, time, response, destination detail, or other fact absent from or conflicting with the scenario, list it under unsupportedStatements or contradictions and reduce clinical accuracy and documentation safety.
Do not give patient-care advice or judge whether the scenario's care matches a particular local protocol. Grade documentation of the supplied facts.
Grade these exact categories and maxima: completeness 20; clinical accuracy 20; organization 12; objectivity 12; pertinent negatives 10; medical necessity 10; documentation safety 10; writing quality 6. Category scores must sum to totalScore.
Medical necessity means the narrative connects complaint, objective findings, care, monitoring, transport, destination rationale when supplied, and transfer—not billing language.
At ${level} level, be encouraging but specific. Respect the learner's requested ${format} format; do not deduct for a different reasonable structure unless it harms clarity.
Quote no more than short excerpts from the learner. The example narrative must use only scenario facts, must not add exact medication doses unless supplied, and must not claim a test or reassessment that is absent.
Return concise, actionable feedback. Empty arrays are allowed when no issue exists.`;

  const input = JSON.stringify({ scenario, learner: { level, format, narrative } });
  try {
    const aiResult = await callOpenAI(apiKey, baseUrl, {
      model: env('OPENAI_NARRATIVE_MODEL') || 'gpt-5-mini',
      store: false,
      instructions,
      input,
      max_output_tokens: 3000,
      text: { format: { type: 'json_schema', name: 'ems_narrative_grade', strict: true, schema: gradeSchema } }
    });
    const output = extractOutputText(aiResult);
    if (!output) throw new Error('The AI grader returned no feedback.');
    const graded = validateResult(JSON.parse(output));
    if (classCompletion) {
      graded.courseCompletionAttempted = true;
      graded.writtenTestScore = classCompletion.score;
      graded.aiNarrativeScore = graded.totalScore;
      try {
        await saveClassCompletion(classCompletion, graded.totalScore);
        graded.courseCompletionSaved = true;
      } catch (_) {
        console.error('Narrative grader could not save a class completion record.');
        graded.courseCompletionSaved = false;
      }
    }
    return response(200, graded);
  } catch (error) {
    console.error('Narrative grader:', error.message);
    return response(502, { error: 'The AI grader could not complete this review. Please try again.' });
  }
};
