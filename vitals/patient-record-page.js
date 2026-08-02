(()=>{
  'use strict';
  const api=window.EMSCodeSimPatientRecord;
  const $=id=>document.getElementById(id);
  const findingTypes=['Airway','Breathing','Pulse','Blood pressure','Respirations','SpO₂','Skin','Pupils','Blood glucose','Mental status','Lung sounds','Pain / OPQRST','SAMPLE history','Trauma','Chest','Abdomen','Perfusion','Motor/sensory','Pediatric triangle','Other'];
  const quick=['Airway','Breathing','Blood pressure','Pulse','SpO₂','Blood glucose','Mental status','Skin'];
  let activeFilter='all';

  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
  function formatClock(value){const date=new Date(value);return Number.isNaN(date.getTime())?'Time not recorded':date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit',second:'2-digit'})}
  function elapsed(value,startedAt){const eventTime=new Date(value).getTime();const startTime=new Date(startedAt).getTime();if(!Number.isFinite(eventTime)||!Number.isFinite(startTime)||eventTime<startTime)return'';const total=Math.floor((eventTime-startTime)/1000);return`+${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`}
  function typeLabel(event){if(event.type==='treatment')return'Treatment';if(event.type==='reassessment')return'Reassessment';if(event.category==='vital')return'Vital';if(event.category==='history')return'History';if(event.type==='impression')return'Impression';if(event.type==='documentation')return'Report';return'Assessment'}
  function showMessage(message){$('saveMessage').textContent=message;$('saveMessage').hidden=false;clearTimeout(showMessage.timer);showMessage.timer=setTimeout(()=>$('saveMessage').hidden=true,2400)}

  function renderCareLog(record){
    const host=$('careLogList');
    const all=api.listCareLog?.(record,'all')||[];
    const events=api.listCareLog?.(record,activeFilter)||all;
    const sequenceById=new Map(all.map((event,index)=>[event.id||event.eventId,index+1]));
    const counts={all:all.length,vitals:all.filter(event=>event.category==='vital').length,treatments:all.filter(event=>event.category==='treatment').length};
    document.querySelectorAll('[data-record-filter]').forEach(button=>{
      const filter=button.dataset.recordFilter;
      button.classList.toggle('active',filter===activeFilter);
      button.textContent=`${button.dataset.label} (${counts[filter]||0})`;
    });
    $('recordLogSummary').textContent=activeFilter==='all'?`${events.length} patient-care event${events.length===1?'':'s'} shown in chronological order.`:`${events.length} ${activeFilter==='vitals'?'vital-sign':'treatment and reassessment'} event${events.length===1?'':'s'} shown.`;
    if(!events.length){host.innerHTML=`<p class="empty-note">${activeFilter==='vitals'?'No vital signs recorded yet.':activeFilter==='treatments'?'No treatments or reassessments recorded yet.':'No patient-care events recorded yet.'}</p>`;return}
    host.innerHTML=events.map((event,index)=>{
      const sequence=sequenceById.get(event.id||event.eventId)||index+1;
      return `<article class="record-log-item ${escapeHtml(event.category||'assessment')} ${escapeHtml(event.type||'finding')}"><div class="record-log-order"><b>${sequence}</b><span>${escapeHtml(elapsed(event.recordedAt,record.startedAt))}</span></div><div class="record-log-body"><div class="record-log-top"><span class="record-log-type">${typeLabel(event)}</span><time datetime="${escapeHtml(event.recordedAt)}">${escapeHtml(formatClock(event.recordedAt))}</time></div><strong>${escapeHtml(event.label||api.labelFor?.(event.key)||event.key)}</strong><p>${escapeHtml(event.value||'Recorded')}</p>${event.details?`<small>${escapeHtml(event.details)}</small>`:''}</div></article>`;
    }).join('');
  }

  function render(){
    const record=api.active();
    $('noRecord').hidden=!!record;
    $('recordContent').hidden=!record;
    if(!record)return;
    $('recordTitle').textContent=record.title;
    $('recordDispatch').textContent=record.dispatch||'No dispatch information saved.';
    $('recordPatient').textContent=record.patient||'Not specified';
    $('recordScene').textContent=record.scene||'Not specified';
    $('recordGoal').textContent=record.goal||'Complete assessment and care';
    $('primaryImpression').value=record.impressions.primary||'';
    $('alternativeImpression').value=(record.impressions.differentials||[])[0]||'';
    $('pcrNarrative').value=record.documentation.narrative||'';
    $('verbalHandoff').value=record.documentation.handoff||'';
    const caseId=record.scenarioId||record.id||'';
    $('recordTreatmentAction').href=`/vitals/treatment-reassessment.html?mode=scenario&resume=1&case=${encodeURIComponent(caseId)}&return=${encodeURIComponent('/vitals/patient-record.html?mode=scenario&resume=1')}&returnLabel=${encodeURIComponent('patient record')}&context=general`;
    renderCareLog(record);
  }

  findingTypes.forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;$('findingType').appendChild(option)});
  quick.forEach(value=>{const button=document.createElement('button');button.type='button';button.textContent=value;button.addEventListener('click',()=>{$('findingType').value=value;$('findingValue').focus()});$('quickFindings').appendChild(button)});
  document.querySelectorAll('[data-record-filter]').forEach(button=>button.addEventListener('click',()=>{activeFilter=button.dataset.recordFilter||'all';render()}));

  $('findingForm').addEventListener('submit',event=>{
    event.preventDefault();
    api.setFinding($('findingType').value,$('findingValue').value.trim(),{status:$('findingStatus').value,normality:$('findingStatus').value,interpretation:$('findingInterpretation').value.trim(),note:$('findingNote').value.trim(),source:'patient-record-manual-entry'});
    event.target.reset();
    showMessage('Finding added to the chronological patient-care log.');
    render();
  });

  $('summaryForm').addEventListener('submit',event=>{
    event.preventDefault();
    api.setImpressions({primary:$('primaryImpression').value.trim(),differentials:[$('alternativeImpression').value.trim()].filter(Boolean),source:'patient-record-summary'});
    api.setDocumentation({narrative:$('pcrNarrative').value.trim(),handoff:$('verbalHandoff').value.trim(),source:'patient-record-summary'});
    showMessage('Clinical impression and documentation saved.');
    render();
  });

  $('downloadRecord').addEventListener('click',()=>{const data=api.exportJson();if(!data)return;const anchor=document.createElement('a');anchor.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));anchor.download=`emscodesim-${api.activeId()}.json`;anchor.click();URL.revokeObjectURL(anchor.href)});
  $('clearRecord').addEventListener('click',()=>{if(confirm('Clear the active patient record?')){api.clear();render()}});
  window.addEventListener('emscodesim:patient-record-updated',render);
  render();
})();
