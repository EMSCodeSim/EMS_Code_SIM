(() => {
  'use strict';

  const assessmentTools = [
    { category: 'Primary assessment', key: 'airway', label: 'Airway assessment', description: 'Determine patency, threats, sounds, secretions, and protection.', url: '/vitals/airway-assessment.html' },
    { category: 'Primary assessment', key: 'breathing', label: 'Breathing assessment', description: 'Judge rate, depth, effort, chest rise, speech, and adequacy.', url: '/vitals/breathing-assessment.html' },
    { category: 'Primary assessment', key: 'perfusion', label: 'Circulation and perfusion', description: 'Assess pulse quality, major bleeding, skin, and capillary refill.', url: '/vitals/perfusion-assessment.html' },
    { category: 'Neurologic', key: 'mental_status', label: 'Mental status / AVPU', description: 'Assess alertness and response to voice or pain.', url: '/vitals/avpu-scenario.html' },
    { category: 'Neurologic', key: 'pupils', label: 'Pupils, light, and gaze', description: 'Assess equality, response to light, gaze position, and tracking.', url: '/vitals/pupil-scenario.html' },
    { category: 'Neurologic', key: 'motor_sensory', label: 'Motor, sensory, and stroke findings', description: 'Compare facial movement, speech, strength, drift, and sensation.', url: '/vitals/motor-sensory-assessment.html' },
    { category: 'Neurologic', key: 'gcs', label: 'Glasgow Coma Scale', description: 'Score eye, verbal, and motor responses.', url: '/vitals/gcs.html' },
    { category: 'Respiratory', key: 'breath_sounds', label: 'Breath sounds', description: 'Auscultate and compare all lung fields.', url: '/vitals/breath-sounds-scenario.html' },
    { category: 'Respiratory', key: 'chest_assessment', label: 'Chest assessment', description: 'Inspect and palpate chest movement, tenderness, and injury.', url: '/vitals/chest-assessment.html' },
    { category: 'Focused examination', key: 'skin', label: 'Skin signs', description: 'Compare color, temperature, moisture, and perfusion clues.', url: '/vitals/skin-scenario.html' },
    { category: 'Focused examination', key: 'abdominal_assessment', label: 'Abdominal assessment', description: 'Assess tenderness, guarding, rigidity, and distention.', url: '/vitals/abdominal-assessment.html' },
    { category: 'Focused examination', key: 'trauma_assessment', label: 'Rapid trauma assessment', description: 'Perform a systematic head-to-toe trauma examination.', url: '/vitals/trauma-assessment.html' },
    { category: 'Focused examination', key: 'pain', label: 'Pain / OPQRST', description: 'Characterize symptoms and pain using OPQRST.', url: '/vitals/pain-opqrst.html' },
    { category: 'History', key: 'sample', label: 'SAMPLE history', description: 'Gather symptoms, allergies, medications, history, intake, and events.', url: '/vitals/sample-history.html' },
    { category: 'Pediatric', key: 'pediatric_assessment_triangle', label: 'Pediatric Assessment Triangle', description: 'Assess appearance, work of breathing, and circulation to skin.', url: '/vitals/pediatric-assessment-triangle.html' },
    { category: 'Burns', key: 'rule_of_nines', label: 'Rule of Nines', description: 'Estimate total body surface area involved in burns.', url: '/vitals/nines.html' }
  ];

  const vitalTools = [
    { key: 'blood_pressure', label: 'Blood pressure', description: 'Obtain systolic and diastolic pressure.', url: '/vitals/bp-scenario.html', delay: 24 },
    { key: 'pulse', label: 'Pulse', description: 'Obtain rate and evaluate the pulse.', url: '/vitals/pulse-scenario.html', delay: 15 },
    { key: 'respirations', label: 'Respiratory rate', description: 'Count rate and assess effort.', url: '/vitals/respiratory-rate-scenario.html', delay: 20 },
    { key: 'spo2', label: 'SpO₂', description: 'Obtain oxygen saturation after a stable signal.', url: '/vitals/pulse-ox-scenario.html', delay: 12 },
    { key: 'breath_sounds', label: 'Breath sounds', description: 'Auscultate all lung fields.', url: '/vitals/breath-sounds-scenario.html', delay: 22 },
    { key: 'blood_glucose', label: 'Blood glucose', description: 'Complete a glucometer check.', url: '/vitals/bgl-scenario.html', delay: 28 },
    { key: 'temperature', label: 'Temperature', description: 'Obtain and interpret temperature.', url: '/vitals/temperature-scenario.html', delay: 18 },
    { key: 'pupils', label: 'Pupils', description: 'Assess PERL, gaze, and tracking.', url: '/vitals/pupil-scenario.html', delay: 12 },
    { key: 'skin', label: 'Skin signs', description: 'Assess color, temperature, and moisture.', url: '/vitals/skin-scenario.html', delay: 10 },
    { key: 'mental_status', label: 'Mental status', description: 'Assess AVPU and patient response.', url: '/vitals/avpu-scenario.html', delay: 8 }
  ];

  function safeReturn(value, fallback = '') {
    return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback;
  }

  function buildUrl(path, options = {}) {
    const caseId = options.caseId || window.EMSCodeSimScenarioSession?.requestedCaseId?.() || window.EMSCodeSimPatientRecord?.active?.()?.scenarioId || '';
    const query = new URLSearchParams();
    query.set('mode', 'scenario');
    query.set('resume', '1');
    if (caseId) query.set('case', caseId);
    const returnTo = safeReturn(options.returnTo || '', '');
    if (returnTo) query.set('return', returnTo);
    if (options.returnLabel) query.set('returnLabel', options.returnLabel);
    if (options.context) query.set('context', options.context);
    return `${path}?${query.toString()}`;
  }

  function currentPageReturn() {
    return `${location.pathname}${location.search}`;
  }

  window.EMSCodeSimToolRegistry = { assessmentTools, vitalTools, buildUrl, currentPageReturn, safeReturn };
})();
