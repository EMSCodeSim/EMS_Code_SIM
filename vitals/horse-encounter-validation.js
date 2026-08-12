(() => {
  'use strict';

  const CASE_ID = 'horse_crush';
  const api = window.EMSCodeSimPatientRecord;
  const session = window.EMSCodeSimScenarioSession;
  const $ = (sel, root = document) => root.querySelector(sel);

  function caseId() {
    const q = new URLSearchParams(location.search).get('case');
    return String(q || api?.active?.()?.scenarioId || '').replace(/-/g, '_').toLowerCase();
  }
  if (caseId() !== CASE_ID) return;

  function record() { return session?.active?.(CASE_ID) || api?.active?.() || {}; }
  function finding(key) { return record()?.findings?.[key] || null; }
  function timeOf(item) {
    const n = new Date(item?.recordedAt || item?.time || item?.updatedAt || 0).getTime();
    return Number.isFinite(n) ? n : 0;
  }
  function textOf(item) {
    return [item?.actionId, item?.treatment, item?.label, item?.value, item?.details, item?.description]
      .filter(Boolean).join(' ').toLowerCase();
  }
  function treatments() { return Array.isArray(record()?.treatments) ? record().treatments : []; }
  function reassessments() { return Array.isArray(record()?.reassessments) ? record().reassessments : []; }

  const REASSESSMENT_RULES = [
    { id:'leg-stabilization', match:/splint|stabili|manual support|position of comfort|blanket|pillow|immobili/, targets:['pain','distal_csm'], cue:'Reassess pain and distal circulation, sensation, and movement after stabilization.' },
    { id:'movement-packaging', match:/move|packag|lift|transfer|stretcher|position/, targets:['pain','distal_csm'], cue:'Movement can change pain and neurovascular status. Repeat pain and distal CSM.' },
    { id:'oxygen-breathing', match:/oxygen|nasal cannula|nonrebreather|bvm|cpap/, targets:['respirations','spo2'], cue:'Reassess respiratory rate/effort and SpO₂ after respiratory treatment.' },
    { id:'bleeding-perfusion', match:/bleed|tourniquet|wound pack|direct pressure|shock care/, targets:['perfusion','blood_pressure','pulse'], cue:'Reassess bleeding control, perfusion, pulse, and blood pressure.' }
  ];

  function reassessmentForTargetAfter(target, afterMs) {
    const explicit = reassessments().some(r => {
      const targets = Array.isArray(r?.targetKeys) ? r.targetKeys : [r?.assessment, r?.context].filter(Boolean);
      return targets.includes(target) && timeOf(r) > afterMs;
    });
    if (explicit) return true;
    const f = finding(target);
    return Boolean(f?.isReassessment && timeOf(f) > afterMs);
  }

  function pendingReassessment() {
    const pending = [];
    treatments().forEach(t => {
      const text = textOf(t), treatedAt = timeOf(t);
      REASSESSMENT_RULES.forEach(rule => {
        if (!rule.match.test(text)) return;
        const missing = rule.targets.filter(target => !reassessmentForTargetAfter(target, treatedAt));
        if (missing.length) pending.push({ ...rule, treatment:t, treatedAt, missing });
      });
    });
    const newest = new Map();
    pending.forEach(item => {
      const current = newest.get(item.id);
      if (!current || item.treatedAt > current.treatedAt) newest.set(item.id, item);
    });
    return [...newest.values()].sort((a,b)=>b.treatedAt-a.treatedAt);
  }

  function hasAny(keys){return keys.some(key=>Boolean(finding(key)))}
  function abcComplete(){return ['airway','breathing','perfusion'].every(key=>Boolean(finding(key)))}
  function vitalsComplete(){const keys=['blood_pressure','pulse','respirations','spo2'];return keys.filter(key=>Boolean(finding(key))).length>=3}
  function historyComplete(){const r=record();return Boolean(finding('sample')||finding('pain')||r?.documentation?.historyComplete||(r?.history||[]).length>=3)}
  function focusedComplete(){return Boolean(finding('trauma_assessment'))||['pelvis_hip','left_leg','distal_csm'].every(key=>Boolean(finding(key)))}
  function treatmentComplete(){return treatments().length>0}
  function reassessmentComplete(){return treatmentComplete()&&pendingReassessment().length===0&&(reassessments().length>0||hasAny(['pain','distal_csm']))}
  function transportComplete(){const r=record();return Boolean(finding('transport_decision')||finding('transport')||r?.documentation?.transport||r?.documentation?.transportPlan||r?.transport?.priority)}
  function handoffComplete(){const r=record();return Boolean(finding('handoff')||finding('patient_handoff')||r?.documentation?.handoff||r?.handoff)}

  function milestones(){return [
    ['arrival','Arrival',Boolean(finding('arrival_parking'))],['abc','ABC',abcComplete()],['vitals','Vitals',vitalsComplete()],['history','History',historyComplete()],['focused','Focused exam',focusedComplete()],['treatment','Treatment',treatmentComplete()],['reassessment','Reassessment',reassessmentComplete()],['transport','Transport',transportComplete()],['handoff','Handoff',handoffComplete()]
  ]}

  function nextCue(){
    const pending=pendingReassessment();
    if(pending.length)return {urgent:true,text:pending[0].cue};
    if(!abcComplete())return {text:'Complete the primary ABC assessment before moving deeper into the encounter.'};
    if(!vitalsComplete())return {text:'Gather enough objective vital data to establish a baseline.'};
    if(!historyComplete())return {text:'Complete the patient history and pain assessment.'};
    if(!focusedComplete())return {text:'Finish the focused trauma exam, including the injured leg and distal CSM.'};
    if(!treatmentComplete())return {text:'Choose treatment based on the findings you have discovered.'};
    if(!reassessmentComplete())return {urgent:true,text:'Treatment is complete. Reassess the findings your treatment could have changed.'};
    if(!transportComplete())return {text:'Make and document the transport priority and destination decision.'};
    if(!handoffComplete())return {text:'Complete the receiving-facility handoff using the findings and care you documented.'};
    return {text:'Encounter complete. Grade the scenario to review clinical decisions and sequence.'};
  }

  function ensureProgress(){
    const column=document.getElementById('clinicalInteractionColumn');
    if(!column)return null;
    let wrap=document.getElementById('horseEncounterProgress');
    if(!wrap){
      wrap=document.createElement('section');wrap.id='horseEncounterProgress';wrap.className='horse-encounter-progress';
      const question=document.getElementById('horseClinicalQuestionBox');
      if(question?.parentElement===column)column.insertBefore(wrap,question);else column.appendChild(wrap);
    }
    return wrap;
  }

  function progressMarkup(){
    const cue=nextCue(),items=milestones(),done=items.filter(([, ,complete])=>complete).length;
    return `<div class="horse-encounter-progress-head"><span>ENCOUNTER PROGRESS</span><strong>${done}/${items.length}</strong></div><div class="horse-encounter-steps" aria-label="Encounter completion">${items.map(([id,label,complete])=>`<span class="${complete?'complete':''}" data-step="${id}">${complete?'✓':'○'} ${label}</span>`).join('')}</div><p class="horse-next-clinical-cue${cue.urgent?' urgent':''}"><strong>${cue.urgent?'REASSESSMENT DUE':'CLINICAL CUE'}</strong>${cue.text}</p>`;
  }

  function renderProgress(){const wrap=ensureProgress();if(!wrap)return;const html=progressMarkup();if(wrap.innerHTML!==html)wrap.innerHTML=html}

  function orderedEvents(){
    const rows=[];
    Object.entries(record()?.findings||{}).forEach(([key,value])=>rows.push({type:'finding',key,at:timeOf(value),item:value}));
    treatments().forEach(item=>rows.push({type:'treatment',key:item.actionId||item.treatment||'treatment',at:timeOf(item),item}));
    reassessments().forEach(item=>rows.push({type:'reassessment',key:item.assessment||item.context||'reassessment',at:timeOf(item),item}));
    return rows.filter(e=>e.at).sort((a,b)=>a.at-b.at);
  }

  function debriefModel(){
    const events=orderedEvents(),firstTreatment=events.find(e=>e.type==='treatment')?.at||Infinity;
    const abcTimes=['airway','breathing','perfusion'].map(key=>timeOf(finding(key))).filter(Boolean);
    const focusedTimes=['pelvis_hip','left_leg','distal_csm'].map(key=>timeOf(finding(key))).filter(Boolean);
    const positives=[],misses=[],sequence=[];
    if(abcComplete()&&abcTimes.every(t=>t<firstTreatment))positives.push('Primary ABC assessment was completed before treatment.');else if(!abcComplete())misses.push('Primary ABC assessment was incomplete.');else sequence.push('Treatment began before the complete ABC baseline was documented.');
    if(finding('distal_csm')&&timeOf(finding('distal_csm'))<firstTreatment)positives.push('A distal neurovascular baseline was established before stabilization/movement.');else misses.push('Establish distal CSM before movement or splinting so changes can be recognized.');
    if(vitalsComplete())positives.push('Objective baseline vital data was obtained.');else misses.push('The encounter did not include a sufficient baseline vital-sign set.');
    if(focusedComplete())positives.push('The focused trauma exam identified and characterized the hip/leg injury.');else misses.push('The focused trauma examination was incomplete.');
    const pending=pendingReassessment();if(treatmentComplete()&&pending.length===0)positives.push('Treatment was followed by the required reassessment.');pending.forEach(item=>misses.push(item.cue));
    if(firstTreatment<Infinity&&focusedTimes.length&&focusedTimes.some(t=>t>firstTreatment))sequence.push('Part of the focused injury assessment occurred after treatment began. In a stable patient, establish the key baseline findings first when practical.');
    if(!transportComplete())misses.push('A transport priority/destination decision was not documented.');if(!handoffComplete())misses.push('A final receiving-facility handoff was not completed.');
    return {positives:[...new Set(positives)],misses:[...new Set(misses)],sequence:[...new Set(sequence)]};
  }

  function gradeHost(){return $('#horseGradePanel, #gradePanel, #scenarioGrade, .grade-results, .scenario-grade, [data-grade-results]')}
  function renderDebrief(){
    const host=gradeHost();if(!host)return;
    const model=debriefModel();let section=$('#horseEncounterDebrief',host);
    if(!section){section=document.createElement('section');section.id='horseEncounterDebrief';section.className='horse-encounter-debrief';host.appendChild(section)}
    const block=(title,cls,rows,empty)=>`<div class="${cls}"><h3>${title}</h3>${rows.length?`<ul>${rows.map(row=>`<li>${row}</li>`).join('')}</ul>`:`<p>${empty}</p>`}</div>`;
    const html=`<div class="horse-debrief-title"><span>ENCOUNTER DEBRIEF</span><h2>Clinical decisions and sequence</h2></div>${block('What you did well','well',model.positives,'No completed strengths are available yet.')}${block('Missed / incomplete','missed',model.misses,'No major required elements are missing.')}${block('Sequence opportunities','sequence',model.sequence,'No major sequencing concerns identified.')}<p class="horse-debrief-note">Use this review to improve the next attempt. Local protocols and medical direction always control patient care.</p>`;
    if(section.innerHTML!==html)section.innerHTML=html;
  }

  let queued=false;
  function refresh(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;renderProgress();renderDebrief()})}
  ['emscodesim:assessment-saved','emscodesim:treatment-saved','emscodesim:scenario-updated','storage'].forEach(name=>window.addEventListener(name,refresh));
  document.addEventListener('click',()=>setTimeout(refresh,80),true);
  const observer=new MutationObserver(mutations=>{
    const meaningful=mutations.some(m=>{const target=m.target?.nodeType===1?m.target:m.target?.parentElement;return !target?.closest?.('#horseEncounterProgress,#horseEncounterDebrief')});
    if(meaningful)refresh();
  });
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
  refresh();
})();
