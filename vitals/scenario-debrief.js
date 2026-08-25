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
    asthma:{
      critical:['airway','breathing','perfusion','respirations','breath_sounds','spo2'],
      maxTreatmentDelay:180,
      destination:'Closest appropriate emergency department',
      whyItMatters:[
        'Asthma can look stable until fatigue hides a failing airway—reassess work of breathing and air movement after every intervention.',
        'Bronchodilator and oxygen decisions should follow discovered breathing findings, not dispatch alone.',
        'Quiet lungs after loud wheezing can mean less air movement, not improvement.'
      ]
    },
    stroke:{
      critical:['airway','breathing','perfusion','mental_status','motor_sensory','blood_glucose','blood_pressure'],
      maxTreatmentDelay:240,
      destination:'Stroke-capable center',
      whyItMatters:[
        'Last known well drives hospital routing and therapy windows—capture it early and protect it in your handoff.',
        'Glucose excludes a common stroke mimic before you settle on destination.',
        'Scene delays for nonessential assessments cost brain; prioritize airway protection and rapid transport.'
      ]
    },
    hypoglycemia:{
      critical:['airway','breathing','perfusion','mental_status','blood_glucose'],
      maxTreatmentDelay:180,
      destination:'Closest appropriate emergency department',
      whyItMatters:[
        'Altered mental status is a symptom set—glucose is a reversible cause you must rule in or out.',
        'Oral glucose is only safe when the patient can protect the airway and swallow.',
        'If the patient cannot take oral sugar safely, escalate airway support and ALS / transport without delay.'
      ]
    },
    trauma:{
      critical:['airway','breathing','perfusion','blood_pressure','pulse','chest_assessment','trauma_assessment'],
      maxTreatmentDelay:180,
      destination:'Trauma center',
      whyItMatters:[
        'Bleeding and airway threats kill before detailed secondary surveys—sequence ABCs and hemorrhage control first.',
        'Serial vitals detect compensated shock becoming decompensated.',
        'Destination and scene time matter as much as individual treatments in blunt trauma.'
      ]
    },
    pediatric:{
      critical:['pediatric_assessment_triangle','airway','breathing','perfusion','respirations','spo2'],
      maxTreatmentDelay:180,
      destination:'Pediatric-capable emergency department',
      whyItMatters:[
        'The pediatric assessment triangle gives an immediate first look before you touch equipment.',
        'Kids compensate until they crash—track work of breathing and interaction, not SpO₂ alone.',
        'Keep the caregiver close when it reduces distress without compromising ABCs.'
      ]
    }
  };

  function record(){ return api?.active?.() || null; }
  function elapsed(record, when){ return Math.max(0, Math.round((ts(when)-ts(record.startedAt))/1000)); }
  function statusRating(score){ return score>=90?'Strong':score>=75?'Appropriate':score>=60?'Developing':'Needs improvement'; }
  function classification(record,key){ return phaseApi?.classification?.(record.scenarioId||record.id,key) || 'optional'; }
  function has(record,key){ return Boolean(record.findings?.[key]); }
  function newestTime(items){ return items.length ? Math.max(...items.map(x=>ts(x.recordedAt||x.time))) : 0; }
  function firstTime(items){ return items.length ? Math.min(...items.map(x=>ts(x.recordedAt||x.time))) : 0; }

  function accuracyIssue(record, key){
    const finding=record?.findings?.[key];
    if(!finding) return null;
    if(finding.accurate===false || finding.correct===false){
      return {key,label:label(key),learner:text(finding.learnerFinding||finding.value||finding.selected),expected:text(finding.expectedFinding||finding.expected||finding.expectedNormality),critical:['airway','breathing','perfusion','mental_status'].includes(key)};
    }
    return null;
  }
  function criticalErrors(record, expected){
    const issues=[];
    expected.critical.forEach(key=>{const issue=accuracyIssue(record,key);if(issue)issues.push(`${issue.label}: learner recorded “${issue.learner||'incorrect finding'}”${issue.expected?`; expected “${issue.expected}”`:''}.`)});
    arr(record.treatments).forEach(item=>{
      const cls=text(item.classification).toLowerCase();
      if(['contraindicated','unsafe'].includes(cls)) issues.push(`${text(item.name||item.treatment||'Treatment')} was recorded as ${cls}.`);
      if(cls==='premature') issues.push(`${text(item.name||item.treatment||'Treatment')} was performed before the required assessment was complete.`);
    });
    const rapid=['airway','breathing','perfusion'].map(key=>accuracyIssue(record,key)).filter(Boolean);
    rapid.forEach(issue=>{if(!issues.some(x=>x.startsWith(`${issue.label}:`)))issues.push(`${issue.label} was classified incorrectly during the rapid primary assessment.`)});
    return [...new Set(issues)];
  }
  function coachingPriorities(evaluation, critical, opportunities){
    const priorities=[];
    critical.slice(0,2).forEach(x=>priorities.push({level:'critical',title:'Correct a critical decision',detail:x}));
    evaluation.missing.slice(0,3-priorities.length).forEach(x=>priorities.push({level:'priority',title:`Complete ${x}`,detail:'This item was required before ending the patient-care cycle.'}));
    opportunities.filter(x=>!priorities.some(p=>p.detail===x)).slice(0,3-priorities.length).forEach(x=>priorities.push({level:'coach',title:'Improve clinical sequencing',detail:x}));
    if(!priorities.length) priorities.push({level:'success',title:'Repeat with less guidance',detail:'All essential phases were completed without a documented critical error.'});
    return priorities.slice(0,3);
  }
  function categoryScore(ratings,id){return ratings.find(x=>x.id===id)?.score||0;}
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
    const critical=criticalErrors(record,expected);
    const clinical=Math.round((categoryScore(ratings,'primary')+categoryScore(ratings,'focused')+categoryScore(ratings,'vitals'))/3);
    const treatment=Math.round((categoryScore(ratings,'treatment')+categoryScore(ratings,'reassessment'))/2);
    const communication=Math.round((categoryScore(ratings,'impression')+categoryScore(ratings,'handoff'))/2);
    let avg=Math.round(clinical*.45+treatment*.35+communication*.20);
    avg=Math.max(0,avg-critical.length*8);
    const uniqueOpportunities=[...new Set(opportunities)];
    const priorities=coachingPriorities(evaluation,critical,uniqueOpportunities);
    const whyItMatters=arr(expected.whyItMatters);
    return {evaluation,ratings,strengths:[...new Set(strengths)],opportunities:uniqueOpportunities,selection:[...new Set(selection)],handoff:[...new Set(handoff)],critical,priorities,whyItMatters,categoryScores:{clinical,treatment,communication},score:avg,label:statusRating(avg)};
  }

  function renderList(id,items,type){ $(id).innerHTML=items.length?items.map(x=>`<div class="feedback-item ${type}">${esc(x)}</div>`).join(''):`<div class="feedback-item neutral">No items recorded.</div>`; }
  function renderTimeline(record){
    const events=arr(record.careLog).slice().sort((a,b)=>(ts(a.recordedAt)-ts(b.recordedAt))||((a.sequence||0)-(b.sequence||0)));
    const end=Math.max(Date.now(),newestTime(events)); $('timelineDuration').textContent=`Call time ${fmt(elapsed(record,end))}`;
    $('careTimeline').innerHTML=events.length?events.map(e=>`<article class="timeline-item ${esc(e.type||'event')}"><time>${fmt(elapsed(record,e.recordedAt))}</time><div><h3>${esc(e.label||label(e.key||e.type))}</h3><p>${esc(e.value||e.details||'Recorded')}</p>${e.details&&e.details!==e.value?`<small>${esc(e.details)}</small>`:''}</div></article>`).join(''):'<p>No care events were recorded.</p>';
  }
  function renderCritical(items){
    const section=$('criticalSection');
    section.hidden=!items.length;
    $('criticalList').innerHTML=items.map(x=>`<div class="critical-item"><strong>Critical review</strong><p>${esc(x)}</p></div>`).join('');
  }
  function renderPriorities(items){
    $('priorityList').innerHTML=items.map((x,i)=>`<article class="priority-card ${esc(x.level)}"><span>${i+1}</span><div><h3>${esc(x.title)}</h3><p>${esc(x.detail)}</p></div></article>`).join('');
  }
  function renderCategoryScores(scores){
    $('categoryScores').innerHTML=[['Clinical assessment',scores.clinical],['Treatment & reassessment',scores.treatment],['Transport & communication',scores.communication]].map(([name,score])=>`<article><span>${esc(name)}</span><strong>${score}%</strong><div class="score-bar"><i style="width:${Math.max(0,Math.min(100,score))}%"></i></div></article>`).join('');
  }
  function render(record){
    const g=grade(record); $('patientTitle').textContent=record.title||'Patient scenario'; $('patientSummary').textContent=[record.patient,record.dispatch,record.scene].filter(Boolean).join(' • ');
    $('overallScore').textContent=`${g.score}%`; $('overallLabel').textContent=g.label; renderCategoryScores(g.categoryScores); renderCritical(g.critical); renderPriorities(g.priorities); $('overallSummary').textContent=g.opportunities.length?`The call contained ${g.strengths.length} documented strengths and ${g.opportunities.length} coaching points.`:'All essential phases were addressed.';
    const whySection=$('whyItMattersSection');
    if(whySection){
      whySection.hidden=!g.whyItMatters.length;
      if(g.whyItMatters.length) renderList('whyItMattersList',g.whyItMatters,'neutral');
    }
    $('phaseRatings').innerHTML=g.ratings.map(r=>`<article class="phase-rating"><div><strong>${esc(r.label)}</strong><small>${esc(r.detail)}</small></div><span class="rating ${r.rating.toLowerCase().replace(/\s+/g,'-')}">${esc(r.rating)}</span></article>`).join('');
    renderTimeline(record); renderList('strengthList',g.strengths,'good'); renderList('opportunityList',g.opportunities,'review'); renderList('selectionReview',g.selection,'neutral'); renderList('handoffReview',g.handoff,'neutral');
    return g;
  }
  function reflectionKey(r){return `emscodesim_debrief_reflection_${r.id}`}
  function loadReflection(r){try{const x=JSON.parse(localStorage.getItem(reflectionKey(r))||'{}');$('reflectionFinding').value=x.finding||'';$('reflectionChange').value=x.change||'';$('reflectionReassess').value=x.reassess||'';}catch{}}
  function saveReflection(r,g){ const savedAt=new Date().toISOString(); const reflection={finding:$('reflectionFinding').value.trim(),change:$('reflectionChange').value.trim(),reassess:$('reflectionReassess').value.trim(),savedAt}; localStorage.setItem(reflectionKey(r),JSON.stringify(reflection)); api.update(x=>{x.debrief={...(x.debrief||{}),reflection,score:g.score,label:g.label};x.documentation={...(x.documentation||{}),debrief:{savedAt,score:g.score,label:g.label,reflection}};return x}); const stateKey=`emscodesim_scenario_${r.scenarioId||r.id}`; let state={};try{state=JSON.parse(localStorage.getItem(stateKey)||'{}')}catch{} state.complete=true;state.completedAt=savedAt;localStorage.setItem(stateKey,JSON.stringify(state));$('reflectionStatus').textContent='Reflection saved. Scenario marked complete.'; }
  function download(r,g){ const blob=new Blob([JSON.stringify({generatedAt:new Date().toISOString(),grade:g,record:r},null,2)],{type:'application/json'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`EMSCodeSim-${r.id}-full-call-debrief.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500); }
  function init(){ const r=record(); $('emptyState').hidden=!!r; $('reportContent').hidden=!r; if(!r)return; const g=render(r);loadReflection(r);$('returnToPatient').onclick=()=>location.href=`/vitals/visual-patient.html?case=${encodeURIComponent(r.scenarioId||r.id)}`;$('printReport').onclick=()=>print();$('downloadReport').onclick=()=>download(r,g);$('saveReflection').onclick=()=>saveReflection(r,g); }
  window.EMSCodeSimDebriefEngine={grade};
  document.addEventListener('DOMContentLoaded',init);
})();
