(() => {
  'use strict';

  const PATIENT_WORKSPACE_BUILD = '2026.08.17.15';

  // The patient page has several independent layout layers that can move the same
  // nodes during startup. A stale insertBefore reference should never crash the
  // encounter; preserve native behavior for valid references and safely append
  // only when the reference no longer belongs to the requested parent.
  if (!window.EMSCodeSimDomInsertionGuard) {
    const nativeInsertBefore = Node.prototype.insertBefore;
    Object.defineProperty(Node.prototype, 'insertBefore', {
      configurable: true,
      writable: true,
      value(newNode, referenceNode) {
        if (referenceNode != null && referenceNode.parentNode !== this) {
          return nativeInsertBefore.call(this, newNode, null);
        }
        return nativeInsertBefore.call(this, newNode, referenceNode);
      }
    });
    window.EMSCodeSimDomInsertionGuard = Object.freeze({ version:'2026.08.17.15', active:true });
  }

  const assessmentTools = [
    { category: 'Scene size-up', key: 'scene_size_up', label: 'Scene size-up & first impression', description: 'Use dispatch and the patient picture to decide PPE, safety, patient count, NOI/MOI, resources, spinal precautions, general impression, responsiveness, and priority.', url: '/vitals/visual-patient.html' },
    { category: 'Primary assessment', key: 'airway', label: 'Airway assessment', description: 'Determine patency, threats, sounds, secretions, and protection.', url: '/vitals/visual-airway-assessment.html' },
    { category: 'Primary assessment', key: 'breathing', label: 'Breathing assessment', description: 'Judge rate, depth, effort, chest rise, speech, and adequacy.', url: '/vitals/respiratory-assessment-visual.html' },
    { category: 'Primary assessment', key: 'perfusion', label: 'Circulation and perfusion', description: 'Assess pulse quality, major bleeding, skin, and capillary refill.', url: '/vitals/distal-csm-assessment.html' },
    { category: 'Neurologic', key: 'mental_status', label: 'Mental status / AVPU', description: 'Assess alertness and response to voice or pain.', url: '/vitals/avpu-scenario.html' },
    { category: 'Neurologic', key: 'pupils', label: 'Pupils / PERL', description: 'Assess equality, response to light, gaze position, and tracking.', url: '/vitals/pupil.html' },
    { category: 'Neurologic', key: 'motor_sensory', label: 'Motor, sensory, and stroke findings', description: 'Compare facial movement, speech, strength, drift, and sensation.', url: '/vitals/visual-neuro-stroke-assessment.html' },
    { category: 'Neurologic', key: 'gcs', label: 'Glasgow Coma Scale', description: 'Score eye, verbal, and motor responses.', url: '/vitals/gcs.html' },
    { category: 'Respiratory', key: 'breath_sounds', label: 'Breath sounds', description: 'Auscultate and compare all lung fields.', url: '/vitals/breath-sounds-scenario.html' },
    { category: 'Respiratory', key: 'chest_assessment', label: 'Chest assessment', description: 'Inspect and palpate chest movement, tenderness, and injury.', url: '/vitals/respiratory-assessment-visual.html' },
    { category: 'Focused examination', key: 'distal_csm', label: 'Distal CSM & capillary refill', description: 'Check distal pulse, sensation, movement, and capillary refill.', url: '/vitals/distal-csm-assessment.html' },
    { category: 'Focused examination', key: 'skin', label: 'Skin signs', description: 'Compare color, temperature, and moisture.', url: '/vitals/skin-scenario.html' },
    { category: 'Focused examination', key: 'abdominal_assessment', label: 'Abdominal assessment', description: 'Assess tenderness, guarding, rigidity, and distention.', url: '/vitals/abdomen-pelvis-visual.html' },
    { category: 'Focused examination', key: 'trauma_assessment', label: 'Rapid trauma assessment', description: 'Perform a systematic head-to-toe trauma examination.', url: '/vitals/visual-trauma-body-exam.html' },
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
    { key: 'pupils', label: 'Pupils / PERL', description: 'Assess PERL, gaze, and tracking.', url: '/vitals/pupil.html', delay: 12 },
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

  function onPatientScenarioPage() {
    return /\/vitals\/visual-patient(?:\.html)?$/.test(location.pathname);
  }

  function loadPatientScenarioStyle(href, dataKey, selector) {
    if (!onPatientScenarioPage() || document.querySelector(selector)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset[dataKey] = '1';
    document.head.appendChild(link);
  }

  function loadPatientScenarioScript(src, dataKey, selector) {
    if (!onPatientScenarioPage() || document.querySelector(selector)) return;
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.dataset[dataKey] = '1';
    document.head.appendChild(script);
  }

  loadPatientScenarioStyle(`/vitals/scenario-vital-board.css?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'scenarioVitalBoard', 'link[data-scenario-vital-board]');
  loadPatientScenarioStyle(`/vitals/scenario-info-window-fix.css?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'scenarioInfoWindowFix', 'link[data-scenario-info-window-fix]');
  loadPatientScenarioStyle(`/vitals/scenario-clinical-flow-polish.css?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'scenarioClinicalFlowPolish', 'link[data-scenario-clinical-flow-polish]');
  loadPatientScenarioStyle(`/vitals/horse-encounter-validation.css?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'horseEncounterValidation', 'link[data-horse-encounter-validation]');
  loadPatientScenarioStyle(`/vitals/scenario-assessment-followup-cleanup.css?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'scenarioAssessmentFollowupCleanup', 'link[data-scenario-assessment-followup-cleanup]');
  loadPatientScenarioStyle(`/vitals/scenario-treatment-history-ux.css?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'scenarioTreatmentHistoryUx', 'link[data-scenario-treatment-history-ux]');

  loadPatientScenarioScript(`/vitals/scenario-mini-sim-overlay.js?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'scenarioMiniSimOverlay', 'script[data-scenario-mini-sim-overlay]');
  loadPatientScenarioScript(`/vitals/scenario-domain-workspace.js?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'scenarioDomainWorkspace', 'script[data-scenario-domain-workspace]');
  loadPatientScenarioScript(`/vitals/scenario-clinical-flow-polish.js?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'scenarioClinicalFlowPolish', 'script[data-scenario-clinical-flow-polish]');
  loadPatientScenarioScript(`/vitals/horse-encounter-validation.js?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'horseEncounterValidation', 'script[data-horse-encounter-validation]');
  loadPatientScenarioScript(`/vitals/scenario-assessment-followup-cleanup.js?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'scenarioAssessmentFollowupCleanup', 'script[data-scenario-assessment-followup-cleanup]');
  loadPatientScenarioScript(`/vitals/scenario-transport-handoff-actions.js?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'scenarioTransportHandoffActions', 'script[data-scenario-transport-handoff-actions]');
  loadPatientScenarioScript(`/vitals/scenario-patient-conversation.js?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'scenarioPatientConversation', 'script[data-scenario-patient-conversation]');
  loadPatientScenarioScript(`/vitals/scenario-natural-dialogue.js?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'scenarioNaturalDialogue', 'script[data-scenario-natural-dialogue]');
  loadPatientScenarioScript(`/vitals/scenario-treatment-history-ux.js?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'scenarioTreatmentHistoryUx', 'script[data-scenario-treatment-history-ux]');
  loadPatientScenarioScript(`/vitals/scenario-communication-router.js?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'scenarioCommunicationRouter', 'script[data-scenario-communication-router]');
  loadPatientScenarioScript(`/vitals/scenario-first-time-emt-ux.js?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'scenarioFirstTimeEmtUx', 'script[data-scenario-first-time-emt-ux]');
  loadPatientScenarioScript(`/vitals/scenario-patient-rapport.js?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'scenarioPatientRapport', 'script[data-scenario-patient-rapport]');
  loadPatientScenarioScript(`/vitals/scenario-patient-anger.js?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'scenarioPatientAnger', 'script[data-scenario-patient-anger]');
  loadPatientScenarioScript(`/vitals/scenario-communication-debrief.js?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'scenarioCommunicationDebrief', 'script[data-scenario-communication-debrief]');
  loadPatientScenarioScript(`/vitals/scenario-anger-debrief.js?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'scenarioAngerDebrief', 'script[data-scenario-anger-debrief]');
  loadPatientScenarioScript(`/vitals/scenario-patient-satisfaction-grade.js?v=${encodeURIComponent(PATIENT_WORKSPACE_BUILD)}`, 'scenarioPatientSatisfactionGrade', 'script[data-scenario-patient-satisfaction-grade]');
})();
