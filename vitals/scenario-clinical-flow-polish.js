(()=>{
'use strict';
const params=new URLSearchParams(location.search);
const requested=(params.get('case')||'').toLowerCase();
const api=window.EMSCodeSimPatientRecord;
const session=window.EMSCodeSimScenarioSession;
const $=id=>document.getElementById(id);
function horse(){return requested==='horse_crush'||document.body.classList.contains('horse-current-emt-call')||api?.active?.()?.scenarioId==='horse_crush'}
function record(){return session?.sync?.()||api?.active?.()||null}
function finding(key){return api?.getFinding?.(key,record())||record()?.findings?.[key]||null}
function ensureCue(){
 if(!horse())return null;
 const column=$('clinicalInteractionColumn');if(!column)return null;
 let cue=$('clinicalNextCue');
 if(!cue){cue=document.createElement('div');cue.id='clinicalNextCue';cue.setAttribute('aria-live','polite');column.appendChild(cue)}
 return cue;
}
function hasReassessmentDue(){return Boolean(document.querySelector('.reassessment-due,[data-assessment-state="reassessment-due"]'))}
function vitalMissing(){return ['blood_pressure','pulse','respirations','spo2'].filter(key=>!finding(key))}
function abcMissing(){return ['airway','breathing','perfusion'].filter(key=>!finding(key))}
function historyRemaining(){const badge=document.querySelector('.bottom-nav button[data-panel="historyPanel"] .badge,.bottom-nav button[data-panel="historyPanel"] [class*="badge"]');const n=Number((badge?.textContent||'').trim());return Number.isFinite(n)&&n>0?n:0}
function cueState(){
 if(hasReassessmentDue())return {reassess:true,html:'<strong>Reassessment due.</strong> Treatment or a condition change has created a finding that should be checked again.'};
 const abc=abcMissing();
 if(abc.length)return {reassess:false,html:`<strong>Initial assessment incomplete.</strong> Still assess ${abc.map(k=>k==='perfusion'?'circulation':k).join(', ')}.`};
 const vitals=vitalMissing();
 if(vitals.length>=3)return {reassess:false,html:'<strong>Keep gathering objective data.</strong> Obtain the vital signs that are clinically appropriate for this patient.'};
 const history=historyRemaining();
 if(history>0)return {reassess:false,html:'<strong>Continue focused discovery.</strong> Use history, targeted assessment, and the mini-sims to answer the questions raised by the patient presentation.'};
 return {reassess:false,html:'<strong>Commit to the next clinical decision.</strong> Treat what you found, then reassess the patient response.'};
}
function renderCue(){
 const cue=ensureCue();if(!cue)return;
 const state=cueState();
 cue.classList.toggle('reassess',state.reassess);
 if(cue.innerHTML!==state.html)cue.innerHTML=state.html;
}
function normalizeInfoAnchor(){
 if(!horse())return;
 const column=$('clinicalInteractionColumn'),update=$('infoUpdateWindow')||document.querySelector('.info-update-window');
 if(column&&update&&update.parentElement!==column)column.prepend(update);
}
function run(){if(!horse())return;normalizeInfoAnchor();renderCue()}
let queued=false;
function scheduleRun(){
 if(queued||!horse())return;
 queued=true;
 requestAnimationFrame(()=>{queued=false;run()});
}
const observer=new MutationObserver(mutations=>{
 if(!horse())return;
 const meaningful=mutations.some(m=>{
   const target=m.target?.nodeType===1?m.target:m.target?.parentElement;
   return !target?.closest?.('#clinicalNextCue');
 });
 if(meaningful)scheduleRun();
});
document.addEventListener('DOMContentLoaded',()=>{
 run();
 observer.observe(document.body,{subtree:true,childList:true});
 setTimeout(run,250);
 setTimeout(run,900);
});
window.addEventListener('emscodesim:assessment-saved',scheduleRun);
window.addEventListener('emscodesim:vital-saved',scheduleRun);
window.addEventListener('storage',scheduleRun);
window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
})();
