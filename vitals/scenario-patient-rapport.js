(() => {
'use strict';
const VERSION='2026.08.15.2',params=new URLSearchParams(location.search),requested=String(params.get('case')||'').replace(/-/g,'_').toLowerCase();
if(requested!=='horse_crush')return;
const api=window.EMSCodeSimPatientRecord,session=window.EMSCodeSimScenarioSession;
const EVENT_RULES=Object.freeze({
  patient_question_response:{label:'Responded to a patient question',points:3},
  supportive_response:{label:'Acknowledged pain or concern',points:4},
  explain_care:{label:'Explained care before acting',points:4},
  honest_uncertainty:{label:'Answered honestly without overpromising',points:3},
  dismissive_response:{label:'Dismissed the patient’s concern',points:-12},
  unanswered_concern:{label:'Left a patient concern unanswered',points:-6}
});
let events=[];
const record=()=>{try{return session?.sync?.()||api?.active?.()||null}catch(_){return null}};
function hydrate(){const saved=record()?.documentation?.patientCommunicationEvents;events=Array.isArray(saved)?saved.slice(-60).filter(event=>EVENT_RULES[event?.eventCode]):[]}
function totals(){const points=events.reduce((sum,event)=>sum+(EVENT_RULES[event.eventCode]?.points||0),0);return{points,positives:events.filter(event=>(EVENT_RULES[event.eventCode]?.points||0)>0).length,negatives:events.filter(event=>(EVENT_RULES[event.eventCode]?.points||0)<0).length}}
function mood(points){if(points>=16)return'calm-cooperative';if(points>=6)return'reassured';if(points<=-12)return'frustrated';if(points<0)return'anxious';return'uncertain'}
function model(){const t=totals();return{score:Math.max(0,Math.min(100,70+t.points)),rapport:t.points,mood:mood(t.points),answered:events.length,positiveResponses:t.positives,poorResponses:t.negatives,unanswered:events.filter(event=>event.eventCode==='unanswered_concern').length,repeatedUnanswered:0,events:events.map(event=>({...event,label:EVENT_RULES[event.eventCode].label,points:EVENT_RULES[event.eventCode].points}))}}
function save(){try{const r=record();if(!r)return;r.documentation=r.documentation||{};r.documentation.patientCommunicationEvents=events.slice(-60);r.documentation.patientCommunication=model();api?.save?.(r)}catch(_){}}
function recordResponse(text,source='provider-response',eventCode='patient_question_response'){if(!EVENT_RULES[eventCode])return;const rule=EVENT_RULES[eventCode];events.push({eventCode,type:source,response:String(text||''),at:new Date().toISOString()});if(events.length>60)events.shift();save();if(rule.points<0)window.EMSCodeSimPatientAnger?.change?.(rule.points<=-12?20:10,'unprofessional-provider-comment')}
function renderGrade(){const categories=document.getElementById('horseGradeCategories');if(!categories)return;let card=document.getElementById('horseCommunicationGrade');if(!card){card=document.createElement('article');card.id='horseCommunicationGrade';card.className='horse-grade-category horse-communication-grade';categories.appendChild(card)}const m=model();card.innerHTML=`<div><small>PATIENT COMMUNICATION</small><strong>${m.score}/100</strong></div><p><b>${m.score>=90?'Excellent patient communication':m.score>=80?'Strong communication':m.score>=70?'Adequate communication':'Communication needs improvement'}</b></p><p>${m.positiveResponses} positive communication event${m.positiveResponses===1?'':'s'} • ${m.poorResponses} harmful event${m.poorResponses===1?'':'s'} • patient: ${m.mood.replace(/-/g,' ')}</p>`}
function start(){hydrate();document.addEventListener('click',e=>{const choice=e.target.closest?.('#patientConversationTurn [data-patient-choice]');if(choice)recordResponse(choice.textContent||'','provider-response',choice.dataset.satisfactionEvent||'patient_question_response');if(e.target.closest?.('#openHorseCallGrade,.handoff-grade-button,[data-grade]'))setTimeout(renderGrade,100)},true);const style=document.createElement('style');style.dataset.patientRapport=VERSION;style.textContent='.horse-communication-grade{border:1px solid #397b95;border-radius:10px;padding:10px;background:#0f2a3b}.horse-communication-grade>div{display:flex;justify-content:space-between;gap:10px}.horse-communication-grade small{color:#93cde4;font-weight:900}.horse-communication-grade p{margin:5px 0 0;font-size:.76rem}';document.head.appendChild(style);window.EMSCodeSimPatientRapport=Object.freeze({version:VERSION,model,recordResponse,rules:EVENT_RULES})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();