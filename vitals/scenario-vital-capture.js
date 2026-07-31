(() => {
  'use strict';

  const runtime = window.EMSCodeSimScenarioRuntime;
  const patientApi = window.EMSCodeSimPatientRecord;
  if (!runtime?.active?.() || !patientApi?.active?.()) return;

  const page = location.pathname.split('/').pop();
  const definitions = {
    'bp.html': {
      key: 'blood_pressure', label: 'Blood pressure', shortLabel: 'BP',
      value: vitals => vitals.bp,
      ready: ['#submitBtn'], partnerDelay: 20,
      prompt: 'Use the cuff and Korotkoff sounds. Enter the systolic and diastolic reading.',
      expected: vitals => vitals.systolic < 90 || vitals.systolic >= 180 || vitals.diastolic >= 120 ? 'not-normal' : 'normal'
    },
    'pulse.html': {
      key: 'pulse', label: 'Pulse', shortLabel: 'Pulse',
      value: vitals => `${vitals.pulse}/min`,
      ready: ['#checkBtn'], partnerDelay: 12,
      prompt: 'Count the pulse, then identify the rate. Include rhythm and quality when the simulator provides them.',
      expected: vitals => vitals.pulse < 60 || vitals.pulse > 100 ? 'not-normal' : 'normal'
    },
    'respiratory-rate.html': {
      key: 'respirations', label: 'Respirations', shortLabel: 'RR',
      value: vitals => `${vitals.respirations}/min`,
      ready: ['#checkBtn'], partnerDelay: 15,
      prompt: 'Observe without announcing the count. Obtain the rate and note effort or depth.',
      expected: vitals => vitals.respirations < 12 || vitals.respirations > 20 ? 'not-normal' : 'normal'
    },
    'pulse-ox.html': {
      key: 'spo2', label: 'Oxygen saturation', shortLabel: 'SpO₂',
      value: vitals => `${vitals.spo2}%`,
      ready: ['#choicesBox .choice'], partnerDelay: 10,
      prompt: 'Confirm a usable signal, read the saturation, and compare it with the patient’s breathing.',
      expected: vitals => vitals.spo2 < 94 ? 'not-normal' : 'normal'
    },
    'bgl.html': {
      key: 'blood_glucose', label: 'Blood glucose', shortLabel: 'BGL',
      value: vitals => `${vitals.bgl} mg/dL`,
      ready: ['#applyBtn'], partnerDelay: 20,
      prompt: 'Complete the glucometer sequence and obtain the blood glucose reading.',
      expected: vitals => vitals.bgl < 70 || vitals.bgl > 200 ? 'not-normal' : 'normal'
    },
    'temperature.html': {
      key: 'temperature', label: 'Temperature', shortLabel: 'Temp',
      value: vitals => vitals.temperature,
      ready: ['#checkBtn'], partnerDelay: 12,
      prompt: 'Obtain the temperature and determine whether it fits the patient presentation.',
      expected: vitals => {
        const numeric = Number.parseFloat(String(vitals.temperature));
        return numeric < 96.8 || numeric >= 100.4 ? 'not-normal' : 'normal';
      }
    },
    'avpu.html': {
      key: 'mental_status', label: 'Mental status', shortLabel: 'Mental status',
      value: vitals => vitals.orientation || vitals.avpu,
      ready: ['#checkBtn'], partnerDelay: 8,
      prompt: 'Assess responsiveness and orientation, then report the most objective finding.',
      expected: vitals => vitals.avpu === 'A' && /x4/i.test(String(vitals.orientation || '')) ? 'normal' : 'not-normal'
    },
    'pupil.html': {
      key: 'pupils', label: 'Pupils', shortLabel: 'Pupils',
      value: vitals => vitals.pupils,
      ready: ['#btnGrade'], partnerDelay: 10,
      prompt: 'Inspect size, equality, and reactivity, then report both pupils objectively.',
      expected: vitals => /equal and reactive|perrl/i.test(String(vitals.pupils || '')) ? 'normal' : 'not-normal'
    },
    'skin.html': {
      key: 'skin', label: 'Skin signs', shortLabel: 'Skin',
      value: vitals => vitals.skin,
      ready: ['#crtBtn', '#btnPale', '#btnFlush', '#moistWet', '#moistDry', '#tempPlus', '#tempMinus'],
      partnerDelay: 8,
      prompt: 'Assess color, temperature, moisture, and capillary refill, then report the combined finding.',
      expected: vitals => /pale|cool|clammy|diaphoretic|mottled|cyan|hot|flushed/i.test(String(vitals.skin || '')) ? 'not-normal' : 'normal'
    },
    'breath-sound-simulator.html': {
      key: 'breath_sounds', label: 'Breath sounds', shortLabel: 'Lung sounds',
      value: vitals => vitals.breathSounds,
      ready: ['.point'], partnerDelay: 18,
      prompt: 'Auscultate multiple lung fields and report the sound and location.',
      expected: vitals => vitals.breathSoundType === 'normal' ? 'normal' : 'not-normal'
    }
  };

  const definition = definitions[page];
  if (!definition) return;

  const profile = runtime.profile?.();
  const vitals = profile?.vitals || {};
  const record = patientApi.active();
  let obtained = false;
  let selectedClassification = '';
  let saved = Boolean(record?.findings?.[definition.key]);
  let partnerTimer = null;
  let partnerBusy = false;

  document.documentElement.classList.add('scenario-vital-mode');
  document.body.classList.add('scenario-vital-mode');

  const host = document.createElement('section');
  host.id = 'scenarioVitalCapture';
  host.setAttribute('aria-label', `${definition.label} scenario collection`);
  host.innerHTML = `
    <div class="svc-card">
      <div class="svc-heading">
        <div>
          <p class="svc-eyebrow">Patient assessment • quick collection</p>
          <h2>${definition.label}</h2>
        </div>
        <a class="svc-list-link" href="/vitals/patient-record.html?mode=scenario&resume=1">Overall findings <span class="svc-count"></span></a>
      </div>

      <div class="svc-steps" aria-label="Collection steps">
        <span class="is-active" data-step="obtain"><b>1</b> Obtain</span>
        <span data-step="classify"><b>2</b> Classify</span>
        <span data-step="report"><b>3</b> Report</span>
      </div>

      <p class="svc-prompt">${definition.prompt}</p>

      <div class="svc-obtain-actions">
        <button class="svc-partner" type="button" ${saved ? 'disabled' : ''}>Assign to partner</button>
      </div>

      <div class="svc-partner-status" hidden>
        <div class="svc-partner-row">
          <strong>Partner obtaining ${definition.label.toLowerCase()}</strong>
          <span class="svc-countdown"></span>
        </div>
        <div class="svc-progress"><span></span></div>
        <button class="svc-cancel" type="button">Cancel</button>
      </div>

      <div class="svc-result" hidden>
        <span>Obtained finding</span>
        <strong class="svc-result-value"></strong>
      </div>

      <fieldset class="svc-classification" disabled>
        <legend>Is this finding normal or not normal?</legend>
        <div class="svc-classification-buttons">
          <button type="button" data-classification="normal">Normal</button>
          <button type="button" data-classification="not-normal">Not Normal</button>
        </div>
      </fieldset>

      <button class="svc-record" type="button" disabled>${saved ? 'Finding already reported' : 'Report to patient assessment'}</button>
      <div class="svc-message" aria-live="polite"></div>
    </div>`;

  const firstMain = document.querySelector('main');
  if (firstMain) firstMain.before(host);
  else document.body.prepend(host);

  const count = host.querySelector('.svc-count');
  const partnerButton = host.querySelector('.svc-partner');
  const partnerStatus = host.querySelector('.svc-partner-status');
  const countdown = host.querySelector('.svc-countdown');
  const progress = host.querySelector('.svc-progress span');
  const cancelButton = host.querySelector('.svc-cancel');
  const resultBox = host.querySelector('.svc-result');
  const resultValue = host.querySelector('.svc-result-value');
  const classificationFieldset = host.querySelector('.svc-classification');
  const classificationButtons = [...host.querySelectorAll('[data-classification]')];
  const recordButton = host.querySelector('.svc-record');
  const message = host.querySelector('.svc-message');
  const steps = {
    obtain: host.querySelector('[data-step="obtain"]'),
    classify: host.querySelector('[data-step="classify"]'),
    report: host.querySelector('[data-step="report"]')
  };

  function updateFindingCount() {
    const total = Object.keys(patientApi.active()?.findings || {}).length;
    count.textContent = `(${total})`;
  }

  function setStep(name) {
    Object.entries(steps).forEach(([key, element]) => {
      element.classList.toggle('is-active', key === name);
      element.classList.toggle('is-complete',
        (key === 'obtain' && obtained) ||
        (key === 'classify' && Boolean(selectedClassification)) ||
        (key === 'report' && saved)
      );
    });
  }

  function showObtainedFinding(source = 'learner') {
    if (saved) return;
    obtained = true;
    partnerBusy = false;
    clearInterval(partnerTimer);
    partnerStatus.hidden = true;
    partnerButton.disabled = true;
    resultValue.textContent = definition.value(vitals);
    resultBox.hidden = false;
    classificationFieldset.disabled = false;
    message.className = 'svc-message';
    message.textContent = source === 'partner'
      ? 'Partner report received. Classify the finding before adding it to the patient assessment.'
      : 'Finding obtained. Classify it before reporting.';
    setStep('classify');
    host.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function matchesCompletionControl(target) {
    return definition.ready.some(selector => target.closest?.(selector));
  }

  document.addEventListener('click', event => {
    if (!saved && !partnerBusy && matchesCompletionControl(event.target)) {
      window.setTimeout(() => showObtainedFinding('learner'), 150);
    }
  });

  const observer = new MutationObserver(() => {
    if (saved || obtained || partnerBusy) return;
    const pageText = document.body.innerText || '';
    if (/correct|result ready|observation complete|actual finding|reading complete|assessment complete/i.test(pageText)) {
      showObtainedFinding('learner');
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true });

  classificationButtons.forEach(button => {
    button.addEventListener('click', () => {
      selectedClassification = button.dataset.classification;
      classificationButtons.forEach(item => {
        const selected = item === button;
        item.classList.toggle('is-selected', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      recordButton.disabled = false;
      message.textContent = 'Classification selected. Report the finding to the overall patient assessment.';
      setStep('report');
    });
  });

  function saveFinding(source = 'scenario-simulator') {
    if (saved || !obtained || !selectedClassification) return;
    const finding = definition.value(vitals);
    const expectedClassification = definition.expected(vitals);
    const classificationCorrect = selectedClassification === expectedClassification;

    patientApi.setFinding(definition.key, finding, {
      label: definition.label,
      shortLabel: definition.shortLabel,
      finding,
      normality: selectedClassification,
      learnerClassification: selectedClassification,
      expectedClassification,
      classificationCorrect,
      status: expectedClassification === 'normal' ? 'normal' : 'abnormal',
      source,
      locked: true,
      reportFormat: `${definition.shortLabel}: ${finding}`,
      recordedAt: new Date().toISOString()
    });

    saved = true;
    recordButton.disabled = true;
    partnerButton.disabled = true;
    classificationFieldset.disabled = true;
    recordButton.textContent = 'Reported to patient assessment';
    message.className = classificationCorrect ? 'svc-message svc-saved' : 'svc-message svc-review';
    message.innerHTML = classificationCorrect
      ? `<strong>Saved:</strong> ${definition.shortLabel}: ${finding}. Your classification was correct.`
      : `<strong>Saved:</strong> ${definition.shortLabel}: ${finding}. Review: this scenario treats the finding as <b>${expectedClassification === 'normal' ? 'Normal' : 'Not Normal'}</b>.`;
    updateFindingCount();
    setStep('report');

    const detail = {
      assessment: definition.key,
      label: definition.label,
      finding,
      normality: selectedClassification,
      expectedNormality: expectedClassification,
      classificationCorrect,
      source
    };
    window.dispatchEvent(new CustomEvent('emscodesim:assessment-saved', { detail }));
  }

  recordButton.addEventListener('click', () => saveFinding('scenario-simulator'));

  partnerButton.addEventListener('click', () => {
    if (saved || partnerBusy || obtained) return;
    partnerBusy = true;
    partnerButton.disabled = true;
    partnerStatus.hidden = false;
    message.className = 'svc-message';
    message.textContent = 'Continue your assessment while your partner obtains this finding.';

    const total = Math.max(5, Number(definition.partnerDelay) || 12);
    let remaining = total;
    countdown.textContent = `${remaining}s`;
    progress.style.width = '0%';
    partnerTimer = window.setInterval(() => {
      remaining -= 1;
      countdown.textContent = `${Math.max(remaining, 0)}s`;
      progress.style.width = `${Math.min(100, ((total - remaining) / total) * 100)}%`;
      if (remaining <= 0) showObtainedFinding('partner');
    }, 1000);
  });

  cancelButton.addEventListener('click', () => {
    if (!partnerBusy || saved) return;
    clearInterval(partnerTimer);
    partnerBusy = false;
    partnerStatus.hidden = true;
    partnerButton.disabled = false;
    message.textContent = 'Partner assignment canceled. Obtain the finding yourself or assign it again.';
  });

  // Configure the skin simulator to visually match the active patient without
  // displaying the written answer before the learner completes the assessment.
  if (page === 'skin.html') {
    window.setTimeout(() => {
      const text = String(vitals.skin || '').toLowerCase();
      const press = selector => {
        const element = document.querySelector(selector);
        if (element && element.getAttribute('aria-pressed') !== 'true') element.click();
      };
      if (text.includes('pale')) press('#btnPale');
      if (text.includes('flushed')) press('#btnFlush');
      if (text.includes('diaphoretic') || text.includes('clammy')) press('#moistWet');
      else if (text.includes('dry')) press('#moistDry');
      if (text.includes('cool')) for (let i = 0; i < 5; i += 1) document.querySelector('#tempMinus')?.click();
      if (text.includes('hot') || text.includes('warm')) for (let i = 0; i < 5; i += 1) document.querySelector('#tempPlus')?.click();
      obtained = false;
      selectedClassification = '';
      resultBox.hidden = true;
      classificationFieldset.disabled = true;
      recordButton.disabled = true;
      setStep('obtain');
    }, 120);
  }

  updateFindingCount();
  if (saved) {
    const existing = patientApi.active()?.findings?.[definition.key];
    obtained = true;
    selectedClassification = existing?.learnerClassification || existing?.normality || '';
    resultValue.textContent = existing?.value || existing?.finding || definition.value(vitals);
    resultBox.hidden = false;
    classificationFieldset.hidden = true;
    partnerButton.hidden = true;
    message.className = 'svc-message svc-saved';
    message.innerHTML = `<strong>Already reported:</strong> ${definition.shortLabel}: ${resultValue.textContent}`;
    setStep('report');
  }
})();
