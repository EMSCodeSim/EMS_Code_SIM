(function(){
'use strict';

const STORAGE_KEY='emscodesim:emt-prep:guided-practice:v1';
function readStore(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};}catch(e){return {};}}
function writeStore(data){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}catch(e){}}
const store=readStore();
const $=(selector,root=document)=>root.querySelector(selector);
const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
function save(slug,key,value){store[slug]=store[slug]||{};store[slug][key]=value;writeStore(store);}
function load(slug,key,fallback){return store[slug]&&store[slug][key]!==undefined?store[slug][key]:fallback;}
function makeButton(text,className='btn btn-outline'){const b=el('button',className,text);b.type='button';return b;}
function setStatus(root,text,kind){const status=$('.guided-status',root);if(!status)return;status.textContent=text;status.className='guided-status'+(kind?' '+kind:'');}
function sectionShell(root,title,minutes,intro){
  root.classList.add('guided-practice');
  const heading=el('div','guided-heading');
  const copy=el('div');
  copy.append(el('div','activity-label',`Guided practice · about ${minutes} minutes`),el('h3','',title),el('p','',intro));
  const badge=el('span','guided-progress-badge','Interactive');
  heading.append(copy,badge);
  const body=el('div','guided-body');
  const status=el('p','guided-status','Complete the station, then continue to the applied activity.');
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  root.append(heading,body,status);
  return body;
}
function persistChecks(slug,root){
  root.querySelectorAll('[data-practice-check]').forEach(box=>{
    const key=box.dataset.practiceCheck;
    box.checked=!!load(slug,key,false);
    box.addEventListener('change',()=>save(slug,key,box.checked));
  });
}
function renderSequence(root,slug,config){
  const body=sectionShell(root,config.title,config.minutes,config.intro);
  const prompt=el('p','guided-instruction',config.prompt);
  const pool=el('div','sequence-pool');
  const answer=el('ol','sequence-answer');
  const controls=el('div','guided-actions');
  const check=makeButton('Check order','btn btn-blue');
  const reset=makeButton('Reset');
  controls.append(check,reset);
  let chosen=[];
  function draw(){
    pool.innerHTML='';answer.innerHTML='';
    config.items.forEach((item,index)=>{
      const b=makeButton(item.label,'sequence-choice');
      b.disabled=chosen.includes(index);
      b.addEventListener('click',()=>{chosen.push(index);draw();setStatus(root,`${chosen.length} of ${config.items.length} steps selected.`);});
      pool.appendChild(b);
    });
    chosen.forEach((index,pos)=>{
      const li=el('li','');
      li.append(el('span','sequence-number',String(pos+1)),el('span','',config.items[index].label));
      const undo=makeButton('Remove','sequence-remove');undo.addEventListener('click',()=>{chosen.splice(pos,1);draw();});li.appendChild(undo);answer.appendChild(li);
    });
  }
  check.addEventListener('click',()=>{
    if(chosen.length!==config.items.length){setStatus(root,'Select every step before checking.','warn');return;}
    const correct=chosen.every((v,i)=>v===i);
    if(correct){save(slug,'sequenceComplete',true);setStatus(root,config.success,'success');}
    else setStatus(root,config.retry,'warn');
  });
  reset.addEventListener('click',()=>{chosen=[];draw();setStatus(root,'Order cleared. Try again.');});
  body.append(prompt,pool,answer,controls);draw();
}
function renderPlanner(root,slug,config){
  const body=sectionShell(root,config.title,config.minutes,config.intro);
  const grid=el('div','planner-grid');
  const values={};
  config.fields.forEach(field=>{
    const label=el('label','planner-field');label.append(el('span','',field.label));
    const input=el('input');input.type='number';input.min=field.min||0;input.max=field.max||100;input.step=field.step||0.5;input.value=load(slug,field.key,field.default);
    input.addEventListener('input',()=>{save(slug,field.key,input.value);calculate();});
    label.append(input,el('small','',field.help||''));grid.appendChild(label);values[field.key]=input;
  });
  const output=el('div','planner-output');
  function calculate(){const result=config.calculate(Object.fromEntries(Object.entries(values).map(([k,v])=>[k,Number(v.value)||0])));output.innerHTML='';output.append(el('strong','',result.headline),el('p','',result.detail));if(result.kind)setStatus(root,result.status,result.kind);}
  body.append(grid,output);calculate();
}
function renderMatching(root,slug,config){
  const body=sectionShell(root,config.title,config.minutes,config.intro);
  const list=el('div','matching-list');
  config.rows.forEach((row,index)=>{
    const wrap=el('label','matching-row');wrap.append(el('span','matching-prompt',row.prompt));
    const select=el('select');select.dataset.answer=row.answer;select.dataset.index=String(index);select.append(el('option','','Choose an answer'));
    config.options.forEach(opt=>{const o=el('option','',opt);o.value=opt;select.appendChild(o);});
    select.value=load(slug,'match'+index,'');select.addEventListener('change',()=>save(slug,'match'+index,select.value));wrap.appendChild(select);list.appendChild(wrap);
  });
  const check=makeButton('Check answers','btn btn-blue');
  check.addEventListener('click',()=>{
    const selects=[...list.querySelectorAll('select')];let correct=0;selects.forEach(s=>{s.classList.remove('match-correct','match-incorrect');if(s.value===s.dataset.answer){correct++;s.classList.add('match-correct');}else s.classList.add('match-incorrect');});
    if(correct===selects.length){save(slug,'matchingComplete',true);setStatus(root,config.success,'success');}else setStatus(root,`${correct} of ${selects.length} correct. Review the highlighted choices and retry.`,'warn');
  });
  body.append(list,check);
}
function renderCircuit(root,slug,config){
  const body=sectionShell(root,config.title,config.minutes,config.intro);
  const grid=el('div','station-grid');
  config.stations.forEach((station,index)=>{
    const card=el('article','station-card');card.append(el('span','station-number',`Station ${index+1}`),el('h4','',station.title),el('p','',station.task));
    const link=el('a','btn btn-outline','Open simulator');link.href=station.href;link.target='_blank';link.rel='noopener';link.addEventListener('click',()=>save(slug,'opened'+index,true));
    const noteLabel=el('label','station-note');noteLabel.append(el('span','',station.record));
    const input=el('input');input.type='text';input.placeholder=station.placeholder||'Record your result';input.value=load(slug,'result'+index,'');input.addEventListener('input',()=>save(slug,'result'+index,input.value));noteLabel.appendChild(input);
    const doneLabel=el('label','station-complete');const box=el('input');box.type='checkbox';box.dataset.practiceCheck='station'+index;doneLabel.append(box,el('span','','I completed this station'));
    card.append(link,noteLabel,doneLabel);grid.appendChild(card);
  });
  const check=makeButton('Check station progress','btn btn-blue');
  check.addEventListener('click',()=>{const boxes=[...grid.querySelectorAll('[data-practice-check]')],done=boxes.filter(b=>b.checked).length;if(done===boxes.length){save(slug,'circuitComplete',true);setStatus(root,config.success,'success');}else setStatus(root,`${done} of ${boxes.length} stations marked complete. Continue through the remaining stations.`,'warn');});
  body.append(grid,check);persistChecks(slug,root);
}
function renderScenarioChoices(root,slug,config){
  const body=sectionShell(root,config.title,config.minutes,config.intro);
  const cards=el('div','scenario-grid');
  config.scenarios.forEach((scenario,index)=>{
    const card=el('fieldset','scenario-card');card.append(el('legend','',`${index+1}. ${scenario.title}`),el('p','',scenario.text));
    scenario.options.forEach((option,optIndex)=>{const label=el('label','scenario-option');const input=el('input');input.type='radio';input.name=`${slug}-scenario-${index}`;input.value=String(optIndex);if(load(slug,'scenario'+index,'')===String(optIndex))input.checked=true;input.addEventListener('change',()=>save(slug,'scenario'+index,input.value));label.append(input,el('span','',option));card.appendChild(label);});
    card.dataset.answer=String(scenario.answer);cards.appendChild(card);
  });
  const check=makeButton('Check decisions','btn btn-blue');check.addEventListener('click',()=>{let correct=0;const scenarioCards=[...cards.querySelectorAll('.scenario-card')];scenarioCards.forEach(card=>{card.classList.remove('is-correct','is-incorrect');const selected=card.querySelector('input:checked');const ok=selected&&selected.value===card.dataset.answer;if(ok){correct++;card.classList.add('is-correct');}else card.classList.add('is-incorrect');});if(correct===scenarioCards.length){save(slug,'scenarioComplete',true);setStatus(root,config.success,'success');}else setStatus(root,`${correct} of ${scenarioCards.length} priorities correct. Re-read the ABC lesson and try again.`,'warn');});
  body.append(cards,check);
}
function renderReportBuilder(root,slug,config){
  const body=sectionShell(root,config.title,config.minutes,config.intro);
  const form=el('div','report-builder');const fields={};
  config.fields.forEach(field=>{const label=el('label','report-field');label.append(el('span','',field.label));const input=field.long?el('textarea'):el('input');if(!field.long)input.type='text';input.placeholder=field.placeholder;input.value=load(slug,field.key,'');input.addEventListener('input',()=>save(slug,field.key,input.value));label.appendChild(input);form.appendChild(label);fields[field.key]=input;});
  const actions=el('div','guided-actions');const build=makeButton(config.button||'Build report','btn btn-blue');const timer=makeButton('Start 60-second timer');const clock=el('strong','report-clock','01:00');actions.append(build,timer,clock);
  const output=el('div','report-output');let interval=null,remaining=60;
  timer.addEventListener('click',()=>{if(interval)return;remaining=60;clock.textContent='01:00';interval=setInterval(()=>{remaining--;clock.textContent=`00:${String(remaining).padStart(2,'0')}`;if(remaining<=0){clearInterval(interval);interval=null;clock.textContent='Time';setStatus(root,'Time is up. Aim for a clear report that keeps only important information.','warn');}},1000);});
  build.addEventListener('click',()=>{const result=config.build(Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,v.value.trim()])));output.textContent=result;save(slug,'builtReport',result);setStatus(root,'Report built. Read it aloud, then remove anything vague or unnecessary.','success');});
  body.append(form,actions,output);
}
function renderChecklist(root,slug,config){
  const body=sectionShell(root,config.title,config.minutes,config.intro);
  const list=el('div','guided-checklist');
  config.items.forEach((item,index)=>{const label=el('label','guided-check-item');const box=el('input');box.type='checkbox';box.dataset.practiceCheck='check'+index;label.append(box,el('span','',item));list.appendChild(label);});
  const check=makeButton(config.button||'Check readiness','btn btn-blue');check.addEventListener('click',()=>{const boxes=[...list.querySelectorAll('input')];const done=boxes.filter(b=>b.checked).length;const result=config.result(done,boxes.length);setStatus(root,result.text,result.kind);if(done===boxes.length)save(slug,'checklistComplete',true);});body.append(list,check);persistChecks(slug,root);
}
function renderCostCompare(root,slug,config){
  const body=sectionShell(root,config.title,config.minutes,config.intro);
  const table=el('div','cost-compare-grid');
  const programs=['a','b'];const labels={a:'Program A',b:'Program B'};const fields=['tuition','books','fees','travel','lostWork'];const fieldLabels={tuition:'Tuition',books:'Books & supplies',fees:'Testing/background/other fees',travel:'Travel & parking',lostWork:'Lost work or childcare'};const inputs={};
  programs.forEach(p=>{const card=el('div','cost-program');card.append(el('h4','',labels[p]));inputs[p]={};fields.forEach(f=>{const label=el('label','planner-field');label.append(el('span','',fieldLabels[f]));const input=el('input');input.type='number';input.min='0';input.step='1';input.value=load(slug,`${p}-${f}`,0);input.addEventListener('input',()=>{save(slug,`${p}-${f}`,input.value);calculate();});label.appendChild(input);card.appendChild(label);inputs[p][f]=input;});table.appendChild(card);});
  const output=el('div','planner-output');
  function calculate(){const totals={};programs.forEach(p=>totals[p]=fields.reduce((sum,f)=>sum+(Number(inputs[p][f].value)||0),0));const diff=Math.abs(totals.a-totals.b);const lower=totals.a===totals.b?'Both programs currently total the same':totals.a<totals.b?'Program A currently costs less':'Program B currently costs less';output.innerHTML='';output.append(el('strong','',`${labels.a}: $${totals.a.toLocaleString()} · ${labels.b}: $${totals.b.toLocaleString()}`),el('p','',`${lower}${diff?` by $${diff.toLocaleString()}`:''}. Cost is only one factor—also verify approval, schedule, completion rate, and clinical opportunities.`));}
  body.append(table,output);calculate();
}

