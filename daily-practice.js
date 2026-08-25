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
  // Must match emt-prep.js moduleMeta keys (legacy short keys still accepted).
  const prepModules=[
    {key:'understanding-ems',legacy:['understanding'],href:'/emt-prep/module-1-understanding-ems.html'},
    {key:'emt-school-expectations',legacy:['expectations','emt-school-expectations'],href:'/emt-prep/module-2-emt-school-expectations.html'},
    {key:'medical-terminology',legacy:['terminology'],href:'/emt-prep/module-3-medical-terminology.html'},
    {key:'anatomy-physiology',legacy:['anatomy-physiology'],href:'/emt-prep/module-4-anatomy-physiology.html'},
    {key:'vital-signs',legacy:['vital-signs'],href:'/emt-prep/module-5-vital-signs.html'},
    {key:'patient-assessment',legacy:['assessment','patient-assessment'],href:'/emt-prep/module-6-patient-assessment.html'},
    {key:'abc-foundations',legacy:['abc-foundations'],href:'/emt-prep/module-7-abc-foundations.html'},
    {key:'equipment-orientation',legacy:['equipment-orientation'],href:'/emt-prep/module-8-equipment-orientation.html'},
    {key:'communication-professionalism',legacy:['communication-professionalism'],href:'/emt-prep/module-9-communication-professionalism.html'},
    {key:'study-testing',legacy:['study-testing','student-habits'],href:'/emt-prep/module-10-study-testing.html'},
    {key:'physical-emotional-readiness',legacy:['physical-emotional-readiness'],href:'/emt-prep/module-11-physical-emotional-readiness.html'},
    {key:'enrollment-costs',legacy:['enrollment-costs'],href:'/emt-prep/module-12-enrollment-costs.html'}
  ];
  function dayIndex(){const now=new Date();const start=new Date(now.getFullYear(),0,0);return Math.floor((now-start)/86400000);}
  function set(id,text){const el=document.getElementById(id);if(el)el.textContent=text;}
  function setHref(id,url){const el=document.getElementById(id);if(el)el.href=url;}
  function moduleDone(modules,entry){
    if(!modules) return false;
    if(modules[entry.key]) return true;
    return (entry.legacy||[]).some(key=>modules[key]);
  }
  document.addEventListener('DOMContentLoaded',function(){
    const index=dayIndex()%tools.length;const tool=tools[index];
    const date=new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'}).format(new Date());
    set('dailyPracticeDate',date);set('dailyToolName',tool.name);set('dailyToolNote',tool.note);setHref('dailyToolLink',tool.url);
    let progress={modules:{}};try{progress=JSON.parse(localStorage.getItem('emscodesim:emt-prep:progress')||'{}');}catch(e){}
    const modules=progress.modules||{};
    const completed=prepModules.filter(entry=>moduleDone(modules,entry)).length;
    set('dailyPrepProgress',completed+' of 12 modules completed');
    const next=prepModules.find(entry=>!moduleDone(modules,entry));
    setHref('dailyPrepLink',next?next.href:'/emt-prep.html');
    set('dailyPrepAction',next?'Continue next module':'Review your readiness plan');
  });
})();
