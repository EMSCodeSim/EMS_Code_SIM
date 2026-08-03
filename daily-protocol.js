(()=>{
  'use strict';

  const STORAGE_KEY='emscodesimDailyProtocolV1';
  const DATA_URL='/data/protocol-drills.json';
  const STATES=['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming','Other / International'];
  const DEFAULT_STATE={profile:null,activePackId:'emscodesim-demo',progress:{},completions:[],importedPackages:[],drillOffset:0};
  let state=structuredCloneSafe(DEFAULT_STATE);
  let builtData={packages:[],drills:[]};
  let currentDrill=null;
  let currentStep='review';
  let session=freshSession();

  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const localDate=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const formatDate=value=>{if(!value)return '—';const [y,m,d]=value.split('-').map(Number);return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(new Date(y,m-1,d));};

  function structuredCloneSafe(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}
  function freshSession(drillId=''){return{drillId,scenarioAnswered:false,scenarioCorrect:false,graded:false,score:null,completed:false};}
  function loadState(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(saved&&typeof saved==='object')state={...structuredCloneSafe(DEFAULT_STATE),...saved,progress:saved.progress||{},completions:Array.isArray(saved.completions)?saved.completions:[],importedPackages:Array.isArray(saved.importedPackages)?saved.importedPackages:[]};}catch(error){console.warn('Protocol state could not be loaded.',error);}}
  function saveState(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(error){console.warn('Protocol state could not be saved.',error);}}
  function allPackageRecords(){return[...builtData.packages.map(packageData=>({package:packageData,drills:builtData.drills.filter(drill=>drill.packId===packageData.id),imported:false})),...state.importedPackages.map(record=>({...record,imported:true}))];}
  function packageRecord(id=state.activePackId){return allPackageRecords().find(record=>record.package.id===id)||allPackageRecords()[0]||null;}
  function eligibleDrills(){const record=packageRecord();if(!record||!state.profile)return[];return record.drills.filter(drill=>Array.isArray(drill.levels)&&drill.levels.includes(state.profile.level));}
  function hash(text){let value=2166136261;for(let index=0;index<text.length;index++){value^=text.charCodeAt(index);value=Math.imul(value,16777619);}return value>>>0;}
  function todayDrill(){const drills=eligibleDrills();if(!drills.length)return null;const base=hash(`${localDate()}|${state.activePackId}|${state.profile?.level||''}|${state.profile?.state||''}`);return drills[(base+Number(state.drillOffset||0))%drills.length];}
  function getDrill(id){return eligibleDrills().find(drill=>drill.id===id)||allPackageRecords().flatMap(record=>record.drills).find(drill=>drill.id===id)||null;}
  function renderList(id,items){$(id).innerHTML=(items||[]).map(item=>`<li>${esc(item)}</li>`).join('');}
  function completionDates(){return[...new Set(state.completions.map(item=>item.date).filter(Boolean))].sort();}
  function currentStreak(){const dates=new Set(completionDates());let cursor=new Date();let streak=0;if(!dates.has(localDate(cursor))){cursor.setDate(cursor.getDate()-1);}while(dates.has(localDate(cursor))){streak+=1;cursor.setDate(cursor.getDate()-1);}return streak;}
  function needsReviewRecords(){return Object.entries(state.progress).map(([id,value])=>({id,...value,drill:getDrill(id)})).filter(item=>item.drill&&(item.bestScore<80||item.confidence==='needs-review'||item.confidence==='unfamiliar')).sort((a,b)=>(a.bestScore??0)-(b.bestScore??0));}

  async function loadData(){
    const response=await fetch(DATA_URL,{cache:'no-store'});
    if(!response.ok)throw new Error(`Protocol data failed to load (${response.status}).`);
    const data=await response.json();
    if(!data||!Array.isArray(data.packages)||!Array.isArray(data.drills))throw new Error('Protocol data is invalid.');
    builtData=data;
  }

  function populateStates(){
    $('profileState').innerHTML=STATES.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('');
  }

  function populatePackages(){
    const records=allPackageRecords();
    $('profilePack').innerHTML=records.map(record=>`<option value="${esc(record.package.id)}">${esc(record.package.name)}${record.package.verified?' · Verified':' · Demo / unverified'}</option>`).join('');
    if(records.some(record=>record.package.id===state.activePackId))$('profilePack').value=state.activePackId;
  }

  function fillProfileForm(){
    populatePackages();
    const profile=state.profile||{level:'EMT',state:'Colorado',area:'',edition:'',sourceUrl:'',packId:state.activePackId};
    $('profileLevel').value=profile.level||'EMT';
    $('profileState').value=profile.state||'Colorado';
    $('profileArea').value=profile.area||'';
    $('profileEdition').value=profile.edition||'';
    $('profileSourceUrl').value=profile.sourceUrl||'';
    $('profilePack').value=profile.packId||state.activePackId;
  }

  function applyPackageToProfileForm(){
    const record=packageRecord($('profilePack').value);
    if(!record||!record.imported)return;
    const p=record.package;
    if(p.state&&STATES.includes(p.state))$('profileState').value=p.state;
    if(p.area)$('profileArea').value=p.area;
    if(p.edition)$('profileEdition').value=p.edition;
    if(p.sourceUrl)$('profileSourceUrl').value=p.sourceUrl;
  }

  function showSetup(){
    fillProfileForm();
    $('setupPanel').hidden=false;
    $('protocolApp').hidden=true;
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function showApp(){
    $('setupPanel').hidden=true;
    $('protocolApp').hidden=false;
    renderProfileStrip();
    loadDrill(todayDrill());
    renderAllProgress();
    renderLibrary();
    renderSettings();
  }

  function renderProfileStrip(){
    const profile=state.profile;
    const record=packageRecord();
    if(!profile||!record)return;
    $('profileLevelBadge').textContent=profile.level;
    $('profileAreaName').textContent=`${profile.area} · ${profile.state}`;
    $('profileEditionName').textContent=profile.edition?`Protocol edition ${profile.edition}`:'Protocol edition not entered';
    $('profilePackStatus').textContent=record.package.verified?'Verified package':'Demo / unverified package';
    $('profilePackStatus').className=`status-pill ${record.package.verified?'verified':'demo'}`;
  }

  function loadDrill(drill){
    if(!drill){
      currentDrill=null;
      $('drillTitle').textContent='No drills match this profile';
      $('drillNumber').textContent='Choose another certification level or import a package containing drills for this level.';
      return;
    }
    currentDrill=drill;
    session=freshSession(drill.id);
    currentStep='review';
    $('dailyDate').textContent=`Today · ${new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'}).format(new Date())}`;
    $('drillType').textContent=drill.type||'Protocol';
    $('drillCategory').textContent=drill.category||'General';
    $('drillTime').textContent=`${drill.estimatedMinutes||5} min`;
    $('drillTitle').textContent=drill.title;
    $('drillNumber').textContent=drill.protocolNumber||'';
    renderSource();
    renderReview();
    renderPractice();
    renderQuestions();
    renderSummary();
    goStep('review',true);
  }

  function renderSource(){
    const record=packageRecord();
    const sourceUrl=record?.package.sourceUrl||state.profile?.sourceUrl||'';
    const verified=Boolean(record?.package.verified);
    $('sourceLine').className=`source-line ${verified?'verified':''}`;
    $('sourceLine').innerHTML=`<strong>${verified?'Verified package':'Training demonstration'}</strong><span>${esc(record?.package.sourceLabel||'Compare with your official protocol.')}${record?.package.lastVerified?` · Checked ${esc(record.package.lastVerified)}`:''}</span>`;
    $('demoWarning').hidden=verified;
    $('openOfficialSource').disabled=!sourceUrl;
    $('openOfficialSource').textContent=sourceUrl?'Open official source':'No official link saved';
  }

  function renderReview(){
    const drill=currentDrill;
    renderList('objectiveList',drill.objectives);
    $('appliesWhen').textContent=drill.review.appliesWhen||'';
    renderList('keyAssessment',drill.review.keyAssessment);
    renderList('protocolActions',drill.review.actions);
    renderList('stopPoints',drill.review.stopPoints);
    renderList('medicalControl',drill.review.medicalControl);
    renderList('transportRules',drill.review.transport);
  }

  function renderPractice(){
    const scenario=currentDrill.scenario;
    $('caseDispatch').textContent=scenario.dispatch||'';
    $('casePatient').textContent=scenario.patient||'';
    $('casePrompt').textContent=scenario.prompt||'What should happen next?';
    $('caseChoices').innerHTML=(scenario.choices||[]).map(choice=>`<button type="button" data-case-choice="${esc(choice.id)}">${esc(choice.text)}</button>`).join('');
    $('caseFeedback').className='feedback-box';
    $('caseFeedback').textContent='';
    $('practiceContinue').disabled=true;
  }

  function chooseScenario(choiceId){
    if(session.scenarioAnswered)return;
    const choice=currentDrill.scenario.choices.find(item=>String(item.id)===String(choiceId));
    if(!choice)return;
    session.scenarioAnswered=true;
    session.scenarioCorrect=Boolean(choice.correct);
    document.querySelectorAll('[data-case-choice]').forEach(button=>{
      button.disabled=true;
      const item=currentDrill.scenario.choices.find(option=>String(option.id)===button.dataset.caseChoice);
      if(item?.correct)button.classList.add('correct');
      else if(button.dataset.caseChoice===String(choiceId))button.classList.add('incorrect');
    });
    $('caseFeedback').className=`feedback-box show ${choice.correct?'correct':'incorrect'}`;
    $('caseFeedback').innerHTML=`<strong>${choice.correct?'Good protocol decision.':'Review the priority.'}</strong> ${esc(choice.feedback||'')}`;
    $('practiceContinue').disabled=false;
    updateStepper();
  }

  function renderQuestions(){
    const questions=currentDrill.questions||[];
    $('questionCount').textContent=`${questions.length} question${questions.length===1?'':'s'}`;
    $('questionList').innerHTML=questions.map((question,index)=>`<article class="question-card" data-question-card="${index}"><fieldset><legend>${index+1}. ${esc(question.question)}</legend>${question.options.map((option,optionIndex)=>`<label><input type="radio" name="question-${index}" value="${optionIndex}"> <span>${esc(option)}</span></label>`).join('')}<div class="answer-review" data-answer-review="${index}"></div></fieldset></article>`).join('');
    $('quizResult').className='quiz-result';
    $('quizResult').textContent='';
    const submit=$('questionForm').querySelector('button[type="submit"]');
    submit.textContent='Grade my answers';
    $('completeDrill').disabled=true;
  }

  function gradeQuestions(){
    const questions=currentDrill.questions||[];
    const selections=questions.map((question,index)=>document.querySelector(`input[name="question-${index}"]:checked`));
    if(selections.some(item=>!item)){
      $('quizResult').className='quiz-result show';
      $('quizResult').textContent='Answer every question before grading the drill.';
      return false;
    }
    let correct=0;
    questions.forEach((question,index)=>{
      const selected=Number(selections[index].value);
      const isCorrect=selected===Number(question.answer);
      if(isCorrect)correct+=1;
      const card=document.querySelector(`[data-question-card="${index}"]`);
      card.classList.add('graded',isCorrect?'correct':'incorrect');
      card.querySelectorAll('input').forEach(input=>input.disabled=true);
      const correctText=question.options[question.answer];
      card.querySelector('[data-answer-review]').innerHTML=`<strong>${isCorrect?'Correct.':`Correct answer: ${esc(correctText)}.`}</strong> ${esc(question.rationale||'')}`;
    });
    session.graded=true;
    session.score=Math.round(correct/questions.length*100);
    $('quizResult').className='quiz-result show';
    $('quizResult').textContent=`Score: ${session.score}% · ${correct} of ${questions.length} correct.`;
    $('questionForm').querySelector('button[type="submit"]').textContent='View field summary →';
    $('completeDrill').disabled=false;
    renderSummary();
    updateStepper();
    return true;
  }

  function renderSummary(){
    const summary=currentDrill.summary;
    renderList('summaryActions',summary.actions);
    $('summaryMistake').textContent=summary.mistake||'';
    $('summaryControl').textContent=summary.control||'';
    $('summaryDocumentation').textContent=summary.documentation||'';
    $('scoreBadge').textContent=session.graded?`${session.score}%`:'Not graded';
    $('scoreBadge').className=`score-badge ${session.graded?(session.score>=80?'good':'review'):''}`;
    document.querySelectorAll('input[name="confidence"]').forEach(input=>input.checked=false);
    $('completionMessage').className='completion-message';
    $('completionMessage').textContent='';
    $('completeDrill').textContent='Complete today’s drill';
  }

  function goStep(step,force=false){
    if(!currentDrill)return;
    if(!force&&step==='questions'&&!session.scenarioAnswered){
      $('caseFeedback').className='feedback-box show incorrect';
      $('caseFeedback').textContent='Choose a patient-care decision before moving to the questions.';
      step='practice';
    }
    if(!force&&step==='summary'&&!session.graded){
      $('quizResult').className='quiz-result show';
      $('quizResult').textContent='Grade the questions before opening the field summary.';
      step='questions';
    }
    currentStep=step;
    document.querySelectorAll('[data-step-panel]').forEach(panel=>panel.classList.toggle('active',panel.dataset.stepPanel===step));
    updateStepper();
    document.querySelector('.drill-stepper').scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function updateStepper(){
    const order=['review','practice','questions','summary'];
    const currentIndex=order.indexOf(currentStep);
    document.querySelectorAll('[data-step-indicator]').forEach(item=>{
      const index=order.indexOf(item.dataset.stepIndicator);
      item.classList.toggle('active',item.dataset.stepIndicator===currentStep);
      let done=index<currentIndex;
      if(item.dataset.stepIndicator==='practice'&&session.scenarioAnswered)done=true;
      if(item.dataset.stepIndicator==='questions'&&session.graded)done=true;
      if(item.dataset.stepIndicator==='summary'&&session.completed)done=true;
      item.classList.toggle('done',done);
    });
  }

  function completeDrill(){
    if(!session.graded)return goStep('questions');
    const confidence=document.querySelector('input[name="confidence"]:checked')?.value;
    if(!confidence){
      $('completionMessage').className='completion-message show';
      $('completionMessage').textContent='Choose a confidence level so EMSCodeSim knows whether this protocol should return soon.';
      return;
    }
    const date=localDate();
    const prior=state.progress[currentDrill.id]||{attempts:0,bestScore:0};
    state.progress[currentDrill.id]={attempts:Number(prior.attempts||0)+1,bestScore:Math.max(Number(prior.bestScore||0),session.score),lastScore:session.score,lastDate:date,confidence,scenarioCorrect:session.scenarioCorrect};
    const completion={id:`${date}|${currentDrill.id}`,date,drillId:currentDrill.id,title:currentDrill.title,category:currentDrill.category,score:session.score,confidence,packId:state.activePackId};
    const existing=state.completions.findIndex(item=>item.id===completion.id);
    if(existing>=0)state.completions[existing]=completion;else state.completions.push(completion);
    state.completions=state.completions.slice(-500);
    session.completed=true;
    saveState();
    $('completionMessage').className='completion-message show';
    $('completionMessage').textContent=confidence==='confident'?'Drill complete. This protocol is marked confident.':'Drill complete. This protocol was added to your needs-review queue.';
    $('completeDrill').textContent='Completed ✓';
    $('completeDrill').disabled=true;
    updateStepper();
    renderAllProgress();
    renderLibrary();
  }

  function renderAllProgress(){
    const completions=state.completions;
    const uniqueDrills=new Set(completions.map(item=>item.drillId));
    const average=completions.length?Math.round(completions.reduce((sum,item)=>sum+Number(item.score||0),0)/completions.length):0;
    const review=needsReviewRecords();
    $('streakNumber').textContent=currentStreak();
    $('completedNumber').textContent=completions.length;
    $('reviewNumber').textContent=review.length;
    $('progressStats').innerHTML=[['Current streak',`${currentStreak()} days`],['Completed',completions.length],['Protocols practiced',uniqueDrills.size],['Average score',completions.length?`${average}%`:'—']].map(([label,value])=>`<article><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`).join('');
    $('needsReviewList').innerHTML=review.length?review.map(item=>`<div class="review-item"><div><strong>${esc(item.drill.title)}</strong><span>${esc(item.drill.category)} · Best ${item.bestScore}% · ${esc((item.confidence||'needs review').replace('-', ' '))}</span></div><button type="button" data-open-drill="${esc(item.id)}">Practice</button></div>`).join(''):'<span class="empty-state">No protocols are currently marked for review.</span>';
    $('historyList').innerHTML=completions.length?[...completions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12).map(item=>`<div class="history-item"><div><strong>${esc(item.title||getDrill(item.drillId)?.title||'Protocol drill')}</strong><span>${formatDate(item.date)} · ${esc(item.category||'General')}</span></div><strong>${Number(item.score||0)}%</strong></div>`).join(''):'<span class="empty-state">No drills completed yet.</span>';
  }

  function renderLibrary(){
    const drills=eligibleDrills();
    const categories=[...new Set(drills.map(drill=>drill.category).filter(Boolean))].sort();
    const currentCategory=$('libraryCategory').value||'all';
    $('libraryCategory').innerHTML='<option value="all">All categories</option>'+categories.map(category=>`<option value="${esc(category)}">${esc(category)}</option>`).join('');
    if(currentCategory==='all'||categories.includes(currentCategory))$('libraryCategory').value=currentCategory;
    const search=$('librarySearch').value.trim().toLowerCase();
    const category=$('libraryCategory').value;
    const filtered=drills.filter(drill=>(category==='all'||drill.category===category)&&(!search||`${drill.title} ${drill.protocolNumber} ${drill.category} ${drill.type}`.toLowerCase().includes(search)));
    $('libraryList').innerHTML=filtered.length?filtered.map(drill=>{
      const progress=state.progress[drill.id];
      return`<article class="library-card"><div class="drill-tags"><span>${esc(drill.type)}</span><span>${esc(drill.category)}</span><span>${esc(drill.estimatedMinutes||5)} min</span></div><h3>${esc(drill.title)}</h3><p>${esc(drill.protocolNumber||'')}${progress?` · Best score ${progress.bestScore}% · ${esc((progress.confidence||'').replace('-',' '))}`:' · Not practiced yet'}</p><button class="secondary-action" type="button" data-open-drill="${esc(drill.id)}">Practice now</button></article>`;
    }).join(''):'<p class="empty-state">No drills match this filter.</p>';
  }

  function renderSettings(){
    const profile=state.profile;
    const record=packageRecord();
    $('settingsProfileSummary').innerHTML=profile?`<p><strong>${esc(profile.level)}</strong><br>${esc(profile.area)}, ${esc(profile.state)}<br>${profile.edition?`Edition ${esc(profile.edition)}`:'No edition entered'}</p><p class="muted">Package: ${esc(record?.package.name||'None')}</p>`:'<p>No profile saved.</p>';
    $('packageList').innerHTML=allPackageRecords().map(item=>`<div class="package-item"><div><strong>${esc(item.package.name)}</strong><span>${esc(item.package.state||'')} · ${esc(item.package.area||'')} · ${item.package.verified?'Verified':'Unverified'}</span></div><div>${item.package.id===state.activePackId?'<span class="status-pill verified">Active</span>':`<button type="button" data-use-package="${esc(item.package.id)}">Use</button>`}${item.imported?` <button type="button" data-remove-package="${esc(item.package.id)}">Remove</button>`:''}</div></div>`).join('');
  }

  function switchTab(tab){
    document.querySelectorAll('.protocol-tabs button').forEach(button=>button.classList.toggle('active',button.dataset.tab===tab));
    document.querySelectorAll('.app-tab').forEach(panel=>panel.classList.toggle('active',panel.id===`${tab}Tab`));
    if(tab==='progress')renderAllProgress();
    if(tab==='library')renderLibrary();
    if(tab==='settings')renderSettings();
  }

  function openDrill(id){
    const drill=getDrill(id);
    if(!drill)return;
    loadDrill(drill);
    switchTab('today');
    document.querySelector('.protocol-app').scrollIntoView({behavior:'smooth'});
  }

  function validateImportedPack(data){
    if(!data||typeof data!=='object'||!data.package||!Array.isArray(data.drills))throw new Error('The file must contain a package object and drills array.');
    const packageData=data.package;
    if(!packageData.id||!packageData.name||!packageData.state||!packageData.area||!packageData.edition)throw new Error('Package id, name, state, area, and edition are required.');
    if(data.drills.length<1)throw new Error('The package contains no drills.');
    const ids=new Set();
    data.drills.forEach((drill,index)=>{
      if(!drill.id||!drill.title||!drill.review||!drill.scenario||!Array.isArray(drill.questions)||!drill.summary)throw new Error(`Drill ${index+1} is missing required content.`);
      if(ids.has(drill.id))throw new Error(`Duplicate drill id: ${drill.id}`);ids.add(drill.id);
      if(!Array.isArray(drill.levels)||!drill.levels.length)throw new Error(`${drill.title} needs at least one certification level.`);
      if(!Array.isArray(drill.scenario.choices)||!drill.scenario.choices.some(choice=>choice.correct))throw new Error(`${drill.title} needs a correct scenario choice.`);
      if(drill.questions.length<1)throw new Error(`${drill.title} needs at least one question.`);
      drill.questions.forEach(question=>{if(!Array.isArray(question.options)||question.options.length<2||question.answer<0||question.answer>=question.options.length)throw new Error(`${drill.title} contains an invalid question.`);});
      drill.packId=packageData.id;
    });
    return{package:{...packageData,verified:Boolean(packageData.verified)},drills:data.drills};
  }

  async function importPack(file){
    if(!file)return;
    if(file.size>2_000_000)throw new Error('Protocol package is larger than 2 MB.');
    const record=validateImportedPack(JSON.parse(await file.text()));
    const existing=state.importedPackages.findIndex(item=>item.package.id===record.package.id);
    if(existing>=0)state.importedPackages[existing]=record;else state.importedPackages.push(record);
    state.activePackId=record.package.id;
    if(state.profile){
      state.profile={...state.profile,state:STATES.includes(record.package.state)?record.package.state:state.profile.state,area:record.package.area||state.profile.area,edition:record.package.edition||state.profile.edition,sourceUrl:record.package.sourceUrl||state.profile.sourceUrl,packId:record.package.id};
    }
    saveState();
    populatePackages();
    renderProfileStrip();
    renderSettings();
    loadDrill(todayDrill());
    renderLibrary();
    $('importStatus').textContent=`Imported ${record.drills.length} drill${record.drills.length===1?'':'s'} from ${record.package.name}.`;
  }

  function usePackage(id){
    if(!allPackageRecords().some(record=>record.package.id===id))return;
    state.activePackId=id;
    if(state.profile)state.profile.packId=id;
    saveState();
    renderProfileStrip();
    loadDrill(todayDrill());
    renderLibrary();
    renderSettings();
  }

  function removePackage(id){
    const record=state.importedPackages.find(item=>item.package.id===id);
    if(!record||!confirm(`Remove ${record.package.name} from this device?`))return;
    state.importedPackages=state.importedPackages.filter(item=>item.package.id!==id);
    if(state.activePackId===id){state.activePackId='emscodesim-demo';if(state.profile)state.profile.packId=state.activePackId;}
    saveState();
    populatePackages();
    renderProfileStrip();
    loadDrill(todayDrill());
    renderLibrary();
    renderSettings();
  }

  function bindEvents(){
    $('mobileMenu').addEventListener('change',event=>{if(event.target.value)location.href=event.target.value;});
    $('profilePack').addEventListener('change',applyPackageToProfileForm);
    $('profileForm').addEventListener('submit',event=>{
      event.preventDefault();
      state.activePackId=$('profilePack').value;
      state.profile={level:$('profileLevel').value,state:$('profileState').value,area:$('profileArea').value.trim(),edition:$('profileEdition').value.trim(),sourceUrl:$('profileSourceUrl').value.trim(),packId:state.activePackId};
      state.drillOffset=0;
      saveState();
      showApp();
    });
    $('editProfileTop').addEventListener('click',showSetup);
    $('editProfileSettings').addEventListener('click',showSetup);
    document.querySelectorAll('.protocol-tabs button').forEach(button=>button.addEventListener('click',()=>switchTab(button.dataset.tab)));
    document.querySelectorAll('[data-next-step]').forEach(button=>button.addEventListener('click',()=>goStep(button.dataset.nextStep)));
    document.querySelectorAll('[data-go-step]').forEach(button=>button.addEventListener('click',()=>goStep(button.dataset.goStep)));
    $('caseChoices').addEventListener('click',event=>{const button=event.target.closest('[data-case-choice]');if(button)chooseScenario(button.dataset.caseChoice);});
    $('questionForm').addEventListener('submit',event=>{event.preventDefault();if(session.graded)goStep('summary');else gradeQuestions();});
    $('completeDrill').addEventListener('click',completeDrill);
    $('anotherDrill').addEventListener('click',()=>{state.drillOffset=Number(state.drillOffset||0)+1;saveState();loadDrill(todayDrill());});
    $('openOfficialSource').addEventListener('click',()=>{const url=packageRecord()?.package.sourceUrl||state.profile?.sourceUrl;if(url)window.open(url,'_blank','noopener,noreferrer');});
    $('libraryCategory').addEventListener('change',renderLibrary);
    $('librarySearch').addEventListener('input',renderLibrary);
    $('printProgress').addEventListener('click',()=>window.print());
    $('packImport').addEventListener('change',async event=>{try{await importPack(event.target.files?.[0]);}catch(error){$('importStatus').textContent=error.message||'The package could not be imported.';}finally{event.target.value='';}});
    $('resetProtocolData').addEventListener('click',()=>{if(!confirm('Erase your protocol profile, imported packages, progress, and streak from this device?'))return;state=structuredCloneSafe(DEFAULT_STATE);saveState();fillProfileForm();showSetup();});
    document.body.addEventListener('click',event=>{
      const open=event.target.closest('[data-open-drill]');if(open)openDrill(open.dataset.openDrill);
      const use=event.target.closest('[data-use-package]');if(use)usePackage(use.dataset.usePackage);
      const remove=event.target.closest('[data-remove-package]');if(remove)removePackage(remove.dataset.removePackage);
    });
  }

  async function init(){
    try{
      loadState();
      populateStates();
      await loadData();
      populatePackages();
      bindEvents();
      fillProfileForm();
      if(state.profile)showApp();else showSetup();
    }catch(error){
      console.error(error);
      $('setupPanel').innerHTML=`<div class="demo-warning"><strong>Daily protocol data could not be loaded.</strong><p>${esc(error.message||'Refresh the page or verify the data file is present.')}</p></div>`;
    }
  }

  document.addEventListener('DOMContentLoaded',init);
})();
