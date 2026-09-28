/**
 * Simulation session orchestrator — creates a clean isolated run every start/restart.
 */
(function (global) {
  'use strict';

  function uuid() {
    return `psv2_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function createSession(scenario, deps) {
    const EventTimeline = deps.EventTimeline || global.PSV2.EventTimeline;
    const PatientState = deps.PatientState || global.PSV2.PatientState;
    const Assessment = deps.Assessment || global.PSV2.Assessment;
    const Treatment = deps.Treatment || global.PSV2.Treatment;
    const Conversation = deps.Conversation || global.PSV2.Conversation;
    const VideoState = deps.VideoState || global.PSV2.VideoState;
    const Grading = deps.Grading || global.PSV2.Grading;
    const Pcr = deps.Pcr || global.PSV2.Pcr;
    const Debrief = deps.Debrief || global.PSV2.Debrief;

    const sessionId = uuid();
    const timeline = EventTimeline.createTimeline();
    const patient = PatientState.createPatientStateEngine(scenario);
    patient.reset(sessionId);
    const assessment = Assessment.createAssessmentEngine(scenario, patient, timeline);
    const treatment = Treatment.createTreatmentEngine(scenario, patient, timeline);
    const conversation = Conversation.createConversationEngine(scenario, timeline, patient);
    const pcr = Pcr.createPcrEngine(scenario, timeline);
    const gradingEngine = Grading.createGradingEngine(scenario);

    let stage = 'Dispatch';
    let paused = false;
    let clockTimer = null;
    let realStartedAt = Date.now();
    let accumulatedMs = 0;
    let lastTickAt = Date.now();
    let monitorChannels = {
      hr: false, ecg: false, spo2: false, pleth: false, rr: false,
      bp: false, etco2: false, capno: false, temp: false, gcs: false
    };
    let transportDecision = null;
    let handoffReport = null;
    let gradeResult = null;
    let debrief = null;
    let ended = false;
    const listeners = new Set();

    function emit(type, detail) {
      listeners.forEach(fn => {
        try { fn({ type, detail, session: getSnapshot() }); } catch (_) { /* ignore */ }
      });
    }

    function currentElapsed() {
      return patient.getFullState().elapsedTime;
    }

    function setStage(next) {
      if (stage === next) return;
      stage = next;
      timeline.push({
        timestamp: currentElapsed(),
        eventType: 'workflow',
        action: `Stage: ${next}`,
        result: next,
        clinicalStateBefore: patient.snapshotClinical(),
        clinicalStateAfter: patient.snapshotClinical(),
        metadata: { stage: next }
      });
      emit('stage', { stage: next });
    }

    // Bootstrap dispatch event
    timeline.push({
      timestamp: 0,
      eventType: 'workflow',
      action: 'Dispatch received',
      result: scenario.dispatch?.text || '',
      clinicalStateBefore: patient.snapshotClinical(),
      clinicalStateAfter: patient.snapshotClinical(),
      metadata: { stage: 'Dispatch' }
    });

    function tick(dtSeconds) {
      if (paused || ended) return null;
      const result = patient.applyProgression(dtSeconds);
      if (result.changed) {
        emit('physiology', result);
        // Auto-flag deterioration stage suggestion (non-forcing)
        const clinical = patient.snapshotClinical();
        if ((clinical.clinicalState === 'severe' || clinical.clinicalState === 'impending_failure') && stage === 'Treatment') {
          emit('alert', { message: 'Patient condition deteriorating — reassess.', clinical });
        }
      }
      emit('tick', { elapsed: currentElapsed(), video: getVideo() });
      return result;
    }

    function startClock(intervalMs = 1000, speed = 1) {
      stopClock();
      lastTickAt = Date.now();
      clockTimer = setInterval(() => {
        if (paused || ended) return;
        const now = Date.now();
        const dt = ((now - lastTickAt) / 1000) * speed;
        lastTickAt = now;
        accumulatedMs += dt * 1000;
        tick(dt);
      }, intervalMs);
    }

    function stopClock() {
      if (clockTimer) {
        clearInterval(clockTimer);
        clockTimer = null;
      }
    }

    function pause() {
      paused = true;
      emit('pause', { paused: true });
    }

    function resume() {
      paused = false;
      lastTickAt = Date.now();
      emit('pause', { paused: false });
    }

    function advanceTime(seconds) {
      return tick(seconds);
    }

    function markEnroute() {
      timeline.push({
        timestamp: currentElapsed(),
        eventType: 'workflow',
        action: 'Enroute',
        result: 'Unit responding',
        clinicalStateBefore: patient.snapshotClinical(),
        clinicalStateAfter: patient.snapshotClinical(),
        metadata: {}
      });
      setStage('Enroute');
    }

    function markArrived() {
      timeline.push({
        timestamp: currentElapsed(),
        eventType: 'workflow',
        action: 'Arrived on scene',
        result: scenario.dispatch?.location || 'Scene',
        clinicalStateBefore: patient.snapshotClinical(),
        clinicalStateAfter: patient.snapshotClinical(),
        metadata: {}
      });
      setStage('Scene');
    }

    function markPatientContact() {
      timeline.push({
        timestamp: currentElapsed(),
        eventType: 'workflow',
        action: 'Patient contact',
        result: 'Contact established',
        clinicalStateBefore: patient.snapshotClinical(),
        clinicalStateAfter: patient.snapshotClinical(),
        metadata: {}
      });
      setStage('Patient Contact');
    }

    function performAssessment(id, options = {}) {
      if (stage === 'Dispatch' || stage === 'Enroute') setStage('Assessment');
      else if (['Scene', 'Patient Contact'].includes(stage)) setStage('Assessment');
      else if (['Treatment', 'Reassessment'].includes(stage) || options.reassessment) {
        options = { ...options, reassessment: true, isReassessment: true };
        if (options.reassessment) setStage('Reassessment');
      }
      const result = assessment.perform(id, {
        ...options,
        actionLabel: options.reassessment ? `Reassessed: ${id}` : undefined
      });
      if (options.reassessment) {
        // Tag last event
        const events = timeline.list();
        const last = events[events.length - 1];
        if (last && last.metadata) {
          // metadata is frozen — push a marker event
          timeline.push({
            timestamp: currentElapsed(),
            eventType: 'assessment',
            action: `Reassessment marker: ${id}`,
            result: result.finding,
            clinicalStateBefore: patient.snapshotClinical(),
            clinicalStateAfter: patient.snapshotClinical(),
            metadata: { assessmentId: id, reassessment: true, isReassessment: true }
          });
        }
      }
      emit('assessment', result);
      return result;
    }

    function enableMonitor(channel) {
      if (!(channel in monitorChannels)) return null;
      monitorChannels[channel] = true;
      // Pair related channels
      if (channel === 'spo2') monitorChannels.pleth = true;
      if (channel === 'hr') monitorChannels.ecg = true;
      if (channel === 'etco2') monitorChannels.capno = true;

      const vitals = patient.getVitals();
      const map = {
        hr: `HR ${vitals.heartRate}`,
        spo2: `SpO₂ ${vitals.spo2}%`,
        rr: `RR ${vitals.respiratoryRate}`,
        bp: `BP ${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`,
        etco2: `EtCO₂ ${vitals.etco2}`,
        temp: `Temp ${vitals.temperature}°F`,
        gcs: `GCS ${vitals.gcs}`,
        ecg: 'ECG monitoring on',
        pleth: 'Pleth waveform on',
        capno: 'Capnography on'
      };
      timeline.push({
        timestamp: currentElapsed(),
        eventType: 'monitoring',
        action: `Monitor enabled: ${channel}`,
        result: map[channel] || channel,
        clinicalStateBefore: patient.snapshotClinical(),
        clinicalStateAfter: patient.snapshotClinical(),
        metadata: { monitorChannel: channel, vitalsKey: channel === 'hr' ? 'pulse' : channel }
      });
      if (['Assessment', 'Patient Contact', 'Scene'].includes(stage)) setStage('Assessment');
      emit('monitor', { channel, channels: { ...monitorChannels }, vitals });
      return { channel, vitals };
    }

    function administerTreatment(selection) {
      setStage('Treatment');
      const result = treatment.administer(selection);
      emit('treatment', result);
      return result;
    }

    function talkToPatient(text, options) {
      if (['Dispatch', 'Enroute'].includes(stage)) markPatientContact();
      if (stage === 'Scene') setStage('Patient Contact');
      const result = conversation.ask(text, options);
      emit('conversation', result);
      return result;
    }

    function decideTransport(decision) {
      transportDecision = {
        ...decision,
        at: currentElapsed(),
        sceneTime: currentElapsed()
      };
      timeline.push({
        timestamp: currentElapsed(),
        eventType: 'transport',
        action: decision.action === 'continue_scene' ? 'Continue treatment on scene' : 'Transport initiated',
        result: [
          decision.destination && `Destination: ${decision.destination}`,
          decision.priority && `Priority: ${decision.priority}`,
          decision.resources && `Resources: ${decision.resources}`
        ].filter(Boolean).join(' · '),
        clinicalStateBefore: patient.snapshotClinical(),
        clinicalStateAfter: patient.snapshotClinical(),
        metadata: { ...transportDecision }
      });
      if (decision.action !== 'continue_scene') setStage('Transport');
      emit('transport', transportDecision);
      return transportDecision;
    }

    function submitHandoff(reportText) {
      handoffReport = String(reportText || '');
      timeline.push({
        timestamp: currentElapsed(),
        eventType: 'handoff',
        action: 'Hospital notification / handoff',
        result: handoffReport.slice(0, 240),
        clinicalStateBefore: patient.snapshotClinical(),
        clinicalStateAfter: patient.snapshotClinical(),
        metadata: { report: handoffReport }
      });
      setStage('Handoff');
      emit('handoff', { report: handoffReport });
      return { report: handoffReport };
    }

    function submitPcr(fields) {
      if (fields) pcr.update(fields);
      const submitted = pcr.submit(pcr.getDraft());
      setStage('Documentation');
      emit('pcr', submitted);
      return submitted;
    }

    function runGrading() {
      const comparison = pcr.getSubmitted()?.comparison || pcr.compare(pcr.getDraft());
      gradeResult = gradingEngine.grade({
        timeline: timeline.list(),
        monitorChannels: { ...monitorChannels },
        pcrComparison: comparison,
        pcrSubmitted: Boolean(pcr.getSubmitted()),
        transportDecision,
        handoffReport
      });
      timeline.push({
        timestamp: currentElapsed(),
        eventType: 'grading',
        action: 'Deterministic grade generated',
        result: `${gradeResult.percent}%`,
        clinicalStateBefore: patient.snapshotClinical(),
        clinicalStateAfter: patient.snapshotClinical(),
        metadata: { percent: gradeResult.percent, missedCritical: gradeResult.missedCritical }
      });
      emit('grade', gradeResult);
      return gradeResult;
    }

    function startDebrief() {
      if (!gradeResult) runGrading();
      debrief = Debrief.createDebriefEngine(
        scenario,
        gradeResult,
        timeline,
        patient.snapshotClinical().outcomeTrend || patient.snapshotClinical().clinicalState
      );
      setStage('Debrief');
      emit('debrief', { started: true });
      return debrief;
    }

    function endScenario() {
      ended = true;
      stopClock();
      if (!gradeResult) runGrading();
      timeline.push({
        timestamp: currentElapsed(),
        eventType: 'workflow',
        action: 'Scenario ended',
        result: 'ended',
        clinicalStateBefore: patient.snapshotClinical(),
        clinicalStateAfter: patient.snapshotClinical(),
        metadata: {}
      });
      emit('end', { grade: gradeResult });
      return gradeResult;
    }

    function getVideo() {
      return VideoState.getVideoConfig(scenario, {
        ...patient.getFullState(),
        ...patient.snapshotClinical()
      });
    }

    function getSnapshot() {
      return {
        sessionId,
        scenarioId: scenario.scenarioMetadata?.id,
        stage,
        paused,
        ended,
        elapsed: currentElapsed(),
        patient: patient.getPublicState(),
        vitals: patient.getVitals(),
        clinical: patient.snapshotClinical(),
        video: getVideo(),
        monitorChannels: { ...monitorChannels },
        revealedAssessments: assessment.getRevealed(),
        treatments: treatment.getAdministered(),
        conversation: conversation.getHistory(),
        discoveries: conversation.getDiscoveries(),
        transportDecision,
        handoffReport,
        pcr: pcr.getDraft(),
        pcrSubmitted: pcr.getSubmitted(),
        grade: gradeResult,
        timeline: timeline.toDisplayRows(),
        timelineRaw: timeline.list()
      };
    }

    function subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }

    function destroy() {
      stopClock();
      listeners.clear();
      assessment.reset();
      treatment.reset();
      conversation.reset();
      pcr.reset();
      timeline.reset();
      patient.reset(null);
      gradeResult = null;
      debrief = null;
      ended = true;
    }

    return {
      sessionId,
      scenario,
      timeline,
      patient,
      assessment,
      treatment,
      conversation,
      pcr,
      get stage() { return stage; },
      get paused() { return paused; },
      get ended() { return ended; },
      get gradeResult() { return gradeResult; },
      get debrief() { return debrief; },
      setStage,
      startClock,
      stopClock,
      pause,
      resume,
      advanceTime,
      tick,
      markEnroute,
      markArrived,
      markPatientContact,
      performAssessment,
      enableMonitor,
      administerTreatment,
      talkToPatient,
      decideTransport,
      submitHandoff,
      submitPcr,
      runGrading,
      startDebrief,
      endScenario,
      getVideo,
      getSnapshot,
      subscribe,
      destroy,
      getMonitorChannels: () => ({ ...monitorChannels })
    };
  }

  function startNewSession(scenarioId, registry, deps) {
    const scenarios = registry || global.PSV2.Scenarios?.scenarios || {};
    const scenario = typeof scenarioId === 'object' ? scenarioId : scenarios[scenarioId];
    if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);
    return createSession(scenario, deps || {});
  }

  const api = { createSession, startNewSession, uuid };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.PSV2 = global.PSV2 || {};
  global.PSV2.Session = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
