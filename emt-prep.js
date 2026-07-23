(function(){
  'use strict';
  const progressKey='emscodesim:emt-prep:progress';
  const planKey='emscodesim:emt-prep:plan';
  const moduleBoxes=[...document.querySelectorAll('[data-prep-module]')];
  const readinessBoxes=[...document.querySelectorAll('[data-prep-readiness]')];
  const progressBar=document.getElementById('prepProgressBar');
  const progressText=document.getElementById('prepProgressText');
  const progressTrack=document.getElementById('prepProgressTrack');
  const progressDetail=document.getElementById('prepProgressDetail');
  let saved={modules:{},readiness:{}};
  try{saved=Object.assign(saved,JSON.parse(localStorage.getItem(progressKey)||'{}'));}catch(e){}
  saved.modules=saved.modules||{}; saved.readiness=saved.readiness||{};
  function persist(){try{localStorage.setItem(progressKey,JSON.stringify(saved));}catch(e){}}
  function updateProgress(){
    const completed=moduleBoxes.filter(function(box){return box.checked;}).length;
    const pct=moduleBoxes.length?Math.round((completed/moduleBoxes.length)*100):0;
    if(progressBar) progressBar.style.width=pct+'%';
    if(progressTrack) progressTrack.setAttribute('aria-valuenow',String(pct));
    if(progressText) progressText.textContent=completed+' of '+moduleBoxes.length+' modules';
    if(progressDetail) progressDetail.textContent=completed===moduleBoxes.length?'Foundation program complete. Keep reviewing until EMT school begins.':pct+'% complete — progress is saved on this device.';
    moduleBoxes.forEach(function(box){const section=box.closest('.prep-module');if(section)section.classList.toggle('is-complete',box.checked);});
  }
  moduleBoxes.forEach(function(box){box.checked=!!saved.modules[box.value];box.addEventListener('change',function(){saved.modules[box.value]=box.checked;persist();updateProgress();});});
  readinessBoxes.forEach(function(box){box.checked=!!saved.readiness[box.value];box.addEventListener('change',function(){saved.readiness[box.value]=box.checked;persist();});});
  const reset=document.getElementById('resetPrepProgress');
  if(reset)reset.addEventListener('click',function(){
    if(!window.confirm('Clear all saved EMT Prep progress on this device?'))return;
    moduleBoxes.concat(readinessBoxes).forEach(function(box){box.checked=false;});
    saved={modules:{},readiness:{}};persist();updateProgress();
  });
  const printButton=document.getElementById('printPrepPlan');
  if(printButton)printButton.addEventListener('click',function(){window.print();});
  updateProgress();

  const plans={
    four:[
      ['Week 1','Program expectations, medical terminology, and directional language.'],
      ['Week 2','Anatomy and physiology: respiratory, cardiovascular, nervous, and musculoskeletal systems.'],
      ['Week 3','Vital-sign foundations and guided practice with pulse, blood pressure, SpO₂, glucose, and skin signs.'],
      ['Week 4','Patient-assessment preview, communication, study habits, and the readiness checklist.']
    ],
    six:[
      ['Week 1','How EMT school works, time planning, learning habits, and a realistic weekly schedule.'],
      ['Week 2','Prefixes, roots, suffixes, abbreviations, and directional language.'],
      ['Week 3','Respiratory, cardiovascular, and nervous-system foundations.'],
      ['Week 4','Musculoskeletal, integumentary, digestive, endocrine, and urinary-system foundations.'],
      ['Week 5','Vital signs and guided use of EMSCodeSim practice tools.'],
      ['Week 6','Patient-assessment preview, communication, documentation thinking, and final readiness check.']
    ]
  };
  const planContainer=document.getElementById('studyPlan');
  const planButtons=[...document.querySelectorAll('[data-plan]')];
  function renderPlan(name){
    const chosen=plans[name]||plans.four;
    if(planContainer)planContainer.innerHTML=chosen.map(function(item){return '<div class="study-week"><strong>'+item[0]+'</strong><p>'+item[1]+'</p></div>';}).join('');
    planButtons.forEach(function(button){button.setAttribute('aria-pressed',String(button.dataset.plan===name));});
    try{localStorage.setItem(planKey,name);}catch(e){}
  }
  planButtons.forEach(function(button){button.addEventListener('click',function(){renderPlan(button.dataset.plan);});});
  let savedPlan='four';try{savedPlan=localStorage.getItem(planKey)||'four';}catch(e){}renderPlan(plans[savedPlan]?savedPlan:'four');

  const questions=[
    {term:'Bradycardia',prompt:'What does this term most directly describe?',options:['A slow heart rate','A fast breathing rate','Low blood glucose'],answer:0,explain:'brady- means slow and cardi refers to the heart.'},
    {term:'Tachypnea',prompt:'What does this term most directly describe?',options:['Painful breathing','A fast breathing rate','Absent breathing'],answer:1,explain:'tachy- means fast and -pnea refers to breathing.'},
    {term:'Hypoglycemia',prompt:'What does this term most directly describe?',options:['High blood pressure','Low blood glucose','Inflammation of a joint'],answer:1,explain:'hypo- means low, glyc refers to sugar, and -emia refers to a blood condition.'},
    {term:'Bilateral',prompt:'What does this term mean?',options:['Toward the midline','On both sides','Farther from the trunk'],answer:1,explain:'bi- means two and lateral refers to the side.'},
    {term:'Dyspnea',prompt:'What does this term most directly describe?',options:['Difficult or uncomfortable breathing','A weak pulse','Loss of sensation'],answer:0,explain:'dys- means difficult, abnormal, or painful and -pnea refers to breathing.'}
  ];
  let current=0,score=0,answered=false;
  const termEl=document.getElementById('termWord');
  const promptEl=document.getElementById('termPrompt');
  const optionsEl=document.getElementById('termOptions');
  const feedbackEl=document.getElementById('termFeedback');
  const nextEl=document.getElementById('nextTermQuestion');
  const restartEl=document.getElementById('restartTermDrill');
  function showQuestion(){
    answered=false;
    const q=questions[current];
    if(termEl)termEl.textContent=q.term;
    if(promptEl)promptEl.textContent=q.prompt;
    if(feedbackEl)feedbackEl.textContent='Question '+(current+1)+' of '+questions.length;
    if(optionsEl){optionsEl.innerHTML='';q.options.forEach(function(option,index){const b=document.createElement('button');b.type='button';b.className='term-option';b.textContent=option;b.addEventListener('click',function(){answer(index,b);});optionsEl.appendChild(b);});}
    if(nextEl){nextEl.hidden=true;nextEl.textContent=current===questions.length-1?'See score':'Next question';}
  }
  function answer(index,button){
    if(answered)return;answered=true;
    const q=questions[current];
    const buttons=[...optionsEl.querySelectorAll('button')];
    buttons.forEach(function(item,i){item.disabled=true;if(i===q.answer)item.classList.add('correct');});
    if(index===q.answer){score++;if(feedbackEl)feedbackEl.textContent='Correct. '+q.explain;}else{button.classList.add('incorrect');if(feedbackEl)feedbackEl.textContent='Not quite. '+q.explain;}
    if(nextEl)nextEl.hidden=false;
  }
  if(nextEl)nextEl.addEventListener('click',function(){
    if(current<questions.length-1){current++;showQuestion();return;}
    if(termEl)termEl.textContent='Finished';if(promptEl)promptEl.textContent='You scored '+score+' of '+questions.length+'. Review the word parts, then try again later.';
    if(optionsEl)optionsEl.innerHTML='';if(feedbackEl)feedbackEl.textContent=score>=4?'Strong start for EMT school.':'Use the table above and repeat the drill.';nextEl.hidden=true;if(restartEl)restartEl.hidden=false;
  });
  if(restartEl)restartEl.addEventListener('click',function(){current=0;score=0;restartEl.hidden=true;showQuestion();});
  if(termEl)showQuestion();
})();
