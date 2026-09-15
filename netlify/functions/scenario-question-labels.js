const OPENAI_URL = 'https://api.openai.com/v1/responses';
const MAX_CANDIDATES = 10;
const MAX_RESULTS = 4;
const MAX_BODY_BYTES = 12_000;
const REQUESTS_PER_MINUTE = 20;
const requestBuckets = new Map();

// Server-side allowlists are intentional. The model never receives patient
// answers, vitals, treatment rules, scoring logic, or arbitrary clinical text.
const COMMON_QUESTIONS = Object.freeze({
  chief_complaint:'What is bothering you most?', symptoms:'What symptoms are you having?',
  onset:'When did this begin?', provocation:'What makes it better or worse?',
  quality:'How would you describe it?', radiation:'Does it go anywhere?',
  severity:'How severe is it?', time:'Has it changed over time?',
  progression:'How has the problem changed?', allergies:'Do you have allergies?',
  medications:'What medications do you take?', medical_history:'What medical problems do you have?',
  last_intake:'When did you last eat or drink?', events:'What happened before this?',
  prior_episodes:'Has this happened before?', loss_consciousness:'Did you lose consciousness?'
});

const SCENARIOS = Object.freeze({
  asthma:{
    context:'adult respiratory-distress history interview',
    ids:['chief_complaint','symptoms','onset','provocation','quality','radiation','severity','time','allergies','medications','medical_history','last_intake','events','prior_episodes']
  },
  stroke:{
    context:'suspected stroke history interview with the patient and family; prioritize time-sensitive history',
    ids:['chief_complaint','symptoms','onset','last_known_well','progression','allergies','medications','medical_history','last_intake','events','seizure_trauma'],
    extra:{last_known_well:'When was the patient last known well?',seizure_trauma:'Was there a seizure, fall, or injury?'}
  },
  hypoglycemia:{
    context:'altered-mental-status history interview with the patient and a coworker',
    ids:['chief_complaint','symptoms','onset','progression','allergies','medications','medical_history','last_intake','events','substances'],
    extra:{substances:'Could alcohol, recreational drugs, or an overdose be involved?'}
  },
  trauma:{
    context:'motor-vehicle trauma history interview with a conscious patient',
    ids:['chief_complaint','symptoms','onset','provocation','quality','radiation','severity','time','allergies','medications','medical_history','last_intake','events','loss_consciousness']
  },
  pediatric:{
    context:'pediatric respiratory-illness history interview with a caregiver',
    ids:['chief_complaint','symptoms','onset','progression','allergies','medications','medical_history','last_intake','events','urine_output','sick_contacts'],
    extra:{urine_output:'Has the child been urinating normally?',sick_contacts:'Has anyone around the child been sick?'}
  },
  horse_crush:{
    context:'farm trauma history interview with a conscious patient who has a painful hip and leg injury',
    ids:['name','dob','age','address','emergency_contact','chief_complaint','symptoms','onset','provocation','quality','radiation','severity','time','allergies','medications','medical_history','last_intake','events','loss_consciousness','position','other_injuries','numbness_tingling','nausea_dizziness','stepped_on','moved_since_injury','anticoagulants','prior_hip_leg','baseline_mobility'],
    extra:{
      name:'What is your name?',dob:'What is your date of birth?',age:'How old are you?',address:'What is your address?',
      emergency_contact:'Is there an emergency contact or support person?',position:'Can you move or straighten the injured leg?',
      other_injuries:'Does anything else hurt?',numbness_tingling:'Is there numbness or tingling in the injured leg?',
      nausea_dizziness:'Do you feel nauseated, dizzy, or lightheaded?',stepped_on:'Did either horse step on you?',
      moved_since_injury:'Has anyone moved you since the injury?',anticoagulants:'Do you take blood thinners?',
      prior_hip_leg:'Have you had prior hip or leg problems?',baseline_mobility:'How do you normally get around?'
    }
  }
});

const SCENARIO_ALIASES = Object.freeze({respiratory:'asthma',mva:'trauma',mvc:'trauma',horse:'horse_crush'});

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
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

function scenarioConfig(rawId) {
  const requested = String(rawId || '').trim().toLowerCase();
  return SCENARIOS[SCENARIO_ALIASES[requested] || requested] || null;
}

function questionCatalog(config) {
  return Object.fromEntries(config.ids.map(id => [id,config.extra?.[id] || COMMON_QUESTIONS[id]]).filter(([,meaning]) => meaning));
}

