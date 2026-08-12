(()=>{
'use strict';
const desktop=window.matchMedia('(min-width:980px)');
let queued=false,observer=null;
const $=id=>document.getElementById(id);

function active(){
 return desktop.matches&&document.body.classList.contains('desktop-scenario-layout');
}

function assessmentActive(){
 const panel=$('assessmentPanel');
 return active()&&panel&&!panel.hidden;
}

function ensureHost(){
 const panel=$('assessmentPanel');
 if(!panel)return null;
 let host=$('assessmentFollowupHost');
 if(!host){
   host=document.createElement('section');
   host.id='assessmentFollowupHost';
   host.className='assessment-followup-host';
   host.setAttribute('aria-label','Assessment follow-up questions');
   const tools=$('assessmentTools');
   if(tools?.parentElement===panel)panel.insertBefore(host,tools);
   else panel.appendChild(host);
 }
 return host;
}

function assessmentQuestionNodes(){
 const nodes=[
   $('horseAssessmentInlineQuestion'),
   ...document.querySelectorAll('[data-assessment-follow-up],.assessment-follow-up-question')
 ].filter(Boolean);
 return [...new Set(nodes)].filter(node=>!node.closest('#embeddedSimWorkspace'));
}

function moveRight(){
 if(!assessmentActive())return;
 const host=ensureHost();
 if(!host)return;
 const nodes=assessmentQuestionNodes();
 nodes.forEach(node=>{
   if(node.parentElement!==host)host.appendChild(node);
   node.classList.add('right-workspace-followup');
   node.style.removeProperty('order');
 });
 host.hidden=!nodes.some(node=>!node.hidden&&getComputedStyle(node).display!=='none');
}

function restoreSharedClinicalBox(){
 const clinical=$('horseClinicalQuestionBox');
 const control=document.querySelector('.patient-control-column');
 if(!clinical||!control)return;
 // The shared clinical box belongs to Treatment/History and must never be captured
 // by the Assessment-only follow-up host.
 if(clinical.closest('#assessmentFollowupHost')){
   const sheet=$('actionSheet');
   control.insertBefore(clinical,sheet?.parentElement===control?sheet:null);
 }
 clinical.classList.remove('right-workspace-followup');
}

function restoreMobile(){
 const host=$('assessmentFollowupHost');
 const tools=$('assessmentTools');
 const inline=$('horseAssessmentInlineQuestion');
 if(host&&inline&&tools&&inline.parentElement===host)tools.prepend(inline);
 if(host&&!host.children.length)host.remove();
 restoreSharedClinicalBox();
}

function reconcile(){
 queued=false;
 restoreSharedClinicalBox();
 if(assessmentActive())moveRight();
 else restoreMobile();
}
function schedule(){
 if(queued)return;
 queued=true;
 requestAnimationFrame(reconcile);
}

function start(){
 schedule();
 desktop.addEventListener?.('change',schedule);
 document.addEventListener('click',schedule,true);
 window.addEventListener('emscodesim:assessment-saved',schedule);
 window.addEventListener('emscodesim:treatment-saved',schedule);
 observer=new MutationObserver(mutations=>{
   const meaningful=mutations.some(m=>{
     const target=m.target?.nodeType===1?m.target:m.target?.parentElement;
     return !target?.closest?.('#assessmentFollowupHost');
   });
   if(meaningful)schedule();
 });
 observer.observe(document.body,{childList:true,subtree:true});
 window.addEventListener('pagehide',()=>observer?.disconnect(),{once:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
