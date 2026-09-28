/**
 * Deterministic patient-state / physiology engine.
 * AI must never invent vitals, allergies, history, doses, or progression.
 */
(function (global) {
  'use strict';

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function round(n, digits = 0) {
    const f = 10 ** digits;
    return Math.round(n * f) / f;
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function deriveSpeech(severity, fatigue) {
    if (fatigue >= 0.75 || severity >= 0.9) return 'unable_to_speak';
    if (severity >= 0.8 || fatigue >= 0.55) return 'single_words';
    if (severity >= 0.55) return 'short_sentences';
    if (severity >= 0.35) return 'phrases';
    return 'full_sentences';
  }

  function deriveWorkOfBreathing(severity, fatigue) {
    if (fatigue >= 0.7) return 'tiring';
    if (severity >= 0.85) return 'severe_accessory';
    if (severity >= 0.65) return 'accessory_muscles';
    if (severity >= 0.4) return 'mild_increase';
    return 'normal';
  }

  function deriveLungSounds(severity, fatigue) {
    if (fatigue >= 0.7 && severity >= 0.85) return 'diminished_quiet_chest';
    if (severity >= 0.75) return 'diffuse_wheezes_diminished';
    if (severity >= 0.45) return 'expiratory_wheezes_bilateral';
    if (severity >= 0.25) return 'mild_expiratory_wheeze';
    return 'clearing_improved_air_movement';
  }

  function deriveMentalStatus(spo2, fatigue, severity) {
    if (fatigue >= 0.8 || spo2 < 84) return 'drowsy';
    if (severity >= 0.85 || spo2 < 88) return 'anxious_fatiguing';
    if (severity >= 0.5) return 'anxious_alert';
    return 'alert_oriented';
  }

  function deriveClinicalState(severity, fatigue, spo2, trend) {
    if (fatigue >= 0.75 && severity >= 0.8) return 'impending_failure';
    if (trend === 'improving' && severity <= 0.42) return 'improving';
    if (severity >= 0.82 || spo2 < 86) return 'severe';
    if (severity >= 0.55) return 'moderate';
    if (severity >= 0.3) return 'mild';
    return 'recovering';
  }

  function vitalsFromPhysiology(state) {
    const severity = state.bronchospasmSeverity;
    const fatigue = state.respiratoryFatigue;
    const o2Boost = state.oxygenSupport === 'nrb' ? 4 : state.oxygenSupport === 'nc' ? 2 : state.oxygenSupport === 'cpap' ? 5 : 0;
    const nebBoost = state.activeNebulizer ? 1 : 0;

    let rr;
    if (fatigue >= 0.65) {
      // Falling RR due to fatigue is deterioration, not improvement.
      rr = round(clamp(32 - fatigue * 18, 8, 36));
    } else {
      rr = round(clamp(16 + severity * 18, 12, 40));
    }

    const spo2 = round(clamp(98 - severity * 14 - fatigue * 6 + o2Boost + nebBoost * 0.5, 70, 99));
    const hr = round(clamp(72 + severity * 55 + (state.anxiety || 0) * 12, 60, 160));
    const sys = round(clamp(118 + severity * 28 + (state.anxiety || 0) * 10, 90, 180));
    const dia = round(clamp(70 + severity * 14, 50, 110));
    const etco2 = fatigue >= 0.6
      ? round(clamp(28 + fatigue * 25, 25, 60))
      : round(clamp(38 - severity * 14, 18, 45));
    const gcs = fatigue >= 0.8 || spo2 < 84 ? 13 : fatigue >= 0.65 ? 14 : 15;

    return {
      respiratoryRate: rr,
      spo2,
      heartRate: hr,
      bloodPressure: { systolic: sys, diastolic: dia },
      etco2,
      temperature: state.temperature ?? 98.6,
      gcs
    };
  }

  function enrichDerived(state) {
    const vitals = vitalsFromPhysiology(state);
    const next = {
      ...state,
      ...vitals,
      speech: deriveSpeech(state.bronchospasmSeverity, state.respiratoryFatigue),
      workOfBreathing: deriveWorkOfBreathing(state.bronchospasmSeverity, state.respiratoryFatigue),
      lungSounds: deriveLungSounds(state.bronchospasmSeverity, state.respiratoryFatigue),
      mentalStatus: deriveMentalStatus(vitals.spo2, state.respiratoryFatigue, state.bronchospasmSeverity),
      skin: state.bronchospasmSeverity >= 0.7
        ? 'pale_diaphoretic'
        : state.bronchospasmSeverity >= 0.4
          ? 'pink_diaphoretic'
          : 'pink_warm',
      airway: state.airway || 'patent',
      clinicalState: deriveClinicalState(
        state.bronchospasmSeverity,
        state.respiratoryFatigue,
        vitals.spo2,
        state.outcomeTrend
      )
    };
    return next;
  }

  function createPatientStateEngine(scenario) {
    const initial = deepClone(scenario.initialState || {});
    const hidden = deepClone(scenario.hiddenClinicalState || {});
    let state = enrichDerived({
      ...initial,
      ...hidden,
      treatmentsReceived: [],
      elapsedTime: 0,
      outcomeTrend: 'stable',
      oxygenSupport: null,
      activeNebulizer: false,
      lastTreatmentAt: null,
      sessionId: null
    });

    const listeners = new Set();

    function notify(reason) {
      listeners.forEach(fn => {
        try { fn(getPublicState(), reason); } catch (_) { /* ignore UI errors */ }
      });
    }

    function getFullState() {
      return deepClone(state);
    }

    function getPublicState() {
      // Learner-visible vitals only when monitoring channels are open (managed outside).
      return deepClone({
        airway: state.airway,
        clinicalState: state.clinicalState,
        speech: state.speech,
        workOfBreathing: state.workOfBreathing,
        skin: state.skin,
        mentalStatus: state.mentalStatus,
        elapsedTime: state.elapsedTime,
        outcomeTrend: state.outcomeTrend,
        treatmentsReceived: state.treatmentsReceived.slice(),
        oxygenSupport: state.oxygenSupport,
        activeNebulizer: state.activeNebulizer,
        // Hidden physiology kept for engines; UI must not display hidden values blindly.
        _hidden: {
          bronchospasmSeverity: state.bronchospasmSeverity,
          respiratoryFatigue: state.respiratoryFatigue,
          anxiety: state.anxiety,
          lungSounds: state.lungSounds,
          respiratoryRate: state.respiratoryRate,
          spo2: state.spo2,
          heartRate: state.heartRate,
          bloodPressure: state.bloodPressure,
          etco2: state.etco2,
          temperature: state.temperature,
          gcs: state.gcs
        }
      });
    }

    function getVitals() {
      return {
        respiratoryRate: state.respiratoryRate,
        spo2: state.spo2,
        heartRate: state.heartRate,
        bloodPressure: { ...state.bloodPressure },
        etco2: state.etco2,
        temperature: state.temperature,
        gcs: state.gcs,
        lungSounds: state.lungSounds,
        clinicalState: state.clinicalState
      };
    }

    function snapshotClinical() {
      return {
        clinicalState: state.clinicalState,
        bronchospasmSeverity: round(state.bronchospasmSeverity, 3),
        respiratoryFatigue: round(state.respiratoryFatigue, 3),
        spo2: state.spo2,
        respiratoryRate: state.respiratoryRate,
        heartRate: state.heartRate,
        speech: state.speech,
        lungSounds: state.lungSounds,
        mentalStatus: state.mentalStatus,
        outcomeTrend: state.outcomeTrend
      };
    }

    function applyProgression(deltaSeconds, rules) {
      const progression = rules || scenario.progressionRules || {};
      const untreated = progression.untreated || {};
      const treated = progression.treatedImprovement || {};
      const dt = Math.max(0, Number(deltaSeconds) || 0);
      if (dt === 0) return snapshotClinical();

      const before = snapshotClinical();
      state.elapsedTime = round(state.elapsedTime + dt, 1);

      const hasBronchodilator = state.treatmentsReceived.some(t =>
        /albuterol|levalbuterol|ipratropium|duoneb|bronchodilator/i.test(t.medication || t.id || '')
      );
      const hasOxygen = Boolean(state.oxygenSupport);
      const effectiveTreatment = hasBronchodilator && (hasOxygen || state.activeNebulizer);

      if (effectiveTreatment) {
        const rate = Number(treated.severityDecayPerMinute ?? 0.08);
        const fatigueDecay = Number(treated.fatigueDecayPerMinute ?? 0.05);
        state.bronchospasmSeverity = clamp(
          state.bronchospasmSeverity - rate * (dt / 60),
          Number(treated.minSeverity ?? 0.15),
          1
        );
        state.respiratoryFatigue = clamp(
          state.respiratoryFatigue - fatigueDecay * (dt / 60),
          0,
          1
        );
        state.anxiety = clamp(state.anxiety - 0.04 * (dt / 60), 0.05, 1);
        state.outcomeTrend = state.bronchospasmSeverity <= 0.45 ? 'improving' : 'stabilizing';
      } else {
        const sevRate = Number(untreated.severityRisePerMinute ?? 0.045);
        const fatRate = Number(untreated.fatigueRisePerMinute ?? 0.035);
        // Delayed care accelerates deterioration after threshold time.
        const delayFactor = state.elapsedTime > Number(untreated.accelerateAfterSeconds ?? 300) ? 1.4 : 1;
        state.bronchospasmSeverity = clamp(state.bronchospasmSeverity + sevRate * delayFactor * (dt / 60), 0, 1);
        state.respiratoryFatigue = clamp(state.respiratoryFatigue + fatRate * delayFactor * (dt / 60), 0, 1);
        state.anxiety = clamp(state.anxiety + 0.03 * (dt / 60), 0, 1);
        state.outcomeTrend = 'deteriorating';
      }

      state = enrichDerived(state);
      const after = snapshotClinical();
      notify('progression');
      return { before, after, changed: JSON.stringify(before) !== JSON.stringify(after) };
    }

    function applyTreatmentEffect(treatment, effectConfig) {
      const before = snapshotClinical();
      const effect = effectConfig || {};
      const record = {
        id: treatment.id || treatment.medication,
        medication: treatment.medication || treatment.id,
        dose: treatment.dose || null,
        route: treatment.route || null,
        device: treatment.device || null,
        category: treatment.category || 'medication',
        at: state.elapsedTime,
        exactSelection: deepClone(treatment)
      };
      state.treatmentsReceived.push(record);
      state.lastTreatmentAt = state.elapsedTime;

      if (treatment.category === 'oxygen' || /oxygen|nrb|nasal|cpap|bvm/i.test(treatment.id || '')) {
        state.oxygenSupport = treatment.device || treatment.id;
      }
      if (/nebulizer|neb/i.test(treatment.device || '') || /albuterol|ipratropium|duoneb/i.test(treatment.medication || '')) {
        state.activeNebulizer = true;
      }

      // Immediate small physiologic nudge; majority of effect is time-based.
      if (typeof effect.immediateSeverityDelta === 'number') {
        state.bronchospasmSeverity = clamp(state.bronchospasmSeverity + effect.immediateSeverityDelta, 0, 1);
      }
      if (typeof effect.immediateFatigueDelta === 'number') {
        state.respiratoryFatigue = clamp(state.respiratoryFatigue + effect.immediateFatigueDelta, 0, 1);
      }
      if (effect.setsTrend) state.outcomeTrend = effect.setsTrend;

      state = enrichDerived(state);
      const after = snapshotClinical();
      notify('treatment');
      return { before, after, record };
    }

    function reset(sessionId) {
      state = enrichDerived({
        ...deepClone(initial),
        ...deepClone(hidden),
        treatmentsReceived: [],
        elapsedTime: 0,
        outcomeTrend: 'stable',
        oxygenSupport: null,
        activeNebulizer: false,
        lastTreatmentAt: null,
        sessionId: sessionId || null
      });
      notify('reset');
      return getFullState();
    }

    function subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }

    return {
      getFullState,
      getPublicState,
      getVitals,
      snapshotClinical,
      applyProgression,
      applyTreatmentEffect,
      reset,
      subscribe,
      // Test/helpers
      _setElapsedForTests(seconds) { state.elapsedTime = seconds; },
      _forceSeverityForTests(v) {
        state.bronchospasmSeverity = clamp(v, 0, 1);
        state = enrichDerived(state);
      }
    };
  }

  const api = { createPatientStateEngine, enrichDerived, vitalsFromPhysiology, deriveClinicalState };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.PSV2 = global.PSV2 || {};
  global.PSV2.PatientState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
