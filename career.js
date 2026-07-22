
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
    exploring: ['Start with the EMT roadmap','Learn the basic requirements, compare programs, and see what the work is really like.','/become-an-emt.html'],
    student: ['Use the Student Success Center','Build a study plan, practice patient assessment, and prepare for clinical and testing days.','/emt-school-success.html'],
    newemt: ['Build a strong first year','Focus on reports, communication, safe operations, feedback, and dependable patient care.','/ems-career-growth.html#first-year'],
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
})();
