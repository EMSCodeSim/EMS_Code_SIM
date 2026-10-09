'use strict';

const https = require('https');
const scenarios = require('./data/narrative-lab-scenarios.json');
const requestBuckets = new Map();
const rubricLabels = ['Cue recognition','Prioritization','Reasoning','Reassessment','Communication'];
const schema = {
  type:'object',additionalProperties:false,
  required:['summary','rubric','strengths','opportunities','reflectionQuestion'],
  properties:{
    summary:{type:'string'},
    rubric:{type:'array',minItems:5,maxItems:5,items:{type:'object',additionalProperties:false,required:['label','score','feedback'],properties:{label:{type:'string',enum:rubricLabels},score:{type:'integer',minimum:0,maximum:4},feedback:{type:'string'}}}},
    strengths:{type:'array',maxItems:4,items:{type:'string'}},
    opportunities:{type:'array',maxItems:4,items:{type:'string'}},
    reflectionQuestion:{type:'string'}
  }
};

function response(statusCode,body){return {statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},body:JSON.stringify(body)}}
function clientAddress(event){return String(event.headers?.['x-nf-client-connection-ip']||event.headers?.['x-forwarded-for']||'unknown').split(',')[0].trim()}
function rateLimited(event){const key=clientAddress(event);const now=Date.now();const recent=(requestBuckets.get(key)||[]).filter(value=>now-value<60_000);recent.push(now);requestBuckets.set(key,recent);return recent.length>8}
function env(name){return globalThis.Netlify?.env?.get?.(name)||process.env[name]}
function possibleIdentifier(text){return /\b(?:patient name|full name|date of birth|\bdob\b|home address|phone number|incident number|report number)\s*(?:is|:|#)/i.test(text)}
function clean(value,max=800){return String(value??'').replace(/\s+/g,' ').trim().slice(0,max)}
function callAI(apiKey,baseUrl,payload){
  return new Promise((resolve,reject)=>{
    const body=JSON.stringify(payload);const base=String(baseUrl||'https://api.openai.com/v1').replace(/\/+$/,'')+'/';const endpoint=new URL('responses',base);
    const headers={'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)};if(apiKey)headers.Authorization=`Bearer ${apiKey}`;
    const request=https.request({hostname:endpoint.hostname,port:endpoint.port||443,path:endpoint.pathname+endpoint.search,method:'POST',headers},res=>{
      let data='';res.setEncoding('utf8');res.on('data',chunk=>{data+=chunk});res.on('end',()=>{let parsed;try{parsed=JSON.parse(data)}catch(_){return reject(new Error('Unreadable AI response.'))}if(res.statusCode<200||res.statusCode>=300)return reject(new Error(parsed.error?.message||`AI service error (${res.statusCode}).`));resolve(parsed)});
    });
    request.setTimeout(24_000,()=>request.destroy(new Error('AI request timed out.')));request.on('error',reject);request.end(body);
  });
}
function outputText(result){if(typeof result.output_text==='string')return result.output_text;for(const item of result.output||[])for(const content of item.content||[])if(content.type==='output_text'&&typeof content.text==='string')return content.text;return ''}
function sanitize(body){
  const scenario=scenarios.find(item=>item.id===clean(body?.scenarioId,80));
  if(!scenario)throw new Error('Choose a valid case.');
  if(!['Beginner','EMT','Paramedic'].includes(body?.level))throw new Error('Choose a valid learner level.');
  if(!['solo','group'].includes(body?.mode))throw new Error('Choose solo or group practice.');
  if(!Array.isArray(body?.decisions)||body.decisions.length!==5)throw new Error('Complete each decision before requesting feedback.');
  const decisions=body.decisions.map((item,index)=>({stage:['arrival','history','assessment','vitals','reassessment'][index],action:clean(item?.action,1600),reasoning:clean(item?.reasoning,1600)}));
  if(decisions.some(item=>item.action.length<8||item.reasoning.length<12))throw new Error('Each decision needs an action and a brief explanation.');
  return {scenario,level:body.level,mode:body.mode,decisions};
}
function validate(result){
  if(!result||typeof result.summary!=='string'||!result.summary.trim()||typeof result.reflectionQuestion!=='string'||!result.reflectionQuestion.trim())throw new Error('Incomplete coaching response.');
  if(!Array.isArray(result.rubric)||result.rubric.length!==rubricLabels.length||!Array.isArray(result.strengths)||result.strengths.length>4||!Array.isArray(result.opportunities)||result.opportunities.length>4)throw new Error('Invalid coaching response.');
  const labels=new Set();
  for(const item of result.rubric){if(!rubricLabels.includes(item.label)||labels.has(item.label)||!Number.isInteger(item.score)||item.score<0||item.score>4||!String(item.feedback||'').trim())throw new Error('Invalid coaching rubric.');labels.add(item.label);}
  result.rubric.sort((left,right)=>rubricLabels.indexOf(left.label)-rubricLabels.indexOf(right.label));
  return result;
}

exports.handler=async event=>{
  if(event.httpMethod!=='POST')return response(405,{error:'Method not allowed.'});
  if(rateLimited(event))return response(429,{error:'Too many debrief requests. Wait one minute and try again.'});
  const raw=String(event.body||'');if(Buffer.byteLength(raw)>18_000)return response(413,{error:'Request is too large.'});
  if(possibleIdentifier(raw))return response(400,{error:'Remove possible patient-identifying information before requesting feedback.'});
  let body;try{body=JSON.parse(raw||'{}')}catch(_){return response(400,{error:'Invalid request.'})}
  let input;try{input=sanitize(body)}catch(error){return response(400,{error:error.message})}
  const apiKey=env('OPENAI_API_KEY');const baseUrl=env('OPENAI_BASE_URL');
  if(!apiKey&&!baseUrl)return response(503,{error:'AI coaching is not enabled for this site yet.'});
  const caseFacts={dispatch:input.scenario.dispatch,scene:input.scenario.scene,history:input.scenario.history,findings:input.scenario.findings,vitals:input.scenario.vitals,response:input.scenario.response,care:input.scenario.care,disposition:input.scenario.disposition};
  const instructions=`You are an EMS clinical-judgment instructor reviewing a fictional training exercise. Give reflective, supportive feedback about how the learner noticed cues, set priorities, explained uncertainty, reassessed, and communicated. The supplied case is the only source of truth. Never invent a case fact or assume an action occurred when it is not in the recorded decisions. Keep the feedback at the learner's stated level (${input.level}). Do not provide patient-care instructions, diagnosis, medication names or doses, or local-protocol claims. Do not say a choice is clinically correct based on information that is not supplied. If a learner makes an unsupported assumption, describe what information would be needed to support it. Do not rank the team or present this as a competency certification. Scores are formative self-reflection signals from 0 to 4, not a clinical grade. Provide exactly one item for each rubric dimension and one open reflection question. Keep each item concise and actionable. This is educational simulation feedback only.`;
  const prompt={mode:input.mode,caseFacts,decisions:input.decisions};
  try{
    const result=await callAI(apiKey,baseUrl,{model:env('EMSCODESIM_CRITICAL_THINKING_MODEL')||env('OPENAI_NARRATIVE_MODEL')||'gpt-4.1-mini',store:false,instructions,input:JSON.stringify(prompt),max_output_tokens:1000,text:{format:{type:'json_schema',name:'ems_clinical_judgment_debrief',strict:true,schema}}});
    const debrief=validate(JSON.parse(outputText(result)));return response(200,{source:'ai',debrief});
  }catch(error){console.error('critical-thinking-coach error',error?.message||error);return response(502,{error:'AI feedback could not be prepared. Your practice notes remain on this device; try again later.'})}
};
