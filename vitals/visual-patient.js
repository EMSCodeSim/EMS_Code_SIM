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
      recommended: ['airway','breathing','respirations','breath_sounds','spo2','skin','pulse','blood_pressure','sample'],
      visual: ['General appearance','Observe posture, speech, distress, and interaction.','Appears anxious; sitting upright; speaking in short sentences'],
      treatments: ['Position of comfort','Oxygen based on assessment','Assist prescribed inhaler / bronchodilator per protocol']
    },
    stroke: {
      title: 'Possible Acute Stroke', visible: 'Awake with abnormal speech and right-sided weakness', image: '/vitals/assets/scenario-patient-adult-v3.png',
      recommended: ['airway','mental_status','pupils','motor_sensory','blood_glucose','blood_pressure','pulse','respirations','spo2','sample'],
      visual: ['General neurologic appearance','Observe speech, facial movement, gaze, and spontaneous movement.','Abnormal speech with right-sided weakness'],
      treatments: ['Airway protection and safe positioning','Establish last known well','Rapid stroke-center transport']
    },
    hypoglycemia: {
      title: 'Altered Mental Status', visible: 'Confused, sweaty, and slow to follow commands', image: '/vitals/assets/scenario-patient-adult-v3.png',
      recommended: ['airway','mental_status','pupils','motor_sensory','blood_glucose','skin','pulse','blood_pressure','sample'],
      visual: ['General appearance','Observe interaction, diaphoresis, and ability to follow commands.','Confused, pale, cool, and diaphoretic'],
      treatments: ['Protect the airway','Oral glucose only if swallowing is safe','Ventilation support / naloxone when indicated by findings']
    },
    trauma: {
      title: 'Blunt Trauma', visible: 'Pale patient with guarded breathing after a collision', image: '/vitals/assets/scenario-patient-adult-v3.png',
      recommended: ['airway','breathing','perfusion','respirations','breath_sounds','spo2','chest_assessment','trauma_assessment','abdominal_assessment','skin','blood_pressure','pulse'],
      visual: ['General trauma impression','Look for immediate threats, respiratory distress, bleeding, and patient position.','Pale, anxious, and guarding the chest and abdomen'],
      treatments: ['Airway and ventilation support','Control hemorrhage and prevent heat loss','Rapid trauma transport']
    },
    pediatric: {
      title: 'Sick Pediatric Patient', visible: 'Poor interaction with increased work of breathing', image: '/vitals/assets/scenario-patient-pediatric-v3.png',
      recommended: ['pediatric_assessment_triangle','airway','breathing','respirations','breath_sounds','spo2','perfusion','skin','temperature','pulse'],
      visual: ['Pediatric first look','Observe appearance, work of breathing, and circulation to skin before touching the child.','Poor interaction, visible increased effort, and flushed skin'],
      treatments: ['Position with caregiver when possible','Oxygen or ventilation support based on adequacy','Supportive fever and perfusion care']
    }
  };

  const scenario = CASES[requestedId] || CASES.asthma;
  const id = CASES[requestedId] ? requestedId : 'asthma';
  const $ = value => document.getElementById(value);
  let seconds = 0;
  let activeFocus = null;
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
      <span class="visual-tag">${recommended ? 'RECOMMENDED FOR THIS PATIENT' : tool.category.toUpperCase()}</span>
      <h3>${tool.label}</h3><p>${tool.description}</p>
      <div class="tool-actions"><a class="primary-action" href="${toolUrl(tool.url, tool.label)}">${complete ? 'Review' : 'Open assessment'}</a>
      <span class="status-chip ${complete ? 'done' : ''}">${complete ? 'Recorded' : 'Available'}</span></div>`;
    return article;
  }

  function buildAssessments() {
    const box = $('assessmentTools');
    box.innerHTML = '';

    const visual = document.createElement('article');
    visual.className = `assessment-card${existing('general_appearance') ? ' complete' : ''}`;
    visual.innerHTML = `<span class="visual-tag">VISUAL ASSESSMENT</span><h3>${scenario.visual[0]}</h3><p>${scenario.visual[1]}</p><button type="button" ${existing('general_appearance') ? 'disabled' : ''}>${existing('general_appearance') ? 'Finding recorded' : 'Focus on patient'}</button>`;
    visual.querySelector('button').addEventListener('click', () => openFocus(scenario.visual[0], scenario.visual[1], scenario.visual[2], 'general_appearance'));
    box.appendChild(visual);

    const tools = [...(registry?.assessmentTools || [])].sort((a, b) => {
      const ar = scenario.recommended.includes(a.key) ? 0 : 1;
      const br = scenario.recommended.includes(b.key) ? 0 : 1;
      return ar - br || a.category.localeCompare(b.category) || a.label.localeCompare(b.label);
    });

    let currentCategory = '';
    tools.forEach(tool => {
      const category = scenario.recommended.includes(tool.key) ? 'Recommended for this patient' : tool.category;
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
    const items = Object.entries(record()?.findings || {});
    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = '<li class="empty">No findings yet. Obtain vitals or perform an assessment.</li>';
      return;
    }
    items.sort((a, b) => (a[1].recordedAt || '').localeCompare(b[1].recordedAt || ''));
    items.forEach(([key, finding]) => {
      const item = document.createElement('li');
      item.innerHTML = `<span>${labelFor(key)}</span><strong>${finding.value ?? finding.finding ?? ''}</strong>`;
      list.appendChild(item);
    });
  }

  function updateCounts() {
    const current = record() || {};
    const keys = Object.keys(current.findings || {});
    const vitalKeys = (registry?.vitalTools || []).map(tool => tool.key);
    $('vitalCount').textContent = `${vitalKeys.filter(key => keys.includes(key)).length} / ${vitalKeys.length}`;
    $('findingCount').textContent = String(keys.length);
    $('treatmentCount').textContent = String((current.treatments || []).length);
    $('findingBadge').hidden = !keys.length;
    $('findingBadge').textContent = String(keys.length);
  }

  function openSheet(panelId) {
    document.querySelectorAll('.vp-panel').forEach(panel => { panel.hidden = panel.id !== panelId; });
    document.querySelectorAll('.bottom-nav button').forEach(button => button.classList.toggle('active', button.dataset.panel === panelId));
    $('sheetTitle').textContent = { vitalsPanel: 'Vitals', assessmentPanel: 'All assessment tools', treatmentPanel: 'Treatment', findingsPanel: 'Findings' }[panelId];
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

  function refreshFromRecord() {
    const current = record();
    buildVitals();
    buildAssessments();
    buildTreatments();
    renderFindings();
    updateCounts();
    $('patientLabel').textContent = current?.patient || 'Patient';
    $('dispatch').textContent = current?.dispatch || scenario.title;
    $('scene').textContent = current?.scene || '';
  }

  ensureRecord();
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
