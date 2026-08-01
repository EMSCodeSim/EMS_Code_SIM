(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const activeRecord = () => window.EMSCodeSimPatientRecord?.active?.() || null;
  const text = value => String(value ?? '').trim();
  const safeArray = value => Array.isArray(value) ? value : value ? [value] : [];
  const escapeHtml = value => text(value).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const titleCase = value => text(value).replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());

  function scorePair(score, max) {
    const s = Number(score); const m = Number(max);
    return Number.isFinite(s) && Number.isFinite(m) && m > 0 ? {score:s,max:m,percent:Math.round((s/m)*100)} : null;
  }

  function findingScores(record) {
    const pairs = Object.values(record.findings || {}).map(f => scorePair(f.score, f.maxScore)).filter(Boolean);
    if (!pairs.length) return null;
    const total = pairs.reduce((n,p)=>n+p.score,0);
    const max = pairs.reduce((n,p)=>n+p.max,0);
    return scorePair(total,max);
  }

  function treatmentScores(record) {
    const pairs = [...safeArray(record.treatments), ...safeArray(record.reassessments)]
      .map(v => scorePair(v.score, v.maxScore)).filter(Boolean);
    if (!pairs.length) return null;
    return scorePair(pairs.reduce((n,p)=>n+p.score,0),pairs.reduce((n,p)=>n+p.max,0));
  }

  function showScore(id, pair) { $(id).textContent = pair ? `${pair.percent}%` : '—'; }

  function normalizeFinding(key, item) {
    const value = item && typeof item === 'object' ? item : {value:item};
    const classification = text(value.classification || value.normality || value.status || value.selectedNormality);
    const isAbnormal = /not normal|abnormal|concerning|inadequate|unstable/i.test(classification);
    return {
      key,
      label: titleCase(value.label || key),
      value: text(value.value || value.finding || value.observation || 'Recorded'),
      classification: classification || 'Not classified',
      interpretation: text(value.interpretation || value.problem || value.pattern || ''),
      documentation: text(value.documentation || value.pcr || ''),
      isAbnormal,
      score: scorePair(value.score,value.maxScore)
    };
  }

  function renderFindings(record) {
    const findings = Object.entries(record.findings || {}).map(([key,item])=>normalizeFinding(key,item));
    $('findingCount').textContent = `${findings.length} finding${findings.length===1?'':'s'}`;
    $('findingsGrid').innerHTML = findings.length ? findings.map(f => `
      <article class="finding-card ${f.isAbnormal?'not-normal':'normal'}">
        <h3>${escapeHtml(f.label)}</h3>
        <span class="status-badge">${escapeHtml(f.classification)}</span>
        <p><strong>Finding:</strong> ${escapeHtml(f.value)}</p>
        ${f.interpretation?`<p><strong>Interpretation:</strong> ${escapeHtml(f.interpretation)}</p>`:''}
        ${f.score?`<p><strong>Score:</strong> ${f.score.score}/${f.score.max}</p>`:''}
      </article>`).join('') : '<p>No mini-simulator findings have been saved yet.</p>';
    return findings;
  }

  function addDetail(label,value) {
    if (!text(value)) return '';
    const display = Array.isArray(value) ? value.join(', ') : value;
    return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(display)}</dd></div>`;
  }

  function renderImpression(record) {
    const i = record.impressions || {};
    $('impressionDetails').innerHTML = [
      addDetail('Primary impression',i.primary),
      addDetail('Differential diagnoses',safeArray(i.differentials)),
      addDetail('Supporting findings',safeArray(i.supporting)),
      addDetail('Immediate priority',i.action),
      addDetail('Reasoning documentation',i.documentation)
    ].join('') || '<p>No clinical impression has been saved.</p>';
  }

  function renderCoaching(record, findings) {
    const items=[];
    if (findings.length >= 4) items.push(['good','You collected findings from multiple assessment areas.']);
    else items.push(['review','Collect at least four relevant findings before forming the final impression.']);
    const unclassified=findings.filter(f=>f.classification==='Not classified').length;
    if (!unclassified && findings.length) items.push(['good','Every recorded finding was classified as normal or not normal.']);
    else if (unclassified) items.push(['review',`${unclassified} finding${unclassified===1?' was':'s were'} not classified.`]);
    if (text(record.impressions?.primary)) items.push(['good','A working clinical impression was documented.']);
    else items.push(['review','Add a working clinical impression based on the full pattern of findings.']);
    if (safeArray(record.reassessments).length) items.push(['good','The patient was reassessed after treatment.']);
    else items.push(['review','Record repeat findings after intervention or during transport.']);
    if (text(record.documentation?.narrative) && text(record.documentation?.handoff)) items.push(['good','Both a PCR narrative and verbal handoff were completed.']);
    else items.push(['review','Complete both the PCR narrative and verbal handoff.']);
    $('coachingList').innerHTML=items.map(([type,msg])=>`<div class="coaching-item ${type}">${escapeHtml(msg)}</div>`).join('');
  }

  function renderTimeline(record) {
    const events=[];
    safeArray(record.treatments).forEach((t,i)=>events.push({title:`Treatment ${i+1}`,body:[t.treatment,t.expectedResponse&&`Expected response: ${t.expectedResponse}`,t.scenario].filter(Boolean)}));
    safeArray(record.reassessments).forEach((r,i)=>events.push({title:`Reassessment ${i+1}`,body:[r.response,r.nextAction&&`Next action: ${r.nextAction}`,...safeArray(r.findings)].filter(Boolean)}));
    $('careTimeline').innerHTML=events.length?events.map(e=>`<article class="timeline-item"><h3>${escapeHtml(e.title)}</h3>${e.body.map(v=>`<p>${escapeHtml(v)}</p>`).join('')}</article>`).join(''):'<p>No treatment or reassessment entries have been saved.</p>';
  }

  function renderDocuments(record) {
    const narrative=text(record.documentation?.narrative);
    const handoff=text(record.documentation?.handoff);
    $('narrativeText').textContent=narrative||'No PCR narrative has been saved.';
    $('handoffText').textContent=handoff||'No verbal handoff has been saved.';
    $('narrativeText').classList.toggle('empty',!narrative);
    $('handoffText').classList.toggle('empty',!handoff);
  }

  function renderScores(record) {
    const assessment=findingScores(record);
    const impression=scorePair(record.impressions?.score,record.impressions?.maxScore);
    const treatment=treatmentScores(record);
    const documentation=scorePair(record.documentation?.documentationScore,record.documentation?.documentationMaxScore);
    showScore('assessmentScore',assessment);showScore('impressionScore',impression);showScore('treatmentScore',treatment);showScore('documentationScore',documentation);
    const pairs=[assessment,impression,treatment,documentation].filter(Boolean);
    const overall=pairs.length?scorePair(pairs.reduce((n,p)=>n+p.score,0),pairs.reduce((n,p)=>n+p.max,0)):null;
    $('overallScore').textContent=overall?`${overall.percent}%`:'—';
    $('overallLabel').textContent=!overall?'Complete scored activities':overall.percent>=90?'Excellent':overall.percent>=80?'Strong performance':overall.percent>=70?'Developing':'Needs review';
  }


  const HISTORY_KEY='emscodesim_scenario_history_v1';
  function readHistory(){try{const value=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');return Array.isArray(value)?value:[]}catch{return[]}}
  function saveHistorySnapshot(record, findings){
    const assessment=findingScores(record);
    const impression=scorePair(record.impressions?.score,record.impressions?.maxScore);
    const treatment=treatmentScores(record);
    const documentation=scorePair(record.documentation?.documentationScore,record.documentation?.documentationMaxScore);
    const pairs=[assessment,impression,treatment,documentation].filter(Boolean);
    const overall=pairs.length?scorePair(pairs.reduce((n,p)=>n+p.score,0),pairs.reduce((n,p)=>n+p.max,0)):null;
    const reviewAreas=[];
    if(findings.length<4)reviewAreas.push('assessment');
    if(findings.some(f=>f.classification==='Not classified'))reviewAreas.push('classification');
    if(!text(record.impressions?.primary))reviewAreas.push('impression');
    if(!safeArray(record.reassessments).length)reviewAreas.push('reassessment');
    if(!text(record.documentation?.narrative)||!text(record.documentation?.handoff))reviewAreas.push('documentation');
    const snapshot={id:String(record.id||Date.now()),title:record.title||'Patient scenario',completedAt:new Date().toISOString(),overallPercent:overall?.percent??null,findingCount:findings.length,abnormalCount:findings.filter(f=>f.isAbnormal).length,reviewAreas:[...new Set(reviewAreas)]};
    const history=readHistory();const index=history.findIndex(item=>item.id===snapshot.id);if(index>=0)history[index]=snapshot;else history.push(snapshot);
    localStorage.setItem(HISTORY_KEY,JSON.stringify(history.slice(-100)));
  }

  function reflectionKey(record){return `emscodesim_debrief_reflection_${record.id}`;}
  function loadReflection(record){
    try{const r=JSON.parse(localStorage.getItem(reflectionKey(record))||'{}');$('reflectionFinding').value=r.finding||'';$('reflectionChange').value=r.change||'';$('reflectionReassess').value=r.reassess||'';}catch{}
  }
  function saveReflection(record){
    const reflection={finding:$('reflectionFinding').value.trim(),change:$('reflectionChange').value.trim(),reassess:$('reflectionReassess').value.trim(),savedAt:new Date().toISOString()};
    localStorage.setItem(reflectionKey(record),JSON.stringify(reflection));
    try{window.EMSCodeSimPatientRecord.update(r=>{r.debrief={...(r.debrief||{}),reflection};return r;});}catch{}
    $('reflectionStatus').textContent='Reflection saved to this patient record.';
    saveHistorySnapshot(record,Object.entries(record.findings||{}).map(([key,item])=>normalizeFinding(key,item)));
  }

  function download(record){
    const reflection=JSON.parse(localStorage.getItem(reflectionKey(record))||'{}');
    const report={generatedAt:new Date().toISOString(),record,reflection};
    const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`EMSCodeSim-${record.id}-debrief.json`;a.click();URL.revokeObjectURL(a.href);
  }

  function init(){
    const record=activeRecord();
    $('emptyState').hidden=!!record;$('reportContent').hidden=!record;
    if(!record)return;
    $('patientTitle').textContent=record.title||'Patient scenario';
    $('patientSummary').textContent=[record.patient,record.dispatch,record.scene].filter(Boolean).join(' • ')||'Active EMSCodeSim patient record';
    const findings=renderFindings(record);renderImpression(record);renderCoaching(record,findings);renderTimeline(record);renderDocuments(record);renderScores(record);loadReflection(record);saveHistorySnapshot(record,findings);
    $('printReport').addEventListener('click',()=>window.print());
    $('downloadReport').addEventListener('click',()=>download(record));
    $('saveReflection').addEventListener('click',()=>saveReflection(record));
  }
  document.addEventListener('DOMContentLoaded',init);
})();
