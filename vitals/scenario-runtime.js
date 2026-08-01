(()=>{
'use strict';
const PROFILES={
 asthma:{patient:'24-year-old adult',dispatch:'Worsening shortness of breath and wheezing.',scene:'Apartment; rescue inhaler nearby',vitals:{blood_pressure:'138/84',systolic:138,diastolic:84,pulse:118,respirations:28,spo2:92,blood_glucose:104,temperature:'98.7°F',avpu:'A',mental_status:'A&O x4',skin:'Warm, pink, mildly diaphoretic',pupils:'3 mm, equal and reactive',breath_sounds:'Expiratory wheezes bilaterally',breath_sound_type:'wheeze'},caseIndex:{airway:0,breathing:1,sample:1,chest:0,perfusion:0,trauma:0,abdominal:0,motor_sensory:0,pat:0}},
 stroke:{patient:'68-year-old adult',dispatch:'Sudden speech difficulty and right-sided weakness.',scene:'Private residence; family present',vitals:{blood_pressure:'188/102',systolic:188,diastolic:102,pulse:88,respirations:18,spo2:96,blood_glucose:118,temperature:'98.4°F',avpu:'A',mental_status:'A&O x2 with acute speech difficulty',skin:'Warm, pink, dry',pupils:'3 mm, equal and reactive',breath_sounds:'Clear and equal bilaterally',breath_sound_type:'normal'},caseIndex:{airway:0,breathing:0,sample:2,chest:0,perfusion:0,trauma:0,abdominal:0,motor_sensory:1,pat:0}},
 hypoglycemia:{patient:'57-year-old adult',dispatch:'Confused, sweaty, and behaving abnormally.',scene:'Workplace break room',vitals:{blood_pressure:'126/76',systolic:126,diastolic:76,pulse:110,respirations:20,spo2:97,blood_glucose:48,temperature:'98.1°F',avpu:'V',mental_status:'Confused; responds to verbal stimuli',skin:'Pale, cool, diaphoretic',pupils:'3 mm, equal and reactive',breath_sounds:'Clear and equal bilaterally',breath_sound_type:'normal'},caseIndex:{airway:0,breathing:0,sample:3,chest:0,perfusion:0,trauma:0,abdominal:0,motor_sensory:2,pat:0}},
 trauma:{patient:'36-year-old adult',dispatch:'Two-vehicle collision with chest and abdominal pain.',scene:'Roadway collision; moderate vehicle damage',vitals:{blood_pressure:'94/62',systolic:94,diastolic:62,pulse:124,respirations:30,spo2:90,blood_glucose:132,temperature:'97.5°F',avpu:'V',mental_status:'Confused; responds to verbal stimuli',skin:'Pale, cool, clammy',pupils:'4 mm, equal and reactive',breath_sounds:'Diminished on the left; present on the right',breath_sound_type:'diminished'},caseIndex:{airway:5,breathing:4,sample:2,chest:2,perfusion:2,trauma:3,abdominal:2,motor_sensory:4,pat:0}},
 pediatric:{patient:'3-year-old child',dispatch:'Fever, poor interaction, and increased work of breathing.',scene:'Home; caregiver present',vitals:{blood_pressure:'82/48',systolic:82,diastolic:48,pulse:148,respirations:38,spo2:89,blood_glucose:92,temperature:'103.1°F',avpu:'V',mental_status:'Poor interaction; responds to caregiver voice',skin:'Flushed, hot, mildly mottled',pupils:'3 mm, equal and reactive',breath_sounds:'Coarse crackles bilaterally',breath_sound_type:'crackles'},caseIndex:{airway:3,breathing:3,sample:1,chest:0,perfusion:5,trauma:0,abdominal:5,motor_sensory:2,pat:2}}
};
const LEGACY_VITAL_ALIASES={bp:'blood_pressure',bloodPressure:'blood_pressure',bgl:'blood_glucose',bloodGlucose:'blood_glucose',breathSounds:'breath_sounds',lung_sounds:'breath_sounds',breathSoundType:'breath_sound_type',orientation:'mental_status',respiratory_rate:'respirations',rr:'respirations'};
function normalizeVitalKey(name){return LEGACY_VITAL_ALIASES[name]||window.EMSCodeSimPatientRecord?.normalizeKey?.(name)||name}
function record(){try{return window.EMSCodeSimPatientRecord?.active?.()||null}catch{return null}}
function active(){return !!record()}
function profile(){const r=record();if(!r)return null;return PROFILES[r.scenarioId]||PROFILES[r.id]||null}
function chooseCase(key,cases,current){const r=record();if(!r||!cases?.length){let next;do{next=cases[Math.floor(Math.random()*cases.length)]}while(cases.length>1&&next===current);return next}const p=profile();const idx=p?.caseIndex?.[key]??0;const base=cases[Math.max(0,Math.min(idx,cases.length-1))];const clone={...base};clone.title=r.title||base.title;clone.description=r.dispatch||base.description;clone.context=r.dispatch||base.context;clone.age=r.patient||base.age;clone.complaint=r.title||base.complaint;return clone}
function vital(name,fallback){const p=profile()?.vitals||{};const normalized=normalizeVitalKey(name);return p[normalized]??p[LEGACY_VITAL_ALIASES[name]]??p[name]??fallback}
function formatVital(name){
 const key=normalizeVitalKey(name),value=vital(key,'Obtained');
 if(key==='pulse')return `${value}/min`;
 if(key==='respirations')return `${value}/min`;
 if(key==='spo2')return `${value}%`;
 if(key==='blood_glucose')return `${value} mg/dL`;
 return String(value);
}
function classifyFinding(name,value){
 const key=normalizeVitalKey(name),p=profile()?.vitals||{};
 switch(key){
  case'blood_pressure':return Number(p.systolic)<90||Number(p.systolic)>=180||Number(p.diastolic)>=120?'not-normal':'normal';
  case'pulse':return Number(p.pulse)<60||Number(p.pulse)>100?'not-normal':'normal';
  case'respirations':return Number(p.respirations)<12||Number(p.respirations)>20?'not-normal':'normal';
  case'spo2':return Number(p.spo2)<94?'not-normal':'normal';
  case'blood_glucose':return Number(p.blood_glucose)<70||Number(p.blood_glucose)>200?'not-normal':'normal';
  case'temperature':{const n=parseFloat(String(p.temperature));return n<96.8||n>=100.4?'not-normal':'normal'}
  case'breath_sounds':return p.breath_sound_type==='normal'?'normal':'not-normal';
  case'pupils':return /equal.*reactive/i.test(String(value??p.pupils))?'normal':'not-normal';
  default:return /pale|cool|clammy|diaphoretic|mottled|confused|poor interaction|weakness|asymmetry|labored|retraction|diminished|wheez|crackle/i.test(String(value))?'not-normal':'normal';
 }
}
function syncProfileFindings(){return}
function applyMode(){const r=record();if(!r)return;document.documentElement.classList.add('scenario-mode');document.body?.classList.add('scenario-mode');
 const practice=document.getElementById('practicePanel');if(practice){document.querySelectorAll('.lesson-panel').forEach(p=>{p.hidden=p!==practice;p.classList.toggle('is-active',p===practice)});document.querySelectorAll('.lesson-tab').forEach(t=>t.classList.toggle('is-active',t.dataset.panel==='practicePanel'));}
 document.querySelectorAll('#newScenario,#newCase,#nextBtn,#tryAnother,[data-action="new-patient"]').forEach(b=>{b.disabled=true;b.hidden=true;b.setAttribute('aria-hidden','true')});
 document.querySelectorAll('.patient-card__top .eyebrow').forEach(e=>e.textContent='Active scenario patient');
 const title=document.querySelector('#scenarioTitle,#caseTitle');if(title)title.textContent=r.title||title.textContent;
 const desc=document.querySelector('#scenarioText,#caseDescription');if(desc&&r.dispatch)desc.textContent=r.dispatch;
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(applyMode,0));window.addEventListener('emscodesim:patient-record-updated',applyMode);window.addEventListener('pageshow',applyMode);
window.EMSCodeSimScenarioRuntime={PROFILES,active,record,profile,chooseCase,vital,formatVital,classifyFinding,applyMode,syncProfileFindings,normalizeVitalKey};
})();
