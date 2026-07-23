
(function(){

  const navGroups=[...document.querySelectorAll('[data-nav-group]')];
  navGroups.forEach(function(group){group.addEventListener('toggle',function(){if(!group.open)return;navGroups.forEach(function(other){if(other!==group)other.open=false;});});});
  document.addEventListener('click',function(event){if(!event.target.closest('.nav-group'))navGroups.forEach(function(group){group.open=false;});});
  document.addEventListener('keydown',function(event){if(event.key==='Escape')navGroups.forEach(function(group){group.open=false;});});

  const mobile = document.getElementById('mobileMenu');
  if(mobile){
    mobile.addEventListener('change', function(){
      if(!this.value) return;
      if(this.value.startsWith('#')) location.hash = this.value;
      else location.href = this.value;
    });
  }

  const stage = document.getElementById('careerStage');
  const result = document.getElementById('careerStageResult');
  const recommendations = {
    exploring: ['Explore EMS before you enroll','Learn what EMTs really do, take the career-fit quiz, and build a high-school preparation plan.','/explore-ems.html'],
    ready: ['Start the EMT entry roadmap','Compare programs, costs, certification, state authorization, and first-job options.','/become-an-emt.html'],
    student: ['Use the Student Success Center','Build a study plan, practice patient assessment, and prepare for clinical and testing days.','/emt-school-success.html'],
    newemt: ['Build a strong first 100 shifts','Prepare for field training, patient care, reports, communication, safety, feedback, and dependable habits.','/first-100-shifts.html'],
    experienced: ['Choose your next EMS path','Compare paramedic, critical care, fire-based EMS, education, leadership, community paramedicine, and other options.','/ems-career-growth.html'],
    leadership: ['Develop beyond the ambulance','Create a plan for field training, instruction, supervision, quality improvement, administration, or emergency management.','/ems-career-growth.html#leadership'],
    retirement: ['Protect the career you built','Review benefits, health, identity, transition work, and financial planning resources before your final shift.','/ems-retirement.html']
  };
  function updateStage(){
    if(!stage || !result) return;
    const data = recommendations[stage.value];
    if(!data){result.innerHTML='<strong>Select your current stage.</strong><span>Your recommended starting point will appear here.</span>';return;}
    result.innerHTML='<strong>'+data[0]+'</strong><span>'+data[1]+' <a href="'+data[2]+'">Open guide →</a></span>';
  }
  if(stage){stage.addEventListener('change',updateStage);updateStage();}

  document.querySelectorAll('[data-persist-checklist]').forEach(function(list){
    const key='emscodesim:'+list.dataset.persistChecklist;
    const boxes=list.querySelectorAll('input[type="checkbox"]');
    let saved={};
    try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch(e){}
    boxes.forEach(function(box){
      box.checked=!!saved[box.id];
      box.addEventListener('change',function(){
        saved[box.id]=box.checked;
        try{localStorage.setItem(key,JSON.stringify(saved))}catch(e){}
      });
    });
  });

  const jobForm=document.getElementById('jobSearchForm');
  if(jobForm){
    jobForm.addEventListener('submit',function(e){
      e.preventDefault();
      const level=document.getElementById('jobLevel').value;
      const location=document.getElementById('jobLocation').value.trim();
      const terms=encodeURIComponent(level+' jobs '+(location?'in '+location:'near me'));
      window.open('https://www.google.com/search?q='+terms,'_blank','noopener');
    });
  }

  const shiftCount=document.getElementById('shiftCount');
  const shiftBar=document.getElementById('shiftProgressBar');
  const shiftResult=document.getElementById('shiftStageResult');
  const shiftKey='emscodesim:first100:shiftCount';
  const shiftStages=[
    {max:0,title:'Ready to begin',text:'Use the hiring and first-shift sections to prepare before your first field shift.'},
    {max:10,title:'Shifts 1–10: Learn the system',text:'Focus on safety, equipment, routines, accurate vital signs, patient introductions, and being coachable.'},
    {max:25,title:'Shifts 11–25: Build assessment flow',text:'Lead appropriate portions of calls, organize interviews, improve verbal reports, and correct documentation from feedback.'},
    {max:50,title:'Shifts 26–50: Become consistent',text:'Work toward reliable assessments, reassessment, safe movement, complete reports, and appropriate escalation under pressure.'},
    {max:75,title:'Shifts 51–75: Anticipate needs',text:'Strengthen teamwork, notice trends, plan ahead, protect patient dignity, and ask for feedback on judgment.'},
    {max:99,title:'Shifts 76–99: Build trust',text:'Review patterns, refine weak areas, understand renewal responsibilities, and become a teammate others can depend on.'},
    {max:100,title:'100 shifts completed',text:'This milestone is a beginning, not an endpoint. Keep seeking feedback, practicing deliberately, and protecting your health.'}
  ];
  function updateShiftTracker(){
    if(!shiftCount||!shiftBar||!shiftResult) return;
    let value=Number.parseInt(shiftCount.value,10);
    if(Number.isNaN(value)) value=0;
    value=Math.max(0,Math.min(100,value));
    shiftCount.value=value;
    shiftBar.style.width=value+'%';
    const stage=shiftStages.find(function(item){return value<=item.max;})||shiftStages[shiftStages.length-1];
    shiftResult.innerHTML='<strong>'+stage.title+'</strong><span>'+stage.text+'</span>';
    try{localStorage.setItem(shiftKey,String(value));}catch(e){}
  }
  if(shiftCount){
    try{const saved=localStorage.getItem(shiftKey);if(saved!==null) shiftCount.value=saved;}catch(e){}
    shiftCount.addEventListener('input',updateShiftTracker);
    shiftCount.addEventListener('change',updateShiftTracker);
    updateShiftTracker();
  }

  const reflectionFields=['reflectionWentWell','reflectionImprove','reflectionNext','reflectionQuestion'];
  const reflectionKey='emscodesim:first100:reflection';
  const reflectionStatus=document.getElementById('reflectionStatus');
  function setReflectionStatus(message){
    if(!reflectionStatus) return;
    reflectionStatus.textContent=message;
    window.clearTimeout(setReflectionStatus.timer);
    setReflectionStatus.timer=window.setTimeout(function(){reflectionStatus.textContent='';},3000);
  }
  if(document.getElementById('saveReflection')){
    try{
      const saved=JSON.parse(localStorage.getItem(reflectionKey)||'{}');
      reflectionFields.forEach(function(id){const field=document.getElementById(id);if(field&&saved[id]) field.value=saved[id];});
    }catch(e){}
    document.getElementById('saveReflection').addEventListener('click',function(){
      const note={};
      reflectionFields.forEach(function(id){const field=document.getElementById(id);if(field) note[id]=field.value;});
      try{localStorage.setItem(reflectionKey,JSON.stringify(note));setReflectionStatus('Reflection saved on this device.');}
      catch(e){setReflectionStatus('Unable to save in this browser.');}
    });
    document.getElementById('clearReflection').addEventListener('click',function(){
      reflectionFields.forEach(function(id){const field=document.getElementById(id);if(field) field.value='';});
      try{localStorage.removeItem(reflectionKey);}catch(e){}
      setReflectionStatus('Reflection cleared.');
    });
  }

})();

