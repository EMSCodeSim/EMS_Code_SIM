(()=>{
'use strict';
const PROFILES={
 asthma:{patient:'24-year-old adult',dispatch:'Worsening shortness of breath and wheezing.',scene:'Apartment; rescue inhaler nearby',vitals:{bp:'138/84',systolic:138,diastolic:84,pulse:118,respirations:28,spo2:92,bgl:104,temperature:'98.7°F',avpu:'A',orientation:'A&O x4',skin:'Warm, pink, mildly diaphoretic',pupils:'3 mm, equal and reactive',breathSounds:'Expiratory wheezes bilaterally',breathSoundType:'wheeze'},caseIndex:{airway:0,breathing:1,sample:1,chest:0,perfusion:0,trauma:0,abdominal:0,motor_sensory:0,pat:0}},
 stroke:{patient:'68-year-old adult',dispatch:'Sudden speech difficulty and right-sided weakness.',scene:'Private residence; family present',vitals:{bp:'188/102',systolic:188,diastolic:102,pulse:88,respirations:18,spo2:96,bgl:118,temperature:'98.4°F',avpu:'A',orientation:'A&O x2 with acute speech difficulty',skin:'Warm, pink, dry',pupils:'3 mm, equal and reactive',breathSounds:'Clear and equal bilaterally',breathSoundType:'normal'},caseIndex:{airway:0,breathing:0,sample:2,chest:0,perfusion:0,trauma:0,abdominal:0,motor_sensory:1,pat:0}},
 hypoglycemia:{patient:'57-year-old adult',dispatch:'Confused, sweaty, and behaving abnormally.',scene:'Workplace break room',vitals:{bp:'126/76',systolic:126,diastolic:76,pulse:110,respirations:20,spo2:97,bgl:48,temperature:'98.1°F',avpu:'V',orientation:'Confused; responds to verbal stimuli',skin:'Pale, cool, diaphoretic',pupils:'3 mm, equal and reactive',breathSounds:'Clear and equal bilaterally',breathSoundType:'normal'},caseIndex:{airway:0,breathing:0,sample:3,chest:0,perfusion:0,trauma:0,abdominal:0,motor_sensory:2,pat:0}},
 trauma:{patient:'36-year-old adult',dispatch:'Two-vehicle collision with chest and abdominal pain.',scene:'Roadway collision; moderate vehicle damage',vitals:{bp:'94/62',systolic:94,diastolic:62,pulse:124,respirations:30,spo2:90,bgl:132,temperature:'97.5°F',avpu:'V',orientation:'Confused; responds to verbal stimuli',skin:'Pale, cool, clammy',pupils:'4 mm, equal and reactive',breathSounds:'Diminished on the left; present on the right',breathSoundType:'diminished'},caseIndex:{airway:5,breathing:4,sample:2,chest:2,perfusion:2,trauma:3,abdominal:2,motor_sensory:4,pat:0}},
 pediatric:{patient:'3-year-old child',dispatch:'Fever, poor interaction, and increased work of breathing.',scene:'Home; caregiver present',vitals:{bp:'82/48',systolic:82,diastolic:48,pulse:148,respirations:38,spo2:89,bgl:92,temperature:'103.1°F',avpu:'V',orientation:'Poor interaction; responds to caregiver voice',skin:'Flushed, hot, mildly mottled',pupils:'3 mm, equal and reactive',breathSounds:'Coarse crackles bilaterally',breathSoundType:'crackles'},caseIndex:{airway:3,breathing:3,sample:1,chest:0,perfusion:5,trauma:0,abdominal:5,motor_sensory:2,pat:2}}
};
function record(){try{return window.EMSCodeSimPatientRecord?.active?.()||null}catch{return null}}
function active(){return !!record()}
function profile(){const r=record();if(!r)return null;return PROFILES[r.scenarioId]||PROFILES[r.id]||null}
function chooseCase(key,cases,current){const r=record();if(!r||!cases?.length){let next;do{next=cases[Math.floor(Math.random()*cases.length)]}while(cases.length>1&&next===current);return next}const p=profile();const idx=p?.caseIndex?.[key]??0;const base=cases[Math.max(0,Math.min(idx,cases.length-1))];const clone={...base};clone.title=r.title||base.title;clone.description=r.dispatch||base.description;clone.context=r.dispatch||base.context;clone.age=r.patient||base.age;clone.complaint=r.title||base.complaint;return clone}
function vital(name,fallback){return profile()?.vitals?.[name]??fallback}

function syncProfileFindings(){
 const r=record(),p=profile(),api=window.EMSCodeSimPatientRecord;if(!r||!p||!api?.update)return;
 const v=p.vitals||{};
 const prescribed={
  blood_pressure:{value:v.bp,label:'Blood pressure',normality:(v.systolic<90||v.systolic>180||v.diastolic>110)?'not-normal':'normal'},
  pulse:{value:`${v.pulse}/min`,label:'Pulse',normality:(v.pulse<60||v.pulse>100)?'not-normal':'normal'},
  respirations:{value:`${v.respirations}/min`,label:'Respirations',normality:(v.respirations<12||v.respirations>20)?'not-normal':'normal'},
  spo2:{value:`${v.spo2}%`,label:'SpO₂',normality:v.spo2<94?'not-normal':'normal'},
  blood_glucose:{value:`${v.bgl} mg/dL`,label:'Blood glucose',normality:(v.bgl<70||v.bgl>200)?'not-normal':'normal'},
  temperature:{value:v.temperature,label:'Temperature',normality:parseFloat(v.temperature)>100.4?'not-normal':'normal'},
  mental_status:{value:v.orientation||v.avpu,label:'Mental status',normality:v.avpu==='A'&&String(v.orientation||'').includes('x4')?'normal':'not-normal'},
  skin:{value:v.skin,label:'Skin signs',normality:/pale|cool|clammy|diaphoretic|mottled/i.test(v.skin||'')?'not-normal':'normal'},
  pupils:{value:v.pupils,label:'Pupils',normality:/equal and reactive/i.test(v.pupils||'')?'normal':'not-normal'},
  breath_sounds:{value:v.breathSounds,label:'Breath sounds',normality:v.breathSoundType==='normal'?'normal':'not-normal'}
 };
 let changed=false;
 api.update(next=>{next.profile=p;next.findings=next.findings||{};for(const [k,item] of Object.entries(prescribed)){if(!next.findings[k]){next.findings[k]={...item,finding:item.value,source:'scenario-profile',locked:true,recordedAt:new Date().toISOString()};changed=true;}}return next});
}

function applyMode(){const r=record();if(!r)return;syncProfileFindings();document.documentElement.classList.add('scenario-mode');document.body?.classList.add('scenario-mode');
 const practice=document.getElementById('practicePanel');if(practice){document.querySelectorAll('.lesson-panel').forEach(p=>{p.hidden=p!==practice;p.classList.toggle('is-active',p===practice)});document.querySelectorAll('.lesson-tab').forEach(t=>t.classList.toggle('is-active',t.dataset.panel==='practicePanel'));}
 document.querySelectorAll('#newScenario,#newCase,#nextBtn,#tryAnother,[data-action="new-patient"]').forEach(b=>{b.disabled=true;b.hidden=true;b.setAttribute('aria-hidden','true')});
 document.querySelectorAll('.patient-card__top .eyebrow').forEach(e=>e.textContent='Active scenario patient');
 const title=document.querySelector('#scenarioTitle,#caseTitle');if(title)title.textContent=r.title||title.textContent;
 const desc=document.querySelector('#scenarioText,#caseDescription');if(desc&&r.dispatch)desc.textContent=r.dispatch;
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(applyMode,0));window.addEventListener('emscodesim:patient-record-updated',applyMode);
window.EMSCodeSimScenarioRuntime={active,record,profile,chooseCase,vital,applyMode,syncProfileFindings};
})();