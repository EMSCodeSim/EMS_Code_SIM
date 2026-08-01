(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const api = window.EMSCodeSimPatientRecord;
  const session = window.EMSCodeSimScenarioSession;
  const runtime = window.EMSCodeSimScenarioRuntime;
  const registry = window.EMSCodeSimToolRegistry;
  const params = new URLSearchParams(location.search);
  const STORAGE_KEY = 'emscodesim-treatment-reassessment-v2';
  const scenarioRecord = session?.sync?.() || api?.active?.();
  const scenarioMode = Boolean(scenarioRecord && (params.get('mode') === 'scenario' || params.get('case')));
  const scenarioId = scenarioRecord?.scenarioId || scenarioRecord?.id || '';
  const context = params.get('context') || 'general';
  const returnTo = registry?.safeReturn?.(params.get('return'), '') || (scenarioId ? `/vitals/visual-patient.html?case=${encodeURIComponent(scenarioId)}` : '/vitals/scenario-launcher.html');
  const returnLabel = params.get('returnLabel') || 'patient scenario';

  const TREATMENTS = [
    ['monitor', 'No immediate treatment — continue monitoring and reassessment', 'All levels'],
    ['position', 'Open/reposition airway: head-tilt/chin-lift or jaw-thrust as indicated', 'EMT'],
    ['suction', 'Clear and suction the airway', 'EMT'],
    ['opa', 'Insert an oropharyngeal airway when indicated', 'EMT'],
    ['npa', 'Insert a nasopharyngeal airway when indicated', 'EMT / protocol'],
    ['fbao', 'Treat severe foreign-body airway obstruction', 'EMT'],
    ['oxygen', 'Administer oxygen using the appropriate device', 'EMT'],
    ['bvm', 'Assist ventilations with BVM and oxygen', 'EMT'],
    ['cpap', 'Apply CPAP when indicated and permitted', 'EMT / protocol'],
    ['lma', 'Insert a supraglottic airway / LMA', 'Advanced / protocol'],
    ['intubation', 'Perform endotracheal intubation', 'Paramedic / protocol'],
    ['cric', 'Perform emergency surgical airway', 'Advanced rescue / protocol'],
    ['glucose', 'Administer oral glucose if swallowing is safe', 'EMT / protocol'],
    ['naloxone', 'Administer naloxone and support ventilation', 'EMT / protocol'],
    ['epi', 'Administer epinephrine for anaphylaxis per protocol', 'EMT / protocol'],
    ['bleeding', 'Control major bleeding with pressure, packing, or tourniquet', 'EMT'],
    ['shock', 'Treat for shock, prevent heat loss, and expedite transport', 'EMT'],
    ['rapid', 'Rapid transport / request ALS while continuing supportive care', 'All levels']
  ];

  const EXPECTED = [
    ['stable', 'No deterioration; airway and breathing remain stable'],
    ['airway', 'Improved air movement or reduced obstruction sounds'],
    ['ventilation', 'Improved chest rise, rate, mental status, or ventilation'],
    ['oxygenation', 'Improved SpO₂, color, speech, or respiratory distress'],
    ['mentation', 'Improved mental status and ability to protect the airway'],
    ['perfusion', 'Improved pulse, skin, blood pressure, or capillary refill'],
    ['bleeding', 'Bleeding controlled with improved perfusion trend'],
    ['escalate', 'Little or no improvement; prepare escalation and transport']
  ];

  const NEXT = [
    ['monitor', 'Continue monitoring and repeat focused assessment'],
    ['repeat', 'Repeat or adjust the current treatment and reassess'],
    ['basic-airway', 'Add or change a basic airway adjunct'],
    ['advanced-airway', 'Escalate to advanced airway / ALS support'],
    ['ventilate', 'Begin or improve BVM ventilations'],
    ['transport', 'Expedite transport and communicate patient changes'],
    ['revise', 'Revise the working impression and treatment plan']
  ];

  const STANDALONE_CASES = [
    { title: 'Asthma with hypoxia', dispatch: 'Worsening shortness of breath.', history: 'Known asthma; rescue inhaler used twice.', initial: [['Respirations','30/min, labored'],['SpO₂','89%'],['Speech','Short phrases'],['Breath sounds','Wheezes']], repeat: [['Respirations','22/min, less labored'],['SpO₂','95%'],['Speech','Full sentences'],['Breath sounds','Improved wheeze']], treatment: 'oxygen', expected: 'oxygenation', response: 'improved', next: 'monitor' },
    { title: 'Opioid-associated respiratory failure', dispatch: 'Unresponsive patient.', history: 'Slow shallow respirations and pinpoint pupils.', initial: [['Respirations','6/min, shallow'],['SpO₂','82%'],['Mental status','Responds to pain']], repeat: [['Respirations','12/min assisted'],['SpO₂','96%'],['Mental status','Responds to voice']], treatment: 'bvm', expected: 'ventilation', response: 'improved', next: 'monitor' },
    { title: 'Major bleeding with poor perfusion', dispatch: 'Traumatic extremity injury.', history: 'Active severe bleeding.', initial: [['Pulse','132 weak'],['Skin','Pale, cool, clammy'],['Blood pressure','88/54']], repeat: [['Bleeding','Controlled'],['Pulse','116'],['Blood pressure','96/60']], treatment: 'bleeding', expected: 'bleeding', response: 'improved', next: 'transport' }
  ];

  const state = { done: { how: false, why: false, practice: false }, applied: false, current: null };

  function loadProgress() {
    try { Object.assign(state.done, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); } catch {}
  }
  function saveProgress() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.done)); }
  function progress() {
    const count = Object.values(state.done).filter(Boolean).length;
    $('progressText').textContent = `${count} of 3 lessons complete`;
    $('progressBar').style.width = `${(count / 3) * 100}%`;
    document.querySelectorAll('.completion-btn').forEach(button => {
      const done = Boolean(state.done[button.dataset.complete]);
      button.classList.toggle('is-complete', done);
      button.textContent = done ? 'Completed ✓' : `Mark ${button.dataset.complete.toUpperCase()} complete`;
    });
  }

  function optionList(selectId, entries) {
    const select = $(selectId);
    select.innerHTML = '<option value="">Select one</option>' + entries.map(([value, label, scope]) => `<option value="${value}">${label}${scope ? ` — ${scope}` : ''}</option>`).join('');
  }

  function findingValue(key) {
    const finding = api?.getFinding?.(key, scenarioRecord);
    return finding?.value || finding?.finding || runtime?.formatVital?.(key) || '';
  }

  function scenarioCase() {
    const airwayFinding = api?.getFinding?.('airway', scenarioRecord);
    const breathingFinding = api?.getFinding?.('breathing', scenarioRecord);
    const initial = [];
    if (airwayFinding) initial.push(['Airway', airwayFinding.value || airwayFinding.finding]);
    if (breathingFinding) initial.push(['Breathing', breathingFinding.value || breathingFinding.finding]);
    ['respirations','breath_sounds','spo2','pulse','blood_pressure','skin','mental_status','blood_glucose'].forEach(key => {
      const value = findingValue(key);
      if (value) initial.push([api?.labelFor?.(key) || key, value]);
    });
    if (!initial.length) initial.push(['Assessment status','No findings recorded yet — return to assessment if more information is needed.']);

    const expectedByContext = {
      airway: { asthma:'monitor', stroke:'monitor', hypoglycemia:'monitor', trauma:'suction', pediatric:'oxygen' },
      breathing: { asthma:'oxygen', stroke:'monitor', hypoglycemia:'monitor', trauma:'oxygen', pediatric:'bvm' },
      perfusion: { asthma:'monitor', stroke:'monitor', hypoglycemia:'monitor', trauma:'shock', pediatric:'shock' },
      general: { asthma:'oxygen', stroke:'rapid', hypoglycemia:'glucose', trauma:'shock', pediatric:'oxygen' }
    };
    const treatment = expectedByContext[context]?.[scenarioId] || expectedByContext.general[scenarioId] || 'monitor';
    const expected = treatment === 'monitor' ? 'stable' : ['position','suction','opa','npa','fbao','lma','intubation','cric'].includes(treatment) ? 'airway' : treatment === 'bvm' ? 'ventilation' : ['oxygen','cpap','epi'].includes(treatment) ? 'oxygenation' : treatment === 'glucose' ? 'mentation' : ['bleeding','shock'].includes(treatment) ? 'perfusion' : 'escalate';
    const response = treatment === 'monitor' ? 'unchanged' : 'improved';
    const next = ['lma','intubation','cric'].includes(treatment) ? 'transport' : treatment === 'monitor' ? 'monitor' : ['suction','position','opa','npa'].includes(treatment) ? 'monitor' : 'transport';

    const repeatByScenario = {
      asthma: [['Respirations','24/min, less labored'],['SpO₂','95%'],['Speech','Longer phrases']],
      stroke: [['Airway','Remains patent'],['Mental status','No acute deterioration'],['Transport','Stroke alert initiated']],
      hypoglycemia: [['Mental status','More alert when treatment is appropriate'],['Blood glucose','Improving trend'],['Airway','Remains protected']],
      trauma: [['Airway','Gurgling reduced after suction'],['SpO₂','Improved with support'],['Perfusion','Remains concerning; transport expedited']],
      pediatric: [['Work of breathing','Reassessed after support'],['SpO₂','Improving'],['Interaction','Slightly improved']]
    };

    return {
      title: `${scenarioRecord?.title || 'Active patient'} — ${context === 'general' ? 'treatment decision' : `${context} treatment`}`,
      dispatch: scenarioRecord?.dispatch || 'Active EMS patient',
      history: `Use only treatments supported by the findings and your level of care. Advanced airway choices are included for decision practice and remain protocol-dependent.`,
      initial,
      repeat: repeatByScenario[scenarioId] || [['Patient','Reassess the finding treated'],['Vitals','Repeat relevant measurements']],
      treatment, expected, response, next
    };
  }

  function insertScenarioContext() {
    if (!scenarioMode || document.getElementById('activeTreatmentContext')) return;
    const section = document.createElement('section');
    section.id = 'activeTreatmentContext';
    section.className = 'scenario-treatment-context';
    const sourceFinding = context === 'airway' ? api?.getFinding?.('airway', scenarioRecord) : context === 'breathing' ? api?.getFinding?.('breathing', scenarioRecord) : context === 'perfusion' ? api?.getFinding?.('perfusion', scenarioRecord) : null;
    section.innerHTML = `<p class="eyebrow">Active patient treatment</p><h2>${context === 'general' ? 'Choose care from the complete treatment range' : `Treat the recorded ${context} finding`}</h2><p>${sourceFinding ? `<strong>Recorded finding:</strong> ${sourceFinding.value || sourceFinding.finding}` : 'Review the patient findings before selecting an intervention.'}</p><div class="scope-key"><span>EMT</span><span>Protocol dependent</span><span>Advanced / paramedic</span></div>`;
    $('practicePanel').insertBefore(section, $('practicePanel').querySelector('.scenario-card'));
  }

  function insertReturnNavigation() {
    if (!scenarioMode || document.getElementById('treatmentReturnNav')) return;
    const nav = document.createElement('div');
    nav.id = 'treatmentReturnNav';
    nav.className = 'scenario-treatment-nav';
    nav.innerHTML = `<a class="primary-btn" href="${returnTo}">Return to ${returnLabel}</a><a class="secondary-btn" href="${session?.scenarioHome?.(scenarioId) || `/vitals/visual-patient.html?case=${encodeURIComponent(scenarioId)}`}">Patient home</a>`;
    $('practicePanel').appendChild(nav);
  }

  function renderCase(current) {
    state.current = current;
    $('caseTitle').textContent = current.title;
    $('dispatchText').textContent = `Dispatch: ${current.dispatch}`;
    $('historyText').textContent = current.history;
    $('initialFindings').innerHTML = current.initial.map(([label, value]) => `<div class="finding-item"><strong>${label}</strong><span>${value}</span></div>`).join('');
    $('repeatFindings').innerHTML = current.repeat.map(([label, value]) => `<div class="finding-item"><strong>${label}</strong><span>${value}</span></div>`).join('');
    optionList('treatmentSelect', TREATMENTS);
    optionList('expectedSelect', EXPECTED);
    optionList('nextSelect', NEXT);
    $('treatmentForm').reset();
    $('repeatSection').hidden = true;
    $('resultsPanel').hidden = true;
    state.applied = false;
  }

  function fresh() {
    if (scenarioMode) { renderCase(scenarioCase()); return; }
    let next = STANDALONE_CASES[Math.floor(Math.random() * STANDALONE_CASES.length)];
    while (STANDALONE_CASES.length > 1 && next === state.current) next = STANDALONE_CASES[Math.floor(Math.random() * STANDALONE_CASES.length)];
    renderCase(next);
  }

  document.querySelectorAll('.lesson-tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.lesson-tab').forEach(item => item.classList.toggle('is-active', item === tab));
    document.querySelectorAll('.lesson-panel').forEach(panel => {
      const active = panel.id === tab.dataset.panel;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
  }));
  document.querySelectorAll('.completion-btn').forEach(button => button.addEventListener('click', () => {
    state.done[button.dataset.complete] = true;
    saveProgress();
    progress();
  }));

  $('checkWhy').addEventListener('click', () => {
    const value = document.querySelector('input[name="whyQuestion"]:checked')?.value;
    $('whyFeedback').textContent = value === 'strong' ? 'Correct. Objective before-and-after findings show exactly how the patient responded.' : value ? 'Try again. Document measurable repeat findings, not only a general impression.' : 'Choose an answer first.';
    if (value === 'strong') { state.done.why = true; saveProgress(); progress(); }
  });

  $('applyTreatment').addEventListener('click', () => {
    if (!$('treatmentSelect').value || !$('expectedSelect').value) {
      alert('Select a treatment and expected response first.');
      return;
    }
    state.applied = true;
    $('repeatSection').hidden = false;
    $('repeatSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('treatmentForm').addEventListener('submit', event => {
    event.preventDefault();
    if (!state.applied) return;
    const current = state.current;
    const treatment = $('treatmentSelect').value;
    const expected = $('expectedSelect').value;
    const response = document.querySelector('input[name="response"]:checked')?.value || '';
    const next = $('nextSelect').value;
    const documentation = $('pcrText').value.trim();
    let score = 0;
    const feedback = [];

    if (treatment === current.treatment) { score += 1; feedback.push('Selected the treatment that best matches the current findings.'); }
    else feedback.push('Reconsider the immediate threat, the patient’s airway/breathing adequacy, and your scope before choosing the intervention.');
    if (expected === current.expected) { score += 1; feedback.push('Predicted a measurable response connected to the treatment.'); }
    else feedback.push('The expected response should match the specific problem being treated.');
    if (response === current.response) { score += 1; feedback.push('Correctly compared the repeat findings with the initial assessment.'); }
    else feedback.push('Use objective before-and-after findings to classify the response.');
    if (next === current.next) { score += 1; feedback.push('Selected an appropriate next step.'); }
    else feedback.push('Decide whether to continue, repeat, escalate, ventilate, or expedite transport.');
    if (documentation) feedback.push('Optional treatment note saved. Full narrative documentation is completed later in the scenario.');
    else feedback.push('No treatment narrative required here. Continue to the final documentation step when ready.');

    $('scoreText').textContent = `${score}/4`;
    $('feedbackList').innerHTML = feedback.map(item => `<li>${item}</li>`).join('');
    $('examplePCR').textContent = `Initial ${context} and relevant vital findings reviewed. ${TREATMENTS.find(item => item[0] === treatment)?.[1] || 'Treatment'} performed or selected according to scope and protocol. Repeat findings compared with baseline; patient classified as ${response || 'not yet classified'}. ${NEXT.find(item => item[0] === next)?.[1] || 'Continued reassessment and transport.'}`;
    $('resultsPanel').hidden = false;
    $('resultsPanel').scrollIntoView({ behavior: 'smooth' });

    window.EMSCodeSimPatientCareIntegration?.saveTreatmentReassessment({
      label: 'Treatment and reassessment',
      scenario: current.title,
      context,
      treatment,
      treatmentLabel: TREATMENTS.find(item => item[0] === treatment)?.[1] || treatment,
      expectedResponse: expected,
      response,
      nextAction: next,
      repeatFindings: current.repeat,
      documentation,
      score,
      maxScore: 4
    });

    if (score === 4) { state.done.practice = true; saveProgress(); progress(); }
    insertReturnNavigation();
  });

  $('newCase').addEventListener('click', fresh);
  $('tryAnother').addEventListener('click', fresh);

  loadProgress();
  progress();
  insertScenarioContext();
  insertReturnNavigation();
  fresh();
})();
