'use strict';

const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, 'data', 'ems-drills.json');

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(204, {});
  if (event.httpMethod !== 'GET') return response(405, { ok: false, error: 'method_not_allowed' });

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const drills = (catalog.drills || []).map((drill) => ({
    id: drill.id,
    version: drill.version,
    slug: drill.slug,
    title: drill.title,
    categoryId: drill.categoryId,
    certificationLevels: drill.certificationLevels,
    estimatedMinutes: drill.estimatedMinutes,
    difficulty: drill.difficulty,
    crewType: drill.crewType,
    completionType: drill.completionType,
    summary: drill.summary,
    launchUrl: `https://emscodesim.com/ems-drill.html?id=${encodeURIComponent(drill.id)}`,
    publicUrl: `https://emscodesim.com/ems-drills/${encodeURIComponent(drill.slug)}.html`
  }));

  return response(200, {
    ok: true,
    product: 'EMSCodeSim',
    integration: 'responder-roadmap',
    updated: catalog.updated,
    categories: catalog.categories,
    drills,
    count: drills.length
  });
};
