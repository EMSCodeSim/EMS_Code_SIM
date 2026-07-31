(()=>{
  'use strict';
  const params=new URLSearchParams(location.search);
  if(params.get('mode')!=='scenario')return;
  const api=window.EMSCodeSimPatientRecord;
  const record=api?.active?.();
  if(!record)return;
  const practice=document.getElementById('practicePanel');
  if(!practice)return;
  document.body.classList.add('scenario-connected-mode');
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const findings=record.findings||{};
  const entries=Object.entries(findings);
  const aliases={
    airway:['airway','airway_assessment'],breathing:['breathing','breathing_assessment','breathing_quality'],
    pulse:['pulse'],bp:['blood_pressure','blood pressure'],rr:['respirations','respiratory_rate'],spo2:['spo2','oxygen saturation'],
    history:['sample','sample_history','opqrst'],impression:['clinical_impression','impression']
  };
  const find=(names)=>{for(const name of names){if(findings[name])return findings[name]}return null};
  const value=f=>f?.value||f?.finding||f?.details||'';
  const abnormal=f=>f&&(f.status==='abnormal'||f.status==='not-normal'||f.normality==='not-normal'||f.expectedClassification==='not-normal');
  const label=(key,f)=>f.shortLabel||f.label||key.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
  const summary=entries.map(([key,f])=>`${label(key,f)}: ${value(f)}`).filter(Boolean);
  const historyValues=Object.entries(record.history||{}).map(([k,v])=>`${k.replaceAll('_',' ')}: ${typeof v==='string'?v:JSON.stringify(v)}`);
  const treatmentValues=(record.treatments||[]).map(t=>t.label||t.treatment||t.name||t.action||'Treatment recorded');
  const reassessmentValues=(record.reassessments||[]).map(r=>r.summary||r.value||r.finding||'Reassessment recorded');
  const readiness=[
    ['Primary assessment',!!(find(aliases.airway)&&find(aliases.breathing)),'Airway and breathing'],
    ['Baseline vitals',!!(find(aliases.pulse)&&find(aliases.bp)&&find(aliases.rr)),'Pulse, BP, and respirations'],
    ['History',historyValues.length>0||!!find(aliases.history),'SAMPLE or relevant history'],
    ['Clinical impression',!!record.impressions?.primary||!!find(aliases.impression),'Working impression']
  ];
  const patientIntro=[record.patient,record.dispatch].filter(Boolean).join('. ');
  const keyAbnormal=entries.filter(([,f])=>abnormal(f)).map(([k,f])=>`${label(k,f)} ${value(f)}`);
  const mist={
    mechanism:record.dispatch||record.goal||'Reason for EMS response not documented',
    illness:[record.patient,record.impressions?.primary?`Working impression: ${record.impressions.primary}`:''].filter(Boolean).join('. '),
    signs:keyAbnormal.length?keyAbnormal.join('; '):(summary.length?summary.join('; '):'Assessment findings not documented'),
    treatment:treatmentValues.length?treatmentValues.join('; '):'No treatment documented',
    response:reassessmentValues.length?reassessmentValues.join('; '):'No reassessment documented'
  };
  const defaultHandoff=`${patientIntro}${patientIntro?'. ':''}${mist.illness}${mist.illness?'. ':''}Key findings: ${mist.signs}. Treatment: ${mist.treatment}. Response: ${mist.response}.`.replace(/\s+/g,' ').trim();
  const defaultNarrative=[
    record.dispatch&&`Dispatched for ${record.dispatch}.`,
    record.scene&&`Scene: ${record.scene}.`,
    record.patient&&`${record.patient}.`,
    historyValues.length&&`History obtained: ${historyValues.join('; ')}.`,
    summary.length&&`Assessment findings: ${summary.join('; ')}.`,
    record.impressions?.primary&&`Working impression: ${record.impressions.primary}.`,
    treatmentValues.length&&`Treatment provided: ${treatmentValues.join('; ')}.`,
    reassessmentValues.length&&`Reassessment: ${reassessmentValues.join('; ')}.`
  ].filter(Boolean).join(' ');
  practice.innerHTML=`<div class="connected-report">
    <section class="report-mode-banner"><div><p class="eyebrow">Active patient report</p><h2>${esc(record.title||'Patient handoff')}</h2><p>Build the report only from findings already collected in this scenario.</p></div><a href="/vitals/assessment-workspace.html?resume=1">Return to assessment</a></section>
    <section class="readiness-grid">${readiness.map(([name,ok,detail])=>`<article class="readiness-item ${ok?'is-complete':'is-missing'}"><strong>${ok?'✓':'!'} ${esc(name)}</strong><span>${esc(detail)}</span></article>`).join('')}</section>
    <p id="missingAlert" class="missing-alert ${readiness.every(x=>x[1])?'is-ready':''}">${readiness.every(x=>x[1])?'Core report elements are present. Review wording before saving.':`${readiness.filter(x=>!x[1]).length} core report area${readiness.filter(x=>!x[1]).length===1?' is':'s are'} incomplete. You may continue, but identify unknown information rather than guessing.`}</p>
    <div class="connected-grid">
      <section class="connected-card"><p class="eyebrow">Source of truth</p><h3>Collected patient information</h3><div class="source-list">${entries.length?entries.map(([k,f])=>`<div class="source-item"><strong>${esc(label(k,f))}</strong><span>${esc(value(f)||'Recorded')}</span><em class="${abnormal(f)?'abnormal':''}">${abnormal(f)?'Not normal':'Normal'}</em></div>`).join(''):'<p>No findings have been reported yet.</p>'}</div></section>
      <section class="connected-card"><p class="eyebrow">MIST structure</p><h3>Organize the verbal report</h3>
        <div class="report-section"><label for="mistMechanism">M — Mechanism / medical complaint</label><textarea id="mistMechanism" rows="2">${esc(mist.mechanism)}</textarea></div>
        <div class="report-section"><label for="mistIllness">I — Illness / injury and impression</label><textarea id="mistIllness" rows="2">${esc(mist.illness)}</textarea></div>
        <div class="report-section"><label for="mistSigns">S — Signs and vital findings</label><textarea id="mistSigns" rows="4">${esc(mist.signs)}</textarea></div>
        <div class="report-section"><label for="mistTreatment">T — Treatment and response</label><textarea id="mistTreatment" rows="3">${esc(`${mist.treatment}. ${mist.response}`)}</textarea></div>
      </section>
    </div>
    <section class="connected-card"><p class="eyebrow">PCR-ready documentation</p><h3>Objective patient narrative</h3><textarea id="connectedNarrative" rows="9">${esc(record.documentation?.narrative||defaultNarrative)}</textarea><p class="word-count"><span id="narrativeWords">0</span> words</p></section>
    <section class="connected-card"><p class="eyebrow">Verbal practice</p><h3>Hospital or radio handoff</h3><textarea id="connectedHandoff" rows="7">${esc(record.documentation?.handoff||defaultHandoff)}</textarea><p class="word-count"><span id="handoffWords">0</span> words</p>
      <div class="handoff-controls"><button id="buildFromMist" class="secondary" type="button">Build from MIST</button><button id="timerButton" class="secondary" type="button">Start 60-second practice</button><strong id="handoffTimer" class="handoff-timer">1:00</strong><button id="saveConnectedReport" class="primary" type="button">Save report to patient</button></div>
      <div id="qualityList" class="quality-list"></div><p id="connectedSaveStatus" class="save-status" aria-live="polite"></p>
    </section>
  </div>`;
  const $=id=>document.getElementById(id);
  const count=(id,out)=>{const text=$(id).value.trim();$(out).textContent=text?text.split(/\s+/).length:0};
  const quality=()=>{
    const handoff=$('connectedHandoff').value.trim();
    const words=handoff?handoff.split(/\s+/).length:0;
    const checks=[
      [words>=30&&words<=100,'Handoff is within the 30–100 word practice range.','Aim for 30–100 focused words.'],
      [/pulse|heart rate|bp|blood pressure|respir|spo|oxygen/i.test(handoff),'Includes important vital-sign information.','Add the most important vital-sign findings.'],
      [/treat|oxygen|medication|splint|bandage|reassess|response|no treatment/i.test(handoff),'Addresses treatment and response.','State treatment and patient response, or clearly say none was provided.'],
      [!/(confirmed stroke|definitely septic|diagnosed with|certainly)/i.test(handoff),'Uses appropriately qualified EMT-level language.','Avoid presenting an unconfirmed diagnosis as certain.']
    ];
    $('qualityList').innerHTML=checks.map(([pass,good,bad])=>`<div class="quality-item ${pass?'pass':'warn'}"><strong>${pass?'✓':'!'}</strong><span>${esc(pass?good:bad)}</span></div>`).join('');
  };
  const build=()=>{
    $('connectedHandoff').value=[
      $('mistMechanism').value.trim(),$('mistIllness').value.trim(),
      `Findings: ${$('mistSigns').value.trim()}.`,
      `Treatment and response: ${$('mistTreatment').value.trim()}.`
    ].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
    count('connectedHandoff','handoffWords');quality();
  };
  ['connectedNarrative','connectedHandoff'].forEach(id=>$(id).addEventListener('input',()=>{count(id,id==='connectedNarrative'?'narrativeWords':'handoffWords');if(id==='connectedHandoff')quality()}));
  $('buildFromMist').addEventListener('click',build);
  let remaining=60,timer=null;
  const renderTimer=()=>{$('handoffTimer').textContent=`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`};
  $('timerButton').addEventListener('click',()=>{
    if(timer){clearInterval(timer);timer=null;$('timerButton').textContent='Start 60-second practice';$('handoffTimer').classList.remove('is-running');return}
    remaining=60;renderTimer();$('handoffTimer').classList.add('is-running');$('timerButton').textContent='Stop timer';
    timer=setInterval(()=>{remaining--;renderTimer();if(remaining<=0){clearInterval(timer);timer=null;$('timerButton').textContent='Restart 60-second practice';$('handoffTimer').classList.remove('is-running')}},1000);
  });
  $('saveConnectedReport').addEventListener('click',()=>{
    const narrative=$('connectedNarrative').value.trim(),handoff=$('connectedHandoff').value.trim();
    api.setDocumentation({narrative,handoff,reportUpdatedAt:new Date().toISOString()});
    api.setFinding('pcr_handoff','Report prepared',{label:'PCR and handoff',shortLabel:'Report',status:'normal',normality:'normal',source:'connected-pcr-handoff',reportFormat:'PCR and handoff prepared'});
    $('connectedSaveStatus').textContent='Report saved to the active patient record.';
    quality();
  });
  count('connectedNarrative','narrativeWords');count('connectedHandoff','handoffWords');quality();
})();
