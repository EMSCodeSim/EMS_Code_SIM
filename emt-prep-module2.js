(()=>{
'use strict';

const STORE_KEY='emsCodeSimModule2State';
let state={};
try{state=JSON.parse(localStorage.getItem(STORE_KEY)||'{}')||{};}catch(_){state={};}
const save=(key,value)=>{state[key]=value;try{localStorage.setItem(STORE_KEY,JSON.stringify(state));}catch(_){}};
const load=(key,fallback)=>Object.prototype.hasOwnProperty.call(state,key)?state[key]:fallback;
const one=(selector,root=document)=>root.querySelector(selector);
const all=(selector,root=document)=>[...root.querySelectorAll(selector)];
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
const button=(text,className='btn btn-outline')=>{const el=node('button',className,text);el.type='button';return el;};

function shell(root,title,label,intro){
  root.className='module2-activity';
  root.innerHTML='';
  const head=node('div','module2-activity-head');
  const copy=node('div');
  copy.append(node('div','activity-label',label),node('h3','',title),node('p','',intro));
  head.append(copy,node('span','module2-chip','Interactive'));
  const body=node('div','module2-activity-body');
  const status=node('p','module2-status','Complete the activity, then continue to the next teaching section.');
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  root.append(head,body,status);
  return body;
}
function setStatus(root,text,kind=''){
  const status=one('.module2-status',root);
  if(!status)return;
  status.textContent=text;
  status.className='module2-status'+(kind?' '+kind:'');
}
function labelChoice(name,value,text,checked=false,type='radio'){
  const label=node('label','module2-choice');
  const input=node('input');
  input.type=type;input.name=name;input.value=value;input.checked=checked;
  label.append(input,node('span','',text));
  return {label,input};
}

function renderLearningLanes(root){
  const body=shell(root,'Sort the six learning lanes','Guided practice · about 6–8 minutes','Match each realistic course activity to the setting where it most directly belongs.');
  const settings=[
    ['','Choose a learning lane'],
    ['lecture','Classroom or lecture'],
    ['lab','Skills laboratory'],
    ['clinical','Clinical experience'],
    ['field','Field experience'],
    ['written','Written or cognitive testing'],
    ['practical','Practical or psychomotor testing']
  ];
  const items=[
    ['An instructor explains shock and asks the class to compare causes.','lecture'],
    ['Students practice BVM technique on a manikin with coaching.','lab'],
    ['A student observes patient care in an approved emergency department.','clinical'],
    ['A student rides with an EMS crew under a preceptor’s direction.','field'],
    ['A timed quiz asks the student to apply assessment concepts.','written'],
    ['An evaluator scores a student performing a defined skill sequence.','practical']
  ];
  const list=node('div','module2-match-list');
  items.forEach(([prompt,answer],index)=>{
    const row=node('label','module2-match-row');
    row.dataset.answer=answer;
    row.append(node('span','',prompt));
    const select=node('select');
    select.setAttribute('aria-label',`Learning lane for item ${index+1}`);
    settings.forEach(([value,text])=>{const option=node('option','',text);option.value=value;select.append(option);});
    select.value=load(`lane-${index}`,'');
    select.addEventListener('change',()=>save(`lane-${index}`,select.value));
    row.append(select);list.append(row);
  });
  const check=button('Check matches','btn btn-blue');
  check.addEventListener('click',()=>{
    let correct=0;
    all('.module2-match-row',list).forEach(row=>{
      const select=one('select',row);const ok=select.value===row.dataset.answer;
      row.classList.toggle('match-correct',ok);row.classList.toggle('match-incorrect',!ok);
      if(ok)correct++;
    });
    const done=correct===items.length;
    save('learning-lanes-complete',done);
    setStatus(root,done?'All six activities are matched correctly. You are ready to apply the settings in a school week.':`${correct} of ${items.length} matches are correct. Review the definitions immediately above and try again.`,done?'success':'warn');
  });
  body.append(list,check);
}

function renderFirstWeek(root){
  const body=shell(root,'Your first week of EMT school','Simulation · about 8–10 minutes','Choose the response that best protects preparation, sleep, attendance, and skill development during a busy opening week.');
  const banner=node('div','module2-week-banner');
  banner.append(node('strong','','Week 1 schedule'),node('p','','Monday lecture · Wednesday skills lab · Friday quiz · regular work and family responsibilities continue.'));
  const scenarios=[
    {prompt:'The instructor assigns reading before Monday’s lecture. What is the strongest plan?',options:['Schedule two short reading blocks before class and note questions','Wait until after the lecture because the instructor will explain everything','Skim it during class while the instructor is teaching'],answer:0,why:'Brief preparation before class makes demonstrations and discussion easier to follow.'},
    {prompt:'Your first skills lab is Wednesday. What should happen before the lab?',options:['Verify required gear, review the assigned skill, and arrive ready to practice','Assume all equipment and instructions will be provided after the station begins','Skip preparation so the instructor can see your natural ability'],answer:0,why:'Skills-lab success begins before the station starts.'},
    {prompt:'A work shift makes your planned study block impossible. What is the best adjustment?',options:['Move the study block to a specific backup time and protect it on your calendar','Delete the study block and hope the quiz is easy','Plan to study all night immediately before the quiz'],answer:0,why:'A named backup time is more reliable than vague catch-up plans or lost sleep.'},
    {prompt:'You are tired after class and cannot focus. What is the most productive response?',options:['Protect sleep, then use a shorter focused review block when rested','Force several hours of ineffective review and reduce sleep further','Avoid the material until the final exam'],answer:0,why:'Sleep and recovery are part of a sustainable learning plan.'}
  ];
  const grid=node('div','module2-week-grid');
  scenarios.forEach((item,index)=>{
    const card=node('fieldset','module2-week-card');card.dataset.answer=String(item.answer);card.dataset.why=item.why;
    card.append(node('legend','',`${index+1}. ${item.prompt}`));
    item.options.forEach((text,opt)=>{
      const choice=labelChoice(`module2-week-${index}`,String(opt),text,load(`week-${index}`,'')===String(opt));
      choice.input.addEventListener('change',()=>save(`week-${index}`,choice.input.value));
      card.append(choice.label);
    });
    grid.append(card);
  });
  const check=button('Check first-week decisions','btn btn-blue');
  check.addEventListener('click',()=>{
    let correct=0;
    all('.module2-week-card',grid).forEach(card=>{
      const selected=one('input:checked',card);const ok=selected&&selected.value===card.dataset.answer;
      card.classList.toggle('is-correct',!!ok);card.classList.toggle('is-incorrect',!ok);
      let feedback=one('.module2-inline-feedback',card);if(!feedback){feedback=node('p','module2-inline-feedback');card.append(feedback);}feedback.textContent=card.dataset.why;
      if(ok)correct++;
    });
    const done=correct===scenarios.length;save('first-week-complete',done);
    setStatus(root,done?'You built a realistic opening-week approach: prepare early, use backup times, and protect recovery.':`${correct} of ${scenarios.length} choices support the strongest first-week plan. Read each explanation and revise.`,done?'success':'warn');
  });
  body.append(banner,grid,check);
}

function renderWorkload(root){
  const body=shell(root,'Weekly workload reality check','Planner · about 8–10 minutes','Enter the hours you expect to use in a normal seven-day week. There are 168 total hours.');
  const fields=[
    ['class','Class and scheduled lab',12,'Include required scheduled course time.'],
    ['travel','Travel and arrival buffer',4,'Include trips to class, lab, clinical, or field sites.'],
    ['study','Reading and study',8,'Include active recall and exam review.'],
    ['skills','Additional skills practice',4,'Include focused repetitions outside scheduled lab.'],
    ['clinical','Clinical or field experience',0,'Use the average weekly requirement when known.'],
    ['work','Paid work',40,'Include commute time here or in travel.'],
    ['family','Family and household responsibilities',18,'Include childcare, caregiving, and essential chores.'],
    ['sleep','Sleep',56,'Eight hours per night equals 56 hours.'],
    ['personal','Meals, hygiene, exercise, and recovery',21,'Three hours per day equals 21 hours.']
  ];
  const grid=node('div','module2-workload-grid');
  const inputs=[];
  fields.forEach(([key,label,defaultValue,help])=>{
    const wrap=node('label','module2-number-field');wrap.append(node('span','',label));
    const input=node('input');input.type='number';input.min='0';input.max='168';input.step='0.5';input.inputMode='decimal';input.value=String(load(`hours-${key}`,defaultValue));
    input.addEventListener('input',()=>{save(`hours-${key}`,input.value);calculate();});
    wrap.append(input,node('small','',help));grid.append(wrap);inputs.push({key,input});
  });
  const bar=node('div','module2-time-bar');const fill=node('span');bar.append(fill);
  const result=node('div','module2-workload-result');
  function calculate(){
    const total=inputs.reduce((sum,item)=>sum+(Number(item.input.value)||0),0);
    const remaining=168-total;
    const percent=Math.max(0,Math.min(100,(total/168)*100));fill.style.width=`${percent}%`;
    result.className='module2-workload-result '+(remaining>=10?'good':remaining>=0?'caution':'danger');
    result.innerHTML='';
    result.append(node('strong','',`${total.toFixed(1)} of 168 weekly hours planned`));
    let message='';
    if(remaining>=10)message=`${remaining.toFixed(1)} hours remain for unexpected demands and schedule changes. Verify that your estimates are realistic.`;
    else if(remaining>=0)message=`Only ${remaining.toFixed(1)} hours remain unplanned. Build backup transportation, childcare, meal, and study options before class begins.`;
    else message=`The plan exceeds a seven-day week by ${Math.abs(remaining).toFixed(1)} hours. Reduce or reschedule commitments before relying on this plan.`;
    result.append(node('p','',message));
    save('workload-total',total);save('workload-complete',true);
  }
  const note=node('label','module2-plan-note');note.append(node('span','','One conflict or backup I need to address'));
  const textarea=node('textarea');textarea.placeholder='Example: Ask about reducing one work shift during exam weeks and identify a backup ride to evening lab.';textarea.value=load('workload-note','');textarea.addEventListener('input',()=>save('workload-note',textarea.value));note.append(textarea);
  calculate();body.append(grid,bar,result,note);
}

function renderFeedback(root){
  const body=shell(root,'Use instructor feedback productively','Decision practice · about 7–9 minutes','Apply the four-step feedback loop: hear it, clarify it, correct it, and repeat it.');
  const scenarios=[
    {prompt:'An instructor says you skipped a safety step during a skill.',options:['Stop, identify the missed step, then restart with the correction','Explain that you usually remember it and continue unchanged','Avoid repeating the skill so the mistake is not seen again'],answer:0,why:'The exact behavior must change before repetition becomes useful.'},
    {prompt:'You do not understand what the evaluator means by “reassess sooner.”',options:['Ask which finding should trigger the reassessment and when it should occur','Pretend you understand and guess during the next attempt','Argue that the checklist never uses that exact phrase'],answer:0,why:'A focused clarification question turns general feedback into an actionable step.'},
    {prompt:'You correct the skill once after feedback.',options:['Repeat it again until the corrected sequence is dependable','Assume one correct attempt permanently fixes the problem','Move on without checking whether the correction can be repeated'],answer:0,why:'Confidence should come from repeatable corrected performance.'},
    {prompt:'You feel embarrassed after being stopped in front of classmates.',options:['Pause, listen fully, and separate the correction from your self-worth','Respond immediately while upset so the instructor knows how you feel','Refuse future coaching from that instructor'],answer:0,why:'Skills feedback describes a performance behavior, not your value as a person.'}
  ];
  const grid=node('div','module2-scenario-grid');
  scenarios.forEach((item,index)=>{
    const card=node('fieldset','module2-scenario-card');card.dataset.answer=String(item.answer);card.dataset.why=item.why;
    card.append(node('legend','',`${index+1}. ${item.prompt}`));
    item.options.forEach((text,opt)=>{
      const choice=labelChoice(`module2-feedback-${index}`,String(opt),text,load(`feedback-${index}`,'')===String(opt));
      choice.input.addEventListener('change',()=>save(`feedback-${index}`,choice.input.value));card.append(choice.label);
    });grid.append(card);
  });
  const check=button('Check feedback responses','btn btn-blue');
  check.addEventListener('click',()=>{
    let correct=0;
    all('.module2-scenario-card',grid).forEach(card=>{
      const selected=one('input:checked',card);const ok=selected&&selected.value===card.dataset.answer;
      card.classList.toggle('is-correct',!!ok);card.classList.toggle('is-incorrect',!ok);
      let feedback=one('.module2-inline-feedback',card);if(!feedback){feedback=node('p','module2-inline-feedback');card.append(feedback);}feedback.textContent=card.dataset.why;
      if(ok)correct++;
    });
    const done=correct===scenarios.length;save('feedback-complete',done);
    setStatus(root,done?'You used the full feedback loop in every situation.':`${correct} of ${scenarios.length} responses use feedback productively. Review the explanations and try again.`,done?'success':'warn');
  });
  body.append(grid,check);
}

function renderFallingBehind(root){
  const body=shell(root,'Early-warning and recovery plan','Self-check · about 6–8 minutes','Select any warning signs that could apply during a difficult week, then build a specific first response.');
  const signs=[
    'Assigned reading repeatedly remains unfinished.',
    'Quiz scores stay low even after reviewing notes.',
    'I avoid practicing one difficult skill.',
    'I lose track of due dates or attendance requirements.',
    'Sleep is repeatedly reduced to catch up.',
    'I cannot explain a concept without looking directly at notes.'
  ];
  const card=node('fieldset','module2-warning-list');card.append(node('legend','','Possible early warning signs'));
  signs.forEach((text,index)=>{
    const choice=labelChoice(`warning-${index}`,String(index),text,Boolean(load(`warning-${index}`,false)),'checkbox');
    choice.input.addEventListener('change',()=>save(`warning-${index}`,choice.input.checked));card.append(choice.label);
  });
  const action=node('label','module2-plan-note');action.append(node('span','','My first specific action'));
  const textarea=node('textarea');textarea.placeholder='Example: Email the instructor today about airway sequencing, schedule 30 minutes of focused practice Tuesday, and protect Friday’s quiz deadline.';textarea.value=load('recovery-action','');textarea.addEventListener('input',()=>save('recovery-action',textarea.value));action.append(textarea);
  const check=button('Review my recovery plan','btn btn-blue');
  check.addEventListener('click',()=>{
    const count=all('input[type="checkbox"]',card).filter(input=>input.checked).length;
    const text=textarea.value.trim();
    const specific=text.length>=25;
    card.classList.toggle('is-correct',specific);card.classList.toggle('is-incorrect',!specific);
    save('falling-behind-complete',specific);
    if(!specific){setStatus(root,'Add a specific action that names the problem, the support person or practice step, and the next deadline to protect.','warn');return;}
    setStatus(root,count?`You identified ${count} possible warning sign${count===1?'':'s'} and wrote an early action plan. Use it before a small problem becomes a course crisis.`:'Your written plan is specific. Even without current warning signs, keep it as a backup plan for a difficult week.','success');
  });
  body.append(card,action,check);
}

function renderLabReadiness(root){
  const body=shell(root,'Skills-lab readiness check','Checklist · about 4–6 minutes','Use this checklist before a lab. Your program handbook and instructor directions remain the final authority.');
  const items=[
    'I verified the lab date, time, location, and attendance rule.',
    'I reviewed the assigned skill and any required checklist or video.',
    'I know which clothing, uniform, or footwear is required.',
    'I packed required personal equipment and protective items.',
    'I planned transportation and an arrival buffer.',
    'I am prepared to verbalize steps and communicate with a partner.',
    'I expect correction and am ready to repeat the skill.',
    'I know who to contact if I am missing an item or requirement.'
  ];
  const list=node('div','module2-checklist');
  items.forEach((text,index)=>{
    const label=node('label','module2-check-item');const input=node('input');input.type='checkbox';input.checked=Boolean(load(`lab-${index}`,false));
    input.addEventListener('change',()=>{save(`lab-${index}`,input.checked);update();});label.append(input,node('span','',text));list.append(label);
  });
  const profile=node('div','module2-profile-card');
  function update(){
    const checked=all('input',list).filter(input=>input.checked).length;
    profile.innerHTML='';profile.append(node('strong','',`${checked} of ${items.length} readiness steps checked`));
    profile.append(node('p','',checked===items.length?'You have a complete pre-lab preparation checklist. Recheck it against your program’s local requirements.':checked>=5?'Good start. Resolve the unchecked items before the lab begins.':'Several preventable lab problems remain. Use the unchecked items to build your preparation list.'));
    const done=checked===items.length;save('lab-readiness-complete',done);
    setStatus(root,done?'Skills-lab readiness checklist complete.':'Check the remaining items before your next skills lab.',done?'success':'');
  }
  update();body.append(list,profile);
}

function renderTwoWeekPlan(root){
  const body=shell(root,'Build your first two weeks','Capstone planner · about 10–15 minutes','Combine class, preparation, skills, logistics, and support into a realistic opening plan.');
  const grid=node('div','module2-two-week-grid');
  const fieldDefs=[
    ['schedule','Required schedule','Class, lab, quiz, orientation, work, family, travel'],
    ['prepare','Before-class preparation','Reading, terminology review, questions to bring'],
    ['practice','Skills and study blocks','Named days and realistic block lengths'],
    ['backup','Logistics and backup plan','Transportation, childcare, meals, sleep, missed-work plan'],
    ['support','Support or question','Instructor contact, study partner, tutoring, program question']
  ];
  const textareas=[];
  [1,2].forEach(week=>{
    const panel=node('section','module2-plan-week');panel.append(node('h4','',`Week ${week}`));
    fieldDefs.forEach(([key,label,placeholder])=>{
      const wrap=node('label','module2-plan-field');wrap.append(node('span','',label));
      const textarea=node('textarea');textarea.placeholder=placeholder;textarea.value=load(`plan-w${week}-${key}`,'');
      textarea.addEventListener('input',()=>save(`plan-w${week}-${key}`,textarea.value));wrap.append(textarea);panel.append(wrap);textareas.push({week,key,label,textarea});
    });grid.append(panel);
  });
  const actions=node('div','module2-actions');const generate=button('Build my two-week plan','btn btn-blue');const clear=button('Clear planner','btn btn-outline');
  const output=node('div','module2-plan-output','Complete the fields above, then build your plan.');output.setAttribute('aria-live','polite');
  generate.addEventListener('click',()=>{
    const lines=[];let completed=0;
    [1,2].forEach(week=>{
      lines.push(`WEEK ${week}`);
      textareas.filter(item=>item.week===week).forEach(item=>{const value=item.textarea.value.trim();if(value)completed++;lines.push(`${item.label}: ${value||'Not yet planned'}`);});lines.push('');
    });
    output.textContent=lines.join('\n').trim();
    const ready=completed>=8;save('two-week-plan-complete',ready);
    setStatus(root,ready?'Your two-week plan includes the major course, preparation, practice, logistics, and support categories. Verify it against your actual program schedule.':`${completed} of 10 planning fields contain details. Add the missing schedule, preparation, logistics, or support items before relying on this plan.`,ready?'success':'warn');
  });
  clear.addEventListener('click',()=>{
    textareas.forEach(item=>{item.textarea.value='';save(`plan-w${item.week}-${item.key}`,'');});output.textContent='Complete the fields above, then build your plan.';save('two-week-plan-complete',false);setStatus(root,'Planner cleared. Add a new two-week plan when ready.');
  });
  actions.append(generate,clear);body.append(grid,actions,output);
}

const renderers={
  'learning-lanes':renderLearningLanes,
  'first-week':renderFirstWeek,
  'workload':renderWorkload,
  'feedback':renderFeedback,
  'falling-behind':renderFallingBehind,
  'lab-readiness':renderLabReadiness,
  'two-week-plan':renderTwoWeekPlan
};
all('[data-module2-activity]').forEach(root=>{const renderer=renderers[root.dataset.module2Activity];if(renderer)renderer(root);});
})();
