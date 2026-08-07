(() => {
  'use strict';

  const api = window.EMSCodeSimPatientRecord;
  const session = window.EMSCodeSimScenarioSession;
  const record = session?.sync?.() || api?.active?.();
  if (!record) return;

  const STEP_PATHS = {
    asthma: ['/vitals/visual-patient.html','/vitals/airway-assessment.html','/vitals/breathing-assessment.html','/vitals/respiratory-rate-scenario.html','/vitals/breath-sounds-scenario.html','/vitals/pulse-scenario.html','/vitals/bp-scenario.html','/vitals/pulse-ox-scenario.html','/vitals/sample-history.html','/vitals/clinical-impression.html','/vitals/treatment-reassessment.html','/vitals/pcr-handoff.html'],
    stroke: ['/vitals/visual-patient.html','/vitals/airway-assessment.html','/vitals/breathing-assessment.html','/vitals/perfusion-assessment.html','/vitals/pulse-scenario.html','/vitals/bp-scenario.html','/vitals/respiratory-rate-scenario.html','/vitals/pulse-ox-scenario.html','/vitals/motor-sensory-assessment.html','/vitals/bgl-scenario.html','/vitals/sample-history.html','/vitals/clinical-impression.html','/vitals/treatment-reassessment.html','/vitals/pcr-handoff.html'],
    hypoglycemia: ['/vitals/visual-patient.html','/vitals/airway-assessment.html','/vitals/breathing-assessment.html','/vitals/perfusion-assessment.html','/vitals/avpu-scenario.html','/vitals/pulse-scenario.html','/vitals/bp-scenario.html','/vitals/respiratory-rate-scenario.html','/vitals/pulse-ox-scenario.html','/vitals/bgl-scenario.html','/vitals/sample-history.html','/vitals/clinical-impression.html','/vitals/treatment-reassessment.html','/vitals/pcr-handoff.html'],
    trauma: ['/vitals/visual-patient.html','/vitals/airway-assessment.html','/vitals/breathing-assessment.html','/vitals/perfusion-assessment.html','/vitals/respiratory-rate-scenario.html','/vitals/breath-sounds-scenario.html','/vitals/pulse-scenario.html','/vitals/bp-scenario.html','/vitals/pulse-ox-scenario.html','/vitals/chest-assessment.html','/vitals/trauma-assessment.html','/vitals/abdominal-assessment.html','/vitals/clinical-impression.html','/vitals/treatment-reassessment.html','/vitals/pcr-handoff.html'],
    pediatric: ['/vitals/visual-patient.html','/vitals/pediatric-assessment-triangle.html','/vitals/airway-assessment.html','/vitals/breathing-assessment.html','/vitals/perfusion-assessment.html','/vitals/respiratory-rate-scenario.html','/vitals/breath-sounds-scenario.html','/vitals/pulse-scenario.html','/vitals/bp-scenario.html','/vitals/pulse-ox-scenario.html','/vitals/sample-history.html','/vitals/clinical-impression.html','/vitals/treatment-reassessment.html','/vitals/pcr-handoff.html'],
    horse_crush: ['/vitals/visual-patient.html','/vitals/airway-assessment.html','/vitals/breathing-assessment.html','/vitals/perfusion-assessment.html','/vitals/respiratory-rate-scenario.html','/vitals/pulse-scenario.html','/vitals/bp-scenario.html','/vitals/pulse-ox-scenario.html','/vitals/pain-opqrst.html','/vitals/clinical-impression.html','/vitals/treatment-reassessment.html','/vitals/pcr-handoff.html']
  };

  const scenarioId = record.scenarioId || record.id;
  const paths = STEP_PATHS[scenarioId];
  if (!paths) return;

  const stateKey = `emscodesim_scenario_${scenarioId}`;
  const state = session?.readState?.(scenarioId) || (() => {
    try { return JSON.parse(localStorage.getItem(stateKey) || '{}'); }
    catch { return {}; }
  })();
  state.done = Array.isArray(state.done) ? state.done : [];
  state.findings = state.findings && typeof state.findings === 'object' ? state.findings : {};

  function has(key) {
    const canonical = api.normalizeKey?.(key) || key;
    return Boolean(api.hasFinding?.(canonical, api.active?.() || record) || state.findings[canonical]);
  }

  function timeOf(item) {
    const value = item?.recordedAt || item?.time || item?.createdAt || 0;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  const treatments = Array.isArray(record.treatments) ? record.treatments : (Array.isArray(state.treatments) ? state.treatments : []);
  const reassessments = Array.isArray(record.reassessments) ? record.reassessments : (Array.isArray(state.reassessments) ? state.reassessments : []);
  const treatmentComplete = treatments.length > 0;
  const phaseModel = window.EMSCodeSimScenarioPhases;
  const reassessmentComplete = phaseModel?.targetedReassessmentStatus
    ? phaseModel.targetedReassessmentStatus({ ...record, treatments, reassessments }).complete
    : (() => {
        const lastTreatment = treatments.length ? Math.max(...treatments.map(timeOf)) : 0;
        const lastReassessment = reassessments.length ? Math.max(...reassessments.map(timeOf)) : 0;
        return treatmentComplete && reassessments.length > 0 && lastReassessment >= lastTreatment;
      })();

  state.phaseProgress = {
    ...(state.phaseProgress || {}),
    scene: scenarioId === 'horse_crush' ? has('arrival_parking') : has('scene_size_up'),
    primary: ['airway','breathing','perfusion'].every(has),
    treatment: treatmentComplete,
    reassessment: reassessmentComplete,
    impression: has('clinical_impression') || Boolean(record.impressions?.primary),
    transport: Boolean(record.impressions?.action || record.documentation?.transportPriority || record.documentation?.destination),
    handoff: has('pcr_handoff') || Boolean(record.documentation?.narrative || record.documentation?.handoff),
    debrief: Boolean(record.documentation?.debrief?.savedAt || record.documentation?.debrief?.score != null)
  };

  function completeForPath(path) {
    switch (path) {
      case '/vitals/visual-patient.html': return state.phaseProgress.scene;
      case '/vitals/airway-assessment.html': return has('airway');
      case '/vitals/breathing-assessment.html': return has('breathing');
      case '/vitals/perfusion-assessment.html': return has('perfusion');
      case '/vitals/respiratory-rate-scenario.html': return has('respirations');
      case '/vitals/breath-sounds-scenario.html': return has('breath_sounds');
      case '/vitals/pulse-scenario.html': return has('pulse');
      case '/vitals/bp-scenario.html': return has('blood_pressure');
      case '/vitals/pulse-ox-scenario.html': return has('spo2');
      case '/vitals/bgl-scenario.html': return has('blood_glucose');
      case '/vitals/avpu-scenario.html': return has('mental_status');
      case '/vitals/motor-sensory-assessment.html': return has('motor_sensory');
      case '/vitals/chest-assessment.html': return has('chest_assessment');
      case '/vitals/trauma-assessment.html': return has('trauma_assessment');
      case '/vitals/abdominal-assessment.html': return has('abdominal_assessment');
      case '/vitals/pediatric-assessment-triangle.html': return has('pediatric_assessment_triangle');
      case '/vitals/sample-history.html': return has('sample') || Object.keys(record.history || {}).length > 0;
      case '/vitals/clinical-impression.html': return state.phaseProgress.impression && state.phaseProgress.transport;
      case '/vitals/treatment-reassessment.html': return state.phaseProgress.treatment && state.phaseProgress.reassessment;
      case '/vitals/pcr-handoff.html': return state.phaseProgress.handoff;
      default: return false;
    }
  }

  state.done = paths.map((path, index) => completeForPath(path) ? index : null).filter(index => index !== null);
  state.findings = { ...state.findings, ...(api.active?.()?.findings || record.findings || {}) };

  // Never mark a scenario complete merely because a legacy route was opened.
  // The patient-picture home performs the patient-specific essential-action check.
  if (!(state.phaseProgress.scene && state.phaseProgress.primary && state.phaseProgress.treatment && state.phaseProgress.reassessment && state.phaseProgress.impression && state.phaseProgress.transport && state.phaseProgress.handoff)) {
    state.complete = false;
  }

  if (session?.writeState) session.writeState(scenarioId, state);
  else localStorage.setItem(stateKey, JSON.stringify(state));
})();
