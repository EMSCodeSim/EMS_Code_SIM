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

  const meta = assessmentPages[path];
  if (!meta) return;
  const [key, label] = meta;

  function saveViewedFinding() {
    const latest = session?.sync?.(caseId) || api?.active?.();
    if (api?.hasFinding?.(key, latest)) return true;
    const finding = document.getElementById('findingText')?.textContent?.trim() || '';
    const details = document.getElementById('findingDetail')?.textContent?.trim() || '';
    if (!finding) return false;
    if (window.EMSCodeSimAssessmentIntegration?.saveAssessment) {
      window.EMSCodeSimAssessmentIntegration.saveAssessment({
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
      return true;
    }
    session?.saveFinding?.(key, finding, { label, details, source: path, viewedOnly: true });
    return true;
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
      wrapper?.classList.add('scenario-note-field');
    });

    const form = document.querySelector('form[id$="Form"],#painForm,#sampleForm,#patForm') || practice;
    const grade = form?.querySelector('button[type="submit"],input[type="submit"]');
    if (grade) {
      if ('value' in grade && grade.tagName === 'INPUT') grade.value = 'Grade my assessment (optional)';
      else grade.textContent = 'Grade my assessment (optional)';
      grade.classList.add('optional-grade');
    }

    if (form && !form.querySelector('.scenario-assessment-actions')) {
      const actions = document.createElement('div');
      actions.className = 'scenario-assessment-actions';
      const returnButton = document.createElement('button');
      returnButton.type = 'button';
      returnButton.className = 'continue-patient';
      returnButton.textContent = 'Save and Return to Patient';
      returnButton.addEventListener('click', () => {
        saveViewedFinding();
        location.href = scenarioHome;
      });
      actions.appendChild(returnButton);
      form.appendChild(actions);
    }

    setTimeout(() => {
      const box = document.getElementById('findingBox');
      if (box) box.hidden = false;
    }, 60);
  }

  setTimeout(simplifyScenarioAssessment, 80);
  window.addEventListener('pageshow', () => setTimeout(simplifyScenarioAssessment, 40));
})();
