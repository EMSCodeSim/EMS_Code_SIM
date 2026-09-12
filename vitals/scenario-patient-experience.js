(() => {
  'use strict';

  const VERSION='2026.09.12.1';
  const params=new URLSearchParams(location.search);
  const requested=String(params.get('case')||window.EMSCodeSimScenarioSession?.requestedCaseId?.()||window.EMSCodeSimPatientRecord?.active?.()?.scenarioId||'').replace(/-/g,'_').toLowerCase();
  if(!['asthma','respiratory'].includes(requested)) return;

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const api=window.EMSCodeSimPatientRecord;
  const session=window.EMSCodeSimScenarioSession;
  const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,Math.round(Number(v)||0)));
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const now=()=>new Date().toISOString();

  const RULES=Object.freeze({
    introduced:{label:'Introduced self and established a calm first connection',trust:5,respect:6,understanding:2,cooperation:3,anxiety:-5},
    reassured:{label:'Acknowledged the patient’s distress and offered reassurance',trust:5,respect:4,understanding:1,cooperation:3,anxiety:-8},
    explained:{label:'Explained what would happen next before acting',trust:4,respect:2,understanding:7,cooperation:3,anxiety:-4},
    permission:{label:'Asked permission before a non-emergent exam or intervention',trust:3,respect:6,understanding:2,cooperation:3,anxiety:-2},
    history_question:{label:'Asked a focused patient-centered history question',trust:1,respect:1,understanding:1,cooperation:1,anxiety:-1},
    listened:{label:'Built on information the patient already provided',trust:3,respect:3,understanding:2,cooperation:2,anxiety:-2},
    repeated_question:{label:'Repeated a question the patient had already answered',trust:-3,respect:-2,understanding:-1,cooperation:-2,anxiety:3},
    treatment_explained:{label:'Prepared the patient before treatment',trust:5,respect:3,understanding:7,cooperation:4,anxiety:-4},
    treatment_unexplained:{label:'Treatment occurred without a recent explanation',trust:-4,respect:-2,understanding:-7,cooperation:-2,anxiety:5},
    treatment_effective:{label:'Care produced a meaningful improvement the patient could feel',trust:6,respect:1,understanding:2,cooperation:5,anxiety:-9},
    reassessed:{label:'Returned to the patient and reassessed after care',trust:5,respect:4,understanding:4,cooperation:3,anxiety:-4},
    patient_ignored:{label:'Moved through several care actions without returning to the patient',trust:-7,respect:-6,understanding:-4,cooperation:-4,anxiety:7}
  });

  let state={
    trust:58,
    respect:72,
    understanding:52,
    cooperation:68,
    anxiety:74,
    events:[],
    asked:[],
    explainedAt:0,
    introduced:false,
    reassured:false,
    permission:false,
    lastCareLogLength:0,
    lastTreatmentLength:0,
    lastReassessmentLength:0,
    careActionsSincePatient:0
  };
  let started=false;
  let saveQueued=false;
  let observer=null;

  function record(){
    try{return session?.sync?.()||api?.active?.()||null;}catch(_){return null;}
  }

  function hydrate(){
    const saved=record()?.documentation?.patientExperienceV1;
    if(saved&&typeof saved==='object'){
      state={...state,...saved};
      state.events=Array.isArray(saved.events)?saved.events.slice(-100):[];
      state.asked=Array.isArray(saved.asked)?saved.asked.slice(-80):[];
    }
    const r=record()||{};
    state.lastCareLogLength=Array.isArray(r.careLog)?r.careLog.length:0;
    state.lastTreatmentLength=Array.isArray(r.treatments)?r.treatments.length:0;
    state.lastReassessmentLength=Array.isArray(r.reassessments)?r.reassessments.length:0;
  }

  function snapshot(){
    return {
      trust:clamp(state.trust),
      respect:clamp(state.respect),
      understanding:clamp(state.understanding),
      cooperation:clamp(state.cooperation),
      anxiety:clamp(state.anxiety),
      calm:clamp(100-state.anxiety),
      events:state.events.slice(-100),
      asked:state.asked.slice(-80),
      introduced:!!state.introduced,
      reassured:!!state.reassured,
      permission:!!state.permission,
      explainedAt:Number(state.explainedAt)||0
    };
  }

  function score(){
    const s=snapshot();
    return clamp(s.trust*.25+s.respect*.22+s.understanding*.20+s.cooperation*.13+s.calm*.20);
  }

  function mood(){
    const s=snapshot();
    const total=score();
    if(s.anxiety>=72) return {key:'anxious',label:'Anxious',copy:'The patient is frightened and needs clear, calm communication.'};
    if(total<55) return {key:'guarded',label:'Guarded',copy:'The patient is uncertain about the crew and needs more explanation and listening.'};
    if(total>=88&&s.anxiety<=35) return {key:'trusting',label:'Trusting',copy:'The patient feels informed, respected, and confident in the crew.'};
    if(total>=72) return {key:'reassured',label:'Reassured',copy:'The patient is becoming more comfortable with the crew.'};
    return {key:'uncertain',label:'Uncertain',copy:'The patient is cooperating but still needs reassurance and explanation.'};
  }

  function save(){
    if(saveQueued) return;
    saveQueued=true;
    requestAnimationFrame(()=>{
      saveQueued=false;
      const r=record();
      if(!r) return;
      r.documentation=r.documentation||{};
      r.documentation.patientExperienceV1={...snapshot(),score:score(),mood:mood().key,updatedAt:now()};
      try{api?.save?.(r);}catch(_){}
    });
  }

  function apply(code,detail='',options={}){
    const rule=RULES[code];
    if(!rule) return;
    if(options.once&&state.events.some(e=>e.code===code)) return;
    state.trust=clamp(state.trust+(rule.trust||0));
    state.respect=clamp(state.respect+(rule.respect||0));
    state.understanding=clamp(state.understanding+(rule.understanding||0));
    state.cooperation=clamp(state.cooperation+(rule.cooperation||0));
    state.anxiety=clamp(state.anxiety+(rule.anxiety||0));
    state.events.push({code,label:rule.label,detail:clean(detail),at:now(),positive:(rule.trust||0)+(rule.respect||0)+(rule.understanding||0)+(rule.cooperation||0)-(rule.anxiety||0)>=0});
    if(state.events.length>100) state.events.shift();
    save();
    renderMood();
  }

  function appendConversation(type,text,label){
    const conversation=q('#patientFirstConversation');
    const value=clean(text);
    if(!conversation||!value) return;
    q('#patientFirstEmpty')?.remove();
    const bubble=document.createElement('article');
    bubble.className=`patient-first-bubble ${type}`;
    bubble.innerHTML=`<small>${label}</small><div></div>`;
    q('div',bubble).textContent=value;
    conversation.appendChild(bubble);
    setTimeout(()=>bubble.scrollIntoView({behavior:'smooth',block:'nearest'}),30);
  }

  function communicationAction(kind){
    if(kind==='introduce'){
      if(state.introduced) return;
      state.introduced=true;
      appendConversation('user','Hi, I’m with EMS. I’m going to stay with you and help your breathing.','YOU');
      appendConversation('patient','Okay… I’m really having a hard time catching my breath.','PATIENT');
      apply('introduced','Introduced self and set expectations',{once:true});
      return;
    }
    if(kind==='reassure'){
      state.reassured=true;
      appendConversation('user','I can see that you’re working hard to breathe. We’re going to help you through this.','YOU');
      appendConversation('patient','Okay. Thank you.','PATIENT');
      apply('reassured','Acknowledged breathing distress');
      return;
    }
    if(kind==='explain'){
      state.explainedAt=Date.now();
      appendConversation('user','I’m going to keep checking your breathing and oxygen level while we decide the next treatment. I’ll tell you what we’re doing as we go.','YOU');
      appendConversation('patient','Okay.','PATIENT');
      apply('explained','Explained next steps');
      return;
    }
    if(kind==='permission'){
      state.permission=true;
      appendConversation('user','Is it okay if I listen to your lungs and continue the exam?','YOU');
      appendConversation('patient','Yes.','PATIENT');
      apply('permission','Asked permission for exam',{once:true});
    }
  }

  function ensureExperienceActions(){
    const quick=q('.patient-first-quick');
    if(!quick||q('#patientExperienceActions')) return;
    const section=document.createElement('section');
    section.id='patientExperienceActions';
    section.className='patient-experience-actions';
    section.innerHTML='<strong>Patient communication</strong><div class="patient-experience-action-grid"></div>';
    quick.insertAdjacentElement('beforebegin',section);
    renderExperienceActions();
  }

  function renderExperienceActions(){
    const host=q('#patientExperienceActions .patient-experience-action-grid');
    if(!host) return;
    host.replaceChildren();
    const actions=[];
    if(!state.introduced) actions.push(['Introduce & orient patient','introduce']);
    if(state.anxiety>48) actions.push(['Acknowledge & reassure','reassure']);
    actions.push(['Explain next step','explain']);
    if(!state.permission) actions.push(['Ask permission for exam','permission']);
    actions.slice(0,3).forEach(([label,key])=>{
      const button=document.createElement('button');
      button.type='button';
      button.textContent=label;
      button.addEventListener('click',()=>{communicationAction(key);renderExperienceActions();});
      host.appendChild(button);
    });
  }

  function ensureMoodChip(){
    const head=q('.patient-first-mobile-feed-head');
    if(!head) return;
    let chip=q('#patientExperienceMood');
    if(!chip){
      chip=document.createElement('button');
      chip.id='patientExperienceMood';
      chip.type='button';
      chip.className='patient-experience-mood';
      chip.setAttribute('aria-label','Patient experience state');
      chip.addEventListener('click',openReview);
      head.appendChild(chip);
    }
    renderMood();
  }

  function renderMood(){
    const chip=q('#patientExperienceMood');
    if(!chip) return;
    const m=mood();
    chip.dataset.mood=m.key;
    chip.innerHTML=`<small>PATIENT</small><strong>${m.label}</strong>`;
    chip.title=m.copy;
  }

  function historyClick(button){
    const text=clean(button?.querySelector('span')?.textContent||button?.textContent).replace(/Ask again|Ask$/i,'').toLowerCase();
    if(!text) return;
    const repeated=state.asked.includes(text);
    if(repeated) apply('repeated_question',text);
    else {
      state.asked.push(text);
      if(state.asked.length>80) state.asked.shift();
      apply('history_question',text);
      if(state.asked.length===3||state.asked.length===6) apply('listened','Built a coherent interview from multiple patient answers');
    }
    state.careActionsSincePatient=0;
    save();
  }

  function explainedRecently(){return Date.now()-(Number(state.explainedAt)||0)<60000;}

  function syncClinicalEvents(){
    const r=record()||{};
    const care=Array.isArray(r.careLog)?r.careLog:[];
    const treatments=Array.isArray(r.treatments)?r.treatments:[];
    const reassessments=Array.isArray(r.reassessments)?r.reassessments:[];

    if(treatments.length>state.lastTreatmentLength){
      const item=treatments[treatments.length-1]||{};
      const text=clean(item.description||item.name||item.treatmentLabel||item.treatment||item.value||'Treatment');
      apply(explainedRecently()?'treatment_explained':'treatment_unexplained',text);
      state.careActionsSincePatient++;
      if(/albuterol|bronchodilator|inhaler/i.test(JSON.stringify(item))) setTimeout(()=>apply('treatment_effective','Breathing treatment improved the patient',{once:true}),800);
    }
    if(reassessments.length>state.lastReassessmentLength){
      apply('reassessed','Patient reassessed after care');
      state.careActionsSincePatient=0;
    }
    if(care.length>state.lastCareLogLength&&treatments.length===state.lastTreatmentLength&&reassessments.length===state.lastReassessmentLength){
      state.careActionsSincePatient++;
      if(state.careActionsSincePatient>=5){
        apply('patient_ignored','Several clinical actions occurred without returning to patient communication');
        state.careActionsSincePatient=0;
      }
    }

    state.lastCareLogLength=care.length;
    state.lastTreatmentLength=treatments.length;
    state.lastReassessmentLength=reassessments.length;
    save();
  }

  function patientQuote(){
    const n=score(),m=mood();
    if(n>=90) return 'I was scared at first, but they kept me informed, listened to me, and I felt like they were taking care of me the whole time.';
    if(n>=80) return 'They helped my breathing and I felt like they were listening. I understood most of what was happening.';
    if(n>=70) return 'They took care of me, but there were moments when I was still nervous or unsure what they were doing.';
    if(n>=60) return 'I knew they were trying to help, but I did not always feel informed or reassured.';
    if(m.key==='guarded') return 'A lot was happening around me and I did not feel like anyone was really bringing me into the conversation.';
    return 'I was frightened and I needed more explanation and reassurance while they were treating me.';
  }

  function reviewModel(){
    const s=snapshot();
    const positives=state.events.filter(e=>e.positive).slice(-8);
    const negatives=state.events.filter(e=>!e.positive).slice(-8);
    const strengths=[];
    const improve=[];
    if(s.trust>=80) strengths.push('Built strong patient trust.'); else improve.push('Build trust earlier with reassurance and clear expectations.');
    if(s.respect>=85) strengths.push('Maintained respect and patient involvement.'); else improve.push('Invite the patient into the encounter with permission and acknowledgment.');
    if(s.understanding>=82) strengths.push('Kept the patient well informed.'); else improve.push('Explain assessments and treatments before performing them.');
    if(s.calm>=72) strengths.push('Helped reduce the patient’s anxiety.'); else improve.push('Acknowledge fear and use short, calm explanations during respiratory distress.');
    if(s.cooperation>=82) strengths.push('Created good patient cooperation.');
    if(!state.events.some(e=>e.code==='reassessed')) improve.push('Return to the patient after treatment and explicitly reassess response.');
    return {score:score(),...s,mood:mood(),quote:patientQuote(),strengths,improve,positives,negatives};
  }

  function ensureReview(){
    let modal=q('#patientExperienceReview');
    if(modal) return modal;
    modal=document.createElement('div');
    modal.id='patientExperienceReview';
    modal.className='patient-experience-review-backdrop';
    modal.hidden=true;
    modal.innerHTML=`<section class="patient-experience-review" role="dialog" aria-modal="true" aria-labelledby="patientExperienceReviewTitle">
      <header><div><small>PATIENT PERSPECTIVE</small><h2 id="patientExperienceReviewTitle">Patient Experience Review</h2></div><button id="patientExperienceReviewClose" type="button" aria-label="Close">×</button></header>
      <div id="patientExperienceReviewBody"></div>
    </section>`;
    document.body.appendChild(modal);
    q('#patientExperienceReviewClose',modal)?.addEventListener('click',()=>modal.hidden=true);
    modal.addEventListener('click',e=>{if(e.target===modal) modal.hidden=true;});
    return modal;
  }

  function openReview(){
    const modal=ensureReview();
    const body=q('#patientExperienceReviewBody',modal);
    const m=reviewModel();
    const dimensions=[['Trust',m.trust],['Respect',m.respect],['Understanding',m.understanding],['Cooperation',m.cooperation],['Calm',m.calm]];
    body.innerHTML=`
      <section class="patient-experience-score"><div><strong>${m.score}</strong><span>/100</span></div><p><b>${m.score>=90?'Exceptional patient experience':m.score>=80?'Strong patient experience':m.score>=70?'Generally positive experience':m.score>=60?'Mixed patient experience':'Patient experience needs work'}</b><br>${m.mood.copy}</p></section>
      <blockquote>“${m.quote}”<cite>— Patient perspective</cite></blockquote>
      <section class="patient-experience-dimensions">${dimensions.map(([label,value])=>`<article><div><span>${label}</span><strong>${value}</strong></div><i><b style="width:${value}%"></b></i></article>`).join('')}</section>
      <section class="patient-experience-coaching"><article><small>WHAT HELPED</small><ul>${(m.strengths.length?m.strengths:['You completed meaningful patient care.']).map(x=>`<li>${x}</li>`).join('')}</ul></article><article><small>NEXT-RUN FOCUS</small><ul>${(m.improve.length?m.improve:['Maintain this communication while making the clinical workflow even more efficient.']).map(x=>`<li>${x}</li>`).join('')}</ul></article></section>
      <p class="patient-experience-note">This score measures the patient’s experience of communication, respect, understanding, cooperation, and anxiety reduction. It is separate from protocol accuracy and technical clinical performance.</p>`;
    modal.hidden=false;
  }

  function ensureReviewButton(){
    const dialog=q('#scenarioControlDialog');
    if(!dialog||q('#openPatientExperienceReview',dialog)) return;
    const button=document.createElement('button');
    button.id='openPatientExperienceReview';
    button.type='button';
    button.className='scenario-control-option patient-experience-review-button';
    button.innerHTML='<strong>Patient experience</strong><span>Review trust, anxiety, communication, understanding, and cooperation.</span>';
    const continueButton=q('#continueScenario',dialog);
    if(continueButton) dialog.insertBefore(button,continueButton); else dialog.appendChild(button);
    button.addEventListener('click',openReview);
  }

  function styles(){
    if(q('style[data-patient-experience]')) return;
    const style=document.createElement('style');
    style.dataset.patientExperience=VERSION;
    style.textContent=`
      .patient-experience-actions{margin:12px 0;padding:12px;border:1px solid #cbdde8;border-radius:14px;background:#edf7fb;color:#17364a}.patient-experience-actions>strong{display:block;margin-bottom:8px;font-size:.84rem}.patient-experience-action-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.patient-experience-action-grid button{min-height:46px;border:1px solid #b9d2df;border-radius:11px;background:#fff;color:#17364a;font:inherit;font-size:.82rem;font-weight:800;text-align:left;padding:9px 10px}.patient-experience-mood{border:1px solid #b8e2f2;border-radius:999px;background:#e6f5fb;color:#0878a8;padding:5px 9px;font:inherit;text-align:left}.patient-experience-mood small{display:block;font-size:.52rem;font-weight:900;letter-spacing:.08em}.patient-experience-mood strong{display:block;font-size:.72rem}.patient-experience-mood[data-mood="anxious"],.patient-experience-mood[data-mood="guarded"]{background:#fff2df;border-color:#f0cf9a;color:#855213}.patient-experience-mood[data-mood="trusting"]{background:#e9f8ef;border-color:#b9e2c7;color:#27663c}
      .patient-experience-review-backdrop{position:fixed;inset:0;z-index:12000;background:#03101cbb;display:grid;place-items:end center;padding:0}.patient-experience-review-backdrop[hidden]{display:none}.patient-experience-review{width:min(760px,100%);max-height:90dvh;overflow:auto;background:#f7fafc;color:#102a3c;border-radius:22px 22px 0 0;padding:18px;box-sizing:border-box}.patient-experience-review>header{display:flex;justify-content:space-between;align-items:start;gap:12px;position:sticky;top:-18px;background:#f7fafc;padding:18px 0 10px;z-index:2}.patient-experience-review>header small{color:#0878a8;font-size:.66rem;font-weight:900;letter-spacing:.1em}.patient-experience-review h2{margin:3px 0 0;font-size:1.25rem}.patient-experience-review>header button{width:42px;height:42px;border:1px solid #c9d9e3;border-radius:50%;background:#fff;font-size:1.4rem}.patient-experience-score{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center;padding:14px;border-radius:14px;background:#0b2939;color:#eef8fb}.patient-experience-score>div strong{font-size:2.2rem}.patient-experience-score>div span{font-size:.85rem;color:#aac7d4}.patient-experience-score p{margin:0;line-height:1.4}.patient-experience-review blockquote{margin:12px 0;padding:14px;border-left:4px solid #60afd0;border-radius:10px;background:#fff;line-height:1.45}.patient-experience-review cite{display:block;margin-top:6px;font-size:.72rem;color:#6b8290;font-style:normal}.patient-experience-dimensions{display:grid;gap:8px}.patient-experience-dimensions article{padding:10px 12px;border:1px solid #d5e2ea;border-radius:11px;background:#fff}.patient-experience-dimensions article>div{display:flex;justify-content:space-between;font-size:.8rem;font-weight:800}.patient-experience-dimensions i{display:block;height:7px;margin-top:7px;border-radius:999px;background:#e4edf2;overflow:hidden}.patient-experience-dimensions i b{display:block;height:100%;background:#1686b4;border-radius:999px}.patient-experience-coaching{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.patient-experience-coaching article{padding:12px;border:1px solid #d5e2ea;border-radius:12px;background:#fff}.patient-experience-coaching small{font-size:.65rem;font-weight:900;letter-spacing:.08em;color:#0878a8}.patient-experience-coaching ul{margin:8px 0 0;padding-left:18px;display:grid;gap:6px;font-size:.8rem;line-height:1.4}.patient-experience-note{font-size:.72rem;color:#607987;line-height:1.4;margin:12px 2px 4px}
      @media(max-width:600px){.patient-experience-action-grid,.patient-experience-coaching{grid-template-columns:1fr}.patient-experience-review{padding-bottom:max(24px,env(safe-area-inset-bottom))}}
    `;
    document.head.appendChild(style);
  }

  function wire(){
    document.addEventListener('click',event=>{
      const history=event.target.closest?.('#historyPanel .history-question-button');
      if(history) historyClick(history);
      if(event.target.closest?.('#completeScenarioFromPatient,#gradeScenarioFromPatient,[data-grade]')) setTimeout(openReview,180);
    },true);
    window.addEventListener('emscodesim:patient-record-updated',()=>setTimeout(syncClinicalEvents,40));
    window.addEventListener('emscodesim:scenario-updated',()=>setTimeout(()=>{syncClinicalEvents();ensureExperienceActions();ensureMoodChip();ensureReviewButton();},40));
    observer=new MutationObserver(()=>{
      ensureExperienceActions();
      ensureMoodChip();
      ensureReviewButton();
    });
    observer.observe(document.body,{subtree:true,childList:true});
  }

  function start(){
    if(started) return;
    started=true;
    styles();
    hydrate();
    ensureReview();
    ensureExperienceActions();
    ensureMoodChip();
    ensureReviewButton();
    wire();
    syncClinicalEvents();
    window.EMSCodeSimPatientExperience=Object.freeze({version:VERSION,model:reviewModel,score,mood,record:apply,openReview});
    window.addEventListener('pagehide',()=>observer?.disconnect(),{once:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
