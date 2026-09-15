const OPENAI_URL = 'https://api.openai.com/v1/responses';
const REQUESTS_PER_MINUTE = 8;
const MAX_BODY_BYTES = 16_000;
const requestBuckets = new Map();
const SCENARIOS = new Set(['asthma','stroke','hypoglycemia','trauma','pediatric','horse_crush']);
const PHASES = new Set(['scene','primary','focused','vitals','treatment','reassessment','impression','handoff']);
const LESSONS = new Set(['primary_assessment','history','vitals','treatment','reassessment','transport_handoff']);

const coachingSchema = {
  type:'object',additionalProperties:false,
  required:['headline','summary','strengths','priorityAction','sequenceFeedback','reassessmentFeedback','nextAttemptGoal','reflectionQuestion','lessonFocus'],
  properties:{
    headline:{type:'string'},summary:{type:'string'},strengths:{type:'array',maxItems:3,items:{type:'string'}},
    priorityAction:{type:'string'},sequenceFeedback:{type:'string'},reassessmentFeedback:{type:'string'},
    nextAttemptGoal:{type:'string'},reflectionQuestion:{type:'string'},lessonFocus:{type:'string',enum:[...LESSONS]}
  }
};

function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}})}
function cleanText(value,max=400){return String(value??'').replace(/\s+/g,' ').trim().slice(0,max)}
function score(value){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(100,Math.round(n))):0}
function strings(value,maxItems=6){return (Array.isArray(value)?value:[]).map(x=>cleanText(x)).filter(Boolean).slice(0,maxItems)}
function possibleIdentifier(value){return /\b(?:patient name|full name|date of birth|dob|home address|phone number|incident number|report number)\s*(?:is|:|#)/i.test(value)}
function rateLimited(request,context){const key=String(context?.ip||request.headers.get('x-nf-client-connection-ip')||'unknown').split(',')[0].trim();const now=Date.now();const recent=(requestBuckets.get(key)||[]).filter(x=>now-x<60_000);recent.push(now);requestBuckets.set(key,recent);return recent.length>REQUESTS_PER_MINUTE}
function outputText(payload){if(typeof payload?.output_text==='string')return payload.output_text.trim();const parts=[];for(const item of Array.isArray(payload?.output)?payload.output:[])for(const content of Array.isArray(item?.content)?item.content:[])if(typeof content?.text==='string')parts.push(content.text);return parts.join('\n').trim()}

function sanitizedInput(body){
  const scenarioId=cleanText(body?.scenarioId,40).toLowerCase();
  if(!SCENARIOS.has(scenarioId))throw new Error('Unsupported scenario.');
  const categories=body?.categoryScores||{};
  return {
    scenarioId,authoritativeGrade:{score:score(body?.score),label:cleanText(body?.label,40),categoryScores:{clinical:score(categories.clinical),treatment:score(categories.treatment),communication:score(categories.communication)}},
    phaseRatings:(Array.isArray(body?.phaseRatings)?body.phaseRatings:[]).filter(x=>PHASES.has(cleanText(x?.id,30))).slice(0,8).map(x=>({id:cleanText(x.id,30),label:cleanText(x.label,80),score:score(x.score),rating:cleanText(x.rating,40),detail:cleanText(x.detail)})),
    documentedStrengths:strings(body?.strengths,5),documentedOpportunities:strings(body?.opportunities,6),criticalErrors:strings(body?.criticalErrors,4),
    priorities:(Array.isArray(body?.priorities)?body.priorities:[]).slice(0,3).map(x=>({level:cleanText(x?.level,20),title:cleanText(x?.title,80),detail:cleanText(x?.detail)}))
  };
}

function validCoaching(value){
  if(!value||typeof value!=='object'||!LESSONS.has(value.lessonFocus))return false;
  for(const key of ['headline','summary','priorityAction','sequenceFeedback','reassessmentFeedback','nextAttemptGoal','reflectionQuestion'])if(!cleanText(value[key]))return false;
  return Array.isArray(value.strengths)&&value.strengths.length<=3&&value.strengths.every(x=>cleanText(x));
}

export default async (request,context)=>{
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  if(rateLimited(request,context))return json({source:'fallback',reason:'rate_limited'},429);
  const raw=await request.text();
  if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES)return json({error:'Request too large.'},413);
  if(possibleIdentifier(raw))return json({error:'Remove patient-identifying information before requesting AI feedback.'},400);
  let body;try{body=JSON.parse(raw||'{}')}catch{return json({error:'Invalid JSON.'},400)}
  let input;try{input=sanitizedInput(body)}catch(error){return json({error:error.message},400)}
  const apiKey=Netlify.env.get('OPENAI_API_KEY');
  const model=Netlify.env.get('EMSCODESIM_DEBRIEF_MODEL')||Netlify.env.get('OPENAI_NARRATIVE_MODEL')||'gpt-4.1-mini';
  if(!apiKey)return json({source:'fallback',reason:'ai_not_configured'});
  const instructions=`You are an encouraging but rigorous EMS simulation instructor providing a concise post-scenario debrief.\nThe supplied deterministic score, category scores, phase ratings, critical errors, strengths, opportunities, and priorities are authoritative. Explain them; never change, recalculate, contradict, or replace the score.\nUse only supplied facts. Never invent a finding, action, omission, patient response, treatment, diagnosis, or protocol requirement. Do not provide medication doses or protocol-specific medical advice.\nAddress critical errors first when present. Distinguish assessment sequence from treatment and reassessment. Give one concrete, measurable next-attempt goal and one reflective question.\nSelect one lessonFocus from the allowed enum that best matches the authoritative coaching priorities. Do not create a URL.\nThis is educational simulation feedback, not patient-care direction. Return only the required structured coaching.`;
  try{
    const response=await fetch(OPENAI_URL,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({
      model,store:false,instructions,input:JSON.stringify(input),max_output_tokens:750,
      text:{format:{type:'json_schema',name:'ems_scenario_debrief_coaching',strict:true,schema:coachingSchema}}
    })});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){console.error('scenario-debrief-coach OpenAI error',response.status,payload?.error?.message||'unknown');return json({source:'fallback',reason:'ai_unavailable'})}
    const coaching=JSON.parse(outputText(payload));
    if(!validCoaching(coaching))return json({source:'fallback',reason:'invalid_ai_output'});
    return json({source:'ai',model,coaching});
  }catch(error){console.error('scenario-debrief-coach failure',error?.message||error);return json({source:'fallback',reason:'ai_unavailable'})}
};

export const config={path:'/api/scenario-debrief-coach'};
