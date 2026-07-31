(()=>{'use strict';
const rt=window.EMSCodeSimScenarioRuntime, api=window.EMSCodeSimPatientRecord;
if(!rt?.active?.()||!api?.active?.())return;
const path=location.pathname.split('/').pop();
const defs={
 'bp.html':{key:'blood_pressure',label:'Blood pressure',value:v=>v.bp,delay:24,ready:['#submitBtn'],prompt:'Use the cuff and sounds, enter systolic and diastolic, then check your reading.'},
 'pulse.html':{key:'pulse',label:'Pulse',value:v=>`${v.pulse}/min`,delay:15,ready:['#checkBtn'],prompt:'Start the pulse, count or estimate the rate, then check your answer.'},
 'respiratory-rate.html':{key:'respirations',label:'Respirations',value:v=>`${v.respirations}/min`,delay:20,ready:['#checkBtn'],prompt:'Observe the chest, count respirations, describe depth and effort, then check.'},
 'pulse-ox.html':{key:'spo2',label:'SpO₂',value:v=>`${v.spo2}%`,delay:12,ready:['#choicesBox .choice'],prompt:'Read the monitor and waveform, then choose the appropriate interpretation.'},
 'bgl.html':{key:'blood_glucose',label:'Blood glucose',value:v=>`${v.bgl} mg/dL`,delay:28,ready:['#applyBtn'],prompt:'Complete the glucometer sequence and obtain the reading.'},
 'temperature.html':{key:'temperature',label:'Temperature',value:v=>v.temperature,delay:18,ready:['#checkBtn'],prompt:'Read and interpret the patient temperature.'},
 'avpu.html':{key:'mental_status',label:'Mental status',value:v=>v.orientation||v.avpu,delay:8,ready:['#checkBtn'],prompt:'Apply the appropriate stimulus and classify the patient response.'},
 'pupil.html':{key:'pupils',label:'Pupils',value:v=>v.pupils,delay:12,ready:['#btnGrade'],prompt:'Inspect size, equality, and reactivity, then grade your assessment.'},
 'skin.html':{key:'skin',label:'Skin signs',value:v=>v.skin,delay:10,ready:['#crtBtn','#btnPale','#btnFlush','#moistWet','#moistDry','#tempPlus','#tempMinus'],prompt:'Inspect color, temperature, moisture, and capillary refill.'},
 'breath-sound-simulator.html':{key:'breath_sounds',label:'Breath sounds',value:v=>v.breathSounds,delay:22,ready:['.point'],prompt:'Auscultate multiple lung fields before recording the finding.'}
};
const def=defs[path];if(!def)return;
const profile=rt.profile?.(),v=profile?.vitals||{};
let ready=false,saved=!!api.active()?.findings?.[def.key],partnerTimer=null,partnerBusy=false,destroyed=false;
const host=document.createElement('section');host.id='scenarioVitalCapture';host.innerHTML=`<div class="svc-card"><h2>${def.label}: obtain the finding</h2><p>${def.prompt}</p><div class="svc-actions"><button class="svc-record" type="button" ${saved?'disabled':''}>${saved?'Finding already recorded':'Record obtained finding'}</button><button class="svc-partner" type="button" ${saved?'disabled':''}>Assign to partner</button></div><div class="svc-partner-status" hidden><div class="svc-partner-row"><strong>Partner obtaining ${def.label.toLowerCase()}</strong><span class="svc-countdown"></span></div><div class="svc-progress"><span></span></div><button class="svc-cancel" type="button">Cancel assignment</button></div><div class="svc-message" aria-live="polite"></div></div>`;
document.body.appendChild(host);
const btn=host.querySelector('.svc-record'),partnerBtn=host.querySelector('.svc-partner'),partnerStatus=host.querySelector('.svc-partner-status'),countdown=host.querySelector('.svc-countdown'),progress=host.querySelector('.svc-progress span'),cancelBtn=host.querySelector('.svc-cancel'),msg=host.querySelector('.svc-message');
if(!saved)btn.disabled=true;
function unlock(){if(ready||saved||destroyed)return;ready=true;btn.disabled=false;btn.textContent='Record obtained finding'}
function onDocumentClick(event){
 if(destroyed)return;
 for(const selector of def.ready){
  if(event.target.closest?.(selector)){setTimeout(unlock,0);break;}
 }
}
document.addEventListener('click',onDocumentClick,{passive:true});
if(path==='skin.html')setTimeout(()=>{if(destroyed)return;const text=String(v.skin||'').toLowerCase();const click=id=>{const el=document.querySelector(id);if(el&&el.getAttribute('aria-pressed')!=='true')el.click()};if(text.includes('pale'))click('#btnPale');if(text.includes('flushed'))click('#btnFlush');if(text.includes('diaphoretic')||text.includes('clammy'))click('#moistWet');else if(text.includes('dry'))click('#moistDry');if(text.includes('cool')){for(let i=0;i<5;i++)document.querySelector('#tempMinus')?.click()}if(text.includes('hot')||text.includes('warm')){for(let i=0;i<5;i++)document.querySelector('#tempPlus')?.click()}ready=false;btn.disabled=true;},120);
function saveFinding(source='scenario-simulator'){
 if(saved||destroyed)return;const value=def.value(v);const normality=(()=>{switch(def.key){case'blood_pressure':return v.systolic<90||v.systolic>180||v.diastolic>110?'not-normal':'normal';case'pulse':return v.pulse<60||v.pulse>100?'not-normal':'normal';case'respirations':return v.respirations<12||v.respirations>20?'not-normal':'normal';case'spo2':return v.spo2<94?'not-normal':'normal';case'blood_glucose':return v.bgl<70||v.bgl>200?'not-normal':'normal';case'breath_sounds':return v.breathSoundType==='normal'?'normal':'not-normal';default:return /pale|cool|clammy|diaphoretic|mottled|confused|poor interaction/i.test(String(value))?'not-normal':'normal'}})();
 api.setFinding(def.key,value,{label:def.label,finding:value,normality,status:normality==='normal'?'normal':'abnormal',source,locked:true,recordedAt:new Date().toISOString()});
 saved=true;partnerBusy=false;clearInterval(partnerTimer);partnerTimer=null;btn.disabled=true;partnerBtn.disabled=true;btn.textContent='Finding recorded';partnerStatus.hidden=true;msg.className='svc-message svc-saved';msg.textContent=source==='partner-assignment'?`Your partner reports ${def.label.toLowerCase()}: ${value}. It was added to the patient findings.`:`${def.label} added to this patient’s findings.`;window.dispatchEvent(new CustomEvent('emscodesim:assessment-saved',{detail:{assessment:def.key,label:def.label,finding:value,normality,source}}));
}
btn.addEventListener('click',()=>{if(ready&&!saved&&!partnerBusy)saveFinding()});
partnerBtn.addEventListener('click',()=>{if(saved||partnerBusy||destroyed)return;partnerBusy=true;btn.disabled=true;partnerBtn.disabled=true;partnerStatus.hidden=false;msg.className='svc-message';msg.textContent='Continue assessing the patient while your partner gathers this information.';const total=Math.max(5,Number(def.delay)||15);let remaining=total;countdown.textContent=`${remaining}s`;progress.style.width='0%';partnerTimer=setInterval(()=>{if(destroyed){clearInterval(partnerTimer);return}remaining-=1;countdown.textContent=`${Math.max(remaining,0)}s`;progress.style.width=`${Math.min(100,((total-remaining)/total)*100)}%`;if(remaining<=0){clearInterval(partnerTimer);partnerTimer=null;saveFinding('partner-assignment')}},1000)});
cancelBtn.addEventListener('click',()=>{if(!partnerBusy||saved)return;clearInterval(partnerTimer);partnerTimer=null;partnerBusy=false;partnerStatus.hidden=true;partnerBtn.disabled=false;btn.disabled=!ready;msg.textContent='Partner assignment canceled. You can perform the skill or assign it again.'});
function cleanup(){destroyed=true;document.removeEventListener('click',onDocumentClick);clearInterval(partnerTimer);partnerTimer=null;}
window.addEventListener('pagehide',cleanup,{once:true});
window.addEventListener('beforeunload',cleanup,{once:true});
})();
