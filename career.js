
(function(){
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
