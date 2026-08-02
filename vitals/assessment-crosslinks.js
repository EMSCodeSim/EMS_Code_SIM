(() => {
  'use strict';

  let api = window.EMSCodeSimPatientRecord;
  let registry = window.EMSCodeSimToolRegistry;
  let session = window.EMSCodeSimScenarioSession;
  const path = location.pathname;
  let record = null;
  let caseId = '';
  let scenarioHome = '/vitals/visual-patient.html';

  const scenarioFindings = {
    asthma: {
      airway: ['Airway patent at this time; patient is speaking in short sentences.', 'No visible obstruction, secretions, swelling, or abnormal upper-airway sound noted.'],
      breathing: ['Breathing is labored with increased work of breathing and limited speech.', 'Upright positioning and accessory-muscle use are present. Respiratory rate, lung sounds, and SpO₂ require separate tools.'],
      perfusion: ['A perfusing pulse is present; detailed perfusion remains unconfirmed.', 'Patient is awake and responsive. Pulse quality, skin signs, capillary refill, and blood pressure require separate tools.']
    },
    stroke: {
      airway: ['Airway patent at this time; patient can speak, although speech is abnormal.', 'Continue to monitor airway protection because neurologic status may change.'],
      breathing: ['Spontaneous breathing is present without an obvious immediate ventilatory threat.', 'Rate, depth, lung sounds, and oxygenation require separate tools.'],
      perfusion: ['A perfusing pulse is present; no major external hemorrhage is visible.', 'Pulse quality, skin signs, capillary refill, and blood pressure require separate tools.']
    },
    hypoglycemia: {
      airway: ['Airway is open, but protection may be at risk because the patient is confused.', 'No visible obstruction is present. Continue monitoring mental status and airway protection.'],
      breathing: ['Spontaneous breathing is present without an obvious immediate ventilatory threat.', 'Rate, depth, lung sounds, and oxygenation require separate tools.'],
      perfusion: ['A perfusing pulse is present; the patient appears diaphoretic.', 'Pulse quality, blood pressure, capillary refill, and complete skin findings require separate tools.']
    },
    trauma: {
      airway: ['Airway is currently open, but trauma risk requires continued reassessment.', 'No obvious airway obstruction is visible. Maintain spinal precautions when indicated.'],
      breathing: ['Breathing is present but guarded and may be inadequate.', 'Chest symmetry, rate, depth, breath sounds, and oxygenation require focused assessment.'],
      perfusion: ['A perfusing pulse is present, but the patient appears pale after significant trauma.', 'Check for major bleeding, pulse quality, skin signs, capillary refill, and blood pressure.']
    },
    pediatric: {
      airway: ['Air is moving, but airway patency and protection are not fully confirmed.', 'Poor interaction increases concern for deterioration. Assess airway sounds and secretions.'],
      breathing: ['Breathing is present with visibly increased work.', 'Rate, depth, retractions, breath sounds, chest rise, and oxygenation require focused assessment.'],
      perfusion: ['Circulation is present; complete perfusion status is not yet known.', 'Assess pulse quality, capillary refill, skin temperature and moisture, and blood pressure when indicated.']
    }
  };

  const assessmentPages = {
    '/vitals/airway-assessment.html': ['airway', 'Airway Assessment'],
    '/vitals/breathing-assessment.html': ['breathing', 'Breathing Assessment'],
    '/vitals/perfusion-assessment.html': ['perfusion', 'Perfusion Assessment'],
    '/vitals/chest-assessment.html': ['chest_assessment', 'Chest Assessment'],
    '/vitals/abdominal-assessment.html': ['abdominal_assessment', 'Abdominal Assessment'],
    '/vitals/trauma-assessment.html': ['trauma_assessment', 'Trauma Assessment'],
    '/vitals/motor-sensory-assessment.html': ['motor_sensory', 'Motor and Sensory Assessment'],
    '/vitals/pediatric-assessment-triangle.html': ['pediatric_assessment_triangle', 'Pediatric Assessment Triangle'],
    '/vitals/sample-history.html': ['sample', 'SAMPLE History'],
    '/vitals/pain-opqrst.html': ['pain', 'OPQRST Assessment']
  };

  const airwayActions = {
    position: {
      treatment: 'Head-tilt/chin-lift performed to open the airway.',
      response: 'Airway opened and the patient begins breathing with improved air movement.'
    },
    suction: {
      treatment: 'Airway exposed, cleared, and suctioned.',
      response: 'Secretions decreased, gurgling improved, and air movement increased.'
    },
    support: {
      treatment: 'Immediate airway obstruction or ventilation support performed per training and protocol.',
      response: 'Air movement improved after airway support; breathing was reassessed.'
    },
    rapid: {
      treatment: 'Airway maintained, oxygen support initiated as indicated, and rapid transport/ALS support requested.',
      response: 'Airway remains open with continued close monitoring during rapid transport preparation.'
    }
  };

  const meta = assessmentPages[path];
  if (!meta) return;
  const [key, label] = meta;

  const text = id => document.getElementById(id)?.textContent?.trim() || '';
  const selected = selector => document.querySelector(selector)?.value || '';

  function saveFinding(normality) {
    const latest = session?.sync?.(caseId) || api?.active?.();
    const finding = text('findingText');
    const details = text('findingDetail');
    if (!finding) return false;
    session?.saveFinding?.(key, finding, {
      label,
      details,
      normality: normality === 'normal' ? 'normal' : 'not-normal',
      status: normality === 'normal' ? 'normal' : 'abnormal',
      interpretation: selected('#problemSelect'),
      action: selected('#actionSelect'),
      source: path,
      scenarioTitle: latest?.title || ''
    });
    return true;
  }

  function recordSelectedTreatment() {
    if (key !== 'airway') return;
    const action = selected('#actionSelect');
    const effect = airwayActions[action];
    if (!effect) return;
    session?.addTreatment?.({
      treatment: effect.treatment,
      description: effect.treatment,
      label: 'Airway treatment',
      source: 'assessment-follow-up',
      assessment: key,
      action
    });
    session?.addReassessment?.({
      response: effect.response,
      description: effect.response,
      label: 'Patient response to airway treatment',
      source: 'assessment-follow-up',
      assessment: key,
      action
    });
  }

  function returnHome() {
    location.href = scenarioHome;
  }

  function simplifyScenarioAssessment() {
    const practice = document.getElementById('practicePanel') || document.querySelector('main');
    practice?.classList.add('scenario-assessment-direct');

    const perform = document.querySelector('#assessAirway,#performAssessment,[data-action="perform-assessment"]');
    if (perform) {
      perform.classList.add('scenario-perform-button');
      if (!perform.disabled) perform.click();
    }

    const patientFinding = scenarioFindings[caseId]?.[key];
    if (patientFinding) {
      setTimeout(() => {
        const findingText = document.getElementById('findingText');
        const findingDetail = document.getElementById('findingDetail');
        const findingBox = document.getElementById('findingBox');
        if (findingText) findingText.textContent = patientFinding[0];
        if (findingDetail) findingDetail.textContent = patientFinding[1];
        if (findingBox) findingBox.hidden = false;
      }, 20);
    }

    document.querySelectorAll('#pcrText,#docText').forEach(field => {
      const wrapper = field.closest('.decision-step,.form-field,label') || field.parentElement;
      wrapper?.remove();
    });

    const form = document.querySelector('form[id$="Form"],#painForm,#sampleForm,#patForm') || practice;
    const grade = form?.querySelector('button[type="submit"],input[type="submit"]');
    if (grade) { grade.classList.add('scenario-grade-hidden'); grade.remove(); }

    const followUpSteps = [...document.querySelectorAll('.decision-step')].filter(step => {
      return step.querySelector('#problemSelect,#actionSelect') || ['2','3'].includes(step.dataset.step);
    });
    followUpSteps.forEach(step => { step.hidden = true; step.classList.add('scenario-abnormal-followup'); });

    document.querySelectorAll('input[name="normality"],input[name="classification"]').forEach(input => {
      input.addEventListener('change', () => {
        const value = input.value === 'normal' ? 'normal' : 'not-normal';
        if (value === 'normal') {
          saveFinding('normal');
          returnHome();
          return;
        }
        followUpSteps.forEach(step => { step.hidden = false; });
        document.querySelector('.scenario-assessment-actions')?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    });

    if (form && !form.querySelector('.scenario-assessment-actions')) {
      const actions = document.createElement('div');
      actions.className = 'scenario-assessment-actions';
      const returnButton = document.createElement('button');
      returnButton.type = 'button';
      returnButton.className = 'continue-patient';
      returnButton.textContent = 'Continue to Patient Home';
      returnButton.addEventListener('click', () => {
        const normality = document.querySelector('input[name="normality"]:checked,input[name="classification"]:checked')?.value;
        if (!normality) {
          alert('Classify the finding as Normal or Not Normal first.');
          return;
        }
        if (normality !== 'normal') {
          const required = [...document.querySelectorAll('.scenario-abnormal-followup select[required]')];
          const missing = required.find(field => !field.value);
          if (missing) {
            missing.focus();
            alert('Complete the abnormal finding follow-up before continuing.');
            return;
          }
        }
        saveFinding(normality === 'normal' ? 'normal' : 'not-normal');
        if (normality !== 'normal') recordSelectedTreatment();
        returnHome();
      });
      actions.appendChild(returnButton);
      form.appendChild(actions);
    }

    setTimeout(() => {
      const box = document.getElementById('findingBox');
      if (box) box.hidden = false;
    }, 60);
  }

  function initializeScenarioAssessment() {
    api = window.EMSCodeSimPatientRecord;
    registry = window.EMSCodeSimToolRegistry;
    session = window.EMSCodeSimScenarioSession;
    record = session?.sync?.() || api?.active?.();
    if (!record || !registry) return false;
    caseId = record.scenarioId || record.id;
    scenarioHome = session?.scenarioHome?.(caseId) || `/vitals/visual-patient.html?case=${encodeURIComponent(caseId)}`;
    simplifyScenarioAssessment();
    return true;
  }

  function initializeWithRetry(attempt = 0) {
    if (initializeScenarioAssessment()) return;
    if (attempt < 12) setTimeout(() => initializeWithRetry(attempt + 1), 75);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initializeWithRetry(), { once: true });
  else initializeWithRetry();
  window.addEventListener('load', () => initializeWithRetry());
  window.addEventListener('pageshow', () => setTimeout(() => initializeWithRetry(), 40));
})();
