(() => {
  'use strict';

  const api = window.EMSCodeSimPatientRecord;
  const session = window.EMSCodeSimScenarioSession;
  const runtime = window.EMSCodeSimScenarioRuntime;
  const registry = window.EMSCodeSimToolRegistry;
  const phases = window.EMSCodeSimScenarioPhases;
  const params = new URLSearchParams(location.search);
  const rawRequestedId = params.get('case') || session?.requestedCaseId?.() || api?.active?.()?.scenarioId || 'asthma';
  const CASE_ALIASES = { respiratory: 'asthma', 'horse-crush': 'horse_crush', horsecrush: 'horse_crush' };
  const requestedId = CASE_ALIASES[String(rawRequestedId).trim().toLowerCase()] || String(rawRequestedId).trim().toLowerCase();

  const CASES = window.EMSCodeSimScenarioDefinitions?.PATIENT_CASES || {};


  const CONDITION_STAGES = window.EMSCodeSimScenarioDefinitions?.CONDITION_STAGES || {};


  const TREATMENT_PLANS = window.EMSCodeSimScenarioDefinitions?.TREATMENT_PLANS || {};

  // Broad EMT-level care library. Local protocols and medical direction always control.
  const EMT_TREATMENT_LIBRARY = [
    { id:'manual_airway_position', label:'Manual airway positioning', summary:'Open and maintain the airway using positioning appropriate to the patient.', category:'airway', evidence:['airway'], targets:['airway','breathing'], response:'Airway positioning is performed. Reassess patency and breathing.' },
    { id:'suction_airway', label:'Suction the airway', summary:'Clear visible or audible secretions while limiting suction time.', category:'airway', evidence:['airway'], targets:['airway','breathing','spo2'], response:'Secretions are removed. Reassess airway sounds, patency, and oxygenation.', documentation:[{name:'device',label:'Suction device',type:'select',required:true,options:['Rigid tonsil-tip catheter','Flexible suction catheter']}] },
    { id:'opa', label:'Insert an oropharyngeal airway', summary:'Select and insert an OPA when the patient lacks a gag reflex.', category:'airway', evidence:['airway','mental_status'], targets:['airway','breathing'], response:'The airway adjunct is placed. Reassess tolerance and ventilation.', documentation:[{name:'size',label:'OPA size / measurement',required:true,placeholder:'Document selected size or measurement'}] },
    { id:'npa', label:'Insert a nasopharyngeal airway', summary:'Select and insert an NPA when appropriate and not contraindicated.', category:'airway', evidence:['airway','mental_status'], targets:['airway','breathing'], response:'The airway adjunct is placed. Reassess patency and tolerance.', documentation:[{name:'size',label:'NPA size / measurement',required:true,placeholder:'Document selected size or measurement'}] },
    { id:'foreign_body_airway', label:'Relieve foreign-body airway obstruction', summary:'Use age-appropriate conscious or unconscious choking care.', category:'airway', evidence:['airway'], targets:['airway','breathing','mental_status'], response:'Foreign-body airway care is performed. Reassess air movement and responsiveness.', documentation:[{name:'method',label:'Technique',type:'select',required:true,options:['Abdominal thrusts','Chest thrusts','Back slaps and chest thrusts','CPR with airway checks']}] },
    { id:'oxygen_general', label:'Administer oxygen', summary:'Choose a delivery device and flow based on the patient presentation and protocol.', category:'breathing', evidence:['breathing','spo2'], targets:['breathing','respirations','spo2'], response:'Oxygen is applied. Reassess respiratory effort and oxygenation.', documentation:[{name:'device',label:'Delivery device',type:'select',required:true,options:['Nasal cannula','Nonrebreather mask','Venturi mask','Blow-by oxygen']},{name:'flow',label:'Flow rate',required:true,placeholder:'L/min'}] },
    { id:'bvm_general', label:'Assist ventilations with BVM', summary:'Provide age-appropriate assisted ventilations with visible chest rise.', category:'breathing', evidence:['breathing','respirations'], targets:['airway','breathing','respirations','spo2'], response:'Assisted ventilations are started. Reassess chest rise, rate, and oxygenation.', documentation:[{name:'rate',label:'Ventilation rate',required:true,placeholder:'breaths/min'},{name:'device',label:'Airway adjunct / setup',type:'select',required:true,options:['BVM only','BVM with OPA','BVM with NPA','Two-person BVM']}] },
    { id:'cpap', label:'Apply CPAP', summary:'Apply CPAP when permitted and the patient meets local indications.', category:'breathing', evidence:['breathing','spo2','blood_pressure'], targets:['breathing','respirations','spo2','blood_pressure'], response:'CPAP is applied. Reassess tolerance, blood pressure, breathing, and SpO₂.', documentation:[{name:'pressure',label:'CPAP pressure',required:true,placeholder:'cm H2O'}] },
    { id:'control_bleeding', label:'Control external bleeding', summary:'Use direct pressure, pressure dressing, wound packing, or tourniquet as indicated.', category:'circulation', evidence:['perfusion','trauma_assessment'], targets:['perfusion','pulse','blood_pressure','skin'], response:'Bleeding-control care is applied. Reassess hemorrhage and perfusion.', documentation:[{name:'method',label:'Method',type:'select',required:true,options:['Direct pressure','Pressure dressing','Wound packing','Hemostatic dressing','Tourniquet']}] },
    { id:'shock_care', label:'Treat for shock', summary:'Maintain temperature, position appropriately, minimize delays, and reassess perfusion.', category:'circulation', evidence:['perfusion','skin','blood_pressure'], targets:['perfusion','pulse','blood_pressure','skin','mental_status'], response:'Shock precautions are started. Reassess perfusion and mental status.' },
    { id:'cpr_aed', label:'Begin CPR and apply AED', summary:'Perform high-quality CPR and use the AED for a pulseless patient.', category:'circulation', evidence:['pulse','breathing','mental_status'], targets:['pulse','breathing','mental_status'], response:'Resuscitation is underway. Follow AED prompts and reassess at appropriate intervals.', documentation:[{name:'rate',label:'Compression rate',required:true,placeholder:'compressions/min'},{name:'ratio',label:'Compression-to-ventilation ratio',required:true,placeholder:'Example: 30:2'}] },
    { id:'aspirin', label:'Administer aspirin', summary:'Administer protocol-approved aspirin for suspected acute coronary syndrome after contraindication screening.', category:'medications', evidence:['pain','blood_pressure'], targets:['pain','blood_pressure'], response:'Aspirin is administered. Continue cardiac assessment and monitor for change.', documentation:[{name:'dose',label:'Dose',required:true,placeholder:'mg'},{name:'route',label:'Route',type:'select',required:true,options:['Oral, chewed']}] },
    { id:'nitroglycerin_assist', label:'Assist with prescribed nitroglycerin', summary:'Verify prescription, blood pressure, dose, and contraindications before assisting.', category:'medications', evidence:['pain','blood_pressure'], targets:['pain','blood_pressure'], response:'Nitroglycerin assistance is completed. Reassess pain and blood pressure.', documentation:[{name:'dose',label:'Dose',required:true,placeholder:'mg or tablet/spray'},{name:'route',label:'Route',type:'select',required:true,options:['Sublingual tablet','Sublingual spray']}] },
    { id:'epinephrine_auto', label:'Administer epinephrine auto-injector', summary:'Use for suspected severe allergic reaction/anaphylaxis under protocol.', category:'medications', evidence:['airway','breathing','skin','perfusion'], targets:['airway','breathing','skin','perfusion','pulse'], response:'Epinephrine is administered. Reassess airway, breathing, perfusion, and pulse.', documentation:[{name:'dose',label:'Dose',required:true,placeholder:'mg'},{name:'route',label:'Route',type:'select',required:true,options:['IM auto-injector']}] },
    { id:'naloxone', label:'Administer naloxone', summary:'Use for suspected opioid toxicity with respiratory depression under protocol.', category:'medications', evidence:['breathing','respirations','mental_status'], targets:['breathing','respirations','mental_status','spo2'], response:'Naloxone is administered. Reassess ventilation and mental status.', documentation:[{name:'dose',label:'Dose',required:true,placeholder:'mg'},{name:'route',label:'Route',type:'select',required:true,options:['Intranasal','Intramuscular','Auto-injector']}] },
    { id:'oral_glucose_general', label:'Administer oral glucose', summary:'Use when hypoglycemia is suspected and the patient can swallow safely.', category:'medications', evidence:['blood_glucose','mental_status','airway'], targets:['blood_glucose','mental_status','airway'], response:'Oral glucose is administered. Reassess glucose and mental status.', documentation:[{name:'dose',label:'Dose',required:true,placeholder:'g'},{name:'route',label:'Route',type:'select',required:true,options:['Oral / buccal']}] },
    { id:'bronchodilator_general', label:'Assist/administer bronchodilator', summary:'Use a prescribed or protocol-authorized bronchodilator after medication checks.', category:'medications', evidence:['breathing','breath_sounds'], targets:['breathing','breath_sounds','respirations','spo2','pulse'], response:'Bronchodilator treatment is delivered. Reassess air movement, wheezing, pulse, and SpO₂.', documentation:[{name:'medication',label:'Medication',type:'select',required:true,options:['Albuterol nebulizer','Albuterol MDI']},{name:'dose',label:'Dose',required:true,placeholder:'mg or puffs'},{name:'route',label:'Route',type:'select',required:true,options:['Nebulized inhalation','Metered-dose inhaler']}] },
    { id:'splint', label:'Splint an extremity injury', summary:'Assess distal function, stabilize the injury, and reassess distal function.', category:'trauma', evidence:['trauma_assessment','motor_sensory'], targets:['trauma_assessment','motor_sensory','pain'], response:'The injury is splinted. Reassess distal pulse, motor function, sensation, and pain.', documentation:[{name:'device',label:'Splint type',required:true,placeholder:'Document splint used'}] },
    { id:'spinal_precautions', label:'Apply spinal motion restriction', summary:'Apply patient-centered motion restriction when assessment findings indicate it.', category:'trauma', evidence:['trauma_assessment','motor_sensory'], targets:['trauma_assessment','motor_sensory'], response:'Motion restriction is applied. Continue neurologic reassessment.' },
    { id:'burn_care', label:'Provide burn care', summary:'Stop the burning process, cover appropriately, prevent hypothermia, and reassess.', category:'trauma', evidence:['trauma_assessment','skin'], targets:['skin','pain','perfusion'], response:'Burn care is provided. Reassess pain, perfusion, and temperature.' },
    { id:'eye_irrigation', label:'Irrigate the eye', summary:'Irrigate chemical contamination while protecting the unaffected eye.', category:'trauma', evidence:['trauma_assessment'], targets:['trauma_assessment','pain'], response:'Eye irrigation is underway. Reassess pain and visual complaint.' },
    { id:'assist_childbirth', label:'Assist emergency childbirth', summary:'Prepare for delivery, support the newborn, and manage immediate postpartum care.', category:'support', evidence:['abdominal_assessment'], targets:['perfusion','mental_status'], response:'Delivery care is provided and maternal/newborn reassessment continues.' },
    { id:'request_als', label:'Request ALS / additional resources', summary:'Request resources based on patient acuity, anticipated care, and scene needs.', category:'support', evidence:[], targets:[], response:'Additional resources are requested.' }
  ];

  const scenario = CASES[requestedId] || CASES.asthma;
  const id = CASES[requestedId] ? requestedId : 'asthma';
  const interviewEngine = window.EMSCodeSimScenarioInterviews;
  const interview = interviewEngine?.get?.(id) || { responder:'Patient', communication:'Patient interview available.', opening:'Select a question to begin.', fallback:'The patient cannot provide that information.', categories:[], questions:[], sampleRequired:[], opqrstRequired:[] };
  const $ = value => document.getElementById(value);
  const MEASURABLE_TOOL_KEYS = new Set(['blood_pressure','pulse','respirations','spo2','blood_glucose','temperature']);
  const PRIMARY_KEYS = new Set(['scene_size_up','airway','breathing','perfusion']);
  let activeFocus = null;
  let findingFilter = 'all';
  let infoUpdates = [];
  let infoUpdateIndex = 0;
  let sceneObservationUpdate = null;
  let lastInfoSignature = '';
  let timerInterval = 0;
  let conditionInterval = 0;
  let scenarioStartMs = 0;
  const TRANSPORT_PLANS = {
    asthma: { impressions:['Acute asthma exacerbation','Respiratory distress with hypoxia','Impending respiratory failure'], priorities:['Routine transport','Prompt transport','Emergent transport / ALS intercept'], destinations:['Closest appropriate emergency department','Respiratory-capable emergency department'], bestPriority:'Prompt transport', bestDestination:'Closest appropriate emergency department' },
    stroke: { impressions:['Acute stroke syndrome','Hypoglycemia mimicking stroke','Nonspecific weakness'], priorities:['Routine transport','Emergent stroke transport','Remain on scene for complete exam'], destinations:['Stroke-capable center','Closest emergency department','Trauma center'], bestPriority:'Emergent stroke transport', bestDestination:'Stroke-capable center' },
    hypoglycemia: { impressions:['Symptomatic hypoglycemia','Acute stroke','Medication overdose'], priorities:['Routine transport after improvement','Prompt transport / ALS intercept','No transport needed'], destinations:['Closest appropriate emergency department','Stroke-capable center','Trauma center'], bestPriority:'Prompt transport / ALS intercept', bestDestination:'Closest appropriate emergency department' },
    trauma: { impressions:['Blunt multisystem trauma with shock','Isolated chest-wall pain','Minor collision without injury'], priorities:['Routine transport','Emergent trauma transport','Remain on scene for complete history'], destinations:['Trauma center','Closest emergency department','Stroke-capable center'], bestPriority:'Emergent trauma transport', bestDestination:'Trauma center' },
    pediatric: { impressions:['Pediatric respiratory distress','Simple febrile illness','Foreign-body airway obstruction'], priorities:['Routine transport','Prompt pediatric transport','Emergent transport / ALS intercept'], destinations:['Pediatric-capable emergency department','Closest appropriate emergency department'], bestPriority:'Prompt pediatric transport', bestDestination:'Pediatric-capable emergency department' },
    horse_crush: { impressions:['Significant blunt hip/pelvic-region injury','Isolated soft-tissue hip injury','Occult proximal femur or acetabular injury'], priorities:['Non-emergent transport','Prompt trauma transport','Emergent trauma transport'], destinations:['Closest appropriate emergency department','Trauma center'], bestPriority:'Prompt trauma transport', bestDestination:'Closest appropriate emergency department' }
  };

  let partnerInterval = 0;
  let conditionEvaluationActive = false;
  let treatmentCategoryFocus = '';
  let nextActionFinding = null;
  let infoAutoCollapseTimer = 0;
  let infoManuallyCollapsed = false;
  let lastInfoItemId = '';
  let assessmentComplaintFocus = '';
  let lastHistoryResponse = null;
  let horseWorkspaceContext = null;
  let horseCurrentAssessment = 'abc';
  let horseAssessmentCollapsed = false;
  let horseHistoryActiveGroup = '';
  let horseTreatmentActiveGroup = '';
  const renderSignatures = { vitals:'', assessments:'', history:'', treatments:'', findings:'', progress:'' };

  function dataSignature(value) {
    try { return JSON.stringify(value); } catch { return String(Date.now()); }
  }

  function detailsState(container, attribute) {
    if (!container) return new Set();
    return new Set([...container.querySelectorAll(`details[${attribute}]`)]
      .filter(item => item.open)
      .map(item => item.getAttribute(attribute))
      .filter(Boolean));
  }

  function restoreSheetScroll(scrollTop) {
    if (!$('actionSheet') || $('actionSheet').hidden) return;
    window.requestAnimationFrame(() => { $('actionSheet').scrollTop = scrollTop; });
  }

  function ensureRecord() {
    const restored = session?.sync?.(id) || api?.active?.();
    if (restored && restored.scenarioId === id) return restored;
    const stored = api?.load?.(id);
    if (stored) return api.save(stored);
    return api?.create?.({
      id,
      title: scenario.title,
      patient: id === 'pediatric' ? '3-year-old child' : 'Adult patient',
      dispatch: runtime?.PROFILES?.[id]?.dispatch || scenario.title,
      scene: runtime?.PROFILES?.[id]?.scene || 'Active scene',
      goal: 'Assess, treat, reassess, and report'
    });
  }

  function record() { return session?.active?.(id) || api?.active?.(); }
  function trainingMode() { return params.get('training') || record()?.documentation?.trainingMode || 'learning'; }
  function assessmentMode() { return trainingMode() === 'assessment'; }
  function modeTag(label, className = 'optional') { return assessmentMode() ? '' : `<span class="requirement-tag ${className}">${escapeHtml(label)}</span>`; }
  function existing(key) { return Boolean(api?.hasFinding?.(key, record())); }
  function labelFor(key) { return api?.labelFor?.(key) || phases?.labelFor?.(key) || String(key).replace(/_/g, ' '); }
  function valueFor(key) { return runtime?.formatVital?.(key) || 'Obtained'; }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }
  function formatClock(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  }
  function elapsedLabel(value, startedAt) {
    const eventTime = new Date(value).getTime();
    const startTime = new Date(startedAt).getTime();
    if (!Number.isFinite(eventTime) || !Number.isFinite(startTime) || eventTime < startTime) return '00:00';
    const total = Math.floor((eventTime - startTime) / 1000);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
  function eventTypeLabel(event) {
    if (event.type === 'treatment') return 'Treatment';
    if (event.type === 'reassessment') return 'Reassessment';
    if (event.category === 'vital') return 'Vital';
    if (event.category === 'history') return 'History';
    if (event.type === 'impression') return 'Impression';
    if (event.type === 'documentation') return 'Report';
    if (event.type === 'uncertainty') return 'Uncertainty';
    if (event.type === 'patient_response') return 'Patient response';
    return 'Assessment';
  }

  function toast(message) {
    $('toast').textContent = message;
    $('toast').hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { $('toast').hidden = true; }, 2800);
  }

  function setPatientImage(image, path) {
    if (!image) return;
    image.onerror = () => {
      image.onerror = null;
      image.src = id === 'pediatric' ? '/vitals/assets/scenario-patient-pediatric-v3.png' : '/vitals/assets/scenario-patient-adult-v3.png';
      image.classList.add('image-fallback');
    };
    image.src = path;
    image.hidden = false;
  }

  function saveFinding(key, value, source = 'assessment', meta = {}) {
    const normality = runtime?.classifyFinding?.(key, value) || '';
    const payload = { source, normality, status: normality === 'normal' ? 'normal' : normality === 'not-normal' ? 'abnormal' : '', ...meta };
    try {
      if (session?.saveFinding) session.saveFinding(key, value, payload);
      else api?.setFinding?.(key, value, payload);
      refreshFromRecord();
      toast(`${labelFor(key)} recorded`);
      if (payload.status === 'abnormal' || payload.normality === 'not-normal') {
        window.setTimeout(() => showClinicalNextActions({ key, label: payload.label || labelFor(key), value, finding: value, status: 'abnormal', normality: 'not-normal' }), 80);
      }
    } catch (error) {
      console.error(error);
      toast('Finding was not saved. Try again before leaving this screen.');
    }
  }

  function toolUrl(url, returnLabel = 'Patient', context = '') {
    return registry?.buildUrl?.(url, {
      caseId: id,
      returnTo: `/vitals/visual-patient.html?case=${encodeURIComponent(id)}&training=${encodeURIComponent(trainingMode())}`,
      training: trainingMode(),
      returnLabel,
      context
    }) || url;
  }

  function classificationLabel(key) {
    if (assessmentMode()) return 'Available';
    const value = phases?.classification?.(id, key) || (scenario.recommended.includes(key) ? 'appropriate' : 'optional');
    return {
      required: 'Required',
      appropriate: 'Clinically appropriate',
      optional: 'Optional',
      'not-indicated': 'Not indicated now'
    }[value] || 'Optional';
  }

  function classificationClass(key) {
    return phases?.classification?.(id, key) || (scenario.recommended.includes(key) ? 'appropriate' : 'optional');
  }

  function partnerTaskFor(key) { return session?.readPartnerTasks?.(id)?.[key] || null; }
  function secondsRemaining(task) { return Math.max(0, Math.ceil((new Date(task?.dueAt).getTime() - Date.now()) / 1000)); }

  function renderVitalTool(tool) {
    const current = record() || {};
    const finding = api?.getFinding?.(tool.key, current) || current.findings?.[tool.key] || null;
    const complete = Boolean(finding);
    const repeatHref = complete ? (() => {
      const u = new URL(toolUrl(tool.url), location.origin);
      u.searchParams.set('reassess','1');
      return `${u.pathname}${u.search}${u.hash}`;
    })() : toolUrl(tool.url);
    const task = partnerTaskFor(tool.key);
    const pending = ['active','pending'].includes(task?.status) && !complete;
    const queued = task?.status === 'queued' && !complete;
    const state = assessmentState(tool.key);
    const result = complete ? (finding.value || finding.finding || valueFor(tool.key)) : tool.description;
    const recordedAt = finding?.recordedAt || finding?.time;
    const timing = complete && recordedAt ? `Obtained at ${elapsedLabel(recordedAt, current.startedAt)}` : 'Not yet obtained';
    const due = state.code === 'reassessment-due';
    const article = document.createElement('article');
    article.className = `tool compact-vital-row ${classificationClass(tool.key)}${complete ? ' done' : ''}${due ? ' reassessment-due' : ''}`;
    article.dataset.toolKey = tool.key;
    article.innerHTML = `
      <span class="vital-row-icon" aria-hidden="true">${due ? '↻' : complete ? '✓' : '○'}</span>
      <div class="vital-row-copy">
        <div class="vital-row-heading"><h3>${escapeHtml(tool.label)}</h3><span class="status-chip ${complete ? 'done' : pending || queued ? 'pending' : ''}">${due ? 'Reassess' : complete ? 'Obtained' : pending ? 'Partner working' : queued ? 'Queued' : 'Available'}</span></div>
        <strong class="vital-latest-result">${escapeHtml(result)}</strong>
        <small>${escapeHtml(due ? 'Treatment performed · reassessment due' : pending ? `Partner gathering this vital · ${secondsRemaining(task)} sec` : queued ? 'Queued behind the current partner skill' : timing)}</small>
      </div>
      <div class="vital-row-actions">
        <a href="${repeatHref}">${complete ? 'Reassess' : 'Perform'}</a>
        <button class="partner-action compact-partner-action" type="button" ${pending || queued ? 'disabled' : ''}>${pending ? 'Working' : queued ? 'Queued' : 'Partner'}</button>
      </div>
      <div class="assignment-progress" ${pending || queued ? '' : 'hidden'}>${pending ? `Partner gathering ${escapeHtml(tool.label.toLowerCase())}… ${secondsRemaining(task)}s` : queued ? 'Queued — partner will start after the current skill.' : ''}</div>`;
    const button = article.querySelector('.partner-action');
    button?.addEventListener('click', () => {
      try {
        session?.assignPartnerTask?.({ key: tool.key, label: tool.label, value: valueFor(tool.key), delaySeconds: tool.delay || 12 }, id);
        renderSignatures.vitals = '';
        refreshFromRecord();
        toast(`${tool.label} assigned to partner`);
      } catch (error) {
        console.error(error);
        toast('Partner task could not be assigned.');
      }
    });
    return article;
  }

  function appendToolGroup(host, title, copy, tools, className = '') {
    if (!tools.length) return;
    const heading = document.createElement('div');
    heading.className = `tool-group-heading ${className}`;
    heading.innerHTML = `<h3>${escapeHtml(title)}</h3>${copy ? `<p>${escapeHtml(copy)}</p>` : ''}`;
    host.appendChild(heading);
    tools.forEach(tool => host.appendChild(renderVitalTool(tool)));
  }

  function buildVitals() {
    const box = $('vitalTools');
    box.innerHTML = '';
    const tools = (registry?.vitalTools || []).filter(tool => MEASURABLE_TOOL_KEYS.has(tool.key));
    if (id === 'horse_crush') {
      appendToolGroup(box, 'Vital and bedside tools', 'Choose the measurements that fit the call. Nothing here is required simply because it appears in the menu.', tools, 'horse-free-flow');
      return;
    }
    if (assessmentMode()) {
      appendToolGroup(box, 'Patient tools', 'Choose the measurements you believe are appropriate. Results and decisions are reviewed during debrief.', tools, 'assessment-mode');
      return;
    }
    const relevant = tools.filter(tool => ['required','appropriate'].includes(classificationClass(tool.key)));
    const more = tools.filter(tool => !relevant.includes(tool));
    appendToolGroup(box, 'Relevant for this patient', 'Required and clinically appropriate measurable tools appear first.', relevant, 'relevant');
    if (more.length) {
      const details = document.createElement('details');
      details.className = 'more-tools';
      details.innerHTML = '<summary>More tools <span>Optional or not currently indicated</span></summary><div class="more-tools-grid"></div>';
      const grid = details.querySelector('.more-tools-grid');
      more.forEach(tool => grid.appendChild(renderVitalTool(tool)));
      box.appendChild(details);
    }
  }

  function openFocus(title, instruction, finding, key) {
    activeFocus = { title, instruction, finding, key };
    $('focusTitle').textContent = title;
    $('focusInstruction').textContent = instruction;
    setPatientImage($('focusImage'), scenario.image);
    $('recordFocus').disabled = true;
    $('recordFocus').textContent = 'Observe patient…';
    $('focusTimer').innerHTML = '';
    void $('focusTimer').offsetWidth;
    $('assessmentFocus').hidden = false;
    setTimeout(() => {
      if (!activeFocus) return;
      $('recordFocus').disabled = false;
      $('recordFocus').textContent = 'Record observed finding';
    }, 4000);
  }

  function registryTool(key) {
    return [...(registry?.assessmentTools || []), ...(registry?.vitalTools || [])].find(tool => tool.key === key);
  }

  function eventTime(value) {
    const time = new Date(value || 0).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function conditionState(current = record()) {
    return current?.documentation?.conditionEngine || { stageIds: [], pendingTargets: [], lastCheckpoint: '', imageMode: scenario.imageMode || '', updatedAt: current?.startedAt || new Date().toISOString() };
  }

  function effectiveTreatmentIds(current = record()) {
    return new Set((current?.treatments || []).filter(item => item.classification === 'appropriate-effective' || !item.classification).map(item => item.actionId).filter(Boolean));
  }

  function evaluatePatientCondition(checkpoint = 'patient-home') {
    if (conditionEvaluationActive) return false;
    const current = record();
    if (!current?.startedAt) return false;
    const stages = CONDITION_STAGES[id] || [];
    if (!stages.length) return false;
    const state = conditionState(current);
    const completed = new Set(state.stageIds || []);
    const treatments = effectiveTreatmentIds(current);
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(current.startedAt).getTime()) / 1000));
    const stage = stages.find(item => !completed.has(item.id) && elapsed >= item.after);
    if (!stage) return false;
    const protectedByCare = (stage.blockedBy || []).some(actionId => treatments.has(actionId));
    conditionEvaluationActive = true;
    try {
      const recordedAt = new Date().toISOString();
      const nextStageIds = [...completed, stage.id];
      const pendingTargets = protectedByCare ? (state.pendingTargets || []) : [...new Set([...(state.pendingTargets || []), ...(stage.targets || [])])];
      api?.update?.(draft => {
        draft.documentation = draft.documentation || {};
        draft.documentation.conditionEngine = {
          ...state,
          stageIds: nextStageIds,
          pendingTargets,
          lastCheckpoint: checkpoint,
          imageMode: protectedByCare ? (state.imageMode || scenario.imageMode || '') : (stage.imageMode || state.imageMode || scenario.imageMode || ''),
          updatedAt: recordedAt
        };
        return draft;
      });
      if (!protectedByCare) {
        api?.mergeCareLog?.([{
          id:`condition-${id}-${stage.id}`,
          eventId:`condition-${id}-${stage.id}`,
          type:'condition_change', category:'assessment', key:'patient_condition', label:stage.title,
          value:stage.text, details:`Triggered at ${checkpoint}. Reassessment due: ${(stage.targets || []).map(labelFor).join(', ')}.`,
          status:'abnormal', normality:'not-normal', source:'dynamic-condition-engine', recordedAt
        }]);
      }
      return !protectedByCare;
    } finally {
      conditionEvaluationActive = false;
    }
  }

  function treatmentTargets(item = {}) {
    const explicit = Array.isArray(item.targetKeys) ? item.targetKeys : [];
    if (explicit.length) return explicit;
    if (item.assessment) return [item.assessment];
    if (item.context && item.context !== 'general') return [item.context];
    return [];
  }

  function latestTreatmentFor(key) {
    const current = record();
    const treatments = (current?.treatments || [])
      .filter(item => treatmentTargets(item).includes(key));
    const condition = conditionState(current);
    const latestReassessmentTime = Math.max(0, ...(current?.reassessments || [])
      .filter(item => (Array.isArray(item.targetKeys) && item.targetKeys.includes(key)) || item.assessment === key || item.context === key)
      .map(item => eventTime(item.recordedAt || item.time)));
    if ((condition.pendingTargets || []).includes(key) && eventTime(condition.updatedAt) > latestReassessmentTime) treatments.push({
      actionId:'condition-change', treatment:'Patient condition changed', targetKeys:condition.pendingTargets, recordedAt:condition.updatedAt, time:condition.updatedAt, source:'dynamic-condition-engine'
    });
    return treatments.sort((a, b) => eventTime(b.recordedAt || b.time) - eventTime(a.recordedAt || a.time))[0] || null;
  }

  function latestReassessmentFor(key) {
    return (record()?.reassessments || [])
      .filter(item => (Array.isArray(item.targetKeys) && item.targetKeys.includes(key)) || item.assessment === key || item.context === key)
      .sort((a, b) => eventTime(b.recordedAt || b.time) - eventTime(a.recordedAt || a.time))[0] || null;
  }

  function assessmentState(key) {
    const finding = api?.getFinding?.(key, record());
    const treatment = latestTreatmentFor(key);
    const reassessment = latestReassessmentFor(key);
    const treatedAt = eventTime(treatment?.recordedAt || treatment?.time);
    const reassessedAt = eventTime(reassessment?.recordedAt || reassessment?.time);
    if (treatment && treatedAt > reassessedAt) return { code: 'reassessment-due', label: 'Reassessment due', finding, treatment, reassessment };
    if (reassessment && reassessedAt >= treatedAt) {
      const comparison = reassessment.comparison || (/wors/i.test(reassessment.description || '') ? 'worsened' : /unchang/i.test(reassessment.description || '') ? 'unchanged' : 'improved');
      return { code: comparison, label: comparison.charAt(0).toUpperCase() + comparison.slice(1), finding, treatment, reassessment };
    }
    if (!finding) return { code: 'not-assessed', label: 'Not assessed', finding: null, treatment: null, reassessment: null };
    if (finding.status === 'uncertain' || finding.normality === 'uncertain') return { code: 'uncertain', label: 'Needs more information', finding, treatment, reassessment };
    if (finding.status === 'abnormal' || finding.normality === 'not-normal') return { code: 'abnormal', label: 'Abnormal', finding, treatment, reassessment };
    return { code: 'normal', label: 'Normal', finding, treatment, reassessment };
  }

  function assessmentHref(tool, key) {
    const state = assessmentState(key);
    const base = toolUrl(tool?.url || `/vitals/${key}-assessment.html`, 'Patient', key);
    if (state.code === 'not-assessed') return base;
    const url = new URL(base, location.origin);
    url.searchParams.set('reassess', '1');
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function assessmentStatusText(tool, state) {
    if (state.code === 'reassessment-due') return 'Treatment performed — repeat this assessment now.';
    if (['improved','unchanged','worsened'].includes(state.code)) {
      return state.reassessment?.finding || state.reassessment?.response || state.finding?.value || state.finding?.finding || `${state.label} on reassessment.`;
    }
    if (state.finding) return state.finding.value || state.finding.finding || 'Assessment recorded.';
    return tool.description || 'Not yet assessed.';
  }

  function assessmentActionLabel(state) {
    if (state.code === 'reassessment-due') return 'Reassess';
    if (state.code === 'uncertain') return 'Gather more';
    if (state.code !== 'not-assessed') return 'Reassess';
    return 'Open';
  }

  function assessmentStatusLine(tool, state) {
    const task = partnerTaskFor(tool.key);
    if (task?.status === 'active' || task?.status === 'pending') {
      return `Partner obtaining · ${secondsRemaining(task)} sec remaining`;
    }
    if (task?.status === 'queued') return 'Queued for partner';
    if (state.code === 'reassessment-due') return 'Abnormal finding documented · Reassessment due';
    if (state.code === 'abnormal') return 'Abnormal finding documented';
    if (state.code === 'uncertain') return 'Decision deferred · More information needed';
    if (['improved','unchanged','worsened'].includes(state.code)) return `${state.label} on reassessment`;
    if (state.code === 'normal') return 'Completed · Normal';
    return 'Not started';
  }

  function renderCompactAssessmentRow(tool) {
    const state = assessmentState(tool.key);
    const task = partnerTaskFor(tool.key);
    const row = document.createElement('div');
    row.className = `assessment-compact-row state-${state.code}${task?.status ? ` partner-${task.status}` : ''}`;
    row.dataset.assessmentState = state.code;
    row.dataset.assessmentKey = tool.key;
    const abnormal = state.code === 'abnormal' || state.code === 'reassessment-due' || state.code === 'worsened';
    const icon = state.code === 'reassessment-due' ? '↻' : abnormal ? '!' : state.code === 'uncertain' ? '?' : state.code === 'not-assessed' ? '○' : '✓';
    row.innerHTML = `
      <span class="assessment-status-icon" aria-hidden="true">${icon}</span>
      <div class="assessment-compact-copy">
        <strong>${escapeHtml(tool.label)}</strong>
        <small>${escapeHtml(assessmentStatusLine(tool, state))}</small>
      </div>
      <a class="assessment-row-action" href="${assessmentHref(tool, tool.key)}">${assessmentActionLabel(state)}</a>`;
    return row;
  }

  function clinicalCategory(tool) {
    if (['sample','pain'].includes(tool.key)) return 'history';
    if ((registry?.vitalTools || []).some(item => item.key === tool.key)) return 'vitals';
    return 'focused';
  }

  function recommendationScore(tool) {
    const state = assessmentState(tool.key);
    if (state.code === 'reassessment-due') return 100;
    if (state.code === 'worsened' || state.code === 'abnormal') return 90;
    if (state.code !== 'not-assessed') return -10;
    const kind = classificationClass(tool.key);
    if (!assessmentMode() && kind === 'required') return 80;
    if (!assessmentMode() && kind === 'appropriate') return 70;
    const order = ['mental_status','breathing','perfusion','respirations','spo2','pulse','blood_pressure','breath_sounds','blood_glucose','skin','pupils','sample','pain'];
    const index = order.indexOf(tool.key);
    return index < 0 ? 20 : 55 - index;
  }

  function buildRecommendedAssessments(box, tools) {
    if (assessmentMode()) return;
    const recommendations = [...tools]
      .filter(tool => assessmentState(tool.key).code === 'not-assessed' || ['reassessment-due','abnormal','worsened'].includes(assessmentState(tool.key).code))
      .sort((a,b) => recommendationScore(b) - recommendationScore(a))
      .slice(0,4);
    if (!recommendations.length) return;
    const section = document.createElement('section');
    section.className = 'assessment-recommended assessment-level';
    section.innerHTML = `<div class="assessment-section-title"><div><span>Recommended next</span><small>Patient-specific suggestions for Learning Mode</small></div></div><div class="assessment-recommended-list"></div>`;
    const list = section.querySelector('.assessment-recommended-list');
    recommendations.forEach(tool => list.appendChild(renderCompactAssessmentRow(tool)));
    box.appendChild(section);
  }

  const COMPLAINT_SORTS = {
    all: { label:'All assessments', keys:[] },
    breathing: { label:'Breathing / airway', keys:['breath_sounds','chest_assessment','skin','mental_status','pediatric_assessment_triangle'] },
    cardiac: { label:'Chest pain / circulation', keys:['chest_assessment','skin','pain','mental_status'] },
    neuro: { label:'Neurologic / altered mental status', keys:['mental_status','pupils','motor_sensory','gcs','pain'] },
    trauma: { label:'Trauma', keys:['trauma_assessment','chest_assessment','abdominal_assessment','motor_sensory','skin','pain','rule_of_nines'] },
    abdominal: { label:'Abdominal / medical', keys:['abdominal_assessment','pain','sample','mental_status','skin'] },
    pediatric: { label:'Pediatric', keys:['pediatric_assessment_triangle','skin','mental_status','sample'] },
    history: { label:'History', keys:['sample','pain'] }
  };

  const ASSESSMENT_CATEGORY_META = {
    respiratory: { label:'Respiratory', subtitle:'Breath sounds and chest examination', icon:'◌' },
    circulation: { label:'Cardiac / circulation', subtitle:'Skin and perfusion-related clues', icon:'♥' },
    neurologic: { label:'Neurological', subtitle:'Mental status, pupils, motor, sensory, and GCS', icon:'◎' },
    trauma: { label:'Trauma / burns', subtitle:'Rapid trauma and burn assessment', icon:'✚' },
    abdominal: { label:'Abdominal', subtitle:'Focused abdominal examination', icon:'◍' },
    pediatric: { label:'Pediatric', subtitle:'Pediatric Assessment Triangle', icon:'△' },
    history: { label:'History', subtitle:'SAMPLE and OPQRST', icon:'▤' }
  };

  function defaultAssessmentFocus() {
    if (assessmentMode()) return 'all';
    return { asthma:'breathing', stroke:'neuro', hypoglycemia:'neuro', trauma:'trauma', pediatric:'pediatric', horse_crush:'all' }[id] || 'all';
  }

  function assessmentCategoryId(tool) {
    if (['sample','pain'].includes(tool.key)) return 'history';
    if (tool.key === 'abdominal_assessment') return 'abdominal';
    if (tool.key === 'pediatric_assessment_triangle') return 'pediatric';
    if (['trauma_assessment','rule_of_nines'].includes(tool.key)) return 'trauma';
    if (['mental_status','pupils','motor_sensory','gcs'].includes(tool.key)) return 'neurologic';
    if (['breath_sounds','chest_assessment'].includes(tool.key)) return 'respiratory';
    if (tool.key === 'skin') return 'circulation';
    return 'trauma';
  }

  function applyAssessmentComplaintSort(box, sortId='all') {
    assessmentComplaintFocus = COMPLAINT_SORTS[sortId] ? sortId : 'all';
    const allowed = new Set(COMPLAINT_SORTS[assessmentComplaintFocus]?.keys || []);
    box.querySelectorAll('.assessment-more .assessment-compact-row').forEach(row => {
      row.hidden = assessmentComplaintFocus !== 'all' && !allowed.has(row.dataset.assessmentKey);
    });
    box.querySelectorAll('.assessment-more .assessment-category').forEach(category => {
      const visible = [...category.querySelectorAll('.assessment-compact-row')].some(row => !row.hidden);
      category.hidden = !visible;
    });
    const label = box.querySelector('[data-assessment-focus-label]');
    if (label) label.textContent = COMPLAINT_SORTS[assessmentComplaintFocus]?.label || 'All assessments';
  }

  function buildAssessmentCategory(box, categoryId, tools, openCategories = new Set()) {
    if (!tools.length) return;
    const meta = ASSESSMENT_CATEGORY_META[categoryId];
    const completedNormal = tools.filter(tool => assessmentState(tool.key).code === 'normal').length;
    const abnormal = tools.filter(tool => ['abnormal','reassessment-due','worsened'].includes(assessmentState(tool.key).code)).length;
    const details = document.createElement('details');
    details.className = `assessment-category assessment-category-${categoryId}`;
    details.dataset.assessmentCategory = categoryId;
    details.open = openCategories.has(categoryId) || abnormal > 0;
    details.innerHTML = `
      <summary>
        <span class="assessment-category-icon" aria-hidden="true">${meta.icon}</span>
        <span><strong>${escapeHtml(meta.label)}</strong><small>${escapeHtml(meta.subtitle)}</small></span>
        <em>${abnormal ? `${abnormal} abnormal` : `${completedNormal}/${tools.length}`}</em>
      </summary>
      <div class="assessment-category-list"></div>`;
    const list = details.querySelector('.assessment-category-list');
    tools.forEach(tool => list.appendChild(renderCompactAssessmentRow(tool)));
    box.appendChild(details);
  }

  function buildMoreAssessments(box, tools, priorOpen = new Set()) {
    const abnormalCount = tools.filter(tool => ['abnormal','reassessment-due','worsened'].includes(assessmentState(tool.key).code)).length;
    const more = document.createElement('details');
    more.className = 'assessment-more assessment-level';
    more.dataset.assessmentSection = 'more';
    more.open = priorOpen.has('more') || abnormalCount > 0;
    more.innerHTML = `
      <summary><span><strong>More assessments</strong><small>Open focused examinations when clinically appropriate</small></span><em>${abnormalCount ? `${abnormalCount} abnormal` : `${tools.length} tools`}</em></summary>
      <div class="assessment-more-body">
        <label class="assessment-focus-control"><span>Focus list</span><select aria-label="Focus assessment list">${Object.entries(COMPLAINT_SORTS).map(([key,item]) => `<option value="${key}">${escapeHtml(item.label)}</option>`).join('')}</select></label>
        <p class="assessment-focus-summary">Showing <strong data-assessment-focus-label>All assessments</strong>. This changes organization only.</p>
        <div class="assessment-more-categories"></div>
      </div>`;
    box.appendChild(more);
    const categoryHost = more.querySelector('.assessment-more-categories');
    Object.keys(ASSESSMENT_CATEGORY_META).forEach(categoryId => {
      buildAssessmentCategory(categoryHost, categoryId, tools.filter(tool => assessmentCategoryId(tool) === categoryId), priorOpen);
    });
    const select = more.querySelector('select');
    select.value = assessmentComplaintFocus || defaultAssessmentFocus();
    select.addEventListener('change', () => applyAssessmentComplaintSort(box, select.value));
    applyAssessmentComplaintSort(box, select.value);
    enforceSingleOpen('.assessment-more-categories', '.assessment-category');
  }

  function buildSceneSizeUpCard(box) {
    if (id === 'horse_crush') return;
    const complete = existing('scene_size_up');
    const article = document.createElement('article');
    article.className = `assessment-scene-row${complete ? ' complete' : ''}`;
    article.innerHTML = `<div><strong>Scene size-up</strong><small>${complete ? 'Recorded' : 'Complete safety, NOI/MOI, resources, and first impression'}</small></div><button class="scene-guide-card-button" type="button">${complete ? 'Review' : 'Begin'}</button>`;
    article.querySelector('button').addEventListener('click', () => {
      closeSheet();
      window.requestAnimationFrame(() => {
        const opened = window.EMSCodeSimSceneGuide?.start?.(complete);
        if (opened === false || !window.EMSCodeSimSceneGuide?.start) {
          const guide = document.getElementById('sceneGuide');
          if (guide) { guide.hidden = false; guide.scrollIntoView({ behavior:'smooth', block:'start' }); }
          toast('Scene size-up opened. Refresh the page if the questions do not appear.');
        }
      });
    });
    box.appendChild(article);
  }

  function primaryStatus(key) {
    const state = assessmentState(key);
    if (state.code === 'reassessment-due') return `Treatment performed — ${state.label}`;
    if (state.code === 'uncertain') return 'Not enough information recorded — gather more information';
    if (['improved','unchanged','worsened'].includes(state.code)) return `${state.label}: ${state.finding?.value || state.finding?.finding || 'Reassessment recorded'}`;
    if (state.finding) return state.finding.value || state.finding.finding || 'Assessment recorded';
    return 'Initial decision not yet recorded';
  }

  function primaryToolLink(key) {
    const tool = registryTool(key);
    const config = scenario.primary[key] || {};
    const state = assessmentState(key);
    return { href: assessmentHref(tool, key), label: assessmentActionLabel(state), urgent:Boolean(config.urgent) || state.code === 'reassessment-due', state };
  }

  function launchPrimaryPhotoGuide(review = false) {
    closeSheet();
    window.requestAnimationFrame(() => {
      const opened = window.EMSCodeSimSceneGuide?.startPrimary?.(review);
      if (opened === false || !window.EMSCodeSimSceneGuide?.startPrimary) {
        const guide = document.getElementById('sceneGuide');
        if (guide) { guide.hidden = false; guide.scrollIntoView({ behavior:'smooth', block:'center' }); }
        toast('Initial ABC assessment opened. Refresh the page if the questions do not appear.');
      }
    });
  }

  function buildHorsePrimaryAssessmentCard(box) {
    const choices = {
      airway: [
        ['Patent','Airway patent','normal'],
        ['Threatened or obstructed','Airway threatened or obstructed','not-normal'],
        ['Not enough information at this time','Not enough information at this time','uncertain']
      ],
      breathing: [
        ['Breathing adequate','Breathing appears adequate','normal'],
        ['Breathing inadequate','Breathing is present but inadequate','not-normal'],
        ['Breathing absent','No effective breathing is present','not-normal'],
        ['Not enough information at this time','Not enough information at this time','uncertain']
      ],
      perfusion: [
        ['Perfusion adequate; no major bleeding','Perfusion appears adequate; no major bleeding','normal'],
        ['Poor perfusion or major bleeding','Poor perfusion or major bleeding is present','not-normal'],
        ['Not enough information at this time','Not enough information at this time','uncertain']
      ]
    };
    const observations = {
      airway: 'The patient answers in full sentences. No snoring, gurgling, stridor, blood, vomit, or visible obstruction is present.',
      breathing: 'Chest rise is symmetric with normal effort. The patient denies shortness of breath and can speak without pausing.',
      perfusion: 'No major external bleeding is visible. Skin is warm and dry, and a regular radial pulse is readily palpable.'
    };
    const labels = { airway:'Airway', breathing:'Breathing', perfusion:'Circulation / perfusion' };
    const prompts = {
      airway: 'Based on the new airway information, how would you classify the airway?',
      breathing: 'Based on the new breathing information, how would you classify breathing?',
      perfusion: 'Based on the new circulation information, how would you classify perfusion?'
    };

    const questionBox = $('horseClinicalQuestionBox');
    function resetQuestionBox() {
      if (!questionBox) return;
      questionBox.classList.remove('active','history-active','treatment-active');
      const activeLabel = horseCurrentAssessment === 'abc' ? 'Select Airway, Breathing, or Circulation.' : 'Perform an exam segment. Any follow-up question will appear here.';
      questionBox.innerHTML = `
        <div class="horse-question-placeholder">
          <small>FOLLOW-UP QUESTION</small>
          <strong>${escapeHtml(activeLabel)}</strong>
        </div>`;
    }
    function openFollowup(key) {
      if (!questionBox) return;
      const current = api?.getFinding?.(key, record());
      questionBox.classList.add('active');
      questionBox.innerHTML = `
        <div class="horse-question-head">
          <div><small>FOLLOW-UP QUESTION</small><strong>${escapeHtml(labels[key])}</strong></div>
        </div>
        <p>${escapeHtml(prompts[key])}</p>
        <div class="horse-question-answer-row">
          <label><span>Your finding</span><select aria-label="${escapeHtml(labels[key])} finding">
            <option value="">Choose your finding</option>
            ${choices[key].map(([value,label,normality]) => `<option value="${escapeHtml(value)}" data-normality="${normality}" ${current && (current.value === value || current.finding === value) ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
          </select></label>
          <button type="button" class="horse-question-save" disabled>Record</button>
        </div>`;
      const select = questionBox.querySelector('select');
      const save = questionBox.querySelector('.horse-question-save');
      const sync = () => { if (save) save.disabled = !select?.value; };
      select?.addEventListener('change', sync);
      sync();
      save?.addEventListener('click', () => {
        if (!select?.value) return;
        const option = select.selectedOptions[0];
        const normality = option?.dataset?.normality || '';
        const payload = {
          source:'horse-rapid-abc',
          label:labels[key],
          finding:select.value,
          normality,
          status:normality === 'normal' ? 'normal' : normality === 'not-normal' ? 'abnormal' : 'uncertain',
          rapidAssessment:true,
          reviewAtDebrief:true,
          suppressInfoUpdate:true
        };
        try {
          if (session?.saveFinding) session.saveFinding(key, select.value, payload);
          else api?.setFinding?.(key, select.value, payload);
          refreshFromRecord({ force:true });
          resetQuestionBox();
        } catch (error) {
          console.error(error);
          toast('Finding was not saved. Try again.');
        }
      });
      window.requestAnimationFrame(() => select?.focus());
    }

    const article = document.createElement('section');
    article.className = 'horse-rapid-abc assessment-level';
    article.innerHTML = `
      <div class="assessment-section-title"><div><span>Initial ABC</span><small>Select Airway, Breathing, or Circulation. New findings appear once in the information window.</small></div><em>${['airway','breathing','perfusion'].filter(existing).length} of 3</em></div>
      <div class="horse-abc-list"></div>`;
    const list = article.querySelector('.horse-abc-list');

    ['airway','breathing','perfusion'].forEach(key => {
      const finding = api?.getFinding?.(key, record());
      const row = document.createElement('article');
      row.className = `horse-abc-row${finding ? ' complete' : ''}`;
      row.innerHTML = `
        <div class="horse-abc-row-head">
          <div><strong>${labels[key]}</strong><small>${finding ? 'Recorded' : 'Not assessed'}</small></div>
          <button type="button" class="horse-abc-assess">${finding ? 'Reassess' : 'Assess'}</button>
        </div>`;
      row.querySelector('.horse-abc-assess')?.addEventListener('click', () => {
        sceneObservationUpdate = {
          id:`horse-abc-active`,
          type:'NEW ASSESSMENT INFORMATION',
          title:`${labels[key]} assessment`,
          text:observations[key],
          kind:'assessment',
          sticky:true,
          recordedAt:new Date().toISOString()
        };
        infoManuallyCollapsed = false;
        lastInfoSignature = '';
        renderInfoUpdate(true);
        openFollowup(key);
      });
      list.appendChild(row);
    });
    configureHorseCurrentAssessmentWorkspace({ openFollowup, observations, labels, resetQuestionBox });
  }

  function configureHorseCurrentAssessmentWorkspace(context = horseWorkspaceContext) {
    if (id !== 'horse_crush') return;
    const workspace = $('horseCurrentAssessment');
    const body = $('horseCurrentAssessmentBody');
    const title = $('horseCurrentAssessmentTitle');
    const collapse = $('horseCollapseAssessment');
    const choose = $('horseChooseAssessment');
    if (!workspace || !body || !title || !context) return;
    horseWorkspaceContext = context;
    workspace.dataset.activeAssessment = horseCurrentAssessment;
    workspace.classList.toggle('is-collapsed', horseAssessmentCollapsed);
    body.hidden = horseAssessmentCollapsed;
    if (collapse) {
      collapse.textContent = horseAssessmentCollapsed ? '⌄' : '⌃';
      collapse.setAttribute('aria-expanded', String(!horseAssessmentCollapsed));
      collapse.onclick = () => {
        horseAssessmentCollapsed = !horseAssessmentCollapsed;
        configureHorseCurrentAssessmentWorkspace();
      };
    }
    if (choose) choose.onclick = () => openSheet('assessmentPanel');

    const groups = {
      abc: {
        title: 'ABC Assessment',
        subtitle: 'Rapidly confirm immediate life threats.',
        keys: ['airway','breathing','perfusion']
      },
      head_to_toe: {
        title: 'Head-to-Toe Exam',
        subtitle: 'Work systematically. Opening this block closes the prior assessment block.',
        keys: ['head_exam','neck_back','chest_assessment','abdominal_assessment','pelvis_hip','upper_extremities','left_leg','distal_csm']
      },
      focused_leg: {
        title: 'Focused Hip / Leg Exam',
        subtitle: 'Target the painful region before movement and packaging.',
        keys: ['pelvis_hip','left_leg','distal_csm']
      }
    };
    const group = groups[horseCurrentAssessment] || groups.abc;
    title.textContent = group.title;
    if (horseAssessmentCollapsed) return;

    const examMap = new Map((window.EMSCodeSimHorseCrush?.EXAMS || []).map(item => [item.key, item]));
    const abcLabels = context.labels || { airway:'Airway', breathing:'Breathing', perfusion:'Circulation / perfusion' };
    body.innerHTML = `<p class="horse-current-assessment-help">${escapeHtml(group.subtitle)}</p><div class="horse-current-exam-grid"></div>`;
    const grid = body.querySelector('.horse-current-exam-grid');
    group.keys.forEach(key => {
      const isAbc = ['airway','breathing','perfusion'].includes(key);
      const exam = examMap.get(key);
      const finding = api?.getFinding?.(key, record());
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `horse-current-exam-button${finding ? ' complete' : ''}${finding?.normality === 'not-normal' || finding?.status === 'abnormal' ? ' abnormal' : ''}`;
      const label = isAbc ? abcLabels[key] : (exam?.label || labelFor(key));
      button.innerHTML = `<span>${finding ? '✓' : '○'}</span><div><strong>${escapeHtml(label)}</strong><small>${finding ? 'Recorded — click to reassess/review' : 'Perform exam'}</small></div>`;
      button.addEventListener('click', () => {
        if (isAbc) {
          sceneObservationUpdate = {
            id:`horse-abc-active`,
            type:'NEW ASSESSMENT INFORMATION',
            title:`${abcLabels[key]} assessment`,
            text:context.observations[key],
            kind:'assessment',
            sticky:true,
            recordedAt:new Date().toISOString()
          };
          infoManuallyCollapsed = false;
          lastInfoSignature = '';
          renderInfoUpdate(true);
          context.openFollowup(key);
          return;
        }
        const result = window.EMSCodeSimHorseCrush?.performExam?.(key);
        if (!result) toast('That exam is not available yet.');
      });
      grid.appendChild(button);
    });
  }

  function selectHorseCurrentAssessment(type) {
    const allowed = new Set(['abc','head_to_toe','focused_leg']);
    horseCurrentAssessment = allowed.has(type) ? type : 'abc';
    horseAssessmentCollapsed = false;
    configureHorseCurrentAssessmentWorkspace();
    horseWorkspaceContext?.resetQuestionBox?.();
    if (desktopWorkspace()) closeSheet();
  }

  function buildPrimaryAssessmentCard(box) {
    const primaryKeys = ['airway','breathing','perfusion'];
    const completed = primaryKeys.filter(existing).length;
    const article = document.createElement('details');
    article.className = `assessment-primary-summary${completed === 3 ? ' complete' : ''}`;
    article.open = completed < 3;
    const summaryText = completed === 3
      ? primaryKeys.map(key => {
          const state = assessmentState(key);
          const label = key === 'perfusion' ? 'Circulation' : labelFor(key);
          return `${label} ${state.code === 'uncertain' ? 'undetermined' : state.code === 'normal' ? 'adequate' : 'abnormal'}`;
        }).join(' · ')
      : `${completed} of 3 decisions recorded`;
    article.innerHTML = `<summary><span class="assessment-primary-check">${completed === 3 ? '✓' : completed}</span><span><strong>${completed === 3 ? 'Initial ABC Recorded' : 'Initial ABC Assessment'}</strong><small>${escapeHtml(summaryText)}</small></span><em>${completed === 3 ? 'Review' : 'Begin'}</em></summary><div class="rapid-primary-list"></div>`;
    const list = article.querySelector('.rapid-primary-list');
    primaryKeys.forEach(key => {
      const label = key === 'perfusion' ? 'Circulation' : labelFor(key);
      const action = primaryToolLink(key);
      const row = document.createElement('div');
      row.className = `primary-assessment-row rapid-primary-clean-row state-${action.state.code}`;
      row.innerHTML = `<div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(primaryStatus(key))}</small></div>${action.state.code === 'not-assessed' ? '<span class="primary-photo-pending">Photo assessment</span>' : `<a href="${action.href}">${escapeHtml(action.label)}</a>`}`;
      list.appendChild(row);
    });
    const launch = document.createElement('button');
    launch.type = 'button';
    launch.className = 'primary-photo-launch';
    launch.textContent = completed === 3 ? 'Review initial ABC over patient photo' : completed > 0 ? 'Continue initial ABC over patient photo' : 'Begin initial ABC over patient photo';
    launch.addEventListener('click', event => {
      event.preventDefault();
      launchPrimaryPhotoGuide(completed === 3);
    });
    list.appendChild(launch);
    box.appendChild(article);
  }

  function buildAssessments() {
    const box = $('assessmentTools');
    const openCategories = detailsState(box, 'data-assessment-category');
    const openSections = detailsState(box, 'data-assessment-section');
    const existingFocus = box?.querySelector('.assessment-focus-control select')?.value;
    if (existingFocus && COMPLAINT_SORTS[existingFocus]) assessmentComplaintFocus = existingFocus;
    box.innerHTML = '';
    box.classList.add('assessment-workflow-clean');

    const immediate = document.createElement('section');
    immediate.className = 'assessment-immediate assessment-level';
    immediate.innerHTML = `<div class="assessment-section-title"><div><span>${id === 'horse_crush' ? 'Patient assessment' : 'Immediate assessment'}</span><small>${id === 'horse_crush' ? 'Choose the examinations that fit your clinical approach. You control the order.' : 'Scene safety and rapid Airway, Breathing, Circulation'}</small></div></div><div class="assessment-immediate-list"></div>`;
    box.appendChild(immediate);
    const immediateList = immediate.querySelector('.assessment-immediate-list');
    buildSceneSizeUpCard(immediateList);
    if (id === 'horse_crush') buildHorsePrimaryAssessmentCard(immediateList);
    else buildPrimaryAssessmentCard(immediateList);
    window.EMSCodeSimHorseCrush?.renderAssessmentSection?.(box);

    const unique = new Map();
    (registry?.assessmentTools || []).forEach(tool => {
      if (PRIMARY_KEYS.has(tool.key) || tool.key === 'scene_size_up' || ['sample','pain'].includes(tool.key)) return;
      if (!MEASURABLE_TOOL_KEYS.has(tool.key) && !unique.has(tool.key)) unique.set(tool.key, tool);
    });
    const tools = [...unique.values()];
    if (id !== 'horse_crush') buildRecommendedAssessments(box, tools);
    buildMoreAssessments(box, tools, new Set([...openCategories, ...openSections]));
  }

  function interviewHistoryKey(questionId) {
    return `interview_${String(questionId || 'question').replace(/[^a-z0-9_]+/gi, '_').toLowerCase()}`;
  }

  function askedInterviewQuestions(current = record() || {}) {
    const history = current.history || {};
    return interview.questions.filter(question => Object.prototype.hasOwnProperty.call(history, interviewHistoryKey(question.id)));
  }

  function cleanPatientQuote(value) {
    return String(value || '').replace(/^([“"])/, '').replace(/([”"])$/, '');
  }

  function repeatPatientResponse(question) {
    const prefix = interview.repeatPrefix || `${interview.responder || 'Patient'} repeats, “`;
    return `${prefix}${cleanPatientQuote(question.response)}”`;
  }

  function renderHistoryResponse() {
    if (!$('historyResponseText')) return;
    const current = record() || {};
    const latestLog = [...(api?.listCareLog?.(current, 'history') || [])]
      .reverse()
      .find(event => event.source === 'patient-interview');
    const item = lastHistoryResponse || (latestLog ? {
      source: interview.responder,
      question: latestLog.details || latestLog.label,
      response: latestLog.value,
      repeated: false
    } : null);
    $('historyResponseSource').textContent = String(item?.source || interview.responder || 'Patient').toUpperCase();
    $('historyResponseText').textContent = item?.response || interview.opening || 'Select a question to begin the interview.';
    $('historyResponseQuestion').textContent = item?.question || interview.communication || 'Use focused questions based on the patient presentation.';
    $('historyResponseCard').classList.toggle('is-repeat', Boolean(item?.repeated));
  }

  function saveInterviewMilestones(askedIds) {
    const profile = window.EMSCodeSimScenarioDefinitions?.PROFILES?.[id];
    const asked = new Set(askedIds || []);
    const sampleComplete = interview.sampleRequired?.length && interview.sampleRequired.every(key => asked.has(key));
    if (sampleComplete && !existing('sample') && profile?.sample) {
      session?.saveFinding?.('sample', profile.sample.finding || 'SAMPLE history obtained', {
        label:'SAMPLE history',
        details:profile.sample.detail || '',
        source:'patient-interview',
        normality:profile.sample.normality || 'not-normal',
        status:profile.sample.normality === 'normal' ? 'normal' : 'abnormal'
      }, id);
      toast('Complete SAMPLE history recorded');
    }
    const opqrstComplete = interview.opqrstRequired?.length && interview.opqrstRequired.every(key => asked.has(key));
    if (opqrstComplete && !existing('pain') && interview.opqrstSummary) {
      session?.saveFinding?.('pain', 'OPQRST symptom assessment obtained', {
        label:'Pain / OPQRST',
        details:interview.opqrstSummary,
        source:'patient-interview',
        normality:'not-normal',
        status:'abnormal'
      }, id);
      toast('Complete OPQRST history recorded');
    }
  }

  function askInterviewQuestion(question, askedText = '') {
    if (!question) return;
    const current = record() || {};
    const key = interviewHistoryKey(question.id);
    const repeated = Object.prototype.hasOwnProperty.call(current.history || {}, key);
    const response = repeated ? repeatPatientResponse(question) : question.response;
    const spokenQuestion = String(askedText || question.prompt || question.label || '').trim();
    lastHistoryResponse = {
      source: interview.responder || 'Patient',
      question: `You asked: ${spokenQuestion}`,
      response,
      repeated
    };
    api?.setHistory?.(key, response, {
      label: question.label || 'Patient interview',
      details: `Asked: ${spokenQuestion}`,
      source:'patient-interview',
      questionId:question.id,
      repeated
    });
    const askedIds = new Set(askedInterviewQuestions(api?.active?.() || current).map(item => item.id));
    askedIds.add(question.id);
    saveInterviewMilestones(askedIds);
    renderSignatures.history = '';
    refreshFromRecord({ force:true });
    renderHistoryResponse();
  }

  function askCustomInterviewQuestion() {
    const input = $('historyCustomInput');
    const text = String(input?.value || '').trim();
    if (!text) { toast('Enter a question for the patient first.'); return; }
    const match = interviewEngine?.findQuestion?.(id, text);
    if (match) {
      askInterviewQuestion(match, text);
    } else {
      const custom = {
        id:`custom_${Date.now()}`,
        category:'custom',
        label:text.length > 62 ? `${text.slice(0, 59)}…` : text,
        prompt:text,
        response:interview.fallback || 'The patient cannot provide that information.'
      };
      askInterviewQuestion(custom, text);
    }
    input.value = '';
  }

  function renderKnownHistory() {
    const host = $('knownHistoryList');
    if (!host) return;
    const current = record() || {};
    const asked = askedInterviewQuestions(current);
    $('knownHistoryCount').textContent = `${asked.length} item${asked.length === 1 ? '' : 's'}`;
    host.innerHTML = '';
    if (!asked.length) {
      host.innerHTML = '<p class="empty">No history has been obtained. Ask the patient or available historian a focused question.</p>';
      return;
    }
    asked.forEach(question => {
      const card = document.createElement('article');
      card.className = 'known-history-item';
      card.innerHTML = `<span>${escapeHtml(question.label)}</span><p>${escapeHtml(current.history?.[interviewHistoryKey(question.id)] || question.response)}</p>`;
      host.appendChild(card);
    });
  }

  const HORSE_HISTORY_GROUPS = [
    {
      id:'sample',
      label:'SAMPLE',
      icon:'S',
      description:'Symptoms, allergies, medications, medical history, last intake, and events.',
      instruction:'Select a SAMPLE question below. The patient answer will replace this message in the Patient Update window.',
      questionIds:['symptoms','allergies','medications','medical_history','last_intake','events']
    },
    {
      id:'opqrst',
      label:'OPQRST',
      icon:'O',
      description:'Onset, provocation, quality, radiation, severity, and time.',
      instruction:'Use OPQRST to define the patient’s pain and how it has behaved since the injury.',
      questionIds:['onset','provocation','quality','radiation','severity','time']
    },
    {
      id:'pain',
      label:'Pain',
      icon:'P',
      description:'Focused questions about location, severity, movement, and radiation.',
      instruction:'Ask focused pain questions. Pay attention to what changes the pain before deciding how to move the patient.',
      questionIds:['chief_complaint','severity','quality','provocation','radiation','time']
    },
    {
      id:'mechanism',
      label:'Event / mechanism',
      icon:'M',
      description:'Clarify the horse-related mechanism, head strike, loss of consciousness, and movement since the event.',
      instruction:'Clarify exactly what happened and whether the patient was struck, crushed, stepped on, or moved after the injury.',
      questionIds:['events','loss_consciousness','position']
    }
  ];

  function horseHistoryGroupQuestions(group) {
    if (!group) return [];
    const byId = new Map((interview.questions || []).map(question => [question.id, question]));
    return (group.questionIds || []).map(questionId => byId.get(questionId)).filter(Boolean);
  }

  function renderHorseHistoryQuestionBox(groupId = horseHistoryActiveGroup) {
    if (id !== 'horse_crush' || !desktopWorkspace()) return;
    const questionBox = $('horseClinicalQuestionBox');
    if (!questionBox) return;
    const group = HORSE_HISTORY_GROUPS.find(item => item.id === groupId);
    if (!group) {
      questionBox.classList.remove('active','history-active','treatment-active');
      questionBox.innerHTML = `
        <div class="horse-question-placeholder">
          <small>HISTORY QUESTION</small>
          <strong>Select a history group below: SAMPLE, OPQRST, Pain, or Event / mechanism.</strong>
        </div>`;
      return;
    }

    const current = record() || {};
    const asked = new Set(askedInterviewQuestions(current).map(question => question.id));
    const questions = horseHistoryGroupQuestions(group);
    questionBox.classList.add('active','history-active');
    questionBox.innerHTML = `
      <div class="horse-question-head horse-history-question-head">
        <div><small>HISTORY QUESTION</small><strong>${escapeHtml(group.label)}</strong></div>
        <span>${questions.filter(question => asked.has(question.id)).length}/${questions.length} asked</span>
      </div>
      <div class="horse-history-question-row">
        <label>
          <span>Question to ask</span>
          <select id="horseHistoryQuestionSelect" aria-label="${escapeHtml(group.label)} history question">
            <option value="">Choose a question</option>
            ${questions.map(question => `<option value="${escapeHtml(question.id)}">${asked.has(question.id) ? '✓ ' : ''}${escapeHtml(question.prompt || question.label)}</option>`).join('')}
          </select>
        </label>
        <button type="button" class="horse-history-ask" disabled>Ask</button>
      </div>
      <small class="horse-history-question-hint">The patient’s answer will appear in the Patient Update window above.</small>`;
    const select = questionBox.querySelector('#horseHistoryQuestionSelect');
    const ask = questionBox.querySelector('.horse-history-ask');
    const sync = () => { if (ask) ask.disabled = !select?.value; };
    select?.addEventListener('change', sync);
    ask?.addEventListener('click', () => {
      const question = questions.find(item => item.id === select?.value);
      if (!question) return;
      askInterviewQuestion(question);
    });
    sync();
  }

  function selectHorseHistoryGroup(groupId, options = {}) {
    if (id !== 'horse_crush' || !desktopWorkspace()) return;
    const group = HORSE_HISTORY_GROUPS.find(item => item.id === groupId);
    if (!group) return;
    horseHistoryActiveGroup = group.id;
    if (options.updateInfo !== false) {
      sceneObservationUpdate = {
        id:`horse-history-group-${group.id}`,
        type:'HISTORY',
        title:`${group.label} questions`,
        text:group.instruction,
        kind:'history',
        sticky:true,
        recordedAt:new Date().toISOString()
      };
      infoManuallyCollapsed = false;
      lastInfoSignature = '';
      renderInfoUpdate(true);
    }
    renderHorseHistoryQuestionBox(group.id);
    document.querySelectorAll('#historyCategoryList .horse-history-group').forEach(details => {
      const selected = details.dataset.historyGroup === group.id;
      details.classList.toggle('selected', selected);
      if (selected && !details.open) details.open = true;
    });
  }

  function buildHorseHistoryDesktop() {
    const host = $('historyCategoryList');
    if (!host) return;
    const current = record() || {};
    const asked = new Set(askedInterviewQuestions(current).map(question => question.id));
    $('historyResponderLabel').textContent = String(interview.responder || 'Patient').toUpperCase();
    $('historyCommunicationStatus').textContent = 'Choose a history group, then ask one question at a time.';
    $('historyAskedCount').textContent = `${asked.size} asked`;
    host.innerHTML = '';

    HORSE_HISTORY_GROUPS.forEach(group => {
      const questions = horseHistoryGroupQuestions(group);
      const complete = questions.filter(question => asked.has(question.id)).length;
      const details = document.createElement('details');
      details.className = `history-question-category horse-history-group${horseHistoryActiveGroup === group.id ? ' selected' : ''}`;
      details.dataset.historyGroup = group.id;
      details.open = horseHistoryActiveGroup === group.id;
      details.innerHTML = `
        <summary>
          <span class="history-category-icon" aria-hidden="true">${escapeHtml(group.icon)}</span>
          <span><strong>${escapeHtml(group.label)}</strong><small>${escapeHtml(group.description)}</small></span>
          <em>${complete}/${questions.length}</em>
        </summary>
        <div class="horse-history-group-preview">
          ${questions.map(question => `<span class="${asked.has(question.id) ? 'asked' : ''}">${asked.has(question.id) ? '✓' : '○'} ${escapeHtml(question.label)}</span>`).join('')}
          <small>Selecting this group loads these questions into the fixed question dropdown above.</small>
        </div>`;
      const summary = details.querySelector('summary');
      summary?.addEventListener('click', event => {
        event.preventDefault();
        const willOpen = !details.open;
        document.querySelectorAll('#historyCategoryList .horse-history-group').forEach(other => {
          if (other !== details) other.open = false;
        });
        details.open = willOpen;
        if (willOpen) {
          selectHorseHistoryGroup(group.id);
        } else if (horseHistoryActiveGroup === group.id) {
          horseHistoryActiveGroup = '';
          details.classList.remove('selected');
          renderHorseHistoryQuestionBox();
        }
      });
      host.appendChild(details);
    });

    renderKnownHistory();
    renderHorseHistoryQuestionBox();
  }

  function buildHistory() {
    const host = $('historyCategoryList');
    if (!host) return;
    if (id === 'horse_crush' && desktopWorkspace()) {
      buildHorseHistoryDesktop();
      return;
    }
    const current = record() || {};
    const asked = new Set(askedInterviewQuestions(current).map(question => question.id));
    $('historyResponderLabel').textContent = String(interview.responder || 'Patient').toUpperCase();
    $('historyCommunicationStatus').textContent = interview.communication || 'Patient interview available.';
    $('historyAskedCount').textContent = `${asked.size} asked`;
    host.innerHTML = '';
    (interview.categories || []).forEach((category, categoryIndex) => {
      const questions = interview.questions.filter(question => question.category === category.id);
      if (!questions.length) return;
      const complete = questions.filter(question => asked.has(question.id)).length;
      const details = document.createElement('details');
      details.className = `history-question-category history-question-${category.id}`;
      details.open = categoryIndex === 0 && !asked.size;
      details.innerHTML = `
        <summary>
          <span class="history-category-icon" aria-hidden="true">${escapeHtml(category.icon || '•')}</span>
          <span><strong>${escapeHtml(category.label)}</strong><small>${escapeHtml(category.description || '')}</small></span>
          <em>${complete}/${questions.length}</em>
        </summary>
        <div class="history-question-list"></div>`;
      const list = details.querySelector('.history-question-list');
      questions.forEach(question => {
        const button = document.createElement('button');
        const alreadyAsked = asked.has(question.id);
        button.type = 'button';
        button.className = `history-question-button${alreadyAsked ? ' asked' : ''}`;
        button.innerHTML = `<span>${escapeHtml(question.label)}</span><em>${alreadyAsked ? 'Ask again' : 'Ask'}</em>`;
        button.addEventListener('click', () => askInterviewQuestion(question));
        list.appendChild(button);
      });
      host.appendChild(details);
    });
    enforceSingleOpen('#historyCategoryList', '.history-question-category');
    renderHistoryResponse();
    renderKnownHistory();
  }

  const TREATMENT_CATEGORY_META = {
    airway: { label:'Airway', description:'Positioning, suction, airway protection, and airway support.' },
    breathing: { label:'Breathing', description:'Oxygenation, ventilation, positioning, and respiratory support.' },
    circulation: { label:'Circulation', description:'Bleeding control, shock care, perfusion support, and temperature protection.' },
    medications: { label:'Medications', description:'Medication assistance and protocol-authorized medication care.' },
    trauma: { label:'Trauma', description:'Trauma-specific stabilization and movement precautions.' },
    transport: { label:'Transport actions', description:'Time-sensitive movement and destination-related treatment actions.' },
    support: { label:'Other care', description:'Supportive care and protocol-dependent options.' }
  };

  function treatmentCategory(plan) {
    if (plan?.category && TREATMENT_CATEGORY_META[plan.category]) return plan.category;
    const idValue = String(plan?.id || '').toLowerCase();
    const labelValue = String(plan?.label || '').toLowerCase();
    if (/airway_position|airway_support|suction|airway/.test(idValue) || /protect airway|airway support|suction/.test(labelValue)) return 'airway';
    if (/bronchodilator|oral_glucose|medication|naloxone|epinephrine|aspirin|nitro/.test(idValue) || /inhaler|bronchodilator|oral glucose|medication|naloxone|epinephrine|aspirin|nitro/.test(labelValue)) return 'medications';
    if (/oxygen|bvm|ventilation|position_comfort|caregiver_position/.test(idValue) || /oxygen|ventilat|position of comfort|caregiver/.test(labelValue)) return 'breathing';
    if (/hemorrhage|shock|perfusion|warming/.test(idValue) || /hemorrhage|shock|bleeding|keep.*warm/.test(labelValue)) return 'circulation';
    if (/spinal|trauma/.test(idValue) || /spinal|trauma/.test(labelValue)) return 'trauma';
    if (/rapid_transport|transport/.test(idValue) || /transport/.test(labelValue)) return 'transport';
    return 'support';
  }

  function allTreatmentPlans() {
    const unique = new Map();
    const currentPlans = TREATMENT_PLANS[id] || [];
    currentPlans.forEach(plan => unique.set(plan.id, plan));
    Object.values(TREATMENT_PLANS).flat().forEach(plan => {
      if (!unique.has(plan.id)) unique.set(plan.id, plan);
    });
    EMT_TREATMENT_LIBRARY.forEach(plan => {
      const normalized = { ...plan, category: plan.category || treatmentCategory(plan) };
      if (!unique.has(normalized.id)) unique.set(normalized.id, normalized);
    });
    return [...unique.values()].filter(plan => treatmentCategory(plan) !== 'transport');
  }

  function nextTreatmentCategoryForFinding(key) {
    if (key === 'airway') return 'airway';
    if (['breathing','breath_sounds','respirations','spo2','pediatric_assessment_triangle'].includes(key)) return 'breathing';
    if (['perfusion','pulse','blood_pressure','skin'].includes(key)) return 'circulation';
    if (['blood_glucose','mental_status'].includes(key)) return 'medications';
    if (['trauma_assessment','chest_assessment','abdominal_assessment','motor_sensory','neck_back','pelvis_hip','left_leg','distal_csm','movement_plan'].includes(key)) return 'trauma';
    return 'support';
  }

  function showClinicalNextActions(finding) {
    const panel = $('clinicalNextActions');
    if (!panel || !finding) return;
    nextActionFinding = finding;
    const key = finding.key || finding.assessment || finding.context || '';
    const label = finding.label || labelFor(key) || 'Abnormal finding';
    const value = finding.value || finding.finding || 'An abnormal finding was recorded.';
    $('clinicalNextTitle').textContent = label;
    $('clinicalNextText').textContent = value;
    panel.hidden = false;
  }

  function hideClinicalNextActions() {
    const panel = $('clinicalNextActions');
    if (panel) panel.hidden = true;
    nextActionFinding = null;
  }

  function maybeOfferLatestFinding(force = false) {
    const current = record();
    const events = api?.orderedEvents?.(current) || current?.careLog || [];
    const candidate = [...events].reverse().find(event => {
      const isAssessment = event.type === 'finding' || event.type === 'assessment' || event.category === 'assessment';
      return isAssessment && abnormalEvent(event);
    });
    if (!candidate) return;
    const eventId = candidate.id || candidate.eventId || `${candidate.key || ''}:${candidate.recordedAt || ''}:${candidate.value || ''}`;
    const storageKey = `emscodesim_next_action_${id}`;
    if (!force && sessionStorage.getItem(storageKey) === eventId) return;
    const eventTimeMs = new Date(candidate.recordedAt || 0).getTime();
    if (!force && Number.isFinite(eventTimeMs) && Date.now() - eventTimeMs > 45000) return;
    sessionStorage.setItem(storageKey, eventId);
    showClinicalNextActions(candidate);
  }

  function treatmentEvidence(plan, current = record()) {
    const findings = current?.findings || {};
    const present = (plan.evidence || []).filter(key => findings[key]);
    const abnormal = present.filter(key => {
      const finding = findings[key] || {};
      return finding.status === 'abnormal' || finding.normality === 'not-normal';
    });
    const text = present.map(key => `${findings[key]?.value || ''} ${findings[key]?.finding || ''}`).join(' ');
    return { present, abnormal, text };
  }

  function treatmentDecision(plan, current = record()) {
    const evidence = treatmentEvidence(plan, current);
    if (typeof plan.contraindication === 'function' && plan.contraindication(current)) {
      return { code:'contraindicated', label:'Contraindicated', detail:'Current findings make this treatment unsafe.' };
    }
    if (plan.requireText && !plan.requireText.test(evidence.text)) {
      if (!evidence.present.length) return { code:'assessment-needed', label:'Assessment needed', detail:'Obtain the supporting assessment before choosing this intervention.' };
      return { code:'not-indicated', label:'Not indicated', detail:'The current finding does not support this intervention.' };
    }
    if (evidence.abnormal.length) return { code:'indicated', label:'Indicated', detail:`Supported by ${evidence.abnormal.map(labelFor).join(', ')}.` };
    if (!evidence.present.length) return { code:'assessment-needed', label:'Assessment needed', detail:'Obtain the supporting assessment before choosing this intervention.' };
    return { code:'not-indicated', label:'Not indicated', detail:'Available findings are normal or do not support this treatment.' };
  }

  function treatmentCount(plan) {
    return (record()?.treatments || []).filter(item => item.actionId === plan.id).length;
  }

  function treatmentAlreadyRecorded(plan) { return treatmentCount(plan) > 0; }

  function treatmentDocumentation(plan) {
    return Array.isArray(plan.documentation) ? plan.documentation : [];
  }

  function treatmentInputValue(form, field) {
    const input = form.elements.namedItem(field.name);
    return String(input?.value || '').trim();
  }

  function validateTreatmentDocumentation(plan, form) {
    const values = {};
    for (const field of treatmentDocumentation(plan)) {
      const value = treatmentInputValue(form, field);
      if (field.required && !value) return { ok:false, message:`Enter ${field.label.toLowerCase()} before recording this treatment.` };
      if (value && field.acceptedPattern) {
        const pattern = new RegExp(field.acceptedPattern, 'i');
        if (!pattern.test(value)) return { ok:false, message:field.error || `${field.label} is not accepted for this scenario. Review the dose or setting and try again.` };
      }
      values[field.name] = value;
    }
    return { ok:true, values };
  }

  function treatmentDocumentationText(plan, values = {}) {
    return treatmentDocumentation(plan)
      .map(field => values[field.name] ? `${field.label}: ${values[field.name]}` : '')
      .filter(Boolean).join(' • ');
  }

  function treatmentResponseDelay(plan) {
    if (/transport|rapid_transport/i.test(plan.id || '')) return 1200;
    if (/oxygen|position|caregiver/i.test(plan.id || '')) return 2200;
    if (/bronchodilator|oral_glucose|bvm|airway|hemorrhage/i.test(plan.id || '')) return 3600;
    return 2800;
  }

  function applyDynamicTreatmentResponse(plan, classification, response) {
    const now = new Date().toISOString();
    if (classification === 'appropriate-effective') {
      const updates = {};
      if (/bronchodilator/i.test(plan.id || '')) {
        updates.breathing = 'Work of breathing is improving, though respiratory distress remains.';
        updates.breath_sounds = 'Wheezing is still present but air movement is improved.';
        updates.spo2 = id === 'asthma' ? '93%' : valueFor('spo2');
      } else if (/oral_glucose/i.test(plan.id || '')) {
        updates.mental_status = 'The patient is more alert and follows commands more consistently.';
        updates.blood_glucose = '72 mg/dL';
      } else if (/oxygen/i.test(plan.id || '')) {
        updates.spo2 = id === 'pediatric' ? '94%' : '94%';
        updates.breathing = 'Oxygenation is improving; respiratory effort still requires reassessment.';
      } else if (/bvm|airway_support|airway_position/i.test(plan.id || '')) {
        updates.airway = 'Airway patency is improved with the intervention in place.';
        updates.breathing = 'Visible chest rise is present with assisted support.';
      } else if (/hemorrhage_shock/i.test(plan.id || '')) {
        updates.perfusion = 'Bleeding is controlled, but signs of poor perfusion remain.';
      }
      Object.entries(updates).forEach(([key, value]) => api?.setFinding?.(key, value, { source:'dynamic-treatment-response', status:'abnormal', normality:'not-normal', isReassessment:true, recordedAt:now }));
    }
    api?.mergeCareLog?.([{
      type:'patient_response', category:'treatment', key:plan.targets?.[0] || 'treatment',
      label:'Patient response observed', value:response,
      details:'Response became apparent over time. Reassess the affected findings to judge effectiveness.',
      source:'dynamic-treatment-response', recordedAt:now
    }]);
    refreshFromRecord();
    renderInfoUpdate(true);
  }

  function scheduleTreatmentResponse(plan, classification, response) {
    window.setTimeout(() => applyDynamicTreatmentResponse(plan, classification, response), treatmentResponseDelay(plan));
  }

  function recordUncertainty(context = {}) {
    const current = record() || {};
    const label = context.label || labelFor(context.key || '') || 'Clinical finding';
    const value = context.value || context.finding || 'Additional information is needed before making a decision.';
    api?.mergeCareLog?.([{
      type:'uncertainty', category:'assessment', key:context.key || 'clinical_uncertainty',
      label:'Need more information', value:`${label}: ${value}`,
      details:'The learner deferred a decision and chose to gather more information.',
      source:'clinical-workspace', recordedAt:new Date().toISOString()
    }]);
    hideClinicalNextActions();
    refreshFromRecord();
    toast('Uncertainty recorded — continue gathering information');
  }

  function recordTreatment(plan, documentation = {}) {
    const current = record();
    const decision = treatmentDecision(plan, current);
    const startedAt = new Date(current?.startedAt || Date.now()).getTime();
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    let classification = plan.outcomeClass || 'appropriate-effective';
    let response = plan.response;
    if (!plan.outcomeClass && decision.code === 'contraindicated') {
      classification = 'contraindicated';
      response = 'The intervention is unsafe for the current patient condition and does not improve the patient.';
    } else if (!plan.outcomeClass && decision.code === 'assessment-needed') {
      classification = 'premature';
      response = 'The intervention was selected before the indication was established. Obtain the missing assessment and reevaluate.';
    } else if (!plan.outcomeClass && decision.code === 'not-indicated') {
      classification = 'unnecessary';
      response = 'The intervention does not address a current abnormal finding and produces no meaningful improvement.';
    }
    const documentationText = treatmentDocumentationText(plan, documentation);
    const treatment = {
      actionId: plan.id,
      treatment: plan.label,
      name: plan.label,
      description: documentationText ? `${plan.label} — ${documentationText}` : plan.label,
      label: 'Treatment performed',
      source: 'scenario-aware-treatment',
      classification,
      indicationStatus: decision.code,
      indication: decision.detail,
      documentation,
      dose: documentation.dose || '',
      route: documentation.route || '',
      device: documentation.device || '',
      targetKeys: plan.targets || [],
      reassessmentRequired: typeof plan.reassessmentRequired === 'boolean' ? plan.reassessmentRequired : classification === 'appropriate-effective',
      patientResponse: response,
      elapsedSeconds,
      elapsedLabel: `${String(Math.floor(elapsedSeconds / 60)).padStart(2,'0')}:${String(elapsedSeconds % 60).padStart(2,'0')}`
    };
    if (session?.addTreatment) session.addTreatment(treatment);
    else api?.addTreatment?.(treatment);
    api?.mergeCareLog?.([{
      type:'documentation', category:'treatment', key:plan.id,
      label:'Treatment decision committed', value:treatment.description,
      details:'Patient response is not immediately revealed. Observe and reassess the patient.',
      source:'scenario-aware-treatment', suppressInfoUpdate:id === 'horse_crush', recordedAt:new Date(Date.now() + 1).toISOString()
    }]);
    refreshFromRecord();
    scheduleTreatmentResponse(plan, classification, response);
    toast(`${plan.label} recorded — observe and reassess the patient`);
  }

  function captureTreatmentUi() {
    const box = $('treatmentTools');
    const drafts = {};
    box?.querySelectorAll('[data-treatment-id]').forEach(card => {
      const form = card.querySelector('.treatment-entry-form');
      if (!form) return;
      const values = {};
      [...form.elements].forEach(field => {
        if (!field.name) return;
        values[field.name] = field.type === 'checkbox' ? Boolean(field.checked) : field.value;
      });
      drafts[card.dataset.treatmentId] = { open: !form.hidden, values };
    });
    return {
      openCategories: detailsState(box, 'data-treatment-category'),
      drafts,
      search: $('treatmentSearch')?.value || ''
    };
  }

  function restoreTreatmentUi(state = {}) {
    Object.entries(state.drafts || {}).forEach(([planId, draft]) => {
      const card = [...document.querySelectorAll('#treatmentTools [data-treatment-id]')]
        .find(item => item.dataset.treatmentId === planId);
      const form = card?.querySelector('.treatment-entry-form');
      const selectButton = card?.querySelector('.treatment-select');
      if (!form) return;
      Object.entries(draft.values || {}).forEach(([name, value]) => {
        const field = form.elements.namedItem(name);
        if (!field) return;
        if (field.type === 'checkbox') field.checked = Boolean(value);
        else field.value = value;
      });
      form.hidden = !draft.open;
      if (selectButton) selectButton.hidden = Boolean(draft.open);
    });
    if ($('treatmentSearch')) $('treatmentSearch').value = state.search || '';
  }

  function treatmentFieldMarkup(field) {
    const required = field.required ? 'required' : '';
    const hint = field.hint ? `<small>${escapeHtml(field.hint)}</small>` : '';
    if (field.type === 'select') {
      return `<label>${escapeHtml(field.label)}<select name="${escapeHtml(field.name)}" ${required}><option value="">Choose</option>${(field.options || []).map(option => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('')}</select>${hint}</label>`;
    }
    return `<label>${escapeHtml(field.label)}<input name="${escapeHtml(field.name)}" type="${field.type || 'text'}" inputmode="${field.inputmode || 'text'}" placeholder="${escapeHtml(field.placeholder || '')}" ${required}>${hint}</label>`;
  }

  function renderTreatmentCard(plan) {
    const recordedCount = treatmentCount(plan);
    const recorded = recordedCount > 0;
    const article = document.createElement('article');
    article.className = `treatment-card treatment-neutral-card${recorded ? ' complete' : ''}`;
    article.dataset.treatmentId = plan.id;
    const fields = treatmentDocumentation(plan);
    article.innerHTML = `
      <div class="treatment-card-heading">
        <div><h3>${escapeHtml(plan.label)}</h3></div>
        <span class="status-chip ${recorded ? 'done' : ''}">${recorded ? `${recordedCount} recorded` : 'Available'}</span>
      </div>
      <p>${escapeHtml(plan.summary)}</p>
      <button class="primary-action treatment-select" type="button">${recorded ? (/medication|aspirin|nitro|epinephrine|naloxone|glucose|bronchodilator/i.test(`${plan.id} ${plan.label}`) ? 'Give another dose' : 'Perform again') : 'Select treatment'}</button>
      <form class="treatment-entry-form" hidden>
        ${fields.map(treatmentFieldMarkup).join('')}
        <label>Decision confidence<select name="certainty"><option value="confident">Confident</option><option value="uncertain">Uncertain — proceeding while monitoring</option><option value="need-more-information">Need more information before committing</option></select></label>
        <label>Clinical note<textarea name="note" rows="2" placeholder="Optional treatment details"></textarea></label>
        <div class="treatment-form-actions"><button class="secondary treatment-cancel" type="button">Cancel</button><button class="primary-action treatment-confirm" type="submit">Perform and record</button></div>
        <p class="treatment-entry-error" hidden></p>
      </form>`;
    const selectButton = article.querySelector('.treatment-select');
    const form = article.querySelector('.treatment-entry-form');
    selectButton?.addEventListener('click', () => { form.hidden = false; selectButton.hidden = true; form.querySelector('input,select,textarea')?.focus(); });
    article.querySelector('.treatment-cancel')?.addEventListener('click', () => { form.hidden = true; selectButton.hidden = false; });
    form?.addEventListener('submit', event => {
      event.preventDefault();
      const validation = validateTreatmentDocumentation(plan, form);
      const error = form.querySelector('.treatment-entry-error');
      if (!validation.ok) { error.textContent = validation.message; error.hidden = false; return; }
      error.hidden = true;
      validation.values.note = String(form.elements.namedItem('note')?.value || '').trim();
      const certainty = String(form.elements.namedItem('certainty')?.value || 'confident');
      if (certainty === 'need-more-information') { recordUncertainty({ key:plan.id, label:plan.label, value:'Treatment decision deferred pending more information.' }); form.hidden = true; selectButton.hidden = false; return; }
      validation.values.certainty = certainty;
      form.hidden = true;
      selectButton.hidden = false;
      recordTreatment(plan, validation.values);
    });
    return article;
  }

  const HORSE_TREATMENT_GROUPS = [
    {
      id:'splinting', label:'Splinting / stabilization', icon:'S',
      description:'Support, pad, stabilize, or splint the injured hip / leg.',
      instruction:'Choose how you want to stabilize or support the painful hip and leg. The treatment choice appears below; the patient response will replace this message.',
      planIds:['manual_leg_support','position_comfort','blanket_support','splint','pelvic_binder','traction_splint']
    },
    {
      id:'movement', label:'Moving / packaging', icon:'M',
      description:'Crew coordination, lift method, transfer device, and positioning.',
      instruction:'Choose a movement or packaging action. Consider the patient’s position of comfort and the findings you obtained before moving her.',
      planIds:['request_help','scoop_position_comfort','vacuum_mattress','board_transfer','stand_pivot','force_straight']
    },
    {
      id:'airway', label:'Airway', icon:'A',
      description:'Positioning, suction, adjuncts, and airway protection.',
      instruction:'Choose an airway intervention if you believe the patient needs one. The simulator will show the patient response in the Patient Update window.',
      category:'airway'
    },
    {
      id:'breathing', label:'Breathing', icon:'B',
      description:'Oxygen and ventilation support.',
      instruction:'Choose a breathing intervention based on your respiratory assessment and oxygenation findings.',
      planIds:['oxygen','oxygen_general','bvm_general','cpap']
    },
    {
      id:'circulation', label:'Circulation', icon:'C',
      description:'Perfusion support, bleeding control, shock care, and heat conservation.',
      instruction:'Choose a circulation intervention based on bleeding, perfusion, skin signs, and overall patient condition.',
      planIds:['heat_conservation','control_bleeding','shock_care','cpr_aed']
    },
    {
      id:'pain', label:'Pain / comfort', icon:'P',
      description:'Positioning, support, and protocol-appropriate pain management.',
      instruction:'Choose how you want to address pain and comfort before or during movement.',
      planIds:['pain_control']
    },
    {
      id:'transport', label:'Transport', icon:'T',
      description:'Working impression, urgency, destination, and notification.',
      instruction:'Make the transport decision from the information you have gathered. Select the transport option below to set urgency and destination.',
      special:'transport'
    },
    {
      id:'reassessment', label:'Reassessment', icon:'R',
      description:'Repeat key checks after movement or treatment.',
      instruction:'Choose the reassessment you want after treatment, stabilization, or movement.',
      planIds:['reassess_distal_csm']
    }
  ];

  function horseTreatmentPlanPool() {
    const unique = new Map();
    (TREATMENT_PLANS[id] || []).forEach(plan => unique.set(plan.id, plan));
    EMT_TREATMENT_LIBRARY.forEach(plan => {
      if (!unique.has(plan.id)) unique.set(plan.id, { ...plan, category:plan.category || treatmentCategory(plan) });
    });
    return [...unique.values()];
  }

  function horseTreatmentGroupPlans(group) {
    if (!group) return [];
    if (group.special === 'transport') return [{ id:'__horse_transport__', label:'Initiate transport', summary:'Choose working impression, transport urgency, destination, and specialty notification.' }];
    const pool = horseTreatmentPlanPool();
    if (group.planIds) {
      const byId = new Map(pool.map(plan => [plan.id, plan]));
      return group.planIds.map(planId => byId.get(planId)).filter(Boolean);
    }
    if (group.category) return pool.filter(plan => treatmentCategory(plan) === group.category);
    return [];
  }

  function horseTreatmentRecordedCount(plan) {
    if (plan?.id === '__horse_transport__') return record()?.documentation?.transportDecisionAt ? 1 : 0;
    return plan ? treatmentCount(plan) : 0;
  }

  function horseTransportFormMarkup() {
    const current = record() || {};
    const plan = transportPlan();
    return `
      <form class="horse-treatment-action-form horse-transport-selection-form">
        <div class="horse-treatment-detail-grid">
          <label>Working impression<select name="impression">${selectOptions(plan.impressions, current.impressions?.primary || '', 'Choose working impression')}</select></label>
          <label>Transport urgency<select name="priority">${selectOptions(transportPriorityOptions(), current.documentation?.transportPriority || '', 'Choose transport urgency')}</select></label>
          <label>Destination<select name="destination">${selectOptions(transportDestinationOptions(), current.documentation?.destination || '', 'Choose destination')}</select></label>
          <label>Notification<select name="notification">${selectOptions(['No specialty activation','Trauma activation','Stroke alert','STEMI / cath-lab activation','Pediatric alert','Burn-center notification'], current.documentation?.transportNotification || '', 'Choose notification')}</select></label>
        </div>
        <label class="horse-treatment-rationale">Reason for decision<textarea name="rationale" rows="2" placeholder="Optional clinical reasoning">${escapeHtml(current.documentation?.transportRationale || '')}</textarea></label>
        <div class="horse-treatment-perform-row"><button class="horse-treatment-perform" type="submit">Initiate transport</button><p class="transport-entry-error" hidden></p></div>
      </form>`;
  }

  function renderHorseTreatmentSelectionBox(groupId = horseTreatmentActiveGroup) {
    if (id !== 'horse_crush' || !desktopWorkspace()) return;
    const questionBox = $('horseClinicalQuestionBox');
    if (!questionBox) return;
    const group = HORSE_TREATMENT_GROUPS.find(item => item.id === groupId);
    if (!group) {
      questionBox.classList.remove('active','history-active','treatment-active');
      questionBox.innerHTML = `
        <div class="horse-question-placeholder">
          <small>TREATMENT SELECTION</small>
          <strong>Select a treatment group below.</strong>
        </div>`;
      return;
    }

    const plans = horseTreatmentGroupPlans(group);
    const completed = plans.filter(plan => horseTreatmentRecordedCount(plan) > 0).length;
    questionBox.classList.remove('history-active');
    questionBox.classList.add('active','treatment-active');
    questionBox.innerHTML = `
      <div class="horse-question-head horse-treatment-question-head">
        <div><small>TREATMENT SELECTION</small><strong>${escapeHtml(group.label)}</strong></div>
        <span>${completed}/${plans.length} used</span>
      </div>
      <div class="horse-treatment-selection-row">
        <label><span>Treatment / action</span>
          <select id="horseTreatmentSelect" aria-label="${escapeHtml(group.label)} treatment choice">
            <option value="">Choose a treatment</option>
            ${plans.map(plan => `<option value="${escapeHtml(plan.id)}">${horseTreatmentRecordedCount(plan) ? '✓ ' : ''}${escapeHtml(plan.label)}</option>`).join('')}
          </select>
        </label>
      </div>
      <div id="horseTreatmentDetail" class="horse-treatment-detail"><small>Select an action to see any required treatment details.</small></div>`;

    const select = questionBox.querySelector('#horseTreatmentSelect');
    const detail = questionBox.querySelector('#horseTreatmentDetail');
    const renderSelected = () => {
      const plan = plans.find(item => item.id === select?.value);
      if (!plan || !detail) {
        if (detail) detail.innerHTML = '<small>Select an action to see any required treatment details.</small>';
        return;
      }
      if (plan.id === '__horse_transport__') {
        detail.innerHTML = `<p class="horse-treatment-summary">${escapeHtml(plan.summary)}</p>${horseTransportFormMarkup()}`;
        detail.querySelector('form')?.addEventListener('submit', event => {
          event.preventDefault();
          saveTransportDecision(event.currentTarget);
        });
        return;
      }
      const fields = treatmentDocumentation(plan);
      detail.innerHTML = `
        <p class="horse-treatment-summary">${escapeHtml(plan.summary || 'Perform the selected treatment and observe the patient response.')}</p>
        <form class="horse-treatment-action-form">
          ${fields.length ? `<div class="horse-treatment-detail-grid">${fields.map(treatmentFieldMarkup).join('')}</div>` : ''}
          <div class="horse-treatment-perform-row"><button class="horse-treatment-perform" type="submit">${horseTreatmentRecordedCount(plan) ? 'Perform again' : 'Perform treatment'}</button><p class="treatment-entry-error" hidden></p></div>
        </form>`;
      const form = detail.querySelector('form');
      form?.addEventListener('submit', event => {
        event.preventDefault();
        const validation = validateTreatmentDocumentation(plan, form);
        const error = form.querySelector('.treatment-entry-error');
        if (!validation.ok) {
          if (error) { error.textContent = validation.message; error.hidden = false; }
          return;
        }
        if (error) error.hidden = true;
        recordTreatment(plan, validation.values);
      });
    };
    select?.addEventListener('change', renderSelected);
  }

  function selectHorseTreatmentGroup(groupId, options = {}) {
    if (id !== 'horse_crush' || !desktopWorkspace()) return;
    const group = HORSE_TREATMENT_GROUPS.find(item => item.id === groupId);
    if (!group) return;
    horseTreatmentActiveGroup = group.id;
    if (options.updateInfo !== false) {
      sceneObservationUpdate = {
        id:`horse-treatment-group-${group.id}`,
        type:'TREATMENT',
        title:group.label,
        text:group.instruction,
        kind:'treatment',
        sticky:true,
        recordedAt:new Date().toISOString()
      };
      infoManuallyCollapsed = false;
      lastInfoSignature = '';
      renderInfoUpdate(true);
    }
    renderHorseTreatmentSelectionBox(group.id);
    document.querySelectorAll('#treatmentTools .horse-treatment-group').forEach(details => {
      const selected = details.dataset.horseTreatmentGroup === group.id;
      details.classList.toggle('selected', selected);
      if (selected && !details.open) details.open = true;
    });
  }

  function buildHorseTreatmentsDesktop() {
    const box = $('treatmentTools');
    if (!box) return;
    box.innerHTML = '';
    box.className = 'treatment-list horse-treatment-groups';
    const current = record() || {};

    HORSE_TREATMENT_GROUPS.forEach(group => {
      const plans = horseTreatmentGroupPlans(group);
      if (!plans.length) return;
      const completed = plans.filter(plan => horseTreatmentRecordedCount(plan) > 0).length;
      const details = document.createElement('details');
      details.className = `treatment-category horse-treatment-group${horseTreatmentActiveGroup === group.id ? ' selected' : ''}`;
      details.dataset.horseTreatmentGroup = group.id;
      details.open = horseTreatmentActiveGroup === group.id;
      details.innerHTML = `
        <summary>
          <span class="horse-treatment-group-icon" aria-hidden="true">${escapeHtml(group.icon)}</span>
          <span><strong>${escapeHtml(group.label)}</strong><small>${escapeHtml(group.description)}</small></span>
          <em>${completed ? `${completed}/${plans.length}` : `${plans.length}`}</em>
        </summary>
        <div class="horse-treatment-group-preview">
          ${plans.map(plan => `<span class="${horseTreatmentRecordedCount(plan) ? 'used' : ''}">${horseTreatmentRecordedCount(plan) ? '✓' : '○'} ${escapeHtml(plan.label)}</span>`).join('')}
          <small>Selecting this group loads these actions into the fixed Treatment Selection box above.</small>
        </div>`;
      details.querySelector('summary')?.addEventListener('click', event => {
        event.preventDefault();
        const willOpen = !details.open;
        document.querySelectorAll('#treatmentTools .horse-treatment-group').forEach(other => {
          if (other !== details) other.open = false;
        });
        details.open = willOpen;
        if (willOpen) selectHorseTreatmentGroup(group.id);
        else if (horseTreatmentActiveGroup === group.id) {
          horseTreatmentActiveGroup = '';
          details.classList.remove('selected');
          renderHorseTreatmentSelectionBox();
        }
      });
      box.appendChild(details);
    });

    renderHorseTreatmentSelectionBox();
  }

  function buildTreatments() {
    const box = $('treatmentTools');
    if (id === 'horse_crush' && desktopWorkspace()) {
      buildHorseTreatmentsDesktop();
      return;
    }
    const uiState = captureTreatmentUi();
    box.innerHTML = '';
    box.classList.add('treatment-category-menu');
    const intro = document.createElement('div');
    intro.className = 'treatment-neutral-intro';
    intro.innerHTML = id === 'horse_crush'
      ? `<strong>Run the call your way.</strong><span>Choose treatment and movement decisions in any order. The simulator records the decision and patient response; it does not require an NREMT sequence.</span>`
      : `<strong>Select care by category.</strong><span>All common EMT-level choices remain available. Local scope, protocol, medication authorization, and medical direction control what may actually be performed. Treatment feedback remains hidden until the final debrief.</span>`;
    box.appendChild(intro);
    window.EMSCodeSimHorseCrush?.renderMovementSection?.(box);

    const categories = new Map();
    allTreatmentPlans().forEach(plan => {
      const category = treatmentCategory(plan);
      if (!categories.has(category)) categories.set(category, []);
      categories.get(category).push(plan);
    });

    Object.keys(TREATMENT_CATEGORY_META).forEach(category => {
      const plans = categories.get(category) || [];
      if (!plans.length) return;
      const meta = TREATMENT_CATEGORY_META[category];
      const details = document.createElement('details');
      details.className = `treatment-category treatment-category-${category}`;
      details.dataset.treatmentCategory = category;
      details.open = treatmentCategoryFocus === category || uiState.openCategories.has(category);
      const recordedCount = plans.filter(treatmentAlreadyRecorded).length;
      details.innerHTML = `<summary><span><strong>${escapeHtml(meta.label)}</strong><small>${escapeHtml(meta.description)}</small></span><em>${recordedCount ? `${recordedCount} recorded` : `${plans.length} options`}</em></summary><div class="treatment-category-list"></div>`;
      const list = details.querySelector('.treatment-category-list');
      plans.forEach(plan => list.appendChild(renderTreatmentCard(plan)));
      box.appendChild(details);
    });

    const transportCard = buildTransportTreatmentCard();
    if (uiState.openCategories.has('transport')) transportCard.open = true;
    box.appendChild(transportCard);

    if (id !== 'horse_crush') {
      const full = document.createElement('article');
      full.className = 'treatment-card full-treatment-menu';
      full.innerHTML = `<h3>Protocol-specific treatment</h3><p>Use the complete treatment tool for an intervention that is not listed here or requires additional documentation.</p><a class="primary-action" href="${toolUrl('/vitals/treatment-reassessment.html', 'Patient', 'general')}">Open complete treatment tool</a>`;
      box.appendChild(full);
    }
    restoreTreatmentUi(uiState);
    enforceSingleOpen('#treatmentTools', '.treatment-category');
    filterTreatmentMenu($('treatmentSearch')?.value || '');
  }

  function infoElapsed(value, startedAt) { return elapsedLabel(value, startedAt); }
  function abnormalEvent(event) {
    return event.status === 'abnormal' || event.normality === 'not-normal' || /critical|severe|inadequate|absent|low|high|hypox|shock|unresponsive|weak|labored|wheeze|slurred|drift|diaphoretic|pale/i.test(`${event.value || ''} ${event.details || ''}`);
  }
  function significantHistory(event) {
    return /last known well|anticoagul|allerg|anaphyl|insulin|diabet|overdose|naloxone|seizure|mechanism|blood thinner|pregnan|medication/i.test(`${event.value || ''} ${event.details || ''}`);
  }
  function isInformationUpdate(event) {
    // During the Horse Crush presentation, every newly obtained piece of patient
    // information should be visible in the live update window.
    if (id === 'horse_crush') return true;
    if (event.source === 'partner-assignment') return true;
    if (event.type === 'treatment' || event.type === 'reassessment' || event.type === 'patient_response' || event.type === 'condition_change') return true;
    if (event.type === 'impression' || event.type === 'documentation') return true;
    if (abnormalEvent(event)) return true;
    if (event.category === 'history' && significantHistory(event)) return true;
    return false;
  }
  function updateFromCareEvent(event) {
    const isAbnormal = abnormalEvent(event);
    if (event.source === 'partner-assignment') return { id: event.id || event.eventId, type: 'PARTNER UPDATE', title: `${event.label || labelFor(event.key)} obtained`, text: event.value || 'Partner task complete.', kind: 'partner', recordedAt: event.recordedAt };
    if (event.type === 'treatment') return { id: event.id || event.eventId, type: 'TREATMENT', title: event.label || 'Treatment performed', text: event.value || event.details || 'Treatment was recorded.', kind: 'treatment', recordedAt: event.recordedAt };
    if (event.type === 'reassessment') return { id: event.id || event.eventId, type: 'REASSESSMENT', title: event.label || 'Patient reassessed', text: event.value || event.details || 'The patient condition was reassessed.', kind: 'reassessment', recordedAt: event.recordedAt };
    if (event.type === 'condition_change') return { id: event.id || event.eventId, type: 'PATIENT CONDITION CHANGE', title: event.label || 'Patient condition changed', text: event.value || event.details || 'The patient condition changed.', kind: 'alert', recordedAt: event.recordedAt };
    if (event.type === 'patient_response') return { id: event.id || event.eventId, type: 'PATIENT RESPONSE', title: event.label || 'Response to treatment', text: event.value || event.details || 'The patient responded to treatment.', kind: 'reassessment', recordedAt: event.recordedAt };
    if (event.category === 'history') return { id: event.id || event.eventId, type: 'HISTORY ALERT', title: event.label || 'Important history', text: event.value || event.details || 'Relevant history was obtained.', kind: 'history', recordedAt: event.recordedAt };
    if (event.type === 'impression' || event.type === 'documentation') return { id: event.id || event.eventId, type: 'TRANSPORT / REPORT', title: event.label || 'Care plan updated', text: event.value || event.details || 'The care plan was updated.', kind: 'transport', recordedAt: event.recordedAt };
    return { id: event.id || event.eventId, type: isAbnormal ? 'CONDITION ALERT' : 'PATIENT UPDATE', title: event.label || labelFor(event.key), text: event.value || event.details || 'New patient information was obtained.', kind: isAbnormal ? 'alert' : 'assessment', recordedAt: event.recordedAt };
  }
  function buildInfoUpdates(current) {
    const startedAt = current?.startedAt || new Date().toISOString();
    const updates = [
      { id: 'dispatch', type: 'DISPATCH', title: 'Dispatch information', text: current?.dispatch || scenario.title, kind: 'dispatch', recordedAt: startedAt },
      { id: 'visible', type: 'VISIBLE CONDITION', title: 'First patient view', text: scenario.visible, kind: 'visible', recordedAt: new Date(new Date(startedAt).getTime() + 1).toISOString() }
    ];
    const log = api?.listCareLog?.(current, 'all') || [];
    log.filter(event => isInformationUpdate(event) && !event.suppressInfoUpdate && !(id === 'horse_crush' && event.source === 'horse-rapid-abc'))
      .forEach(event => updates.push(updateFromCareEvent(event)));
    if (sceneObservationUpdate) updates.push(sceneObservationUpdate);
    if (id === 'horse_crush') {
      updates.sort((a, b) => new Date(a.recordedAt || 0).getTime() - new Date(b.recordedAt || 0).getTime());
    }
    return updates;
  }
  function setInfoCollapsed(collapsed, options = {}) {
    const windowEl = $('infoUpdateWindow');
    if (!windowEl) return;
    windowEl.dataset.collapsed = collapsed ? 'true' : 'false';
    windowEl.classList.toggle('is-collapsed', collapsed);
    const button = $('infoUpdateCollapse');
    if (button) {
      button.textContent = collapsed ? '⌄' : '⌃';
      button.setAttribute('aria-expanded', String(!collapsed));
      button.setAttribute('aria-label', collapsed ? 'Expand patient update' : 'Collapse patient update');
    }
    if (!collapsed && options.markViewed !== false) {
      const unread = $('infoUpdateUnread');
      if (unread) unread.hidden = true;
    }
  }

  function scheduleInfoCollapse(item, isNew) {
    clearTimeout(infoAutoCollapseTimer);
    if (!item || !isNew) return;
    if (item.sticky) {
      infoManuallyCollapsed = false;
      setInfoCollapsed(false);
      return;
    }
    if (item.kind === 'alert') {
      infoManuallyCollapsed = false;
      setInfoCollapsed(false);
      return;
    }
    if (infoManuallyCollapsed) {
      setInfoCollapsed(true, { markViewed:false });
      const unread = $('infoUpdateUnread');
      if (unread) unread.hidden = false;
      return;
    }
    setInfoCollapsed(false);
    infoAutoCollapseTimer = window.setTimeout(() => {
      setInfoCollapsed(true, { markViewed:false });
    }, item.kind === 'dispatch' ? 8000 : 5000);
  }

  function renderInfoUpdate(forceLatest = false) {
    const current = record() || {};
    const nextUpdates = buildInfoUpdates(current);
    const signature = nextUpdates.map(item => `${item.id}:${item.text}`).join('|');
    const firstRender = !lastInfoSignature;
    const changed = signature !== lastInfoSignature;
    infoUpdates = nextUpdates;
    if (firstRender && !forceLatest) infoUpdateIndex = 0;
    else if (forceLatest || changed) infoUpdateIndex = Math.max(0, infoUpdates.length - 1);
    infoUpdateIndex = Math.max(0, Math.min(infoUpdateIndex, infoUpdates.length - 1));
    lastInfoSignature = signature;
    const item = infoUpdates[infoUpdateIndex];
    if (!item || !$('infoUpdateWindow')) return;
    const isNew = forceLatest || changed || item.id !== lastInfoItemId;
    const collapsed = $('infoUpdateWindow').dataset.collapsed === 'true';
    $('infoUpdateWindow').className = `info-update-window info-${item.kind || 'assessment'}${collapsed ? ' is-collapsed' : ''}`;
    $('infoUpdateType').textContent = item.type;
    $('infoUpdateTitle').textContent = item.title;
    $('infoUpdateText').textContent = item.text;
    $('infoUpdateTime').textContent = infoElapsed(item.recordedAt, current.startedAt);
    $('infoUpdateCount').textContent = `${infoUpdateIndex + 1} of ${infoUpdates.length}`;
    $('infoUpdatePrevious').disabled = infoUpdateIndex <= 0;
    $('infoUpdateNext').disabled = infoUpdateIndex >= infoUpdates.length - 1;

    scheduleInfoCollapse(item, isNew);

    if (id === 'horse_crush' && isNew && !firstRender) {
      const updateWindow = $('infoUpdateWindow');
      const unread = $('infoUpdateUnread');
      if (unread) {
        unread.hidden = false;
        unread.textContent = 'NEW INFO';
        window.clearTimeout(unread._newInfoTimer);
        unread._newInfoTimer = window.setTimeout(() => { unread.hidden = true; }, 2600);
      }
      if (updateWindow) {
        updateWindow.classList.remove('new-info-pulse');
        void updateWindow.offsetWidth;
        updateWindow.classList.add('new-info-pulse');
        window.clearTimeout(updateWindow._newInfoTimer);
        updateWindow._newInfoTimer = window.setTimeout(() => updateWindow.classList.remove('new-info-pulse'), 2400);
      }
    }

    lastInfoItemId = item.id || `${item.type}:${item.recordedAt}`;
  }

  window.EMSCodeSimPatientInfo = {
    showSceneObservation(input = {}) {
      const current = record() || {};
      sceneObservationUpdate = {
        id: input.id || `scene-observation-${Date.now()}`,
        type: input.type || 'APPROACH OBSERVATION',
        title: input.title || 'What you notice as you approach',
        text: input.text || 'Continue observing the scene and patient.',
        kind: input.kind || 'observation',
        sticky: input.sticky !== false,
        recordedAt: input.recordedAt || new Date().toISOString()
      };
      infoManuallyCollapsed = false;
      lastInfoSignature = '';
      renderInfoUpdate(true);
      return sceneObservationUpdate;
    },
    clearSceneObservation() {
      if (!sceneObservationUpdate) return;
      sceneObservationUpdate = null;
      lastInfoSignature = '';
      infoManuallyCollapsed = false;
      renderInfoUpdate(true);
    }
  };

  function discoveredSummary(current = record() || {}) {
    const events = api?.listCareLog?.(current, 'all') || [];
    const abnormal = [...events].reverse().filter(event => abnormalEvent(event));
    const evaluation = phases?.evaluate?.(current);
    const due = evaluation?.reassessment?.missingTargets || evaluation?.missingReassessmentTargets || [];
    const condition = conditionState(current);
    const partnerTasks = Object.values(session?.readPartnerTasks?.(id) || {});
    const activePartner = partnerTasks.find(task => ['active','pending'].includes(task.status)) || partnerTasks.find(task => task.status === 'queued');
    const unfinished = [];
    if (activePartner) unfinished.push(`${activePartner.label || labelFor(activePartner.key)} ${activePartner.status === 'queued' ? 'queued' : `${secondsRemaining(activePartner)} sec`}`);
    if (due.length) unfinished.push(`${due.length} reassessment${due.length === 1 ? '' : 's'} due`);
    const status = condition?.title || (abnormal.length >= 3 ? 'Unstable' : abnormal.length ? 'Concerning' : 'Assessment in progress');
    const latest = abnormal[0] ? `${abnormal[0].label || labelFor(abnormal[0].key)}: ${abnormal[0].value || abnormal[0].finding || 'Abnormal'}` : 'No abnormal findings documented';
    return { status, latest, due, activePartner, unfinished };
  }

  function renderUnifiedClinicalBar() {
    const summary = discoveredSummary();
    if ($('clinicalBarStatus')) $('clinicalBarStatus').textContent = summary.status;
    if ($('clinicalBarFinding')) $('clinicalBarFinding').textContent = summary.latest;
    if ($('sheetContextStatus')) $('sheetContextStatus').textContent = summary.status;
    if ($('sheetContextFinding')) $('sheetContextFinding').textContent = summary.latest;
    const dueText = summary.due.length ? summary.due.map(labelFor).join(' • ') : 'None';
    if ($('clinicalBarDue')) $('clinicalBarDue').textContent = dueText;
    if ($('sheetContextDue')) $('sheetContextDue').textContent = dueText;
    if ($('clinicalBarTasks')) $('clinicalBarTasks').textContent = summary.unfinished.length ? summary.unfinished.join(' • ') : 'No unfinished actions';
    if ($('clinicalBarPartner')) $('clinicalBarPartner').textContent = summary.activePartner ? `${summary.activePartner.label || labelFor(summary.activePartner.key)} · ${summary.activePartner.status === 'queued' ? 'queued' : `${secondsRemaining(summary.activePartner)} sec remaining`}` : 'No active assignment';
    const badge = $('clinicalBarBadge');
    if (badge) { const count = summary.unfinished.length; badge.hidden = !count; badge.textContent = String(count); }
  }

  function enforceSingleOpen(containerSelector, detailsSelector) {
    const container = document.querySelector(containerSelector);
    if (!container || container.dataset.singleOpenBound === 'true') return;
    container.dataset.singleOpenBound = 'true';
    container.addEventListener('toggle', event => {
      const opened = event.target;
      if (!(opened instanceof HTMLDetailsElement) || !opened.open || !opened.matches(detailsSelector)) return;
      container.querySelectorAll(detailsSelector).forEach(item => { if (item !== opened) item.open = false; });
    }, true);
  }

  function filterTreatmentMenu(query = '') {
    const term = String(query).trim().toLowerCase();
    document.querySelectorAll('#treatmentTools .treatment-category').forEach(category => {
      let visible = 0;
      category.querySelectorAll('.treatment-card').forEach(card => {
        const matches = !term || card.textContent.toLowerCase().includes(term);
        card.hidden = !matches;
        if (matches) visible += 1;
      });
      category.hidden = term ? visible === 0 : false;
      if (term && visible) category.open = true;
    });
  }

  function renderClinicalWorkspace() {
    const current = record() || {};
    const events = api?.listCareLog?.(current, 'all') || [];
    const abnormal = [...events].reverse().filter(event => abnormalEvent(event)).slice(0, 3);
    const treatments = (current.treatments || []).slice(-3);
    const evaluation = phases?.evaluate?.(current);
    const due = evaluation?.reassessment?.missingTargets || evaluation?.missingReassessmentTargets || [];
    const condition = conditionState(current);
    const elapsed = elapsedLabel(new Date().toISOString(), current.startedAt);
    if ($('workspaceElapsed')) $('workspaceElapsed').textContent = elapsed;
    if ($('workspaceStatus')) $('workspaceStatus').textContent = condition?.title || (abnormal.length >= 3 ? 'Unstable — multiple abnormal findings' : abnormal.length ? 'Concerning findings present' : 'Assessment in progress');
    if ($('workspaceAbnormal')) $('workspaceAbnormal').textContent = abnormal.length ? abnormal.map(event => `${event.label || labelFor(event.key)}: ${event.value || event.finding || 'Abnormal'}`).join(' • ') : 'None documented';
    if ($('workspaceTreatments')) $('workspaceTreatments').textContent = treatments.length ? treatments.map(item => item.name || item.treatment || item.label).join(' • ') : 'None documented';
    if ($('workspaceReassessment')) $('workspaceReassessment').textContent = due.length ? due.map(labelFor).join(' • ') : ((current.treatments || []).some(item => item.reassessmentRequired) ? 'Review treatment targets in the timeline' : 'None currently due');
  }

  function renderFindings() {
    renderClinicalWorkspace();
    const list = $('findingList');
    const current = record() || {};
    const filterMap = { vitals: 'vital', treatments: 'treatment', assessments: 'assessment', history: 'history', reassessments: 'reassessment' };
    let events = api?.listCareLog?.(current, 'all') || [];
    if (findingFilter === 'reassessments') events = events.filter(event => event.type === 'reassessment');
    else if (findingFilter !== 'all') events = events.filter(event => event.category === filterMap[findingFilter]);
    document.querySelectorAll('[data-log-filter]').forEach(button => button.classList.toggle('active', button.dataset.logFilter === findingFilter));
    const activeFilter = document.querySelector(`[data-log-filter="${findingFilter}"]`)?.dataset.label || 'All log';
    $('findingFilterSummary').textContent = `${events.length} ${activeFilter.toLowerCase()} entr${events.length === 1 ? 'y' : 'ies'} shown.`;
    list.innerHTML = '';
    if (!events.length) {
      list.innerHTML = '<li class="empty">No matching patient-care events have been recorded.</li>';
      return;
    }
    events.forEach((event, index) => {
      const item = document.createElement('li');
      item.className = `care-log-item ${event.category || 'assessment'} ${event.type || 'finding'}`;
      item.innerHTML = `
        <div class="care-log-order"><b>${index + 1}</b><span>${escapeHtml(elapsedLabel(event.recordedAt, current.startedAt))}</span></div>
        <div class="care-log-content">
          <div class="care-log-heading"><span class="care-log-type">${eventTypeLabel(event)}</span><time datetime="${escapeHtml(event.recordedAt)}">${escapeHtml(formatClock(event.recordedAt))}</time></div>
          <strong>${escapeHtml(event.label || labelFor(event.key))}</strong>
          <p>${escapeHtml(event.value || 'Recorded')}</p>
          ${event.details ? `<small>${escapeHtml(event.details)}</small>` : ''}
        </div>`;
      list.appendChild(item);
    });
  }

  function updateCounts() {
    const current = record() || {};
    const log = api?.listCareLog?.(current, 'all') || [];
    if ($('findingBadge')) {
      $('findingBadge').hidden = !log.length;
      $('findingBadge').textContent = String(log.length);
    }
    const askedCount = askedInterviewQuestions(current).length;
    if ($('historyBadge')) {
      $('historyBadge').hidden = !askedCount;
      $('historyBadge').textContent = String(askedCount);
    }
  }

  function renderSceneClues() {
    const layer = $('sceneClueLayer');
    if (!layer) return;
    document.querySelector('.patient-stage')?.setAttribute('data-scene-mode', scenario.imageMode || id);
    layer.innerHTML = scenario.sceneClues.map((clue, index) => `<span class="scene-clue clue-${index + 1}">${escapeHtml(clue)}</span>`).join('');
  }

  function transportPlan() { return TRANSPORT_PLANS[id] || TRANSPORT_PLANS.asthma; }
  function selectOptions(values, selected, placeholder) {
    return `<option value="">${escapeHtml(placeholder)}</option>${values.map(value => `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}`;
  }

  function transportPriorityOptions() {
    if (id === 'horse_crush') return transportPlan().priorities || ['Non-emergent transport','Prompt trauma transport','Emergent trauma transport'];
    return ['Non-emergent transport','Emergent transport'];
  }
  function transportDestinationOptions() {
    if (id === 'horse_crush') return transportPlan().destinations || ['Closest appropriate emergency department','Trauma center'];
    return ['Closest appropriate emergency department','Trauma center','Stroke center','Cardiac catheterization center','Pediatric-capable emergency department','Burn center','Specialty respiratory center'];
  }

  function saveTransportDecision(form) {
    const current = record() || {};
    const impression = String(form.elements.namedItem('impression')?.value || '');
    const priority = String(form.elements.namedItem('priority')?.value || '');
    const destination = String(form.elements.namedItem('destination')?.value || '');
    const notification = String(form.elements.namedItem('notification')?.value || '');
    const rationale = String(form.elements.namedItem('rationale')?.value || '').trim();
    const error = form.querySelector('.transport-entry-error');
    if (!impression || !priority || !destination) {
      error.textContent = 'Choose a working impression, transport priority, and destination.';
      error.hidden = false;
      return;
    }
    error.hidden = true;
    api?.setImpressions?.({ primary: impression, action: priority, source:'transport-treatment', updatedAt:new Date().toISOString() });
    api?.setDocumentation?.({ transportPriority:priority, destination, transportNotification:notification, transportRationale:rationale, transportDecisionAt:new Date().toISOString() });
    api?.setFinding?.('transport_decision', `${priority} to ${destination}`, { label:'Transport decision', source:'transport-treatment', details:rationale || `Working impression: ${impression}` });
    const plan = transportPlan();
    const expectedPriority = id === 'horse_crush' ? plan.bestPriority : (/Emergent|Prompt/i.test(plan.bestPriority || '') ? 'Emergent transport' : 'Non-emergent transport');
    const priorityMatch = priority === expectedPriority;
    const destinationMatch = destination === plan.bestDestination || (plan.bestDestination === 'Stroke-capable center' && destination === 'Stroke center');
    const classification = priorityMatch && destinationMatch ? 'appropriate-effective' : 'transport-choice-review';
    const treatment = {
      actionId:'transport_decision', treatment:'Initiate transport', name:'Initiate transport', label:'Transport initiated',
      description:`${priority} to ${destination}${notification ? ` • ${notification}` : ''}`,
      source:'transport-treatment', classification, indicationStatus:classification,
      targetKeys:[], reassessmentRequired:false,
      documentation:{ impression, priority, destination, notification, rationale },
      patientResponse:'The patient is prepared for movement and transport while care and reassessment continue.'
    };
    if (session?.addTreatment) session.addTreatment(treatment); else api?.addTreatment?.(treatment);
    api?.mergeCareLog?.([
      { type:'documentation', category:'transport', key:'transport_decision', label:'Transport initiated', value:treatment.description, details:rationale, source:'transport-treatment', suppressInfoUpdate:id === 'horse_crush', recordedAt:new Date(Date.now()+1).toISOString() },
      ...(id === 'horse_crush' ? [{ type:'patient_response', category:'treatment', key:'transport_decision', label:'Patient response to transport', value:treatment.patientResponse, details:'Continue care and reassessment during transport.', source:'transport-treatment-response', recordedAt:new Date(Date.now()+2).toISOString() }] : [])
    ]);
    refreshFromRecord();
    if (id === 'horse_crush') renderInfoUpdate(true);
    toast('Transport decision recorded');
  }

  function buildTransportTreatmentCard() {
    const current = record() || {};
    const plan = transportPlan();
    const recorded = Boolean(current.documentation?.transportDecisionAt);
    const details = document.createElement('details');
    details.className = 'treatment-category treatment-category-transport';
    details.dataset.treatmentCategory = 'transport';
    details.open = treatmentCategoryFocus === 'transport';
    details.innerHTML = `<summary><span><strong>Transport</strong><small>Select urgency, destination, and specialty notification.</small></span><em>${recorded ? 'Recorded' : 'Decision required'}</em></summary><div class="treatment-category-list"><article class="treatment-card transport-treatment-card"><div class="treatment-card-heading"><div><h3>Initiate transport</h3></div><span class="status-chip ${recorded ? 'done' : ''}">${recorded ? 'Recorded' : 'Available'}</span></div><p>Make the transport decision from the findings you obtained. Correctness is reviewed during debrief.</p><form class="transport-treatment-form"><label>Working impression<select name="impression">${selectOptions(plan.impressions, current.impressions?.primary || '', 'Choose working impression')}</select></label><label>Transport urgency<select name="priority">${selectOptions(transportPriorityOptions(), current.documentation?.transportPriority || '', 'Choose emergent or non-emergent')}</select></label><label>Destination<select name="destination">${selectOptions(transportDestinationOptions(), current.documentation?.destination || '', 'Choose receiving destination')}</select></label><label>Specialty notification<select name="notification">${selectOptions(['No specialty activation','Trauma activation','Stroke alert','STEMI / cath-lab activation','Pediatric alert','Burn-center notification'], current.documentation?.transportNotification || '', 'Choose notification')}</select></label><label>Reason for decision<textarea name="rationale" rows="3" placeholder="Use findings, time sensitivity, and specialty needs">${escapeHtml(current.documentation?.transportRationale || '')}</textarea></label><button class="primary-action" type="submit">${recorded ? 'Update transport decision' : 'Initiate and record transport'}</button><p class="transport-entry-error" hidden></p></form></article></div>`;
    details.querySelector('form')?.addEventListener('submit', event => { event.preventDefault(); saveTransportDecision(event.currentTarget); });
    return details;
  }
  function handoffText(current = record() || {}) {
    const findings = current.findings || {};
    const age = current.patient || (id === 'pediatric' ? '3-year-old child' : 'Adult patient');
    const impression = current.impressions?.primary || 'working impression not yet selected';
    const initialVitals = ['blood_pressure','pulse','respirations','spo2','blood_glucose','temperature'].filter(key => findings[key]).map(key => `${labelFor(key)} ${findings[key].value}`).join(', ');
    const important = ['airway','breathing','perfusion','mental_status','motor_sensory','breath_sounds','skin'].filter(key => findings[key]).map(key => `${labelFor(key)}: ${findings[key].value}`).join('; ');
    const treatments = (current.treatments || []).map(item => item.description || item.name || item.treatmentLabel || item.value).filter(Boolean).join('; ');
    const reassess = (current.reassessments || []).slice(-3).map(item => item.description || item.response || item.value).filter(Boolean).join('; ');
    const priority = current.documentation?.transportPriority || current.impressions?.action || 'transport priority not yet selected';
    const destination = current.documentation?.destination || 'destination not yet selected';
    return `${age} with ${current.dispatch || scenario.title}. Working impression: ${impression}. Key findings: ${important || 'assessment findings pending'}. Vitals: ${initialVitals || 'initial vitals pending'}. Treatments: ${treatments || 'none recorded'}. Response/reassessment: ${reassess || 'reassessment pending'}. Transporting ${priority.toLowerCase()} to ${destination}.`;
  }
  function generateHandoff() { $('handoffDraft').value = handoffText(); }
  function saveHandoff() {
    const text = ($('handoffDraft')?.value || '').trim();
    if (!text) { toast('Generate or enter the handoff report first'); return; }
    api?.setDocumentation?.({ handoff: text, handoffSavedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    toast('Handoff saved'); renderTransport(); renderProgress();
  }
  function renderTransport() { /* Transport is rendered inside the Treatment tab. */ }

  function renderProgress() {
    const current = record();
    const evaluation = phases?.evaluate?.(current);
    if (!evaluation) return;
    const list = $('scenarioPhaseList');
    list.innerHTML = evaluation.phases.map(phase => `
      <div class="scenario-phase ${phase.status}">
        <span class="phase-state" aria-hidden="true">${phase.complete ? '✓' : phase.started ? '•' : ''}</span>
        <div><strong>${escapeHtml(phase.label)}</strong><small>${escapeHtml(phase.requirement)}${phase.detail ? ` • ${escapeHtml(phase.detail)}` : ''}</small></div>
      </div>`).join('');
    const completed = evaluation.phases.filter(phase => phase.complete).length;
    $('scenarioProgressSummary').textContent = `${completed} of ${evaluation.phases.length} phases addressed`;
    $('handoffFromProgress').href = '#';
    $('handoffFromProgress').onclick = event => { event.preventDefault(); treatmentCategoryFocus = 'transport'; openSheet('treatmentPanel'); };
    const button = $('completeScenarioFromPatient');
    button.textContent = evaluation.essentialComplete ? 'Open debrief' : 'Check completion';
    button.dataset.ready = evaluation.essentialComplete ? 'true' : 'false';
  }

  function assignmentSessionForScenario() {
    try {
      const assignment = JSON.parse(localStorage.getItem('emscodesim_student_assignment_v1') || 'null');
      if (!assignment) return null;
      const aliases = { respiratory: 'asthma' };
      const assignedCase = aliases[assignment.scenario] || assignment.scenario;
      return assignedCase === id ? assignment : null;
    } catch { return null; }
  }

  function markAssignmentComplete(assignment) {
    if (!assignment) return;
    const completedAt = new Date().toISOString();
    const next = { ...assignment, completedAt, scenarioComplete: true };
    localStorage.setItem('emscodesim_student_assignment_v1', JSON.stringify(next));
    localStorage.setItem('emscodesim_assignment_completion_v1', JSON.stringify({
      assignmentCode: next.assignmentCode,
      assignmentId: next.assignmentId || null,
      learnerName: next.learnerName || '',
      scenario: id,
      scenarioTitle: scenario.title,
      completedAt,
      requireDebrief: Boolean(next.requireDebrief)
    }));
  }

  function checkScenarioCompletion() {
    const current = record();
    const evaluation = phases?.evaluate?.(current);
    const message = $('scenarioCompletionMessage');
    if (!evaluation) return;
    $('scenarioProgress').open = true;
    message.hidden = false;
    if (!evaluation.essentialComplete) {
      const remaining = evaluation.missing.slice(0, 7);
      message.className = 'scenario-completion-message incomplete';
      message.innerHTML = `<strong>Before finishing</strong><span>${escapeHtml(remaining.join(' • '))}${evaluation.missing.length > remaining.length ? ` • +${evaluation.missing.length - remaining.length} more` : ''}</span><div class="completion-choice-actions"><button id="continueScenarioCare" type="button">Return to patient care</button><button id="finishScenarioAnyway" class="secondary" type="button">Finish anyway</button></div>`;
      $('continueScenarioCare')?.addEventListener('click', () => { message.hidden = true; });
      $('finishScenarioAnyway')?.addEventListener('click', () => finishScenarioAndOpenDebrief(current, evaluation, true));
      return;
    }
    finishScenarioAndOpenDebrief(current, evaluation, false);
  }

  function finishScenarioAndOpenDebrief(current, evaluation, incomplete) {
    const message = $('scenarioCompletionMessage');
    const assignment = assignmentSessionForScenario();
    const state = session?.readState?.(id) || {};
    state.clinicalComplete = !incomplete;
    state.clinicalCompletedAt = new Date().toISOString();
    state.complete = !assignment?.requireDebrief && !incomplete;
    if (state.complete) state.completedAt = state.clinicalCompletedAt;
    session?.writeState?.(id, state);
    if (!incomplete) localStorage.setItem(`emscodesim_mastered_scenario_${id}`, 'true');
    if (assignment && !assignment.requireDebrief && !incomplete) markAssignmentComplete(assignment);
    message.className = 'scenario-completion-message complete';
    message.innerHTML = incomplete ? '<strong>Scenario ended with care items outstanding.</strong><span>The debrief will identify the missing and delayed actions.</span>' : '<strong>Essential patient care is complete.</strong><span>Open the debrief to review timing, missed choices, unnecessary assessments, and documentation.</span>';
    location.href = toolUrl('/vitals/scenario-debrief.html', 'Patient');
  }

  function updateTimer() {
    if (!scenarioStartMs) {
      const startedAt = record()?.startedAt;
      scenarioStartMs = new Date(startedAt || Date.now()).getTime();
    }
    const elapsed = Math.max(0, Math.floor((Date.now() - scenarioStartMs) / 1000));
    $('timer').textContent = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  }

  function updatePartnerTasks() {
    const tasks = session?.readPartnerTasks?.(id) || {};
    document.querySelectorAll('[data-tool-key]').forEach(article => {
      const task = tasks[article.dataset.toolKey];
      if (!task || !['pending','queued'].includes(task.status)) return;
      const progress = article.querySelector('.assignment-progress');
      if (progress) progress.textContent = task.status === 'pending'
        ? `Partner gathering ${String(task.label || '').toLowerCase()}… ${secondsRemaining(task)}s`
        : 'Queued — partner will start after the current skill.';
    });
  }

  function runConditionClock() {
    const changed = evaluatePatientCondition('timed-condition-check');
    if (changed) {
      refreshFromRecord();
      renderInfoUpdate(true);
    }
  }

  function openScenarioControls() {
    $('scenarioControlDialog').hidden = false;
    $('scenarioControlBackdrop').hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('saveAndExitScenario')?.focus(), 0);
  }

  function closeScenarioControls() {
    $('scenarioControlDialog').hidden = true;
    $('scenarioControlBackdrop').hidden = true;
    document.body.style.overflow = '';
  }

  function resetScenario() {
    try {
      closeScenarioControls();
      api?.clear?.();
      const partnerKey = session?.partnerTaskKey?.(id);
      [partnerKey, partnerKey && `${partnerKey}_backup`, partnerKey && `${partnerKey}_shadow`, `emscodesim_scenario_${id}`, `emscodesim_scenario_${id}_backup`, `emscodesim_scenario_${id}_shadow`].filter(Boolean).forEach(key => localStorage.removeItem(key));
      location.href = `/vitals/visual-patient.html?case=${encodeURIComponent(id)}&training=${encodeURIComponent(trainingMode())}&reset=1`;
    } catch (error) {
      console.error(error);
      toast('Scenario could not be reset. Try returning to the launcher.');
    }
  }

  function endScenario() {
    closeScenarioControls();
    location.href = `/vitals/scenario-launcher.html?select=${encodeURIComponent(id)}&training=${encodeURIComponent(trainingMode())}&ended=1`;
  }

  const desktopWorkspaceQuery = window.matchMedia('(min-width: 980px)');
  const desktopWorkspace = () => desktopWorkspaceQuery.matches;
  let desktopWorkspaceReady = false;
  let mobileNavAnchor = null;
  let mobileSheetAnchor = null;

  function openSheet(panelId) {
    evaluatePatientCondition(panelId === 'treatmentPanel' ? 'treatment-review' : 'patient-tool-open');
    refreshFromRecord();
    document.querySelectorAll('.vp-panel').forEach(panel => { panel.hidden = panel.id !== panelId; });
    document.querySelectorAll('.bottom-nav button').forEach(button => button.classList.toggle('active', button.dataset.panel === panelId));
    $('sheetTitle').textContent = { vitalsPanel: 'Vitals', assessmentPanel: 'Assessment', historyPanel: 'Patient history', treatmentPanel: 'Treatment', findingsPanel: 'Patient care log' }[panelId];
    $('actionSheet').hidden = false;
    if (desktopWorkspace()) {
      $('sheetBackdrop').hidden = true;
      document.body.style.overflow = '';
      if (id === 'horse_crush') document.body.classList.add('horse-tool-sheet-open');
    } else {
      $('sheetBackdrop').hidden = false;
      document.body.style.overflow = 'hidden';
    }
    if (panelId === 'findingsPanel') renderFindings();
    if (panelId === 'historyPanel') {
      if (id === 'horse_crush' && desktopWorkspace()) {
        horseTreatmentActiveGroup = '';
        horseHistoryActiveGroup = '';
        renderHorseHistoryQuestionBox();
      }
      buildHistory();
    } else if (panelId === 'treatmentPanel' && id === 'horse_crush' && desktopWorkspace()) {
      horseHistoryActiveGroup = '';
      horseTreatmentActiveGroup = '';
      buildTreatments();
      renderHorseTreatmentSelectionBox();
    } else if (id === 'horse_crush' && desktopWorkspace()) {
      horseHistoryActiveGroup = '';
      horseTreatmentActiveGroup = '';
      horseWorkspaceContext?.resetQuestionBox?.();
    }
    if (panelId === 'treatmentPanel' && treatmentCategoryFocus) {
      const target = document.querySelector(`#treatmentTools [data-treatment-category="${CSS.escape(treatmentCategoryFocus)}"]`);
      if (target) {
        target.open = true;
        window.requestAnimationFrame(() => target.scrollIntoView({ block:'nearest' }));
      }
      treatmentCategoryFocus = '';
    }
  }

  function closeSheet() {
    if (desktopWorkspace()) {
      if (id === 'horse_crush') {
        $('actionSheet').hidden = true;
        $('sheetBackdrop').hidden = true;
        document.body.classList.remove('horse-tool-sheet-open');
        document.body.style.overflow = '';
        document.querySelectorAll('.bottom-nav button').forEach(button => button.classList.remove('active'));
        horseHistoryActiveGroup = '';
        horseTreatmentActiveGroup = '';
        horseWorkspaceContext?.resetQuestionBox?.();
        configureHorseCurrentAssessmentWorkspace();
        return;
      }
      openSheet('assessmentPanel');
      return;
    }
    $('actionSheet').hidden = true;
    $('sheetBackdrop').hidden = true;
    document.body.style.overflow = '';
    document.querySelectorAll('.bottom-nav button').forEach(button => button.classList.remove('active'));
  }

  function configureDesktopWorkspace() {
    const nav = document.querySelector('.bottom-nav');
    const sheet = $('actionSheet');
    const controlColumn = document.querySelector('.patient-control-column');
    const backdrop = $('sheetBackdrop');
    if (!nav || !sheet || !controlColumn || !backdrop) return;

    if (!mobileNavAnchor) {
      mobileNavAnchor = document.createComment('mobile-nav-anchor');
      nav.parentNode?.insertBefore(mobileNavAnchor, nav);
    }
    if (!mobileSheetAnchor) {
      mobileSheetAnchor = document.createComment('mobile-sheet-anchor');
      sheet.parentNode?.insertBefore(mobileSheetAnchor, sheet);
    }

    const desktop = desktopWorkspace();
    document.body.classList.toggle('desktop-scenario-layout', desktop);

    if (desktop) {
      if (id === 'horse_crush') {
        const infoWindow = $('infoUpdateWindow');
        const questionBox = $('horseClinicalQuestionBox');
        const currentAssessment = $('horseCurrentAssessment');
        if (infoWindow && questionBox) infoWindow.insertAdjacentElement('afterend', questionBox);
        if (questionBox && currentAssessment) questionBox.insertAdjacentElement('afterend', currentAssessment);
      }
      controlColumn.appendChild(sheet);
      controlColumn.appendChild(nav);
      backdrop.hidden = true;
      document.body.style.overflow = '';
      desktopWorkspaceReady = true;
      if (id === 'horse_crush') {
        sheet.hidden = true;
        document.body.classList.remove('horse-tool-sheet-open');
        document.querySelectorAll('.bottom-nav button').forEach(button => button.classList.remove('active'));
        configureHorseCurrentAssessmentWorkspace();
      } else {
        sheet.hidden = false;
        const activePanel = [...document.querySelectorAll('.vp-panel')].find(panel => !panel.hidden)?.id || 'assessmentPanel';
        openSheet(activePanel);
      }
    } else if (desktopWorkspaceReady) {
      mobileNavAnchor.parentNode?.insertBefore(nav, mobileNavAnchor.nextSibling);
      mobileSheetAnchor.parentNode?.insertBefore(sheet, mobileSheetAnchor.nextSibling);
      sheet.hidden = true;
      backdrop.hidden = true;
      document.body.classList.remove('horse-tool-sheet-open');
      document.body.style.overflow = '';
      document.querySelectorAll('.bottom-nav button').forEach(button => button.classList.remove('active'));
      desktopWorkspaceReady = false;
    }
  }

  function finishFocus() {
    if (!activeFocus) return;
    saveFinding(activeFocus.key, activeFocus.finding, 'visual-assessment');
    $('assessmentFocus').hidden = true;
    activeFocus = null;
  }

  function renderDataSignatures(current = record() || {}) {
    const findings = current.findings || {};
    const customAssessmentKeys = id === 'horse_crush' ? ['arrival_parking','bls_handoff','neck_back','pelvis_hip','left_leg','distal_csm','movement_plan'] : [];
    const assessmentKeys = [...new Set([...(registry?.assessmentTools || []).map(tool => tool.key), ...customAssessmentKeys])];
    const vitalKeys = (registry?.vitalTools || []).filter(tool => MEASURABLE_TOOL_KEYS.has(tool.key)).map(tool => tool.key);
    const partnerTasks = session?.readPartnerTasks?.(id) || {};
    const select = keys => Object.fromEntries(keys.map(key => [key, findings[key] || null]));
    const selectedTasks = keys => Object.fromEntries(keys.map(key => [key, partnerTasks[key] || null]));
    const careLog = api?.listCareLog?.(current, 'all') || current.careLog || [];
    return {
      vitals: dataSignature({ findings:select(vitalKeys), tasks:selectedTasks(vitalKeys), treatments:current.treatments || [], reassessments:current.reassessments || [] }),
      assessments: dataSignature({ mode:trainingMode(), findings:select(assessmentKeys), tasks:selectedTasks(assessmentKeys), treatments:current.treatments || [], reassessments:current.reassessments || [] }),
      history: dataSignature({ history:current.history || {}, sample:findings.sample || null, pain:findings.pain || null }),
      treatments: dataSignature({ treatments:current.treatments || [], transport:current.transport || current.documentation?.transport || null, handoff:current.documentation?.handoff || null }),
      findings: dataSignature(careLog),
      progress: dataSignature({ findings, treatments:current.treatments || [], reassessments:current.reassessments || [], transport:current.transport || null, documentation:current.documentation || {} })
    };
  }

  function refreshFromRecord(options = {}) {
    const force = options === true || options.force === true;
    const sheetScrollTop = $('actionSheet')?.scrollTop || 0;
    if (!conditionEvaluationActive) evaluatePatientCondition('patient-home');
    const current = record() || {};
    const dynamicState = conditionState(current);
    const patientImage = $('patientImage');
    if (patientImage) patientImage.dataset.conditionMode = dynamicState.imageMode || scenario.imageMode || '';
    const signatures = renderDataSignatures(current);

    if (force || signatures.vitals !== renderSignatures.vitals) {
      buildVitals();
      renderSignatures.vitals = signatures.vitals;
    }
    if (force || signatures.assessments !== renderSignatures.assessments) {
      buildAssessments();
      renderSignatures.assessments = signatures.assessments;
    }
    if (force || signatures.history !== renderSignatures.history) {
      buildHistory();
      renderSignatures.history = signatures.history;
    }
    if (force || signatures.treatments !== renderSignatures.treatments) {
      buildTreatments();
      renderTransport();
      renderSignatures.treatments = signatures.treatments;
    }
    if (force || signatures.findings !== renderSignatures.findings) {
      renderFindings();
      renderSignatures.findings = signatures.findings;
    }
    renderUnifiedClinicalBar();
    updateCounts();
    if (force || signatures.progress !== renderSignatures.progress) {
      renderProgress();
      renderSignatures.progress = signatures.progress;
    }
    $('dispatch').textContent = current.dispatch || scenario.title;
    $('scene').textContent = current.scene || '';
    renderInfoUpdate();
    updateTimer();
    restoreSheetScroll(sheetScrollTop);
  }

  const embeddedSimPaths = new Set([
    ...(registry?.vitalTools || []).map(tool => tool.url),
    ...(registry?.assessmentTools || []).map(tool => tool.url)
  ].filter(Boolean));

  function desktopScenarioMode() {
    return window.matchMedia?.('(min-width: 980px)')?.matches === true;
  }

  function embeddedToolTitle(anchor, url) {
    const matching = [...(registry?.vitalTools || []), ...(registry?.assessmentTools || [])]
      .find(tool => tool.url === url.pathname);
    return matching?.label || anchor?.textContent?.trim() || 'Assessment simulator';
  }

  function closeEmbeddedSimulator(options = {}) {
    const workspace = $('embeddedSimWorkspace');
    const frame = $('embeddedSimFrame');
    if (!workspace || workspace.hidden) return;
    workspace.hidden = true;
    document.body.classList.remove('sim-workspace-open');
    if (frame) frame.src = 'about:blank';
    if (options.refresh !== false) {
      window.setTimeout(() => refreshFromRecord({ force:true }), 40);
    }
  }

  function openEmbeddedSimulator(href, title = 'Assessment simulator') {
    if (!desktopScenarioMode()) return false;
    const workspace = $('embeddedSimWorkspace');
    const frame = $('embeddedSimFrame');
    if (!workspace || !frame) return false;
    let url;
    try { url = new URL(href, location.href); } catch { return false; }
    if (url.origin !== location.origin || !embeddedSimPaths.has(url.pathname)) return false;
    url.searchParams.set('embedded', '1');
    url.searchParams.set('return', `/vitals/visual-patient.html?case=${encodeURIComponent(id)}&training=${encodeURIComponent(trainingMode())}&embeddedReturn=1`);
    const titleNode = $('embeddedSimTitle');
    if (titleNode) titleNode.textContent = title;
    workspace.hidden = false;
    document.body.classList.add('sim-workspace-open');
    frame.src = url.toString();
    return true;
  }

  document.addEventListener('click', event => {
    if (!desktopScenarioMode()) return;
    const anchor = event.target.closest?.('a[href]');
    if (!anchor) return;
    if (!anchor.closest('#actionSheet') && !anchor.closest('.patient-control-column')) return;
    let url;
    try { url = new URL(anchor.href, location.href); } catch { return; }
    if (!embeddedSimPaths.has(url.pathname)) return;
    if (openEmbeddedSimulator(url.toString(), embeddedToolTitle(anchor, url))) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  $('closeEmbeddedSim')?.addEventListener('click', () => closeEmbeddedSimulator());
  $('embeddedSimFrame')?.addEventListener('load', () => {
    const frame = $('embeddedSimFrame');
    if (!frame || frame.src === 'about:blank') return;
    try {
      const current = frame.contentWindow?.location;
      if (current?.pathname === '/vitals/visual-patient.html') closeEmbeddedSimulator();
    } catch (_) {
      // All embedded tools are same-origin; ignore transient navigation access errors.
    }
  });

  window.addEventListener('resize', () => {
    if (!desktopScenarioMode()) closeEmbeddedSimulator({ refresh:false });
  });

  const initialRecord = ensureRecord();
  const requestedTrainingMode = params.get('training');
  if (requestedTrainingMode === 'learning' || requestedTrainingMode === 'assessment') api?.setDocumentation?.({ trainingMode: requestedTrainingMode });
  document.body.dataset.trainingMode = trainingMode();
  if (id === 'horse_crush') {
    document.body.classList.add('horse-current-emt-call');
    const phaseControls = $('patientPhaseControls');
    if (phaseControls) phaseControls.hidden = true;
    const guide = $('sceneGuide');
    if (guide) guide.hidden = true;
    const skillLink = document.querySelector('.scene-guide-head-actions a[href*="nremt-skill-sheets"]');
    if (skillLink) skillLink.hidden = true;
    const assessmentSub = document.querySelector('#assessmentPanel > .sub');
    if (assessmentSub) assessmentSub.textContent = 'Run the assessment in the order you choose. Use the patient picture, focused exams, and available tools to build your clinical picture.';
    const vitalsSub = document.querySelector('#vitalsPanel > .sub');
    if (vitalsSub) vitalsSub.textContent = 'Choose the vital signs and bedside tools you want. On a computer, simulators open over the patient-picture area and return to the patient when closed.';
    const historySub = document.querySelector('#historyPanel > .sub');
    if (historySub) historySub.textContent = 'Interview the patient or engine crew naturally. Ask only what you think matters to this call.';
    const guidedHistory = document.querySelector('.history-guided-tools');
    if (guidedHistory) guidedHistory.hidden = true;
    const treatmentSub = document.querySelector('#treatmentPanel > .sub');
    if (treatmentSub) treatmentSub.textContent = 'Choose care, movement, packaging, transport, and reassessment decisions as you would on a real call. No fixed skill-sheet sequence is required.';
    const returnButtonLabel = document.querySelector('#closeSheet span');
    if (returnButtonLabel) returnButtonLabel.textContent = 'Current assessment';
    window.EMSCodeSimHorseWorkspace = Object.freeze({
      selectAssessment: selectHorseCurrentAssessment,
      showCurrent: closeSheet
    });
  }
  if ($('modeBadge')) $('modeBadge').textContent = assessmentMode() ? 'Assessment Mode' : 'Learning Mode';
  scenarioStartMs = new Date(initialRecord?.startedAt || Date.now()).getTime();
  $('caseTitle').textContent = scenario.title;
  setPatientImage($('patientImage'), scenario.image);
  setPatientImage($('focusImage'), scenario.image);
  renderSceneClues();
  $('generateHandoff').addEventListener('click', generateHandoff);
  $('saveHandoff').addEventListener('click', saveHandoff);
  $('recordTreatmentLink').href = toolUrl('/vitals/treatment-reassessment.html', 'Patient', 'general');
  $('fullPatientRecordLink').href = `/vitals/patient-record.html?mode=scenario&resume=1&case=${encodeURIComponent(id)}&return=${encodeURIComponent(`/vitals/visual-patient.html?case=${id}`)}`;
  $('guidedSampleLink').href = toolUrl('/vitals/sample-history.html', 'Patient', 'sample');
  $('guidedOpqrstLink').href = toolUrl('/vitals/pain-opqrst.html', 'Patient', 'pain');
  refreshFromRecord();
  window.EMSCodeSimHorseCrush?.init?.();

  document.querySelectorAll('[data-log-filter]').forEach(button => button.addEventListener('click', () => {
    findingFilter = button.dataset.logFilter || 'all';
    renderFindings();
  }));
  $('infoUpdatePrevious').addEventListener('click', () => {
    infoUpdateIndex = Math.max(0, infoUpdateIndex - 1);
    infoManuallyCollapsed = false;
    setInfoCollapsed(false);
    renderInfoUpdate();
  });
  $('infoUpdateNext').addEventListener('click', () => {
    infoUpdateIndex = Math.min(infoUpdates.length - 1, infoUpdateIndex + 1);
    infoManuallyCollapsed = false;
    setInfoCollapsed(false);
    renderInfoUpdate();
  });
  $('infoUpdateCollapse').addEventListener('click', event => {
    event.stopPropagation();
    clearTimeout(infoAutoCollapseTimer);
    const collapsed = $('infoUpdateWindow').dataset.collapsed !== 'true';
    infoManuallyCollapsed = collapsed;
    setInfoCollapsed(collapsed);
  });
  $('infoUpdateWindow')?.addEventListener('click', event => {
    if (event.target.closest('button') || $('infoUpdateWindow').dataset.collapsed !== 'true') return;
    infoManuallyCollapsed = false;
    setInfoCollapsed(false);
  });
  document.querySelectorAll('.bottom-nav button').forEach(button => button.addEventListener('click', () => { hideClinicalNextActions(); openSheet(button.dataset.panel); }));
  $('clinicalNextTreatment')?.addEventListener('click', () => {
    treatmentCategoryFocus = nextTreatmentCategoryForFinding(nextActionFinding?.key || '');
    hideClinicalNextActions();
    openSheet('treatmentPanel');
  });
  $('clinicalNextVitals')?.addEventListener('click', () => { hideClinicalNextActions(); openSheet('vitalsPanel'); });
  $('clinicalNextPatient')?.addEventListener('click', () => { hideClinicalNextActions(); closeSheet(); });
  $('clinicalNextUncertain')?.addEventListener('click', () => recordUncertainty(nextActionFinding || {}));
  $('clinicalNextClose')?.addEventListener('click', hideClinicalNextActions);
  $('closeSheet').addEventListener('click', closeSheet);
  $('sheetBackdrop').addEventListener('click', closeSheet);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('scenarioControlDialog').hidden) closeScenarioControls(); });
  $('clinicalBarToggle')?.addEventListener('click', () => {
    const drawer = $('clinicalTaskDrawer');
    const expanded = drawer?.hidden !== false;
    if (drawer) drawer.hidden = !expanded;
    $('clinicalBarToggle')?.setAttribute('aria-expanded', String(expanded));
    const chevron = $('clinicalBarToggle')?.querySelector('.clinical-bar-chevron');
    if (chevron) chevron.textContent = expanded ? '⌄' : '⌃';
  });
  $('treatmentSearch')?.addEventListener('input', event => filterTreatmentMenu(event.target.value));
  $('askHistoryCustom')?.addEventListener('click', askCustomInterviewQuestion);
  $('historyCustomInput')?.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') askCustomInterviewQuestion();
  });
  $('recordFocus').addEventListener('click', finishFocus);
  $('cancelFocus').addEventListener('click', () => { $('assessmentFocus').hidden = true; activeFocus = null; });
  $('completeScenarioFromPatient').addEventListener('click', checkScenarioCompletion);
  $('scenarioMenuButton')?.addEventListener('click', openScenarioControls);
  $('closeScenarioControls')?.addEventListener('click', closeScenarioControls);
  $('continueScenario')?.addEventListener('click', closeScenarioControls);
  $('scenarioControlBackdrop')?.addEventListener('click', closeScenarioControls);
  $('saveAndExitScenario')?.addEventListener('click', endScenario);
  $('resetAndRestartScenario')?.addEventListener('click', resetScenario);
  $('endScenarioQuick')?.addEventListener('click', () => {
    if (window.confirm('End this scenario and return to patient selection? Your current progress will remain saved.')) endScenario();
  });
  $('resetScenarioQuick')?.addEventListener('click', () => {
    if (window.confirm('Reset this scenario? All findings, vitals, treatments, partner tasks, and log entries for this patient will be erased.')) resetScenario();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!$('assessmentFocus').hidden) { $('assessmentFocus').hidden = true; activeFocus = null; }
    else closeSheet();
  });
  window.addEventListener('emscodesim:patient-record-updated', refreshFromRecord);
  window.addEventListener('emscodesim:scenario-finding-saved', refreshFromRecord);
  window.addEventListener('emscodesim:partner-task-updated', () => { refreshFromRecord(); updatePartnerTasks(); });
  window.addEventListener('emscodesim:partner-task-completed', () => { refreshFromRecord(); renderInfoUpdate(true); updatePartnerTasks(); });
  desktopWorkspaceQuery.addEventListener('change', configureDesktopWorkspace);
  configureDesktopWorkspace();
  window.addEventListener('pageshow', () => {
    session?.sync?.(id, { force: true });
    session?.resolvePartnerTasks?.(id);
    const current = record();
    scenarioStartMs = new Date(current?.startedAt || Date.now()).getTime();
    refreshFromRecord({ force:true });
    window.setTimeout(() => maybeOfferLatestFinding(false), 120);
  });
  timerInterval = window.setInterval(updateTimer, 1000);
  partnerInterval = window.setInterval(updatePartnerTasks, 1000);
  conditionInterval = window.setInterval(runConditionClock, 5000);
  session?.schedulePartnerTasks?.(id);
  runConditionClock();
  window.addEventListener('pagehide', () => {
    clearInterval(timerInterval);
    clearInterval(partnerInterval);
    clearInterval(conditionInterval);
    clearTimeout(infoAutoCollapseTimer);
  }, { once: true });
})();
