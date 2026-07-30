(()=>{'use strict';
const rt=window.EMSCodeSimScenarioRuntime, api=window.EMSCodeSimPatientRecord;
if(!rt?.active?.()||!api?.active?.())return;
const path=location.pathname.split('/').pop();
const defs={
 'bp.html':{key:'blood_pressure',label:'Blood pressure',value:v=>v.bp,ready:['#submitBtn'],prompt:'Use the cuff and sounds, enter systolic and diastolic, then check your reading.'},
 'pulse.html':{key:'pulse',label:'Pulse',value:v=>`${v.pulse}/min`,ready:['#checkBtn'],prompt:'Start the pulse, count or estimate the rate, then check your answer.'},
 'respiratory-rate.html':{key:'respirations',label:'Respirations',value:v=>`${v.respirations}/min`,ready:['#checkBtn'],prompt:'Observe the chest, count respirations, describe depth and effort, then check.'},
 'pulse-ox.html':{key:'spo2',label:'SpO₂',value:v=>`${v.spo2}%`,ready:['#choicesBox .choice'],prompt:'Read the monitor and waveform, then choose the appropriate interpretation.'},
 'bgl.html':{key:'blood_glucose',label:'Blood glucose',value:v=>`${v.bgl} mg/dL`,ready:['#applyBtn'],prompt:'Complete the glucometer sequence and obtain the reading.'},
 'temperature.html':{key:'temperature',label:'Temperature',value:v=>v.temperature,ready:['#checkBtn'],prompt:'Read and interpret the patient temperature.'},
 'avpu.html':{key:'mental_status',label:'Mental status',value:v=>v.orientation||v.avpu,ready:['#checkBtn'],prompt:'Apply the appropriate stimulus and classify the patient response.'},
 'pupil.html':{key:'pupils',label:'Pupils',value:v=>v.pupils,ready:['#btnGrade'],prompt:'Inspect size, equality, and reactivity, then grade your assessment.'},
 'skin.html':{key:'skin',label:'Skin signs',value:v=>v.skin,ready:['#crtBtn','#btnPale','#btnFlush','#moistWet','#moistDry','#tempPlus','#tempMinus'],prompt:'Inspect color, temperature, moisture, and capillary refill.'},
 'breath-sound-simulator.html':{key:'breath_sounds',label:'Breath sounds',value:v=>v.breathSounds,ready:['.point'],prompt:'Auscultate multiple lung fields before recording the finding.'}
};
const def=defs[path];if(!def)return;const profile=rt.profile?.(),v=profile?.vitals||{};
let ready=false,saved=!!api.active()?.findings?.[def.key];
const host=document.createElement('section');host.id='scenarioVitalCapture';host.innerHTML=`<div class="svc-card"><h2>${def.label}: obtain the finding</h2><p>${def.prompt}</p><button type="button" ${saved?'disabled':''}>${saved?'Finding already recorded':'Record obtained finding'}</button><div class="svc-message" aria-live="polite"></div></div>`;document.body.appendChild(host);
const btn=host.querySelector('button'),msg=host.querySelector('.svc-message');if(!saved)btn.disabled=true;
function unlock(){ready=true;if(!saved){btn.disabled=false;btn.textContent='Record obtained finding'}}
function matchesReady(target){return def.ready.some(sel=>target.closest?.(sel))}
document.addEventListener('click',event=>{if(matchesReady(event.target))setTimeout(unlock,0)});
// Also observe result/status changes for simulators whose final controls are created dynamically.
const observer=new MutationObserver(()=>{
  const text=document.body.innerText||'';
  if(/correct|result ready|observation complete|actual finding|reading|assessment complete/i.test(text)) unlock();
});
observer.observe(document.body,{subtree:true,childList:true,characterData:true});
// Configure the skin visual to the active patient without printing the answer.
if(path==='skin.html')setTimeout(()=>{const text=String(v.skin||'').toLowerCase();
 const click=id=>{const el=document.querySelector(id);if(el&&el.getAttribute('aria-pressed')!=='true')el.click()};
 if(text.includes('pale'))click('#btnPale');if(text.includes('flushed'))click('#btnFlush');if(text.includes('diaphoretic')||text.includes('clammy'))click('#moistWet');else if(text.includes('dry'))click('#moistDry');
 if(text.includes('cool')){for(let i=0;i<5;i++)document.querySelector('#tempMinus')?.click()}if(text.includes('hot')||text.includes('warm')){for(let i=0;i<5;i++)document.querySelector('#tempPlus')?.click()}
 ready=false;btn.disabled=true;
},120);
btn.addEventListener('click',()=>{if(!ready||saved)return;const value=def.value(v);const normality=(()=>{switch(def.key){case'blood_pressure':return v.systolic<90||v.systolic>180||v.diastolic>110?'not-normal':'normal';case'pulse':return v.pulse<60||v.pulse>100?'not-normal':'normal';case'respirations':return v.respirations<12||v.respirations>20?'not-normal':'normal';case'spo2':return v.spo2<94?'not-normal':'normal';case'blood_glucose':return v.bgl<70||v.bgl>200?'not-normal':'normal';case'breath_sounds':return v.breathSoundType==='normal'?'normal':'not-normal';default:return /pale|cool|clammy|diaphoretic|mottled|confused|poor interaction/i.test(String(value))?'not-normal':'normal'}})();
 api.setFinding(def.key,value,{label:def.label,finding:value,normality,status:normality==='normal'?'normal':'abnormal',source:'scenario-simulator',locked:true,recordedAt:new Date().toISOString()});
 saved=true;btn.disabled=true;btn.textContent='Finding recorded';msg.className='svc-message svc-saved';msg.textContent=`${def.label} added to this patient’s findings.`;const detail={assessment:def.key,label:def.label,finding:value,normality};window.dispatchEvent(new CustomEvent('emscodesim:assessment-saved',{detail}));setTimeout(()=>window.EMSCodeSimScenarioFlow?.show?.(),0);
});
})();
