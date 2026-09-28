(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EMSCodeSimV2Engine = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function createEngine(scenario) {
    const listeners = new Set();
    let timer = null;
    let state;

    function freshState() {
      return {
        startedAt: Date.now(),
        elapsedSec: 0,
        phase: 'dispatch',
        clinical: clone(scenario.initialState),
        discovered: {},
        treatments: [],
        reassessments: 0,
        transport: null,
        handoff: '',
        pcr: '',
        ended: false,
        timeline: [{ t: 0, type: 'dispatch', label: scenario.dispatch.summary }],
        scoreFlags: {}
      };
    }

    state = freshState();

    function emit() {
      const snapshot = getState();
      listeners.forEach(fn => fn(snapshot));
    }

    function event(type, label, metadata) {
      state.timeline.push({ t: state.elapsedSec, type, label, metadata: metadata || null });
      emit();
    }

    function applyProgression() {
      if (state.ended) return;
      const c = state.clinical;
      const treated = state.treatments.some(t => t.id === 'albuterol');
      const reassessed = state.reassessments > 0;

      if (!treated && state.elapsedSec >= scenario.progression.worsenAtSec) {
        c.rr = clamp(c.rr + 1, 0, 44);
        c.spo2 = clamp(c.spo2 - 1, 70, 100);
        c.hr = clamp(c.hr + 1, 30, 180);
        c.workOfBreathing = 'severe';
        c.speech = state.elapsedSec > scenario.progression.criticalAtSec ? '1-2 words' : 'short phrases';
        c.lungSounds = state.elapsedSec > scenario.progression.criticalAtSec ? 'Markedly diminished with faint wheeze' : 'Diffuse expiratory wheeze';
        c.mentalStatus = state.elapsedSec > scenario.progression.criticalAtSec ? 'anxious, tiring' : 'alert, anxious';
        c.videoState = 'worsening';
      }

      if (treated) {
        const tx = state.treatments.find(t => t.id === 'albuterol');
        const since = state.elapsedSec - tx.t;
        if (since >= scenario.treatmentEffects.albuterol.onsetSec) {
          c.spo2 = clamp(c.spo2 + 1, 70, 96);
          c.rr = clamp(c.rr - 1, 22, 44);
          c.workOfBreathing = 'moderate';
          c.speech = 'fuller sentences';
          c.lungSounds = 'Improving bilateral expiratory wheeze';
          c.videoState = 'improved';
          if (reassessed) state.scoreFlags.reassessmentAfterTreatment = true;
        }
      }
    }

    function tick(seconds) {
      const amount = Math.max(1, Number(seconds || 1));
      state.elapsedSec += amount;
      applyProgression();
      emit();
    }

    function startClock() {
      if (timer) return;
      timer = setInterval(() => tick(1), 1000);
    }

    function stopClock() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    function setPhase(phase) {
      if (!scenario.phases.includes(phase)) return;
      state.phase = phase;
      event('phase', 'Entered ' + phase.replace(/-/g, ' '));
    }

    function assess(id) {
      const finding = scenario.assessments[id];
      if (!finding) return null;
      state.discovered[id] = clone(finding);
      event('assessment', finding.label + ': ' + finding.value, { id });
      if (id === 'lungSounds') state.scoreFlags.lungSounds = true;
      if (id === 'spo2') state.scoreFlags.spo2 = true;
      if (id === 'airway') state.scoreFlags.airway = true;
      if (id === 'breathing') state.scoreFlags.breathing = true;
      return clone(finding);
    }

    function monitor(id) {
      const map = {
        heartRate: ['Heart rate', state.clinical.hr + ' bpm'],
        respiratoryRate: ['Respiratory rate', state.clinical.rr + '/min'],
        spo2: ['SpO₂', state.clinical.spo2 + '%'],
        bloodPressure: ['Blood pressure', state.clinical.bp],
        etco2: ['EtCO₂', state.clinical.etco2 + ' mmHg']
      };
      if (!map[id]) return null;
      const finding = { label: map[id][0], value: map[id][1] };
      state.discovered[id] = finding;
      event('monitor', finding.label + ': ' + finding.value, { id });
      if (id === 'spo2') state.scoreFlags.spo2 = true;
      return clone(finding);
    }

    function treat(id, details) {
      const treatment = scenario.treatments[id];
      if (!treatment) return { ok: false, message: 'Unknown treatment.' };
      const record = { id, t: state.elapsedSec, details: details || {}, label: treatment.label };
      state.treatments.push(record);
      event('treatment', treatment.label, record.details);
      if (id === 'albuterol') state.scoreFlags.albuterol = true;
      return { ok: true, message: treatment.patientResponse };
    }

    function reassess() {
      state.reassessments += 1;
      event('reassessment', 'Patient reassessed after intervention');
      if (state.treatments.length) state.scoreFlags.reassessmentAfterTreatment = true;
      return {
        rr: state.clinical.rr,
        spo2: state.clinical.spo2,
        hr: state.clinical.hr,
        lungSounds: state.clinical.lungSounds,
        workOfBreathing: state.clinical.workOfBreathing,
        speech: state.clinical.speech
      };
    }

    function setTransport(value) {
      state.transport = clone(value);
      state.scoreFlags.transport = true;
      event('transport', 'Transport decision: ' + value.priority + ' to ' + value.destination, value);
    }

    function setHandoff(text) {
      state.handoff = String(text || '').trim();
      if (state.handoff.length > 30) state.scoreFlags.handoff = true;
      event('handoff', 'Hospital handoff completed');
    }

    function setPCR(text) {
      state.pcr = String(text || '').trim();
      if (state.pcr.length > 80) state.scoreFlags.pcr = true;
      event('documentation', 'PCR submitted');
    }

    function grade() {
      const criteria = scenario.grading;
      const results = criteria.map(item => {
        const earned = item.check(state) ? item.points : 0;
        return { id: item.id, label: item.label, earned, points: item.points, feedback: earned ? item.pass : item.fail };
      });
      return {
        total: results.reduce((s, r) => s + r.earned, 0),
        possible: results.reduce((s, r) => s + r.points, 0),
        results,
        timeline: clone(state.timeline)
      };
    }

    function reset() {
      stopClock();
      state = freshState();
      emit();
      return getState();
    }

    function end() {
      state.ended = true;
      stopClock();
      event('end', 'Scenario ended');
      return grade();
    }

    function getState() { return clone(state); }

    return {
      subscribe(fn) { listeners.add(fn); fn(getState()); return () => listeners.delete(fn); },
      getState, startClock, stopClock, tick, setPhase, assess, monitor, treat, reassess,
      setTransport, setHandoff, setPCR, grade, reset, end
    };
  }

  return { createEngine };
});
