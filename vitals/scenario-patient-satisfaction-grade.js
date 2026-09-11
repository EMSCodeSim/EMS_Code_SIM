(() => {
'use strict';
const VERSION='2026.08.17.15',params=new URLSearchParams(location.search),requested=String(params.get('case')||'').replace(/-/g,'_').toLowerCase();if(requested!=='horse_crush')return;
const $=id=>document.getElementById(id),api=window.EMSCodeSimPatientRecord,session=window.EMSCodeSimScenarioSession,runtime=window.EMSCodeSimScenarioRuntime;let observer=null,queued=false;
const record=()=>{try{return session?.sync?.()||api?.active?.()||null}catch(_){return null}};const clamp=v=>Math.max(0,Math.min(100,Math.round(Number(v)||0)));
function comfortScore(){
  const s=runtime?.horseClinicalState?.(record());
  if(!s) return 55;
  if(s.stage==='relieved') return 100;
  if(s.stage==='pain-improved') return 90;
  if(s.stage==='supported') return 82;
  if(s.stage==='stabilized') return 78;
  if(s.stage==='pain-escalating') return 35;
  if(s.stage==='delayed-care') return 20;
  if(s.stage==='worse') return 8;
  return s.painScore>=9?30:s.painScore<=5?82:55;
}
const SATISFACTION_EVENTS=Object.freeze({
  pain_assessed:{label:'Acknowledged and assessed Linda’s pain',points:4},
  movement_explained:{label:'Explained the movement plan before moving Linda',points:4},
  leg_supported:{label:'Supported the injured leg in a tolerated position',points:8},
  pain_treated:{label:'Provided effective pain treatment',points:12},
  distal_csm:{label:'Checked distal circulation, sensation, and movement',points:5},
  post_movement_reassessment:{label:'Planned pain, vital-sign, and distal CSM reassessment',points:5},
  transport_explained:{label:'Documented an appropriate transport plan',points:4},
  handoff_complete:{label:'Completed the hospital handoff',points:5},
  incomplete_movement_plan:{label:'Recorded an incomplete movement plan',points:-6},
  delayed_care:{label:'Delayed meaningful comfort care',points:-10},
  unsafe_movement:{label:'Selected a painful or unsafe movement',points:-18}
});
const SUPPORT_ACTION_IDS=new Set(['manual_leg_support','position_comfort','blanket_support','splint','scoop_position_comfort','vacuum_mattress','board_transfer']);
const UNSAFE_ACTION_IDS=new Set(['traction_splint','stand_pivot','force_straight']);
function eventLedger(){
  const r=record()||{},s=runtime?.horseClinicalState?.(r)||{},docs=r.documentation||{},findings=r.findings||{};
  const treatments=Array.isArray(r.treatments)?r.treatments:[],movement=docs.horseCrushMovement||{},pre=Array.isArray(movement.pre)?movement.pre:[],post=Array.isArray(movement.post)?movement.post:[];
  const currentMovementUnsafe=pre.includes('force_straight')||['stand_pivot','force_flat','blanket_lift'].includes(movement.method)||['traction','binder_only','straighten'].includes(movement.stabilization);
  const currentMovementComplete=Boolean(movement.method&&movement.stabilization&&pre.length&&post.length);
  const events=[],seen=new Set();
  const add=id=>{if(seen.has(id)||!SATISFACTION_EVENTS[id])return;seen.add(id);events.push({id,...SATISFACTION_EVENTS[id]})};
  if(findings.pain||findings.opqrst||findings.pain_assessment)add('pain_assessed');
  if(pre.includes('team_brief')||pre.includes('pain_plan'))add('movement_explained');
  const effective=treatments.filter(item=>item?.classification==='appropriate-effective'||(!item?.classification&&item?.actionId));
  if(effective.some(item=>SUPPORT_ACTION_IDS.has(item.actionId))||['blankets_position','vacuum_support'].includes(movement.stabilization))add('leg_supported');
  if(effective.some(item=>item.actionId==='pain_control'))add('pain_treated');
  if(findings.distal_csm)add('distal_csm');
  if(post.includes('csm')&&post.includes('pain_vitals'))add('post_movement_reassessment');
  if(docs.transportDecisionAt&&docs.transportPriority&&docs.destination)add('transport_explained');
  if(docs.handoffSavedAt)add('handoff_complete');
  if(currentMovementComplete&&!currentMovementUnsafe&&!(post.includes('csm')&&post.includes('pain_vitals')))add('incomplete_movement_plan');
  if(s.stage==='pain-escalating'||s.stage==='delayed-care')add('delayed_care');
  if(currentMovementUnsafe||treatments.some(item=>item?.actionId!=='horse_crush_movement_plan'&&(UNSAFE_ACTION_IDS.has(item?.actionId)||item?.classification==='contraindicated'||item?.classification==='unsafe')))add('unsafe_movement');
  return events;
}
function treatmentScore(){const events=eventLedger();return{score:clamp(50+events.reduce((total,event)=>total+event.points,0)),events};}
function model(){const comm=window.EMSCodeSimPatientRapport?.model?.()||{},anger=window.EMSCodeSimPatientAnger?.model?.()||{},communication=clamp(comm.score??70),calm=clamp(100-(anger.anger??8)),comfort=comfortScore(),treatmentResult=treatmentScore(),treatment=treatmentResult.score;const crewExperience=clamp(communication*.72+calm*.28);const clinicalExperience=clamp(treatment*.65+comfort*.35);const score=clamp(crewExperience*.55+clinicalExperience*.45);let label='Linda was dissatisfied with the encounter';if(score>=90)label='Linda felt exceptionally well cared for';else if(score>=80)label='Linda felt well cared for';else if(score>=70)label='Linda was generally satisfied';else if(score>=60)label='Linda had mixed feelings about the encounter';const strengths=[],friction=[];if(communication>=80)strengths.push('The crew listened, explained care, and treated Linda respectfully.');if(calm>=80)strengths.push('The crew kept Linda comfortable with how they communicated.');if(treatment>=80)strengths.push('The care plan addressed the injury and moved treatment forward.');if(comfort>=78)strengths.push('Treatment improved Linda’s pain or physical comfort.');if(communication<65)friction.push('How the crew communicated reduced Linda’s confidence in them.');if((anger.anger||0)>=40)friction.push('Linda remained frustrated with the crew.');if(treatment<60)friction.push('Linda felt that useful treatment was delayed or incomplete.');if(comfort<55)friction.push('Pain and physical discomfort remained a major part of her experience.');return{score,label,crewExperience,clinicalExperience,communication,calm,treatment,comfort,events:treatmentResult.events,strengths,friction};}
function quote(m){if(m.score>=90)return'I felt like they knew what they were doing, they listened to me, and what they did actually made me feel better.';if(m.score>=80)return'They treated me well, kept me informed, and I could tell the things they were doing were helping.';if(m.score>=70)return'Overall I felt taken care of. A few things could have gone smoother, but I trusted the crew.';if(m.score>=60)return'They were trying to help, but there were times I was still hurting or wasn’t sure anyone was listening.';return'I was hurting, frustrated, and I didn’t feel very confident in how the crew was taking care of me.';}
function showClinicalCoaching(workspace){
  ['horseGradeCategories','horseGradeStrengths','horseGradeImprovements','horseGradeTreatmentList','horseGradeTreatmentStatus','horseGradeNextFocus','horseGradeNarrative','horseCommunicationGrade','horseCommunicationDetail','horseClinicalCoachingHead'].forEach(id=>{const n=$(id);if(n)n.hidden=false});
  workspace.querySelectorAll('.horse-grade-treatment-review,.horse-grade-feedback-grid,.horse-grade-next-call').forEach(n=>{n.hidden=false});
  const head=$('horseClinicalCoachingHead');
  if(head){
    head.innerHTML='<small>CLINICAL CARE REVIEW</small><strong>Coaching breakdown</strong><p>These category scores are coaching feedback. Linda’s satisfaction is the graded criterion.</p>';
  }
}
function render(){
  queued=false;
  const w=$('horseGradeWorkspace');
  if(!w||w.hidden)return;
  showClinicalCoaching(w);
  const m=model(),score=$('horseGradeScore');
  if(score){
    score.innerHTML=`<strong>${m.score}</strong><span>/100</span>`;
    score.setAttribute('aria-label',`Linda satisfaction score ${m.score} out of 100`);
  }
  if($('horseGradeModeLabel'))$('horseGradeModeLabel').textContent='FINAL PATIENT GRADE';
  if($('horseGradeHeaderTitle'))$('horseGradeHeaderTitle').textContent='Linda’s experience grade';
  if($('horseGradeHeaderSubtitle'))$('horseGradeHeaderSubtitle').textContent='Surprise criterion: how the crew treated Linda as a person and whether care actually helped her.';
  if($('horseGradeTitle'))$('horseGradeTitle').textContent='Linda’s satisfaction';
  if($('horseGradeLabel'))$('horseGradeLabel').textContent=m.label;
  if($('horseGradeOutcome'))$('horseGradeOutcome').innerHTML='<small>SURPRISE GRADING CRITERION</small><strong>Linda’s total experience</strong><p>The scored grade is patient satisfaction. Clinical category bars below remain available as coaching for the next attempt.</p>';
  const summary=w.querySelector('.horse-grade-summary');
  if(!summary)return;
  let card=$('horsePatientSatisfactionReveal');
  if(!card){
    card=document.createElement('section');
    card.id='horsePatientSatisfactionReveal';
    card.className='horse-patient-satisfaction-reveal';
    const coachingHead=$('horseClinicalCoachingHead');
    if(coachingHead)summary.insertBefore(card,coachingHead);
    else summary.appendChild(card);
  }
  const pos=m.strengths.length?m.strengths:['Linda completed the encounter with enough confidence to continue care.'];
  const neg=m.friction.length?m.friction:['No major patient-experience concerns stood out.'];
  card.innerHTML=`<div class="satisfaction-reveal-banner"><small>WHAT WAS ACTUALLY GRADED</small><strong>Linda’s Satisfaction</strong><p>45% treatment/comfort + 55% experience with the crew.</p></div><blockquote>“${quote(m)}”<cite>— Linda, patient perspective</cite></blockquote><div class="satisfaction-score-parts"><article><small>CARE THAT AFFECTED LINDA</small><strong>${m.clinicalExperience}</strong><span>Treatment + comfort</span></article><article><small>HOW THE CREW MADE HER FEEL</small><strong>${m.crewExperience}</strong><span>Communication + trust</span></article></div><div class="satisfaction-event-ledger"><small>RECORDED SATISFACTION EVENTS</small><ul>${m.events.length?m.events.map(event=>`<li class="${event.points<0?'negative':'positive'}"><span>${event.label}</span><strong>${event.points>0?'+':''}${event.points}</strong></li>`).join(''):'<li><span>No scored care events recorded yet</span><strong>0</strong></li>'}</ul><p>Care-event score starts at 50. Each event is counted once.</p></div><div class="satisfaction-experience-grid"><article><small>WHAT HELPED</small><ul>${pos.map(x=>`<li>${x}</li>`).join('')}</ul></article><article><small>WHAT HURT</small><ul>${neg.map(x=>`<li>${x}</li>`).join('')}</ul></article></div><p class="satisfaction-instructor-note">This is a patient-satisfaction score, not a protocol or technical-skills grade. Treatment only matters here when it changes Linda’s pain, comfort, confidence, or perception that the crew is helping her.</p>`;
  const docs=record()?.documentation||{};
  if(docs.scenarioGrade!==m.score||docs.scenarioGradeLabel!==m.label||docs.gradeCriterion!=='patient_satisfaction'){
    api?.setDocumentation?.({scenarioGrade:m.score,scenarioGradeLabel:m.label,gradeCriterion:'patient_satisfaction',gradeViewedAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  }
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(render)}
function styles(){if(document.querySelector('style[data-patient-satisfaction-grade]'))return;const s=document.createElement('style');s.dataset.patientSatisfactionGrade=VERSION;s.textContent='.horse-patient-satisfaction-reveal{display:grid;gap:12px;margin-top:4px;margin-bottom:4px}.satisfaction-reveal-banner{padding:14px;border:1px solid #4288a4;border-radius:12px;background:#0b2939;display:grid;gap:3px}.satisfaction-reveal-banner small,.satisfaction-experience-grid small,.satisfaction-score-parts small{font-size:.68rem;font-weight:900;letter-spacing:.09em;color:#8fd1e9}.satisfaction-reveal-banner strong{font-size:1.18rem;color:#fff}.satisfaction-reveal-banner p{margin:0;color:#bed4de;font-size:.78rem}.horse-patient-satisfaction-reveal blockquote{margin:0;padding:14px 16px;border-left:4px solid #75c5df;border-radius:8px;background:#102d3c;color:#edf8fb;font-size:.95rem;line-height:1.5}.horse-patient-satisfaction-reveal cite{display:block;margin-top:7px;color:#9fc2d0;font-size:.72rem;font-style:normal}.satisfaction-score-parts,.satisfaction-experience-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.satisfaction-score-parts article,.satisfaction-experience-grid article{padding:11px;border-radius:10px;background:#102736;border:1px solid #2c5568}.satisfaction-score-parts strong{display:block;font-size:1.35rem;color:#fff;margin-top:4px}.satisfaction-score-parts span{font-size:.7rem;color:#a9c2cd}.satisfaction-event-ledger{padding:11px;border-radius:10px;background:#0d2532;border:1px solid #2c5568}.satisfaction-event-ledger>small{font-size:.68rem;font-weight:900;letter-spacing:.09em;color:#8fd1e9}.satisfaction-event-ledger ul{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:6px}.satisfaction-event-ledger li{display:flex;justify-content:space-between;gap:12px;padding:6px 8px;border-radius:7px;background:#132f3e;color:#e4eff3;font-size:.76rem}.satisfaction-event-ledger li strong{color:#8fe0b8}.satisfaction-event-ledger li.negative strong{color:#ff9e9e}.satisfaction-event-ledger p{margin:8px 0 0;color:#9fb9c5;font-size:.68rem}.satisfaction-experience-grid ul{margin:7px 0 0;padding-left:18px;display:grid;gap:5px;font-size:.76rem;line-height:1.35;color:#e4eff3}.satisfaction-instructor-note{margin:0;padding-top:8px;border-top:1px solid #315465;color:#9fb9c5;font-size:.72rem;line-height:1.4}@media(max-width:760px){.satisfaction-score-parts,.satisfaction-experience-grid{grid-template-columns:1fr}}';document.head.appendChild(s)}
function start(){styles();observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});document.addEventListener('click',e=>{if(e.target.closest?.('#openHorseCallGrade,.handoff-grade-button,[data-grade],#horseGradeReturn,#gradeScenarioFromPatient,#completeScenarioFromPatient,#closeHorseCallGrade'))setTimeout(schedule,100)},true);window.addEventListener('emscodesim:scenario-updated',schedule);window.EMSCodeSimPatientSatisfactionGrade=Object.freeze({version:VERSION,model});schedule();window.addEventListener('pagehide',()=>observer?.disconnect(),{once:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

(() => {
  'use strict';
  const ORIENTATION_KEY='emscodesim_patient_orientation_v2';
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const patientRecord=()=>{try{return window.EMSCodeSimScenarioSession?.sync?.()||window.EMSCodeSimPatientRecord?.active?.()||null}catch(_){return null}};
  function hasActivity(){
    const r=patientRecord()||{};
    const findings=r.findings&&Object.keys(r.findings).length;
    const history=r.history&&Object.keys(r.history).length;
    const treatments=Array.isArray(r.treatments)?r.treatments.length:0;
    const care=Array.isArray(r.careLog)?r.careLog.length:0;
    return Boolean(findings||history||treatments||care);
  }
  function styles(){
    if(q('style[data-site-review-onboarding]'))return;
    const s=document.createElement('style');s.dataset.siteReviewOnboarding='1';s.textContent=`
      .site-review-orientation{position:fixed;inset:0;z-index:10000;background:rgba(3,14,24,.74);display:grid;place-items:center;padding:20px}
      .site-review-orientation-card{width:min(520px,100%);background:#fff;color:#102a3c;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.38);padding:24px}
      .site-review-orientation-card small{font-weight:900;letter-spacing:.09em;color:#0878a8}.site-review-orientation-card h2{margin:6px 0 8px;font-size:1.55rem}.site-review-orientation-card>p{margin:0 0 16px;color:#526879;line-height:1.5}
      .site-review-orientation-steps{display:grid;gap:10px;margin:16px 0}.site-review-orientation-step{display:grid;grid-template-columns:34px 1fr;gap:10px;align-items:start;padding:11px;border:1px solid #d7e3eb;border-radius:12px;background:#f8fbfd}.site-review-orientation-step b{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#0878a8;color:#fff}.site-review-orientation-step strong{display:block;margin-bottom:2px}.site-review-orientation-step span{font-size:.88rem;color:#526879;line-height:1.4}
      .site-review-orientation-card button{width:100%;min-height:48px;border:0;border-radius:11px;background:#0878a8;color:#fff;font:inherit;font-weight:900;cursor:pointer}
      .site-review-first-load .reasoning-card.locked.assessment-hidden{display:none!important}
      .site-review-next-action{margin:10px 0;padding:14px;border:1px solid #31596f;border-radius:12px;background:#0d2b3b;color:#edf8fb;display:grid;gap:5px}.site-review-next-action small{font-weight:900;letter-spacing:.08em;color:#8ed5ef}.site-review-next-action strong{font-size:1rem}.site-review-next-action span{font-size:.82rem;line-height:1.45;color:#bad1dc}
    `;document.head.appendChild(s);
  }
  function hideEmptyHistoryBadge(){
    if(hasActivity())return;
    qa('button[data-panel="historyPanel"] span,button[data-panel="historyPanel"] b,button[data-panel="historyPanel"] em,#historyBadge,#historyCount').forEach(el=>{
      const t=(el.textContent||'').trim();if(t==='0'||/^0\s*(items?|new|questions?)?$/i.test(t))el.hidden=true;
    });
  }
  function guide(){
    let host=q('#patientCommunicationStage')||q('#clinicalInteractionColumn')||q('.patient-control-column');if(!host)return;
    let box=q('#siteReviewNextAction');if(!box){box=document.createElement('aside');box.id='siteReviewNextAction';box.className='site-review-next-action';host.prepend(box);}
    const active=hasActivity();
    if(active){
      const r=patientRecord()||{};const count=r.findings?Object.keys(r.findings).length:0;
      box.innerHTML=`<small>NEXT STEP</small><strong>Keep building the patient picture.</strong><span>${count?count+' finding'+(count===1?'':'s')+' documented. ':''}Use what you discovered to decide what to assess, ask, treat, or reassess next.</span>`;
      document.body.classList.remove('site-review-first-load');
    }else{
      box.innerHTML='<small>START HERE</small><strong>Look at the patient, then gather one finding.</strong><span>Open Assessment or ask History. Clinical decisions unlock after you collect relevant patient information.</span>';
      document.body.classList.add('site-review-first-load');
    }
    hideEmptyHistoryBadge();
  }
  function onboarding(){
    let seen=false;try{seen=localStorage.getItem(ORIENTATION_KEY)==='1'}catch(_){}
    if(seen||q('#siteReviewOrientation'))return;
    const wrap=document.createElement('div');wrap.id='siteReviewOrientation';wrap.className='site-review-orientation';wrap.innerHTML='<section class="site-review-orientation-card" role="dialog" aria-modal="true" aria-labelledby="siteReviewOrientationTitle"><small>FIRST SCENARIO</small><h2 id="siteReviewOrientationTitle">How to work the patient</h2><p>The simulator opens like an EMS call: start with what you can see, then gather enough information to make decisions.</p><div class="site-review-orientation-steps"><div class="site-review-orientation-step"><b>1</b><div><strong>Look at the patient.</strong><span>Use the scene, dispatch, appearance, and patient clock.</span></div></div><div class="site-review-orientation-step"><b>2</b><div><strong>Open Assessment or ask History.</strong><span>Collect findings instead of guessing ahead.</span></div></div><div class="site-review-orientation-step"><b>3</b><div><strong>Unlock clinical decisions.</strong><span>Discover → Decide → Treat → Reassess as the call develops.</span></div></div></div><button type="button" id="siteReviewOrientationClose">Start assessment</button></section>';
    document.body.appendChild(wrap);
    q('#siteReviewOrientationClose',wrap)?.addEventListener('click',()=>{try{localStorage.setItem(ORIENTATION_KEY,'1')}catch(_){}wrap.remove();const btn=q('button[data-panel="assessmentPanel"],#startSceneSizeupPhoto');btn?.focus?.();},{once:true});
  }
  function refresh(){guide();}
  function start(){styles();guide();onboarding();const obs=new MutationObserver(()=>requestAnimationFrame(refresh));obs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class']});window.addEventListener('emscodesim:scenario-updated',refresh);window.addEventListener('storage',refresh);window.addEventListener('pagehide',()=>obs.disconnect(),{once:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