function normalizeCandidates(body, catalog) {
  if (!Array.isArray(body?.candidates)) return [];
  const seen = new Set();
  return body.candidates.map(item => String(item?.id || '').trim())
    .filter(id => catalog[id] && !seen.has(id) && seen.add(id)).slice(0,MAX_CANDIDATES)
    .map(id => ({id,meaning:catalog[id]}));
}

function validateQuestions(raw, allowedIds) {
  const seen = new Set();
  return (Array.isArray(raw?.questions) ? raw.questions : []).map(item => ({
    id:String(item?.id || '').trim(),label:String(item?.label || '').replace(/\s+/g,' ').trim()
  })).filter(item => allowedIds.has(item.id) && !seen.has(item.id) && seen.add(item.id))
    .filter(item => item.label.length >= 4 && item.label.length <= 90 && item.label.endsWith('?')).slice(0,MAX_RESULTS);
}

function rateLimited(request, context) {
  const key = String(context?.ip || request.headers.get('x-nf-client-connection-ip') || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const recent = (requestBuckets.get(key) || []).filter(timestamp => now - timestamp < 60_000);
  recent.push(now);
  requestBuckets.set(key,recent);
  return recent.length > REQUESTS_PER_MINUTE;
}

export default async (request, context) => {
  if (request.method !== 'POST') return json({error:'Method not allowed.'},405);
  if (rateLimited(request,context)) return json({questions:[],source:'fallback',reason:'rate_limited'},429);

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return json({error:'Request too large.'},413);
  let body;
  try { body = JSON.parse(rawBody || '{}'); }
  catch (_) { return json({error:'Invalid JSON.'},400); }

  const config = scenarioConfig(body?.scenarioId);
  if (!config) return json({error:'Unsupported scenario.'},400);
  const catalog = questionCatalog(config);
  const candidates = normalizeCandidates(body,catalog);
  if (!candidates.length) return json({error:'No approved scenario questions supplied.'},400);

  const asked = new Set((Array.isArray(body?.askedIds) ? body.askedIds : []).map(String).filter(id => catalog[id]));
  const priority = new Set((Array.isArray(body?.priorityIds) ? body.priorityIds : []).map(String).filter(id => catalog[id]));
  const apiKey = Netlify.env.get('OPENAI_API_KEY');
  const model = Netlify.env.get('EMSCODESIM_QUESTION_MODEL') || Netlify.env.get('OPENAI_NARRATIVE_MODEL') || 'gpt-4.1-mini';
  if (!apiKey) return json({questions:[],source:'fallback',reason:'ai_not_configured'});

  const candidateText = candidates.map(item =>
    `- ${item.id}: ${item.meaning}${asked.has(item.id) ? ' (already asked)' : priority.has(item.id) ? ' (important unasked history)' : ''}`
  ).join('\n');
  const instructions = `You generate ONLY quick-response button wording for a fictional EMT training simulator.\n\nRules:\n- Select up to four IDs only from the supplied approved list.\n- Prefer clinically useful questions not marked already asked and prioritize IDs marked important.\n- Keep a useful mix and do not turn the choices into an obvious answer key or diagnose the patient.\n- Rewrite each selected meaning as a natural question an EMT could say directly to this patient or caregiver.\n- Preserve the clinical meaning exactly.\n- Do not add clinical facts, patient answers, diagnoses, hints, treatment advice, or scoring language.\n- Each label must be 90 characters or fewer and end with a question mark.\n- Return only the required structured questions.`;
  const input = `Scenario context: ${config.context}.\nApproved question IDs and meanings:\n${candidateText}\n\nChoose and rewrite up to four.`;

  try {
    const response = await fetch(OPENAI_URL,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({
      model,store:false,instructions,input,max_output_tokens:300,
      text:{format:{type:'json_schema',name:'scenario_quick_questions',strict:true,schema:{
        type:'object',additionalProperties:false,required:['questions'],properties:{questions:{type:'array',maxItems:MAX_RESULTS,items:{
          type:'object',additionalProperties:false,required:['id','label'],properties:{id:{type:'string'},label:{type:'string'}}
        }}}
      }}}
    })});
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('scenario-question-labels OpenAI error',response.status,payload?.error?.message || 'unknown');
      return json({questions:[],source:'fallback',reason:'ai_unavailable'});
    }
    const questions = validateQuestions(JSON.parse(parseOutputText(payload)),new Set(candidates.map(item => item.id)));
    if (!questions.length) return json({questions:[],source:'fallback',reason:'invalid_ai_output'});
    return json({questions,source:'ai',model});
  } catch (error) {
    console.error('scenario-question-labels failure',error?.message || error);
    return json({questions:[],source:'fallback',reason:'ai_unavailable'});
  }
};

export const config = {path:'/api/scenario-question-labels'};
