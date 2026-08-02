(() => {
  'use strict';

  const api = window.EMSCodeSimPatientRecord;
  const session = window.EMSCodeSimScenarioSession;
  const runtime = window.EMSCodeSimScenarioRuntime;
  const registry = window.EMSCodeSimToolRegistry;
  const params = new URLSearchParams(location.search);
  const requestedId = params.get('case') || session?.requestedCaseId?.() || api?.active?.()?.scenarioId || 'asthma';

  const CASES = {
    asthma: {
      title: 'Respiratory Distress', visible: 'Sitting upright, anxious, speaking in short sentences', image: '/vitals/assets/scenario-patient-adult-v3.png',
      recommended: ['airway','breathing','perfusion','respirations','breath_sounds','spo2','skin','pulse','blood_pressure','sample'],
      primary: {
        airway: { label: 'Known from speech', known: 'Airway is patent at this moment.', evidence: 'The patient is speaking to you in short sentences, so air is moving through the upper airway.', unknown: 'Airway sounds, swelling, secretions, fatigue, and the ability to keep protecting the airway still need assessment.', tools: ['airway'] },
        breathing: { label: 'Known from the picture', known: 'Breathing is present and visibly labored.', evidence: 'The upright posture, anxiety, and short sentences suggest increased work of breathing.', unknown: 'Respiratory rate, depth, chest rise, breath sounds, and SpO₂ are still unknown.', tools: ['breathing','respirations','breath_sounds','spo2'] },
        perfusion: { label: 'Reasonable clinical inference', known: 'A perfusing pulse is present.', evidence: 'An awake patient who is speaking has enough circulation at this moment to perfuse the brain.', unknown: 'Pulse rate and quality, blood pressure, skin signs, capillary refill, and hidden bleeding remain unknown.', tools: ['perfusion','pulse','blood_pressure','skin'] }
      },
      treatments: ['Position of comfort','Oxygen based on assessment','Assist prescribed inhaler / bronchodilator per protocol']
    },
    stroke: {
      title: 'Possible Acute Stroke', visible: 'Awake with abnormal speech and right-sided weakness', image: '/vitals/assets/scenario-patient-adult-v3.png',
      recommended: ['airway','breathing','perfusion','mental_status','pupils','motor_sensory','blood_glucose','blood_pressure','pulse','respirations','spo2','sample'],
      primary: {
        airway: { label: 'Partly known from interaction', known: 'Air is moving and the patient can vocalize.', evidence: 'The patient is awake with abnormal speech, which supports current airflow but does not prove airway protection.', unknown: 'Secretions, facial weakness, swallowing, gag protection, and aspiration risk still need assessment.', tools: ['airway'] },
        breathing: { label: 'Reasonable clinical inference', known: 'Spontaneous breathing is present.', evidence: 'An awake patient who can attempt speech is breathing, but adequacy cannot be judged from that alone.', unknown: 'Respiratory rate, depth, effort, breath sounds, and SpO₂ are still unknown.', tools: ['breathing','respirations','breath_sounds','spo2'] },
        perfusion: { label: 'Reasonable clinical inference', known: 'A perfusing pulse is present.', evidence: 'Awake interaction indicates current cerebral perfusion.', unknown: 'Pulse rate and quality, blood pressure, skin signs, and perfusion trend remain unknown.', tools: ['perfusion','pulse','blood_pressure','skin'] }
      },
      treatments: ['Airway protection and safe positioning','Establish last known well','Rapid stroke-center transport']
    },
    hypoglycemia: {
      title: 'Altered Mental Status', visible: 'Confused, sweaty, and slow to follow commands', image: '/vitals/assets/scenario-patient-adult-v3.png',
      recommended: ['airway','breathing','perfusion','mental_status','pupils','motor_sensory','blood_glucose','skin','pulse','blood_pressure','respirations','spo2','sample'],
      primary: {
        airway: { label: 'Partly known from interaction', known: 'The airway is open enough for the patient to respond.', evidence: 'The patient is confused and slow to follow commands, so airflow is present but protection is uncertain.', unknown: 'Swallowing ability, secretions, gag protection, and risk of deterioration still need assessment.', tools: ['airway'] },
        breathing: { label: 'Reasonable clinical inference', known: 'Spontaneous breathing is present.', evidence: 'The patient is responsive, but a picture does not establish adequate ventilation.', unknown: 'Respiratory rate, depth, effort, breath sounds, and SpO₂ are still unknown.', tools: ['breathing','respirations','breath_sounds','spo2'] },
        perfusion: { label: 'Known from picture plus inference', known: 'A perfusing pulse is present, with abnormal skin clues visible.', evidence: 'Responsiveness implies a pulse; pallor and diaphoresis suggest possible perfusion or metabolic stress.', unknown: 'Pulse rate and quality, blood pressure, capillary refill, and exact skin temperature remain unknown.', tools: ['perfusion','pulse','blood_pressure','skin'] }
      },
      treatments: ['Protect the airway','Oral glucose only if swallowing is safe','Ventilation support / naloxone when indicated by findings']
    },
    trauma: {
      title: 'Blunt Trauma', visible: 'Pale patient with guarded breathing after a collision', image: '/vitals/assets/scenario-patient-adult-v3.png',
      recommended: ['airway','breathing','perfusion','respirations','breath_sounds','spo2','chest_assessment','trauma_assessment','abdominal_assessment','skin','blood_pressure','pulse'],
      primary: {
        airway: { label: 'Not fully known from the picture', known: 'The patient appears responsive, but airway patency is not confirmed.', evidence: 'A responsive appearance suggests some airflow; trauma can still create blood, teeth, swelling, or loss of protection.', unknown: 'Patency, sounds, secretions, facial injury, and protection must be checked directly.', tools: ['airway'] },
        breathing: { label: 'Known from the picture', known: 'Breathing is present but guarded and potentially inadequate.', evidence: 'Guarded breathing and chest discomfort are visible after a significant mechanism.', unknown: 'Respiratory rate, depth, chest symmetry, breath sounds, and SpO₂ are still unknown.', tools: ['breathing','respirations','breath_sounds','spo2','chest_assessment'] },
        perfusion: { label: 'Reasonable clinical inference', known: 'A perfusing pulse is present, but shock is possible.', evidence: 'The patient is responsive; pallor and the trauma mechanism raise concern for hemorrhage or poor perfusion.', unknown: 'Major hidden bleeding, pulse rate and quality, blood pressure, skin temperature/moisture, and capillary refill remain unknown.', tools: ['perfusion','pulse','blood_pressure','skin','trauma_assessment'] }
      },
      treatments: ['Airway and ventilation support','Control hemorrhage and prevent heat loss','Rapid trauma transport']
    },
    pediatric: {
      title: 'Sick Pediatric Patient', visible: 'Poor interaction with increased work of breathing', image: '/vitals/assets/scenario-patient-pediatric-v3.png',
      recommended: ['pediatric_assessment_triangle','airway','breathing','perfusion','respirations','breath_sounds','spo2','skin','temperature','pulse'],
      primary: {
        airway: { label: 'Partly known from the first look', known: 'Air is moving, but airway patency and protection are not confirmed.', evidence: 'Visible breathing shows airflow; poor interaction makes deterioration and loss of protection important concerns.', unknown: 'Airway sounds, secretions, positioning, tone, and ability to protect the airway still need assessment.', tools: ['airway'] },
        breathing: { label: 'Known from the picture', known: 'Breathing is present with increased work.', evidence: 'The first look shows increased effort before the child is touched.', unknown: 'Respiratory rate, depth, breath sounds, chest rise, and SpO₂ are still unknown.', tools: ['breathing','respirations','breath_sounds','spo2'] },
        perfusion: { label: 'Partly known from the picture', known: 'Circulation is present, with flushed skin visible.', evidence: 'The child is interacting poorly but is not pulseless; skin appearance offers an early perfusion clue.', unknown: 'Pulse rate and quality, capillary refill, blood pressure when indicated, skin temperature/moisture, and perfusion trend remain unknown.', tools: ['perfusion','pulse','skin','blood_pressure'] }
      },
      treatments: ['Position with caregiver when possible','Oxygen or ventilation support based on adequacy','Supportive fever and perfusion care']
    }
  };

  const scenario = CASES[requestedId] || CASES.asthma;
  const id = CASES[requestedId] ? requestedId : 'asthma';
  const $ = value => document.getElementById(value);
  let seconds = 0;
  let activeFocus = null;
  let findingFilter = 'all';
  const partnerTimers = new Set();

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

  function record() { return session?.sync?.(id) || api?.active?.(); }
  function existing(key) { return Boolean(api?.hasFinding?.(key, record())); }
  function labelFor(key) { return api?.labelFor?.(key) || key.replace(/_/g, ' '); }
  function valueFor(key) { return runtime?.formatVital?.(key) || 'Obtained'; }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }
  function formatClock(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Time not recorded' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  }
  function elapsedLabel(value, startedAt) {
    const eventTime = new Date(value).getTime();
    const startTime = new Date(startedAt).getTime();
    if (!Number.isFinite(eventTime) || !Number.isFinite(startTime) || eventTime < startTime) return '';
    const totalSeconds = Math.floor((eventTime - startTime) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `+${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  function eventTypeLabel(event) {
    if (event.type === 'treatment') return 'Treatment';
    if (event.type === 'reassessment') return 'Reassessment';
    if (event.category === 'vital') return 'Vital';
    if (event.category === 'history') return 'History';
    if (event.type === 'impression') return 'Impression';
    if (event.type === 'documentation') return 'Report';
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
      image.src = '/vitals/assets/scenario-patient-adult-v3.png';
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
    } catch (error) {
      console.error(error);
      toast('Finding was not saved. Try again before leaving this screen.');
    }
  }

  function toolUrl(url, returnLabel = 'patient scenario', context = '') {
    return registry?.buildUrl?.(url, {
      caseId: id,
      returnTo: `/vitals/visual-patient.html?case=${encodeURIComponent(id)}`,
      returnLabel,
      context
    }) || url;
  }

  function buildVitals() {
    const box = $('vitalTools');
    box.innerHTML = '';
    (registry?.vitalTools || []).forEach(tool => {
      const complete = existing(tool.key);
      const article = document.createElement('article');
      article.className = `tool${complete ? ' done' : ''}`;
      article.innerHTML = `
        <div class="tool-head"><div><h3>${tool.label}</h3><p>${tool.description}</p></div>
        <span class="status-chip ${complete ? 'done' : ''}">${complete ? 'Obtained' : 'Not taken'}</span></div>
        <div class="tool-actions"><a href="${toolUrl(tool.url)}">Perform</a>
        <button class="partner-action" type="button" ${complete ? 'disabled' : ''}>${complete ? 'Complete' : 'Assign to partner'}</button></div>
        <div class="assignment-progress" hidden></div>`;
      const button = article.querySelector('button');
      const status = article.querySelector('.assignment-progress');
      button.addEventListener('click', () => {
        button.disabled = true;
        let left = tool.delay || 12;
        status.hidden = false;
        status.textContent = `Partner gathering ${tool.label.toLowerCase()}… ${left}s`;
        const timer = setInterval(() => {
          left -= 1;
          status.textContent = `Partner gathering ${tool.label.toLowerCase()}… ${Math.max(0, left)}s`;
          if (left <= 0) {
            clearInterval(timer);
            partnerTimers.delete(timer);
            saveFinding(tool.key, valueFor(tool.key), 'partner-assignment', { locked: true });
          }
        }, 1000);
        partnerTimers.add(timer);
      });
      box.appendChild(article);
    });
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

  function renderAssessmentTool(tool, recommended) {
    const complete = existing(tool.key);
    const article = document.createElement('article');
    article.className = `assessment-card${complete ? ' complete' : ''}`;
    article.innerHTML = `
      <span class="visual-tag">${recommended ? 'RELEVANT FOR THIS PATIENT' : tool.category.toUpperCase()}</span>
      <h3>${tool.label}</h3><p>${tool.description}</p>
      <div class="tool-actions"><a class="primary-action" href="${toolUrl(tool.url, tool.label)}">${complete ? 'Review' : 'Open assessment'}</a>
      <span class="status-chip ${complete ? 'done' : ''}">${complete ? 'Recorded' : 'Available'}</span></div>`;
    return article;
  }

  function registryTool(key) {
    return [...(registry?.assessmentTools || []), ...(registry?.vitalTools || [])].find(tool => tool.key === key);
  }

  function appendAssessmentHeading(box, title, copy, level = '') {
    const heading = document.createElement('div');
    heading.className = `assessment-sequence-heading${level ? ` ${level}` : ''}`;
    heading.innerHTML = `<h3>${title}</h3>${copy ? `<p>${copy}</p>` : ''}`;
    box.appendChild(heading);
  }

  function buildSceneSizeUpCard(box) {
    const complete = existing('scene_size_up');
    const article = document.createElement('article');
    article.className = `assessment-card sequence-card scene-size-card${complete ? ' complete' : ''}`;
    article.innerHTML = `
      <span class="sequence-number">1</span>
      <div class="sequence-card-body">
        <span class="visual-tag">START HERE — NREMT THINKING ORDER</span>
        <h3>Scene size-up and first impression</h3>
        <p>Use the dispatch and first picture to consider PPE, scene safety, patient count, NOI/MOI, resources, spinal precautions, general impression, responsiveness, and priority.</p>
        <p class="reasoning-tip"><strong>Picture-based:</strong> Several answers come from what you can already see. Do not wait for a vital sign to form a general impression.</p>
        <div class="tool-actions"><button class="primary-action scene-guide-card-button" type="button">${complete ? 'Review scene size-up' : 'Open scene size-up questions'}</button>
        <span class="status-chip ${complete ? 'done' : ''}">${complete ? 'Recorded' : 'Not started'}</span></div>
      </div>`;
    article.querySelector('button').addEventListener('click', () => {
      closeSheet();
      window.EMSCodeSimSceneGuide?.start?.(complete);
    });
    box.appendChild(article);
  }

  function buildPrimaryCard(box, key, number) {
    const config = scenario.primary?.[key];
    if (!config) return;
    const primaryTool = registryTool(key);
    const complete = existing(key);
    const title = key === 'perfusion' ? 'Circulation and perfusion' : key.charAt(0).toUpperCase() + key.slice(1);
    const article = document.createElement('article');
    article.className = `assessment-card sequence-card primary-reasoning-card${complete ? ' complete' : ''}`;
    const links = (config.tools || []).map(toolKey => {
      const tool = registryTool(toolKey);
      if (!tool) return '';
      const toolComplete = existing(tool.key);
      const context = tool.key === 'airway' ? 'airway' : tool.key === 'breathing' ? 'breathing' : tool.key === 'perfusion' ? 'perfusion' : '';
      return `<a class="assessment-tool-link${toolComplete ? ' complete' : ''}" href="${toolUrl(tool.url, title, context)}">${toolComplete ? '✓ ' : ''}${tool.label}</a>`;
    }).join('');
    article.innerHTML = `
      <span class="sequence-number">${number}</span>
      <div class="sequence-card-body">
        <span class="visual-tag">${config.label.toUpperCase()}</span>
        <h3>${title}</h3>
        <div class="reasoning-row known"><span>What you can say now</span><strong>${config.known}</strong><p>${config.evidence}</p></div>
        <div class="reasoning-row unknown"><span>What is still unknown</span><strong>Use assessment and vital tools before deciding adequacy.</strong><p>${config.unknown}</p></div>
        <div class="primary-tool-path" aria-label="Tools for ${title}">${links}</div>
        <span class="status-chip ${complete ? 'done' : ''}">${complete ? 'Primary finding recorded' : 'Primary finding pending'}</span>
      </div>`;
    box.appendChild(article);
  }

  function buildAssessments() {
    const box = $('assessmentTools');
    box.innerHTML = '';

    const intro = document.createElement('div');
    intro.className = 'assessment-order-note';
    intro.innerHTML = '<strong>Work from immediate threats toward details.</strong><span>Use the picture for visible findings and reasonable first inferences. Use the linked tools for anything you have not actually measured or assessed.</span>';
    box.appendChild(intro);

    buildSceneSizeUpCard(box);
    appendAssessmentHeading(box, 'Primary assessment', 'After scene size-up, move through airway, breathing, then circulation. Do not treat an inference as a complete assessment.', 'primary-heading');
    buildPrimaryCard(box, 'airway', 2);
    buildPrimaryCard(box, 'breathing', 3);
    buildPrimaryCard(box, 'perfusion', 4);

    const primaryKeys = new Set(['scene_size_up','airway','breathing','perfusion']);
    const tools = [...(registry?.assessmentTools || [])].filter(tool => !primaryKeys.has(tool.key)).sort((a, b) => {
      const ar = scenario.recommended.includes(a.key) ? 0 : 1;
      const br = scenario.recommended.includes(b.key) ? 0 : 1;
      return ar - br || a.category.localeCompare(b.category) || a.label.localeCompare(b.label);
    });

    appendAssessmentHeading(box, 'Focused assessment and history', 'Choose tools that answer the patient-specific questions raised by your primary assessment. All other assessment tools remain available below.', 'focused-heading');
    let currentCategory = '';
    tools.forEach(tool => {
      const category = scenario.recommended.includes(tool.key) ? 'Most relevant next tools' : tool.category;
      if (category !== currentCategory) {
        currentCategory = category;
        const heading = document.createElement('h3');
        heading.className = 'assessment-group-title';
        heading.textContent = category;
        box.appendChild(heading);
      }
      box.appendChild(renderAssessmentTool(tool, scenario.recommended.includes(tool.key)));
    });
  }

  function buildTreatments() {
    const box = $('treatmentTools');
    box.innerHTML = '';
    scenario.treatments.forEach((title, index) => {
      const article = document.createElement('article');
      article.className = 'treatment-card';
      article.innerHTML = `<span class="visual-tag">PATIENT-SPECIFIC OPTION</span><h3>${title}</h3><p>Open the treatment tool to decide whether this intervention is indicated and to document reassessment.</p><a class="primary-action" href="${toolUrl('/vitals/treatment-reassessment.html', 'patient scenario', index === 0 ? 'airway' : 'general')}">Assess and treat</a>`;
      box.appendChild(article);
    });

    const full = document.createElement('article');
    full.className = 'treatment-card';
    full.innerHTML = `<span class="visual-tag">FULL TREATMENT MENU</span><h3>All treatment and reassessment options</h3><p>Choose from monitoring only through basic and advanced airway, breathing, circulation, medication, and transport actions.</p><a class="primary-action" href="${toolUrl('/vitals/treatment-reassessment.html', 'patient scenario', 'general')}">Open full treatment menu</a>`;
    box.appendChild(full);
  }

  function renderFindings() {
    const list = $('findingList');
    const current = record() || {};
    const allEvents = api?.listCareLog?.(current, 'all') || [];
    const events = api?.listCareLog?.(current, findingFilter) || allEvents;
    const sequenceById = new Map(allEvents.map((event, index) => [event.id || event.eventId, index + 1]));
    const counts = {
      all: allEvents.length,
      vitals: allEvents.filter(event => event.category === 'vital').length,
      treatments: allEvents.filter(event => event.category === 'treatment').length,
      reassessments: allEvents.filter(event => event.type === 'reassessment').length,
      history: allEvents.filter(event => event.category === 'history').length,
      assessments: allEvents.filter(event => event.category === 'assessment').length
    };

    document.querySelectorAll('[data-log-filter]').forEach(button => {
      const key = button.dataset.logFilter;
      button.classList.toggle('active', key === findingFilter);
      button.textContent = `${button.dataset.label || button.textContent.replace(/\s*\(\d+\)$/, '')} (${counts[key] || 0})`;
    });
    const filterNames={vitals:'vital-sign',treatments:'treatment',reassessments:'reassessment',history:'history',assessments:'assessment'};
    $('findingFilterSummary').textContent = findingFilter === 'all'
      ? `${events.length} patient-care event${events.length === 1 ? '' : 's'} shown in chronological order.`
      : `${events.length} ${filterNames[findingFilter] || findingFilter} event${events.length === 1 ? '' : 's'} shown.`;

    list.innerHTML = '';
    if (!events.length) {
      const emptyMessages={vitals:'No vital signs have been recorded yet.',treatments:'No treatments have been recorded yet.',reassessments:'No reassessments have been recorded yet.',history:'No SAMPLE or OPQRST history has been recorded yet.',assessments:'No assessment findings have been recorded yet.'};
      const message = emptyMessages[findingFilter] || 'No patient-care information has been recorded yet.';
      list.innerHTML = `<li class="empty">${message}</li>`;
      return;
    }

    events.forEach((event, filteredIndex) => {
      const sequence = sequenceById.get(event.id || event.eventId) || filteredIndex + 1;
      const elapsed = elapsedLabel(event.recordedAt, current.startedAt);
      const item = document.createElement('li');
      item.className = `care-log-item ${event.category || 'assessment'} ${event.type || 'finding'}`;
      item.innerHTML = `
        <div class="care-log-order"><b>${sequence}</b><span>${escapeHtml(elapsed)}</span></div>
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
    const keys = Object.keys(current.findings || {});
    const vitalKeys = (registry?.vitalTools || []).map(tool => tool.key);
    const log = api?.listCareLog?.(current, 'all') || [];
    const treatmentEvents = log.filter(event => event.category === 'treatment');
    $('vitalCount').textContent = `${vitalKeys.filter(key => keys.includes(key)).length} / ${vitalKeys.length}`;
    $('findingCount').textContent = String(log.length);
    $('treatmentCount').textContent = String(treatmentEvents.length);
    $('findingBadge').hidden = !log.length;
    $('findingBadge').textContent = String(log.length);
  }

  function openSheet(panelId) {
    document.querySelectorAll('.vp-panel').forEach(panel => { panel.hidden = panel.id !== panelId; });
    document.querySelectorAll('.bottom-nav button').forEach(button => button.classList.toggle('active', button.dataset.panel === panelId));
    $('sheetTitle').textContent = { vitalsPanel: 'Patient tools', assessmentPanel: 'Assessment sequence', treatmentPanel: 'Treatment', findingsPanel: 'Patient care log' }[panelId];
    $('actionSheet').hidden = false;
    $('sheetBackdrop').hidden = false;
    document.body.style.overflow = 'hidden';
    if (panelId === 'findingsPanel') renderFindings();
  }

  function closeSheet() {
    $('actionSheet').hidden = true;
    $('sheetBackdrop').hidden = true;
    document.body.style.overflow = '';
    document.querySelectorAll('.bottom-nav button').forEach(button => button.classList.remove('active'));
  }

  function finishFocus() {
    if (!activeFocus) return;
    saveFinding(activeFocus.key, activeFocus.finding, 'visual-assessment');
    $('assessmentFocus').hidden = true;
    activeFocus = null;
    buildAssessments();
    openSheet('findingsPanel');
  }

  function updateNextAction() {
    const current=record()||{};
    const has=key=>existing(key);
    const log=api?.listCareLog?.(current,'all')||[];
    const lastTreatment=[...log].reverse().find(event=>event.type==='treatment');
    const lastReassessment=[...log].reverse().find(event=>event.type==='reassessment');
    let title='Begin with scene size-up';
    let reason='Use the first picture and dispatch information, then move through airway, breathing, and circulation.';
    let actions=[{label:'Open Assessment',panel:'assessmentPanel'}];
    if(!has('scene_size_up')){
      actions=[{label:'Start scene size-up',scene:true},{label:'Open Assessment',panel:'assessmentPanel',secondary:true}];
    }else if(!has('airway')){
      title='Confirm airway';reason='Use speech and visible clues as a starting point, then complete an airway assessment.';
      actions=[{label:'Assess airway',url:toolUrl('/vitals/airway-assessment.html','patient scenario','airway')},{label:'View assessment order',panel:'assessmentPanel',secondary:true}];
    }else if(!has('breathing')){
      title='Assess breathing adequacy';reason='Breathing may be visible, but rate, depth, effort, chest rise, sounds, and oxygenation still need assessment.';
      actions=[{label:'Assess breathing',url:toolUrl('/vitals/breathing-assessment.html','patient scenario','breathing')},{label:'Treat now',panel:'treatmentPanel',secondary:true}];
    }else if(!has('perfusion')){
      title='Assess circulation and perfusion';reason='A responsive patient likely has a perfusing pulse, but quality, pressure, skin, and bleeding still need evaluation.';
      actions=[{label:'Assess circulation',url:toolUrl('/vitals/perfusion-assessment.html','patient scenario','perfusion')},{label:'Treat now',panel:'treatmentPanel',secondary:true}];
    }else if(lastTreatment && (!lastReassessment || new Date(lastReassessment.recordedAt)<new Date(lastTreatment.recordedAt))){
      title='Reassess after treatment';reason=`${lastTreatment.value||'Treatment'} was recorded. Repeat the findings most likely to change and document the response.`;
      actions=[{label:'Reassess patient',url:toolUrl('/vitals/treatment-reassessment.html','patient scenario','reassessment')},{label:'Open Tools',panel:'vitalsPanel',secondary:true}];
    }else{
      const next=(scenario.recommended||[]).find(key=>!has(key));
      const tool=next&&registryTool(next);
      if(tool){title=`Next useful tool: ${tool.label}`;reason=tool.description||'Gather information that will change your working impression or treatment.';actions=[{label:`Open ${tool.label}`,url:toolUrl(tool.url,'patient scenario')},{label:'Choose another tool',panel:'vitalsPanel',secondary:true}];}
      else if(!current.impressions?.primary){title='Form a working impression';reason='You have enough information to choose a primary impression, transport priority, and supporting findings.';actions=[{label:'Clinical impression',url:toolUrl('/vitals/clinical-impression.html','patient scenario')},{label:'Review log',panel:'findingsPanel',secondary:true}];}
      else if(!(current.documentation?.handoff||current.documentation?.narrative)){title='Prepare handoff and debrief';reason='Review the chronological care log, give the handoff, and finish with scenario feedback.';actions=[{label:'PCR and handoff',url:toolUrl('/vitals/pcr-handoff.html','patient scenario')},{label:'Review log',panel:'findingsPanel',secondary:true}];}
      else {title='Review the scenario';reason='Use the debrief to review missed findings, treatment timing, reassessment, and documentation.';actions=[{label:'Open debrief',url:toolUrl('/vitals/scenario-debrief.html','patient scenario')},{label:'Review log',panel:'findingsPanel',secondary:true}];}
    }
    $('nextActionTitle').textContent=title;$('nextActionReason').textContent=reason;const host=$('nextActionButtons');host.innerHTML='';actions.forEach(action=>{const el=document.createElement(action.url?'a':'button');el.textContent=action.label;if(action.secondary)el.className='secondary';if(action.url)el.href=action.url;else el.type='button';if(action.panel)el.addEventListener('click',()=>openSheet(action.panel));if(action.scene)el.addEventListener('click',()=>window.EMSCodeSimSceneGuide?.start?.(has('scene_size_up')));host.appendChild(el)});
  }

  function refreshFromRecord() {
    const current = record();
    buildVitals();
    buildAssessments();
    buildTreatments();
    renderFindings();
    updateCounts();
    updateNextAction();
    $('patientLabel').textContent = current?.patient || 'Patient';
    $('dispatch').textContent = current?.dispatch || scenario.title;
    $('scene').textContent = current?.scene || '';
  }

  ensureRecord();
  $('recordTreatmentLink').href = toolUrl('/vitals/treatment-reassessment.html', 'patient care log', 'general');
  $('fullPatientRecordLink').href = `/vitals/patient-record.html?mode=scenario&resume=1&case=${encodeURIComponent(id)}`;
  document.querySelectorAll('[data-log-filter]').forEach(button => button.addEventListener('click', () => {
    findingFilter = button.dataset.logFilter || 'all';
    renderFindings();
  }));
  $('caseTitle').textContent = scenario.title;
  $('visibleCondition').textContent = scenario.visible;
  setPatientImage($('patientImage'), scenario.image);
  setPatientImage($('focusImage'), scenario.image);
  refreshFromRecord();

  document.querySelectorAll('.bottom-nav button').forEach(button => button.addEventListener('click', () => openSheet(button.dataset.panel)));
  $('closeSheet').addEventListener('click', closeSheet);
  $('sheetBackdrop').addEventListener('click', closeSheet);
  $('recordFocus').addEventListener('click', finishFocus);
  $('cancelFocus').addEventListener('click', () => { $('assessmentFocus').hidden = true; activeFocus = null; });
  $('endScenario').addEventListener('click', () => { if (confirm('End this scenario and return to the launcher?')) location.href = `/vitals/scenario-launcher.html?case=${encodeURIComponent(id)}&resume=1`; });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!$('assessmentFocus').hidden) { $('assessmentFocus').hidden = true; activeFocus = null; }
    else closeSheet();
  });
  window.addEventListener('emscodesim:patient-record-updated', refreshFromRecord);
  window.addEventListener('emscodesim:scenario-finding-saved', refreshFromRecord);
  window.addEventListener('pageshow', refreshFromRecord);
  window.addEventListener('pagehide', () => partnerTimers.forEach(timer => clearInterval(timer)), { once: true });
  setInterval(() => {
    seconds += 1;
    $('timer').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }, 1000);
})();
