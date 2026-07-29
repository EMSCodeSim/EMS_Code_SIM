(() => {
  'use strict';
  const STORAGE_KEY = 'emscodesim-trauma-learning-v1';
  const $ = id => document.getElementById(id);
  const cases = [
    {title:'Low-speed fall',description:'A 42-year-old slipped from the bottom step and landed on the right forearm. The patient is alert with stable vital signs.',finding:'Superficial abrasion to right forearm',detail:'Approximately 3 cm, bleeding controlled, mild tenderness, no deformity, and intact distal pulse, motor function, and sensation.',normality:'not-normal',problem:'minor',action:'continue',example:'Right forearm with approximately 3 cm superficial abrasion and mild tenderness. Bleeding controlled. No deformity or instability noted. Distal pulse, motor function, and sensation intact.'},
    {title:'Power-tool injury',description:'A 36-year-old has a deep laceration to the left thigh after a saw injury. Bright red bleeding continues despite a blood-soaked dressing.',finding:'Severe external hemorrhage from left thigh',detail:'Active heavy bleeding with pale, cool skin and tachycardia. Distal pulse remains present.',normality:'not-normal',problem:'hemorrhage',action:'bleeding-control',example:'Deep laceration to left anterior thigh with severe active hemorrhage. Direct pressure and wound packing performed; tourniquet applied per protocol when bleeding persisted. Bleeding controlled and distal status reassessed.'},
    {title:'Motorcycle crash',description:'A helmeted rider struck a guardrail and reports severe left chest pain and shortness of breath.',finding:'Asymmetric chest rise with reduced movement on the left',detail:'Left lateral chest tenderness and crepitus, respirations 30/min and shallow, SpO₂ 89% on room air.',normality:'not-normal',problem:'chest',action:'breathing-transport',example:'Chest rise asymmetric with reduced movement on the left. Left lateral chest tender with palpable crepitus. Respirations 30/min, shallow and labored; SpO₂ 89% on room air. Oxygen provided and rapid transport initiated.'},
    {title:'High-energy vehicle collision',description:'A restrained driver has lower abdominal pain after a head-on collision. The steering wheel is deformed.',finding:'Rigid, distended abdomen with diffuse tenderness',detail:'Lower abdominal bruising, pulse 122, cool pale skin, and increasing anxiety.',normality:'not-normal',problem:'internal',action:'shock-transport',example:'Abdomen distended and rigid with diffuse tenderness and lower abdominal ecchymosis. Patient tachycardic with cool, pale skin. Treated for shock and transported emergently with serial reassessment.'},
    {title:'Sports injury',description:'A 17-year-old sustained a visibly deformed right lower leg during football.',finding:'Right lower-leg deformity with absent distal pulse',detail:'Marked angulation, severe pain, pale cool foot, absent pedal pulse, reduced sensation, and limited movement.',normality:'not-normal',problem:'neurovascular',action:'splint-reassess',example:'Right lower leg with marked deformity and angulation. Right foot pale and cool with absent pedal pulse, reduced sensation, and limited motor function. Extremity stabilized and distal PMS reassessed before and after intervention.'},
    {title:'Minor rear-end collision',description:'A 29-year-old was the restrained driver in a low-speed rear-end collision and denies pain.',finding:'No significant findings on rapid trauma exam',detail:'Head, neck, chest, abdomen, pelvis, back, and extremities without tenderness, deformity, instability, bleeding, or neurologic deficit.',normality:'normal',problem:'normal-exam',action:'continue',example:'Rapid trauma assessment completed. No deformity, contusion, abrasion, penetration, burn, tenderness, laceration, swelling, instability, or neurovascular deficit identified. Patient remains alert with stable vital signs.'}
  ];
  const state={current:null,revealed:false,complete:{how:false,why:false,practice:false}};
  function load(){try{Object.assign(state.complete,JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'));}catch(_){} }
  function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state.complete));}
  function updateProgress(){const n=Object.values(state.complete).filter(Boolean).length;$('progressText').textContent=`${n} of 3 lessons complete`;$('progressBar').style.width=`${(n/3)*100}%`;document.querySelectorAll('[data-complete]').forEach(b=>{const done=state.complete[b.dataset.complete];b.classList.toggle('is-complete',done);b.textContent=done?'Completed ✓':`Mark ${b.dataset.complete.toUpperCase()} complete`;});}
  function switchPanel(id){document.querySelectorAll('.lesson-panel').forEach(p=>{const active=p.id===id;p.hidden=!active;p.classList.toggle('is-active',active);});document.querySelectorAll('.lesson-tab').forEach(b=>b.classList.toggle('is-active',b.dataset.panel===id));}
  function newCase(){let next;do{next=cases[Math.floor(Math.random()*cases.length)];}while(cases.length>1&&next===state.current);state.current=next;state.revealed=false;$('caseTitle').textContent=next.title;$('caseDescription').textContent=next.description;$('findingBox').hidden=true;$('resultsPanel').hidden=true;$('traumaForm').reset();}
  document.querySelectorAll('.lesson-tab').forEach(b=>b.addEventListener('click',()=>switchPanel(b.dataset.panel)));
  document.querySelectorAll('[data-complete]').forEach(b=>b.addEventListener('click',()=>{state.complete[b.dataset.complete]=true;save();updateProgress();}));
  $('checkWhy').addEventListener('click',()=>{const value=document.querySelector('input[name="whyQuestion"]:checked')?.value;$('whyFeedback').textContent=value==='no'?'Correct. An absent distal pulse is a time-sensitive neurovascular finding that requires action and reassessment.':'Reassess this finding. Loss of distal circulation is more than a documentation detail.';});
  $('newCase').addEventListener('click',newCase);
  $('tryAnother').addEventListener('click',()=>{newCase();$('practicePanel').scrollIntoView({behavior:'smooth'});});
  $('performAssessment').addEventListener('click',()=>{state.revealed=true;$('findingText').textContent=state.current.finding;$('findingDetail').textContent=state.current.detail;$('findingBox').hidden=false;$('findingBox').scrollIntoView({behavior:'smooth',block:'nearest'});});
  $('traumaForm').addEventListener('submit',e=>{e.preventDefault();if(!state.revealed){alert('Perform the trauma assessment before grading the case.');return;}const normality=document.querySelector('input[name="normality"]:checked')?.value||'';const problem=$('problemSelect').value;const action=$('actionSelect').value;const pcr=$('pcrText').value.trim();let score=0;const feedback=[];
    if(normality===state.current.normality){score++;feedback.push('Correctly classified the finding as normal or not normal.');}else feedback.push(`Classification needs review: this exam is ${state.current.normality==='normal'?'normal':'not normal'}.`);
    if(problem===state.current.problem){score++;feedback.push('Correctly identified the clinical importance of the trauma finding.');}else feedback.push('Reconsider whether this is minor, hemorrhagic, chest-related, internal, or neurovascular.');
    if(action===state.current.action){score++;feedback.push('Selected the best immediate EMT priority.');}else feedback.push('Prioritize hemorrhage, airway/breathing, shock, and neurovascular threats before minor findings.');
    const terms=['left','right','bleeding','tender','deform','pulse','motor','sensation','pms','chest','abdomen','reassess','transport','controlled','cm'];const hits=terms.filter(t=>pcr.toLowerCase().includes(t)).length;if(pcr.length>=65&&hits>=3){score++;feedback.push('Documentation is objective and sufficiently detailed.');}else feedback.push('Include location and side, objective appearance, tenderness or instability, bleeding, distal PMS, intervention, and reassessment.');
    $('scoreText').textContent=`Score: ${score} of 4`;$('feedbackList').innerHTML=feedback.map(x=>`<li>${x}</li>`).join('');$('examplePCR').textContent=state.current.example;
    window.EMSCodeSimAssessmentIntegration?.saveAssessment({
      assessment: 'trauma',
      label: 'Trauma Assessment',
      scenarioTitle: state.current.title || '',
      finding: state.current.finding || '',
      details: state.current.detail || state.current.description || '',
      normality,
      expectedNormality: state.current.normality,
      interpretation: typeof problem !== 'undefined' ? problem : '',
      action: typeof action !== 'undefined' ? action : '',
      documentation: pcr,
      score,
      maxScore: 4
    });
$('resultsPanel').hidden=false;$('resultsPanel').scrollIntoView({behavior:'smooth',block:'start'});if(score===4){state.complete.practice=true;save();updateProgress();}
  });
  load();updateProgress();newCase();
})();
