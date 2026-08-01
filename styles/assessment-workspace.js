(()=>{'use strict';
const api=window.EMSCodeSimPatientRecord;
const record=api?.active?.();
const $=id=>document.getElementById(id);
if(!record){$('noPatient').hidden=false;return}
$('workspace').hidden=false;const debriefLink=$('workspaceDebriefLink');if(debriefLink)debriefLink.href=`/vitals/scenario-debrief.html?resume=1&case=${encodeURIComponent(record.scenarioId||record.id||'')}`;$('workspaceTitle').textContent=record.title||'Guided Patient Assessment';$('workspaceDispatch').textContent=record.dispatch||record.goal||'Complete the connected assessment pathway.';
const caseId=record.scenarioId||record.id;
const scenarioPictures={asthma:'/vitals/assets/scenario-patient-adult-v3.png',stroke:'/vitals/assets/scenario-patient-adult-v3.png',hypoglycemia:'/vitals/assets/scenario-patient-adult-v3.png',trauma:'/vitals/assets/scenario-patient-adult-v3.png',pediatric:'/vitals/assets/scenario-patient-pediatric-v3.png'};
const scenarioConditions={asthma:'Sitting upright, anxious, and speaking in short sentences.',stroke:'Awake with abnormal speech and right-sided weakness.',hypoglycemia:'Confused, diaphoretic, and slow to follow commands.',trauma:'Pale with guarded breathing after a motor-vehicle collision.',pediatric:'Poor interaction with increased work of breathing.'};
function loadPatientPicture(img,path){if(!img)return;img.onerror=()=>{img.onerror=null;img.src='/vitals/assets/scenario-patient-adult-v3.png';img.classList.add('image-fallback')};img.src=path||'/vitals/assets/scenario-patient-adult-v3.png';img.hidden=false}
loadPatientPicture($('workspacePatientImage'),scenarioPictures[caseId]);
$('workspacePatientLabel').textContent=record.patient||record.title||'Scenario patient';
$('workspacePatientCondition').textContent=scenarioConditions[caseId]||record.scene||'Observe the patient before beginning the assessment.';
const common={
 primary:[
  {key:'airway',label:'Airway',description:'Confirm patency and identify immediate threats.',url:'/vitals/airway-assessment.html'},
  {key:'breathing',label:'Breathing quality',description:'Assess effort, adequacy, speech, and chest movement.',url:'/vitals/breathing-assessment.html'},
  {key:'perfusion',label:'Circulation and perfusion',description:'Assess pulse quality, skin, capillary refill, and major bleeding.',url:'/vitals/perfusion-assessment.html'}],
 vitals:[
  {key:'pulse',label:'Pulse',description:'Obtain and report rate, rhythm, and quality.',url:'/vitals/pulse.html'},
  {key:'blood_pressure',label:'Blood pressure',description:'Obtain and report systolic and diastolic pressure.',url:'/vitals/bp.html'},
  {key:'respirations',label:'Respiratory rate',description:'Count and report rate, depth, and effort.',url:'/vitals/respiratory-rate.html'},
  {key:'spo2',label:'SpO₂',description:'Obtain saturation and verify signal quality.',url:'/vitals/pulse-ox.html'}],
 history:[{key:'sample',label:'SAMPLE history',description:'Gather symptoms, allergies, medications, history, intake, and events.',url:'/vitals/sample-history.html'}],
 report:[
  {key:'clinical_impression',label:'Clinical impression',description:'Choose an EMT-level working impression supported by findings.',url:'/vitals/clinical-impression.html'},
  {key:'pcr_handoff',label:'PCR and handoff',description:'Create a concise report using the collected findings.',url:'/vitals/pcr-handoff.html'}]
};
const focused={
 asthma:[
  {key:'breath_sounds',label:'Breath sounds',description:'Auscultate multiple lung fields and report the pattern.',url:'/vitals/breath-sound-simulator.html'}],
 stroke:[
  {key:'mental_status',label:'Mental status',description:'Establish alertness and orientation.',url:'/vitals/avpu.html'},
  {key:'motor_sensory',label:'Stroke findings',description:'Compare facial movement, speech, arm drift, strength, and sensation.',url:'/vitals/motor-sensory-assessment.html'},
  {key:'blood_glucose',label:'Blood glucose',description:'Check for a common reversible stroke mimic.',url:'/vitals/bgl.html'}],
 hypoglycemia:[
  {key:'mental_status',label:'Mental status',description:'Establish the patient’s neurologic baseline.',url:'/vitals/avpu.html'},
  {key:'blood_glucose',label:'Blood glucose',description:'Obtain and classify the glucose finding.',url:'/vitals/bgl.html'}],
 trauma:[
  {key:'breath_sounds',label:'Breath sounds',description:'Compare lung sounds after blunt chest trauma.',url:'/vitals/breath-sound-simulator.html'},
  {key:'chest_assessment',label:'Chest assessment',description:'Inspect and palpate for chest-wall injury.',url:'/vitals/chest-assessment.html'},
  {key:'trauma_assessment',label:'Rapid trauma assessment',description:'Complete a systematic head-to-toe examination.',url:'/vitals/trauma-assessment.html'},
  {key:'abdominal_assessment',label:'Abdominal assessment',description:'Assess tenderness, guarding, rigidity, and distention.',url:'/vitals/abdominal-assessment.html'}],
 pediatric:[
  {key:'pediatric_assessment_triangle',label:'Pediatric Assessment Triangle',description:'Assess appearance, work of breathing, and circulation to skin.',url:'/vitals/pediatric-assessment-triangle.html'},
  {key:'breath_sounds',label:'Breath sounds',description:'Auscultate and compare pediatric lung fields.',url:'/vitals/breath-sound-simulator.html'}]
};
const phases=[
 {id:'primary',title:'Primary assessment',steps:common.primary},
 {id:'vitals',title:'Baseline vital signs',steps:common.vitals},
 {id:'focused',title:'Complaint-focused assessment',steps:focused[caseId]||[]},
 {id:'history',title:'History',steps:common.history},
 {id:'report',title:'Impression and report',steps:common.report}
].filter(p=>p.steps.length);
function findingFor(step){const f=record.findings||{};if(f[step.key])return f[step.key];const aliases={airway:['airway_assessment'],breathing:['breathing_assessment','breathing_quality'],perfusion:['perfusion_assessment','skin'],sample:['sample_history'],motor_sensory:['motor_sensory_assessment'],chest_assessment:['chest'],trauma_assessment:['trauma'],abdominal_assessment:['abdominal'],clinical_impression:['impression'],pcr_handoff:['handoff']};for(const key of aliases[step.key]||[])if(f[key])return f[key];if(step.key==='sample'&&Object.keys(record.history||{}).length)return{value:'History recorded'};if(step.key==='clinical_impression'&&record.impressions?.primary)return{value:record.impressions.primary};if(step.key==='pcr_handoff'&&(record.documentation?.narrative||record.documentation?.handoff))return{value:'Report prepared'};return null}
function stepUrl(step){return `${step.url}?mode=scenario&resume=1&case=${encodeURIComponent(caseId)}`}
function referenceQuery(step){const map={airway:'airway assessment',breathing:'work of breathing respiratory assessment',perfusion:'perfusion circulation skin signs',pulse:'pulse rate rhythm quality',blood_pressure:'blood pressure',respirations:'respiratory rate',spo2:'pulse oximetry SpO2',sample:'SAMPLE history',breath_sounds:'breath sounds',mental_status:'AVPU mental status',motor_sensory:'stroke assessment',blood_glucose:'blood glucose hypoglycemia',chest_assessment:'chest trauma assessment',trauma_assessment:'rapid trauma assessment',abdominal_assessment:'abdominal assessment',pediatric_assessment_triangle:'Pediatric Assessment Triangle',clinical_impression:'clinical impression differential diagnosis',pcr_handoff:'MIST handoff PCR documentation'};return map[step.key]||step.label}
function referenceUrl(step){const back=`/vitals/assessment-workspace.html?resume=1&case=${encodeURIComponent(caseId)}`;return `/ems-encyclopedia.html?q=${encodeURIComponent(referenceQuery(step))}&level=EMT&view=field&return=${encodeURIComponent(back)}`}
function render(filter='all'){
 const host=$('phaseSections');host.innerHTML='';let total=0,done=0,firstIncomplete=null;
 phases.forEach(phase=>{const phaseDone=phase.steps.filter(findingFor).length;total+=phase.steps.length;done+=phaseDone;if(filter!=='all'&&filter!==phase.id)return;const section=document.createElement('section');section.className='phase-card';section.dataset.phase=phase.id;section.innerHTML=`<div class="phase-heading"><h2>${phase.title}</h2><span>${phaseDone} of ${phase.steps.length}</span></div><div class="step-list"></div>`;const list=section.querySelector('.step-list');phase.steps.forEach((step,i)=>{const finding=findingFor(step),complete=!!finding;if(!complete&&!firstIncomplete)firstIncomplete=step;const value=finding?.finding||finding?.value||finding?.details||'';const article=document.createElement('article');article.className=`assessment-step${complete?' complete':''}`;article.innerHTML=`<div class="step-marker">${complete?'✓':i+1}</div><div><h3>${step.label}</h3><p>${step.description}</p>${complete?`<p class="finding-preview">Reported: ${escapeHtml(String(value||'Complete'))}</p>`:''}<div class="step-tools"><a class="reference-link" href="${referenceUrl(step)}">Quick reference</a></div></div><a class="step-open-link" href="${stepUrl(step)}">${complete?'Review':'Open'}</a>`;list.appendChild(article)});host.appendChild(section)});
 const pct=total?Math.round(done/total*100):0;$('progressText').textContent=`${done} of ${total} findings collected`;$('progressPercent').textContent=`${pct}%`;$('progressRing').style.setProperty('--progress',`${pct}%`);$('nextText').textContent=done===total?'Assessment findings are complete. Prepare the impression and handoff.':`${total-done} assessment item${total-done===1?'':'s'} remaining.`;
 const next=firstIncomplete||{label:'Scenario debrief',description:'Review priorities, missed findings, abnormal results, and targeted remediation.',url:'/vitals/scenario-debrief.html'};$('nextActionTitle').textContent=done===total?'Debrief this scenario':next.label;$('nextActionDescription').textContent=next.description;$('nextActionLink').href=done===total?`/vitals/scenario-debrief.html?resume=1&case=${encodeURIComponent(caseId)}`:stepUrl(next);$('nextActionLink').textContent=done===total?'Open debrief':'Open next step';
}
function escapeHtml(value){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
document.querySelectorAll('[data-phase]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-phase]').forEach(b=>b.classList.toggle('active',b===button));render(button.dataset.phase)}));
window.addEventListener('emscodesim:patient-record-updated',()=>location.reload());render();
})();
