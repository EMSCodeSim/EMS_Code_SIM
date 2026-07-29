(() => {
'use strict';
const $ = (id) => document.getElementById(id);
const storageKey = 'emscodesim-motor-sensory-lessons-v1';
const cases = [
  {
    title: 'Reassuring neurologic exam',
    description: 'A 29-year-old reports brief lightheadedness after standing quickly. Symptoms have resolved. There is no trauma, headache, numbness, or weakness.',
    finding: 'Face symmetric, speech clear, no arm drift, grips equal, legs move equally, and sensation intact bilaterally.',
    detail: 'The patient is alert and oriented with no focal motor or sensory deficit.',
    normality: 'normal', priority: 'normal-neuro', action: 'monitor',
    example: 'Patient alert and oriented with clear speech and symmetric facial movement. No arm drift noted. Hand grips and lower-extremity movement equal bilaterally. Sensation intact in all extremities. Findings remained unchanged on reassessment.'
  },
  {
    title: 'Possible acute stroke',
    description: 'A 71-year-old developed sudden speech difficulty while eating breakfast. Family states the patient was normal 25 minutes ago.',
    finding: 'Left facial droop, slurred speech, and left arm drift with reduced left grip strength. Legs move equally.',
    detail: 'This is a new focal neurologic deficit with a known recent last-known-well time.',
    normality: 'not-normal', priority: 'focal-neuro', action: 'stroke-priority',
    example: 'New left facial droop and slurred speech noted. Left arm drift present with weaker left hand grip compared with right; lower-extremity movement equal. Family reports last known well 25 minutes prior to EMS assessment. Stroke alert initiated per protocol and transport expedited.'
  },
  {
    title: 'Generalized weakness',
    description: 'A 58-year-old with diabetes reports weakness, sweating, and difficulty concentrating after missing lunch.',
    finding: 'Face symmetric and speech appropriate. Grips and leg strength are reduced but equal bilaterally; sensation remains intact.',
    detail: 'The weakness is symmetric rather than focal and should prompt evaluation for systemic or metabolic causes.',
    normality: 'not-normal', priority: 'generalized', action: 'systemic-check',
    example: 'Patient demonstrates generalized symmetric weakness with equal but reduced grips and lower-extremity strength. Facial movement symmetric, speech clear, and sensation intact bilaterally. Blood glucose and additional causes assessed; patient monitored and transported.'
  },
  {
    title: 'Possible spinal cord involvement',
    description: 'A 34-year-old fell from a roof and reports neck pain with tingling and weakness in both hands.',
    finding: 'Grip strength is decreased bilaterally with diminished sensation in both hands. Lower-extremity movement is present but weak.',
    detail: 'Bilateral deficits after significant trauma raise concern for spinal cord injury.',
    normality: 'not-normal', priority: 'spinal', action: 'spinal-care',
    example: 'Following fall, patient reports neck pain and bilateral hand paresthesia. Hand grips decreased bilaterally with diminished sensation in both hands; lower-extremity movement present but weak. Spinal motion precautions maintained, ABCs supported, and transport expedited.'
  },
  {
    title: 'Limb neurovascular compromise',
    description: 'A 42-year-old has a markedly deformed lower leg after a motorcycle crash and reports increasing numbness in the foot.',
    finding: 'Affected foot is pale and cool with absent palpable pedal pulse, reduced toe movement, and decreased sensation compared with the uninjured side.',
    detail: 'The distal pulse, motor, and sensation findings indicate possible limb-threatening compromise.',
    normality: 'not-normal', priority: 'limb-compromise', action: 'limb-care',
    example: 'Marked lower-leg deformity present. Distal affected foot pale and cool with no palpable pedal pulse, reduced toe movement, and decreased sensation compared with opposite side. Limb managed per protocol, distal PMS reassessed, and prompt transport initiated.'
  },
  {
    title: 'Pain-limited movement after injury',
    description: 'A 20-year-old twisted an ankle while playing basketball and will not move the foot because movement increases pain.',
    finding: 'Movement is limited by pain, but pedal pulse is present, capillary refill is brisk, and sensation is intact before splinting.',
    detail: 'The abnormal movement is pain-limited without evidence of distal neurovascular loss.',
    normality: 'not-normal', priority: 'pain-limited', action: 'splint-reassess',
    example: 'Patient declined active ankle movement due to pain. Distal pedal pulse present, capillary refill brisk, and sensation intact before splinting. Extremity immobilized in position found and distal pulse, motor, and sensation reassessed without deterioration.'
  }
];
const state = { current: null, complete: { how: false, why: false, practice: false } };
function load(){ try { const saved=JSON.parse(localStorage.getItem(storageKey)); if(saved) state.complete={...state.complete,...saved}; } catch (_) {} }
function save(){ localStorage.setItem(storageKey, JSON.stringify(state.complete)); }
function updateProgress(){ const count=Object.values(state.complete).filter(Boolean).length; $('progressText').textContent=`${count} of 3 lessons complete`; $('progressBar').style.width=`${(count/3)*100}%`; document.querySelectorAll('.completion-btn').forEach(btn=>{ const key=btn.dataset.complete; btn.classList.toggle('is-complete', !!state.complete[key]); btn.textContent=state.complete[key] ? `${key.toUpperCase()} complete ✓` : `Mark ${key.toUpperCase()} complete`; }); }
function resetForm(){ $('motorForm').reset(); $('findingBox').hidden=true; $('resultsPanel').hidden=true; }
function newCase(){ let next=cases[Math.floor(Math.random()*cases.length)]; if(cases.length>1 && state.current){ while(next===state.current) next=cases[Math.floor(Math.random()*cases.length)]; } state.current=next; $('caseTitle').textContent=next.title; $('caseDescription').textContent=next.description; resetForm(); }
document.querySelectorAll('.lesson-tab').forEach(tab=>tab.addEventListener('click',()=>{ document.querySelectorAll('.lesson-tab').forEach(t=>t.classList.remove('is-active')); document.querySelectorAll('.lesson-panel').forEach(p=>{p.classList.remove('is-active');p.hidden=true;}); tab.classList.add('is-active'); const panel=$(tab.dataset.panel); panel.hidden=false; panel.classList.add('is-active'); }));
document.querySelectorAll('.completion-btn').forEach(btn=>btn.addEventListener('click',()=>{ state.complete[btn.dataset.complete]=true; save(); updateProgress(); }));
$('checkWhy').addEventListener('click',()=>{ const selected=document.querySelector('input[name="whyQuestion"]:checked'); if(!selected){$('whyFeedback').textContent='Choose an answer first.';return;} if(selected.value==='urgent'){ $('whyFeedback').textContent='Correct. New unilateral weakness with speech or facial change is a time-sensitive focal neurologic emergency.'; state.complete.why=true; save(); updateProgress(); } else $('whyFeedback').textContent='Try again. Pain-limited movement with equal distal function is less concerning than a new focal deficit.'; });
$('performAssessment').addEventListener('click',()=>{ $('findingText').textContent=state.current.finding; $('findingDetail').textContent=state.current.detail; $('findingBox').hidden=false; });
$('newCase').addEventListener('click',newCase); $('tryAnother').addEventListener('click',newCase);
$('motorForm').addEventListener('submit',(event)=>{ event.preventDefault(); if($('findingBox').hidden){ alert('Perform the assessment before grading the case.'); return; } const normality=document.querySelector('input[name="normality"]:checked')?.value; const priority=$('prioritySelect').value; const action=$('actionSelect').value; const pcr=$('pcrText').value.trim(); let score=0; const feedback=[];
if(normality===state.current.normality){score++;feedback.push('Correctly classified the finding as normal or not normal.');}else feedback.push('Compare left with right and consider whether movement, strength, sensation, speech, or distal PMS differs from the expected baseline.');
if(priority===state.current.priority){score++;feedback.push('Correctly identified the dominant motor or sensory pattern.');}else feedback.push('Decide whether the pattern is focal, generalized, spinal, isolated to an injured limb, or limited primarily by pain.');
if(action===state.current.action){score++;feedback.push('Selected the best immediate EMT priority.');}else feedback.push('Match the action to the threat: stroke timing and transport, systemic cause checks, spinal precautions, or distal PMS protection and reassessment.');
const terms=['face','facial','speech','drift','grip','strength','motor','sensation','sensory','left','right','pulse','pms','reassess','known well','transport']; const hits=terms.filter(t=>pcr.toLowerCase().includes(t)).length; if(pcr.length>=100&&hits>=6){score++;feedback.push('Documentation includes useful objective motor, sensory, laterality, and reassessment details.');}else feedback.push('Document laterality, face and speech, arm drift, grips, leg movement, sensation, distal PMS, timing, treatment, and repeat findings.');
$('scoreText').textContent=`${score}/4`; $('feedbackList').innerHTML=feedback.map(x=>`<li>${x}</li>`).join(''); $('examplePCR').textContent=state.current.example; 
    window.EMSCodeSimAssessmentIntegration?.saveAssessment({
      assessment: 'motor_sensory',
      label: 'Motor Sensory Assessment',
      scenarioTitle: state.current.title || '',
      finding: state.current.finding || '',
      details: state.current.detail || state.current.description || '',
      normality,
      expectedNormality: state.current.normality,
      interpretation: typeof priority !== 'undefined' ? priority : '',
      action: typeof action !== 'undefined' ? action : '',
      documentation: pcr,
      score,
      maxScore: 4
    });
$('resultsPanel').hidden=false; $('resultsPanel').scrollIntoView({behavior:'smooth',block:'start'}); if(score===4){state.complete.practice=true;save();updateProgress();}
});
load(); updateProgress(); newCase();
})();
