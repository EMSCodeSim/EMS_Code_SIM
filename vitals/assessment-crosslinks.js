(() => {
  'use strict';

  const api = window.EMSCodeSimPatientRecord;
  const registry = window.EMSCodeSimToolRegistry;
  const session = window.EMSCodeSimScenarioSession;
  const record = session?.sync?.() || api?.active?.();
  if (!record || !registry) return;

  const path = location.pathname;
  const caseId = record.scenarioId || record.id;
  const scenarioHome = session?.scenarioHome?.(caseId) || `/vitals/visual-patient.html?case=${encodeURIComponent(caseId)}`;
  const currentReturn = `${path}?mode=scenario&resume=1&case=${encodeURIComponent(caseId)}`;


  const assessmentPages = {
    '/vitals/airway-assessment.html': ['airway', 'Airway Assessment'],
    '/vitals/breathing-assessment.html': ['breathing', 'Breathing Assessment'],
    '/vitals/perfusion-assessment.html': ['perfusion', 'Perfusion Assessment'],
    '/vitals/chest-assessment.html': ['chest', 'Chest Assessment'],
    '/vitals/abdominal-assessment.html': ['abdominal', 'Abdominal Assessment'],
    '/vitals/trauma-assessment.html': ['trauma', 'Trauma Assessment'],
    '/vitals/motor-sensory-assessment.html': ['motor_sensory', 'Motor and Sensory Assessment'],
    '/vitals/pediatric-assessment-triangle.html': ['pat', 'Pediatric Assessment Triangle'],
    '/vitals/sample-history.html': ['sample', 'SAMPLE History'],
    '/vitals/pain-opqrst.html': ['opqrst', 'OPQRST Assessment']
  };

  function saveViewedFinding(key, label) {
    const latest = session?.sync?.(caseId) || api?.active?.();
    if (api?.hasFinding?.(key, latest)) return;
    const finding = document.getElementById('findingText')?.textContent?.trim() || '';
    const details = document.getElementById('findingDetail')?.textContent?.trim() || '';
    if (!finding) return;
    window.EMSCodeSimAssessmentIntegration?.saveAssessment?.({
      assessment: key,
      label,
      scenarioTitle: latest?.title || '',
      finding,
      details,
      normality: '',
      expectedNormality: '',
      interpretation: '',
      action: '',
      documentation: '',
      score: null,
      maxScore: null,
      viewedOnly: true
    });
  }

  function simplifyScenarioAssessment() {
    const meta = assessmentPages[path];
    if (!meta) return;
    const [key, label] = meta;
    const practice = document.getElementById('practicePanel') || document.querySelector('main');
    practice?.classList.add('scenario-assessment-direct');

    const perform = document.querySelector('#assessAirway,#performAssessment,[data-action="perform-assessment"]');
    if (perform) {
      perform.classList.add('scenario-perform-button');
      if (!perform.disabled) perform.click();
    }

    document.querySelectorAll('#pcrText,#docText').forEach(field => {
      const wrapper = field.closest('.decision-step,.form-field,label') || field.parentElement;
      wrapper?.classList.add('scenario-note-field');
    });

    const form = document.querySelector('form[id$="Form"],#painForm,#sampleForm,#patForm');
    const grade = form?.querySelector('button[type="submit"],input[type="submit"]');
    if (grade) {
      grade.textContent = 'Grade my assessment (optional)';
      grade.classList.add('optional-grade');
    }

    if (form && !form.querySelector('.scenario-assessment-actions')) {
      const actions = document.createElement('div');
      actions.className = 'scenario-assessment-actions';
      if (grade) actions.appendChild(grade);
      const continueButton = document.createElement('button');
      continueButton.type = 'button';
      continueButton.className = 'continue-patient';
      continueButton.textContent = 'Continue to patient';
      continueButton.addEventListener('click', () => {
        saveViewedFinding(key, label);
        location.href = scenarioHome;
      });
      actions.appendChild(continueButton);
      form.appendChild(actions);
    }

    // Wait for the page-specific assessment script to populate the finding.
    setTimeout(() => {
      const box = document.getElementById('findingBox');
      if (box) box.hidden = false;
    }, 60);
  }

  setTimeout(simplifyScenarioAssessment, 80);
  window.addEventListener('pageshow', () => setTimeout(simplifyScenarioAssessment, 40));

  const configs = {
    '/vitals/airway-assessment.html': {
      key: 'airway', label: 'Airway assessment',
      title: 'Continue the airway and breathing assessment',
      text: 'Airway patency is only one part of the respiratory picture. Gather the remaining information without revealing the patient’s answers.',
      links: [['Breathing assessment','/vitals/breathing-assessment.html','primary'],['Respiratory rate','/vitals/respiratory-rate-scenario.html'],['Breath sounds','/vitals/breath-sounds-scenario.html'],['SpO₂','/vitals/pulse-ox-scenario.html']]
    },
    '/vitals/breathing-assessment.html': {
      key: 'breathing', label: 'Breathing assessment',
      title: 'Complete the respiratory picture',
      text: 'Measure rate and oxygenation, auscultate the lungs, then return here to interpret whether ventilation is adequate.',
      links: [['Airway assessment','/vitals/airway-assessment.html','primary'],['Respiratory rate','/vitals/respiratory-rate-scenario.html'],['Breath sounds','/vitals/breath-sounds-scenario.html'],['SpO₂','/vitals/pulse-ox-scenario.html']]
    },
    '/vitals/perfusion-assessment.html': {
      key: 'perfusion', label: 'Perfusion assessment',
      title: 'Complete circulation and perfusion',
      text: 'Obtain objective vital signs and skin findings, then return to interpret the overall perfusion picture.',
      links: [['Pulse','/vitals/pulse-scenario.html'],['Blood pressure','/vitals/bp-scenario.html'],['Skin signs','/vitals/skin-scenario.html']]
    }
  };

  const config = configs[path];
  if (!config) return;

  let host = document.getElementById('scenarioConnectedTools');
  if (!host) {
    host = document.createElement('section');
    host.id = 'scenarioConnectedTools';
    host.className = 'scenario-connected-tools';
    const practicePanel = document.getElementById('practicePanel');
    (practicePanel || document.querySelector('main'))?.appendChild(host);
  }

  function linkedUrl(url, context = '') {
    return registry.buildUrl(url, { caseId, returnTo: currentReturn, returnLabel: config.label, context });
  }

  function render() {
    const findingRecorded = Boolean(api?.hasFinding?.(config.key, session?.sync?.(caseId) || api?.active?.()));
    host.innerHTML = `<div class="scenario-connected-card"><p class="eyebrow">Connected scenario tools</p><h2>${config.title}</h2><p>${config.text}</p><div class="scenario-connected-actions"></div><p class="scenario-return-note">Each linked simulator returns directly to this assessment. Patient home returns to the main scenario.</p></div>`;
    const actions = host.querySelector('.scenario-connected-actions');

    config.links.forEach(([label, url, className = '']) => {
      const link = document.createElement('a');
      link.textContent = label;
      link.className = className;
      link.href = linkedUrl(url);
      actions.appendChild(link);
    });

    if (findingRecorded) {
      const treatment = document.createElement('a');
      treatment.textContent = `Treat recorded ${config.key} finding`;
      treatment.className = 'treat';
      treatment.href = linkedUrl('/vitals/treatment-reassessment.html', config.key);
      actions.appendChild(treatment);
    } else {
      const note = document.createElement('span');
      note.className = 'treatment-locked-note';
      note.textContent = 'Record the assessment finding to unlock treatment.';
      actions.appendChild(note);
    }

    const allTools = document.createElement('a');
    allTools.textContent = 'All assessment tools';
    allTools.href = registry.buildUrl('/vitals/assessment-workspace.html', { caseId });
    actions.appendChild(allTools);

    const home = document.createElement('a');
    home.textContent = 'Patient home';
    home.className = 'home';
    home.href = scenarioHome;
    actions.appendChild(home);
  }

  window.addEventListener('emscodesim:assessment-saved', render);
  window.addEventListener('emscodesim:scenario-finding-saved', render);
  window.addEventListener('pageshow', render);
  render();
})();
