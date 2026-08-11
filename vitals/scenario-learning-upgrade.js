(() => {
  'use strict';

  const OPTIONS = {
    horse_pre: [
      ['focused_exam','Focused trauma exam + distal CSM before movement',true,'This creates a baseline, identifies injuries that change packaging, and gives you something to compare after movement.'],
      ['move_first','Move to the stretcher first, then finish the exam',false,'Moving first can worsen pain or an occult injury and removes your pre-movement neurovascular baseline.'],
      ['traction_first','Apply traction before completing the exam',false,'Traction is not chosen from hip pain alone. The exam should establish the injury pattern before a splinting decision.']
    ],
    horse_position: [
      ['comfort','Support the leg in its position of comfort and plan a coordinated lift',true,'The findings support protected movement with the leg flexed. Do not force an injured extremity into a textbook transport position.'],
      ['straighten','Slowly force the leg straight before packaging',false,'Severe movement-provoked hip pain is a reason to minimize manipulation, not force the extremity straight.'],
      ['stand','Try a stand-and-pivot transfer',false,'The patient cannot safely bear weight and has severe hip pain. A coordinated non-weight-bearing movement is safer.']
    ],
    horse_recheck: [
      ['serial','Repeat distal CSM, pain, and key vital signs',true,'Serial reassessment connects your intervention to patient response and catches a new neurovascular or perfusion problem early.'],
      ['pain_only','Ask only whether the pain is better',false,'Pain matters, but reassessment also needs objective neurovascular and physiologic findings.'],
      ['none','No reassessment is needed if the first exam was normal',false,'Movement and treatment can change the patient. A normal baseline is useful only if you compare it with a later exam.']
    ],
    asthma_severity: [
      ['work','Work of breathing + ability to speak + oxygenation trend',true,'Respiratory severity is a pattern, not a single number. Speech, air movement, respiratory effort, and oxygenation together define risk.'],
      ['spo2_only','SpO₂ alone',false,'Pulse oximetry matters, but it can lag behind deterioration and does not describe air movement or fatigue.'],
      ['wheeze_only','How loud the wheeze sounds',false,'A quieter wheeze can mean improvement—or dangerously reduced air movement. Interpret it with the rest of the exam.']
    ],
    asthma_treatment: [
      ['bronchodilator','Position, protocol-directed bronchodilator care, oxygen as indicated, then reassess',true,'This addresses bronchospasm while supporting oxygenation and preserving clear reassessment targets.'],
      ['oxygen_only','Oxygen only and wait for the wheeze to resolve',false,'Oxygen may treat hypoxemia but does not directly reverse bronchospasm.'],
      ['lay_flat','Lay the patient flat to reduce energy use',false,'Patients in respiratory distress often tolerate an upright position better. Forcing a flat position can worsen dyspnea.']
    ],
    asthma_response: [
      ['trend','Recheck speech, work of breathing, air movement, RR, SpO₂, and mental status',true,'Real improvement is a trend across patient appearance, ventilation, oxygenation, and mental status.'],
      ['wheeze','If wheezing is quieter, assume treatment worked',false,'A quiet chest with worsening effort or mental status is a dangerous sign, not reassurance.'],
      ['one_vital','Repeat only SpO₂',false,'One number cannot distinguish improved ventilation from respiratory fatigue.']
    ],
    stroke_time: [
      ['lkw','Last known well / last known normal time',true,'Last-known-well anchors time-sensitive stroke pathways and should travel with the patient to the receiving team.'],
      ['dispatch','The time the 911 call was placed',false,'Dispatch time is operationally useful but does not establish when the neurologic event began.'],
      ['arrival','The time EMS arrived on scene',false,'Arrival time does not replace the clinical onset or last-known-well history.']
    ],
    stroke_mimic: [
      ['glucose','Blood glucose',true,'Hypoglycemia can mimic focal neurologic disease and is rapidly testable in the field.'],
      ['temperature','Temperature before glucose',false,'Temperature can matter, but glucose is the higher-yield reversible-mimic check in acute focal neurologic symptoms.'],
      ['pain','Pain scale before glucose',false,'Pain assessment does not rule out a reversible cause of the focal deficits.']
    ],
    stroke_destination: [
      ['rapid','Rapid stroke-system transport with early notification and timing report',true,'The field goal is recognition, mimic screening, supportive care, and efficient access to definitive stroke evaluation.'],
      ['complete_everything','Stay on scene until every optional assessment is complete',false,'Low-value scene tasks should not delay definitive stroke care once immediate threats and key data are addressed.'],
      ['bp_treat','Normalize the blood pressure before transport',false,'Prehospital blood-pressure management in suspected stroke is protocol-specific; do not delay transport chasing a normal number.']
    ],
    hypo_cause: [
      ['glucose','Blood glucose',true,'A rapid glucose check can reveal a common reversible cause of altered mental status and directly changes treatment.'],
      ['temperature','Temperature alone',false,'Temperature may add context but is less likely to provide an immediate field reversal in this presentation.'],
      ['pain','Pain score',false,'Pain assessment does not address the high-priority reversible cause suggested by this presentation.']
    ],
    hypo_route: [
      ['swallow','Ability to follow commands, protect the airway, and swallow safely',true,'The route must match airway safety. If swallowing is unsafe, use locally authorized non-oral treatment and transport/ALS support.'],
      ['number','The glucose number alone',false,'A low number establishes the problem but does not prove that oral administration is safe.'],
      ['age','Patient age',false,'Age does not replace an airway and swallowing assessment when choosing an oral route.']
    ],
    hypo_proof: [
      ['repeat','Repeat glucose plus mental status and airway reassessment',true,'A rising glucose with improving mentation—and maintained airway safety—shows whether treatment is working.'],
      ['awake','If the patient opens their eyes, treatment is complete',false,'Improvement should be documented objectively and followed for recurrence or incomplete recovery.'],
      ['single','Repeat glucose only',false,'The number matters, but clinical recovery and airway safety matter too.']
    ]
  };

  const CASES = {
    horse_crush: {
      image:'/vitals/assets/horse-crush/patient-initial.webp', label:'Trauma reasoning',
      focus:'Assess before movement. Protect the painful position. Reassess after every meaningful change.',
      checkpoints:[
        ['pre_move','Before you move this patient','Which information matters most before committing to a movement plan?','Discover the painful area, leg findings, and distal neurovascular status.', r => all(r,['left_leg','distal_csm']) && (has(r,'pelvis_hip') || has(r,'trauma_assessment')), OPTIONS.horse_pre],
        ['position','The leg will not straighten','What is the best initial movement strategy?','Discover what worsens the pain and how the leg is currently tolerated.', r => has(r,'left_leg') && (has(r,'pain') || /straighten|lower the leg|position of comfort/i.test(text(r))), OPTIONS.horse_position],
        ['recheck','After stabilization or movement','What proves that your plan did not create a new problem?','Perform a treatment or movement step first.', r => treatmentCount(r)>0 || reassessmentCount(r)>0, OPTIONS.horse_recheck]
      ]
    },
    asthma: {
      image:'/vitals/assets/scenario-asthma-learning.svg', label:'Respiratory reasoning',
      focus:'Decide how sick the patient is, treat the physiology you discovered, then prove the response.',
      checkpoints:[
        ['severity','How sick is this patient?','Which finding combination should drive your urgency?','Obtain breathing quality, respiratory rate, and SpO₂.', r => all(r,['breathing','respirations','spo2']), OPTIONS.asthma_severity],
        ['treatment','Choose care from discovered evidence','What is the best next strategy for this presentation?','Discover breath sounds and the patient’s medication/trigger history.', r => has(r,'breath_sounds') && (has(r,'sample') || /albuterol|inhaler|dust|asthma/i.test(text(r))), OPTIONS.asthma_treatment],
        ['response','Is the patient actually improving?','What reassessment best separates improvement from fatigue?','Perform a respiratory treatment first.', r => hasTreatment(r,['bronchodilator','oxygen','position_comfort','bvm']), OPTIONS.asthma_response]
      ]
    },
    stroke: {
      image:'/vitals/assets/scenario-stroke-learning.svg', label:'Neurologic reasoning',
      focus:'Protect time: establish onset, exclude a reversible mimic, document deficits, and move toward definitive stroke care.',
      checkpoints:[
        ['time','The clock starts with history','Which time matters most for hospital stroke decisions?','Ask the patient/family about onset and when the patient was last normal.', r => has(r,'sample') || /last known well|last normal|09:10|9:10/i.test(text(r)), OPTIONS.stroke_time],
        ['mimic','Do not miss a reversible mimic','Which mini-sim should be prioritized early in this neurologic presentation?','Complete mental-status or neurologic assessment first.', r => has(r,'mental_status') || has(r,'motor_sensory'), OPTIONS.stroke_mimic],
        ['destination','Scene work versus definitive care','Once stroke findings and timing are established, what should dominate the plan?','Document neurologic findings and obtain glucose.', r => has(r,'blood_glucose') && (has(r,'motor_sensory') || has(r,'mental_status')), OPTIONS.stroke_destination]
      ]
    },
    hypoglycemia: {
      image:'/vitals/assets/scenario-hypoglycemia-learning.svg', label:'Altered mental status reasoning',
      focus:'Find reversible causes early, match treatment to airway/swallow safety, and prove recovery with reassessment.',
      checkpoints:[
        ['cause','Altered mental status: find reversibles','Which finding can immediately change both diagnosis and treatment?','Assess mental status, then use a mini-sim to check a reversible cause.', r => has(r,'mental_status'), OPTIONS.hypo_cause],
        ['route','The glucose is low—can the patient swallow?','What determines whether oral glucose is an appropriate route?','Discover glucose, airway status, and mental status.', r => all(r,['blood_glucose','airway','mental_status']), OPTIONS.hypo_route],
        ['proof','Treatment is not the endpoint','What demonstrates meaningful response to therapy?','Treat the hypoglycemia first.', r => hasTreatment(r,['oral_glucose','airway_support','rapid_transport']) || treatmentCount(r)>0, OPTIONS.hypo_proof]
      ]
    }
  };

  const $ = id => document.getElementById(id);
  const activeCase = () => new URLSearchParams(location.search).get('case') || window.EMSCodeSimPatientRecord?.active?.()?.scenarioId || '';
  const record = () => window.EMSCodeSimPatientRecord?.active?.() || window.EMSCodeSimScenarioSession?.active?.(activeCase()) || {};
  const mode = () => new URLSearchParams(location.search).get('training') || record()?.documentation?.trainingMode || 'learning';
  const has = (r,key) => Boolean(r?.findings?.[key]);
  const all = (r,keys) => keys.every(key => has(r,key));
  const treatmentCount = r => Array.isArray(r?.treatments) ? r.treatments.length : 0;
  const reassessmentCount = r => Array.isArray(r?.reassessments) ? r.reassessments.length : 0;
  const text = r => { try { return JSON.stringify({findings:r?.findings||{},history:r?.history||{},careLog:r?.careLog||[],treatments:r?.treatments||[]}); } catch { return ''; } };
  const hasTreatment = (r,ids) => { const t=text({treatments:r?.treatments||[],careLog:(r?.careLog||[]).filter(x=>x?.type==='treatment'||x?.category==='treatment')}).toLowerCase(); return ids.some(id=>t.includes(id.toLowerCase())||t.includes(id.toLowerCase().replace(/_/g,' '))); };
  const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const decisionFor = (r,id) => r?.documentation?.reasoningDecisions?.[id] || null;
  const optionFor = (checkpoint,decision) => decision ? checkpoint[5].find(option=>option[0]===decision.selected || option[1]===decision.label) || null : null;

  function reviewUnlocked(){
    if(mode()!=='assessment') return true;
    const grade=$('horseGradeWorkspace');
    if(grade && grade.hidden===false) return true;
    const completion=$('scenarioCompletionMessage');
    return Boolean(completion && completion.hidden===false && /complete|debrief|ready for review|call review/i.test(completion.textContent||''));
  }

  function saveDecision(checkpoint,option){
    const api=window.EMSCodeSimPatientRecord;
    const current=api?.active?.()||{};
    const previous=current?.documentation?.reasoningDecisions||{};
    if(mode()==='assessment' && previous[checkpoint[0]]) return current;
    const recordedAt=new Date().toISOString();
    return api?.setDocumentation?.({
      reasoningDecisions:{...previous,[checkpoint[0]]:{checkpointId:checkpoint[0],checkpointTitle:checkpoint[1],selected:option[0],label:option[1],correct:Boolean(option[2]),rationale:option[3],recordedAt,source:'scenario-learning-upgrade'}},
      reasoningCase:activeCase(),reasoningUpdatedAt:recordedAt
    });
  }

  function injectStyles(){
    if(document.querySelector('link[data-learning-reasoning-style]')) return;
    const link=document.createElement('link');
    link.rel='stylesheet'; link.href='/vitals/scenario-learning-upgrade.css?v=2403'; link.dataset.learningReasoningStyle='1';
    document.head.appendChild(link);
  }

  function setArtwork(config){
    if(activeCase()==='horse_crush') return;
    for(const id of ['patientImage','focusImage']){
      const img=$(id);
      if(img && (!img.src || /scenario-patient-adult-v3|scenario-patient-pediatric-v3/.test(img.src))){
        img.src=config.image;
        img.alt=`${activeCase().replace(/_/g,' ')} EMS training patient illustration`;
      }
    }
  }

  function addCue(){
    if($('reasoningDiscoveryCue')) return;
    const info=$('infoUpdateWindow');
    if(!info?.parentNode) return;
    const cue=document.createElement('div');
    cue.id='reasoningDiscoveryCue'; cue.className='reasoning-discovery-cue';
    cue.innerHTML='<strong>Discover → Decide → Treat → Reassess</strong><span>Ask the patient, use the mini-sims, then commit to a clinical decision.</span>';
    info.insertAdjacentElement('afterend',cue);
  }

  function cardMarkup(checkpoint,index,r){
    const unlocked=checkpoint[4](r);
    const decision=decisionFor(r,checkpoint[0]);
    const chosen=optionFor(checkpoint,decision);
    const assessment=mode()==='assessment';
    const reveal=reviewUnlocked();
    if(assessment && !unlocked && !chosen){
      return `<article class="reasoning-card locked assessment-hidden"><div class="reasoning-card-top"><span>${index+1}</span><div><small>DISCOVER FIRST</small><strong>Clinical decision ${index+1}</strong></div></div><p>Gather relevant patient information before this decision point becomes available.</p><div class="reasoning-lock"><b>🔒</b><span>No assessment hints are shown in Assessment Mode.</span></div></article>`;
    }
    const correct=Boolean(chosen?.[2]);
    const state=chosen ? (assessment&&!reveal?'recorded':correct?'complete':'review') : unlocked?'ready':'locked';
    const status=chosen ? (assessment&&!reveal?'DECISION RECORDED':correct?'STRONG DECISION':'DECISION TO REVIEW') : unlocked?'READY TO DECIDE':'DISCOVER FIRST';
    const options=(unlocked||chosen) ? `<div class="reasoning-options">${checkpoint[5].map(option=>`<button type="button" data-checkpoint="${esc(checkpoint[0])}" data-option="${esc(option[0])}" class="${chosen?.[0]===option[0]?'selected':''}" ${assessment&&chosen?'disabled':''}>${esc(option[1])}</button>`).join('')}</div>` : '';
    let feedback='';
    if(chosen){
      if(assessment&&!reveal) feedback='<div class="reasoning-feedback"><strong>Decision recorded</strong><span>Correctness and rationale stay hidden until call review.</span></div>';
      else feedback=`<div class="reasoning-feedback ${correct?'good':'caution'}"><strong>${correct?'Strong reasoning':'Reconsider this choice'}</strong><span>${esc(chosen[3])}</span>${!assessment&&!correct?'<small>You may revise this decision after gathering more information.</small>':''}</div>`;
    }
    return `<article class="reasoning-card ${state}" data-reasoning-card="${esc(checkpoint[0])}"><div class="reasoning-card-top"><span>${index+1}</span><div><small>${status}</small><strong>${esc(checkpoint[1])}</strong></div></div><p>${esc(checkpoint[2])}</p>${!unlocked&&!chosen?`<div class="reasoning-lock"><b>🔒</b><span>${esc(checkpoint[3])}</span></div>`:''}${options}${feedback}</article>`;
  }

  function render(){
    const config=CASES[activeCase()];
    if(!config||!document.body) return;
    const r=record();
    let board=$('clinicalReasoningBoard');
    const anchor=$('horseCurrentAssessment')||document.querySelector('.patient-entry-workflow');
    if(!board){
      board=document.createElement('section'); board.id='clinicalReasoningBoard'; board.className='clinical-reasoning-board'; board.setAttribute('aria-label','Clinical reasoning checkpoints');
      if(anchor?.parentNode) anchor.parentNode.insertBefore(board,anchor); else document.querySelector('.patient-control-column')?.prepend(board);
    }
    const decided=config.checkpoints.map(cp=>({cp,decision:decisionFor(r,cp[0])})).filter(item=>item.decision);
    const complete=decided.length;
    const strong=decided.filter(item=>item.decision.correct===true).length;
    const assessmentReview=mode()==='assessment'&&reviewUnlocked();
    const footer=assessmentReview
      ? `Clinical reasoning review: ${strong}/${complete} recorded decisions were strong. Review each checkpoint before ending the scenario.`
      : complete===config.checkpoints.length
        ? 'Reasoning checkpoints complete. Continue treatment, reassessment, transport, and handoff.'
        : 'Decisions unlock only after you discover the information needed to make them.';
    board.innerHTML=`<header class="reasoning-board-head"><div><small>CLINICAL REASONING</small><strong>${esc(config.label)}</strong></div><span>${complete}/${config.checkpoints.length}</span></header><p class="reasoning-board-focus">${esc(config.focus)}</p><div class="reasoning-checkpoints">${config.checkpoints.map((cp,i)=>cardMarkup(cp,i,r)).join('')}</div><footer class="reasoning-board-foot"><span>${esc(footer)}</span></footer>`;
    board.querySelectorAll('[data-checkpoint][data-option]').forEach(button=>button.addEventListener('click',()=>{
      const cp=config.checkpoints.find(item=>item[0]===button.dataset.checkpoint);
      const option=cp?.[5].find(item=>item[0]===button.dataset.option);
      if(!cp||!option||(!cp[4](record())&&!decisionFor(record(),cp[0]))) return;
      saveDecision(cp,option);
      if(mode()==='learning') window.EMSCodeSimPatientInfo?.showSceneObservation?.({id:`reasoning-${activeCase()}-${cp[0]}-${Date.now()}`,type:option[2]?'CLINICAL REASONING':'DECISION REVIEW',title:cp[1],text:option[3],kind:option[2]?'assessment':'alert',sticky:false});
      window.setTimeout(render,60);
    }));
  }

  function init(){
    const config=CASES[activeCase()];
    if(!config) return;
    injectStyles(); document.body.classList.add('reasoning-upgrade-active',`reasoning-case-${activeCase()}`); setArtwork(config); addCue(); render();
    let signature='';
    window.setInterval(()=>{
      const r=record();
      const decisions=Object.values(r?.documentation?.reasoningDecisions||{}).map(x=>`${x.checkpointId}:${x.selected}`).sort().join('|');
      const next=`${Object.keys(r?.findings||{}).sort().join('|')}::${treatmentCount(r)}::${reassessmentCount(r)}::${decisions}::${reviewUnlocked()}`;
      if(next!==signature){signature=next;setArtwork(config);render();}
    },700);
  }

  window.EMSCodeSimScenarioLearningUpgrade=Object.freeze({version:'2.403',cases:Object.keys(CASES)});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
