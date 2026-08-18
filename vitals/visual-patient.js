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
  const eventElement = event => {
    const target = event?.target;
    if (!target) return null;
    return target.nodeType === 1 ? target : target.parentElement;
  };
  const MEASURABLE_TOOL_KEYS = new Set(['blood_pressure','pulse','respirations','spo2','blood_glucose','temperature']);
  const PRIMARY_KEYS = new Set(['scene_size_up','airway','breathing','perfusion']);
  let activeFocus = null;
  let findingFilter = 'all';
  let findingView = 'time';
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
    horse_crush: { impressions:['Significant blunt hip/pelvic-region injury','Isolated soft-tissue hip injury','Occult proximal femur or acetabular injury'], priorities:['Emergent','Non-emergent'], destinations:['Closest appropriate emergency department','Trauma center'], bestPriority:'Emergent', bestDestination:'Closest appropriate emergency department' }
  };

  let partnerInterval = 0;
  let conditionEvaluationActive = false;
  let treatmentCategoryFocus = '';
  let nextActionFinding = null;
  let infoAutoCollapseTimer = 0;
  let infoManuallyCollapsed = false;
  let lastInfoItemId = '';
  const INFO_VOICE_STORAGE_KEY = 'emscodesim_patient_update_auto_voice';
  const infoVoiceSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  let infoVoiceAuto = infoVoiceSupported && localStorage.getItem(INFO_VOICE_STORAGE_KEY) !== 'off';
  let infoLastSpokenSignature = '';
  let infoVoiceUtterance = null;
  const infoQuickReplySelections = new Map();
  let assessmentComplaintFocus = '';
  let lastHistoryResponse = null;
  let horseWorkspaceContext = null;
  let horseCurrentAssessment = 'abc';
  let horseAssessmentCollapsed = false;
  let horseHistoryActiveGroup = '';
  let horseAssessmentActiveCategory = '';
  let horseAssessmentActiveItem = '';
  let horseTreatmentActiveGroup = '';
  let horseTreatmentActivePlan = '';
  let horseHandoffOpen = false;
  let horseHandoffSampleOpen = false;
  let horseGradeOpen = false;
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
    const requested = path;
    image.classList.remove('image-fallback');
    image.onerror = () => {
      image.onerror = null;
      image.src = id === 'pediatric' ? '/vitals/assets/scenario-patient-pediatric-v3.png' : '/vitals/assets/scenario-patient-adult-v3.png';
      image.classList.add('image-fallback');
    };
    image.src = requested;
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

  function toolUrl(url, returnLabel = 'Patient', context = '', key = '') {
    const registryKey = key || context;
    return registry?.buildUrl?.(url, {
      caseId: id,
      returnTo: `/vitals/visual-patient.html?case=${encodeURIComponent(id)}&training=${encodeURIComponent(trainingMode())}`,
      training: trainingMode(),
      returnLabel,
      context: context || registryKey,
      key: registryKey
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
    const guide = document.getElementById('sceneGuide');
    const rightRail = document.querySelector('.patient-control-column');
    const rightWorkflow = rightRail?.querySelector('.patient-entry-workflow');
    if (guide && rightWorkflow && guide.parentElement !== rightWorkflow) {
      rightWorkflow.appendChild(guide);
    }
    rightRail?.classList.add('abc-workspace-active');
    window.requestAnimationFrame(() => {
      const opened = window.EMSCodeSimSceneGuide?.startPrimary?.(review);
      if (opened === false || !window.EMSCodeSimSceneGuide?.startPrimary) {
        if (guide) { guide.hidden = false; guide.scrollIntoView({ behavior:'smooth', block:'nearest' }); }
        toast('Initial ABC assessment opened in the right assessment screen.');
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
      questionBox.hidden = true;
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
      questionBox.hidden = false;
      questionBox.classList.add('active');
      questionBox.dataset.abcKey = key;
      questionBox.innerHTML = `
        <div class="horse-question-head">
          <div><small>FOLLOW-UP QUESTION</small><strong>${escapeHtml(labels[key])}</strong></div>
        </div>
        <p>${escapeHtml(prompts[key])}</p>
        <div class="horse-question-choice-grid" role="group" aria-label="${escapeHtml(labels[key])} finding choices">
          ${choices[key].map(([value,label,normality], index) => {
            const selected = current && (current.value === value || current.finding === value);
            return `<button type="button" class="horse-question-choice${selected ? ' selected' : ''}" data-abc-choice="${index}" data-normality="${normality}" aria-pressed="${selected ? 'true' : 'false'}"><span>${selected ? '✓' : '○'}</span><strong>${escapeHtml(label)}</strong></button>`;
          }).join('')}
        </div>
        <p class="horse-question-choice-help">Select one finding to record it.</p>`;
      const buttons = [...questionBox.querySelectorAll('[data-abc-choice]')];
      buttons.forEach(button => button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const choice = choices[key][Number(button.dataset.abcChoice)];
        if (!choice) return;
        const [value, label, normality] = choice;
        const payload = {
          source:'horse-rapid-abc',
          label:labels[key],
          finding:value,
          normality,
          status:normality === 'normal' ? 'normal' : normality === 'not-normal' ? 'abnormal' : 'uncertain',
          rapidAssessment:true,
          reviewAtDebrief:true,
          suppressInfoUpdate:true
        };
        buttons.forEach(item => {
          const selected = item === button;
          item.classList.toggle('selected', selected);
          item.setAttribute('aria-pressed', selected ? 'true' : 'false');
          const marker = item.querySelector('span');
          if (marker) marker.textContent = selected ? '✓' : '○';
        });
        const help = questionBox.querySelector('.horse-question-choice-help');
        if (help) {
          help.textContent = `Saving: ${label}`;
          help.classList.add('recorded');
          help.setAttribute('role', 'status');
        }
        // Defer the record refresh so Chromium can finish the click gesture
        // before assessment rebuilds replace these nodes.
        window.setTimeout(() => {
          try {
            if (session?.saveFinding) session.saveFinding(key, value, payload);
            else api?.setFinding?.(key, value, payload);
            refreshFromRecord({ force:true });
            openFollowup(key);
          } catch (error) {
            console.error(error);
            toast('Finding was not saved. Try again.');
            openFollowup(key);
          }
        }, 0);
      }));
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
        window.EMSCodeSimHorseCrush?.noteLearnerAssessment?.(key);
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
    window.EMSCodeSimHorseCrush?.noteLearnerAssessment?.(horseCurrentAssessment);
    configureHorseCurrentAssessmentWorkspace();
    horseWorkspaceContext?.resetQuestionBox?.();
    if (desktopWorkspace()) closeSheet();
  }

  function horseReassessmentTargets() {
    if (id !== 'horse_crush') return [];
    const candidates = ['distal_csm','pain','left_leg','pelvis_hip','blood_pressure','pulse','respirations','spo2'];
    return candidates.filter(key => assessmentState(key).code === 'reassessment-due');
  }

  function openHorseReassessmentTarget(key) {
    if (key === 'distal_csm' || key === 'left_leg' || key === 'pelvis_hip') {
      selectHorseCurrentAssessment('focused_leg');
      const button = [...document.querySelectorAll('#horseCurrentAssessmentBody .horse-current-exam-button')].find(item => item.textContent.toLowerCase().includes(key === 'distal_csm' ? 'distal' : key === 'left_leg' ? 'lower' : 'pelvis'));
      button?.classList.add('reassessment-target');
      return;
    }
    if (key === 'pain') {
      openSheet('historyPanel');
      window.setTimeout(() => selectHorseHistoryGroup('pain', { updateInfo:false }), 30);
      return;
    }
    const tool = registryTool(key);
    if (tool) {
      const href = assessmentHref(tool, key);
      if (!openEmbeddedSimulator(href, `${labelFor(key)} reassessment`)) location.href = href;
    }
  }

  function renderHorseReassessmentCue() {
    if (id !== 'horse_crush') return;
    const panel = $('horseReassessmentCue');
    const actions = $('horseReassessmentCueActions');
    if (!panel || !actions) return;
    const due = horseReassessmentTargets();
    if (!due.length) {
      panel.hidden = true;
      panel.classList.remove('csm-priority');
      actions.innerHTML = '';
      return;
    }
    const csmDue = due.includes('distal_csm');
    const csmPreviouslyObtained = Boolean(record()?.findings?.distal_csm);
    panel.hidden = false;
    panel.classList.toggle('csm-priority', csmDue);
    $('horseReassessmentCueCount').textContent = String(due.length);
    $('horseReassessmentCueTitle').textContent = csmDue ? (csmPreviouslyObtained ? 'Repeat distal CSM now' : 'Distal CSM is required now') : 'Confirm the patient response';
    $('horseReassessmentCueText').textContent = csmDue
      ? (csmPreviouslyObtained
          ? 'Repeat distal circulation, sensation, and movement after stabilization or movement. Then reassess pain and any affected vital signs.'
          : 'A baseline distal CSM was not documented before this stabilization/movement. Obtain circulation, sensation, and movement now, then continue serial checks after subsequent moves.')
      : 'A treatment or condition change may have altered these findings. Reassess before moving on.';
    actions.innerHTML = '';
    const labels = { distal_csm:'Distal CSM', pain:'Pain', left_leg:'Injured leg', pelvis_hip:'Hip/pelvis', blood_pressure:'BP', pulse:'Pulse', respirations:'Respirations', spo2:'SpO₂' };
    due.forEach(key => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = labels[key] || labelFor(key);
      if (key === 'distal_csm') button.classList.add('csm-critical');
      button.addEventListener('click', () => openHorseReassessmentTarget(key));
      actions.appendChild(button);
    });
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
    launch.textContent = completed === 3 ? 'Review initial ABC in right assessment screen' : completed > 0 ? 'Continue initial ABC in right assessment screen' : 'Begin initial ABC in right assessment screen';
    launch.addEventListener('click', event => {
      event.preventDefault();
      launchPrimaryPhotoGuide(completed === 3);
    });
    list.appendChild(launch);
    box.appendChild(article);
  }



  function horseAssessmentCategoryDefinitions() {
    return [
      {
        id:'abc',
        icon:'ABC',
        label:'Primary / ABC',
        description:'Airway, breathing, circulation, immediate threats.',
        items:[
          { id:'airway', label:'Airway', prompt:'Assess the airway.' },
          { id:'breathing', label:'Breathing', prompt:'Assess breathing adequacy.' },
          { id:'perfusion', label:'Circulation', prompt:'Assess pulse, perfusion, and major bleeding.' }
        ]
      },
      {
        id:'head_neck',
        icon:'H/N',
        label:'Head / Neck',
        description:'Head, face, neck, cervical spine.',
        items:[
          { id:'head_exam', label:'Head / Face', prompt:'Inspect and palpate the head and face.' },
          { id:'neck_back', label:'Neck / C-spine', prompt:'Assess the neck and cervical spine.' }
        ]
      },
      {
        id:'chest',
        icon:'CHEST',
        label:'Chest',
        description:'Inspect, palpate, and assess breath sounds.',
        items:[
          { id:'chest_assessment', label:'Chest Assessment', prompt:'Inspect and palpate the chest; assess respiratory findings.' },
          { id:'lung_sounds', label:'Breath Sounds', prompt:'Auscultate bilateral breath sounds.' }
        ]
      },
      {
        id:'abdomen_pelvis',
        icon:'A/P',
        label:'Abdomen / Pelvis',
        description:'Abdominal and pelvic assessment.',
        items:[
          { id:'abdominal_assessment', label:'Abdomen', prompt:'Inspect and palpate the abdomen.' },
          { id:'pelvis_hip', label:'Pelvis / Hip', prompt:'Assess the pelvis and painful hip.' }
        ]
      },
      {
        id:'extremities',
        icon:'EXT',
        label:'Extremities',
        description:'Upper and lower extremity injury assessment.',
        items:[
          { id:'upper_extremities', label:'Upper Extremities', prompt:'Assess both upper extremities.' },
          { id:'left_leg', label:'Injured Leg', prompt:'Assess the painful/injured leg.' },
          { id:'distal_csm', label:'Distal CSM', prompt:'Assess distal circulation, sensation, and movement.' }
        ]
      },
      {
        id:'neuro_skin',
        icon:'N/S',
        label:'Neuro / Skin',
        description:'Neurologic and skin findings.',
        items:[
          { id:'neuro', label:'Neurologic', prompt:'Assess mental status and neurologic function.' },
          { id:'pupils', label:'Pupils / PERL', prompt:'Assess pupils, light response, and tracking.' },
          { id:'skin', label:'Skin', prompt:'Assess skin color, temperature, and condition.' }
        ]
      }
    ];
  }

  function renderHorseAssessmentCategoryWorkspace(categoryId) {
    const box = $('assessmentTools');
    const category = horseAssessmentCategoryDefinitions().find(item => item.id === categoryId);
    if (!box || !category) return;

    horseAssessmentActiveCategory = category.id;
    const current = record() || {};
    const completed = key => Boolean(
      api?.getFinding?.(key, current) ||
      (key === 'lung_sounds' && api?.getFinding?.('breath_sounds', current)) ||
      (key === 'neuro' && (api?.getFinding?.('mental_status', current) || api?.getFinding?.('pupils', current)))
    );

    box.className = 'assessment-list horse-assessment-category-workspace';
    box.innerHTML = `
      <div class="horse-assessment-workspace-head">
        <button type="button" class="horse-assessment-back" id="horseAssessmentBack">‹ Assessments</button>
        <div><small>ASSESSMENT</small><strong>${escapeHtml(category.label)}</strong><span>${escapeHtml(category.description)}</span></div>
      </div>
      <div class="horse-assessment-workspace-actions" data-assessment-main-questions="1">
        ${category.items.map(item => `
          <button type="button" class="horse-assessment-workspace-action${completed(item.id) ? ' used' : ''}" data-assessment-item="${escapeHtml(item.id)}">
            <span>${completed(item.id) ? '✓' : '○'}</span>
            <strong>${escapeHtml(item.label)}</strong>
          </button>`).join('')}
      </div>`;
    // Follow-up questions live under the main assessment actions in #assessmentFollowupHost.

    box.querySelector('#horseAssessmentBack')?.addEventListener('click', () => {
      horseAssessmentActiveCategory = '';
      buildHorseAssessmentChooserDesktop();
    });

    box.querySelectorAll('[data-assessment-item]').forEach(button => {
      button.addEventListener('click', () => {
        const item = category.items.find(row => row.id === button.dataset.assessmentItem);
        if (!item) return;
        horseAssessmentActiveItem = item.id;
        if (['airway','breathing','perfusion'].includes(item.id) && horseWorkspaceContext?.openFollowup) {
          window.EMSCodeSimHorseCrush?.noteLearnerAssessment?.(item.id);
          const abcLabel = horseWorkspaceContext.labels?.[item.id] || item.label;
          const observation = horseWorkspaceContext.observations?.[item.id] || '';
          sceneObservationUpdate = {
            id:'horse-abc-active',
            type:'NEW ASSESSMENT INFORMATION',
            title:`${abcLabel} assessment`,
            text:observation,
            kind:'assessment',
            sticky:true,
            recordedAt:new Date().toISOString()
          };
          infoManuallyCollapsed = false;
          lastInfoSignature = '';
          renderInfoUpdate(true);
          horseWorkspaceContext.openFollowup(item.id);
          return;
        }
        if (item.id === 'lung_sounds' || item.id === 'breath_sounds') {
          const href = '/vitals/breath-sounds-scenario.html';
          if (!openEmbeddedSimulator(href, 'Breath sounds')) {
            window.EMSCodeSimMiniSimOverlay?.openOverlay?.(href, 'Breath sounds');
          }
          return;
        }
        if (item.id === 'pupils') {
          const href = '/vitals/pupil.html';
          if (!openEmbeddedSimulator(href, 'Pupils / PERL')) {
            window.EMSCodeSimMiniSimOverlay?.openOverlay?.(href, 'Pupils / PERL');
          }
          return;
        }
        if (item.id === 'skin') {
          const href = '/vitals/skin-scenario.html';
          if (!openEmbeddedSimulator(href, 'Skin signs')) {
            window.EMSCodeSimMiniSimOverlay?.openOverlay?.(href, 'Skin signs');
          }
          return;
        }
        // Reuse existing assessment selection path if available.
        const existing = document.querySelector(`[data-assessment-key="${CSS.escape(item.id)}"], [data-assessment="${CSS.escape(item.id)}"]`);
        if (existing && existing !== button) {
          existing.click();
          return;
        }
        // Fallback to current assessment workflow.
        selectHorseCurrentAssessment?.(item.id);
      });
    });
  }

  function renderHorseAssessmentInlineFollowup(title, bodyHtml, onBack) {
    const box = $('assessmentTools');
    if (!box || !desktopWorkspace()) return false;
    box.className = 'assessment-list horse-assessment-followup-workspace';
    box.innerHTML = `
      <div class="horse-assessment-workspace-head">
        <button type="button" class="horse-assessment-back" id="horseAssessmentFollowupBack">‹ Back</button>
        <div><small>FOLLOW-UP</small><strong>${escapeHtml(title || 'Assessment question')}</strong></div>
      </div>
      <div class="horse-assessment-followup-body">${bodyHtml || ''}</div>`;
    box.querySelector('#horseAssessmentFollowupBack')?.addEventListener('click', () => {
      if (typeof onBack === 'function') onBack();
      else if (horseAssessmentActiveCategory) renderHorseAssessmentCategoryWorkspace(horseAssessmentActiveCategory);
      else buildHorseAssessmentChooserDesktop();
    });
    return true;
  }

  function buildHorseAssessmentChooserDesktop() {
    const box = $('assessmentTools');
    if (!box) return;
    if (horseAssessmentActiveCategory) {
      renderHorseAssessmentCategoryWorkspace(horseAssessmentActiveCategory);
      return;
    }
    const current = record() || {};
    const completed = key => Boolean(api?.getFinding?.(key, current));
    const categories = horseAssessmentCategoryDefinitions();

    box.className = 'assessment-list horse-assessment-drill-menu';
    box.innerHTML = `
      <div class="horse-drill-menu-head">
        <small>ASSESSMENT</small>
        <strong>Choose an assessment category</strong>
        <span>Select a category. Its available assessments will replace this menu.</span>
      </div>
      <div class="horse-assessment-drill-grid">
        ${categories.map(category => {
          const done = category.items.filter(item => completed(item.id)).length;
          return `<button type="button" class="horse-assessment-drill-choice" data-assessment-category="${escapeHtml(category.id)}">
            <span class="horse-assessment-drill-icon">${escapeHtml(category.icon)}</span>
            <span><strong>${escapeHtml(category.label)}</strong><small>${escapeHtml(category.description)}</small></span>
            <em>${done}/${category.items.length}</em>
          </button>`;
        }).join('')}
      </div>`;

    box.querySelectorAll('[data-assessment-category]').forEach(button => {
      button.addEventListener('click', () => renderHorseAssessmentCategoryWorkspace(button.dataset.assessmentCategory || 'abc'));
    });
  }

  function buildAssessments() {
    const box = $('assessmentTools');
    if (id === 'horse_crush' && desktopWorkspace()) {
      buildHorseAssessmentChooserDesktop();
      return;
    }
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

  function repeatPatientResponse(question, baseResponse = question?.response) {
    const prefix = interview.repeatPrefix || `${interview.responder || 'Patient'} repeats, “`;
    return `${prefix}${cleanPatientQuote(baseResponse)}”`;
  }

  function horseInterviewResponse(question) {
    if (id !== 'horse_crush' || !question) return question?.response || '';
    const state = horseClinicalState();
    if (!state) return question.response || '';
    const pain = state.painScore ?? 8;
    const improved = state.stage === 'supported' || state.stage === 'pain-improved' || state.stage === 'relieved';
    const responses = {
      chief_complaint: state.stage === 'relieved'
        ? '“My left hip still hurts, but it feels much better now. Please keep the leg supported when you move me.”'
        : state.stage === 'worse'
          ? '“My left hip — it is much worse after that movement. Please stop moving it.”'
          : `“My left hip. The pain is about ${pain} out of 10 right now. Please do not make me lower this leg.”`,
      symptoms: `“The main problem is my left hip. The pain is about ${pain} out of 10 right now and runs down my leg. I do not have chest pain, shortness of breath, stomach pain, neck pain, or back pain.”`,
      provocation: improved
        ? '“Movement still makes it worse, but supporting the leg and the pain treatment have helped. Keeping the knee bent and still feels best.”'
        : state.stage === 'worse'
          ? '“Moving or trying to straighten the leg makes it dramatically worse. Please put it back where it was and keep it still.”'
          : '“Trying to straighten or lower the leg makes it much worse. Keeping the knee bent and still is the only thing that helps.”',
      severity: state.stage === 'relieved'
        ? `“About a ${pain} now while I stay still. It was an eight before you supported it and treated the pain.”`
        : state.stage === 'pain-improved'
          ? `“About a ${pain} now. The pain treatment is helping, but moving the hip still hurts sharply.”`
          : state.stage === 'supported'
            ? `“About a ${pain} now while you keep the leg supported. It was about an eight before that.”`
            : state.stage === 'worse'
              ? '“A ten now after that movement.”'
              : '“An eight while I stay still. It is worse if the leg moves.”',
      time: state.stage === 'relieved'
        ? '“It was constant and severe until you supported the leg and treated the pain. It is much better at rest now, but movement still hurts.”'
        : improved
          ? '“It was constant at first. It has eased some since you started supporting and treating it, but movement still makes it worse.”'
          : state.stage === 'worse'
            ? '“It was severe before, but it became much worse after the leg was moved.”'
            : '“It has stayed constant. It settles a little when nobody moves the leg.”',
      position: state.stage === 'relieved' || state.stage === 'supported'
        ? '“I can move my foot. I still do not want the hip or knee forced straight, but the support you put under the leg helps a lot.”'
        : question.response
    };
    return responses[question.id] || question.response || '';
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
      const state = horseClinicalState();
      const sampleDetails = id === 'horse_crush' && state
        ? `S: Left-hip pain currently ${state.painScore}/10, radiating down the left leg and worse with movement; denies head strike/LOC, neck or back pain, chest pain, dyspnea, or abdominal pain. A: No medication allergy reported. M: Wellbutrin. P: No additional significant history reported and no blood thinner. L: Ate earlier today. E: Compressed between two horses and knocked to the ground from standing; not stepped on.`
        : profile.sample.detail || '';
      session?.saveFinding?.('sample', profile.sample.finding || 'SAMPLE history obtained', {
        label:'SAMPLE history',
        details:sampleDetails,
        source:'patient-interview',
        normality:profile.sample.normality || 'not-normal',
        status:profile.sample.normality === 'normal' ? 'normal' : 'abnormal'
      }, id);
      toast('Complete SAMPLE history recorded');
    }
    const opqrstComplete = interview.opqrstRequired?.length && interview.opqrstRequired.every(key => asked.has(key));
    if (opqrstComplete && !existing('pain') && interview.opqrstSummary) {
      const state = horseClinicalState();
      const opqrstDetails = id === 'horse_crush' && state
        ? `OPQRST obtained: left-hip pain began immediately during the horse-crush event, becomes sharply worse with hip movement, feels deep and sharp, radiates down the left leg, and is currently ${state.painScore}/10${state.stage !== 'baseline' ? ' after care (initially 8/10)' : ''}. Keeping the leg supported and still improves the pain.`
        : interview.opqrstSummary;
      session?.saveFinding?.('pain', 'OPQRST symptom assessment obtained', {
        label:'Pain / OPQRST',
        details:opqrstDetails,
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
    const currentResponse = horseInterviewResponse(question);
    const response = repeated ? repeatPatientResponse(question, currentResponse) : currentResponse;
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
    if (id === 'horse_crush' && current?.findings?.pain && ['severity','provocation','quality','region','time','chief_complaint','symptoms'].includes(question.id)) {
      const state = horseClinicalState();
      session?.saveFinding?.('pain', `Pain reassessed: ${state?.painScore ?? 8}/10`, {
        label:'Pain reassessment',
        details:`${response} Current modeled pain score ${state?.painScore ?? 8}/10.`,
        source:'patient-interview',
        normality:'not-normal', status:'abnormal', isReassessment:true
      }, id);
    }
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
      id:'patient_info',
      label:'Patient Information',
      icon:'ID',
      description:'De-identified registration information appropriate for this training patient.',
      instruction:'Practice registration questions using fictional, de-identified information. Do not enter real patient identifiers.',
      questionIds:['name','dob','age','address','emergency_contact']
    },
    {
      id:'current_problem',
      label:'Current Problem',
      icon:'CC',
      description:'Chief complaint, associated symptoms, other injuries, and neurologic symptoms.',
      instruction:'Clarify what is bothering the patient now and look for symptoms that could change your priorities.',
      questionIds:['chief_complaint','symptoms','other_injuries','numbness_tingling','nausea_dizziness']
    },
    {
      id:'sample',
      label:'SAMPLE',
      icon:'S',
      description:'Symptoms, allergies, medications, medical history, last intake, and events.',
      instruction:'Work through SAMPLE. You can ask every question in this section without reopening the menu.',
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
      id:'mechanism',
      label:'Mechanism / Trauma',
      icon:'M',
      description:'Exactly what happened, head impact, crush details, and movement after the injury.',
      instruction:'Clarify the trauma mechanism before deciding how to package and move the patient.',
      questionIds:['events','loss_consciousness','stepped_on','moved_since_injury','position']
    },
    {
      id:'risk_function',
      label:'Risk / Baseline Function',
      icon:'R',
      description:'Blood thinners, prior hip or leg problems, baseline mobility, and distal symptoms.',
      instruction:'Identify factors that could increase bleeding risk, change movement decisions, or affect interpretation of the leg exam.',
      questionIds:['anticoagulants','prior_hip_leg','baseline_mobility','numbness_tingling','medical_history']
    }
  ];

  function horseHistoryGroupQuestions(group) {
    if (!group) return [];
    const byId = new Map((interview.questions || []).map(question => [question.id, question]));
    return (group.questionIds || []).map(questionId => byId.get(questionId)).filter(Boolean);
  }

  function renderHorseHistoryQuestionBox(groupId = horseHistoryActiveGroup) {
    if (id !== 'horse_crush' || !desktopWorkspace()) return;
    const host = $('historyCategoryList');
    if (!host) return;
    const group = HORSE_HISTORY_GROUPS.find(item => item.id === groupId);
    if (!group) {
      buildHorseHistoryDesktop();
      return;
    }

    const current = record() || {};
    const asked = new Set(askedInterviewQuestions(current).map(question => question.id));
    const questions = horseHistoryGroupQuestions(group);
    const askedCount = questions.filter(question => asked.has(question.id)).length;

    host.className = 'history-category-list horse-history-drill-workspace';
    host.innerHTML = `
      <div class="horse-history-drill-head">
        <button type="button" class="horse-history-back" id="horseHistoryBack">‹ History</button>
        <div><small>ASK THE PATIENT</small><strong>${escapeHtml(group.label)}</strong><span>${askedCount}/${questions.length} asked</span></div>
      </div>
      <div class="horse-history-drill-questions" role="group" aria-label="${escapeHtml(group.label)} questions">
        ${questions.map(question => `
          <button type="button" class="horse-history-drill-question${asked.has(question.id) ? ' asked' : ''}" data-history-question="${escapeHtml(question.id)}">
            <span>${asked.has(question.id) ? '✓' : 'Ask'}</span>
            <strong>${escapeHtml(question.prompt || question.label)}</strong>
          </button>`).join('')}
      </div>`;

    host.querySelector('#horseHistoryBack')?.addEventListener('click', () => {
      horseHistoryActiveGroup = '';
      buildHorseHistoryDesktop();
      sceneObservationUpdate = {
        id:`horse-history-menu-${Date.now()}`,
        type:'HISTORY',
        title:'Patient history',
        text:'Choose the type of history you want to obtain.',
        kind:'history',
        recordedAt:new Date().toISOString()
      };
      lastInfoSignature = '';
      renderInfoUpdate(true);
    });

    host.querySelectorAll('[data-history-question]').forEach(button => {
      button.addEventListener('click', () => {
        const question = questions.find(item => item.id === button.dataset.historyQuestion);
        if (!question) return;
        askInterviewQuestion(question);
        window.setTimeout(() => renderHorseHistoryQuestionBox(group.id), 40);
      });
    });
  }

  function selectHorseHistoryGroup(groupId, options = {}) {
    if (id !== 'horse_crush' || !desktopWorkspace()) return;
    const group = HORSE_HISTORY_GROUPS.find(item => item.id === groupId);
    if (!group) return;
    horseHistoryActiveGroup = group.id;
    if (options.updateInfo !== false) {
      sceneObservationUpdate = {
        id:`horse-history-group-${group.id}-${Date.now()}`,
        type:'HISTORY',
        title:group.label,
        text:group.instruction,
        kind:'history',
        recordedAt:new Date().toISOString()
      };
      infoManuallyCollapsed = false;
      lastInfoSignature = '';
      renderInfoUpdate(true);
    }
    renderHorseHistoryQuestionBox(group.id);
  }

  function renderHorseCustomHistoryWorkspace() {
    const host = $('historyCategoryList');
    if (!host) return;
    host.className = 'history-category-list horse-history-drill-workspace';
    host.innerHTML = `
      <div class="horse-history-drill-head">
        <button type="button" class="horse-history-back" id="horseHistoryCustomBack">‹ History</button>
        <div><small>HISTORY</small><strong>Ask your own question</strong><span>Use a focused EMS interview question.</span></div>
      </div>
      <div class="horse-history-custom-workspace">
        <textarea id="horseHistoryCustomText" rows="3" maxlength="240" placeholder="Example: Do you take any blood thinners?"></textarea>
        <button id="horseHistoryCustomAsk" type="button">Ask patient</button>
      </div>`;
    host.querySelector('#horseHistoryCustomBack')?.addEventListener('click', () => {
      horseHistoryActiveGroup = '';
      buildHorseHistoryDesktop();
    });
    host.querySelector('#horseHistoryCustomAsk')?.addEventListener('click', () => {
      const source = host.querySelector('#horseHistoryCustomText');
      const shared = $('historyCustomInput');
      if (!source?.value.trim()) return;
      if (shared) shared.value = source.value.trim();
      $('askHistoryCustom')?.click();
      source.value = '';
    });
  }

  function buildHorseHistoryDesktop() {
    const host = $('historyCategoryList');
    if (!host) return;
    const current = record() || {};
    const asked = new Set(askedInterviewQuestions(current).map(question => question.id));
    $('historyResponderLabel').textContent = String(interview.responder || 'Patient').toUpperCase();
    $('historyCommunicationStatus').textContent = 'Choose a history type. The selected question set will replace this menu.';
    $('historyAskedCount').textContent = `${asked.size} asked`;

    if (horseHistoryActiveGroup && HORSE_HISTORY_GROUPS.some(group => group.id === horseHistoryActiveGroup)) {
      renderHorseHistoryQuestionBox(horseHistoryActiveGroup);
      return;
    }

    host.className = 'history-category-list horse-history-drill-menu';
    host.innerHTML = `
      <div class="horse-drill-menu-head">
        <small>HISTORY</small>
        <strong>What do you want to ask about?</strong>
        <span>Select a category. Its questions will replace this menu.</span>
      </div>
      <div class="horse-history-drill-grid">
        ${HORSE_HISTORY_GROUPS.map(group => {
          const questions = horseHistoryGroupQuestions(group);
          const complete = questions.filter(question => asked.has(question.id)).length;
          return `<button type="button" class="horse-history-drill-choice" data-history-group="${escapeHtml(group.id)}">
            <span class="history-category-icon">${escapeHtml(group.icon)}</span>
            <span><strong>${escapeHtml(group.label)}</strong><small>${escapeHtml(group.description)}</small></span>
            <em>${complete}/${questions.length}</em>
          </button>`;
        }).join('')}
        <button type="button" class="horse-history-drill-choice horse-history-custom-choice" data-history-custom="true">
          <span class="history-category-icon">?</span>
          <span><strong>Ask your own question</strong><small>Enter a natural patient-interview question.</small></span>
          <em>Open</em>
        </button>
      </div>`;

    host.querySelectorAll('[data-history-group]').forEach(button => {
      button.addEventListener('click', () => selectHorseHistoryGroup(button.dataset.historyGroup || ''));
    });
    host.querySelector('[data-history-custom]')?.addEventListener('click', renderHorseCustomHistoryWorkspace);
    renderKnownHistory();

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

  function isMedicationTreatment(plan) {
    return treatmentCategory(plan) === 'medications'
      || /aspirin|nitro|epinephrine|naloxone|glucose|bronchodilator|medication|pain_control/i.test(`${plan?.id || ''} ${plan?.label || ''}`);
  }

  function treatmentDocumentation(plan) {
    const fields = Array.isArray(plan.documentation) ? [...plan.documentation] : [];
    if (!isMedicationTreatment(plan)) return fields;

    const names = new Set(fields.map(field => field.name));
    const safetyFields = [
      { name:'indication', label:'Clinical indication', required:true, placeholder:'Why is this medication indicated?' },
      { name:'protocolCheck', label:'Protocol / medical-direction authorization', type:'select', required:true, options:['Confirmed for this patient and provider level','Not confirmed'] },
      { name:'contraindicationCheck', label:'Contraindication screen', type:'select', required:true, options:['No contraindication identified','Possible or confirmed contraindication'] }
    ];
    safetyFields.forEach(field => { if (!names.has(field.name)) fields.unshift(field); });
    return fields;
  }

  function treatmentInputValue(form, field) {
    const input = form.elements.namedItem(field.name);
    return String(input?.value || '').trim();
  }

  function validateTreatmentDocumentation(plan, form) {
    const values = {};
    for (const field of treatmentDocumentation(plan)) {
      const value = treatmentInputValue(form, field);
      const required = field.required || form.elements.namedItem(field.name)?.dataset?.wasRequired === '1';
      if (required && !value) {
        const control = form.elements.namedItem(field.name);
        const choiceGroup = control?.parentElement?.querySelector?.('.treatment-followup-choice-group');
        if (choiceGroup) choiceGroup.scrollIntoView({ block:'nearest' });
        else control?.scrollIntoView?.({ block:'nearest' });
        return { ok:false, message:`Enter ${field.label.toLowerCase()} before recording this treatment.` };
      }
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

  const HORSE_PAIN_TREATMENT_IDS = new Set([
    'manual_leg_support','position_comfort','blanket_support','splint','pain_control',
    'scoop_position_comfort','vacuum_mattress','board_transfer','traction_splint','stand_pivot','force_straight'
  ]);
  const HORSE_CSM_BASELINE_REQUIRED_IDS = new Set([
    'splint','scoop_position_comfort','vacuum_mattress','board_transfer'
  ]);
  const HORSE_EXCLUSIVE_MOVEMENT_IDS = new Set([
    'scoop_position_comfort','vacuum_mattress','board_transfer','stand_pivot'
  ]);
  const HORSE_EXCLUSIVE_ALS_IDS = new Set([
    'request_als_scene','arrange_als_intercept','transport_without_als_wait','continue_bls_care'
  ]);

  function horseTreatmentConflict(plan, current = record() || {}) {
    if (id !== 'horse_crush' || !plan?.id) return null;
    const prior = (current.treatments || []).map(item => item?.actionId).filter(Boolean);
    const firstPrior = set => prior.find(actionId => set.has(actionId) && actionId !== plan.id);
    if (HORSE_EXCLUSIVE_MOVEMENT_IDS.has(plan.id)) {
      const previous = firstPrior(HORSE_EXCLUSIVE_MOVEMENT_IDS);
      if (previous) return `A different transfer method was already committed (${previous.replace(/_/g, ' ')}). Reassess and explicitly revise the plan instead of performing two incompatible transfers.`;
    }
    if (HORSE_EXCLUSIVE_ALS_IDS.has(plan.id)) {
      const previous = firstPrior(HORSE_EXCLUSIVE_ALS_IDS);
      if (previous) return `An ALS/transport strategy was already selected (${previous.replace(/_/g, ' ')}). Choose one operational plan or document why the plan changed.`;
    }
    const supported = prior.some(actionId => ['position_comfort','blanket_support','splint'].includes(actionId));
    if (plan.id === 'force_straight' && supported) return 'The leg was already supported in its tolerated flexed position. Forcing it straight contradicts that plan and worsens pain.';
    if (plan.id === 'traction_splint' && prior.some(actionId => ['splint','blanket_support','scoop_position_comfort','vacuum_mattress'].includes(actionId))) return 'A non-traction stabilization and packaging plan is already in progress. Traction for isolated hip pain conflicts with the documented injury pattern.';
    return null;
  }

  function horseClinicalState() {
    return id === 'horse_crush' ? runtime?.horseClinicalState?.(record()) || null : null;
  }

  function horseTreatmentResponse(plan, classification, fallback) {
    if (id !== 'horse_crush') return fallback;
    const state = horseClinicalState();
    if (HORSE_PAIN_TREATMENT_IDS.has(plan.id)) {
      if (classification === 'appropriate-effective' && state?.patientText) return state.patientText;
      if (classification === 'contraindicated' && state?.patientText) return state.patientText;
    }
    if (classification === 'unnecessary' && /oxygen|airway|bvm|cpap/i.test(plan.id || '')) {
      return '“I’m breathing fine. It’s my hip that really hurts.” The intervention does not meaningfully change the current complaint.';
    }
    if (classification === 'unnecessary') {
      const medicationFeedback = {
        aspirin:'Aspirin is not indicated because the presentation does not suggest acute coronary syndrome.',
        nitroglycerin_assist:'Nitroglycerin is not indicated: there is no ischemic chest-pain presentation or applicable medication-assistance indication.',
        epinephrine_auto:'Epinephrine is not indicated because there are no findings of anaphylaxis.',
        naloxone:'Naloxone is not indicated because there is no opioid-associated respiratory depression.',
        oral_glucose_general:'Oral glucose is not indicated because hypoglycemia has not been demonstrated and mental status is intact.',
        bronchodilator_general:'A bronchodilator is not indicated because there is no bronchospasm, wheezing, or respiratory distress.'
      };
      if (medicationFeedback[plan.id]) return medicationFeedback[plan.id];
    }
    if (classification === 'conflicting') return fallback || 'The new action conflicts with a treatment or movement plan already performed. Reassess and document a deliberate change in plan.';
    if (classification === 'premature') return 'The patient has no meaningful change. Gather the missing assessment information and reconsider the treatment.';
    if (classification === 'unnecessary') return fallback || 'The treatment does not change the patient’s current condition.';
    return fallback || state?.patientText || 'Reassess the patient after the intervention.';
  }

  function showHorsePainReminderIfNeeded() {
    if (id !== 'horse_crush') return;
    const current = record() || {};
    const findings = current.findings || {};
    const painKnown = Boolean(findings.pain || findings.pelvis_hip || findings.left_leg || findings.trauma_assessment);
    const state = horseClinicalState();
    if (!painKnown || !state || state.stage !== 'baseline') return;
    sceneObservationUpdate = {
      id:'horse-pain-reminder',
      type:'PATIENT',
      title:'Patient request',
      text:state.patientText,
      kind:'patient_response',
      sticky:true,
      recordedAt:new Date().toISOString()
    };
    infoManuallyCollapsed = false;
    lastInfoSignature = '';
    renderInfoUpdate(true);
  }

  function treatmentResponseDelay(plan) {
    if (id === 'horse_crush') return /pain_control/i.test(plan.id || '') ? 1400 : 700;
    if (/transport|rapid_transport/i.test(plan.id || '')) return 1200;
    if (/oxygen|position|caregiver/i.test(plan.id || '')) return 2200;
    if (/bronchodilator|oral_glucose|bvm|airway|hemorrhage/i.test(plan.id || '')) return 3600;
    return 2800;
  }

  function applyDynamicTreatmentResponse(plan, classification, response) {
    const now = new Date().toISOString();
    if (id === 'horse_crush') {
      const state = horseClinicalState();
      const observedResponse = horseTreatmentResponse(plan, classification, response);
      const vitalTrend = state?.vitals
        ? `Current state will be reflected when vitals are reassessed: BP ${state.vitals.blood_pressure}, pulse ${state.vitals.pulse}/min, respirations ${state.vitals.respirations}/min, SpO₂ ${state.vitals.spo2}%.`
        : 'Reassess the patient after treatment.';
      api?.mergeCareLog?.([{
        type:'patient_response', category:'treatment', key:plan.targets?.[0] || 'treatment',
        label:'Patient response observed', value:observedResponse,
        details:`${vitalTrend} Pain is ${state?.painScore ?? 8}/10 at this point in the scenario.`,
        source:'dynamic-treatment-response', recordedAt:now
      }]);
      sceneObservationUpdate = {
        id:`horse-treatment-response-${plan.id}-${Date.now()}`,
        type:'PATIENT RESPONSE',
        title:plan.label,
        text:observedResponse,
        kind:classification === 'contraindicated' ? 'alert' : 'patient_dialogue',
        sticky:true,
        recordedAt:now
      };
      infoManuallyCollapsed = false;
      lastInfoSignature = '';
      refreshFromRecord();
      renderInfoUpdate(true);
      return;
    }
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
    const csmBaselineMissing = id === 'horse_crush' && HORSE_CSM_BASELINE_REQUIRED_IDS.has(plan.id) && !current?.findings?.distal_csm;
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

    if (isMedicationTreatment(plan)
        && (documentation.protocolCheck === 'Not confirmed'
          || documentation.contraindicationCheck === 'Possible or confirmed contraindication')) {
      classification = 'contraindicated';
      response = 'Medication administration should stop until protocol authorization is confirmed and the possible contraindication is resolved.';
    }
    const conflict = horseTreatmentConflict(plan, current);
    if (conflict) {
      classification = 'conflicting';
      response = conflict;
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
      csmBaselineMissing,
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
    }, ...(csmBaselineMissing ? [{
      type:'condition_change', category:'assessment', key:'distal_csm',
      label:'Baseline distal CSM was not documented',
      value:'You stabilized or moved the injured extremity without documenting baseline distal circulation, sensation, and movement. Obtain distal CSM now and continue serial checks after each movement.',
      details:'Without a baseline distal neurovascular exam, a later change cannot be confidently attributed to the injury or the intervention.',
      status:'abnormal', normality:'not-normal', source:'horse-csm-safety', recordedAt:new Date(Date.now() + 2).toISOString()
    }] : [])]);
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

  const HORSE_NON_INDICATED_MEDICATION_IDS = new Set([
    'aspirin','nitroglycerin_assist','epinephrine_auto','naloxone','oral_glucose_general','bronchodilator_general'
  ]);

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
      id:'resources', label:'ALS / operational plan', icon:'ALS',
      description:'Choose whether ALS comes to the scene, intercepts, or BLS transports without waiting.',
      instruction:'Commit to one operational strategy after considering stability, pain, response time, access, transport time, and whether waiting delays definitive care.',
      planIds:['request_als_scene','arrange_als_intercept','transport_without_als_wait','continue_bls_care']
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
      id:'medications', label:'Pain / medications', icon:'Rx',
      description:'Pain-management coordination first; other EMT medications remain available for decision practice.',
      instruction:'Choose a medication only after confirming the indication, contraindications, patient allergies, local protocol, provider authorization, dose, and route.',
      planIds:['pain_control','aspirin','nitroglycerin_assist','epinephrine_auto','naloxone','oral_glucose_general','bronchodilator_general']
    },
    {
      id:'transport', label:'Transport', icon:'T',
      description:'Emergent or non-emergent transport.',
      instruction:'Choose Emergent or Non-emergent from the findings you gathered.',
      special:'transport'
    },
    {
      id:'handoff', label:'Hospital handoff', icon:'H',
      description:'Use the findings you actually gathered to give a concise bedside report.',
      instruction:'You have arrived at the receiving hospital. Open the handoff workspace over the patient picture. Your documented findings will appear there like field notes.',
      special:'handoff'
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
      if (unique.has(plan.id)) return;
      const normalized = { ...plan, category:plan.category || treatmentCategory(plan) };
      if (id === 'horse_crush' && HORSE_NON_INDICATED_MEDICATION_IDS.has(plan.id)) {
        normalized.outcomeClass = 'unnecessary';
        normalized.response = 'This medication has no indication in the current isolated hip-injury presentation and produces no clinical improvement.';
      }
      unique.set(plan.id, normalized);
    });
    return [...unique.values()];
  }

  function horseTreatmentGroupPlans(group) {
    if (!group) return [];
    if (group.special === 'transport') return [{ id:'__horse_transport__', label:'Initiate transport', summary:'Choose Emergent or Non-emergent.' }];
    if (group.special === 'handoff') return [{ id:'__horse_handoff__', label:'Begin hospital handoff', summary:'Open the field-note handoff workspace in the patient-picture area and give report from what you documented.' }];
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
    if (plan?.id === '__horse_handoff__') return record()?.documentation?.handoffSavedAt ? 1 : 0;
    return plan ? treatmentCount(plan) : 0;
  }

  function horseTransportFormMarkup() {
    const current = record() || {};
    const selected = transportUrgencyLabel(current.documentation?.transportPriority || current.impressions?.action || '');
    return `
      <form class="horse-treatment-action-form horse-transport-selection-form">
        <p class="horse-transport-prompt">Choose transport urgency.</p>
        <div class="horse-transport-urgency-choices" role="group" aria-label="Transport urgency">
          <button type="submit" class="horse-transport-urgency${selected === 'Emergent' ? ' selected' : ''}" name="priority" value="Emergent">Emergent</button>
          <button type="submit" class="horse-transport-urgency${selected === 'Non-emergent' ? ' selected' : ''}" name="priority" value="Non-emergent">Non-emergent</button>
        </div>
        <p class="transport-entry-error" hidden></p>
      </form>`;
  }

  function renderHorseTreatmentPlanDetail(plan, detail) {
    if (!detail) return;
    if (!plan) {
      detail.innerHTML = '<small>Select an action above to review it before performing treatment.</small>';
      return;
    }
    if (plan.id === '__horse_transport__') {
      detail.innerHTML = `<p class="horse-treatment-summary">${escapeHtml(plan.summary)}</p>${horseTransportFormMarkup()}`;
      detail.querySelector('form')?.addEventListener('submit', event => {
        event.preventDefault();
        saveTransportDecision(event.currentTarget, event.submitter);
      });
      return;
    }
    if (plan.id === '__horse_handoff__') {
      const transported = Boolean(record()?.documentation?.transportDecisionAt);
      detail.innerHTML = `
        <p class="horse-treatment-summary">${escapeHtml(plan.summary)}</p>
        <div class="horse-handoff-launch-card">
          <small>${transported ? 'Transport decision is recorded. Use your documented assessment, history, vitals, treatments, and reassessments for report.' : 'Transport has not been recorded yet. You can review the handoff workspace, but transport information will remain blank.'}</small>
          <div>
            <button type="button" class="horse-treatment-perform horse-open-handoff">Begin hospital handoff</button>
            <button type="button" class="secondary horse-open-sample-handoff">Sample handoff</button>
          </div>
        </div>`;
      detail.querySelector('.horse-open-handoff')?.addEventListener('click', () => openHorseHospitalHandoff(false));
      detail.querySelector('.horse-open-sample-handoff')?.addEventListener('click', () => openHorseHospitalHandoff(true));
      return;
    }
    const fields = treatmentDocumentation(plan);
    detail.innerHTML = `
      <p class="horse-treatment-summary">${escapeHtml(plan.summary || 'Perform the selected treatment and observe the patient response.')}</p>
      <form class="horse-treatment-action-form" novalidate>
        ${fields.length ? `<div class="horse-treatment-detail-grid">${fields.map(treatmentFieldMarkup).join('')}</div>` : ''}
        <div class="horse-treatment-perform-row"><button class="horse-treatment-perform" type="submit">${horseTreatmentRecordedCount(plan) ? 'Perform again' : 'Perform treatment'}</button><p class="treatment-entry-error" hidden></p></div>
      </form>`;
    const form = detail.querySelector('form');
    form?.addEventListener('submit', event => {
      event.preventDefault();
      const validation = validateTreatmentDocumentation(plan, form);
      const error = form.querySelector('.treatment-entry-error');
      if (!validation.ok) {
        if (error) {
          error.textContent = validation.message;
          error.hidden = false;
          error.scrollIntoView({ block:'nearest', behavior:'smooth' });
        }
        return;
      }
      if (error) error.hidden = true;
      recordTreatment(plan, validation.values);
    });
  }

  function renderHorseTreatmentSelectionBox(groupId = horseTreatmentActiveGroup) {
    if (id !== 'horse_crush' || !desktopWorkspace()) return;
    const questionBox = $('horseClinicalQuestionBox');
    if (!questionBox) return;
    const group = HORSE_TREATMENT_GROUPS.find(item => item.id === groupId);
    if (!group) {
      horseTreatmentActivePlan = '';
      questionBox.classList.remove('active','history-active','treatment-active');
      questionBox.innerHTML = `
        <div class="horse-question-placeholder">
          <small>TREATMENT</small>
          <strong>Select a treatment group to show quick actions.</strong>
        </div>`;
      return;
    }

    const plans = horseTreatmentGroupPlans(group);
    const completed = plans.filter(plan => horseTreatmentRecordedCount(plan) > 0).length;
    if (!plans.some(plan => plan.id === horseTreatmentActivePlan)) horseTreatmentActivePlan = '';
    questionBox.classList.remove('history-active');
    questionBox.classList.add('active','treatment-active');
    questionBox.innerHTML = `
      <div class="horse-question-head horse-treatment-question-head">
        <div><small>QUICK TREATMENT SELECTION</small><strong>${escapeHtml(group.label)}</strong></div>
        <span>${completed}/${plans.length} used</span>
      </div>
      <div class="horse-treatment-quick-grid" role="group" aria-label="${escapeHtml(group.label)} treatment options">
        ${plans.map(plan => {
          const used = horseTreatmentRecordedCount(plan) > 0;
          const selected = horseTreatmentActivePlan === plan.id;
          return `<button type="button" class="horse-treatment-quick${used ? ' used' : ''}${selected ? ' selected' : ''}" data-horse-treatment-plan="${escapeHtml(plan.id)}"><span>${used ? '✓' : '○'}</span><strong>${escapeHtml(plan.label)}</strong></button>`;
        }).join('')}
      </div>
      <div id="horseTreatmentDetail" class="horse-treatment-detail"><small>Select an action above to review it before performing treatment.</small></div>`;

    const detail = questionBox.querySelector('#horseTreatmentDetail');
    const selectPlan = planId => {
      const plan = plans.find(item => item.id === planId);
      if (!plan) return;
      horseTreatmentActivePlan = plan.id;
      questionBox.querySelectorAll('[data-horse-treatment-plan]').forEach(button => {
        button.classList.toggle('selected', button.dataset.horseTreatmentPlan === plan.id);
      });
      renderHorseTreatmentPlanDetail(plan, detail);
    };
    questionBox.querySelectorAll('[data-horse-treatment-plan]').forEach(button => {
      button.addEventListener('click', () => selectPlan(button.dataset.horseTreatmentPlan || ''));
    });
    if (horseTreatmentActivePlan) selectPlan(horseTreatmentActivePlan);
  }


  function renderHorseTreatmentCategoryWorkspace(groupId) {
    const box = $('treatmentTools');
    const group = HORSE_TREATMENT_GROUPS.find(item => item.id === groupId);
    if (!box || !group) return;

    const plans = horseTreatmentGroupPlans(group);
    horseTreatmentActiveGroup = group.id;
    if (!plans.some(plan => plan.id === horseTreatmentActivePlan)) horseTreatmentActivePlan = '';

    box.className = 'treatment-list horse-treatment-category-workspace';
    box.innerHTML = `
      <div class="horse-treatment-workspace-head">
        <button type="button" class="horse-treatment-back" id="horseTreatmentBackToGroups" aria-label="Back to treatment categories">‹ Categories</button>
        <div><small>TREATMENT</small><strong>${escapeHtml(group.label)}</strong><span>${escapeHtml(group.description || '')}</span></div>
      </div>
      <div id="horseTreatmentWorkspaceDetail" class="horse-treatment-workspace-detail" aria-live="polite">
        <small>Select a treatment below to review and perform it.</small>
      </div>
      <div class="horse-treatment-workspace-actions" role="group" aria-label="${escapeHtml(group.label)} treatment options">
        ${plans.map(plan => {
          const used = horseTreatmentRecordedCount(plan) > 0;
          return `<button type="button" class="horse-treatment-workspace-action${used ? ' used' : ''}" data-horse-workspace-plan="${escapeHtml(plan.id)}">
            <span aria-hidden="true">${used ? '✓' : '○'}</span>
            <strong>${escapeHtml(plan.label)}</strong>
          </button>`;
        }).join('')}
      </div>`;

    box.querySelector('#horseTreatmentBackToGroups')?.addEventListener('click', () => {
      horseTreatmentActiveGroup = '';
      horseTreatmentActivePlan = '';
      sceneObservationUpdate = {
        id:`horse-treatment-menu-${Date.now()}`,
        type:'TREATMENT',
        title:'Treatment options',
        text:'Choose a treatment category based on the patient assessment and the care you want to provide.',
        kind:'treatment',
        sticky:true,
        recordedAt:new Date().toISOString()
      };
      lastInfoSignature = '';
      renderInfoUpdate(true);
      buildHorseTreatmentsDesktop();
    });

    const detail = box.querySelector('#horseTreatmentWorkspaceDetail');
    const choosePlan = planId => {
      const plan = plans.find(item => item.id === planId);
      if (!plan) return;
      horseTreatmentActivePlan = plan.id;
      box.querySelectorAll('[data-horse-workspace-plan]').forEach(button => {
        button.classList.toggle('selected', button.dataset.horseWorkspacePlan === plan.id);
      });
      renderHorseTreatmentPlanDetail(plan, detail);
    };

    box.querySelectorAll('[data-horse-workspace-plan]').forEach(button => {
      button.addEventListener('click', () => choosePlan(button.dataset.horseWorkspacePlan || ''));
    });
    if (horseTreatmentActivePlan) choosePlan(horseTreatmentActivePlan);
  }

  function activateHorseTreatmentGroupFromEvent(event) {
    if (id !== 'horse_crush') return false;
    const button = eventElement(event)?.closest?.('[data-horse-treatment-group]');
    if (!button || button.hidden || button.disabled) return false;
    if (!button.closest('#treatmentTools.horse-treatment-group-menu')) return false;
    const groupId = button.dataset.horseTreatmentGroup || '';
    if (!groupId) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    selectHorseTreatmentGroup(groupId);
    return true;
  }

  function selectHorseTreatmentGroup(groupId, options = {}) {
    if (id !== 'horse_crush') return;
    const group = HORSE_TREATMENT_GROUPS.find(item => item.id === groupId);
    if (!group) return;
    if (horseTreatmentActiveGroup !== group.id) horseTreatmentActivePlan = '';
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

    if (desktopWorkspace()) renderHorseTreatmentCategoryWorkspace(group.id);
    else {
      horseTreatmentActiveGroup = group.id;
      buildHorseTreatmentsMobile();
    }
  }

  function horseCareSequenceMarkup() {
    const current = record() || {};
    const events = [
      ...(current.treatments || []).map(item => ({
        time:item.recordedAt || item.createdAt || current.updatedAt,
        label:item.name || item.treatment || 'Treatment',
        tone:item.classification || 'recorded'
      })),
      ...(current.reassessments || []).map(item => ({
        time:item.recordedAt || item.createdAt || current.updatedAt,
        label:item.label || item.name || 'Reassessment',
        tone:'reassessment'
      }))
    ].filter(item => item.label).sort((a,b) => new Date(a.time || 0) - new Date(b.time || 0)).slice(-5);
    if (!events.length) return '<div class="horse-care-sequence empty"><small>CARE SEQUENCE</small><span>No treatment or reassessment recorded yet.</span></div>';
    return `<div class="horse-care-sequence"><small>CARE SEQUENCE</small>${events.map(item => `<span><time>${escapeHtml(formatClock(item.time) || '--:--')}</time><strong>${escapeHtml(item.label)}</strong></span>`).join('')}</div>`;
  }

  function buildHorseTreatmentsDesktop() {
    const box = $('treatmentTools');
    if (!box) return;

    if (horseTreatmentActiveGroup) {
      renderHorseTreatmentCategoryWorkspace(horseTreatmentActiveGroup);
      return;
    }

    box.innerHTML = '';
    box.className = 'treatment-list horse-treatment-groups horse-treatment-group-menu';

    const menuHead = document.createElement('div');
    menuHead.className = 'horse-treatment-menu-head';
    menuHead.innerHTML = `<small>TREATMENT</small><strong>Choose a category</strong><span>Start with support, pain management, movement, and reassessment. Open More treatments only if the patient needs another intervention.</span>${horseCareSequenceMarkup()}`;
    box.appendChild(menuHead);

    HORSE_TREATMENT_GROUPS
      .filter(group => !['transport','handoff'].includes(group.id))
      .forEach(group => {
        const plans = horseTreatmentGroupPlans(group);
        if (!plans.length) return;
        const completed = plans.filter(plan => horseTreatmentRecordedCount(plan) > 0).length;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'horse-treatment-group-choice';
        button.dataset.horseTreatmentGroup = group.id;
        button.innerHTML = `
          <span class="horse-treatment-group-icon" aria-hidden="true">${escapeHtml(group.icon)}</span>
          <span><strong>${escapeHtml(group.label)}</strong><small>${escapeHtml(group.description)}</small></span>
          <em>${completed ? `${completed}/${plans.length}` : `${plans.length}`}</em>`;
        box.appendChild(button);
      });

    // Delegated backup: survives DOM reordering and Chromium hit-target quirks.
    if (!box.dataset.horseTreatmentGroupDelegate) {
      box.dataset.horseTreatmentGroupDelegate = '1';
      const activateGroup = event => {
        const button = eventElement(event)?.closest?.('[data-horse-treatment-group]');
        if (!button || !box.contains(button) || button.hidden || button.disabled) return;
        const groupId = button.dataset.horseTreatmentGroup || '';
        if (!groupId) return;
        event.preventDefault();
        event.stopPropagation();
        selectHorseTreatmentGroup(groupId);
      };
      box.addEventListener('pointerup', activateGroup);
      box.addEventListener('click', activateGroup);
    }
  }

  function buildHorseTreatmentsMobile() {
    const box = $('treatmentTools');
    if (!box) return;
    const availableGroups = HORSE_TREATMENT_GROUPS
      .map(group => ({ group, plans:horseTreatmentGroupPlans(group) }))
      .filter(item => item.plans.length);
    if (!availableGroups.some(item => item.group.id === horseTreatmentActiveGroup)) horseTreatmentActiveGroup = '';
    if (!horseTreatmentActiveGroup) horseTreatmentActivePlan = '';

    box.className = 'treatment-list horse-treatment-mobile-menu';
    box.innerHTML = `
      <div class="horse-treatment-mobile-intro"><strong>Choose treatment</strong><span>Use the dropdowns to keep the phone screen compact. Treatment results still appear in Patient Update.</span></div>
      <label class="horse-treatment-mobile-select"><span>Treatment group</span>
        <select id="horseMobileTreatmentGroup"><option value="">Choose a group</option>${availableGroups.map(({group,plans}) => `<option value="${escapeHtml(group.id)}" ${horseTreatmentActiveGroup === group.id ? 'selected' : ''}>${escapeHtml(group.label)} (${plans.length})</option>`).join('')}</select>
      </label>
      <label class="horse-treatment-mobile-select"><span>Treatment / action</span>
        <select id="horseMobileTreatmentAction" ${horseTreatmentActiveGroup ? '' : 'disabled'}><option value="">Choose an action</option></select>
      </label>
      <div id="horseMobileTreatmentDetail" class="horse-treatment-mobile-detail"><small>Choose a treatment group, then select an action.</small></div>`;

    const groupSelect = box.querySelector('#horseMobileTreatmentGroup');
    const actionSelect = box.querySelector('#horseMobileTreatmentAction');
    const detail = box.querySelector('#horseMobileTreatmentDetail');

    const populateActions = () => {
      const group = HORSE_TREATMENT_GROUPS.find(item => item.id === groupSelect?.value);
      horseTreatmentActiveGroup = group?.id || '';
      const plans = horseTreatmentGroupPlans(group);
      if (!plans.some(plan => plan.id === horseTreatmentActivePlan)) horseTreatmentActivePlan = '';
      if (!actionSelect) return;
      actionSelect.disabled = !group;
      actionSelect.innerHTML = `<option value="">Choose an action</option>${plans.map(plan => `<option value="${escapeHtml(plan.id)}" ${horseTreatmentActivePlan === plan.id ? 'selected' : ''}>${horseTreatmentRecordedCount(plan) ? '✓ ' : ''}${escapeHtml(plan.label)}</option>`).join('')}`;
      if (!group) {
        if (detail) detail.innerHTML = '<small>Choose a treatment group, then select an action.</small>';
        return;
      }
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
      if (horseTreatmentActivePlan) renderHorseTreatmentPlanDetail(plans.find(plan => plan.id === horseTreatmentActivePlan), detail);
      else if (detail) detail.innerHTML = '<small>Choose an action to review it before performing treatment.</small>';
    };

    groupSelect?.addEventListener('change', () => {
      horseTreatmentActivePlan = '';
      populateActions();
    });
    actionSelect?.addEventListener('change', () => {
      const group = HORSE_TREATMENT_GROUPS.find(item => item.id === horseTreatmentActiveGroup);
      const plans = horseTreatmentGroupPlans(group);
      horseTreatmentActivePlan = actionSelect.value || '';
      renderHorseTreatmentPlanDetail(plans.find(plan => plan.id === horseTreatmentActivePlan), detail);
    });
    if (horseTreatmentActiveGroup) populateActions();
  }

  function buildTreatments() {
    const box = $('treatmentTools');
    if (id === 'horse_crush') {
      if (desktopWorkspace()) buildHorseTreatmentsDesktop();
      else buildHorseTreatmentsMobile();
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

  function cleanInfoSpeechText(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .replace(/\bSpO₂\b/gi, 'oxygen saturation')
      .replace(/\bCSM\b/g, 'circulation, sensation, and movement')
      .replace(/\bA&O\s*[x×]\s*4\b/gi, 'alert and oriented times four')
      .trim();
  }

  function infoVoiceRole(item = {}) {
    const type = String(item.type || '').toUpperCase();
    const kind = String(item.kind || '').toLowerCase();
    const text = String(item.text || '').trim();
    if (kind === 'dispatch' || kind === 'partner' || kind === 'visible' || kind === 'observation' || kind === 'arrival') return 'silent';
    if (/DISPATCH|BLS ENGINE|HANDOFF|AMBULANCE POSITION|SCENE ARRIVAL|ON-SCENE CREW/.test(type)) return 'silent';
    if (kind === 'patient_dialogue' || kind === 'patient_response' || /PATIENT RESPONSE|^PATIENT$|HISTORY ANSWER/.test(type)) return 'patient';
    if (/^[“"]/u.test(text)) return 'patient';
    return 'silent';
  }

  function infoPresentation(item = {}) {
    const kind = String(item.kind || '').toLowerCase();
    const type = String(item.type || '').toUpperCase();
    if (infoVoiceRole(item) === 'patient') return { key:'patient', label:'PATIENT', icon:'👤', spoken:true };
    if (kind === 'vital' || /VITAL|BLOOD PRESSURE|PULSE|RESPIRATION|SPO₂|GLUCOSE|TEMPERATURE/.test(type)) return { key:'vitals', label:'VITALS', icon:'♥', spoken:false };
    if (kind === 'observation' || kind === 'visible' || /OBSERVATION|VISIBLE/.test(type)) return { key:'observation', label:'OBSERVATION', icon:'👁', spoken:false };
    if (kind === 'assessment' || kind === 'reassessment') return { key:'assessment', label:kind === 'reassessment' ? 'REASSESSMENT' : 'ASSESSMENT', icon:'🩺', spoken:false };
    if (kind === 'history') return { key:'history', label:'HISTORY', icon:'💬', spoken:false };
    if (kind === 'treatment') return { key:'treatment', label:'TREATMENT', icon:'✚', spoken:false };
    if (kind === 'transport') return { key:'transport', label:'TRANSPORT', icon:'🚑', spoken:false };
    if (kind === 'partner') {
      const label = /HANDOFF/.test(type) ? (item.type || 'BLS ENGINE HANDOFF') : 'ON-SCENE CREW';
      return { key:'partner', label, icon:'👥', spoken:false };
    }
    if (kind === 'alert') return { key:'alert', label:'ALERT', icon:'⚠', spoken:false };
    if (kind === 'dispatch') return { key:'dispatch', label:'DISPATCH', icon:'📟', spoken:false };
    if (kind === 'arrival' || /AMBULANCE POSITION|SCENE ARRIVAL/.test(type)) return { key:'information', label:'AMBULANCE POSITION', icon:'🚑', spoken:false };
    return { key:'information', label:'INFORMATION', icon:'ℹ', spoken:false };
  }

  function patientDialogueParts(item = {}) {
    const raw = String(item.text || '').replace(/\s+/g, ' ').trim();
    const quoted = raw.match(/[“"]([^”"]+)[”"]/u);
    if (quoted?.[1]) {
      const spoken = quoted[1].trim();
      const observation = raw.replace(quoted[0], '').trim();
      return { spoken, observation };
    }
    return { spoken: raw, observation:'' };
  }

  function quickRepliesForInfo(item = {}) {
    if (infoVoiceRole(item) !== 'patient') return [];
    const text = patientDialogueParts(item).spoken.toLowerCase();
    if (/stop|really hurts|worse|hurting more/.test(text)) return [
      'I’m stopping. I’ll support your leg.',
      'Tell me exactly what changed.',
      'I’m going to recheck your circulation and sensation.'
    ];
    if (/thank you|feels better|helping|more comfortable/.test(text)) return [
      'Good. I’m going to reassess you.',
      'Tell me if the pain changes.',
      'I’m going to recheck your injured leg.'
    ];
    if (/pain|hurt|hip|leg/.test(text)) return [
      'Yes. I’m going to address your pain.',
      'I need to check your leg before we move you.',
      'Try not to move the injured leg.'
    ];
    if (/history answer/i.test(String(item.type || ''))) return [
      'Thank you.',
      'Okay, I understand.',
      'I’m going to keep asking a few questions.'
    ];
    return ['Thank you.', 'I’m here with you.', 'Tell me if anything changes.'];
  }

  function recordQuickProviderReply(item, reply) {
    if (!item || !reply) return;
    const key = item.id || `${item.type || 'patient'}-${item.recordedAt || Date.now()}`;
    infoQuickReplySelections.set(key, reply);
    api?.mergeCareLog?.([{
      type:'communication', category:'history', key:'provider_communication',
      label:'Provider response', value:reply,
      details:`Response to ${item.title || 'patient statement'}.`,
      source:'patient-quick-response', suppressInfoUpdate:true, suppressCareLog:true, recordedAt:new Date().toISOString()
    }]);
    renderInfoQuickReplies(item);
  }

  function renderInfoQuickReplies(item = {}) {
    const host = $('infoUpdateQuickReplies');
    const buttons = $('infoUpdateQuickReplyButtons');
    const status = $('infoUpdateQuickReplyStatus');
    if (!host || !buttons || !status) return;
    const replies = quickRepliesForInfo(item);
    host.hidden = replies.length === 0;
    buttons.innerHTML = '';
    status.hidden = true;
    status.textContent = '';
    if (!replies.length) return;
    const key = item.id || `${item.type || 'patient'}-${item.recordedAt || ''}`;
    const selected = infoQuickReplySelections.get(key) || '';
    replies.forEach(reply => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `info-update-quick-reply${selected === reply ? ' selected' : ''}`;
      button.textContent = reply;
      button.addEventListener('click', () => recordQuickProviderReply(item, reply));
      buttons.appendChild(button);
    });
    if (selected) {
      status.hidden = false;
      status.textContent = `You: ${selected}`;
    }
  }

  function preferredInfoVoice(role = 'narrator') {
    if (!infoVoiceSupported) return null;
    const voices = window.speechSynthesis.getVoices?.() || [];
    const english = voices.filter(voice => /^en(-|$)/i.test(voice.lang));
    if (!english.length) return voices[0] || null;
    const patientPattern = /Samantha|Ava|Jenny|Zira|Aria|Joanna|Karen|Moira|Tessa|Female/i;
    const narratorPattern = /Alex|Daniel|David|Tom|Guy|Male|Google US English/i;
    const patientVoice = english.find(voice => patientPattern.test(voice.name)) || english.find(voice => /^en-US$/i.test(voice.lang)) || english[0];
    if (role === 'patient') return patientVoice;
    return english.find(voice => narratorPattern.test(voice.name) && voice.voiceURI !== patientVoice?.voiceURI)
      || english.find(voice => voice.voiceURI !== patientVoice?.voiceURI)
      || patientVoice;
  }

  function updateInfoVoiceControls() {
    const toggle = $('infoUpdateVoiceToggle');
    const replay = $('infoUpdateReplay');
    if (!toggle || !replay) return;
    if (!infoVoiceSupported) {
      toggle.disabled = true;
      replay.disabled = true;
      toggle.classList.remove('is-on');
      toggle.setAttribute('aria-pressed', 'false');
      toggle.setAttribute('aria-label', 'Patient voice is not supported in this browser');
      toggle.title = 'Text-to-speech is not available in this browser';
      const label = toggle.querySelector('.info-voice-label');
      if (label) label.textContent = 'Patient voice unavailable';
      return;
    }
    toggle.disabled = false;
    const currentItem = infoUpdates[infoUpdateIndex];
    replay.disabled = !currentItem || infoVoiceRole(currentItem) !== 'patient';
    toggle.classList.toggle('is-on', infoVoiceAuto);
    toggle.setAttribute('aria-pressed', String(infoVoiceAuto));
    toggle.setAttribute('aria-label', infoVoiceAuto ? 'Turn automatic patient voice off' : 'Turn automatic patient voice on');
    toggle.title = infoVoiceAuto ? 'Turn Patient Voice off' : 'Turn Patient Voice on';
    const label = toggle.querySelector('.info-voice-label');
    if (label) label.textContent = infoVoiceAuto ? 'Patient voice ON' : 'Patient voice OFF';
  }

  function stopInfoSpeech() {
    if (!infoVoiceSupported) return;
    try { window.speechSynthesis.cancel(); } catch (_) {}
    infoVoiceUtterance = null;
    $('infoUpdateWindow')?.classList.remove('is-speaking');
    $('infoUpdateReplay')?.classList.remove('is-speaking');
  }

  function speakInfoUpdate(item, options = {}) {
    if (!infoVoiceSupported || !item) return false;
    const replay = options.replay === true;
    if (!replay && !infoVoiceAuto) return false;
    const role = infoVoiceRole(item);
    if (role !== 'patient') return false;
    if (id === 'horse_crush' && document.body.dataset.horseIntro !== 'arrived') return false;
    let text = cleanInfoSpeechText(item.text);
    if (role === 'patient') {
      const quoted = String(item.text || '').match(/[“"]([^”"]+)[”"]/u);
      if (quoted?.[1]) text = cleanInfoSpeechText(quoted[1]);
    }
    if (!text) return false;
    const signature = `${item.id || item.type || 'update'}:${role}:${text}`;
    if (!replay && signature === infoLastSpokenSignature) return false;

    stopInfoSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = preferredInfoVoice(role);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'en-US';
    utterance.rate = 0.98;
    utterance.pitch = 1.04;
    utterance.volume = 1;
    utterance.onstart = () => {
      $('infoUpdateWindow')?.classList.add('is-speaking');
      $('infoUpdateReplay')?.classList.add('is-speaking');
    };
    const finish = () => {
      if (infoVoiceUtterance === utterance) infoVoiceUtterance = null;
      $('infoUpdateWindow')?.classList.remove('is-speaking');
      $('infoUpdateReplay')?.classList.remove('is-speaking');
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    infoVoiceUtterance = utterance;
    if (!replay) infoLastSpokenSignature = signature;
    try {
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (error) {
      console.warn('Patient update voice could not start.', error);
      finish();
      return false;
    }
  }

  function setInfoVoiceAuto(enabled) {
    infoVoiceAuto = Boolean(enabled && infoVoiceSupported);
    try { localStorage.setItem(INFO_VOICE_STORAGE_KEY, infoVoiceAuto ? 'on' : 'off'); } catch (_) {}
    if (!infoVoiceAuto) stopInfoSpeech();
    updateInfoVoiceControls();
    toast(infoVoiceAuto ? 'Patient Voice on — only patient dialogue will be read aloud.' : 'Patient Voice off. Patient dialogue will remain visual.');
  }

  function infoElapsed(value, startedAt) { return elapsedLabel(value, startedAt); }
  function abnormalEvent(event) {
    if (event.key === 'bls_handoff' || event.source === 'bls-handoff') return false;
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
    if (event.category === 'vital') return { id: event.id || event.eventId, type: event.type === 'reassessment' ? 'VITAL REASSESSMENT' : 'VITALS', title: event.label || labelFor(event.key), text: event.value || event.details || 'A vital sign was obtained.', kind: 'vital', recordedAt: event.recordedAt };
    if (event.source === 'partner-assignment') return { id: event.id || event.eventId, type: 'PARTNER UPDATE', title: `${event.label || labelFor(event.key)} obtained`, text: event.value || 'Partner task complete.', kind: 'partner', recordedAt: event.recordedAt };
    if (event.type === 'treatment') return { id: event.id || event.eventId, type: 'TREATMENT', title: event.label || 'Treatment performed', text: event.value || event.details || 'Treatment was recorded.', kind: 'treatment', recordedAt: event.recordedAt };
    if (event.type === 'reassessment') return { id: event.id || event.eventId, type: 'REASSESSMENT', title: event.label || 'Patient reassessed', text: event.value || event.details || 'The patient condition was reassessed.', kind: 'reassessment', recordedAt: event.recordedAt };
    if (event.type === 'condition_change') return { id: event.id || event.eventId, type: 'PATIENT CONDITION CHANGE', title: event.label || 'Patient condition changed', text: event.value || event.details || 'The patient condition changed.', kind: 'alert', recordedAt: event.recordedAt };
    if (event.type === 'patient_response') return { id: event.id || event.eventId, type: 'PATIENT RESPONSE', title: event.label || 'Response to treatment', text: event.value || event.details || 'The patient responded to treatment.', kind: 'patient_dialogue', recordedAt: event.recordedAt };
    if (event.category === 'history') return { id: event.id || event.eventId, type: id === 'horse_crush' ? 'HISTORY ANSWER' : 'HISTORY ALERT', title: event.label || 'Important history', text: event.value || event.details || 'Relevant history was obtained.', kind: id === 'horse_crush' ? 'patient_dialogue' : 'history', recordedAt: event.recordedAt };
    if (event.type === 'impression' || event.type === 'documentation') return { id: event.id || event.eventId, type: 'TRANSPORT / REPORT', title: event.label || 'Care plan updated', text: event.value || event.details || 'The care plan was updated.', kind: 'transport', recordedAt: event.recordedAt };
    return { id: event.id || event.eventId, type: isAbnormal ? 'CONDITION ALERT' : 'PATIENT UPDATE', title: event.label || labelFor(event.key), text: event.value || event.details || 'New patient information was obtained.', kind: isAbnormal ? 'alert' : 'assessment', recordedAt: event.recordedAt };
  }
  function buildInfoUpdates(current) {
    const startedAt = current?.startedAt || new Date().toISOString();
    const startMs = new Date(startedAt).getTime();
    const horseIntroPhase = id === 'horse_crush' ? (document.body.dataset.horseIntro || 'video') : '';
    if (horseIntroPhase === 'video') {
      return [];
    }
    if (horseIntroPhase === 'dispatch') {
      return [{
        id: 'dispatch', type: 'DISPATCH', title: 'Dispatch information',
        text: current?.dispatch || scenario.dispatch || 'Medic 181 Engine 182 respond emergent to 5541 E Snow Bird Road in reports of a 64 year old female smashed by a horse.',
        kind: 'dispatch', recordedAt: startedAt
      }];
    }
    if (horseIntroPhase === 'parking') {
      return [{
        id: 'dispatch', type: 'DISPATCH', title: 'Dispatch information',
        text: current?.dispatch || scenario.dispatch || 'Medic 181 Engine 182 respond emergent to 5541 E Snow Bird Road in reports of a 64 year old female smashed by a horse.',
        kind: 'dispatch', recordedAt: startedAt
      }, {
        id: 'ambulance-position', type: 'AMBULANCE POSITION', title: 'Scene arrival',
        text: 'The ambulance is positioned near the south barn apron, facing out, with the driveway and exit path open.',
        kind: 'arrival', recordedAt: new Date(startMs + 1).toISOString()
      }];
    }
    const updates = [
      { id: 'dispatch', type: 'DISPATCH', title: 'Dispatch information', text: current?.dispatch || scenario.title, kind: 'dispatch', recordedAt: startedAt }
    ];
    if (id === 'horse_crush') {
      updates.push({
        id:'first-on-scene-handoff',
        type:'BLS ENGINE HANDOFF',
        title:'Patient has not been moved',
        text:'“She was smashed between two horses and fell to the ground. No loss of consciousness. She is alert and oriented ×4 and complains of left-hip pain. We have not moved her.”',
        kind:'partner',
        sticky:true,
        recordedAt:new Date(startMs + 8).toISOString()
      });
    }
    updates.push({
      id:'visible', type:'VISIBLE CONDITION', title:'First patient view', text:scenario.visible,
      kind:'visible', recordedAt:new Date(startMs + 2).toISOString()
    });
    const log = api?.listCareLog?.(current, 'all') || [];
    log.filter(event => isInformationUpdate(event) && !event.suppressInfoUpdate && !(id === 'horse_crush' && (event.source === 'horse-rapid-abc' || event.source === 'bls-handoff' || event.source === 'scenario-start' || event.key === 'bls_handoff' || event.key === 'arrival_parking')))
      .forEach(event => updates.push(updateFromCareEvent(event)));
    if (id === 'horse_crush') {
      const state = horseClinicalState();
      const painKeys = new Set(['pain','pelvis_hip','left_leg','trauma_assessment']);
      const painEvent = [...log]
        .filter(event => painKeys.has(event.key))
        .sort((a,b) => new Date(b.recordedAt || 0).getTime() - new Date(a.recordedAt || 0).getTime())[0];
      if (painEvent && state?.stage === 'baseline' && horseIntroPhase === 'arrived') {
        const t = new Date(painEvent.recordedAt || startedAt).getTime();
        updates.push({
          id:'horse-pain-request', type:'PATIENT', title:'Patient request', text:state.patientText,
          kind:'patient_dialogue', sticky:true,
          recordedAt:new Date((Number.isFinite(t) ? t : new Date(startedAt).getTime()) + 2).toISOString()
        });
      }
    }
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
    if (desktopWorkspace()) {
      infoManuallyCollapsed = false;
      setInfoCollapsed(false);
      return;
    }
    if (item.sticky || infoVoiceRole(item) === 'patient') {
      infoManuallyCollapsed = false;
      setInfoCollapsed(false);
      if (id === 'horse_crush' && desktopWorkspace()) {
        infoAutoCollapseTimer = window.setTimeout(() => {
          setInfoCollapsed(true, { markViewed:false });
        }, infoVoiceRole(item) === 'patient' ? 7000 : 5500);
      }
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
    if (!item || !$('infoUpdateWindow')) {
      if (!item && $('infoUpdateWindow') && id === 'horse_crush' && document.body.dataset.horseIntro === 'video') {
        $('infoUpdateType').textContent = '';
        $('infoUpdateTitle').textContent = '';
        $('infoUpdateText').textContent = '';
        if ($('infoUpdateCount')) $('infoUpdateCount').textContent = '';
      }
      return;
    }
    const isNew = forceLatest || changed || item.id !== lastInfoItemId;
    const collapsed = $('infoUpdateWindow').dataset.collapsed === 'true';
    const voiceRole = infoVoiceRole(item);
    const presentation = infoPresentation(item);
    $('infoUpdateWindow').className = `info-update-window communication-workspace info-${item.kind || 'assessment'} info-source-${presentation.key} voice-${voiceRole}${collapsed ? ' is-collapsed' : ''}`;
    const sourceIcon = $('infoUpdateIcon');
    if (sourceIcon) {
      sourceIcon.textContent = presentation.icon;
      sourceIcon.className = `info-update-source-icon source-${presentation.key}${isNew ? ' source-blink' : ''}`;
      if (isNew) window.setTimeout(() => sourceIcon.classList.remove('source-blink'), 2300);
    }
    $('infoUpdateType').textContent = presentation.label;
    $('infoUpdateTitle').textContent = item.title;
    const textNode = $('infoUpdateText');
    if (voiceRole === 'patient') {
      const parts = patientDialogueParts(item);
      textNode.innerHTML = `<span class="patient-spoken-line">“${escapeHtml(parts.spoken)}”</span>${parts.observation ? `<span class="patient-visual-note"><span aria-hidden="true">👁</span>${escapeHtml(parts.observation)}</span>` : ''}`;
    } else {
      textNode.textContent = item.text;
    }
    renderInfoQuickReplies(item);
    const replay = $('infoUpdateReplay');
    if (replay) {
      replay.disabled = voiceRole !== 'patient' || !infoVoiceSupported;
      replay.title = voiceRole === 'patient' ? 'Replay the patient statement' : 'This finding is visual only and is not spoken';
      replay.setAttribute('aria-label', voiceRole === 'patient' ? 'Replay the current patient statement' : 'This clinical finding is visual only');
    }
    $('infoUpdateTime').textContent = infoElapsed(item.recordedAt, current.startedAt);
    $('infoUpdateCount').textContent = `${infoUpdateIndex + 1} of ${infoUpdates.length}`;
    $('infoUpdateWindow')?.classList.toggle('single-update', infoUpdates.length <= 1);
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

    // Speak only genuinely new patient dialogue. Vitals, observations, assessments, and other
    // clinical information remain visual-only. Navigating older updates is silent.
    if (id === 'horse_crush' && !firstRender && changed && infoUpdateIndex === infoUpdates.length - 1) {
      speakInfoUpdate(item);
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

  function logDisplayCategory(event = {}) {
    if (event.category === 'vital') return 'vitals';
    if (event.category === 'history') return 'history';
    if (event.category === 'treatment' || event.category === 'transport' || event.type === 'treatment' || event.type === 'patient_response') return 'treatments';
    return 'assessments';
  }

  function usefulLogEvent(event = {}) {
    if (!event || !event.recordedAt) return false;
    if (event.suppressCareLog === true) return false;
    const label = String(event.label || '').trim().toLowerCase();
    const value = String(event.value || '').trim().toLowerCase();
    if (!label && !value) return false;
    if (['scenario started','information update','current patient','assessment in progress'].includes(label)) return false;
    if (event.type === 'documentation' && !['treatment','transport'].includes(event.category)) return false;
    return true;
  }

  function conciseLogDetails(event = {}) {
    const details = String(event.details || '').trim();
    if (!details) return '';
    const noisy = [
      'response became apparent over time',
      'observe and reassess the patient',
      'the learner deferred a decision',
      'triggered at '
    ];
    if (noisy.some(text => details.toLowerCase().includes(text))) return '';
    const value = String(event.value || '').trim();
    if (value && details === value) return '';
    return details;
  }

  function logCategoryLabel(category) {
    return ({ assessments:'Assessment', vitals:'Vitals', history:'History', treatments:'Treatment' })[category] || 'Assessment';
  }

  function appendLogEntry(list, event, index, current, showCategory = true) {
    const category = logDisplayCategory(event);
    const item = document.createElement('li');
    item.className = `care-log-item ${category} ${event.type || 'finding'}`;
    const details = conciseLogDetails(event);
    item.innerHTML = `
      <div class="care-log-order"><b>${index + 1}</b><span>${escapeHtml(elapsedLabel(event.recordedAt, current.startedAt))}</span></div>
      <div class="care-log-content">
        <div class="care-log-heading">${showCategory ? `<span class="care-log-type">${escapeHtml(logCategoryLabel(category))}</span>` : ''}<time datetime="${escapeHtml(event.recordedAt)}">${escapeHtml(formatClock(event.recordedAt))}</time></div>
        <strong>${escapeHtml(event.label || labelFor(event.key))}</strong>
        <p>${escapeHtml(event.value || 'Recorded')}</p>
        ${details ? `<small>${escapeHtml(details)}</small>` : ''}
      </div>`;
    list.appendChild(item);
  }

  function renderFindings() {
    const list = $('findingList');
    const current = record() || {};
    let events = (api?.listCareLog?.(current, 'all') || []).filter(usefulLogEvent);
    events.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
    if (findingFilter !== 'all') events = events.filter(event => logDisplayCategory(event) === findingFilter);

    document.querySelectorAll('[data-log-filter]').forEach(button => button.classList.toggle('active', button.dataset.logFilter === findingFilter));
    document.querySelectorAll('[data-log-view]').forEach(button => button.classList.toggle('active', button.dataset.logView === findingView));
    const activeFilter = document.querySelector(`[data-log-filter="${findingFilter}"]`)?.dataset.label || 'All';
    const viewText = findingView === 'category' ? 'grouped by category' : 'in time order';
    $('findingFilterSummary').textContent = `${events.length} useful ${activeFilter.toLowerCase()} entr${events.length === 1 ? 'y' : 'ies'} · ${viewText}.`;
    list.innerHTML = '';
    list.classList.toggle('category-view', findingView === 'category');
    if (!events.length) {
      list.innerHTML = '<li class="empty">No matching patient-care entries have been recorded yet.</li>';
      return;
    }

    if (findingView === 'category' && findingFilter === 'all') {
      const categories = ['assessments','vitals','history','treatments'];
      let runningIndex = 0;
      categories.forEach(category => {
        const grouped = events.filter(event => logDisplayCategory(event) === category);
        if (!grouped.length) return;
        const heading = document.createElement('li');
        heading.className = `care-log-category-heading ${category}`;
        heading.innerHTML = `<strong>${logCategoryLabel(category)}</strong><span>${grouped.length}</span>`;
        list.appendChild(heading);
        grouped.forEach(event => appendLogEntry(list, event, runningIndex++, current, false));
      });
      return;
    }

    events.forEach((event, index) => appendLogEntry(list, event, index, current, findingFilter === 'all'));
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

  function transportUrgencyLabel(value) {
    const text = String(value || '').trim();
    if (/non[- ]?emergent/i.test(text)) return 'Non-emergent';
    if (/emergent|prompt/i.test(text)) return 'Emergent';
    return text;
  }

  function transportPriorityOptions() {
    if (id === 'horse_crush') return transportPlan().priorities || ['Emergent','Non-emergent'];
    return ['Non-emergent transport','Emergent transport'];
  }
  function transportDestinationOptions() {
    if (id === 'horse_crush') return transportPlan().destinations || ['Closest appropriate emergency department','Trauma center'];
    return ['Closest appropriate emergency department','Trauma center','Stroke center','Cardiac catheterization center','Pediatric-capable emergency department','Burn center','Specialty respiratory center'];
  }

  function saveTransportDecision(form, submitter) {
    const current = record() || {};
    const plan = transportPlan();
    const priorityField = form.elements.namedItem('priority');
    const priorityRaw = String(submitter?.value || priorityField?.value || '');
    const priority = id === 'horse_crush' ? transportUrgencyLabel(priorityRaw) : priorityRaw;
    const impression = String(form.elements.namedItem('impression')?.value || current.impressions?.primary || '');
    const destination = String(form.elements.namedItem('destination')?.value || current.documentation?.destination || '');
    const notification = String(form.elements.namedItem('notification')?.value || '');
    const rationale = String(form.elements.namedItem('rationale')?.value || '').trim();
    const error = form.querySelector('.transport-entry-error');
    if (id === 'horse_crush') {
      if (!priority) {
        if (error) {
          error.textContent = 'Choose Emergent or Non-emergent.';
          error.hidden = false;
        }
        return;
      }
    } else if (!impression || !priority || !destination) {
      if (error) {
        error.textContent = 'Choose a working impression, transport priority, and destination.';
        error.hidden = false;
      }
      return;
    }
    if (error) error.hidden = true;
    if (impression || id === 'horse_crush') {
      api?.setImpressions?.({ primary: impression || current.impressions?.primary || '', action: priority, source:'transport-treatment', updatedAt:new Date().toISOString() });
    }
    api?.setDocumentation?.({ transportPriority:priority, destination, transportNotification:notification, transportRationale:rationale, transportDecisionAt:new Date().toISOString() });
    const findingValue = destination ? `${priority} to ${destination}` : priority;
    api?.setFinding?.('transport_decision', findingValue, { label:'Transport decision', source:'transport-treatment', details:rationale || (impression ? `Working impression: ${impression}` : priority) });
    const expectedPriority = id === 'horse_crush' ? plan.bestPriority : (/Emergent|Prompt/i.test(plan.bestPriority || '') ? 'Emergent transport' : 'Non-emergent transport');
    const priorityMatch = id === 'horse_crush' ? transportUrgencyLabel(priority) === transportUrgencyLabel(expectedPriority) : priority === expectedPriority;
    const destinationMatch = id === 'horse_crush' ? true : (destination === plan.bestDestination || (plan.bestDestination === 'Stroke-capable center' && destination === 'Stroke center'));
    const classification = priorityMatch && destinationMatch ? 'appropriate-effective' : 'transport-choice-review';
    const transportHorseState = id === 'horse_crush' ? horseClinicalState() : null;
    const transportPatientResponse = id === 'horse_crush'
      ? (transportHorseState?.stage === 'baseline'
          ? '“Can you do something for my pain before you move me?” The patient remains alert and continues guarding the left hip.'
          : `${transportHorseState?.patientText || 'The patient tolerates the movement plan.'} The injured leg remains supported during transport.`)
      : 'The patient is prepared for movement and transport while care and reassessment continue.';
    const treatment = {
      actionId:'transport_decision', treatment:'Initiate transport', name:'Initiate transport', label:'Transport initiated',
      description:`${findingValue}${notification ? ` • ${notification}` : ''}`,
      source:'transport-treatment', classification, indicationStatus:classification,
      targetKeys:[], reassessmentRequired:false,
      documentation:{ impression, priority, destination, notification, rationale },
      patientResponse:transportPatientResponse
    };
    if (session?.addTreatment) session.addTreatment(treatment); else api?.addTreatment?.(treatment);
    api?.mergeCareLog?.([
      { type:'documentation', category:'transport', key:'transport_decision', label:'Transport initiated', value:treatment.description, details:rationale, source:'transport-treatment', suppressInfoUpdate:id === 'horse_crush', recordedAt:new Date(Date.now()+1).toISOString() },
      ...(id === 'horse_crush' ? [{ type:'patient_response', category:'treatment', key:'transport_decision', label:'Patient response to transport', value:treatment.patientResponse, details:'Continue care and reassessment during transport.', source:'transport-treatment-response', recordedAt:new Date(Date.now()+2).toISOString() }] : [])
    ]);
    refreshFromRecord();
    if (id === 'horse_crush') {
      window.EMSCodeSimHorseCrush?.noteLearnerAssessment?.('transport');
      sceneObservationUpdate = {
        id:`horse-transport-handoff-ready-${Date.now()}`,
        type:'TRANSPORT',
        title:'Transport underway',
        text:`${treatment.patientResponse} When you arrive at the receiving hospital, use the Handoff button above the patient picture to give report.`,
        kind:'transport', sticky:true, recordedAt:new Date().toISOString()
      };
      lastInfoSignature = '';
      renderInfoUpdate(true);
    }
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
    if (id === 'horse_crush') {
      details.innerHTML = `<summary><span><strong>Transport</strong><small>Choose Emergent or Non-emergent.</small></span><em>${recorded ? 'Recorded' : 'Decision required'}</em></summary><div class="treatment-category-list"><article class="treatment-card transport-treatment-card"><div class="treatment-card-heading"><div><h3>Initiate transport</h3></div><span class="status-chip ${recorded ? 'done' : ''}">${recorded ? 'Recorded' : 'Available'}</span></div><p>Choose Emergent or Non-emergent. Correctness is reviewed during debrief.</p>${horseTransportFormMarkup()}</article></div>`;
      details.querySelector('form')?.addEventListener('submit', event => { event.preventDefault(); saveTransportDecision(event.currentTarget, event.submitter); });
      return details;
    }
    details.innerHTML = `<summary><span><strong>Transport</strong><small>Select urgency, destination, and specialty notification.</small></span><em>${recorded ? 'Recorded' : 'Decision required'}</em></summary><div class="treatment-category-list"><article class="treatment-card transport-treatment-card"><div class="treatment-card-heading"><div><h3>Initiate transport</h3></div><span class="status-chip ${recorded ? 'done' : ''}">${recorded ? 'Recorded' : 'Available'}</span></div><p>Make the transport decision from the findings you obtained. Correctness is reviewed during debrief.</p><form class="transport-treatment-form"><label>Working impression<select name="impression">${selectOptions(plan.impressions, current.impressions?.primary || '', 'Choose working impression')}</select></label><label>Transport urgency<select name="priority">${selectOptions(transportPriorityOptions(), current.documentation?.transportPriority || '', 'Choose emergent or non-emergent')}</select></label><label>Destination<select name="destination">${selectOptions(transportDestinationOptions(), current.documentation?.destination || '', 'Choose receiving destination')}</select></label><label>Specialty notification<select name="notification">${selectOptions(['No specialty activation','Trauma activation','Stroke alert','STEMI / cath-lab activation','Pediatric alert','Burn-center notification'], current.documentation?.transportNotification || '', 'Choose notification')}</select></label><label>Reason for decision<textarea name="rationale" rows="3" placeholder="Use findings, time sensitivity, and specialty needs">${escapeHtml(current.documentation?.transportRationale || '')}</textarea></label><button class="primary-action" type="submit">${recorded ? 'Update transport decision' : 'Initiate and record transport'}</button><p class="transport-entry-error" hidden></p></form></article></div>`;
    details.querySelector('form')?.addEventListener('submit', event => { event.preventDefault(); saveTransportDecision(event.currentTarget, event.submitter); });
    return details;
  }
  function recordedFindingValue(current, key) {
    const item = current?.findings?.[key];
    if (!item) return '';
    return String(item.value ?? item.finding ?? item.result ?? '').trim();
  }

  function recordedFindingDetails(current, key) {
    const item = current?.findings?.[key];
    if (!item) return '';
    return String(item.details ?? item.detail ?? '').trim();
  }

  function handoffHistoryValue(current, questionId) {
    const value = current?.history?.[interviewHistoryKey(questionId)];
    return value ? cleanPatientQuote(value) : '';
  }

  function handoffVitalValue(current, key) {
    const raw = recordedFindingValue(current, key);
    if (!raw) return '';
    if (key === 'pulse' || key === 'respirations') return /\/min|bpm/i.test(raw) ? raw : `${raw}/min`;
    if (key === 'spo2') return raw.includes('%') ? raw : `${raw}%`;
    if (key === 'blood_glucose') return /mg\/dL/i.test(raw) ? raw : `${raw} mg/dL`;
    if (key === 'blood_pressure') return /mmHg/i.test(raw) ? raw : `${raw} mmHg`;
    return raw;
  }

  function handoffCompact(value, max = 220) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
  }

  function handoffNoteCard(title, rows, tone = '') {
    const useful = rows.filter(row => row?.value);
    const body = useful.length
      ? useful.map(row => `<div class="handoff-note-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(handoffCompact(row.value, row.max || 210))}</strong></div>`).join('')
      : '<p class="handoff-note-empty">Not obtained / not documented.</p>';
    return `<article class="handoff-note-card ${tone}"><h3>${escapeHtml(title)}</h3>${body}</article>`;
  }

  function horseHandoffNoteModel(current = record() || {}) {
    const patientNameAnswer = handoffHistoryValue(current, 'name');
    const preferredName = patientNameAnswer ? 'Janet (fictional)' : '';
    const birthYear = handoffHistoryValue(current, 'dob') ? '1962 (fictional)' : '';
    const patientAgeAnswer = handoffHistoryValue(current, 'age');
    const approximateAge = patientAgeAnswer ? 'mid-60s' : '';
    const documentedPatient = preferredName || (approximateAge ? `${approximateAge} adult` : 'Adult training patient');
    const mechanism = handoffHistoryValue(current, 'events') || recordedFindingValue(current, 'bls_handoff');
    const chief = handoffHistoryValue(current, 'chief_complaint') || handoffHistoryValue(current, 'symptoms') || recordedFindingValue(current, 'pain') || recordedFindingValue(current, 'left_leg');
    const pain = handoffHistoryValue(current, 'severity') || recordedFindingDetails(current, 'pain');
    const abc = [
      { label:'Airway', value:recordedFindingValue(current, 'airway') },
      { label:'Breathing', value:recordedFindingValue(current, 'breathing') },
      { label:'Circulation', value:recordedFindingValue(current, 'perfusion') },
      { label:'Mental status', value:recordedFindingValue(current, 'mental_status') || recordedFindingValue(current, 'avpu') || recordedFindingValue(current, 'gcs') }
    ];
    const focused = [
      { label:'Neck / back', value:recordedFindingValue(current, 'neck_back') },
      { label:'Chest', value:recordedFindingValue(current, 'chest_assessment') },
      { label:'Abdomen', value:recordedFindingValue(current, 'abdominal_assessment') },
      { label:'Pelvis / hip', value:recordedFindingValue(current, 'pelvis_hip') },
      { label:'Left leg', value:recordedFindingValue(current, 'left_leg') },
      { label:'Distal CSM', value:recordedFindingValue(current, 'distal_csm') }
    ];
    const vitals = [
      { label:'BP', value:handoffVitalValue(current, 'blood_pressure') },
      { label:'Pulse', value:handoffVitalValue(current, 'pulse') },
      { label:'Respirations', value:handoffVitalValue(current, 'respirations') },
      { label:'SpO₂', value:handoffVitalValue(current, 'spo2') },
      { label:'BGL', value:handoffVitalValue(current, 'blood_glucose') },
      { label:'Temperature', value:handoffVitalValue(current, 'temperature') }
    ];
    const historyRows = [
      { label:'Allergies', value:handoffHistoryValue(current, 'allergies') },
      { label:'Medications', value:handoffHistoryValue(current, 'medications') },
      { label:'History', value:handoffHistoryValue(current, 'medical_history') },
      { label:'Last intake', value:handoffHistoryValue(current, 'last_intake') },
      { label:'Pain / OPQRST', value:pain },
      { label:'Events', value:handoffHistoryValue(current, 'events') }
    ];
    const treatmentRows = (current.treatments || [])
      .filter(item => item.actionId !== 'transport_decision')
      .slice(-8)
      .map(item => ({
        label:item.label || item.name || item.treatment || 'Treatment',
        value:[item.description, item.patientResponse].filter(Boolean).join(' — '),
        max:260
      }));
    const reassessmentRows = (current.reassessments || []).slice(-5).map((item, index) => ({
      label:item.label || `Reassessment ${index + 1}`,
      value:item.description || item.response || item.value || ''
    }));
    const transportRows = [
      { label:'Urgency', value:current.documentation?.transportPriority || current.impressions?.action || '' }
    ];
    return {
      patient:documentedPatient,
      reasonRows:[
        {label:'Preferred name',value:preferredName},
        {label:'Birth year',value:birthYear},
        {label:'Approx. age',value:approximateAge},
        {label:'Reason / complaint',value:chief},
        {label:'Mechanism',value:mechanism}
      ],
      abc, focused, vitals, historyRows, treatmentRows, reassessmentRows, transportRows
    };
  }

  function renderHorseHospitalHandoff() {
    if (id !== 'horse_crush') return;
    const workspace = $('hospitalHandoffWorkspace');
    const notes = $('hospitalHandoffNotes');
    if (!workspace || !notes) return;
    const current = record() || {};
    const model = horseHandoffNoteModel(current);
    const sections = [
      ['Patient / mechanism', model.reasonRows, 'handoff-note-priority'],
      ['Primary assessment', model.abc, ''],
      ['Focused trauma exam', model.focused, ''],
      ['Vital signs', model.vitals, 'handoff-note-vitals'],
      ['History', model.historyRows, ''],
      ['Treatment / response', model.treatmentRows, 'handoff-note-treatment'],
      ['Reassessment', model.reassessmentRows, ''],
      ['Transport', model.transportRows, 'handoff-note-transport']
    ];
    notes.innerHTML = sections.map(([title, rows, tone]) => handoffNoteCard(title, rows, tone)).join('');
    const completeSections = sections.filter(([, rows]) => rows.some(row => row?.value)).length;
    if ($('handoffNoteCompleteness')) $('handoffNoteCompleteness').textContent = `${completeSections} of ${sections.length} sections documented`;
    if ($('hospitalHandoffStatus')) {
      const saved = Boolean(current.documentation?.handoffSavedAt && current.documentation?.handoff);
      $('hospitalHandoffStatus').textContent = saved ? 'Saved' : 'Not saved';
      $('hospitalHandoffStatus').classList.toggle('done', saved);
      if ($('openHorseCallGrade')) $('openHorseCallGrade').hidden = false;
    }
    const draft = $('hospitalHandoffDraft');
    if (draft && !draft.dataset.userEdited) draft.value = current.documentation?.handoff || '';
    if ($('sampleHospitalHandoffText')) $('sampleHospitalHandoffText').textContent = horseSampleHandoffText(current);
    const samplePanel = $('sampleHospitalHandoffPanel');
    if (samplePanel) samplePanel.hidden = !horseHandoffSampleOpen;
  }

  function horseSampleHandoffText(current = record() || {}) {
    const model = horseHandoffNoteModel(current);
    const joinValues = (rows, separator = '; ') => rows.filter(row => row.value).map(row => `${row.label}: ${handoffCompact(row.value, 150)}`).join(separator);
    const reason = joinValues(model.reasonRows.filter(row => row.label !== 'Patient'));
    const abc = joinValues(model.abc);
    const exam = joinValues(model.focused);
    const vitals = joinValues(model.vitals, ', ');
    const history = joinValues(model.historyRows);
    const treatments = joinValues(model.treatmentRows);
    const reassess = joinValues(model.reassessmentRows);
    const transport = joinValues(model.transportRows);
    return [
      `This is EMS with a ${model.patient}.`,
      reason ? `${reason}.` : 'The reason for the call / mechanism was not documented.',
      abc ? `Primary assessment: ${abc}.` : 'Primary assessment findings were not documented.',
      exam ? `Focused exam: ${exam}.` : '',
      vitals ? `Vitals obtained: ${vitals}.` : 'Vital signs were not documented.',
      history ? `Relevant history: ${history}.` : '',
      treatments ? `Care provided: ${treatments}.` : 'No treatment was documented.',
      reassess ? `Reassessment: ${reassess}.` : '',
      transport ? `Transport: ${transport}.` : 'Transport details were not documented.'
    ].filter(Boolean).join(' ');
  }

  function hideHorseClinicalRightRail() {
    const sheet = $('actionSheet');
    if (sheet) sheet.hidden = true;
    document.body.classList.remove('horse-tool-sheet-open');
  }

  function openHorseHospitalHandoff(showSample = false) {
    if (id !== 'horse_crush') return;
    closeEmbeddedSimulator({ refresh:false });
    horseHandoffOpen = true;
    horseHandoffSampleOpen = Boolean(showSample);
    const workspace = $('hospitalHandoffWorkspace');
    if (workspace) workspace.hidden = false;
    document.body.classList.add('hospital-handoff-open');
    hideHorseClinicalRightRail();
    renderHorseHospitalHandoff();
    sceneObservationUpdate = {
      id:`horse-hospital-handoff-${Date.now()}`,
      type:'HOSPITAL HANDOFF',
      title:'Give bedside report',
      text:'Your patient-picture area now shows the information you documented during the call. Use those field notes to give a concise handoff. Missing information remains blank.',
      kind:'transport', sticky:true, recordedAt:new Date().toISOString()
    };
    infoManuallyCollapsed = false;
    lastInfoSignature = '';
    renderInfoUpdate(true);
  }

  function closeHorseHospitalHandoff() {
    horseHandoffOpen = false;
    horseHandoffSampleOpen = false;
    const workspace = $('hospitalHandoffWorkspace');
    if (workspace) workspace.hidden = true;
    const samplePanel = $('sampleHospitalHandoffPanel');
    if (samplePanel) samplePanel.hidden = true;
    document.body.classList.remove('hospital-handoff-open');
  }

  function saveHorseHospitalHandoff() {
    const text = String($('hospitalHandoffDraft')?.value || '').trim();
    if (!text) { toast('Enter your verbal handoff before saving.'); return; }
    api?.setDocumentation?.({ handoff:text, handoffSavedAt:new Date().toISOString(), hospitalHandoffAt:new Date().toISOString(), updatedAt:new Date().toISOString() });
    api?.mergeCareLog?.([{ type:'documentation', category:'transport', key:'hospital_handoff', label:'Hospital handoff', value:'Bedside verbal handoff completed', details:text, source:'hospital-handoff', suppressInfoUpdate:true, recordedAt:new Date().toISOString() }]);
    if ($('hospitalHandoffDraft')) $('hospitalHandoffDraft').dataset.userEdited = '';
    renderSignatures.treatments = '';
    refreshFromRecord({ force:true });
    renderHorseHospitalHandoff();
    sceneObservationUpdate = { id:`horse-handoff-saved-${Date.now()}`, type:'HANDOFF COMPLETE', title:'Report given', text:'Hospital handoff saved. The receiving team has your report and care can transfer. Select Grade to review the entire scenario.', kind:'transport', sticky:true, recordedAt:new Date().toISOString() };
    lastInfoSignature = '';
    renderInfoUpdate(true);
    toast('Hospital handoff saved');
  }

  function horseGradeCareLog(current = record() || {}) {
    try { return api?.listCareLog?.(current, 'all') || current?.careLog || []; }
    catch { return current?.careLog || []; }
  }

  function horseGradeHasFinding(current, ...keys) {
    return keys.some(key => Boolean(current?.findings?.[key]));
  }

  function horseGradeTreatmentIds(current) {
    return new Set((current?.treatments || []).map(item => item?.actionId).filter(Boolean));
  }

  function horseGradeVitalEventCount(current, key) {
    const aliases = key === 'blood_pressure' ? ['blood_pressure','bp'] : key === 'respirations' ? ['respirations','respiratory_rate','rr'] : [key];
    const log = horseGradeCareLog(current);
    return log.filter(event => {
      const eventKey = String(event?.key || event?.findingKey || event?.vitalKey || '').toLowerCase();
      const category = String(event?.category || event?.type || '').toLowerCase();
      return aliases.includes(eventKey) && (/vital|reassess|assessment/.test(category) || !category);
    }).length;
  }

  function horseGradeAssessmentEventCount(current, key) {
    const log = horseGradeCareLog(current);
    return log.filter(event => {
      const eventKey = String(event?.key || event?.findingKey || '').toLowerCase();
      return eventKey === key && /assessment|reassess|finding/i.test(String(event?.category || event?.type || event?.source || ''));
    }).length;
  }

  function horseGradeHandoffQuality(current) {
    const text = String(current?.documentation?.handoff || '').trim();
    if (!text) return { score:0, complete:false };
    const checks = [
      /horse|crush|compressed|mechanism|fall/i,
      /hip|left leg|pelvis/i,
      /bp|blood pressure|pulse|resp|spo2|vital/i,
      /splint|support|pain|treat|care/i,
      /transport|emergency department|trauma center|hospital/i
    ];
    const hits = checks.filter(regex => regex.test(text)).length;
    return { score: text.length >= 110 && hits >= 4 ? 2 : text.length >= 60 && hits >= 3 ? 1 : 0, complete:hits >= 4 };
  }

  function horseCallIsComplete(current = record() || {}) {
    const evaluation = phases?.evaluate?.(current);
    return Boolean(current?.documentation?.handoffSavedAt && current?.documentation?.handoff && evaluation?.essentialComplete);
  }

  function horseBestNextStep(current = record() || {}) {
    const findings = current.findings || {};
    const treatmentIds = horseGradeTreatmentIds(current);
    const treatments = current.treatments || [];
    const coreVitals = ['blood_pressure','pulse','respirations','spo2'];
    const csmEventCount = horseGradeAssessmentEventCount(current, 'distal_csm');
    const majorMoveOrSupport = treatments.some(item => ['manual_leg_support','blanket_support','splint','scoop_position_comfort','vacuum_mattress','board_transfer','force_straight','traction_splint'].includes(item?.actionId));

    if (!findings.scene_size_up) return 'Complete the scene size-up and identify the mechanism, hazards, and need for additional resources.';
    if (!findings.airway) return 'Check the airway before moving deeper into the focused trauma assessment.';
    if (!findings.breathing) return 'Assess breathing and chest rise so immediate respiratory threats are ruled out.';
    if (!findings.perfusion) return 'Assess circulation/perfusion before focusing on the isolated hip injury.';
    if (!findings.pelvis_hip || !findings.left_leg) return 'Examine the painful left hip/pelvis and injured leg to define the injury before movement.';
    if (!findings.distal_csm) return 'Check distal circulation, sensation, and movement before splinting or moving the injured leg.';
    if (!findings.pain) return 'Complete a pain/OPQRST assessment and document the current pain score.';
    const missingVitals = coreVitals.filter(key => !findings[key]);
    if (missingVitals.length) return `Obtain the remaining core vital signs: ${missingVitals.map(labelFor).join(', ')}.`;
    if (!findings.sample) return 'Complete SAMPLE history so medications, allergies, medical history, intake, and events are available for care and handoff.';
    if (!['manual_leg_support','position_comfort','blanket_support','splint'].some(action => treatmentIds.has(action))) return 'Support/stabilize the painful leg in the patient’s tolerated position before moving her.';
    if (!treatmentIds.has('pain_control')) return 'Address pain before packaging or transport when feasible, then reassess the patient’s response.';
    if (majorMoveOrSupport && csmEventCount < 2 && !treatmentIds.has('reassess_distal_csm')) return 'Repeat distal CSM now that the leg has been stabilized or moved.';
    const repeatedVitals = coreVitals.filter(key => horseGradeVitalEventCount(current, key) >= 2);
    if (repeatedVitals.length < 2) return 'Repeat key vital signs after treatment so you can document whether the patient improved.';
    if (!['scoop_position_comfort','vacuum_mattress','board_transfer'].some(action => treatmentIds.has(action))) return 'Choose a coordinated low-movement packaging/transfer method that preserves the position of comfort.';
    if (!current.documentation?.transportDecisionAt) return 'Make the transport decision: Emergent or Non-emergent.';
    if (!current.documentation?.handoffSavedAt) return 'Give the hospital handoff using the findings, vital trend, treatments, and patient response you documented.';
    return 'The major call elements are complete. Review the final grade, then end the scenario when ready.';
  }

  function buildHorseCallGrade(current = record() || {}) {
    const findings = current.findings || {};
    const inProgress = !horseCallIsComplete(current);
    const treatmentIds = horseGradeTreatmentIds(current);
    const treatments = current.treatments || [];
    const state = horseClinicalState();
    const categories = [];
    const strengths = [];
    const improvements = [];
    const critical = [];

    // 1. Scene and primary assessment — 15 points.
    let primary = 0;
    if (findings.scene_size_up) primary += 4;
    if (findings.airway) primary += 4;
    if (findings.breathing) primary += 4;
    if (findings.perfusion) primary += 3;
    categories.push({ id:'primary', label:'Scene & primary', score:primary, max:15 });
    if (primary === 15) strengths.push('Completed scene size-up and the initial airway, breathing, and circulation assessment before moving deeper into the call.');
    else improvements.push('Complete the full scene size-up and ABC assessment early so immediate threats and movement risk are established before focused care.');

    // 2. Focused trauma assessment — 20 points.
    let assessment = 0;
    if (findings.pelvis_hip) assessment += 4;
    if (findings.left_leg) assessment += 4;
    if (findings.distal_csm) assessment += 4;
    if (findings.pain) assessment += 3;
    const supportingExam = ['head_exam','neck_back','chest_assessment','abdominal_assessment','upper_extremities'].filter(key => findings[key]).length;
    assessment += Math.min(3, supportingExam);
    if (horseGradeHasFinding(current, 'motor_sensory','trauma_assessment')) assessment += 2;
    assessment = Math.min(20, assessment);
    categories.push({ id:'assessment', label:'Assessment', score:assessment, max:20 });
    if (findings.pelvis_hip && findings.left_leg && findings.distal_csm) strengths.push('Focused the trauma exam on the painful left hip/leg and documented distal neurovascular function.');
    else improvements.push('For this injury, explicitly document the hip/pelvis, injured leg, and distal CSM before movement or splinting.');
    if (!findings.distal_csm) critical.push('Distal circulation, sensation, and movement were not documented before treatment/movement.');

    // 3. Vitals and reassessment — 15 points.
    let vitals = 0;
    const coreVitals = ['blood_pressure','pulse','respirations','spo2'];
    coreVitals.forEach(key => { if (findings[key]) vitals += 2; });
    if (horseGradeHasFinding(current, 'skin')) vitals += 1;
    if (horseGradeHasFinding(current, 'mental_status','gcs','avpu')) vitals += 1;
    const repeatedVitals = coreVitals.filter(key => horseGradeVitalEventCount(current, key) >= 2);
    const explicitReassessment = (current.reassessments || []).length > 0;
    if (repeatedVitals.length >= 2 || (explicitReassessment && repeatedVitals.length >= 1)) vitals += 5;
    else if (repeatedVitals.length === 1 || explicitReassessment) vitals += 3;
    vitals = Math.min(15, vitals);
    categories.push({ id:'vitals', label:'Vitals & reassessment', score:vitals, max:15 });
    if (coreVitals.every(key => findings[key])) strengths.push('Obtained the core trauma vital signs: blood pressure, pulse, respirations, and SpO₂.');
    else improvements.push(`Obtain the full core vital set; missing: ${coreVitals.filter(key => !findings[key]).map(labelFor).join(', ') || 'none'}.`);
    if (repeatedVitals.length || explicitReassessment) strengths.push('Reassessed the patient after care instead of treating the first vital set as the end of the assessment.');
    else improvements.push('Repeat vital signs after stabilization/pain control so you can show whether the patient actually improved.');

    // 4. History — 10 points.
    let history = 0;
    if (findings.sample) history += 5;
    if (findings.pain) history += 5;
    categories.push({ id:'history', label:'History', score:history, max:10 });
    if (history === 10) strengths.push('Completed both SAMPLE and OPQRST/pain history and connected the history to the mechanism.');
    else improvements.push(`${!findings.sample ? 'Complete SAMPLE history. ' : ''}${!findings.pain ? 'Complete OPQRST/pain assessment.' : ''}`.trim());

    // 5. Treatment, movement, and patient response — 25 points.
    let treatmentScore = 0;
    const supportIds = ['manual_leg_support','position_comfort','blanket_support','splint'];
    const safeMoveIds = ['scoop_position_comfort','vacuum_mattress','board_transfer'];
    const supportDone = supportIds.some(action => treatmentIds.has(action));
    const painDone = treatmentIds.has('pain_control');
    const safeMoveDone = safeMoveIds.some(action => treatmentIds.has(action));
    const teamDone = treatmentIds.has('request_help');
    const csmEventCount = horseGradeAssessmentEventCount(current, 'distal_csm');
    const csmRechecked = treatmentIds.has('reassess_distal_csm') || csmEventCount >= 2;
    const csmGapEvents = horseGradeCareLog(current).filter(event => event?.source === 'horse-csm-safety').length;
    const csmBaselineMisses = Math.max(treatments.filter(item => item?.csmBaselineMissing).length, csmGapEvents);
    if (supportDone) treatmentScore += 6;
    if (painDone) treatmentScore += 6;
    if (safeMoveDone) treatmentScore += 4;
    if (teamDone) treatmentScore += 2;
    if (csmRechecked) treatmentScore += 3;
    if (treatmentIds.has('heat_conservation')) treatmentScore += 1;
    if (state?.stage === 'relieved') treatmentScore += 3;
    else if (['supported','pain-improved'].includes(state?.stage)) treatmentScore += 1;

    const harmful = treatments.filter(item => item?.classification === 'contraindicated');
    const conflicting = treatments.filter(item => item?.classification === 'conflicting');
    const unnecessary = treatments.filter(item => item?.classification === 'unnecessary');
    treatmentScore -= harmful.length * 6;
    treatmentScore -= conflicting.length * 3;
    treatmentScore -= unnecessary.length;
    treatmentScore -= csmBaselineMisses * 3;
    treatmentScore = Math.max(0, Math.min(25, treatmentScore));
    categories.push({ id:'treatment', label:'Treatment & movement', score:treatmentScore, max:25 });

    if (supportDone) strengths.push('Supported/stabilized the painful leg without forcing it out of the patient’s position of comfort.');
    else improvements.push('Support and stabilize the injured leg in the tolerated position before movement.');
    if (painDone) strengths.push('Addressed pain before or during movement and allowed the patient’s response to guide care.');
    else improvements.push('Address pain before a painful move when feasible; the untreated patient continues asking for pain relief.');
    if (safeMoveDone) strengths.push('Selected a low-movement packaging strategy appropriate for severe hip pain.');
    else improvements.push('Choose a coordinated low-movement transfer/packaging method that preserves the flexed position of comfort.');
    if (csmRechecked) strengths.push('Repeated distal CSM after movement/stabilization and confirmed that distal neurovascular status remained intact.');
    else improvements.push('Repeat distal CSM after every major movement or stabilization step; this is a critical reassessment in this scenario.');
    if (csmBaselineMisses) critical.push('A splinting/packaging step occurred before baseline distal CSM was documented. Obtain circulation, sensation, and movement before the move whenever feasible, then repeat it afterward so you can identify a treatment-related change.');
    harmful.forEach(item => critical.push(`${item.name || item.treatment || 'A treatment'} was contraindicated and increased the patient’s pain. Stop the maneuver, return to the tolerated position, and reassess.`));
    conflicting.forEach(item => improvements.push(`${item.name || item.treatment || 'A treatment'} conflicted with an earlier care plan. Commit to one coherent strategy or document a deliberate change after reassessment.`));
    unnecessary.forEach(item => improvements.push(`${item.name || item.treatment || 'A treatment'} was not indicated by the findings and added care without meaningful benefit.`));

    // 6. Transport and hospital handoff — 15 points.
    let handoff = 0;
    const transportRecorded = Boolean(current.documentation?.transportDecisionAt);
    const priority = String(current.documentation?.transportPriority || '');
    if (transportRecorded) handoff += 6;
    if (transportUrgencyLabel(priority) === 'Emergent') handoff += 2;
    const handoffSaved = Boolean(current.documentation?.handoffSavedAt && current.documentation?.handoff);
    if (handoffSaved) handoff += 5;
    const handoffQuality = horseGradeHandoffQuality(current);
    handoff += handoffQuality.score;
    handoff = Math.min(15, handoff);
    categories.push({ id:'handoff', label:'Transport & handoff', score:handoff, max:15 });
    if (transportRecorded && transportUrgencyLabel(priority) === 'Emergent') strengths.push('Selected emergent transport for a significant painful hip injury with a high-energy mechanism.');
    else if (!transportRecorded) improvements.push('Make and document an Emergent or Non-emergent transport decision before ending the call.');
    else improvements.push('Review transport urgency: this patient has a significant horse-crush mechanism and severe hip injury, supporting emergent transport rather than a non-emergent trip.');
    if (handoffSaved && handoffQuality.complete) strengths.push('Completed a structured hospital handoff that included the mechanism, injury, vitals, care, and transport information.');
    else if (!handoffSaved) improvements.push('Give and save the hospital handoff before transferring care.');
    else improvements.push('Make the handoff more complete: mechanism, focused findings, vital trend, treatment/response, and transport destination should all be easy to hear.');

    const score = Math.max(0, Math.min(100, Math.round(categories.reduce((sum, item) => sum + item.score, 0))));
    const label = score >= 90 ? 'Excellent call' : score >= 80 ? 'Strong call' : score >= 70 ? 'Developing' : score >= 60 ? 'Needs improvement' : 'Major care gaps';
    const outcome = state?.stage === 'relieved'
      ? { label:'Patient improved', text:`Pain decreased to ${state.painScore}/10 with stabilization and pain control. Current modeled vitals are BP ${state.vitals.blood_pressure}, pulse ${state.vitals.pulse}, respirations ${state.vitals.respirations}/min, SpO₂ ${state.vitals.spo2}%.` }
      : state?.stage === 'pain-improved'
        ? { label:'Partial improvement', text:`Pain improved to ${state.painScore}/10 after pain management, but the leg still needs effective support/stabilization.` }
        : state?.stage === 'supported'
          ? { label:'Partial improvement', text:`Pain improved to ${state.painScore}/10 with leg support, but additional pain management would improve comfort before movement.` }
          : state?.stage === 'worse'
            ? { label:'Patient worsened', text:`Pain increased to ${state.painScore}/10 after an unsafe movement/treatment choice. Correct the position, support the leg, control pain, and reassess before continuing.` }
            : { label:'Condition largely unchanged', text:'The patient remains alert and hemodynamically stable, but severe hip pain has not been meaningfully relieved.' };

    if (!strengths.length) strengths.push('You gathered enough information to begin building a clinical picture; use the review below to make the next attempt more systematic.');
    if (!improvements.length && !critical.length) improvements.push('Maintain the same structure next time, but continue emphasizing reassessment after every meaningful treatment or movement.');
    const combinedImprovements = [...critical, ...improvements].filter(Boolean).slice(0, 7);
    const nextFocus = inProgress ? horseBestNextStep(current) : (critical[0] || combinedImprovements[0] || 'Keep using assessment → treatment → reassessment as one continuous loop.');
    const narrative = inProgress
      ? 'This is a progress review, not a final grade. Unfinished sections can still improve your score. Use the Best next step above, return to the patient, and continue the call—or end the scenario now if you want to debrief the choices made so far.'
      : score >= 90
        ? 'The call was organized, clinically coherent, and patient-centered. The strongest feature was linking findings to treatment and then confirming improvement.'
        : score >= 75
          ? 'The overall direction of care was reasonable. The next gain will come from closing the specific assessment/reassessment gaps listed above rather than adding more unrelated actions.'
          : 'The next attempt should focus on a simpler sequence: identify the injury and distal CSM, obtain core vitals/history, support the leg and address pain, move with minimal motion, reassess, then transport and hand off.';

    return { score, label, outcome, categories, strengths:strengths.slice(0,6), improvements:combinedImprovements, critical, nextFocus, narrative, treatments, inProgress };
  }

  function horseGradeTreatmentMarkup(item) {
    const map = {
      'appropriate-effective':['Appropriate','helped'],
      'defensible':['Reasonable with caution','review'],
      'unnecessary':['Not indicated','unnecessary'],
      'contraindicated':['Harmful choice','harmful'],
      'conflicting':['Conflicting plan','review'],
      'premature':['Too early','review'],
      'transport-choice-review':['Review transport choice','review']
    };
    const [label, tone] = map[item?.classification] || ['Recorded','neutral'];
    const response = item?.patientResponse || item?.response || 'No patient response was recorded.';
    return `<div class="horse-grade-treatment-item ${tone}"><div><strong>${escapeHtml(item?.name || item?.treatment || 'Treatment')}</strong><span>${escapeHtml(label)}</span></div><p>${escapeHtml(response)}</p></div>`;
  }

  function renderHorseCallGrade() {
    if (id !== 'horse_crush') return;
    const current = record() || {};
    const grade = buildHorseCallGrade(current);
    const scoreHost = $('horseGradeScore');
    if (scoreHost) scoreHost.innerHTML = `<strong>${grade.score}</strong><span>/100</span>`;
    if ($('horseGradeModeLabel')) $('horseGradeModeLabel').textContent = grade.inProgress ? 'PROGRESS REVIEW' : 'FINAL CALL REVIEW';
    if ($('horseGradeHeaderTitle')) $('horseGradeHeaderTitle').textContent = grade.inProgress ? 'Horse-crush scenario progress' : 'Horse-crush scenario grade';
    if ($('horseGradeHeaderSubtitle')) $('horseGradeHeaderSubtitle').textContent = grade.inProgress ? 'Current performance based only on care documented so far. Return to the call at any time.' : 'Overall review of assessment, decisions, treatment, reassessment, transport, and handoff';
    if ($('horseGradeLabel')) $('horseGradeLabel').textContent = grade.inProgress ? `${grade.score}/100 so far • Scenario still in progress` : grade.label;
    if ($('horseGradeImproveLabel')) $('horseGradeImproveLabel').textContent = grade.inProgress ? 'WHAT TO WORK ON NOW' : 'IMPROVE NEXT TIME';
    if ($('horseGradeImproveTitle')) $('horseGradeImproveTitle').textContent = grade.inProgress ? 'Priority suggestions' : 'Priority suggestions';
    if ($('horseGradeNextLabel')) $('horseGradeNextLabel').textContent = grade.inProgress ? 'BEST NEXT STEP' : 'NEXT-CALL FOCUS';
    if ($('horseGradeOutcome')) $('horseGradeOutcome').innerHTML = `<small>${grade.inProgress ? 'CURRENT PATIENT STATUS' : 'PATIENT OUTCOME'}</small><strong>${escapeHtml(grade.outcome.label)}</strong><p>${escapeHtml(grade.outcome.text)}</p>`;
    if ($('horseGradeCategories')) $('horseGradeCategories').innerHTML = grade.categories.map(category => {
      const percent = Math.round((category.score / category.max) * 100);
      return `<div class="horse-grade-category"><div><strong>${escapeHtml(category.label)}</strong><span>${category.score}/${category.max}</span></div><div class="horse-grade-bar"><i style="width:${Math.max(0, Math.min(100, percent))}%"></i></div></div>`;
    }).join('');
    const listMarkup = items => items.length ? items.map(item => `<li>${escapeHtml(item)}</li>`).join('') : '<li>No major item identified.</li>';
    if ($('horseGradeStrengths')) $('horseGradeStrengths').innerHTML = listMarkup(grade.strengths);
    if ($('horseGradeImprovements')) $('horseGradeImprovements').innerHTML = listMarkup(grade.improvements);
    if ($('horseGradeTreatmentStatus')) $('horseGradeTreatmentStatus').textContent = grade.treatments.length ? `${grade.treatments.length} actions reviewed` : 'No treatments recorded';
    if ($('horseGradeTreatmentList')) $('horseGradeTreatmentList').innerHTML = grade.treatments.length ? grade.treatments.map(horseGradeTreatmentMarkup).join('') : '<p class="horse-grade-empty">No treatment actions were documented.</p>';
    if ($('horseGradeNextFocus')) $('horseGradeNextFocus').textContent = grade.nextFocus;
    if ($('horseGradeNarrative')) $('horseGradeNarrative').textContent = grade.narrative;
  }

  function openHorseCallGrade() {
    if (id !== 'horse_crush') return;
    closeEmbeddedSimulator({ refresh:false });
    closeHorseHospitalHandoff();
    closeScenarioControls();
    horseGradeOpen = true;
    const workspace = $('horseGradeWorkspace');
    if (workspace) workspace.hidden = false;
    document.body.classList.add('horse-grade-open');
    hideHorseClinicalRightRail();
    renderHorseCallGrade();
    const satisfaction = window.EMSCodeSimPatientSatisfactionGrade?.model?.();
    const grade = satisfaction && Number.isFinite(satisfaction.score)
      ? { score:satisfaction.score, label:satisfaction.label }
      : buildHorseCallGrade(record() || {});
    api?.setDocumentation?.({
      scenarioGrade:grade.score,
      scenarioGradeLabel:grade.label,
      gradeCriterion: satisfaction ? 'patient_satisfaction' : 'clinical_call_review',
      gradeViewedAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    });
  }

  function closeHorseCallGrade() {
    horseGradeOpen = false;
    const workspace = $('horseGradeWorkspace');
    if (workspace) workspace.hidden = true;
    document.body.classList.remove('horse-grade-open');
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

  function renderHorseTopQuickActions() {
    if (id !== 'horse_crush') return;
    const current = record() || {};
    const transport = $('transportScenarioQuick');
    const handoff = $('handoffScenarioQuick');
    const grade = $('gradeScenarioQuick');
    const transportDone = Boolean(current.documentation?.transportDecisionAt);
    const handoffDone = Boolean(current.documentation?.handoffSavedAt && current.documentation?.handoff);
    if (transport) {
      transport.classList.toggle('done', transportDone);
      transport.innerHTML = `<span aria-hidden="true">${transportDone ? '✓' : '🚑'}</span> ${transportDone ? 'Transport set' : 'Transport'}`;
    }
    if (handoff) {
      handoff.classList.toggle('done', handoffDone);
      handoff.innerHTML = `<span aria-hidden="true">${handoffDone ? '✓' : '🏥'}</span> ${handoffDone ? 'Handoff done' : 'Handoff'}`;
    }
    if (grade) grade.innerHTML = `<span aria-hidden="true">✓</span> ${horseCallIsComplete(current) ? 'Final grade' : 'Grade / Help'}`;
  }

  function openHorseTransportQuick() {
    if (id !== 'horse_crush') return;
    closeEmbeddedSimulator({ refresh:false });
    closeHorseHospitalHandoff();
    closeHorseCallGrade();
    const group = HORSE_TREATMENT_GROUPS.find(item => item.id === 'transport');
    sceneObservationUpdate = {
      id:`horse-top-transport-${Date.now()}`, type:'TRANSPORT', title:'Transport decision',
      text:group?.instruction || 'Choose Emergent or Non-emergent from the information you have gathered.',
      kind:'transport', sticky:true, recordedAt:new Date().toISOString()
    };
    lastInfoSignature = '';
    renderInfoUpdate(true);
    horseTreatmentActiveGroup = 'transport';
    horseTreatmentActivePlan = '__horse_transport__';
    openSheet('treatmentPanel');
    // openSheet() can rebuild the category menu; force the transport form after it returns.
    horseTreatmentActiveGroup = 'transport';
    horseTreatmentActivePlan = '__horse_transport__';
    if (desktopWorkspace()) renderHorseTreatmentCategoryWorkspace('transport');
  }

  function renderProgress() {
    const current = record();
    renderHorseTopQuickActions();
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
    $('handoffFromProgress').onclick = event => {
      event.preventDefault();
      if (id === 'horse_crush' && desktopWorkspace()) {
        if (record()?.documentation?.transportDecisionAt) openHorseHospitalHandoff(false);
        else openHorseTransportQuick();
        return;
      }
      treatmentCategoryFocus = 'transport';
      if (id === 'horse_crush') horseTreatmentActiveGroup = record()?.documentation?.transportDecisionAt ? 'handoff' : 'transport';
      openSheet('treatmentPanel');
    };
    const handoffSaved = Boolean(current?.documentation?.handoffSavedAt && current?.documentation?.handoff);
    const gradeButton = $('gradeScenarioFromPatient');
    if (gradeButton) {
      gradeButton.hidden = id !== 'horse_crush';
      gradeButton.textContent = handoffSaved ? 'Final grade' : 'Grade / Help';
    }
    const button = $('completeScenarioFromPatient');
    if (id === 'horse_crush') {
      button.textContent = handoffSaved ? 'Open final grade' : (evaluation.essentialComplete ? 'Open debrief' : 'Check completion');
    } else {
      button.textContent = evaluation.essentialComplete ? 'Open debrief' : 'Check completion';
    }
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
    if (id === 'horse_crush' && current?.documentation?.handoffSavedAt) { openHorseCallGrade(); return; }
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
    message.innerHTML = incomplete ? '<strong>Scenario ended with care items outstanding.</strong><span>The call grade will identify the missing and delayed actions.</span>' : '<strong>Essential patient care is complete.</strong><span>Open the call grade to review assessment, treatment, patient response, reassessment, transport, and handoff.</span>';
    if (id === 'horse_crush') { openHorseCallGrade(); return; }
    location.href = toolUrl('/vitals/scenario-debrief.html', 'Patient');
  }

  function updateTimer() {
    const monitorClock = $('desktopMonitorClock'); if (monitorClock) monitorClock.textContent = $('timer')?.textContent || '00:00';
    if (!scenarioStartMs) {
      const startedAt = record()?.startedAt;
      scenarioStartMs = new Date(startedAt || Date.now()).getTime();
    }
    const elapsed = Math.max(0, Math.floor((Date.now() - scenarioStartMs) / 1000));
    $('timer').textContent = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
    if (id === 'horse_crush') {
      const state = horseClinicalState();
      const status = $('patientClockStatus');
      const timerBox = document.querySelector('.vp-timer');
      const preWatch = state?.stage === 'baseline' && elapsed >= 180;
      const level = state?.clockLevel === 'alert' ? 'alert' : (state?.clockLevel === 'watch' || preWatch) ? 'watch' : 'stable';
      if (status) {
        status.textContent = `Patient clock • ${preWatch ? 'pain untreated — reassess care plan' : (state?.clockLabel || 'monitoring')}`;
        status.classList.toggle('clock-watch', level === 'watch');
        status.classList.toggle('clock-alert', level === 'alert');
      }
      timerBox?.classList.toggle('patient-clock-watch', level === 'watch');
      timerBox?.classList.toggle('patient-clock-alert', level === 'alert');
    }
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
      stopInfoSpeech();
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
    stopInfoSpeech();
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
    if (desktopWorkspace()) {
      // visual-patient owns the click (stopImmediatePropagation); this is the
      // authoritative desktop path that must clear Assessment from the right rail.
      if (window.EMSCodeSimDomainWorkspace?.showOnlyDomainPanel) {
        window.EMSCodeSimDomainWorkspace.showOnlyDomainPanel(panelId);
      } else {
        document.body.setAttribute('data-active-domain', panelId);
        document.body.classList.toggle('domain-assessment-active', panelId === 'assessmentPanel');
        document.body.classList.toggle('domain-assessment-suppressed', panelId !== 'assessmentPanel');
        const assessment = $('assessmentPanel');
        if (assessment && panelId !== 'assessmentPanel') {
          assessment.hidden = true;
          assessment.style.setProperty('display', 'none', 'important');
          assessment.setAttribute('inert', '');
        }
      }
    } else {
      document.body.removeAttribute('data-active-domain');
      document.body.classList.remove('domain-assessment-active', 'domain-assessment-suppressed');
    }
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
      }
      buildHistory();
    } else if (panelId === 'treatmentPanel' && id === 'horse_crush') {
      // Keep an already-open category workspace. Rebuilding the menu here made
      // category clicks look dead when another helper re-opened Treatment.
      buildTreatments();
      if (desktopWorkspace()) horseWorkspaceContext?.resetQuestionBox?.();
      showHorsePainReminderIfNeeded();
    } else if (id === 'horse_crush' && desktopWorkspace()) {
      horseTreatmentActiveGroup = '';
      horseTreatmentActivePlan = '';
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
        const questionBox = $('horseClinicalQuestionBox');
        const currentAssessment = $('horseCurrentAssessment');
        // Keep idle follow-up questions in the right clinical workspace. The
        // center info window is owned by the communication column and must not
        // become the parent of Primary/ABC follow-ups.
        if (questionBox && controlColumn) {
          const belongsInCommunication = questionBox.classList.contains('history-active')
            || questionBox.classList.contains('treatment-active');
          if (!belongsInCommunication && questionBox.parentElement !== controlColumn) {
            if (currentAssessment?.parentElement === controlColumn) {
              currentAssessment.insertAdjacentElement('beforebegin', questionBox);
            } else {
              controlColumn.prepend(questionBox);
            }
          }
        }
        if (questionBox && currentAssessment && questionBox.parentElement === controlColumn) {
          questionBox.insertAdjacentElement('afterend', currentAssessment);
        }
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


  let desktopSelectedVitalKey = '';
  let desktopLastLatestId = '';
  const DESKTOP_VITAL_LABELS = {
    blood_pressure:'NIBP', pulse:'HR', respirations:'RR', spo2:'SpO₂',
    blood_glucose:'BGL', temperature:'TEMP', breath_sounds:'LUNGS',
    pupils:'PUPILS', skin:'SKIN', mental_status:'AVPU', gcs:'GCS', pain:'PAIN', breathing:'BREATH', distal_csm:'CSM', motor_sensory:'NEURO', abdominal_assessment:'ABD/PELV', trauma_assessment:'TRAUMA'
  };
  const DESKTOP_MONITOR_PRIMARY_KEYS = ['blood_pressure','pulse','respirations','spo2','blood_glucose','temperature'];
  const DESKTOP_MONITOR_QUICK_KEYS = [
    'breath_sounds','breathing','skin','pupils','mental_status','gcs',
    'distal_csm','motor_sensory','abdominal_assessment','trauma_assessment','pain'
  ];

  function desktopMonitorEventText(event) {
    return String(event?.value || event?.finding || event?.details || event?.description || event?.response || '').trim();
  }

  function renderDesktopPatientMonitor() {
    if (!$('desktopPatientMonitor')) return;
    const current = record() || {};
    const findings = current.findings || {};

    const allMonitorTools = [...(registry?.vitalTools || []), ...(registry?.assessmentTools || [])]
      .filter((tool, index, list) => tool?.key && list.findIndex(row => row.key === tool.key) === index);

    const toolForKey = key => allMonitorTools.find(tool => tool.key === key);
    const renderMonitorTile = (tool, compact = false) => {
      if (!tool) return null;
      const finding = api?.getFinding?.(tool.key, current) || findings[tool.key] || null;
      const state = assessmentState(tool.key);
      const task = partnerTaskFor(tool.key);
      const activeTask = ['active','pending','queued'].includes(task?.status);
      const rawValue = finding ? (finding.value || finding.finding || finding.description || valueFor(tool.key)) : '—';
      const value = String(rawValue || '—');
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = `desktop-monitor-vital desktop-monitor-launcher${compact ? ' compact' : ''}${state.code === 'reassessment-due' ? ' is-due' : ''}`;
      tile.dataset.vitalKey = tool.key;
      const helper = activeTask
        ? (task.status === 'queued' ? 'Partner queued' : `Partner · ${secondsRemaining(task)} sec`)
        : finding ? 'Tap to reassess' : 'Tap to open mini sim';
      tile.innerHTML = `<small>${escapeHtml(DESKTOP_VITAL_LABELS[tool.key] || tool.label)}</small><strong title="${escapeHtml(value)}">${escapeHtml(value)}</strong><span>${escapeHtml(helper)}</span>`;
      tile.addEventListener('click', () => openDesktopVitalAction(tool));
      return tile;
    };

    const host = $('desktopMonitorVitalGrid');
    if (host) {
      host.innerHTML = '';
      DESKTOP_MONITOR_PRIMARY_KEYS.forEach(key => {
        const tile = renderMonitorTile(toolForKey(key));
        if (tile) host.appendChild(tile);
      });
    }

    const quickHost = $('desktopQuickAssessmentGrid');
    if (quickHost) {
      quickHost.innerHTML = '';
      DESKTOP_MONITOR_QUICK_KEYS.forEach(key => {
        const tile = renderMonitorTile(toolForKey(key), true);
        if (tile) quickHost.appendChild(tile);
      });
    }

    const careLog = (api?.listCareLog?.(current, 'all') || current.careLog || []).filter(usefulLogEvent);
    const discoveredConcerns = careLog.filter(event => {
      const key = event.key || event.assessment || event.context || '';
      const f = key ? (api?.getFinding?.(key, current) || findings[key]) : null;
      const text = `${desktopMonitorEventText(event)} ${f?.value || ''} ${f?.finding || ''}`;
      return f?.status === 'abnormal' || f?.normality === 'not-normal' || /abnormal|decreased|absent|weak|rapid|slow|pale|cool|clammy|pain|tender|distress|shortness|dyspnea|bleed|deform|unequal|wors/i.test(text);
    }).slice(-5);
    const concernHost = $('desktopConcernList');
    if (concernHost) {
      concernHost.innerHTML = discoveredConcerns.length ? discoveredConcerns.map(event => `<div class="desktop-concern-item"><strong>${escapeHtml(event.label || labelFor(event.key || event.assessment || event.context || '') || 'Finding')}</strong><span>${escapeHtml(desktopMonitorEventText(event) || 'Abnormal finding documented')}</span></div>`).join('') : '<div class="desktop-monitor-empty">Abnormal findings you discover will appear here.</div>';
    }
    if ($('desktopConcernCount')) $('desktopConcernCount').textContent = `${discoveredConcerns.length} identified`;

    const latest = careLog[careLog.length - 1];
    if ($('desktopLatestFinding')) $('desktopLatestFinding').textContent = latest ? `${latest.label || eventTypeLabel(latest)} — ${desktopMonitorEventText(latest) || 'Recorded'}` : 'No findings documented';
    if ($('desktopLatestTime')) $('desktopLatestTime').textContent = latest ? elapsedLabel(latest.recordedAt, current.startedAt) : '';
    const latestId = latest ? String(latest.id || latest.eventId || latest.recordedAt || '') : '';
    if (latestId && desktopLastLatestId && latestId !== desktopLastLatestId) {
      document.querySelector('.desktop-monitor-latest')?.classList.add('new');
      window.setTimeout(() => document.querySelector('.desktop-monitor-latest')?.classList.remove('new'), 5000);
    }
    desktopLastLatestId = latestId || desktopLastLatestId;

    const tasks = session?.readPartnerTasks?.(id) || {};
    const partnerTask = Object.values(tasks).find(task => ['active','pending'].includes(task?.status)) || Object.values(tasks).find(task => task?.status === 'queued');
    const partnerBox = $('desktopPartnerStatus');
    if (partnerBox) {
      partnerBox.hidden = !partnerTask;
      if (partnerTask) {
        const remain = secondsRemaining(partnerTask);
        if ($('desktopPartnerTask')) $('desktopPartnerTask').textContent = partnerTask.status === 'queued' ? `${partnerTask.label || 'Vital'} queued` : `Obtaining ${String(partnerTask.label || 'vital').toLowerCase()}`;
        if ($('desktopPartnerTime')) $('desktopPartnerTime').textContent = partnerTask.status === 'queued' ? 'Waiting' : `${remain} sec`;
        const total = Math.max(1, Number(partnerTask.delaySeconds || partnerTask.delay || 12));
        if ($('desktopPartnerProgress')) $('desktopPartnerProgress').style.width = `${Math.max(5, Math.min(100, ((total-remain)/total)*100))}%`;
      }
    }

    const dueTools = allMonitorTools.filter(tool => [...DESKTOP_MONITOR_PRIMARY_KEYS, ...DESKTOP_MONITOR_QUICK_KEYS].includes(tool.key) && assessmentState(tool.key).code === 'reassessment-due');
    if ($('desktopMonitorDue')) {
      $('desktopMonitorDue').textContent = dueTools.length ? `↻ RECHECK: ${dueTools.map(tool => DESKTOP_VITAL_LABELS[tool.key] || tool.label).join(' · ')}` : 'No reassessment due';
      $('desktopMonitorDue').classList.toggle('is-due', Boolean(dueTools.length));
    }
  }

  function openDesktopVitalAction(tool) {
    desktopSelectedVitalKey = tool.key;
    const current = record() || {};
    const finding = api?.getFinding?.(tool.key, current) || current.findings?.[tool.key] || null;
    if ($('desktopVitalActionTitle')) $('desktopVitalActionTitle').textContent = tool.label;
    const isPrimaryVital = DESKTOP_MONITOR_PRIMARY_KEYS.includes(tool.key);
    if ($('desktopVitalActionCopy')) $('desktopVitalActionCopy').textContent = finding
      ? `Repeat this ${isPrimaryVital ? 'vital' : 'assessment'} yourself or assign the reassessment to your partner.`
      : `Choose who will perform this ${isPrimaryVital ? 'vital' : 'assessment'}.`;
    if ($('desktopVitalTake')) $('desktopVitalTake').textContent = finding ? 'Reassess myself' : 'Do it myself';
    if ($('desktopVitalPartner')) $('desktopVitalPartner').textContent = finding ? 'Partner reassess' : 'Assign to partner';
    if ($('desktopVitalAction')) $('desktopVitalAction').hidden = false;
  }

  function closeDesktopVitalAction() { desktopSelectedVitalKey = ''; if ($('desktopVitalAction')) $('desktopVitalAction').hidden = true; }

  function desktopSelectedVitalTool() {
    return [...(registry?.vitalTools || []), ...(registry?.assessmentTools || [])]
      .find(tool => tool.key === desktopSelectedVitalKey);
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
    renderDesktopPatientMonitor();
    renderUnifiedClinicalBar();
    renderHorseReassessmentCue();
    updateCounts();
    renderHorseTopQuickActions();
    if (force || signatures.progress !== renderSignatures.progress) {
      renderProgress();
      renderSignatures.progress = signatures.progress;
    }
    const horseIntroVideo = id === 'horse_crush' && document.body.dataset.horseIntro === 'video';
    $('dispatch').textContent = horseIntroVideo ? '' : (current.dispatch || scenario.title);
    $('scene').textContent = horseIntroVideo ? '' : (current.scene || '');
    renderInfoUpdate();
    if (horseHandoffOpen) renderHorseHospitalHandoff();
    if (horseGradeOpen) renderHorseCallGrade();
    updateTimer();
    restoreSheetScroll(sheetScrollTop);
  }

  const embeddedSimPaths = new Set([
    ...(registry?.vitalTools || []).map(tool => tool.url),
    ...(registry?.assessmentTools || []).map(tool => tool.url)
  ].filter(Boolean).filter(path => path !== '/vitals/visual-patient.html'));

  function desktopScenarioMode() {
    return window.matchMedia?.('(min-width: 980px)')?.matches === true;
  }

  function embeddedToolTitle(anchor, url) {
    const datasetKey = anchor?.dataset?.assessmentKey || anchor?.dataset?.toolKey || '';
    const matching = [...(registry?.vitalTools || []), ...(registry?.assessmentTools || [])]
      .find(item => item.key === datasetKey || item.url === url.pathname);
    return matching?.label || anchor?.textContent?.trim() || 'Assessment simulator';
  }

  function embeddedToolKey(anchor, url) {
    const datasetKey = anchor?.dataset?.assessmentKey || anchor?.dataset?.toolKey || '';
    const matching = [...(registry?.vitalTools || []), ...(registry?.assessmentTools || [])]
      .find(item => item.key === datasetKey || item.url === url.pathname);
    return matching?.key || datasetKey || '';
  }


  let embeddedRecordSignature = '';
  let embeddedCompletionTimer = 0;
  let embeddedCloseTimer = 0;
  let embeddedOpenGeneration = 0;
  let embeddedOpenedKey = '';

  function embeddedSimKeyFromFrame() {
    try {
      const path = $('embeddedSimFrame')?.contentWindow?.location?.pathname || '';
      const matching = [...(registry?.vitalTools || []), ...(registry?.assessmentTools || [])]
        .find(item => item.url === path);
      return matching?.key || embeddedOpenedKey || '';
    } catch (_) {
      return embeddedOpenedKey || '';
    }
  }

  function embeddedWatchedFindingSignature(key = embeddedSimKeyFromFrame()) {
    if (!key) return '';
    try {
      const finding = (record() || {}).findings?.[key];
      return JSON.stringify(finding || null);
    } catch (_) { return ''; }
  }

  function cancelEmbeddedAutoClose() {
    clearInterval(embeddedCompletionTimer);
    embeddedCompletionTimer = 0;
    window.clearTimeout(embeddedCloseTimer);
    embeddedCloseTimer = 0;
  }

  function queueEmbeddedAutoClose(delay = 180) {
    const generation = embeddedOpenGeneration;
    window.clearTimeout(embeddedCloseTimer);
    embeddedCloseTimer = window.setTimeout(() => {
      embeddedCloseTimer = 0;
      if (generation !== embeddedOpenGeneration) return;
      closeEmbeddedSimulator({ refresh:true, generation });
      toast('Assessment saved');
    }, delay);
  }

  function armEmbeddedCompletionWatcher() {
    cancelEmbeddedAutoClose();
    const generation = embeddedOpenGeneration;
    const watchedKey = embeddedSimKeyFromFrame();
    const armedAt = Date.now();
    // Only watch the finding this mini-sim is supposed to write. Partner tasks,
    // the patient clock, and other vitals must not close a long cuff check.
    if (!watchedKey) return;
    embeddedRecordSignature = embeddedWatchedFindingSignature(watchedKey);
    embeddedCompletionTimer = window.setInterval(() => {
      if (generation !== embeddedOpenGeneration) {
        clearInterval(embeddedCompletionTimer);
        embeddedCompletionTimer = 0;
        return;
      }
      const workspace = $('embeddedSimWorkspace');
      if (!workspace || workspace.hidden) {
        clearInterval(embeddedCompletionTimer);
        embeddedCompletionTimer = 0;
        return;
      }
      const next = embeddedWatchedFindingSignature(watchedKey);
      if (Date.now() - armedAt < 450) {
        embeddedRecordSignature = next || embeddedRecordSignature;
        return;
      }
      if (next && next !== 'null' && next !== embeddedRecordSignature) {
        clearInterval(embeddedCompletionTimer);
        embeddedCompletionTimer = 0;
        queueEmbeddedAutoClose(180);
      }
      embeddedRecordSignature = next || embeddedRecordSignature;
    }, 350);
  }

  function handleEmbeddedSimulatorComplete(event) {
    const data = event?.data;
    if (!data || typeof data !== 'object') return;
    if (!['ems-sim-complete','ems-assessment-saved','ems-vital-saved'].includes(data.type)) return;
    const frame = $('embeddedSimFrame');
    if (frame?.contentWindow && event.source !== frame.contentWindow) return;
    const generation = embeddedOpenGeneration;
    clearInterval(embeddedCompletionTimer);
    if (generation !== embeddedOpenGeneration) return;
    closeEmbeddedSimulator({refresh:true, generation});
    toast(data.label ? `${data.label} saved` : 'Assessment saved');
  }
  window.addEventListener('emscodesim:embedded-sim-opened', () => {
    embeddedOpenGeneration += 1;
    cancelEmbeddedAutoClose();
  });
  window.addEventListener('message', handleEmbeddedSimulatorComplete);

  function closeEmbeddedSimulator(options = {}) {
    const generation = Number.isInteger(options.generation) ? options.generation : embeddedOpenGeneration;
    cancelEmbeddedAutoClose();
    if (generation !== embeddedOpenGeneration) return;
    const workspace = $('embeddedSimWorkspace');
    const frame = $('embeddedSimFrame');
    if (!workspace || workspace.hidden) return;
    workspace.hidden = true;
    document.body.classList.remove('sim-workspace-open');
    if (generation !== embeddedOpenGeneration) {
      workspace.hidden = false;
      document.body.classList.add('sim-workspace-open');
      return;
    }
    if (frame) frame.src = 'about:blank';
    if (options.refresh !== false) {
      window.setTimeout(() => {
        if (generation !== embeddedOpenGeneration) return;
        refreshFromRecord({ force:true });
      }, 40);
    }
  }

  function openEmbeddedSimulator(href, title = 'Assessment simulator', toolKey = '') {
    if (!desktopScenarioMode()) return false;
    const workspace = $('embeddedSimWorkspace');
    const frame = $('embeddedSimFrame');
    if (!workspace || !frame) return false;
    let url;
    try { url = new URL(href, location.href); } catch { return false; }
    if (url.origin !== location.origin || !embeddedSimPaths.has(url.pathname)) return false;
    url.searchParams.set('embedded', '1');
    url.searchParams.set('autosaveclose', '1');
    url.searchParams.set('resume', '1');
    url.searchParams.set('case', id);
    url.searchParams.set('mode', 'scenario');
    url.searchParams.set('training', trainingMode());
    if (toolKey && !url.searchParams.get('key') && !url.searchParams.get('context')) {
      url.searchParams.set('key', toolKey);
      url.searchParams.set('context', toolKey);
    }
    url.searchParams.set('return', `/vitals/visual-patient.html?case=${encodeURIComponent(id)}&training=${encodeURIComponent(trainingMode())}&embeddedReturn=1`);
    const titleNode = $('embeddedSimTitle');
    if (titleNode) titleNode.textContent = title;
    embeddedOpenGeneration += 1;
    embeddedOpenedKey = toolKey || embeddedToolKey(null, url) || '';
    cancelEmbeddedAutoClose();
    workspace.hidden = false;
    document.body.classList.add('sim-workspace-open');
    embeddedRecordSignature = embeddedWatchedFindingSignature(embeddedOpenedKey);
    frame.src = url.toString();
    armEmbeddedCompletionWatcher();
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
    if (openEmbeddedSimulator(url.toString(), embeddedToolTitle(anchor, url), embeddedToolKey(anchor, url))) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  $('closeEmbeddedSim')?.addEventListener('click', () => closeEmbeddedSimulator());
  function fitEmbeddedSimulatorToPane() {
    const frame = $('embeddedSimFrame');
    if (!frame || frame.src === 'about:blank' || !desktopScenarioMode()) return;
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      const root = doc.documentElement;
      const body = doc.body;
      if (!root || !body) return;
      if (body.classList.contains('ems-embedded-mini-sim')) return;

      root.dataset.emsEmbeddedFit = 'true';

      let style = doc.getElementById('emsEmbeddedAutoFitStyle');
      if (!style) {
        style = doc.createElement('style');
        style.id = 'emsEmbeddedAutoFitStyle';
        style.textContent = `
          html[data-ems-embedded-fit="true"]{
            width:100%!important;height:100%!important;min-height:100%!important;
            overflow:hidden!important;background:#07131f!important;
          }
          html[data-ems-embedded-fit="true"] body{
            width:100%!important;height:100%!important;min-height:100%!important;
            margin:0!important;max-width:none!important;transform:none!important;
            zoom:1!important;position:relative!important;left:0!important;top:0!important;
            overflow:auto!important;background:#07131f!important;
          }
          html[data-ems-embedded-fit="true"] .sv-main{
            width:100%!important;max-width:none!important;
            min-height:calc(100vh - 52px)!important;margin:0!important;
            padding:9px 10px 12px!important;gap:9px!important;
          }
          html[data-ems-embedded-fit="true"] .sv-topbar{
            padding-top:6px!important;padding-bottom:7px!important;
          }
          html[data-ems-embedded-fit="true"] .sv-card{
            width:100%!important;max-width:none!important;padding:11px!important;
          }
          html[data-ems-embedded-fit="true"] .sv-stage{
            width:100%!important;min-height:clamp(260px,46vh,430px)!important;padding:10px!important;
          }
          html[data-ems-embedded-fit="true"] .va-shell{
            width:100%!important;max-width:none!important;min-height:100%!important;
            margin:0!important;padding:8px!important;
          }
          html[data-ems-embedded-fit="true"] .va-stage{
            min-height:calc(100vh - 90px)!important;
          }
          html[data-ems-embedded-fit="true"] main,
          html[data-ems-embedded-fit="true"] .app,
          html[data-ems-embedded-fit="true"] .wrap,
          html[data-ems-embedded-fit="true"] .container,
          html[data-ems-embedded-fit="true"] .page,
          html[data-ems-embedded-fit="true"] .sim-shell,
          html[data-ems-embedded-fit="true"] .learning-shell{
            max-width:none!important;
          }
        `;
        doc.head?.appendChild(style);
      }

      body.style.transform = 'none';
      body.style.zoom = '1';
      body.style.width = '100%';
      body.style.height = '100%';
      body.style.left = '0';
      body.style.top = '0';
      body.style.position = 'relative';
      body.dataset.emsFitScale = '1.000';
      body.dataset.emsFitMode = 'full-photo-area';
    } catch (_) {}
  }

  function installEmbeddedSaveBridge() {
    const frame = $('embeddedSimFrame');
    try {
      const win = frame?.contentWindow;
      const doc = frame?.contentDocument;
      if (!win || !doc || win.__emsSaveBridgeInstalled) return;
      win.__emsSaveBridgeInstalled = true;

      // Generic save/record/submit controls: after the sim's own handler runs,
      // allow record watcher to detect the change. If the sim explicitly marks
      // completion, close immediately.
      doc.addEventListener('click', event => {
        const control = event.target?.closest?.('button,input[type="submit"],[role="button"]');
        if (!control) return;
        const label = String(control.textContent || control.value || '').trim().toLowerCase();
        if (!/(save|record|submit|complete|document|done|use result|return to patient)/.test(label)) return;
        const generation = embeddedOpenGeneration;
        window.clearTimeout(embeddedCloseTimer);
        embeddedCloseTimer = window.setTimeout(() => {
          embeddedCloseTimer = 0;
          if (generation !== embeddedOpenGeneration) return;
          const next = embeddedWatchedFindingSignature();
          if (next && next !== 'null' && next !== embeddedRecordSignature) {
            closeEmbeddedSimulator({ refresh:true, generation });
            toast('Assessment saved');
          }
        }, 220);
      }, true);
    } catch (_) {}
  }

  function scheduleEmbeddedFit() {
    window.clearTimeout(window.__emsEmbeddedFitTimer);
    window.__emsEmbeddedFitTimer = window.setTimeout(fitEmbeddedSimulatorToPane, 60);
  }

  $('embeddedSimFrame')?.addEventListener('load', () => {
    const frame = $('embeddedSimFrame');
    if (!frame || frame.src === 'about:blank') return;
    const generation = embeddedOpenGeneration;
    try {
      const current = frame.contentWindow?.location;
      if (generation !== embeddedOpenGeneration) return;
      if (current?.pathname === '/vitals/visual-patient.html') {
        closeEmbeddedSimulator({ generation });
      } else {
        installEmbeddedSaveBridge();
        armEmbeddedCompletionWatcher();
        scheduleEmbeddedFit();
      }
    } catch (_) {
      // All embedded tools are same-origin; ignore transient navigation access errors.
    }
  });

  window.addEventListener('resize', () => {
    if (!desktopScenarioMode()) closeEmbeddedSimulator({ refresh:false });
    else if (!$('embeddedSimWorkspace')?.hidden) scheduleEmbeddedFit();
  });

  if (params.get('reset') === '1') {
    try {
      api?.clear?.();
      const partnerKey = session?.partnerTaskKey?.(id);
      [
        partnerKey,
        partnerKey && `${partnerKey}_backup`,
        partnerKey && `${partnerKey}_shadow`,
        `emscodesim_scenario_${id}`,
        `emscodesim_scenario_${id}_backup`,
        `emscodesim_scenario_${id}_shadow`
      ].filter(Boolean).forEach(key => localStorage.removeItem(key));
      [...Object.keys(sessionStorage)].filter(key => key.startsWith('emscodesim:communications:')).forEach(key => sessionStorage.removeItem(key));
      params.delete('reset');
      const cleanQuery = params.toString();
      history.replaceState(null, '', `${location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}${location.hash}`);
    } catch (error) {
      console.error('Fresh scenario reset failed', error);
    }
  }

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
    if (treatmentSub) treatmentSub.textContent = 'Choose treatment, movement, packaging, comfort, and reassessment actions as you would on a real call. On a computer, Transport and Handoff are available in the quick-action row above the patient.';
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
  $('closeHospitalHandoff')?.addEventListener('click', closeHorseHospitalHandoff);
  $('showSampleHospitalHandoff')?.addEventListener('click', () => { horseHandoffSampleOpen = true; renderHorseHospitalHandoff(); });
  $('closeSampleHospitalHandoff')?.addEventListener('click', () => { horseHandoffSampleOpen = false; renderHorseHospitalHandoff(); });
  $('saveHospitalHandoff')?.addEventListener('click', saveHorseHospitalHandoff);
  $('openHorseCallGrade')?.addEventListener('click', openHorseCallGrade);
  $('closeHorseCallGrade')?.addEventListener('click', closeHorseCallGrade);
  $('horseGradeReturn')?.addEventListener('click', closeHorseCallGrade);
  $('horseGradeEndScenario')?.addEventListener('click', () => { if (window.confirm('End this scenario and return to scenario selection?')) endScenario(); });
  $('gradeScenarioFromPatient')?.addEventListener('click', openHorseCallGrade);
  $('transportScenarioQuick')?.addEventListener('click', openHorseTransportQuick);
  $('handoffScenarioQuick')?.addEventListener('click', () => openHorseHospitalHandoff(false));
  $('gradeScenarioQuick')?.addEventListener('click', openHorseCallGrade);
  window.EMSCodeSimHorseEncounterActions = Object.freeze({
    openTransport: openHorseTransportQuick,
    openHandoff: (sample = false) => openHorseHospitalHandoff(Boolean(sample)),
    openGrade: openHorseCallGrade,
    closeHandoff: closeHorseHospitalHandoff
  });
  $('hospitalHandoffDraft')?.addEventListener('input', event => { event.currentTarget.dataset.userEdited = 'true'; });
  if ($('recordTreatmentLink')) $('recordTreatmentLink').href = toolUrl('/vitals/treatment-reassessment.html', 'Patient', 'general');
  if ($('fullPatientRecordLink')) $('fullPatientRecordLink').href = `/vitals/patient-record.html?mode=scenario&resume=1&case=${encodeURIComponent(id)}&return=${encodeURIComponent(`/vitals/visual-patient.html?case=${id}`)}`;
  $('guidedSampleLink').href = toolUrl('/vitals/sample-history.html', 'Patient', 'sample');
  $('guidedOpqrstLink').href = toolUrl('/vitals/pain-opqrst.html', 'Patient', 'pain');
  window.EMSCodeSimHorseCrush?.init?.();
  refreshFromRecord();

  document.querySelectorAll('[data-log-filter]').forEach(button => button.addEventListener('click', () => {
    findingFilter = button.dataset.logFilter || 'all';
    renderFindings();
  }));
  document.querySelectorAll('[data-log-view]').forEach(button => button.addEventListener('click', () => {
    findingView = button.dataset.logView === 'category' ? 'category' : 'time';
    renderFindings();
  }));
  updateInfoVoiceControls();
  $('infoUpdateVoiceToggle')?.addEventListener('click', event => {
    event.stopPropagation();
    setInfoVoiceAuto(!infoVoiceAuto);
  });
  $('infoUpdateReplay')?.addEventListener('click', event => {
    event.stopPropagation();
    const item = infoUpdates[infoUpdateIndex];
    if (!item) return;
    if (!speakInfoUpdate(item, { replay:true })) toast('This browser could not read the current update aloud.');
  });
  window.addEventListener('pagehide', stopInfoSpeech);

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
  document.addEventListener('click', event => {
    const origin = eventElement(event);
    const button = origin?.closest?.('.bottom-nav button[data-panel]');
    if (!button || button.hidden || button.classList.contains('desktop-domain-hidden')) return;
    if (origin?.closest?.('#treatmentTools, #assessmentTools, #historyCategoryList, #vitalTools')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    hideClinicalNextActions();
    openSheet(button.dataset.panel);
  }, true);
  document.addEventListener('pointerup', event => {
    if (id !== 'horse_crush' || event.button) return;
    if (activateHorseTreatmentGroupFromEvent(event)) return;
    const origin = eventElement(event);
    if (origin?.closest?.('#horseOpenTransport, #horseOpenHandoff, [data-horse-endpoint]')) return;
    const planButton = origin?.closest?.('[data-horse-workspace-plan]');
    if (!planButton || planButton.hidden || planButton.disabled) return;
    if (!planButton.closest('#treatmentTools.horse-treatment-category-workspace')) return;
    if (horseTreatmentActivePlan === (planButton.dataset.horseWorkspacePlan || '')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    planButton.click();
  }, true);
  document.addEventListener('click', event => {
    if (id !== 'horse_crush') return;
    activateHorseTreatmentGroupFromEvent(event);
  }, true);
  $('clinicalNextTreatment')?.addEventListener('click', () => {
    treatmentCategoryFocus = nextTreatmentCategoryForFinding(nextActionFinding?.key || '');
    hideClinicalNextActions();
    openSheet('treatmentPanel');
  });
  $('clinicalNextVitals')?.addEventListener('click', () => { hideClinicalNextActions(); openSheet('vitalsPanel'); });
  $('clinicalNextPatient')?.addEventListener('click', () => { hideClinicalNextActions(); closeSheet(); });
  $('clinicalNextUncertain')?.addEventListener('click', () => recordUncertainty(nextActionFinding || {}));
  $('clinicalNextClose')?.addEventListener('click', hideClinicalNextActions);

  $('desktopVitalTake')?.addEventListener('click', () => {
    const tool = desktopSelectedVitalTool(); if (!tool) return;
    const current = record() || {}; const finding = api?.getFinding?.(tool.key, current) || current.findings?.[tool.key];
    let href = toolUrl(tool.url); if (finding) { const u = new URL(href, location.origin); u.searchParams.set('reassess','1'); href = `${u.pathname}${u.search}${u.hash}`; }
    closeDesktopVitalAction(); if (!openEmbeddedSimulator(href, `${tool.label}${finding ? ' reassessment' : ''}`, tool.key)) location.href = href;
  });
  $('desktopVitalPartner')?.addEventListener('click', () => {
    const tool = desktopSelectedVitalTool(); if (!tool) return;
    try {
      const current = record() || {};
      const existing = api?.getFinding?.(tool.key, current) || current.findings?.[tool.key];
      const partnerValue = valueFor(tool.key) || existing?.value || existing?.finding || existing?.description || 'Recorded';
      session?.assignPartnerTask?.({ key:tool.key, label:tool.label, value:partnerValue, delaySeconds:tool.delay || 12 }, id);
      closeDesktopVitalAction(); renderSignatures.vitals=''; refreshFromRecord(); toast(`${tool.label} assigned to partner`);
    }
    catch(error){ console.error(error); toast('Partner task could not be assigned.'); }
  });
  $('desktopVitalCancel')?.addEventListener('click', closeDesktopVitalAction);
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
  function resetScenarioVisualOverlaysOnStartup() {
    const workspace = $('embeddedSimWorkspace');
    const frame = $('embeddedSimFrame');
    if (workspace) workspace.hidden = true;
    if (frame) frame.src = 'about:blank';
    document.body.classList.remove('sim-workspace-open');
    ['hospitalHandoffWorkspace','horseGradeWorkspace','desktopVitalAction','assessmentFocus','scenarioControlDialog','clinicalNextActions'].forEach(key => {
      const node = $(key); if (node) node.hidden = true;
    });
    const image = $('patientImage');
    if (image) { image.hidden = false; image.style.removeProperty('display'); image.style.removeProperty('visibility'); image.style.removeProperty('opacity'); }
  }
  resetScenarioVisualOverlaysOnStartup();
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
