(() => {
  'use strict';

  const api = window.EMSCodeSimPatientRecord;
  const session = window.EMSCodeSimScenarioSession;
  const definitions = window.EMSCodeSimScenarioDefinitions;
  const $ = id => document.getElementById(id);

  // Gallery metadata overlays CATALOG/PATIENT_CASES. Horse stays featured;
  // remaining cases reuse existing definitions (already covered by contract tests).
  const GALLERY_META = {
    horse_crush: {
      category: 'trauma',
      featured: true,
      badge: 'Featured',
      image: '/vitals/assets/horse-crush/patient-initial.webp',
      clue: 'Alert on the ground with severe left-hip pain'
    },
    asthma: {
      category: 'medical',
      badge: 'Core case',
      image: '/vitals/assets/scenario-asthma-learning.svg',
      clue: 'Upright, anxious, speaking in short sentences'
    },
    stroke: {
      category: 'medical',
      badge: 'Core case',
      image: '/vitals/assets/scenario-stroke-learning.svg',
      clue: 'Sudden speech change with right-sided weakness'
    },
    hypoglycemia: {
      category: 'medical',
      badge: 'Core case',
      image: '/vitals/assets/scenario-hypoglycemia-learning.svg',
      clue: 'Confused, sweaty, slow to follow commands'
    },
    trauma: {
      category: 'trauma',
      badge: 'Core case',
      image: '/vitals/assets/scenario-patient-adult-v3.png',
      clue: 'Pale patient with guarded breathing after a collision'
    },
    pediatric: {
      category: 'pediatric',
      badge: 'Core case',
      image: '/vitals/assets/scenario-patient-pediatric-v3.png',
      clue: 'Poor interaction with increased work of breathing'
    }
  };

  const FEATURED_ORDER = ['horse_crush', 'asthma', 'stroke', 'hypoglycemia', 'trauma', 'pediatric'];

  function buildCases() {
    const catalog = definitions?.CATALOG || {};
    const patients = definitions?.PATIENT_CASES || {};
    const ids = FEATURED_ORDER.filter(id => catalog[id]);
    Object.keys(catalog).forEach(id => {
      if (!ids.includes(id)) ids.push(id);
    });
    return ids.map(id => {
      const entry = catalog[id] || {};
      const patient = patients[id] || {};
      const meta = GALLERY_META[id] || {};
      return {
        id,
        title: entry.title || patient.title || id,
        patient: entry.patient || 'Patient',
        scene: entry.scene || '',
        dispatch: entry.dispatch || '',
        goal: entry.goal || '',
        clue: meta.clue || (patient.sceneClues || []).slice(0, 2).join(' • ') || patient.visible || entry.dispatch || '',
        image: meta.image || patient.image || '/vitals/assets/scenario-patient-adult-v3.png',
        category: meta.category || 'medical',
        featured: Boolean(meta.featured),
        badge: meta.badge || (meta.featured ? 'Featured' : 'Core case')
      };
    });
  }

  const cases = buildCases();
  let selectedCase = null;
  let activeRecord = api?.active?.() || null;
  let activeFilter = 'all';

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

  function filteredCases() {
    if (activeFilter === 'all') return cases;
    if (activeFilter === 'featured') return cases.filter(item => item.featured);
    return cases.filter(item => item.category === activeFilter);
  }

  function renderGallery() {
    const gallery = $('caseGallery');
    if (!gallery) return;
    gallery.innerHTML = '';
    activeRecord = api?.active?.() || null;
    const visible = filteredCases();

    if (!visible.length) {
      gallery.innerHTML = '<p class="case-empty">No scenarios match this filter.</p>';
      return;
    }

    visible.forEach(item => {
      const inProgress = activeRecord?.scenarioId === item.id;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `case-choice${inProgress ? ' has-progress' : ''}${item.featured ? ' is-featured' : ''}`;
      button.dataset.case = item.id;
      button.dataset.category = item.category;
      button.setAttribute('aria-label', `${item.title}. ${inProgress ? 'Scenario in progress. Continue or reset.' : 'Choose practice mode.'}`);
      button.innerHTML = `
        <span class="case-image-wrap">
          <img src="${item.image}" alt="${item.title} patient scenario">
          <span class="case-badge">${item.badge}</span>
          ${inProgress ? '<span class="progress-badge">In progress</span>' : ''}
        </span>
        <span class="case-choice-body">
          <strong>${item.title}</strong>
          <span>${item.patient}</span>
          <small>${inProgress ? 'Tap to continue or reset' : 'Tap to choose a mode'}</small>
        </span>`;
      button.addEventListener('click', () => openCaseDialog(item));
      gallery.appendChild(button);
    });
  }

  function syncFilterButtons() {
    document.querySelectorAll('[data-case-filter]').forEach(button => {
      const active = button.dataset.caseFilter === activeFilter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
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
    location.href = patientHome(item.id, mode, { reset: true });
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

  document.querySelectorAll('[data-case-filter]').forEach(button => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.caseFilter || 'all';
      syncFilterButtons();
      renderGallery();
    });
  });

  $('randomCase')?.addEventListener('click', () => {
    const pool = filteredCases();
    const item = pool[Math.floor(Math.random() * pool.length)];
    if (item) openCaseDialog(item);
  });
  $('closeCaseDialog').addEventListener('click', closeCaseDialog);
  $('caseDialogBackdrop').addEventListener('click', closeCaseDialog);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('caseDialog').hidden) closeCaseDialog();
  });
  window.addEventListener('pageshow', renderGallery);

  syncFilterButtons();
  renderGallery();

  const params = new URLSearchParams(location.search);
  const requested = params.get('select') || params.get('case');
  if (requested && cases.some(item => item.id === requested) && (params.get('open') === '1' || params.get('ended') === '1')) {
    openCaseDialog(cases.find(item => item.id === requested));
  }
})();