const modules={
  'understanding-ems':()=>renderSequence(currentRoot,'understanding-ems',{title:'Build the EMS call flow',minutes:'8–10',intro:'Put a typical call in order so dispatch, scene care, transport, transfer, and documentation form one continuous system.',prompt:'Select each step in the most logical order.',items:[{label:'Dispatch receives and prioritizes the request'},{label:'The crew responds and gathers scene information'},{label:'The EMT performs an assessment and begins care'},{label:'The crew transports and reassesses the patient'},{label:'Care is transferred with a verbal report'},{label:'The call is documented and the unit returns to service'}],success:'Correct. EMS care continues from the first information received through documentation and readiness for the next call.',retry:'The order is not quite right. Think from the first request for help through returning to service.'}),
  'emt-school-expectations':()=>renderPlanner(currentRoot,'emt-school-expectations',{title:'Build a realistic EMT-school week',minutes:'8–10',intro:'Estimate the time you can protect for class, reading, skills practice, travel, and recovery before enrolling.',fields:[{key:'class',label:'Class and lab hours per week',default:8,min:0,max:30,help:'Use the schedule from a program you are considering.'},{key:'study',label:'Independent study hours',default:8,min:0,max:30,help:'Reading, notes, flashcards, and exam review.'},{key:'travel',label:'Travel and setup hours',default:2,min:0,max:15,help:'Include commute, parking, and early arrival.'},{key:'practice',label:'Extra skills practice',default:2,min:0,max:15,help:'Open lab or practice with classmates.'}],calculate:v=>{const total=v.class+v.study+v.travel+v.practice;return{headline:`Estimated weekly commitment: ${total.toFixed(1)} hours`,detail:total<12?'This may be too little for many programs. Verify the real schedule and add protected study time.':total<=24?'This is a realistic planning range for many students, but your program may require more.':'This is a heavy weekly load. Check work, family, sleep, and transportation demands before enrolling.',status:total<12?'Increase the plan or verify the program’s expectations.':total<=24?'Your plan includes both class and outside preparation.':'Make sure this workload is sustainable.',kind:total<12?'warn':'success'};}}),
  'medical-terminology':()=>renderMatching(currentRoot,'medical-terminology',{title:'Decode common medical word parts',minutes:'10–12',intro:'Match each word part to its meaning, then use the pattern to decode unfamiliar terms.',options:['slow','fast','low or below normal','difficult or abnormal','heart','breathing','blood condition','inflammation'],rows:[{prompt:'brady-',answer:'slow'},{prompt:'tachy-',answer:'fast'},{prompt:'hypo-',answer:'low or below normal'},{prompt:'dys-',answer:'difficult or abnormal'},{prompt:'cardi/o',answer:'heart'},{prompt:'-pnea',answer:'breathing'},{prompt:'-emia',answer:'blood condition'},{prompt:'-itis',answer:'inflammation'}],success:'All matches are correct. Now practice breaking complete terms into prefix, root, and suffix.'}),
  'anatomy-physiology':()=>renderMatching(currentRoot,'anatomy-physiology',{title:'Connect findings to body systems',minutes:'10–12',intro:'Choose the body system most directly connected to each finding. Real patients can involve several systems at once.',options:['Respiratory','Cardiovascular','Nervous','Musculoskeletal','Gastrointestinal','Endocrine'],rows:[{prompt:'Wheezing and increased work of breathing',answer:'Respiratory'},{prompt:'Weak pulse and cool, pale skin',answer:'Cardiovascular'},{prompt:'Unequal pupils and confusion',answer:'Nervous'},{prompt:'Deformity after a fall',answer:'Musculoskeletal'},{prompt:'Vomiting with abdominal pain',answer:'Gastrointestinal'},{prompt:'Abnormal blood glucose with altered behavior',answer:'Endocrine'}],success:'Correct. The next step is learning how multiple systems interact during illness and injury.'}),
  'vital-signs':()=>renderCircuit(currentRoot,'vital-signs',{title:'Complete the vital-sign simulator circuit',minutes:'30–40',intro:'Open each simulator, complete the task, record one result, and mark the station complete. This turns the lesson into hands-on practice.',stations:[{title:'Manual blood pressure',href:'/vitals/bp.html',task:'Complete at least two readings and identify the systolic and diastolic values.',record:'Record one BP result',placeholder:'Example: 118/76 mmHg'},{title:'Pulse assessment',href:'/vitals/pulse.html',task:'Count a simulated pulse and describe rate and rhythm.',record:'Record rate and rhythm',placeholder:'Example: 84, regular'},{title:'Pulse oximetry',href:'/vitals/pulse-ox.html',task:'Review a reading and identify at least one factor that could make it unreliable.',record:'Reading plus limitation',placeholder:'Example: 94%; motion can affect it'},{title:'Blood glucose',href:'/vitals/bgl.html',task:'Complete a glucose scenario and connect the number to the patient presentation.',record:'Record glucose and context',placeholder:'Example: 54 mg/dL with confusion'},{title:'Pupil assessment',href:'/vitals/pupil.html',task:'Compare pupil size and reactivity, then describe the finding objectively.',record:'Record pupil finding',placeholder:'Example: equal, round, reactive'},{title:'Skin signs',href:'/vitals/skin.html',task:'Identify color, temperature, and moisture instead of writing only “normal.”',record:'Record skin finding',placeholder:'Example: pale, cool, clammy'}],success:'Vital-sign circuit complete. You practiced measurement, description, limitations, and clinical context—not just memorizing normal ranges.'}),
  'patient-assessment':()=>renderSequence(currentRoot,'patient-assessment',{title:'Build the patient-assessment flow',minutes:'12–15',intro:'Put the broad assessment phases in a safe, repeatable order before using the full patient simulator.',prompt:'Select the phases in the order you would normally organize them.',items:[{label:'Scene size-up and immediate hazards'},{label:'Primary assessment and life threats'},{label:'History and focused secondary assessment'},{label:'Baseline vital signs and monitoring'},{label:'Treatment based on findings and local direction'},{label:'Reassessment, trending, and handoff'}],success:'Correct. A repeatable structure reduces missed information while still allowing you to act immediately on life threats.',retry:'Reconsider what must happen before detailed history and what must continue after treatment.'}),
  'abc-foundations':()=>renderScenarioChoices(currentRoot,'abc-foundations',{title:'Choose the first ABC concern',minutes:'12–15',intro:'Identify the most immediate airway, breathing, or circulation concern in each short scenario.',scenarios:[{title:'Unable to speak',text:'A patient is seated upright, making weak efforts to breathe, and cannot speak or cough effectively.',options:['Airway obstruction','Minor circulation problem','Routine history first'],answer:0},{title:'Severe work of breathing',text:'A patient has an open airway but is exhausted, breathing shallowly, and becoming less alert.',options:['Breathing failure risk','Only a documentation issue','No urgent concern because the airway is open'],answer:0},{title:'Major external bleeding',text:'A patient has a patent airway and adequate breathing but blood is rapidly soaking through clothing.',options:['Delayed secondary assessment finding','Immediate circulation threat','Normal response to injury'],answer:1}],success:'All priorities are correct. ABCs are a rapid way to identify immediate threats, not a substitute for the full assessment.'}),
  'equipment-orientation':()=>renderMatching(currentRoot,'equipment-orientation',{title:'Sort common EMS equipment by purpose',minutes:'10–12',intro:'Match each item to the category it most directly supports. Actual bag layouts and approved use vary by service.',options:['PPE and scene safety','Airway and ventilation','Assessment and monitoring','Bleeding control','Movement and immobilization'],rows:[{prompt:'Eye protection and gloves',answer:'PPE and scene safety'},{prompt:'Bag-valve mask',answer:'Airway and ventilation'},{prompt:'Blood pressure cuff',answer:'Assessment and monitoring'},{prompt:'Tourniquet',answer:'Bleeding control'},{prompt:'Stair chair',answer:'Movement and immobilization'},{prompt:'Pulse oximeter',answer:'Assessment and monitoring'}],success:'Correct. Next, practice finding the same items in the bags and compartments used by your local service or school.'}),
  'communication-professionalism':()=>renderReportBuilder(currentRoot,'communication-professionalism',{title:'Build and deliver a 60-second handoff',minutes:'12–15',intro:'Enter the important facts, generate a concise report, then read it aloud against the timer.',fields:[{key:'unit',label:'Unit and patient',placeholder:'Medic 4 with a 62-year-old patient'},{key:'complaint',label:'Chief concern',placeholder:'Chest pressure for 30 minutes'},{key:'history',label:'Important history',placeholder:'History of hypertension; took aspirin'},{key:'findings',label:'Assessment and vital trends',placeholder:'Pale, BP 156/92, pulse 104 regular'},{key:'care',label:'Care and response',placeholder:'Positioned, monitored, symptoms unchanged'},{key:'eta',label:'ETA',placeholder:'8 minutes'}],build:v=>[v.unit,v.complaint,v.history,v.findings,v.care,v.eta].filter(Boolean).join('. ')+'.'}),
  'study-testing':()=>renderPlanner(currentRoot,'study-testing',{title:'Create a retrieval-practice schedule',minutes:'8–10',intro:'Plan short, repeated study sessions instead of relying on one long cram session.',fields:[{key:'days',label:'Study days per week',default:5,min:1,max:7,step:1,help:'Frequent contact usually beats one long session.'},{key:'minutes',label:'Minutes per session',default:30,min:10,max:180,step:5,help:'Include active recall, not only rereading.'},{key:'skills',label:'Skills sessions per week',default:2,min:0,max:7,step:1,help:'Use hands-on practice or verbal walkthroughs.'}],calculate:v=>{const total=v.days*v.minutes/60;return{headline:`Planned study time: ${total.toFixed(1)} hours per week`,detail:`You also scheduled ${v.skills} skills-practice session${v.skills===1?'':'s'}. Use quizzes and flashcards to find weak areas, then return to the lesson or skill—not just the answer key.`,status:v.days>=4&&v.skills>=1?'This plan includes spaced study and skills practice.':'Add more frequent retrieval or at least one skills session.',kind:v.days>=4&&v.skills>=1?'success':'warn'};}}),
  'physical-emotional-readiness':()=>renderChecklist(currentRoot,'physical-emotional-readiness',{title:'Complete a pre-course readiness check',minutes:'8–10',intro:'This is a planning tool, not a fitness or mental-health diagnosis. Check the items you can realistically support before class starts.',items:['I have a dependable transportation and backup plan.','I can protect enough sleep before class, labs, and clinical shifts.','I have discussed the weekly schedule with the people affected by it.','I know how I will manage meals, hydration, and required physical activity.','I have a plan for asking for academic or emotional support early.','I can identify at least one healthy way to decompress after difficult material.'],result:(done,total)=>({text:done===total?'All readiness areas have a plan. Revisit them when your actual course schedule is known.':`${done} of ${total} areas currently have a plan. Focus on the unchecked items before enrolling.`,kind:done===total?'success':'warn'})}),
  'enrollment-costs':()=>renderCostCompare(currentRoot,'enrollment-costs',{title:'Compare the true cost of two EMT programs',minutes:'12–15',intro:'Enter more than tuition. Include supplies, testing, travel, childcare, and missed work so the comparison reflects the real cost.'})
};

let currentRoot=null;
document.querySelectorAll('[data-guided-practice]').forEach(root=>{const slug=root.dataset.guidedPractice;const renderer=modules[slug];if(renderer){currentRoot=root;renderer();}});
})();
