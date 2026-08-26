(() => {
  'use strict';

  const api = window.EMSCodeSimPatientRecord;
  const session = window.EMSCodeSimScenarioSession;
  const $ = id => document.getElementById(id);

  const cases = [
    { id:'horse_crush', featured:true, image:'/vitals/assets/horse-crush/patient-initial.webp', title:'Horse-Crush Hip Injury', patient:'64-year-old adult', scene:'5541 E Snow Bird Road • south barn', clue:'Alert on the ground with severe left-hip pain', dispatch:'Medic 181 Engine 182 respond emergent to 5541 E Snow Bird Road in reports of a 64 year old female smashed by a horse.', goal:'Assess before moving, protect the leg in its tolerated position, plan packaging, control pain, and repeat distal CSM after movement' },
    { id:'asthma', image:'/vitals/assets/scenario-patient-adult-v3.png', title:'Respiratory Distress', patient:'24-year-old adult', scene:'Apartment • rescue inhaler nearby', clue:'Short sentences, wheezing, upright position', dispatch:'Worsening shortness of breath and wheezing.', goal:'Assess respiratory adequacy, treat, reassess, and report.' },
    { id:'stroke', image:'/vitals/assets/scenario-patient-adult-v3.png', title:'Possible Acute Stroke', patient:'68-year-old adult', scene:'Private residence • family present', clue:'Sudden speech difficulty and right-sided weakness', dispatch:'Sudden speech difficulty and right-sided weakness.', goal:'Identify time-sensitive neurologic findings and prepare rapid stroke-center transport.' },
    { id:'hypoglycemia', image:'/vitals/assets/scenario-patient-adult-v3.png', title:'Altered Mental Status', patient:'57-year-old adult', scene:'Workplace break room', clue:'Confused, sweaty, and behaving abnormally', dispatch:'Confused, sweaty, and behaving abnormally.', goal:'Find a reversible cause, protect the airway, treat, and reassess.' },
    { id:'trauma', image:'/vitals/assets/scenario-patient-adult-v3.png', title:'Blunt Trauma', patient:'36-year-old adult', scene:'Roadway collision • moderate vehicle damage', clue:'Chest and abdominal pain with signs of poor perfusion', dispatch:'Two-vehicle collision with chest and abdominal pain.', goal:'Find immediate threats, support ABCs, and expedite trauma transport.' },
    { id:'pediatric', image:'/vitals/assets/scenario-patient-pediatric-v3.png', title:'Sick Pediatric Patient', patient:'3-year-old child', scene:'Home • caregiver present', clue:'Fever, poor interaction, increased work of breathing', dispatch:'Fever, poor interaction, and increased work of breathing.', goal:'Use the pediatric first look, support ABCs, and reassess response.' }
  ];

  let selectedCase = null;
  let activeRecord = api?.active?.() || null;

  function trainingMode(mode) {
    return mode === 'assessment' ? 'assessment' : 'learning';
  }

  function patientHome(caseId, mode = 'learning', options = {}) {
    const params = new URLSearchParams({
      case: caseId,
      training: trainingMode(mode)
    });
    if (options.reset) params.set('reset', '1');
    return `/vitals/visual-patient.html?${params}`;
  }

  function savedMode(record = activeRecord) {
    return trainingMode(record?.documentation?.trainingMode || 'learning');
  }

  function elapsedLabel(startedAt) {
    const started = new Date(startedAt || 0).getTime();
    if (!Number.isFinite(started) || started <= 0) return 'Progress is saved.';
    const totalMinutes = Math.max(1, Math.floor((Date.now() - started) / 60000));
    if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'} elapsed`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} hr${hours === 1 ? '' : 's'}${minutes ? ` ${minutes} min` : ''} elapsed`;
  }

  function progressSummary(record) {
    const careEvents = Array.isArray(record?.careLog) ? record.careLog.length : 0;
    const findings = record?.findings && typeof record.findings === 'object' ? Object.keys(record.findings).length : 0;
    const treatments = Array.isArray(record?.treatments) ? record.treatments.length : 0;
    const details = [`${elapsedLabel(record?.startedAt)}`, `${careEvents || findings} recorded event${(careEvents || findings) === 1 ? '' : 's'}`];
    if (treatments) details.push(`${treatments} treatment${treatments === 1 ? '' : 's'}`);
    return details.join(' • ');
  }

  function renderGallery() {
    const gallery = $('caseGallery');
    gallery.innerHTML = '';
    activeRecord = api?.active?.() || null;

    cases.forEach(item => {
      const inProgress = activeRecord?.scenarioId === item.id;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `case-choice${inProgress ? ' has-progress' : ''}`;
      button.dataset.case = item.id;
      button.setAttribute('aria-label', `${item.title}. ${inProgress ? 'Scenario in progress. Continue or reset.' : 'Choose practice mode.'}`);
      button.innerHTML = `
        <span class="case-image-wrap">
          <img src="${item.image}" alt="${item.title} patient scenario">
          ${inProgress ? '<span class="progress-badge">In progress</span>' : item.featured ? '<span class="progress-badge featured-badge">Featured</span>' : ''}
        </span>
        <span class="case-choice-body">
          <strong>${item.title}</strong>
          <span>${item.patient}</span>
          <small>${inProgress ? 'Tap to continue or reset' : item.featured ? 'Immersive trauma scenario' : 'Learning or assessment mode'}</small>
        </span>`;
      button.addEventListener('click', () => openCaseDialog(item));
      gallery.appendChild(button);
    });
  }

  function openCaseDialog(item) {
    selectedCase = item;
    activeRecord = api?.active?.() || null;
    $('caseDialogImage').src = item.image;
    $('caseDialogImage').alt = `${item.title} patient scenario`;
    $('caseDialogTitle').textContent = item.title;
    $('caseDialogMeta').textContent = `${item.patient} • ${item.scene}`;
    $('caseDialogClue').textContent = item.clue;

    const savedPanel = $('savedScenarioPanel');
    const modePanel = $('modeSelectionPanel');
    if (activeRecord?.scenarioId) {
      const samePatient = activeRecord.scenarioId === item.id;
      savedPanel.hidden = false;
      modePanel.hidden = true;
      $('savedScenarioTitle').textContent = samePatient
        ? `Continue ${activeRecord.title || item.title}?`
        : `${activeRecord.title || 'Another patient'} is still in progress`;
      $('savedScenarioSummary').textContent = `${progressSummary(activeRecord)}. ${samePatient ? 'Continue where you stopped or reset this patient and choose a new mode.' : `Continue that patient or reset it before starting ${item.title}.`}`;
      $('continueSavedScenario').textContent = samePatient ? 'Continue progress' : `Continue ${activeRecord.title || 'current patient'}`;
    } else {
      savedPanel.hidden = true;
      modePanel.hidden = false;
    }

    $('caseDialog').hidden = false;
    $('caseDialogBackdrop').hidden = false;
    document.body.classList.add('dialog-open');
    window.setTimeout(() => {
      const first = activeRecord?.scenarioId ? $('continueSavedScenario') : document.querySelector('[data-start-mode="learning"]');
      first?.focus();
    }, 0);
  }

  function closeCaseDialog() {
    $('caseDialog').hidden = true;
    $('caseDialogBackdrop').hidden = true;
    document.body.classList.remove('dialog-open');
    selectedCase = null;
  }

  function clearActiveProgress() {
    const current = api?.active?.() || activeRecord;
    const caseId = current?.scenarioId;
    api?.clear?.();
    if (caseId) {
      const partnerKey = session?.partnerTaskKey?.(caseId);
      [
        partnerKey,
        partnerKey && `${partnerKey}_backup`,
        partnerKey && `${partnerKey}_shadow`,
        `emscodesim_scenario_${caseId}`,
        `emscodesim_scenario_${caseId}_backup`,
        `emscodesim_scenario_${caseId}_shadow`
      ].filter(Boolean).forEach(key => localStorage.removeItem(key));
    }
    activeRecord = null;
  }

  function startFresh(item, mode) {
    if (!item) return;
    if (api?.active?.()?.scenarioId) clearActiveProgress();
    api?.create?.(item);
    session?.sync?.(item.id);
    api?.setDocumentation?.({ trainingMode: trainingMode(mode), trainingModeSetAt: new Date().toISOString() });
    location.href = patientHome(item.id, mode, { reset:true });
  }

  $('continueSavedScenario').addEventListener('click', () => {
    const current = api?.active?.() || activeRecord;
    if (!current?.scenarioId) {
      $('savedScenarioPanel').hidden = true;
      $('modeSelectionPanel').hidden = false;
      return;
    }
    location.href = patientHome(current.scenarioId, savedMode(current));
  });

  $('resetSavedScenario').addEventListener('click', () => {
    const current = api?.active?.() || activeRecord;
    const name = current?.title || 'current scenario';
    if (!window.confirm(`Reset ${name}? All findings, vitals, history, treatments, partner tasks, and log entries for this patient will be erased.`)) return;
    clearActiveProgress();
    renderGallery();
    $('savedScenarioPanel').hidden = true;
    $('modeSelectionPanel').hidden = false;
    $('modeSelectionPanel').querySelector('h3').textContent = 'Choose a mode to restart';
    document.querySelector('[data-start-mode="learning"]')?.focus();
  });

  document.querySelectorAll('[data-start-mode]').forEach(button => {
    button.addEventListener('click', () => startFresh(selectedCase, button.value));
  });

  $('randomCase')?.addEventListener('click', () => {
    const item = cases[Math.floor(Math.random() * cases.length)];
    openCaseDialog(item);
  });
  $('closeCaseDialog').addEventListener('click', closeCaseDialog);
  $('caseDialogBackdrop').addEventListener('click', closeCaseDialog);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('caseDialog').hidden) closeCaseDialog();
  });
  window.addEventListener('pageshow', renderGallery);

  renderGallery();

  const params = new URLSearchParams(location.search);
  const requested = params.get('select') || params.get('case');
  if (requested && cases.some(item => item.id === requested) && (params.get('open') === '1' || params.get('ended') === '1')) {
    openCaseDialog(cases.find(item => item.id === requested));
  }
})();
