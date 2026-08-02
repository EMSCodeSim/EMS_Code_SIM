(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const api = window.EMSCodeSimPatientRecord;
  const phaseApi = window.EMSCodeSimScenarioPhases;
  const text = v => String(v ?? '').trim();
  const arr = v => Array.isArray(v) ? v : [];
  const esc = v => text(v).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const ts = v => { const n = new Date(v || 0).getTime(); return Number.isFinite(n) ? n : 0; };
  const fmt = sec => `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(Math.max(0,sec%60)).padStart(2,'0')}`;
  const label = key => phaseApi?.labelFor?.(key) || text(key).replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());

  const SCENARIO_EXPECTATIONS = {
    asthma:{critical:['airway','breathing','perfusion','respirations','breath_sounds','spo2'], maxTreatmentDelay:180, destination:'Closest appropriate emergency department'},
    stroke:{critical:['airway','breathing','perfusion','mental_status','motor_sensory','blood_glucose','blood_pressure'], maxTreatmentDelay:240, destination:'Stroke-capable center'},
    hypoglycemia:{critical:['airway','breathing','perfusion','mental_status','blood_glucose'], maxTreatmentDelay:180, destination:'Closest appropriate emergency department'},
    trauma:{critical:['airway','breathing','perfusion','blood_pressure','pulse','chest_assessment','trauma_assessment'], maxTreatmentDelay:180, destination:'Trauma center'},
    pediatric:{critical:['pediatric_assessment_triangle','airway','breathing','perfusion','respirations','spo2'], maxTreatmentDelay:180, destination:'Pediatric-capable emergency department'}
  };

  function record(){ return api?.active?.() || null; }
  function elapsed(record, when){ return Math.max(0, Math.round((ts(when)-ts(record.startedAt))/1000)); }
  function statusRating(score){ return score>=90?'Strong':score>=75?'Appropriate':score>=60?'Developing':'Needs improvement'; }
  function classification(record,key){ return phaseApi?.classification?.(record.scenarioId||record.id,key) || 'optional'; }
  function has(record,key){ return Boolean(record.findings?.[key]); }
  function newestTime(items){ return items.length ? Math.max(...items.map(x=>ts(x.recordedAt||x.time))) : 0; }
  function firstTime(items){ return items.length ? Math.min(...items.map(x=>ts(x.recordedAt||x.time))) : 0; }

  function grade(record){
    const evaluation=phaseApi.evaluate(record); const scenarioId=evaluation.caseId; const expected=SCENARIO_EXPECTATIONS[scenarioId]||SCENARIO_EXPECTATIONS.asthma;
    const strengths=[], opportunities=[], selection=[], handoff=[]; const ratings=[];
    const phaseMap={scene:'Initial priorities',primary:'Primary assessment',focused:'Assessment selection',vitals:'Vital signs',treatment:'Treatment',reassessment:'Reassessment',impression:'Transport',handoff:'Handoff'};
    evaluation.phases.filter(p=>phaseMap[p.id]).forEach(p=>{
      let score=p.complete?90:p.started?60:25;
      if(p.id==='focused'){
        const unnecessary=Object.keys(record.findings||{}).filter(k=>classification(record,k)==='not-indicated');
        score=Math.max(20,score-unnecessary.length*8);
      }
      ratings.push({id:p.id,label:phaseMap[p.id],score,rating:statusRating(score),detail:p.complete?'Completed':p.detail||p.requirement});
    });
    expected.critical.filter(k=>has(record,k)).length>=Math.ceil(expected.critical.length*.8) ? strengths.push('The key threats and time-sensitive findings were assessed.') : opportunities.push('Several high-priority findings were not obtained before the call ended.');
    if(arr(record.treatments).length) strengths.push('At least one treatment decision was recorded and linked to the patient record.'); else opportunities.push('No treatment decision was recorded.');
    const firstAbnormal=Object.values(record.findings||{}).filter(f=>/abnormal|not-normal|inadequate|unstable/i.test(text(f.status||f.normality||f.classification))).sort((a,b)=>ts(a.recordedAt)-ts(b.recordedAt))[0];
    const firstTreatment=arr(record.treatments).slice().sort((a,b)=>ts(a.recordedAt||a.time)-ts(b.recordedAt||b.time))[0];
    if(firstAbnormal&&firstTreatment){ const delay=Math.max(0,(ts(firstTreatment.recordedAt||firstTreatment.time)-ts(firstAbnormal.recordedAt))/1000); if(delay<=expected.maxTreatmentDelay) strengths.push(`Treatment began ${fmt(Math.round(delay))} after the first abnormal finding.`); else opportunities.push(`Treatment was delayed ${fmt(Math.round(delay))} after the first abnormal finding.`); }
    if(arr(record.treatments).length && !phaseApi.hasReassessmentAfterTreatment(record)) opportunities.push('The patient was not formally reassessed after treatment.');
    if(phaseApi.hasReassessmentAfterTreatment(record)) strengths.push('A formal reassessment was recorded after treatment.');
    const notIndicated=Object.keys(record.findings||{}).filter(k=>classification(record,k)==='not-indicated');
    if(notIndicated.length) selection.push(`Potentially unnecessary assessments: ${notIndicated.map(label).join(', ')}.`); else selection.push('No clearly non-indicated assessments were recorded.');
    const duplicateKeys={}; arr(record.careLog).filter(e=>e.type==='finding').forEach(e=>{duplicateKeys[e.key]=(duplicateKeys[e.key]||0)+1});
    const duplicates=Object.entries(duplicateKeys).filter(([,n])=>n>2).map(([k])=>label(k));
    if(duplicates.length) selection.push(`Repeated frequently: ${duplicates.join(', ')}. Confirm that each repeat changed care or represented reassessment.`);
    const destination=text(record.documentation?.destination); const priority=text(record.documentation?.transportPriority||record.impressions?.action);
    if(destination===expected.destination) handoff.push(`Destination selection matched the scenario need: ${destination}.`); else if(destination) handoff.push(`Review destination choice: ${destination}. Expected best option: ${expected.destination}.`); else handoff.push('No destination was selected.');
    if(priority) handoff.push(`Transport priority recorded: ${priority}.`); else handoff.push('Transport priority was not recorded.');
    const report=text(record.documentation?.handoff); if(report){
      const missing=[]; if(!/treat|oxygen|glucose|albuterol|intervention|care/i.test(report)&&arr(record.treatments).length) missing.push('treatments'); if(!/vital|bp|pulse|spo|resp/i.test(report)) missing.push('vital signs'); if(!/response|reassess|improv|unchanged|worsen/i.test(report)&&arr(record.reassessments).length) missing.push('patient response');
      missing.length?handoff.push(`Handoff may be missing: ${missing.join(', ')}.`):handoff.push('Handoff includes the major clinical story elements.');
    } else handoff.push('No verbal handoff was saved.');
    evaluation.missing.forEach(item=>opportunities.push(`Missing before scenario end: ${item}.`));
    const avg=Math.round(ratings.reduce((n,r)=>n+r.score,0)/Math.max(1,ratings.length));
    return {evaluation,ratings,strengths:[...new Set(strengths)],opportunities:[...new Set(opportunities)],selection:[...new Set(selection)],handoff:[...new Set(handoff)],score:avg,label:statusRating(avg)};
  }

  function renderList(id,items,type){ $(id).innerHTML=items.length?items.map(x=>`<div class="feedback-item ${type}">${esc(x)}</div>`).join(''):`<div class="feedback-item neutral">No items recorded.</div>`; }
  function renderTimeline(record){
    const events=arr(record.careLog).slice().sort((a,b)=>(ts(a.recordedAt)-ts(b.recordedAt))||((a.sequence||0)-(b.sequence||0)));
    const end=Math.max(Date.now(),newestTime(events)); $('timelineDuration').textContent=`Call time ${fmt(elapsed(record,end))}`;
    $('careTimeline').innerHTML=events.length?events.map(e=>`<article class="timeline-item ${esc(e.type||'event')}"><time>${fmt(elapsed(record,e.recordedAt))}</time><div><h3>${esc(e.label||label(e.key||e.type))}</h3><p>${esc(e.value||e.details||'Recorded')}</p>${e.details&&e.details!==e.value?`<small>${esc(e.details)}</small>`:''}</div></article>`).join(''):'<p>No care events were recorded.</p>';
  }
  function render(record){
    const g=grade(record); $('patientTitle').textContent=record.title||'Patient scenario'; $('patientSummary').textContent=[record.patient,record.dispatch,record.scene].filter(Boolean).join(' • ');
    $('overallScore').textContent=`${g.score}%`; $('overallLabel').textContent=g.label; $('overallSummary').textContent=g.opportunities.length?`The call contained ${g.strengths.length} documented strengths and ${g.opportunities.length} coaching points.`:'All essential phases were addressed.';
    $('phaseRatings').innerHTML=g.ratings.map(r=>`<article class="phase-rating"><div><strong>${esc(r.label)}</strong><small>${esc(r.detail)}</small></div><span class="rating ${r.rating.toLowerCase().replace(/\s+/g,'-')}">${esc(r.rating)}</span></article>`).join('');
    renderTimeline(record); renderList('strengthList',g.strengths,'good'); renderList('opportunityList',g.opportunities,'review'); renderList('selectionReview',g.selection,'neutral'); renderList('handoffReview',g.handoff,'neutral');
    return g;
  }
  function reflectionKey(r){return `emscodesim_debrief_reflection_${r.id}`}
  function loadReflection(r){try{const x=JSON.parse(localStorage.getItem(reflectionKey(r))||'{}');$('reflectionFinding').value=x.finding||'';$('reflectionChange').value=x.change||'';$('reflectionReassess').value=x.reassess||'';}catch{}}
  function saveReflection(r,g){ const savedAt=new Date().toISOString(); const reflection={finding:$('reflectionFinding').value.trim(),change:$('reflectionChange').value.trim(),reassess:$('reflectionReassess').value.trim(),savedAt}; localStorage.setItem(reflectionKey(r),JSON.stringify(reflection)); api.update(x=>{x.debrief={...(x.debrief||{}),reflection,score:g.score,label:g.label};x.documentation={...(x.documentation||{}),debrief:{savedAt,score:g.score,label:g.label,reflection}};return x}); const stateKey=`emscodesim_scenario_${r.scenarioId||r.id}`; let state={};try{state=JSON.parse(localStorage.getItem(stateKey)||'{}')}catch{} state.complete=true;state.completedAt=savedAt;localStorage.setItem(stateKey,JSON.stringify(state));$('reflectionStatus').textContent='Reflection saved. Scenario marked complete.'; }
  function download(r,g){ const blob=new Blob([JSON.stringify({generatedAt:new Date().toISOString(),grade:g,record:r},null,2)],{type:'application/json'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`EMSCodeSim-${r.id}-full-call-debrief.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500); }
  function init(){ const r=record(); $('emptyState').hidden=!!r; $('reportContent').hidden=!r; if(!r)return; const g=render(r);loadReflection(r);$('returnToPatient').onclick=()=>location.href=`/vitals/visual-patient.html?case=${encodeURIComponent(r.scenarioId||r.id)}`;$('printReport').onclick=()=>print();$('downloadReport').onclick=()=>download(r,g);$('saveReflection').onclick=()=>saveReflection(r,g); }
  document.addEventListener('DOMContentLoaded',init);
})();
