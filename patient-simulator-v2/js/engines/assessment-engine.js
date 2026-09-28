/**
 * Assessment engine — findings revealed only after learner performs the assessment.
 */
(function (global) {
  'use strict';

  function createAssessmentEngine(scenario, patientEngine, timeline) {
    const revealed = new Map(); // key -> { at, finding, location? }
    const findingsCatalog = scenario.assessmentFindings || {};

    function resolveFinding(assessmentId, patientState) {
      const entry = findingsCatalog[assessmentId];
      if (!entry) return { text: 'No specific finding configured for this assessment.', raw: null };

      if (typeof entry === 'string') return { text: entry, raw: entry };

      // State-dependent findings
      if (entry.byClinicalState) {
        const clinical = patientState.clinicalState || patientState._hidden?.clinicalState;
        const severity = patientState._hidden?.bronchospasmSeverity ?? patientState.bronchospasmSeverity;
        let key = clinical;
        if (!entry.byClinicalState[key]) {
          if (severity >= 0.82) key = 'severe';
          else if (severity <= 0.42) key = 'improving';
          else key = 'moderate';
        }
        const text = entry.byClinicalState[key] || entry.byClinicalState.moderate || entry.default || 'Finding unavailable.';
        return { text, raw: text, stateKey: key };
      }

      if (entry.fromVitals) {
        const vitals = patientEngine.getVitals();
        const map = {
          respiratory_rate: `${vitals.respiratoryRate} breaths/min`,
          spo2: `${vitals.spo2}% on ${patientEngine.getFullState().oxygenSupport || 'room air'}`,
          pulse: `${vitals.heartRate} bpm`,
          blood_pressure: `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic} mmHg`,
          etco2: `${vitals.etco2} mmHg`,
          temperature: `${vitals.temperature}°F`,
          gcs: `GCS ${vitals.gcs}`,
          lung_sounds: vitals.lungSounds
        };
        const text = map[entry.fromVitals] || entry.default || 'Not obtained.';
        return { text, raw: text, vitalsKey: entry.fromVitals };
      }

      return { text: entry.default || entry.text || String(entry), raw: entry };
    }

    function perform(assessmentId, options = {}) {
      const id = String(assessmentId);
      const full = patientEngine.getFullState();
      const publicState = patientEngine.getPublicState();
      const before = patientEngine.snapshotClinical();
      const finding = resolveFinding(id, { ...publicState, ...full, _hidden: publicState._hidden });
      const location = options.location || null;
      const meta = {
        assessmentId: id,
        location,
        category: options.category || findingsCatalog[id]?.category || 'assessment'
      };

      const resultText = location
        ? `${finding.text} (${location})`
        : finding.text;

      revealed.set(location ? `${id}:${location}` : id, {
        at: full.elapsedTime,
        finding: resultText,
        assessmentId: id,
        location
      });

      const event = timeline.push({
        timestamp: full.elapsedTime,
        eventType: 'assessment',
        action: options.actionLabel || `Assessed: ${id}`,
        result: resultText,
        clinicalStateBefore: before,
        clinicalStateAfter: patientEngine.snapshotClinical(),
        metadata: meta
      });

      return {
        assessmentId: id,
        finding: resultText,
        audio: findingsCatalog[id]?.audio || null,
        event,
        alreadyKnown: false
      };
    }

    function isRevealed(assessmentId, location = null) {
      return revealed.has(location ? `${assessmentId}:${location}` : assessmentId);
    }

    function getRevealed() {
      const out = {};
      revealed.forEach((value, key) => { out[key] = { ...value }; });
      return out;
    }

    function listAvailable() {
      return Object.keys(findingsCatalog).map(id => ({
        id,
        label: findingsCatalog[id].label || id,
        category: findingsCatalog[id].category || 'general',
        requiresLocation: Boolean(findingsCatalog[id].requiresLocation)
      }));
    }

    function reset() {
      revealed.clear();
    }

    return {
      perform,
      isRevealed,
      getRevealed,
      listAvailable,
      resolveFinding,
      reset
    };
  }

  const api = { createAssessmentEngine };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.PSV2 = global.PSV2 || {};
  global.PSV2.Assessment = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
