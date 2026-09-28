/**
 * Maps clinical patient state → video asset. Controlled by physiology, not UI page.
 */
(function (global) {
  'use strict';

  const DEFAULT_THRESHOLDS = Object.freeze({
    improvingMaxSeverity: 0.42,
    worseningMinSeverity: 0.78,
    fatigueWorsening: 0.55
  });

  function resolveVideoState(patientState, videoStates, thresholds = DEFAULT_THRESHOLDS) {
    const states = videoStates || {};
    const severity = Number(patientState?.bronchospasmSeverity ?? 0.5);
    const fatigue = Number(patientState?.respiratoryFatigue ?? 0);
    const clinical = String(patientState?.clinicalState || 'moderate');
    const outcome = String(patientState?.outcomeTrend || 'stable');

    // Explicit clinical labels take priority when mapped.
    if (clinical === 'improving' || clinical === 'mild' || clinical === 'recovering' || outcome === 'improving') {
      if (severity <= thresholds.improvingMaxSeverity + 0.08 && states.improving) return 'improving';
    }
    if (clinical === 'severe' || clinical === 'critical' || clinical === 'fatigue' || clinical === 'impending_failure') {
      if (states.worsening) return 'worsening';
    }
    if (clinical === 'cardiac_arrest' && states.cardiac_arrest) return 'cardiac_arrest';
    if (clinical === 'unconscious' && states.unconscious) return 'unconscious';
    if (clinical === 'seizure' && states.seizure) return 'seizure';
    if ((clinical === 'normal' || clinical === 'mild') && states.normal) return 'normal';

    if (severity <= thresholds.improvingMaxSeverity && states.improving) return 'improving';
    if ((severity >= thresholds.worseningMinSeverity || fatigue >= thresholds.fatigueWorsening) && states.worsening) {
      return 'worsening';
    }
    if (states.arrival) return 'arrival';
    if (states.moderate) return 'moderate';
    return Object.keys(states)[0] || 'arrival';
  }

  function getVideoConfig(scenario, patientState) {
    const videoStates = scenario?.videoStates || {};
    const key = resolveVideoState(patientState, videoStates, scenario?.videoThresholds || DEFAULT_THRESHOLDS);
    const config = videoStates[key] || videoStates.arrival || { url: '', label: key };
    return {
      key,
      url: config.url,
      label: config.label || key,
      eyebrow: config.eyebrow || 'SCENE VIEW — LIVE PATIENT',
      copy: config.copy || ''
    };
  }

  const api = { resolveVideoState, getVideoConfig, DEFAULT_THRESHOLDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.PSV2 = global.PSV2 || {};
  global.PSV2.VideoState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
