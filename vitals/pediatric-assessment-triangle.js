(() => {
  'use strict';
  const STORAGE_KEY = 'emscodesim-pat-learning-v1';
  const $ = id => document.getElementById(id);
  const cases = [
    {title:'Playful toddler',description:'A 2-year-old with a low-grade fever sits on a caregiver’s lap, watches you enter, and reaches for a toy.',finding:'All three PAT arms appear normal',detail:'Appearance: alert, good tone, interactive, consolable, tracks caregiver, strong cry. Work of breathing: unlabored without abnormal sounds. Circulation: skin color appropriate for baseline without pallor, mottling, or cyanosis.',normality:'normal',pattern:'stable',action:'continue',example:'Initial pediatric assessment from doorway: child alert with good tone, interactive with caregiver, consolable, and tracking appropriately. Respirations unlabored without retractions or abnormal airway sounds. Skin color appropriate for baseline without pallor, mottling, or cyanosis. PAT normal; primary assessment continued.'},
    {title:'Wheezing preschooler',description:'A 4-year-old sits upright beside a caregiver and speaks in short phrases after developing cough and wheezing.',finding:'Work of breathing is abnormal; appearance and circulation remain normal',detail:'Appearance: alert and interactive. Breathing: expiratory wheeze, intercostal retractions, nasal flaring, and shortened speech. Circulation: no pallor, mottling, or cyanosis.',normality:'not-normal',pattern:'resp-distress',action:'oxygen-assess',example:'Initial PAT abnormal for work of breathing. Child alert and interactive with caregiver. Expiratory wheeze, intercostal retractions, nasal flaring, and short-phrase speech noted. Skin color appropriate for baseline without pallor, mottling, or cyanosis. Airway and breathing assessment initiated; oxygen provided as indicated.'},
    {title:'Fatigued infant',description:'A 7-month-old has had increasing breathing difficulty for several hours and is now less responsive to the caregiver.',finding:'Appearance and work of breathing are abnormal',detail:'Appearance: weak tone, poor eye contact, weak cry, difficult to console. Breathing: shallow respirations with minimal chest movement after earlier marked retractions. Circulation: skin remains pink without mottling.',normality:'not-normal',pattern:'resp-failure',action:'ventilate-transport',example:'Initial PAT abnormal for appearance and work of breathing. Infant with weak tone, poor eye contact, weak cry, and decreased interaction. Respirations shallow with minimal chest movement. Skin pink without mottling or cyanosis. Ventilatory support initiated and rapid transport begun.'},
    {title:'Dehydrated child',description:'A 6-year-old has had vomiting and diarrhea for two days and appears increasingly weak.',finding:'Appearance and circulation to skin are abnormal',detail:'Appearance: listless, decreased interaction, weak tone. Breathing: no increased work. Circulation: pale, cool, mottled extremities.',normality:'not-normal',pattern:'shock',action:'shock-transport',example:'Initial PAT abnormal for appearance and circulation to skin. Child listless with decreased interaction and weak tone. Respirations unlabored. Skin pale and cool with mottling of extremities. Shock assessment initiated, child kept warm, and rapid transport begun.'},
    {title:'Altered school-age child',description:'An 8-year-old is found confused and staring after missing breakfast. There is no respiratory complaint.',finding:'Appearance is abnormal; breathing and circulation appear normal',detail:'Appearance: confused, slow interaction, abnormal gaze, weak speech. Breathing: unlabored. Circulation: skin color appropriate for baseline without mottling or cyanosis.',normality:'not-normal',pattern:'neuro-metabolic',action:'ams-assess',example:'Initial PAT abnormal for appearance. Child confused with slowed interaction, abnormal gaze, and weak speech. Respirations unlabored. Skin color appropriate for baseline without pallor, mottling, or cyanosis. ABCs reassessed and glucose, temperature, and neurologic evaluation initiated.'},
    {title:'Critically ill infant',description:'A 3-month-old is limp and minimally responsive after a period of severe respiratory distress.',finding:'All three PAT arms are abnormal',detail:'Appearance: limp, unresponsive to caregiver, weak or absent cry. Breathing: irregular, shallow respirations with poor chest movement. Circulation: gray, mottled skin with central cyanosis.',normality:'not-normal',pattern:'cardiopulmonary',action:'resuscitate',example:'Initial PAT abnormal in all three arms. Infant limp and minimally responsive with weak cry. Respirations irregular and shallow with poor chest movement. Skin gray and mottled with central cyanosis. Immediate airway and ventilatory support initiated with rapid transport.'}
  ];
  const state={current:null,revealed:false,complete:{how:false,why:false,practice:false}};
  function load(){try{Object.assign(state.complete,JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'));}catch(_){} }
  function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state.complete));}
  function updateProgress(){const n=Object.values(state.complete).filter(Boolean).length;$('progressText').textContent=`${n} of 3 lessons complete`;$('progressBar').style.width=`${(n/3)*100}%`;document.querySelectorAll('[data-complete]').forEach(b=>{const done=state.complete[b.dataset.complete];b.classList.toggle('is-complete',done);b.textContent=done?'Completed ✓':`Mark ${b.dataset.complete.toUpperCase()} complete`;});}
  function switchPanel(id){document.querySelectorAll('.lesson-panel').forEach(p=>{const active=p.id===id;p.hidden=!active;p.classList.toggle('is-active',active);});document.querySelectorAll('.lesson-tab').forEach(b=>b.classList.toggle('is-active',b.dataset.panel===id));}
  function newCase(){let next = window.EMSCodeSimScenarioRuntime?.chooseCase('pat', cases, state.current) || cases[0];state.current=next;state.revealed=false;$('caseTitle').textContent=next.title;$('caseDescription').textContent=next.description;$('findingBox').hidden=true;$('resultsPanel').hidden=true;$('patForm').reset();}
  document.querySelectorAll('.lesson-tab').forEach(b=>b.addEventListener('click',()=>switchPanel(b.dataset.panel)));
  document.querySelectorAll('[data-complete]').forEach(b=>b.addEventListener('click',()=>{state.complete[b.dataset.complete]=true;save();updateProgress();}));
  $('checkWhy').addEventListener('click',()=>{const value=document.querySelector('input[name="whyQuestion"]:checked')?.value;$('whyFeedback').textContent=value==='no'?'Correct. Decreasing effort with abnormal appearance can indicate fatigue and respiratory failure.':'Reassess the pattern. A tiring child may become quieter while ventilation worsens.';});
  $('newCase').addEventListener('click',newCase);
  $('tryAnother').addEventListener('click',()=>{newCase();$('practicePanel').scrollIntoView({behavior:'smooth'});});
  $('performAssessment').addEventListener('click',()=>{state.revealed=true;$('findingText').textContent=state.current.finding;$('findingDetail').textContent=state.current.detail;$('findingBox').hidden=false;$('findingBox').scrollIntoView({behavior:'smooth',block:'nearest'});});
  $('patForm').addEventListener('submit',e=>{e.preventDefault();if(!state.revealed){alert('Perform the PAT observation before grading the case.');return;}const normality=document.querySelector('input[name="normality"]:checked')?.value||'';const pattern=$('patternSelect').value;const action=$('actionSelect').value;const pcr=$('pcrText').value.trim();let score=0;const feedback=[];
    if(normality===state.current.normality){score++;feedback.push('Correctly classified the overall PAT as normal or not normal.');}else feedback.push(`Classification needs review: this PAT is ${state.current.normality==='normal'?'normal':'not normal'}.`);
    if(pattern===state.current.pattern){score++;feedback.push('Correctly identified the PAT pattern.');}else feedback.push('Reconsider which PAT arms are abnormal and match the combination to the best physiologic category.');
    if(action===state.current.action){score++;feedback.push('Selected the best immediate EMT priority.');}else feedback.push('Use the PAT to direct the next ABC priority, then perform a hands-on primary assessment.');
    if(pcr){feedback.push('Optional finding note saved. Full narrative documentation is completed later in the scenario.');}else feedback.push('No finding narrative required. Complete the full narrative near the end of the scenario.');
    $('scoreText').textContent=`Score: ${score} of 3`;$('feedbackList').innerHTML=feedback.map(x=>`<li>${x}</li>`).join('');$('examplePCR').textContent=state.current.example;
    window.EMSCodeSimAssessmentIntegration?.saveAssessment({
      assessment: 'pediatric_assessment_triangle',
      label: 'Pediatric Assessment Triangle',
      scenarioTitle: state.current.title || '',
      finding: state.current.finding || '',
      details: state.current.detail || state.current.description || '',
      normality,
      expectedNormality: state.current.normality,
      interpretation: typeof pattern !== 'undefined' ? pattern : '',
      action: typeof action !== 'undefined' ? action : '',
      documentation: pcr,
      score,
      maxScore: 3
    });
$('resultsPanel').hidden=false;$('resultsPanel').scrollIntoView({behavior:'smooth',block:'start'});if(score===3){state.complete.practice=true;save();updateProgress();}
  });
  load();updateProgress();newCase();
})();
