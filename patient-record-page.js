(()=>{
  'use strict';
  const api=window.EMSCodeSimPatientRecord;
  const $=id=>document.getElementById(id);
  const findingTypes=['Airway','Breathing','Pulse','Blood pressure','Respirations','SpO₂','Skin','Pupils','Blood glucose','Temperature','Mental status','Lung sounds','Pain','Trauma','Chest','Abdomen','Perfusion','Motor/sensory','Pediatric triangle','SAMPLE history','OPQRST','Other'];
  const quick=['Airway','Breathing','Blood pressure','Pulse','Respirations','SpO₂','Blood glucose','Mental status'];
  const groupOrder=['Vitals','Primary assessment','Focused assessment','History and other'];
  const vitalKeys=new Set(['blood_pressure','blood pressure','pulse','respirations','spo2','oxygen saturation','blood_glucose','blood glucose','temperature']);
  const primaryKeys=new Set(['airway','breathing','skin','pupils','mental_status','mental status','breath_sounds','lung sounds','perfusion','pediatric triangle']);
  let activeFilter='all';

  function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}
  function displayLabel(key,finding){return finding.label||finding.shortLabel||String(key).replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
  function findingValue(finding){return finding.reportFormat||`${finding.shortLabel||finding.label||''}${finding.shortLabel||finding.label?': ':''}${finding.value||finding.finding||''}`}
  function isAbnormal(finding){return finding.status==='abnormal'||finding.status==='not-normal'||finding.normality==='not-normal'||finding.expectedClassification==='not-normal'}
  function categoryFor(key){
    const normalized=String(key).toLowerCase();
    if(vitalKeys.has(normalized))return 'Vitals';
    if(primaryKeys.has(normalized))return 'Primary assessment';
    if(/pain|trauma|chest|abdomen|motor|stroke|gcs|clinical/.test(normalized))return 'Focused assessment';
    return 'History and other';
  }
  function formatTime(value){
    if(!value)return '';
    const date=new Date(value);
    return Number.isNaN(date.getTime())?'':date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  }
  function normalizeManualKey(label){return label.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')}
  function showMessage(text){
    const message=$('saveMessage');
    message.textContent=text;
    message.hidden=false;
    clearTimeout(message._timer);
    message._timer=setTimeout(()=>message.hidden=true,2600);
  }
  function copyText(text,success){
    if(!text.trim())return showMessage('No findings have been collected yet.');
    const fallback=()=>{const area=document.createElement('textarea');area.value=text;document.body.append(area);area.select();document.execCommand('copy');area.remove();showMessage(success)};
    navigator.clipboard?.writeText(text).then(()=>showMessage(success)).catch(fallback)||fallback();
  }
  function summaryLines(record){
    return Object.entries(record.findings||{}).map(([key,finding])=>{
      const label=finding.shortLabel||displayLabel(key,finding);
      const value=finding.value||finding.finding||'';
      return `${label}: ${value}${isAbnormal(finding)?' (not normal)':''}`;
    });
  }
  function buildHandoff(record){
    const lines=summaryLines(record);
    const patient=record.patient?`${record.patient}. `:'';
    const impression=record.impressions?.primary?`Working impression: ${record.impressions.primary}. `:'';
    const findings=lines.length?`Findings: ${lines.join('; ')}.`:'No findings recorded yet.';
    return `${patient}${findings} ${impression}`.trim();
  }
  function filterMatch(key,finding){
    if(activeFilter==='all')return true;
    if(activeFilter==='abnormal')return isAbnormal(finding);
    if(activeFilter==='vitals')return categoryFor(key)==='Vitals';
    if(activeFilter==='assessment')return categoryFor(key)!=='Vitals';
    return true;
  }
  function findingCard(key,finding){
    const abnormal=isAbnormal(finding);
    const interpretation=finding.interpretation||finding.note||'';
    const correct=finding.classificationCorrect;
    return `<article class="finding-card ${abnormal?'is-abnormal':'is-normal'}" data-key="${escapeHtml(key)}">
      <div class="finding-card-main">
        <div class="finding-title-row"><strong>${escapeHtml(displayLabel(key,finding))}</strong><span class="finding-status ${abnormal?'status-abnormal':'status-normal'}">${abnormal?'Not normal':'Normal'}</span></div>
        <div class="finding-reading">${escapeHtml(finding.value||finding.finding||'')}</div>
        ${interpretation?`<p>${escapeHtml(interpretation)}</p>`:''}
        <div class="finding-meta"><span>${escapeHtml(formatTime(finding.recordedAt||finding.updatedAt))}</span>${finding.source?`<span>${escapeHtml(String(finding.source).replaceAll('-',' '))}</span>`:''}${typeof correct==='boolean'?`<span>${correct?'Classification correct':'Review classification'}</span>`:''}</div>
      </div>
      <div class="finding-actions"><button type="button" data-action="edit" data-key="${escapeHtml(key)}">Edit</button><button type="button" data-action="remove" data-key="${escapeHtml(key)}">Remove</button></div>
    </article>`;
  }
  function renderFindings(record){
    const entries=Object.entries(record.findings||{});
    $('findingTotal').textContent=String(entries.length);
    $('abnormalTotal').textContent=String(entries.filter(([,finding])=>isAbnormal(finding)).length);
    $('updatedTotal').textContent=String((record.findingHistory||[]).length);
    const grouped=Object.fromEntries(groupOrder.map(group=>[group,[]]));
    entries.filter(([key,finding])=>filterMatch(key,finding)).forEach(([key,finding])=>grouped[categoryFor(key)].push([key,finding]));
    const html=groupOrder.filter(group=>grouped[group].length).map(group=>`<section class="finding-group"><div class="finding-group-heading"><h3>${group}</h3><span>${grouped[group].length}</span></div><div class="finding-card-list">${grouped[group].map(([key,finding])=>findingCard(key,finding)).join('')}</div></section>`).join('');
    $('groupedFindingList').innerHTML=html;
    $('findingEmpty').hidden=Boolean(html);
    $('handoffSummary').textContent=buildHandoff(record);
  }
  function renderTimeline(record){
    const history=(record.findingHistory||[]).map((item,index)=>({item,index})).reverse();
    $('findingTimeline').innerHTML=history.length?history.map(({item,index})=>`<div class="timeline-item"><div><strong>${escapeHtml(displayLabel(item.category,item))}</strong><div>${escapeHtml(item.value||item.finding||'')}</div><small>${item.removed?'Removed':'Replaced'} ${escapeHtml(formatTime(item.replacedAt||item.recordedAt))}</small></div><button type="button" data-restore-index="${index}">Restore</button></div>`).join(''):'<p class="empty-note">No repeat or corrected findings yet.</p>';
  }
  function renderCare(record){
    const care=[...(record.treatments||[]).map(item=>({label:'Treatment',text:item.description||item.treatment||item.value||''})),...(record.reassessments||[]).map(item=>({label:'Reassessment',text:item.description||item.response||item.value||''}))];
    $('careList').innerHTML=care.length?care.map(item=>`<div class="record-item"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.text)}</span></div>`).join(''):'<p class="empty-note">No treatment or reassessment entries yet.</p>';
  }
  function render(){
    const record=api.active();
    $('noRecord').hidden=Boolean(record);
    $('recordContent').hidden=!record;
    if(!record)return;
    $('recordTitle').textContent=record.title;
    $('recordDispatch').textContent=record.dispatch||'No dispatch information saved.';
    $('recordPatient').textContent=record.patient||'Not specified';
    $('recordScene').textContent=record.scene||'Not specified';
    $('recordGoal').textContent=record.goal||'Complete assessment and care';
    $('primaryImpression').value=record.impressions?.primary||'';
    $('alternativeImpression').value=(record.impressions?.differentials||[])[0]||'';
    $('pcrNarrative').value=record.documentation?.narrative||'';
    $('verbalHandoff').value=record.documentation?.handoff||'';
    renderFindings(record);
    renderTimeline(record);
    renderCare(record);
  }
  function resetFindingForm(){
    $('findingForm').reset();
    $('editingFindingKey').value='';
    $('saveFindingButton').textContent='Save finding';
    $('cancelFindingEdit').hidden=true;
  }
  function beginEdit(key){
    const finding=api.active()?.findings?.[key];
    if(!finding)return;
    const label=displayLabel(key,finding);
    if(![...$('findingType').options].some(option=>option.value===label)){
      const option=document.createElement('option');option.value=label;option.textContent=label;$('findingType').append(option);
    }
    $('editingFindingKey').value=key;
    $('findingType').value=label;
    $('findingValue').value=finding.value||finding.finding||'';
    $('findingStatus').value=isAbnormal(finding)?'not-normal':'normal';
    $('findingInterpretation').value=finding.interpretation||'';
    $('findingNote').value=finding.note||'';
    $('saveFindingButton').textContent='Update finding';
    $('cancelFindingEdit').hidden=false;
    $('findingValue').focus();
    $('findingForm').scrollIntoView({behavior:'smooth',block:'center'});
  }

  findingTypes.forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;$('findingType').append(option)});
  quick.forEach(value=>{const button=document.createElement('button');button.type='button';button.textContent=value;button.addEventListener('click',()=>{$('findingType').value=value;$('findingValue').focus()});$('quickFindings').append(button)});

  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
    activeFilter=button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(item=>item.classList.toggle('is-active',item===button));
    render();
  }));

  $('groupedFindingList').addEventListener('click',event=>{
    const button=event.target.closest('button[data-action]');
    if(!button)return;
    const key=button.dataset.key;
    if(button.dataset.action==='edit')beginEdit(key);
    if(button.dataset.action==='remove'&&confirm(`Remove ${displayLabel(key,api.active()?.findings?.[key]||{})} from the current findings list?`)){api.removeFinding(key);showMessage('Finding removed. The prior entry remains in the timeline.')}
  });

  $('findingTimeline').addEventListener('click',event=>{
    const button=event.target.closest('[data-restore-index]');
    if(!button)return;
    const reversedIndex=Number(button.dataset.restoreIndex);
    const history=api.active()?.findingHistory||[];
    api.restoreFinding(history.length-1-reversedIndex);
    showMessage('Earlier finding restored to the current patient list.');
  });

  $('findingForm').addEventListener('submit',event=>{
    event.preventDefault();
    const editingKey=$('editingFindingKey').value;
    const label=$('findingType').value;
    const key=editingKey||normalizeManualKey(label);
    api.setFinding(key,$('findingValue').value.trim(),{
      label,
      shortLabel:label,
      status:$('findingStatus').value==='normal'?'normal':'abnormal',
      normality:$('findingStatus').value,
      interpretation:$('findingInterpretation').value.trim(),
      note:$('findingNote').value.trim(),
      source:'patient-record-manual',
      reportFormat:`${label}: ${$('findingValue').value.trim()}`
    });
    resetFindingForm();
    showMessage(editingKey?'Finding updated. The earlier value was saved to the timeline.':'Finding saved to the active patient.');
  });

  $('cancelFindingEdit').addEventListener('click',resetFindingForm);
  $('copyFindingSummary').addEventListener('click',()=>copyText(summaryLines(api.active()||{}).join('; '),'Findings summary copied.'));
  $('copyHandoffSummary').addEventListener('click',()=>copyText(buildHandoff(api.active()||{}),'Handoff summary copied.'));
  $('summaryForm').addEventListener('submit',event=>{
    event.preventDefault();
    api.setImpressions({primary:$('primaryImpression').value.trim(),differentials:[$('alternativeImpression').value.trim()].filter(Boolean)});
    api.setDocumentation({narrative:$('pcrNarrative').value.trim(),handoff:$('verbalHandoff').value.trim()});
    showMessage('Clinical impression and documentation saved.');
  });
  $('downloadRecord').addEventListener('click',()=>{const data=api.exportJson();if(!data)return;const anchor=document.createElement('a');anchor.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));anchor.download=`emscodesim-${api.activeId()}.json`;anchor.click();URL.revokeObjectURL(anchor.href)});
  $('clearRecord').addEventListener('click',()=>{if(confirm('Clear the active patient record?')){api.clear();render()}});
  window.addEventListener('emscodesim:patient-record-updated',render);
  render();
})();
