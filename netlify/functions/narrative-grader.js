'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const scenarioPaths = [
  path.join(__dirname, 'data', 'narrative-lab-scenarios.json'),
  path.join(__dirname, '..', '..', 'data', 'narrative-lab-scenarios.json')
];
const scenarioPath = scenarioPaths.find(candidate => fs.existsSync(candidate));
const scenarios = scenarioPath ? JSON.parse(fs.readFileSync(scenarioPath, 'utf8')) : [];
const requestBuckets = new Map();

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

function callOpenAI(apiKey, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const request = https.request({ hostname: 'api.openai.com', path: '/v1/responses', method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res => {
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
  if (!scenarios.length) return response(503, { error: 'The scenario library is unavailable.' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (_) { return response(400, { error: 'Invalid request.' }); }
  if (body.website) return response(400, { error: 'Invalid request.' });
  const narrative = String(body.narrative || '').trim();
  const scenario = scenarios.find(item => item.id === body.scenarioId);
  const format = ['chronological', 'chart', 'soap'].includes(body.format) ? body.format : 'chronological';
  const level = ['Beginner', 'EMT', 'Paramedic'].includes(body.level) ? body.level : 'EMT';
  if (!scenario) return response(400, { error: 'Choose a valid scenario.' });
  if (narrative.length < 80) return response(400, { error: 'The narrative is too short to grade.' });
  if (narrative.length > 8000) return response(413, { error: 'The narrative exceeds the 8,000-character limit.' });
  if (possibleIdentifier(narrative)) return response(400, { error: 'Possible patient-identifying information was detected. Remove it before submitting.' });
  if (!process.env.OPENAI_API_KEY) return response(503, { error: 'AI grading is not configured yet.' });

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
    const aiResult = await callOpenAI(process.env.OPENAI_API_KEY, {
      model: process.env.OPENAI_NARRATIVE_MODEL || 'gpt-5-mini',
      store: false,
      instructions,
      input,
      max_output_tokens: 3000,
      text: { format: { type: 'json_schema', name: 'ems_narrative_grade', strict: true, schema: gradeSchema } }
    });
    const output = extractOutputText(aiResult);
    if (!output) throw new Error('The AI grader returned no feedback.');
    return response(200, validateResult(JSON.parse(output)));
  } catch (error) {
    console.error('Narrative grader:', error.message);
    return response(502, { error: 'The AI grader could not complete this review. Please try again.' });
  }
};
