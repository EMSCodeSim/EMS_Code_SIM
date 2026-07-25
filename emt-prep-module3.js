(function(){
'use strict';

const STORAGE='emscodesim:emt-prep:module3:v1';
function readStore(){try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')||{};}catch(e){return {};}}
function writeStore(data){try{localStorage.setItem(STORAGE,JSON.stringify(data));}catch(e){}}
const state=readStore();
const save=(key,value)=>{state[key]=value;writeStore(state);};
const load=(key,fallback)=>Object.prototype.hasOwnProperty.call(state,key)?state[key]:fallback;
const one=(selector,root=document)=>root.querySelector(selector);
const all=(selector,root=document)=>[...root.querySelectorAll(selector)];
const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
const button=(text,className='btn btn-outline')=>{const b=node('button',className,text);b.type='button';return b;};

function shell(root,title,label,intro){
  root.className='module3-activity';
  root.innerHTML='';
  const head=node('div','module3-activity-head');
  const copy=node('div');
  copy.append(node('div','activity-label',label),node('h3','',title),node('p','',intro));
  head.append(copy,node('span','module3-chip','Interactive'));
  const body=node('div','module3-activity-body');
  const status=node('p','module3-status','Complete the activity, then continue to the next teaching section.');
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  root.append(head,body,status);
  return body;
}
function setStatus(root,text,kind=''){
  const status=one('.module3-status',root);if(!status)return;
  status.textContent=text;status.className='module3-status'+(kind?' '+kind:'');
}
function shuffle(array){return [...array].sort(()=>Math.random()-.5);}

function renderWordBuilder(root){
  const body=shell(root,'Medical word-parts laboratory','Simulator · about 8–10 minutes','The meanings of prefix, root, and suffix were taught above. Select a taught term, reveal its parts, and rebuild the plain-language meaning.');
  const terms=[
    {term:'tachycardia',parts:[['tachy-','fast'],['-cardia','heart-rate condition']],meaning:'abnormally fast heart rate'},
    {term:'bradycardia',parts:[['brady-','slow'],['-cardia','heart-rate condition']],meaning:'abnormally slow heart rate'},
    {term:'tachypnea',parts:[['tachy-','fast'],['-pnea','breathing']],meaning:'abnormally fast breathing'},
    {term:'dyspnea',parts:[['dys-','difficult or abnormal'],['-pnea','breathing']],meaning:'difficult or uncomfortable breathing'},
    {term:'dermatitis',parts:[['derm/o','skin'],['-itis','inflammation']],meaning:'inflammation of the skin'},
    {term:'cardiomegaly',parts:[['cardi/o','heart'],['-megaly','enlargement']],meaning:'enlargement of the heart'},
    {term:'neuropathy',parts:[['neur/o','nerve'],['-pathy','disease or disorder']],meaning:'a nerve disorder'}
  ];
  const picker=node('div','module3-card-picker');
  const workspace=node('div','module3-word-workspace');
  let active=Number(load('word-builder-active',0));
  function draw(){
    picker.innerHTML='';
    terms.forEach((item,index)=>{
      const b=button(item.term,'module3-term-button');
      if(index===active)b.classList.add('active');
      b.addEventListener('click',()=>{active=index;save('word-builder-active',active);draw();});
      picker.append(b);
    });
    const item=terms[active];
    workspace.innerHTML='';
    workspace.append(node('p','module3-word-label','Selected term'),node('h4','module3-big-term',item.term));
    const parts=node('div','module3-part-row');
    item.parts.forEach(([part,meaning],index)=>{
      const card=node('button','module3-part-card');card.type='button';
      card.innerHTML=`<strong>${part}</strong><span>Tap to reveal</span>`;
      card.addEventListener('click',()=>{card.classList.add('revealed');card.querySelector('span').textContent=meaning;save(`word-${active}-part-${index}`,true);});
      if(load(`word-${active}-part-${index}`,false)){card.classList.add('revealed');card.querySelector('span').textContent=meaning;}
      parts.append(card);
    });
    const reveal=button('Build plain-language meaning','btn btn-blue');
    const answer=node('div','module3-built-answer');
    if(load(`word-${active}-answer`,false))answer.textContent=item.meaning;
    reveal.addEventListener('click',()=>{answer.textContent=item.meaning;save(`word-${active}-answer`,true);setStatus(root,`Correct meaning: ${item.meaning}. Try another taught term.`, 'success');});
    workspace.append(parts,reveal,answer);
  }
  body.append(picker,workspace);draw();
}

function renderPrefixMatch(root){
  const body=shell(root,'Prefix recognition trainer','Guided practice · about 6–8 minutes','Every prefix in this activity was defined immediately above. Match each prefix to its meaning.');
  const meanings=['Choose a meaning','slow','fast','low or below','high or excessive','difficult or abnormal','without or absent','around','within','below or under'];
  const rows=[['brady-','slow'],['tachy-','fast'],['hypo-','low or below'],['hyper-','high or excessive'],['dys-','difficult or abnormal'],['a- / an-','without or absent'],['peri-','around'],['intra-','within'],['sub-','below or under']];
  const list=node('div','module3-match-list');
  rows.forEach(([prompt,answer],index)=>{
    const label=node('label','module3-match-row');label.append(node('strong','',prompt));
    const select=node('select');select.dataset.answer=answer;
    meanings.forEach(m=>{const opt=node('option','',m);opt.value=m;select.append(opt);});
    select.value=load(`prefix-${index}`,'Choose a meaning');select.addEventListener('change',()=>save(`prefix-${index}`,select.value));
    label.append(select);list.append(label);
  });
  const check=button('Check matches','btn btn-blue');
  check.addEventListener('click',()=>{
    const selects=all('select',list);let correct=0;
    selects.forEach(sel=>{const ok=sel.value===sel.dataset.answer;sel.classList.toggle('match-correct',ok);sel.classList.toggle('match-incorrect',!ok);if(ok)correct++;});
    const done=correct===selects.length;
    setStatus(root,done?'All prefix meanings are correct. You are ready to use them inside complete terms.':`${correct} of ${selects.length} correct. Review only the highlighted prefixes and try again.`,done?'success':'warn');
    save('prefix-complete',done);
  });
  body.append(list,check);
}

function renderTermDecoder(root){
  const body=shell(root,'Term-decoder simulator','Simulator · about 10–12 minutes','The roots and suffixes used here were taught above. Decode one term at a time, then compare your reasoning with the explanation.');
  const cards=[
    {term:'dermatitis',parts:'derm/o = skin; -itis = inflammation',options:['skin inflammation','heart enlargement','difficult breathing','blood in urine'],answer:0},
    {term:'cardiomegaly',parts:'cardi/o = heart; -megaly = enlargement',options:['heart inflammation','heart enlargement','nerve disorder','chest pain'],answer:1},
    {term:'neuropathy',parts:'neur/o = nerve; -pathy = disease or disorder',options:['nerve disorder','lung inflammation','abdominal enlargement','slow breathing'],answer:0},
    {term:'hematuria',parts:'hem/o = blood; -uria = urine condition',options:['blood condition','blood in the urine','skin inflammation','head pain'],answer:1},
    {term:'tachypnea',parts:'tachy- = fast; -pnea = breathing',options:['slow heart rate','fast breathing','absence of breathing','painful breathing'],answer:1},
    {term:'dyspnea',parts:'dys- = difficult or abnormal; -pnea = breathing',options:['difficult or uncomfortable breathing','fast heart rate','swelling in both legs','low blood pressure'],answer:0}
  ];
  let index=Number(load('decoder-index',0))%cards.length;
  const card=node('div','module3-decoder-card');
  function draw(){
    const item=cards[index];card.innerHTML='';
    card.append(node('span','module3-progress-label',`Term ${index+1} of ${cards.length}`),node('h4','module3-big-term',item.term),node('p','module3-parts-hint',item.parts));
    const options=node('div','module3-option-grid');
    item.options.forEach((text,optIndex)=>{
      const b=button(text,'module3-option');
      b.addEventListener('click',()=>{
        all('.module3-option',options).forEach(x=>x.classList.remove('correct','incorrect'));
        const ok=optIndex===item.answer;b.classList.add(ok?'correct':'incorrect');
        if(!ok)all('.module3-option',options)[item.answer].classList.add('correct');
        save(`decoder-${index}`,optIndex);setStatus(root,ok?`Correct. ${item.term} means ${item.options[item.answer]}.`:`Review the word parts: ${item.parts}.`,ok?'success':'warn');
      });
      options.append(b);
    });
    const actions=node('div','module3-actions');
    const prev=button('Previous');const next=button('Next term','btn btn-blue');
    prev.disabled=index===0;next.disabled=index===cards.length-1;
    prev.addEventListener('click',()=>{index--;save('decoder-index',index);draw();});
    next.addEventListener('click',()=>{index++;save('decoder-index',index);draw();});
    actions.append(prev,next);card.append(options,actions);
  }
  body.append(card);draw();
}

function renderDirectionalSim(root){
  const body=shell(root,'Anatomical-direction simulator','Simulator · about 10–12 minutes','Anatomical position and every directional term used below were defined above. Identify the correct relationship on the body diagram.');
  const questions=[
    {prompt:'The chest is on which surface of the body?',options:['anterior','posterior','distal','inferior'],answer:'anterior',explain:'Anterior means toward the front.'},
    {prompt:'The spine is on which surface of the body?',options:['lateral','posterior','superior','proximal'],answer:'posterior',explain:'Posterior means toward the back.'},
    {prompt:'The nose is ______ to the ears.',options:['medial','lateral','distal','inferior'],answer:'medial',explain:'Medial means closer to the body midline.'},
    {prompt:'The ears are ______ to the nose.',options:['medial','lateral','proximal','superior'],answer:'lateral',explain:'Lateral means farther from the midline.'},
    {prompt:'The elbow is ______ to the wrist.',options:['distal','inferior','proximal','bilateral'],answer:'proximal',explain:'Proximal means closer to the trunk or point of attachment.'},
    {prompt:'The fingers are ______ to the elbow.',options:['proximal','distal','medial','superior'],answer:'distal',explain:'Distal means farther from the trunk or point of attachment.'},
    {prompt:'A finding in both legs is described as',options:['unilateral upper-extremity','bilateral lower-extremity','posterior thoracic','medial upper-extremity'],answer:'bilateral lower-extremity',explain:'Bilateral means both sides; lower extremities are the legs.'}
  ];
  const layout=node('div','module3-direction-layout');
  const figure=node('div','module3-body-panel');figure.innerHTML='<img src="/images/emt-prep/module3-directional.png" alt="Anatomical direction reference diagram">';
  const quiz=node('div','module3-direction-quiz');
  let index=Number(load('direction-index',0))%questions.length;
  function draw(){
    quiz.innerHTML='';const item=questions[index];
    quiz.append(node('span','module3-progress-label',`Question ${index+1} of ${questions.length}`),node('h4','',item.prompt));
    const opts=node('div','module3-option-grid');
    item.options.forEach(text=>{const b=button(text,'module3-option');b.addEventListener('click',()=>{all('.module3-option',opts).forEach(x=>x.classList.remove('correct','incorrect'));const ok=text===item.answer;b.classList.add(ok?'correct':'incorrect');if(!ok)all('.module3-option',opts).find(x=>x.textContent===item.answer)?.classList.add('correct');setStatus(root,ok?item.explain:`Not quite. ${item.explain}`,ok?'success':'warn');save(`direction-${index}`,text);});opts.append(b);});
    const actions=node('div','module3-actions');const prev=button('Previous');const next=button(index===questions.length-1?'Finish':'Next','btn btn-blue');prev.disabled=index===0;prev.addEventListener('click',()=>{index--;save('direction-index',index);draw();});next.addEventListener('click',()=>{if(index<questions.length-1){index++;save('direction-index',index);draw();}else setStatus(root,'Directional practice complete. Revisit any relationship that still feels uncertain.','success');});actions.append(prev,next);quiz.append(opts,actions);
  }
  layout.append(figure,quiz);body.append(layout);draw();
}

function renderAbbreviationSim(root){
  const body=shell(root,'EMS abbreviation safety trainer','Guided practice · about 7–9 minutes','Only abbreviations defined in the lesson appear here. Match each abbreviation, then decide when writing the full phrase would be safer.');
  const rows=[['BP','blood pressure'],['HR','heart rate'],['RR','respiratory rate'],['SpO₂','peripheral oxygen saturation'],['BGL','blood glucose level'],['LOC','level of consciousness']];
  const options=['Choose expansion',...rows.map(r=>r[1])];
  const list=node('div','module3-match-list');
  rows.forEach(([abbr,answer],index)=>{const label=node('label','module3-match-row');label.append(node('strong','',abbr));const select=node('select');select.dataset.answer=answer;options.forEach(text=>{const o=node('option','',text);o.value=text;select.append(o);});select.value=load(`abbr-${index}`,'Choose expansion');select.addEventListener('change',()=>save(`abbr-${index}`,select.value));label.append(select);list.append(label);});
  const decision=node('fieldset','module3-decision-card');decision.append(node('legend','','A local charting system does not list BGL as an accepted abbreviation. What is the safest choice?'));
  [['write','Write “blood glucose level” in full',true],['use','Use BGL anyway because some EMS systems recognize it',false],['guess','Choose a different abbreviation without checking',false]].forEach(([value,text])=>{const lab=node('label','module3-choice');const input=node('input');input.type='radio';input.name='abbr-decision';input.value=value;if(load('abbr-decision','')===value)input.checked=true;input.addEventListener('change',()=>save('abbr-decision',value));lab.append(input,node('span','',text));decision.append(lab);});
  const check=button('Check abbreviation work','btn btn-blue');
  check.addEventListener('click',()=>{let correct=0;const selects=all('select',list);selects.forEach(sel=>{const ok=sel.value===sel.dataset.answer;sel.classList.toggle('match-correct',ok);sel.classList.toggle('match-incorrect',!ok);if(ok)correct++;});const chosen=one('input[name="abbr-decision"]:checked',decision);const safe=chosen&&chosen.value==='write';decision.classList.toggle('is-correct',!!safe);decision.classList.toggle('is-incorrect',!safe);const done=correct===selects.length&&safe;setStatus(root,done?'All expansions are correct, and you chose the safest documentation approach.':`${correct} of ${selects.length} abbreviations correct. Also verify the local-policy decision.`,done?'success':'warn');save('abbr-complete',done);});
  body.append(list,decision,check);
}

function renderTranslator(root){
  const body=shell(root,'Plain-language and objective-wording simulator','Simulator · about 8–10 minutes','The clinical terms and objective examples were taught above. Translate each phrase into language appropriate for a patient or an EMS report.');
  const items=[
    {prompt:'Ask a patient about dyspnea',options:['Are you having trouble breathing?','Do you have pulmonary pathology?','Why are you breathing like that?'],answer:0,why:'“Trouble breathing” is clear and patient-friendly.'},
    {prompt:'Explain tachycardia to a patient',options:['Your heart rate is faster than expected.','Your cardiology is abnormal.','You definitely have heart disease.'],answer:0,why:'This explains the finding without making an unsupported diagnosis.'},
    {prompt:'Document “patient looks bad” objectively',options:['Patient is pale, diaphoretic, and speaking in two-word phrases.','Patient looks terrible.','Patient seems very sick for some reason.'],answer:0,why:'Objective wording describes visible findings.'},
    {prompt:'Translate bilateral lower-extremity edema',options:['Swelling in both legs','Pain in one arm','Numbness along the back'],answer:0,why:'Bilateral means both sides, lower extremities are legs, and edema is swelling.'}
  ];
  const grid=node('div','module3-scenario-grid');
  items.forEach((item,index)=>{const card=node('fieldset','module3-scenario-card');card.dataset.answer=String(item.answer);card.dataset.why=item.why;card.append(node('legend','',`${index+1}. ${item.prompt}`));item.options.forEach((text,opt)=>{const lab=node('label','module3-choice');const input=node('input');input.type='radio';input.name=`translator-${index}`;input.value=String(opt);if(load(`translator-${index}`,'')===String(opt))input.checked=true;input.addEventListener('change',()=>save(`translator-${index}`,input.value));lab.append(input,node('span','',text));card.append(lab);});grid.append(card);});
  const check=button('Check translations','btn btn-blue');
  check.addEventListener('click',()=>{let correct=0;all('.module3-scenario-card',grid).forEach(card=>{const selected=one('input:checked',card);const ok=selected&&selected.value===card.dataset.answer;card.classList.toggle('is-correct',!!ok);card.classList.toggle('is-incorrect',!ok);let fb=one('.module3-card-feedback',card);if(!fb){fb=node('p','module3-card-feedback');card.append(fb);}fb.textContent=card.dataset.why;if(ok)correct++;});const done=correct===items.length;setStatus(root,done?'All translations are clear, respectful, and objective.':`${correct} of ${items.length} best translations selected. Read the feedback under each card.`,done?'success':'warn');save('translator-complete',done);});
  body.append(grid,check);
}

function renderCapstone(root){
  const body=shell(root,'Decode the EMS note','Capstone simulator · about 10–12 minutes','Every term in this note was explicitly defined and practiced earlier in the module. Decode the note, then rebuild it in plain language.');
  const note=node('blockquote','module3-capstone-note','“Adult patient with dyspnea, tachycardia, and bilateral lower-extremity edema.”');
  const form=node('div','module3-capstone-grid');
  const fields=[
    ['dyspnea','Dyspnea means','Example: difficult or uncomfortable breathing'],
    ['tachycardia','Tachycardia means','Example: abnormally fast heart rate'],
    ['bilateral','Bilateral means','Example: on both sides'],
    ['lowerExtremity','Lower extremity means','Example: leg'],
    ['edema','Edema means','Example: swelling']
  ];
  fields.forEach(([key,label,placeholder])=>{const wrap=node('label','module3-field');wrap.append(node('span','',label));const input=node('input');input.type='text';input.placeholder=placeholder;input.value=load(`capstone-${key}`,'');input.addEventListener('input',()=>save(`capstone-${key}`,input.value));wrap.append(input);form.append(wrap);});
  const plain=node('label','module3-field wide');plain.append(node('span','','Rewrite the full note in plain language'));const textarea=node('textarea');textarea.placeholder='Example: Adult patient with trouble breathing, a fast heart rate, and swelling in both legs.';textarea.value=load('capstone-plain','');textarea.addEventListener('input',()=>save('capstone-plain',textarea.value));plain.append(textarea);form.append(plain);
  const check=button('Check capstone','btn btn-blue');
  check.addEventListener('click',()=>{const values=all('input',form).map(i=>i.value.trim().toLowerCase());const checks=[values[0].includes('breath'),values[1].includes('fast')&&values[1].includes('heart'),values[2].includes('both'),values[3].includes('leg'),values[4].includes('swell')];const plainOk=textarea.value.toLowerCase().includes('breath')&&textarea.value.toLowerCase().includes('fast')&&textarea.value.toLowerCase().includes('heart')&&textarea.value.toLowerCase().includes('swell')&&textarea.value.toLowerCase().includes('leg');const score=checks.filter(Boolean).length+(plainOk?1:0);setStatus(root,score===6?'Capstone complete. You decoded every term and rebuilt the note in clear language.':`${score} of 6 capstone elements contain the expected meaning. Use the taught definitions above and revise the incomplete fields.`,score===6?'success':'warn');save('capstone-complete',score===6);});
  body.append(note,form,check);
}

const renderers={
  'word-builder':renderWordBuilder,
  'prefix-match':renderPrefixMatch,
  'term-decoder':renderTermDecoder,
  'directional-sim':renderDirectionalSim,
  'abbreviation-sim':renderAbbreviationSim,
  'translator':renderTranslator,
  'capstone':renderCapstone
};
all('[data-module3-activity]').forEach(root=>{const renderer=renderers[root.dataset.module3Activity];if(renderer)renderer(root);});
})();