(function(){
  const quiz=document.getElementById('emsFitQuiz');
  const quizResult=document.getElementById('emsFitResult');
  const quizKey='emscodesim:explore:fitResult';
  function showFitResult(score,shouldScroll){
    if(!quizResult) return;
    let title,text,next;
    if(score>=16){
      title='EMS may be a strong career to explore';
      text='Your answers suggest that you may enjoy patient contact, teamwork, practical problem-solving, responsibility, and continued learning. The next step is real-world exploration—not assuming the job will be perfect.';
      next='Talk with a working clinician or EMS educator, then compare approved EMT programs.';
    }else if(score>=10){
      title='EMS is worth exploring further';
      text='Some parts of EMS appear to fit you, while other parts deserve a closer look. Many successful EMTs began unsure about blood, communication, stress, or confidence and improved through safe exposure and practice.';
      next='Attend a career event, take CPR or first aid, and ask an EMS professional about the parts that concern you.';
    }else{
      title='Learn more before making a commitment';
      text='Your current preferences may not line up with several common EMS demands, but this result is not a rejection. You may discover that a different healthcare, public-safety, technical, or support role fits you better—or that your interests change with experience.';
      next='Explore several careers and focus on the answers that made you hesitate.';
    }
    quizResult.hidden=false;
    quizResult.innerHTML='<p class="result-score">Exploration score: '+score+' of 20</p><h3>'+title+'</h3><p>'+text+'</p><p><strong>Recommended next step:</strong> '+next+'</p><p><a href="/become-an-emt.html">Continue to the EMT roadmap →</a></p>';
    try{localStorage.setItem(quizKey,String(score));}catch(e){}
    if(shouldScroll!==false) quizResult.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  if(quiz){
    quiz.addEventListener('submit',function(e){
      e.preventDefault();
      const data=new FormData(quiz);
      let score=0,answered=0;
      for(let i=1;i<=10;i++){
        const value=data.get('q'+i);
        if(value!==null){score+=Number(value);answered++;}
      }
      if(answered<10){
        if(quizResult){quizResult.hidden=false;quizResult.innerHTML='<h3>Answer all ten questions</h3><p>Choose the response that is most honest today. There are no wrong answers.</p>';}
        return;
      }
      showFitResult(score,true);
    });
    quiz.addEventListener('reset',function(){
      window.setTimeout(function(){if(quizResult){quizResult.hidden=true;quizResult.innerHTML='';}try{localStorage.removeItem(quizKey);}catch(e){}},0);
    });
    try{const saved=localStorage.getItem(quizKey);if(saved!==null) showFitResult(Number(saved),false);}catch(e){}
  }

  const grade=document.getElementById('highSchoolGrade');
  const gradeResult=document.getElementById('gradePlanResult');
  const gradePlans={
    middle:['Explore without pressure','Build strong reading, science, teamwork, and communication habits. Learn basic first aid and attend a career day or public-safety open house with an adult.'],
    freshman:['Build the foundation','Choose science, health, communication, and physical-education opportunities. Ask whether your school has HOSA, health science, CTE, or public-safety programs.'],
    sophomore:['Get closer to the work','Consider CPR/first aid, medical terminology, agency open houses, and approved youth or cadet programs. Start researching local EMT course age rules and total costs.'],
    junior:['Compare real pathways','Look for dual-enrollment, CTE, EMR, or EMT options. Talk with a counselor and compare state-approved programs, schedules, transportation, prerequisites, and clinical requirements.'],
    senior:['Prepare for the transition','Confirm age and graduation requirements, apply to an approved course, plan for fees and transportation, protect your driving record, and build a basic résumé.'],
    graduate:['Use the full EMT roadmap','Compare approved programs and complete the required education, certification, state authorization, and employer steps without assuming one national rule applies everywhere.']
  };
  function updateGradePlan(){
    if(!grade||!gradeResult) return;
    const plan=gradePlans[grade.value];
    gradeResult.innerHTML='<strong>'+plan[0]+'</strong><span>'+plan[1]+'</span>';
  }
  if(grade){grade.addEventListener('change',updateGradePlan);updateGradePlan();}
})();

(function(){
  const level=document.getElementById('recertLevel');
  const national=document.getElementById('nationalCredits');
  const local=document.getElementById('localCredits');
  const individual=document.getElementById('individualCredits');
  const reset=document.getElementById('resetCeTracker');
  const key='emscodesim:recert:ceTracker';
  const requirements={emt:{national:20,local:10,individual:10,total:40,label:'EMT'},paramedic:{national:30,local:15,individual:15,total:60,label:'Paramedic'}};
  const clean=function(value){const n=Number.parseFloat(value);return Number.isFinite(n)?Math.max(0,n):0;};
  const format=function(value){return Number.isInteger(value)?String(value):value.toFixed(1);};
  function updateCeTracker(save){
    if(!level||!national||!local||!individual) return;
    const req=requirements[level.value]||requirements.emt;
    const values={national:clean(national.value),local:clean(local.value),individual:clean(individual.value)};
    const total=values.national+values.local+values.individual;
    ['national','local','individual'].forEach(function(type){
      const text=document.getElementById(type+'Text');
      const bar=document.getElementById(type+'Bar');
      const pct=Math.min(100,(values[type]/req[type])*100);
      if(text) text.textContent=format(values[type])+' of '+format(req[type]);
      if(bar) bar.style.width=pct+'%';
    });
    const totalText=document.getElementById('totalText');
    const totalBar=document.getElementById('totalBar');
    const status=document.getElementById('ceStatus');
    if(totalText) totalText.textContent=format(total)+' of '+format(req.total);
    if(totalBar) totalBar.style.width=Math.min(100,(total/req.total)*100)+'%';
    const complete=values.national>=req.national&&values.local>=req.local&&values.individual>=req.individual;
    if(status){
      if(complete) status.innerHTML='<strong>All three NCCP components meet the displayed '+req.label+' minimums.</strong>Verify each course, state requirements, skills verification, and application status before relying on this result.';
      else{
        const remaining=[];
        if(values.national<req.national) remaining.push(format(req.national-values.national)+' national');
        if(values.local<req.local) remaining.push(format(req.local-values.local)+' local/state');
        if(values.individual<req.individual) remaining.push(format(req.individual-values.individual)+' individual');
        status.innerHTML='<strong>Still needed for the displayed NCCP minimum:</strong> '+remaining.join(', ')+' credit'+(remaining.length===1?'':'s')+'.';
      }
    }
    if(save!==false){try{localStorage.setItem(key,JSON.stringify({level:level.value,national:values.national,local:values.local,individual:values.individual}));}catch(e){}}
  }
  if(level&&national&&local&&individual){
    try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&requirements[saved.level]){level.value=saved.level;national.value=saved.national||0;local.value=saved.local||0;individual.value=saved.individual||0;}}catch(e){}
    [level,national,local,individual].forEach(function(control){control.addEventListener('input',function(){updateCeTracker(true);});control.addEventListener('change',function(){updateCeTracker(true);});});
    if(reset) reset.addEventListener('click',function(){level.value='emt';national.value=0;local.value=0;individual.value=0;try{localStorage.removeItem(key);}catch(e){}updateCeTracker(false);});
    updateCeTracker(false);
  }

  const state=document.getElementById('stateOffice');
  const stateLink=document.getElementById('openStateOffice');
  const stateResult=document.getElementById('stateOfficeResult');
  const stateKey='emscodesim:recert:selectedState';
  function updateStateOffice(){
    if(!state||!stateLink||!stateResult) return;
    const code=state.value;
    if(!code){stateLink.href='https://www.nremt.org/resources/state-ems-offices';stateLink.classList.add('disabled-link');stateLink.setAttribute('aria-disabled','true');stateResult.textContent='Choose a state to open its current EMS agency contact page.';return;}
    const name=state.options[state.selectedIndex].text;
    stateLink.href='https://www.nremt.org/resources/state-ems-offices/'+code;
    stateLink.classList.remove('disabled-link');stateLink.removeAttribute('aria-disabled');
    stateResult.innerHTML='<strong>'+name+' selected.</strong> Open the official reference, then verify renewal details directly on the state EMS website listed there.';
    try{localStorage.setItem(stateKey,code);}catch(e){}
  }
  if(state){try{const saved=localStorage.getItem(stateKey);if(saved&&state.querySelector('option[value="'+saved+'"]')) state.value=saved;}catch(e){}state.addEventListener('change',updateStateOffice);updateStateOffice();}
})();
