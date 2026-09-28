(()=>{'use strict';
const scenario=window.EMSCodeSimV2Asthma;
const engine=window.EMSCodeSimV2Engine.createEngine(scenario);
const $=s=>document.querySelector(s);
const fmt=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
const video=$('#patientVideo');
const monitored=new Set();

$('#scenarioTitle').textContent=scenario.title;
$('#dispatchSummary').textContent=scenario.dispatch.summary;
$('#dispatchNotes').textContent=scenario.dispatch.notes;
$('#patientLabel').textContent=scenario.patient.age+' y/o '+scenario.patient.sex+' · '+scenario.patient.name;

scenario.phases.forEach(phase=>{
  const b=document.createElement('button');
  b.textContent=phase.replace(/-/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
  b.dataset.phase=phase;
  b.addEventListener('click',()=>engine.setPhase(phase));
  $('#phaseBar').appendChild(b);
});

Object.entries(scenario.assessments).forEach(([id,item])=>{
  const b=document.createElement('button'); b.textContent=item.label;
  b.addEventListener('click',()=>{const f=engine.assess(id);$('#finding').textContent=f.label+': '+f.value;});
  $('#assessmentButtons').appendChild(b);
});
Object.entries(scenario.treatments).forEach(([id,item])=>{
  const b=document.createElement('button'); b.textContent=item.label;
  b.addEventListener('click',()=>{const r=engine.treat(id);$('#treatmentResponse').textContent=r.message;engine.setPhase('treatment');});
  $('#treatmentButtons').appendChild(b);
});

document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));
  tab.classList.add('active'); document.querySelector('[data-panel="'+tab.dataset.tab+'"]').classList.add('active');
}));

document.querySelectorAll('[data-monitor]').forEach(btn=>btn.addEventListener('click',()=>{
  const id=btn.dataset.monitor; monitored.add(id); engine.monitor(id); render(engine.getState());
}));

$('#talkForm').addEventListener('submit',e=>{
  e.preventDefault();
  const input=$('#talkInput'); const q=input.value.trim(); if(!q)return;
  appendLine('learner-line','You: '+q);
  const lower=q.toLowerCase();
  const match=scenario.interview.find(row=>row.keys.some(k=>lower.includes(k)));
  appendLine('patient-line','Patient: “'+(match?match.answer:'I’m sorry, I’m having trouble talking. Can you ask me one thing at a time?')+'”');
  input.value=''; engine.setPhase('patient-contact');
});
function appendLine(cls,text){const d=document.createElement('div');d.className=cls;d.textContent=text;$('#conversation').appendChild(d);$('#conversation').scrollTop=$('#conversation').scrollHeight;}

$('#reassessBtn').addEventListener('click',()=>{const r=engine.reassess();$('#finding').textContent='Reassessment: RR '+r.rr+', SpO₂ '+r.spo2+'%, HR '+r.hr+'. '+r.lungSounds+'. '+r.speech+'.';engine.setPhase('reassessment');});
$('#transportBtn').addEventListener('click',()=>{engine.setTransport({destination:$('#destination').value.trim()||'Emergency Department',priority:$('#priority').value});engine.setPhase('transport');});
$('#handoffBtn').addEventListener('click',()=>{engine.setHandoff($('#handoffText').value);engine.setPhase('handoff');});
$('#pcrBtn').addEventListener('click',()=>{engine.setPCR($('#pcrText').value);engine.setPhase('documentation');});
$('#restartBtn').addEventListener('click',()=>{if(confirm('Restart with a clean patient state?')){monitored.clear();$('#handoffText').value='';$('#pcrText').value='';$('#conversation').innerHTML='<div class="patient-line">Patient: “I can’t catch my breath.”</div>';engine.reset();engine.startClock();}});
$('#endBtn').addEventListener('click',()=>showGrade(engine.end()));
$('#closeDebrief').addEventListener('click',()=>{$('#debrief').hidden=true;});

let currentVideo='';
function render(state){
  $('#clock').textContent=fmt(state.elapsedSec);
  document.querySelectorAll('[data-phase]').forEach(b=>b.classList.toggle('active',b.dataset.phase===state.phase));
  $('#conditionChip').textContent=state.clinical.videoState[0].toUpperCase()+state.clinical.videoState.slice(1);
  $('#clinicalSummary').textContent=state.clinical.workOfBreathing+' work of breathing · '+state.clinical.speech;
  const src=scenario.videos[state.clinical.videoState]||scenario.videos.arrival;
  if(src!==currentVideo){currentVideo=src;video.src=src;video.load();video.play().catch(()=>{});}
  const values={heartRate:state.clinical.hr,spo2:state.clinical.spo2,respiratoryRate:state.clinical.rr,bloodPressure:state.clinical.bp,etco2:state.clinical.etco2};
  const ids={heartRate:'#hrValue',spo2:'#spo2Value',respiratoryRate:'#rrValue',bloodPressure:'#bpValue',etco2:'#etco2Value'};
  Object.keys(ids).forEach(id=>$(ids[id]).textContent=monitored.has(id)?values[id]:'--');
  $('#timelineList').innerHTML=state.timeline.slice().reverse().map(ev=>'<li><time>'+fmt(ev.t)+'</time>'+escapeHtml(ev.label)+'</li>').join('');
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function showGrade(g){
  $('#score').innerHTML='<h3>'+g.total+' / '+g.possible+' points</h3><p class="muted">The score is deterministic. Review the timeline for what you did and when.</p>';
  $('#gradeResults').innerHTML=g.results.map(r=>'<div class="grade-row"><div><strong>'+escapeHtml(r.label)+'</strong><div class="'+(r.earned?'pass':'fail')+'">'+escapeHtml(r.feedback)+'</div></div><strong>'+r.earned+'/'+r.points+'</strong></div>').join('');
  $('#debrief').hidden=false;
}
video.addEventListener('error',()=>{$('#videoFallback').hidden=false;});
engine.subscribe(render);
engine.startClock();
})();