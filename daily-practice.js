(function(){
  'use strict';
  const tools=[
    {name:'Blood Pressure Simulator',url:'/vitals/bp.html',note:'Practice recognizing systolic and diastolic pressure.'},
    {name:'Pulse Trainer',url:'/vitals/pulse.html',note:'Practice pulse rate, rhythm, and quality.'},
    {name:'Pulse Oximeter Simulator',url:'/vitals/pulse-ox.html',note:'Interpret SpO₂ in clinical context.'},
    {name:'Blood Glucose Simulator',url:'/vitals/bgl.html',note:'Practice glucose measurement and interpretation.'},
    {name:'Breath Sound Simulator',url:'/vitals/breath-sound-simulator.html',note:'Compare normal and abnormal breath sounds.'},
    {name:'GCS Trainer',url:'/vitals/gcs.html',note:'Practice eye, verbal, and motor scoring.'},
    {name:'Stroke Assessment Trainer',url:'/vitals/stroke.html',note:'Review a structured stroke assessment.'},
    {name:'Pupil Simulator',url:'/vitals/pupil.html',note:'Describe pupil size, equality, and reactivity.'}
  ];
  function dayIndex(){const now=new Date();const start=new Date(now.getFullYear(),0,0);return Math.floor((now-start)/86400000);}
  function set(id,text){const el=document.getElementById(id);if(el)el.textContent=text;}
  function setHref(id,url){const el=document.getElementById(id);if(el)el.href=url;}
  document.addEventListener('DOMContentLoaded',function(){
    const index=dayIndex()%tools.length;const tool=tools[index];
    const date=new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'}).format(new Date());
    set('dailyPracticeDate',date);set('dailyToolName',tool.name);set('dailyToolNote',tool.note);setHref('dailyToolLink',tool.url);
    let progress={modules:{}};try{progress=JSON.parse(localStorage.getItem('emscodesim:emt-prep:progress')||'{}');}catch(e){}
    const keys=['expectations','terminology','anatomy-physiology','vital-signs','assessment','student-habits'];
    const completed=keys.filter(k=>progress.modules&&progress.modules[k]).length;
    set('dailyPrepProgress',completed+' of 12 modules completed');
    const next=keys.find(k=>!(progress.modules&&progress.modules[k]));
    const urls={expectations:'/emt-prep/module-1-emt-school-expectations.html',terminology:'/emt-prep/module-2-medical-terminology.html','anatomy-physiology':'/emt-prep/module-3-anatomy-physiology.html','vital-signs':'/emt-prep/module-4-vital-signs.html',assessment:'/emt-prep/module-5-patient-assessment.html','student-habits':'/emt-prep/module-6-student-habits.html'};
    setHref('dailyPrepLink',next?urls[next]:'/emt-prep.html');set('dailyPrepAction',next?'Continue next module':'Review your readiness plan');
  });
})();
