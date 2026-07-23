(() => {
  const stages = [
    {id:'explore',label:'Exploring EMS',description:'Learn what EMTs and paramedics do, understand the career, and decide whether EMS fits you.',primary:['Explore EMS','/explore-ems.html'],secondary:['How to Become an EMT','/become-an-emt.html'],nav:'Start EMS'},
    {id:'pre',label:'Pre-EMT Student',description:'Find an approved program, estimate the full cost, and build a foundation before class begins.',primary:['Find an EMT Program','/emt-school-finder.html'],secondary:['Start Free EMT Prep','/emt-prep.html'],nav:'Prepare'},
    {id:'student',label:'EMT Student',description:'Strengthen terminology, vital signs, assessment skills, and study habits while completing your course.',primary:['Open Training Tools','/ems-training-tools.html'],secondary:['EMT School Success Guide','/emt-school-success.html'],nav:'Practice'},
    {id:'new',label:'New EMT',description:'Prepare for field training, improve communication, and build confidence during your first 100 shifts.',primary:['First 100 Shifts Guide','/first-100-shifts.html'],secondary:['Practice Daily Quiz','/quiz/'],nav:'Prepare'},
    {id:'career',label:'Career EMT',description:'Explore paramedic, fire, flight, hospital, education, and leadership pathways.',primary:['Explore Career Paths','/ems-career-growth.html'],secondary:['Plan Recertification','/ems-recertification.html'],nav:'Career'},
    {id:'senior',label:'Senior EMS Professional',description:'Protect career longevity, mentor others, strengthen wellness, and prepare for your next leadership chapter.',primary:['EMS Wellness','/ems-wellness.html'],secondary:['Career Growth','/ems-career-growth.html'],nav:'Career'},
    {id:'retire',label:'Retirement',description:'Plan benefits, savings, transition work, teaching, and a meaningful life after full-time EMS.',primary:['Retirement Planning','/ems-retirement.html'],secondary:['Trusted Resources','/ems-resources.html'],nav:'Career'}
  ];
  const buttons=[...document.querySelectorAll('[data-stage]')];
  const title=document.getElementById('stageTitle');
  const copy=document.getElementById('stageCopy');
  const primary=document.getElementById('stagePrimary');
  const secondary=document.getElementById('stageSecondary');
  const panel=document.querySelector('.career-stage-panel');
  let index=Math.max(0,stages.findIndex(s=>s.id===localStorage.getItem('emscodesim-career-stage')));
  function render(next,focus=false){
    index=(next+stages.length)%stages.length;
    const s=stages[index];
    buttons.forEach((b,i)=>{b.classList.toggle('active',i===index);b.setAttribute('aria-pressed',i===index?'true':'false')});
    title.textContent=s.label;
    copy.textContent=s.description;
    primary.textContent=s.primary[0]; primary.href=s.primary[1];
    secondary.textContent=s.secondary[0]; secondary.href=s.secondary[1];
    localStorage.setItem('emscodesim-career-stage',s.id);
    document.documentElement.style.setProperty('--stage-accent',index<2?'#218cff':index<5?'#30a6df':'#55c990');
    document.querySelectorAll('.nav-group').forEach(g=>g.classList.toggle('career-stage-current',g.querySelector('summary')?.textContent.trim()===s.nav));
    if(focus) buttons[index].focus({preventScroll:true});
    buttons[index].scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
  }
  buttons.forEach((b,i)=>b.addEventListener('click',()=>render(i)));
  document.getElementById('stagePrev')?.addEventListener('click',()=>render(index-1,true));
  document.getElementById('stageNext')?.addEventListener('click',()=>render(index+1,true));
  panel?.addEventListener('keydown',e=>{if(e.key==='ArrowRight')render(index+1,true);if(e.key==='ArrowLeft')render(index-1,true)});
  document.getElementById('mobileMenu')?.addEventListener('change',e=>{if(e.target.value) location.href=e.target.value});
  render(index);
})();
