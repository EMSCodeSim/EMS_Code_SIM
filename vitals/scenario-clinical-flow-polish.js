(()=>{
'use strict';
const VERSION='2026.08.14.16';
const params=new URLSearchParams(location.search);
const requested=(params.get('case')||'').toLowerCase();
const api=window.EMSCodeSimPatientRecord;
const session=window.EMSCodeSimScenarioSession;
const $=id=>document.getElementById(id);
let observer=null,queued=false,distractionTimer=0,lastDistractionAt=0;

function horse(){return requested==='horse_crush'||document.body.classList.contains('horse-current-emt-call')||api?.active?.()?.scenarioId==='horse_crush'}
function desktop(){return window.matchMedia?.('(min-width:980px)')?.matches===true&&document.body.classList.contains('desktop-scenario-layout')}
function record(){return session?.sync?.()||api?.active?.()||null}
function conversationAllowed(){
 const current=record();
 if(!horse()||!desktop()||!current||document.hidden)return false;
 if(document.body.classList.contains('sim-workspace-open'))return false;
 if($('horseGradeWorkspace')&&!$('horseGradeWorkspace').hidden)return false;
 if(current.documentation?.handoffSavedAt)return false;
 const turn=$('patientConversationTurn');
 return !turn||turn.hidden;
}

function injectStyles(){
 if(document.querySelector('style[data-center-conversation-polish]'))return;
 const style=document.createElement('style');
 style.dataset.centerConversationPolish=VERSION;
 style.textContent=`
 @media(min-width:980px){
   body.desktop-scenario-layout #clinicalInteractionColumn{
     display:flex!important;flex-direction:column!important;min-height:0!important;height:100%!important;overflow:hidden!important;
   }
   body.desktop-scenario-layout #clinicalInteractionColumn>.info-update-window{
     order:0!important;flex:0 0 auto!important;margin-bottom:8px!important;
   }
   body.desktop-scenario-layout #patientConversationStage{
     order:20!important;display:flex!important;flex-direction:column!important;justify-content:center!important;
     flex:1 1 auto!important;min-height:180px!important;padding:10px 4px!important;overflow:auto!important;
   }
   body.desktop-scenario-layout #patientConversationStage:empty{min-height:220px!important}
   body.desktop-scenario-layout #patientConversationStage #patientConversationTurn{
     width:100%!important;margin:0!important;padding:14px!important;border-radius:12px!important;
   }
   body.desktop-scenario-layout #patientConversationStage .patient-line{font-size:1rem!important;line-height:1.4!important}
   body.desktop-scenario-layout #patientConversationStage .patient-conversation-choices{
     display:grid!important;grid-template-columns:1fr!important;gap:8px!important;margin-top:4px!important;
   }
   body.desktop-scenario-layout #patientConversationStage .patient-conversation-choices button{
     min-height:44px!important;padding:9px 11px!important;font-size:.82rem!important;border-radius:9px!important;
   }
   body.desktop-scenario-layout #clinicalInteractionColumn>.bottom-nav,
   body.desktop-scenario-layout #clinicalInteractionColumn>.clinical-domain-rail{
     order:100!important;flex:0 0 auto!important;margin-top:auto!important;margin-bottom:0!important;position:sticky!important;bottom:0!important;z-index:12!important;
     background:linear-gradient(180deg,rgba(6,20,32,.88),#071923 24%)!important;padding-top:8px!important;
   }
   body.desktop-scenario-layout #clinicalInteractionColumn>#horseClinicalQuestionBox,
   body.desktop-scenario-layout #clinicalInteractionColumn>.horse-clinical-question-box,
   body.desktop-scenario-layout #clinicalInteractionColumn .horse-question-placeholder{
     display:none!important;
   }
   body.desktop-scenario-layout #horseEncounterProgress .horse-next-clinical-cue,
   body.desktop-scenario-layout #clinicalNextCue{
     display:none!important;
   }
   body.desktop-scenario-layout #clinicalInteractionColumn .patient-interview,
   body.desktop-scenario-layout #clinicalInteractionColumn [data-patient-interview],
   body.desktop-scenario-layout #clinicalInteractionColumn .patient-interview-workspace{
     display:none!important;
   }
   body.desktop-scenario-layout #horseEncounterProgress{
     order:5!important;flex:0 0 auto!important;margin:2px 0 6px!important;padding:5px 7px!important;
   }
   body.desktop-scenario-layout #horseEncounterProgress .horse-encounter-progress-head{display:none!important}
   body.desktop-scenario-layout #horseEncounterProgress .horse-encounter-steps{gap:4px!important;opacity:.72!important}
   body.desktop-scenario-layout #clinicalInteractionColumn>.patient-entry-workflow{order:10!important;flex:0 0 auto!important}
 }
 `;
 document.head.appendChild(style);
}

function ensureConversationStage(){
 if(!horse()||!desktop())return null;
 const column=$('clinicalInteractionColumn');
 const stage=$('patientCommunicationStage');
 if(!column||!stage)return null;
 const legacy=$('patientConversationStage');
 const turn=$('patientConversationTurn');
 if(turn&&turn.parentElement!==stage)stage.appendChild(turn);
 if(legacy&&legacy!==stage)legacy.remove();
 return stage;
}

function cleanCenter(){
 if(!horse()||!desktop())return;
 const column=$('clinicalInteractionColumn');
 if(!column)return;
 $('clinicalNextCue')?.remove();
 const question=$('horseClinicalQuestionBox');
 if(question?.parentElement===column)question.hidden=true;
 const progress=$('horseEncounterProgress');
 progress?.querySelector('.horse-next-clinical-cue')?.setAttribute('hidden','');
 const nav=column.querySelector('.bottom-nav,.clinical-domain-rail');
 if(nav)nav.style.setProperty('order','100','important');
 ensureConversationStage();
}

function normalizeInfoAnchor(){
 if(!horse()||!desktop())return;
 const column=$('clinicalInteractionColumn'),update=$('infoUpdateWindow')||document.querySelector('.info-update-window');
 if(column&&update&&update.parentElement!==column)column.prepend(update);
}

const DISTRACTIONS=[
 {text:'I know you’re checking a lot of things, but can you please tell me what happens next?',choices:[
   ['I’m finishing the important checks, then we’ll treat the hip and plan the safest move.','Okay. That helps. I just get nervous when I don’t know what is happening.'],
   ['I need you to give me a minute while I finish assessing you.','All right. I’ll try. Just keep me updated when you can.'],
   ['We’ll talk about that after I finish everything else.','Okay... I just wish I knew what the plan was.']
 ]},
 {text:'Do you think one of my horses got hurt too?',choices:[
   ['The crew told us the horses are secured. Right now I need to keep my attention on you.','Okay. You’re right. I’m sorry. I’m just worried about them.'],
   ['I understand why you’re worried. The other crew can check on them while I keep taking care of you.','Thank you. That makes me feel better.'],
   ['I don’t know yet. Let me finish this assessment first.','Okay. Please let me know if you hear anything.']
 ]},
 {text:'Can somebody call my husband? He’s probably wondering where I am.',choices:[
   ['Yes. We can help with that once the immediate assessment is finished.','Thank you. His name is Ray.'],
   ['I’ll ask another crew member to handle that while I stay with you.','That would be great. Thank you.'],
   ['Right now I need you to focus on my questions for just a minute.','Okay. Sorry. Go ahead.']
 ]},
 {text:'I hate hospitals. Do I really have to go?',choices:[
   ['With this mechanism and your hip pain, you need further evaluation and imaging.','Okay. I figured you were going to say that.'],
   ['We can talk through the transport plan, but I’m concerned enough that I recommend being evaluated.','All right. I appreciate you explaining why.'],
   ['Let’s stay focused on the assessment first, then I’ll explain the transport decision.','Okay. That’s fair.']
 ]},
 {text:'I’m sorry I keep asking questions. I’m just scared this is worse than it looks.',choices:[
   ['You don’t need to apologize. I’ll keep explaining things while we work.','Thank you. That really does help.'],
   ['It’s okay to be worried. I need you to stay as still as you can while we finish.','I can do that. I’ll keep the leg still.'],
   ['I hear you. Let me finish this check and I’ll update you right after.','Okay. Go ahead.']
 ]}
];

function scheduleDistraction(min=22000,max=42000){
 clearTimeout(distractionTimer);
 const delay=Math.round(min+Math.random()*(max-min));
 distractionTimer=setTimeout(()=>{
   if(conversationAllowed()&&Date.now()-lastDistractionAt>18000){
     const conversation=window.EMSCodeSimPatientConversation;
     if(conversation?.showPatientTurn){
       const turn=DISTRACTIONS[Math.floor(Math.random()*DISTRACTIONS.length)];
       conversation.showPatientTurn(turn,false);
       lastDistractionAt=Date.now();
       setTimeout(()=>ensureConversationStage(),50);
     }
   }
   scheduleDistraction(24000,46000);
 },delay);
}

function run(){
 if(!horse())return;
 injectStyles();
 normalizeInfoAnchor();
 cleanCenter();
}
function scheduleRun(){
 if(queued||!horse())return;
 queued=true;
 requestAnimationFrame(()=>{queued=false;run()});
}

function start(){
 run();
 observer=new MutationObserver(mutations=>{
   if(!horse()||!desktop())return;
   const meaningful=mutations.some(m=>{
     const target=m.target?.nodeType===1?m.target:m.target?.parentElement;
     return !target?.closest?.('#patientConversationStage');
   });
   if(meaningful)scheduleRun();
   else ensureConversationStage();
 });
 observer.observe(document.body,{subtree:true,childList:true});
 setTimeout(run,250);setTimeout(run,900);setTimeout(run,1800);
 // The unified patient-conversation module owns question timing.
}

document.addEventListener('DOMContentLoaded',start,{once:true});
if(document.readyState!=='loading')start();
window.addEventListener('emscodesim:assessment-saved',scheduleRun);
window.addEventListener('emscodesim:vital-saved',scheduleRun);
window.addEventListener('emscodesim:treatment-saved',scheduleRun);
window.addEventListener('storage',scheduleRun);
window.addEventListener('pagehide',()=>{observer?.disconnect();clearTimeout(distractionTimer)},{once:true});
})();
