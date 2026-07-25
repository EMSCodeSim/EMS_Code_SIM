(function(){
'use strict';

const STORAGE='emscodesim:emt-prep:module1:v1';
function readStore(){try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')||{};}catch(e){return {};}}
function writeStore(data){try{localStorage.setItem(STORAGE,JSON.stringify(data));}catch(e){}}
const store=readStore();
const save=(k,v)=>{store[k]=v;writeStore(store);};
const load=(k,f)=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:f;
const q=(sel,root=document)=>root.querySelector(sel);
const qa=(sel,root=document)=>[...root.querySelectorAll(sel)];
const el=(tag,className,text)=>{const n=document.createElement(tag); if(className)n.className=className; if(text!==undefined)n.textContent=text; return n;};
const btn=(text,cls='btn btn-outline')=>{const b=el('button',cls,text); b.type='button'; return b;};

function createShell(root, title, label, intro){
  root.className='module1-activity';
  root.innerHTML='';
  const head=el('div','module1-activity-head');
  const copy=el('div');
  copy.append(el('div','activity-label',label), el('h3','',title), el('p','',intro));
  head.append(copy, el('span','module1-chip','Interactive'));
  const body=el('div','module1-activity-body');
  const status=el('p','module1-status','Complete the activity, then continue with the lesson.');
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  root.append(head, body, status);
  return {body,status};
}
function setStatus(root,text,kind=''){
  const status=q('.module1-status',root);
  if(!status) return;
  status.textContent=text;
  status.className='module1-status'+(kind?` ${kind}`:'');
}

function renderDispatch(root){
  const {body}=createShell(root,'First-call challenge','Interactive station · about 6–8 minutes','Work through the opening dispatch as if you were responding. Identify what you know, what is missing, and what the crew should begin thinking about.');
  const wrap=el('div','module1-two-col');
  const left=el('div','module1-card');
  left.append(el('h4','', 'Dispatch snapshot'));
  const call = el('blockquote','module1-callout','“Medic 4, Ambulance 2—respond to a 68-year-old male with chest discomfort and difficulty breathing.”');
  left.append(call, el('p','', 'Choose the best responses below, then check your answers.'));

  const right=el('div','module1-qa-list');

  const q1=el('fieldset','module1-question');
  q1.append(el('legend','', '1. Which details do you already know from dispatch? Select every correct answer.'));
  [
    ['ageSex','68-year-old male',true],
    ['complaint','Chest discomfort',true],
    ['breathing','Difficulty breathing',true],
    ['vitals','Exact vital signs',false],
    ['history','Complete medical history',false]
  ].forEach(([key,label])=>{
    const lab=el('label','module1-choice');
    const input=el('input'); input.type='checkbox'; input.dataset.key=key; input.checked=!!load('dispatch-'+key,false); input.addEventListener('change',()=>save('dispatch-'+key,input.checked));
    lab.append(input, el('span','',label)); q1.append(lab);
  });

  const q2=el('fieldset','module1-question');
  q2.append(el('legend','', '2. What is one important thing still missing?'));
  [
    ['location','The exact location / access details',true],
    ['nothing','Nothing else—the crew knows everything needed',false],
    ['diagnosis','A final medical diagnosis before arrival',false],
    ['billing','The patient’s insurance information',false]
  ].forEach(([key,label])=>{
    const lab=el('label','module1-choice');
    const input=el('input'); input.type='radio'; input.name='dispatch-q2'; input.value=key; if(load('dispatch-q2','')===key) input.checked=true; input.addEventListener('change',()=>save('dispatch-q2',key));
    lab.append(input, el('span','',label)); q2.append(lab);
  });

  const q3=el('fieldset','module1-question');
  q3.append(el('legend','', '3. What should the crew start thinking about on the way?'));
  [
    ['priorities','Scene safety, likely cardiac/respiratory issues, and needed equipment',true],
    ['meds','Which hospital room number the patient will go to',false],
    ['social','Whether the patient will be friendly',false],
    ['skip','Nothing until arriving on scene',false]
  ].forEach(([key,label])=>{
    const lab=el('label','module1-choice');
    const input=el('input'); input.type='radio'; input.name='dispatch-q3'; input.value=key; if(load('dispatch-q3','')===key) input.checked=true; input.addEventListener('change',()=>save('dispatch-q3',key));
    lab.append(input, el('span','',label)); q3.append(lab);
  });

  const actions=el('div','module1-actions');
  const check=btn('Check answers','btn btn-blue');
  check.addEventListener('click',()=>{
    const correctChecks = {
      ageSex:true, complaint:true, breathing:true, vitals:false, history:false
    };
    let score=0, total=3;
    const checkboxes=qa('input[type="checkbox"]',q1);
    const boxCorrect = checkboxes.every(box=>box.checked===correctChecks[box.dataset.key]);
    q1.classList.toggle('is-correct',boxCorrect); q1.classList.toggle('is-incorrect',!boxCorrect);
    if(boxCorrect) score++;
    const ans2=q('input[name="dispatch-q2"]:checked',q2); const ok2=ans2 && ans2.value==='location';
    q2.classList.toggle('is-correct',!!ok2); q2.classList.toggle('is-incorrect',!ok2); if(ok2) score++;
    const ans3=q('input[name="dispatch-q3"]:checked',q3); const ok3=ans3 && ans3.value==='priorities';
    q3.classList.toggle('is-correct',!!ok3); q3.classList.toggle('is-incorrect',!ok3); if(ok3) score++;
    setStatus(root, score===total ? 'Nice start. You identified the dispatch information, recognized what is missing, and started thinking like a responding EMT.' : `${score} of ${total} correct. Re-check the dispatch details and what the crew should be thinking about before arrival.`, score===total ? 'success' : 'warn');
    save('dispatch-complete', score===total);
  });
  const reset=btn('Reset');
  reset.addEventListener('click',()=>{
    qa('input',root).forEach(input=>{ if(input.type==='checkbox'||input.type==='radio') input.checked=false; });
    ['ageSex','complaint','breathing','vitals','history'].forEach(k=>save('dispatch-'+k,false));
    save('dispatch-q2',''); save('dispatch-q3','');
    [q1,q2,q3].forEach(s=>s.classList.remove('is-correct','is-incorrect'));
    setStatus(root,'Answers cleared. Try the first-call challenge again.');
  });
  actions.append(check,reset);
  right.append(q1,q2,q3,actions);
  wrap.append(left,right);
  body.append(wrap);
}

function renderTimeline(root){
  const {body}=createShell(root,'Build the EMS call timeline','Interactive station · about 8 minutes','Put the main stages of a typical EMS response in order. The goal is to see the call as one connected system.');
  const intro=el('p','module1-helper','Select the stages in the order you think they happen. Use remove if you need to change the sequence.');
  const pool=el('div','module1-choice-grid');
  const answer=el('ol','module1-sequence');
  const items=[
    'Someone calls 911 and information is gathered',
    'Dispatcher prioritizes the call and sends resources',
    'Crew responds and begins scene size-up',
    'EMT assesses the patient and begins care',
    'Crew transports and reassesses as needed',
    'Hospital handoff and transfer of care occur',
    'Documentation, restocking, and return to service'
  ];
  let chosen = Array.isArray(load('timeline-order',null)) ? load('timeline-order',[]) : [];
  function draw(){
    pool.innerHTML=''; answer.innerHTML='';
    items.forEach((label,index)=>{
      const b=btn(label,'module1-pick'); b.disabled=chosen.includes(index); b.addEventListener('click',()=>{chosen.push(index); save('timeline-order',chosen); draw(); setStatus(root,`${chosen.length} of ${items.length} stages placed.`);}); pool.appendChild(b);
    });
    chosen.forEach((index,pos)=>{
      const li=el('li','module1-sequence-item');
      li.append(el('span','module1-order-number',String(pos+1)), el('span','',items[index]));
      const remove=btn('Remove','module1-remove'); remove.addEventListener('click',()=>{chosen.splice(pos,1); save('timeline-order',chosen); draw();});
      li.append(remove); answer.append(li);
    });
  }
  const actions=el('div','module1-actions');
  const check=btn('Check order','btn btn-blue');
  check.addEventListener('click',()=>{
    if(chosen.length!==items.length){ setStatus(root,'Place all stages before checking the timeline.','warn'); return; }
    const ok=chosen.every((v,i)=>v===i);
    setStatus(root, ok ? 'Correct. An EMS call continues through handoff, documentation, and readiness for the next call.' : 'Not quite. Reconsider what happens before patient contact and what still matters after arrival at the hospital.', ok?'success':'warn');
    save('timeline-complete',ok);
  });
  const reset=btn('Reset');
  reset.addEventListener('click',()=>{chosen=[]; save('timeline-order',chosen); draw(); setStatus(root,'Timeline cleared. Build it again from the beginning.');});
  actions.append(check,reset);
  body.append(intro,pool,answer,actions);
  draw();
}

function renderTeamMatch(root){
  const {body}=createShell(root,'Who handles this?','Interactive station · about 6–8 minutes','Match common tasks to the EMS-system member most likely to handle them. This helps students see EMS as a coordinated team.');
  const table=el('div','module1-match-list');
  const options=['Choose a role','Dispatcher','EMT','Paramedic','Medical director','Hospital care team','Quality-improvement staff'];
  const rows=[
    ['Answers the initial emergency call','Dispatcher'],
    ['Provides foundational field assessment and care','EMT'],
    ['May provide advanced medications and cardiac care','Paramedic'],
    ['Provides clinical oversight and protocol authority','Medical director'],
    ['Receives the patient at the emergency department','Hospital care team'],
    ['Reviews reports for improvement opportunities','Quality-improvement staff']
  ];
  rows.forEach((row,index)=>{
    const label=el('label','module1-match-row');
    label.append(el('span','',row[0]));
    const select=el('select');
    options.forEach(opt=>{ const o=el('option','',opt); o.value=opt; select.append(o); });
    select.value=load(`team-${index}`,'Choose a role'); select.dataset.answer=row[1]; select.addEventListener('change',()=>save(`team-${index}`,select.value));
    label.append(select);
    table.append(label);
  });
  const check=btn('Check matches','btn btn-blue');
  check.addEventListener('click',()=>{
    const selects=qa('select',table); let correct=0;
    selects.forEach(sel=>{ const ok=sel.value===sel.dataset.answer; sel.classList.toggle('match-correct',ok); sel.classList.toggle('match-incorrect',!ok); if(ok) correct++; });
    const done=correct===selects.length;
    setStatus(root, done ? 'All matches are correct. The EMT is one important part of a larger EMS system.' : `${correct} of ${selects.length} correct. Review the highlighted roles and try again.`, done?'success':'warn');
    save('team-complete',done);
  });
  body.append(table,check);
}

function renderProviderSort(root){
  const {body}=createShell(root,'Sort provider levels','Interactive station · about 7–9 minutes','Match the general description to the provider level it most closely fits. Exact scopes vary by state and service.');
  const note=el('p','module1-helper','Use this as a broad mental model only. Always verify local titles, scope, and agency policy.');
  const list=el('div','module1-match-list');
  const options=['Choose a level','EMR','EMT','AEMT','Paramedic'];
  const rows=[
    ['Often provides immediate care in first-response settings while awaiting transport resources','EMR'],
    ['Provides foundational out-of-hospital assessment, BLS care, transport, and documentation','EMT'],
    ['Sits between EMT and paramedic in some systems with additional skills and medications','AEMT'],
    ['Typically provides the broadest prehospital assessment and advanced interventions in the field','Paramedic'],
    ['This level is commonly the starting point for ambulance-based entry into EMS','EMT'],
    ['This level does not have identical scope in every state','Paramedic']
  ];
  rows.forEach((row,index)=>{
    const label=el('label','module1-match-row');
    label.append(el('span','',row[0]));
    const select=el('select');
    options.forEach(opt=>{const o=el('option','',opt); o.value=opt; select.append(o);});
    select.value=load(`provider-${index}`,'Choose a level'); select.dataset.answer=row[1]; select.addEventListener('change',()=>save(`provider-${index}`,select.value));
    label.append(select); list.append(label);
  });
  const check=btn('Check sorting','btn btn-blue');
  check.addEventListener('click',()=>{
    const selects=qa('select',list); let correct=0;
    selects.forEach(sel=>{ const ok=sel.value===sel.dataset.answer; sel.classList.toggle('match-correct',ok); sel.classList.toggle('match-incorrect',!ok); if(ok) correct++; });
    const done=correct===selects.length;
    setStatus(root, done ? 'Good work. You built a basic mental picture of the provider ladder while remembering that local scope still matters.' : `${correct} of ${selects.length} correct. Review EMT, AEMT, and paramedic differences and try again.`, done?'success':'warn');
    save('provider-complete',done);
  });
  body.append(note,list,check);
}

function renderScopeDecisions(root){
  const {body}=createShell(root,'Is this within the EMT role?','Interactive station · about 8–10 minutes','Read each short situation and choose the best EMT response. These are professionalism and scope questions, not advanced medical scenarios.');
  const scenarios=[
    {
      title:'Diagnosis request',
      text:'A family member asks the EMT to tell them exactly what disease is causing the patient’s chest pain.',
      options:['Give the most likely diagnosis immediately','Explain that the EMT will assess, treat immediate concerns, and communicate findings within scope','Avoid speaking to the family at all'],
      answer:1
    },
    {
      title:'Scene photo',
      text:'A dramatic call makes you want to post a scene photo online after shift because no patient name is shown.',
      options:['Post it because there is no name attached','Do not post patient or scene material; protect privacy and professionalism','Send it privately to friends for entertainment'],
      answer:1
    },
    {
      title:'Outside your scope',
      text:'A procedure is suggested that you were never trained or authorized to perform locally.',
      options:['Perform it anyway to look confident','State your concern, work within your training and local direction, and ask for help','Ignore the issue and document later'],
      answer:1
    },
    {
      title:'After treatment',
      text:'A patient says they feel a little better after care is given.',
      options:['Assume improvement and stop checking','Reassess the patient and document response and trends','Wait for the hospital staff to reassess instead'],
      answer:1
    }
  ];
  const cards=el('div','module1-scenario-grid');
  scenarios.forEach((sc,index)=>{
    const field=el('fieldset','module1-scenario');
    field.dataset.answer=String(sc.answer);
    field.append(el('legend','',`${index+1}. ${sc.title}`), el('p','',sc.text));
    sc.options.forEach((opt,optIndex)=>{
      const lab=el('label','module1-choice');
      const input=el('input'); input.type='radio'; input.name=`scope-${index}`; input.value=String(optIndex); if(load(`scope-${index}`,'')===String(optIndex)) input.checked=true; input.addEventListener('change',()=>save(`scope-${index}`,input.value));
      lab.append(input, el('span','',opt)); field.append(lab);
    });
    cards.append(field);
  });
  const check=btn('Check decisions','btn btn-blue');
  check.addEventListener('click',()=>{
    let correct=0; qa('.module1-scenario',cards).forEach(card=>{
      const selected=q('input:checked',card); const ok=selected && selected.value===card.dataset.answer;
      card.classList.toggle('is-correct',!!ok); card.classList.toggle('is-incorrect',!ok); if(ok) correct++;
    });
    const done=correct===scenarios.length;
    setStatus(root, done ? 'All decisions reflect safe, professional EMT behavior.' : `${correct} of ${scenarios.length} decisions were best-choice responses. Revisit the scenarios and think about scope, privacy, and reassessment.`, done?'success':'warn');
    save('scope-complete',done);
  });
  body.append(cards,check);
}

function renderWorkExplorer(root){
  const {body}=createShell(root,'Choose an EMS workplace','Interactive station · about 5–7 minutes','Open the cards below to preview where EMTs may work. Seeing several options early helps students connect EMS to real-world jobs.');
  const settings=[
    {key:'fire',title:'Fire-based EMS',summary:'Often responds with firefighters and may combine fire and medical duties.',details:['Common calls: 911 emergencies and public-assist calls','Partners: firefighter/EMTs or paramedics','Advantages: team support and broad emergency exposure','Challenge: the culture and duties can be different from private ambulance work']},
    {key:'private',title:'Private ambulance',summary:'May handle 911 response, transfers, or a mix depending on the area.',details:['Common calls: interfacility, discharge, dialysis, or contracted 911 coverage','Partners: EMT or paramedic partner, depending on service','Advantages: frequent transport experience and patient-contact repetition','Challenge: call mix and shift pace can vary widely']},
    {key:'hospital',title:'Hospital-based service',summary:'Some systems are operated directly by hospitals or health systems.',details:['Common calls: 911, specialty transport, or interfacility work','Partners: hospital-connected EMS crews','Advantages: closer link to receiving facilities and health-system resources','Challenge: the operational model may differ from municipal EMS']},
    {key:'rural',title:'Rural or volunteer EMS',summary:'Coverage areas may be large with long transport times and fewer nearby resources.',details:['Common calls: wide variety with longer travel distances','Partners: volunteer crews, paid-on-call, or mixed systems','Advantages: broad skill use and strong community connection','Challenge: limited resources and longer transport times']},
    {key:'event',title:'Event or industrial EMS',summary:'Some EMTs work standbys, sports, concerts, schools, or industrial sites.',details:['Common calls: first aid, minor injury, medical standby, initial stabilization','Partners: venue safety teams or occupational health staff','Advantages: controlled environment and focused role','Challenge: may provide less transport experience than a busy ambulance system']}
  ];
  const grid=el('div','module1-work-grid');
  const detail=el('div','module1-work-detail');
  detail.innerHTML='<h4>Select a setting</h4><p>Choose a card to see a short shift preview.</p>';
  settings.forEach((item,index)=>{
    const card=el('button','module1-work-card');
    card.type='button';
    card.innerHTML=`<strong>${item.title}</strong><span>${item.summary}</span>`;
    if(load('work-active','')===item.key) card.classList.add('active');
    card.addEventListener('click',()=>{
      qa('.module1-work-card',grid).forEach(c=>c.classList.remove('active'));
      card.classList.add('active');
      save('work-active',item.key);
      detail.innerHTML='';
      detail.append(el('h4','',item.title), el('p','',item.summary));
      const ul=el('ul','module1-bullet-list'); item.details.forEach(d=>ul.append(el('li','',d))); detail.append(ul);
      setStatus(root, `${item.title} selected. Compare it with another setting to see how EMT jobs can differ.`,'success');
    });
    grid.append(card);
    if(index===0 && !load('work-active','')) card.click();
  });
  body.append(grid,detail);
  const active = load('work-active','');
  if(active){ const found=qa('.module1-work-card',grid).find(c=>c.textContent.includes(settings.find(s=>s.key===active)?.title||'')); if(found) found.click(); }
}

function renderHandoffBuilder(root){
  const {body}=createShell(root,'Build a short transfer-of-care report','Interactive station · about 8–10 minutes','Use the patient details to build a simple, organized handoff. Focus on the important information, not every minor detail.');
  const intro=el('div','module1-card');
  intro.innerHTML='<h4>Case details</h4><p>68-year-old male with chest discomfort for 20 minutes. Pale and sweaty. BP 92/58, pulse 110. Oxygen and monitoring started. He reports the discomfort is slightly improved. Family reports a history of hypertension.</p>';
  const form=el('div','module1-report-grid');
  const fields=[
    ['ageSex','Patient and age/sex','68-year-old male'],
    ['concern','Chief concern','Chest discomfort with difficulty breathing'],
    ['history','Important history','History of hypertension'],
    ['findings','Important findings','Pale, diaphoretic, BP 92/58, pulse 110'],
    ['care','Care provided','Oxygen, monitoring, reassessment'],
    ['response','Patient response / trend','Reports slight improvement in discomfort'],
    ['eta','ETA or transfer statement','Ready for ED handoff now']
  ];
  fields.forEach(([key,label,ph])=>{
    const wrap=el('label','module1-field');
    wrap.append(el('span','',label));
    const input=el('input'); input.type='text'; input.placeholder=ph; input.value=load(`handoff-${key}`,''); input.addEventListener('input',()=>save(`handoff-${key}`,input.value));
    wrap.append(input); form.append(wrap);
  });
  const actions=el('div','module1-actions');
  const build=btn('Build report','btn btn-blue');
  const clear=btn('Clear fields');
  const output=el('div','module1-report-output');
  build.addEventListener('click',()=>{
    const values={}; qa('input',form).forEach((input,index)=>{ values[fields[index][0]]=input.value.trim(); });
    const ordered=[values.ageSex, values.concern, values.history, values.findings, values.care, values.response, values.eta].filter(Boolean);
    if(ordered.length<4){ setStatus(root,'Add at least the patient, concern, findings, and care before building the report.','warn'); return; }
    const report=ordered.join('. ')+'.';
    output.textContent=report; save('handoff-report',report); setStatus(root,'Report built. Read it out loud and remove anything vague or unnecessary.','success');
  });
  clear.addEventListener('click',()=>{ qa('input',form).forEach((input,index)=>{ input.value=''; save(`handoff-${fields[index][0]}`,''); }); output.textContent=''; setStatus(root,'Fields cleared. Build the handoff again from the case details.'); });
  actions.append(build,clear);
  if(load('handoff-report','')) output.textContent=load('handoff-report','');
  body.append(intro,form,actions,output);
}

const renderers={
  'dispatch':renderDispatch,
  'timeline':renderTimeline,
  'team-match':renderTeamMatch,
  'provider-sort':renderProviderSort,
  'scope-decisions':renderScopeDecisions,
  'work-explorer':renderWorkExplorer,
  'handoff-builder':renderHandoffBuilder
};

qa('[data-module1-activity]').forEach(root=>{
  const key=root.dataset.module1Activity;
  if(renderers[key]) renderers[key](root);
});
})();
