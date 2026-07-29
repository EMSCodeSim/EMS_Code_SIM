(()=>{
'use strict';
const PROFILES={
 asthma:{patient:'24-year-old adult',dispatch:'Worsening shortness of breath and wheezing.',scene:'Apartment; rescue inhaler nearby',vitals:{bp:'138/84',systolic:138,diastolic:84,pulse:118,respirations:28,spo2:92,bgl:104,temperature:'98.7°F',avpu:'A'},caseIndex:{airway:0,breathing:1,sample:1,chest:0,perfusion:0,trauma:0,abdominal:0,motor_sensory:0,pat:0}},
 stroke:{patient:'68-year-old adult',dispatch:'Sudden speech difficulty and right-sided weakness.',scene:'Private residence; family present',vitals:{bp:'188/102',systolic:188,diastolic:102,pulse:88,respirations:18,spo2:96,bgl:118,temperature:'98.4°F',avpu:'A'},caseIndex:{airway:0,breathing:0,sample:2,chest:0,perfusion:0,trauma:0,abdominal:0,motor_sensory:1,pat:0}},
 hypoglycemia:{patient:'57-year-old adult',dispatch:'Confused, sweaty, and behaving abnormally.',scene:'Workplace break room',vitals:{bp:'126/76',systolic:126,diastolic:76,pulse:110,respirations:20,spo2:97,bgl:48,temperature:'98.1°F',avpu:'V'},caseIndex:{airway:0,breathing:0,sample:3,chest:0,perfusion:0,trauma:0,abdominal:0,motor_sensory:2,pat:0}},
 trauma:{patient:'36-year-old adult',dispatch:'Two-vehicle collision with chest and abdominal pain.',scene:'Roadway collision; moderate vehicle damage',vitals:{bp:'94/62',systolic:94,diastolic:62,pulse:124,respirations:30,spo2:90,bgl:132,temperature:'97.5°F',avpu:'V'},caseIndex:{airway:5,breathing:4,sample:2,chest:2,perfusion:2,trauma:3,abdominal:2,motor_sensory:4,pat:0}},
 pediatric:{patient:'3-year-old child',dispatch:'Fever, poor interaction, and increased work of breathing.',scene:'Home; caregiver present',vitals:{bp:'82/48',systolic:82,diastolic:48,pulse:148,respirations:38,spo2:89,bgl:92,temperature:'103.1°F',avpu:'V'},caseIndex:{airway:3,breathing:3,sample:1,chest:0,perfusion:5,trauma:0,abdominal:5,motor_sensory:2,pat:2}}
};
function record(){try{return window.EMSCodeSimPatientRecord?.active?.()||null}catch{return null}}
function active(){return !!record()}
function profile(){const r=record();if(!r)return null;return PROFILES[r.scenarioId]||PROFILES[r.id]||null}
function chooseCase(key,cases,current){const r=record();if(!r||!cases?.length){let next;do{next=cases[Math.floor(Math.random()*cases.length)]}while(cases.length>1&&next===current);return next}const p=profile();const idx=p?.caseIndex?.[key]??0;const base=cases[Math.max(0,Math.min(idx,cases.length-1))];const clone={...base};clone.title=r.title||base.title;clone.description=r.dispatch||base.description;clone.context=r.dispatch||base.context;clone.age=r.patient||base.age;clone.complaint=r.title||base.complaint;return clone}
function vital(name,fallback){return profile()?.vitals?.[name]??fallback}
function applyMode(){const r=record();if(!r)return;document.documentElement.classList.add('scenario-mode');document.body?.classList.add('scenario-mode');
 const practice=document.getElementById('practicePanel');if(practice){document.querySelectorAll('.lesson-panel').forEach(p=>{p.hidden=p!==practice;p.classList.toggle('is-active',p===practice)});document.querySelectorAll('.lesson-tab').forEach(t=>t.classList.toggle('is-active',t.dataset.panel==='practicePanel'));}
 document.querySelectorAll('#newScenario,#newCase,#nextBtn,#tryAnother,[data-action="new-patient"]').forEach(b=>{b.disabled=true;b.hidden=true;b.setAttribute('aria-hidden','true')});
 document.querySelectorAll('.patient-card__top .eyebrow').forEach(e=>e.textContent='Active scenario patient');
 const title=document.querySelector('#scenarioTitle,#caseTitle');if(title)title.textContent=r.title||title.textContent;
 const desc=document.querySelector('#scenarioText,#caseDescription');if(desc&&r.dispatch)desc.textContent=r.dispatch;
}
document.addEventListener('DOMContentLoaded',()=>setTimeout(applyMode,0));window.addEventListener('emscodesim:patient-record-updated',applyMode);
window.EMSCodeSimScenarioRuntime={active,record,profile,chooseCase,vital,applyMode};
})();