(()=>{'use strict';
const rt=window.EMSCodeSimScenarioRuntime,api=window.EMSCodeSimPatientRecord;
if(!rt?.active?.()||!api?.active?.())return;
const path=location.pathname.split('/').pop();
const defs={
 'bp.html':{key:'blood_pressure',label:'Blood pressure',delay:24,ready:['#submitBtn'],success:()=>document.querySelector('#result')?.classList.contains('ok'),prompt:'Use the cuff and sounds, enter systolic and diastolic, then check your reading.'},
 'pulse.html':{key:'pulse',label:'Pulse',delay:15,ready:['#checkBtn'],success:()=>/✅/.test(document.querySelector('#result')?.textContent||''),prompt:'Start the pulse, count or estimate the rate, then check your answer.'},
 'respiratory-rate.html':{key:'respirations',label:'Respirations',delay:20,ready:['#checkBtn'],success:()=>document.querySelector('#result')?.classList.contains('ok'),prompt:'Observe the chest, count respirations, describe depth and effort, then check.'},
 'pulse-ox.html':{key:'spo2',label:'SpO₂',delay:12,ready:['#choicesBox .choice'],success:()=>Boolean(document.querySelector('#choicesBox .choice.correct')),prompt:'Read the monitor and waveform, then choose the appropriate interpretation.'},
 'bgl.html':{key:'blood_glucose',label:'Blood glucose',delay:28,ready:['#applyBtn'],prompt:'Complete the glucometer sequence and obtain the reading.'},
 'temperature.html':{key:'temperature',label:'Temperature',delay:18,ready:['#checkBtn'],success:()=>document.querySelector('#result')?.classList.contains('ok'),prompt:'Read and interpret the patient temperature.'},
 'avpu.html':{key:'mental_status',label:'Mental status',delay:8,ready:['#checkBtn'],success:()=>document.querySelector('#result')?.classList.contains('ok'),prompt:'Apply the appropriate stimulus and classify the patient response.'},
 'pupil.html':{key:'pupils',label:'Pupils',delay:12,ready:['#btnGrade'],success:()=>document.querySelector('#gradeBox')?.classList.contains('good'),prompt:'Inspect size, equality, and reactivity, then grade your assessment.'},
 'skin.html':{key:'skin',label:'Skin signs',delay:10,ready:['#crtBtn','#btnPale','#btnFlush','#moistWet','#moistDry','#tempPlus','#tempMinus'],prompt:'Inspect color, temperature, moisture, and capillary refill.'},
 'breath-sound-simulator.html':{key:'breath_sounds',label:'Breath sounds',delay:22,ready:['.point'],prompt:'Auscultate multiple lung fields before recording the finding.'}
};
const def=defs[path];if(!def)return;
let ready=false,saved=api.hasFinding(def.key),partnerTimer=null,partnerDeadline=0,partnerBusy=false,destroyed=false;
const host=document.createElement('section');host.id='scenarioVitalCapture';host.innerHTML=`<div class="svc-card"><h2>${def.label}: obtain the finding</h2><p>${def.prompt}</p><div class="svc-actions"><button class="svc-record" type="button" ${saved?'disabled':''}>${saved?'Finding already recorded':'Complete the skill first'}</button><button class="svc-partner" type="button" ${saved?'disabled':''}>Assign to partner</button></div><div class="svc-partner-status" hidden><div class="svc-partner-row"><strong>Partner obtaining ${def.label.toLowerCase()}</strong><span class="svc-countdown"></span></div><div class="svc-progress"><span></span></div><button class="svc-cancel" type="button">Cancel assignment</button></div><div class="svc-message" aria-live="polite"></div></div>`;
document.body.appendChild(host);
const btn=host.querySelector('.svc-record'),partnerBtn=host.querySelector('.svc-partner'),partnerStatus=host.querySelector('.svc-partner-status'),countdown=host.querySelector('.svc-countdown'),progress=host.querySelector('.svc-progress span'),cancelBtn=host.querySelector('.svc-cancel'),msg=host.querySelector('.svc-message');
function refreshSavedState(){saved=api.hasFinding(def.key);if(saved){ready=false;partnerBusy=false;clearInterval(partnerTimer);partnerTimer=null;btn.disabled=true;partnerBtn.disabled=true;btn.textContent='Finding recorded';partnerStatus.hidden=true}}
function unlock(){if(ready||saved||destroyed)return;ready=true;btn.disabled=false;btn.textContent='Record obtained finding';msg.className='svc-message';msg.textContent='Skill completed. Record the finding now; accuracy will be reviewed at the end of the scenario.'}
function tryUnlock(){setTimeout(()=>{if(destroyed||saved)return;unlock()},30)}
function onDocumentClick(event){if(destroyed)return;for(const selector of def.ready){if(event.target.closest?.(selector)){tryUnlock();break}}}
document.addEventListener('click',onDocumentClick,{passive:true});
if(path==='skin.html')setTimeout(()=>{if(destroyed||saved)return;const text=String(rt.vital('skin','')).toLowerCase();const click=id=>{const el=document.querySelector(id);if(el&&el.getAttribute('aria-pressed')!=='true')el.click()};if(text.includes('pale'))click('#btnPale');if(text.includes('flushed'))click('#btnFlush');if(text.includes('diaphoretic')||text.includes('clammy'))click('#moistWet');else if(text.includes('dry'))click('#moistDry');if(text.includes('cool')){for(let i=0;i<5;i++)document.querySelector('#tempMinus')?.click()}if(text.includes('hot')||text.includes('warm')){for(let i=0;i<5;i++)document.querySelector('#tempPlus')?.click()}ready=false;btn.disabled=true;btn.textContent='Complete the skill first'},120);
function saveFinding(source='scenario-simulator'){
 if(saved||destroyed)return;
 const value=rt.formatVital(def.key),normality=rt.classifyFinding(def.key,value),status=normality==='normal'?'normal':'abnormal';
 api.setFinding(def.key,value,{label:def.label,finding:value,normality,status,source,locked:true});
 saved=true;partnerBusy=false;clearInterval(partnerTimer);partnerTimer=null;btn.disabled=true;partnerBtn.disabled=true;btn.textContent='Finding recorded';partnerStatus.hidden=true;msg.className='svc-message svc-saved';msg.textContent=source==='partner-assignment'?`Your partner reports ${def.label.toLowerCase()}: ${value}. It was added to the patient findings.`:`${def.label} added to this patient’s findings.`;
 window.dispatchEvent(new CustomEvent('emscodesim:assessment-saved',{detail:{assessment:def.key,label:def.label,finding:value,normality,source}}));
}
btn.addEventListener('click',()=>{if(ready&&!saved&&!partnerBusy)saveFinding()});
function renderPartnerProgress(){
 if(!partnerBusy||saved||destroyed)return;
 const total=Math.max(5,Number(def.delay)||15),remaining=Math.max(0,Math.ceil((partnerDeadline-Date.now())/1000));
 countdown.textContent=`${remaining}s`;progress.style.width=`${Math.min(100,((total-remaining)/total)*100)}%`;
 if(remaining<=0)saveFinding('partner-assignment');
}
function startPartnerTimer(){clearInterval(partnerTimer);renderPartnerProgress();if(partnerBusy&&!saved)partnerTimer=setInterval(renderPartnerProgress,250)}
partnerBtn.addEventListener('click',()=>{if(saved||partnerBusy||destroyed)return;partnerBusy=true;ready=false;btn.disabled=true;partnerBtn.disabled=true;partnerStatus.hidden=false;msg.className='svc-message';msg.textContent='Continue assessing the patient while your partner gathers this information.';partnerDeadline=Date.now()+Math.max(5,Number(def.delay)||15)*1000;startPartnerTimer()});
cancelBtn.addEventListener('click',()=>{if(!partnerBusy||saved)return;clearInterval(partnerTimer);partnerTimer=null;partnerBusy=false;partnerDeadline=0;partnerStatus.hidden=true;partnerBtn.disabled=false;btn.disabled=!ready;msg.textContent='Partner assignment canceled. You can perform the skill or assign it again.'});
function cleanup(){if(destroyed)return;destroyed=true;document.removeEventListener('click',onDocumentClick);clearInterval(partnerTimer);partnerTimer=null}
window.addEventListener('pagehide',event=>{if(!event.persisted)cleanup()});
window.addEventListener('beforeunload',cleanup,{once:true});
window.addEventListener('pageshow',event=>{if(!event.persisted)return;destroyed=false;refreshSavedState();if(partnerBusy)startPartnerTimer()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&partnerBusy)renderPartnerProgress()});
refreshSavedState();
})();
