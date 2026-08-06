(() => {
  'use strict';

  const PLANS = window.EMSCodeSimScenarioDefinitions?.PHASE_PLANS || Object.freeze({});

  const LABELS = {
    scene_size_up: 'Scene size-up', airway: 'Airway assessment', breathing: 'Breathing assessment', perfusion: 'Circulation and perfusion',
    respirations: 'Respiratory rate', breath_sounds: 'Breath sounds', spo2: 'SpO₂', pulse: 'Pulse', blood_pressure: 'Blood pressure',
    blood_glucose: 'Blood glucose', temperature: 'Temperature', skin: 'Skin signs', mental_status: 'Mental status', pupils: 'Pupils',
    motor_sensory: 'Motor and sensory', sample: 'SAMPLE history', pain: 'Pain / OPQRST', chest_assessment: 'Chest assessment',
    trauma_assessment: 'Rapid trauma assessment', abdominal_assessment: 'Abdominal assessment', pediatric_assessment_triangle: 'Pediatric Assessment Triangle',
    rule_of_nines: 'Rule of Nines', arrival_parking: 'Ambulance parking decision', bls_handoff: 'BLS engine handoff',
    neck_back: 'Neck and back exam', pelvis_hip: 'Pelvis and hip exam', left_leg: 'Left-leg exam', distal_csm: 'Distal circulation, sensation, and movement',
    movement_method: 'Movement method', leg_stabilization: 'Leg stabilization plan', movement_plan: 'Movement and packaging plan'
  };

  const PRIMARY_KEYS = ['airway','breathing','perfusion'];
  const VITAL_KEYS = ['respirations','breath_sounds','spo2','pulse','blood_pressure','blood_glucose','temperature','skin','mental_status','pupils'];
  const FOCUSED_KEYS = ['pediatric_assessment_triangle','motor_sensory','sample','pain','chest_assessment','trauma_assessment','abdominal_assessment','rule_of_nines','neck_back','pelvis_hip','left_leg','distal_csm'];

  function planFor(caseId) { return PLANS[caseId] || PLANS.asthma; }
  function has(record, key) { return Boolean(record?.findings?.[key]); }
  function timestamp(value) {
    const time = new Date(value || 0).getTime();
    return Number.isFinite(time) ? time : 0;
  }
  function treatmentTargets(item = {}) {
    if (Array.isArray(item.targetKeys) && item.targetKeys.length) return [...new Set(item.targetKeys.filter(Boolean))];
    if (item.assessment) return [item.assessment];
    if (item.context && item.context !== 'general') return [item.context];
    return [];
  }
  function reassessmentTargets(item = {}) {
    if (Array.isArray(item.targetKeys) && item.targetKeys.length) return [...new Set(item.targetKeys.filter(Boolean))];
    if (item.assessment) return [item.assessment];
    if (item.context && item.context !== 'general') return [item.context];
    return [];
  }
  function targetedReassessmentStatus(record) {
    const treatments = (Array.isArray(record?.treatments) ? record.treatments : [])
      .filter(item => item?.reassessmentRequired !== false && !['contraindicated','premature','unnecessary'].includes(item?.classification));
    const reassessments = Array.isArray(record?.reassessments) ? record.reassessments : [];
    const required = [];
    treatments.forEach((treatment, treatmentIndex) => {
      const treatedAt = timestamp(treatment.recordedAt || treatment.time);
      const targets = treatmentTargets(treatment);
      if (!targets.length) {
        required.push({ key: `general_${treatmentIndex}`, label: 'General patient reassessment', treatedAt, treatment });
        return;
      }
      targets.forEach(key => required.push({ key, label: labelFor(key), treatedAt, treatment }));
    });
    const deduped = new Map();
    required.forEach(item => {
      const existing = deduped.get(item.key);
      if (!existing || item.treatedAt > existing.treatedAt) deduped.set(item.key, item);
    });
    const requirements = [...deduped.values()].map(requirement => {
      const matched = reassessments
        .filter(item => {
          const reassessedAt = timestamp(item.recordedAt || item.time);
          if (reassessedAt < requirement.treatedAt) return false;
          const targets = reassessmentTargets(item);
          if (requirement.key.startsWith('general_')) return true;
          return targets.includes(requirement.key);
        })
        .sort((a, b) => timestamp(b.recordedAt || b.time) - timestamp(a.recordedAt || a.time))[0] || null;
      return { ...requirement, complete: Boolean(matched), reassessment: matched };
    });
    const missing = requirements.filter(item => !item.complete);
    return {
      complete: treatments.length > 0 && requirements.length > 0 && missing.length === 0,
      requirements,
      missing,
      completed: requirements.length - missing.length,
      total: requirements.length
    };
  }
  function hasReassessmentAfterTreatment(record) { return targetedReassessmentStatus(record).complete; }
  function classification(caseId, key) {
    const plan = planFor(caseId);
    if (plan.requiredFindings.includes(key)) return 'required';
    if (plan.appropriateFindings.includes(key)) return 'appropriate';
    if (plan.notIndicatedFindings.includes(key)) return 'not-indicated';
    return 'optional';
  }
  function labelFor(key) { return LABELS[key] || String(key || '').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()); }
  function progressFor(keys, record) {
    const completed = keys.filter(key => has(record, key));
    return { total: keys.length, completed: completed.length, complete: keys.length === 0 || completed.length === keys.length, keys, completedKeys: completed };
  }
  function phaseState(complete, started) { return complete ? 'complete' : started ? 'in-progress' : 'not-started'; }

  function evaluate(record) {
    const caseId = record?.scenarioId || record?.id || 'asthma';
    const plan = planFor(caseId);
    const requiredPrimary = plan.requiredFindings.filter(key => PRIMARY_KEYS.includes(key));
    const requiredVitals = plan.requiredFindings.filter(key => VITAL_KEYS.includes(key));
    const requiredFocused = plan.requiredFindings.filter(key => FOCUSED_KEYS.includes(key));
    const appropriateFocused = plan.appropriateFindings.filter(key => FOCUSED_KEYS.includes(key));
    const appropriateVitals = plan.appropriateFindings.filter(key => VITAL_KEYS.includes(key));
    const primary = progressFor(requiredPrimary, record);
    const focused = progressFor(requiredFocused, record);
    const vitals = progressFor(requiredVitals, record);
    const treatments = Array.isArray(record?.treatments) ? record.treatments : [];
    const reassessments = Array.isArray(record?.reassessments) ? record.reassessments : [];
    const reassessmentStatus = targetedReassessmentStatus(record);
    const impressionComplete = Boolean(record?.impressions?.primary);
    const transportDocumented = Boolean(record?.impressions?.action || record?.documentation?.transportPriority || record?.documentation?.destination);
    const handoffComplete = Boolean(record?.documentation?.handoff || record?.documentation?.narrative);
    const debriefComplete = Boolean(record?.documentation?.debrief?.savedAt || record?.documentation?.debrief?.score != null || record?.debrief?.reflection?.savedAt);

    const phases = [
      { id: 'scene', label: 'Scene size-up', requirement: 'Required', complete: has(record, 'scene_size_up'), started: has(record, 'scene_size_up') },
      { id: 'primary', label: 'Primary assessment', requirement: 'Required', complete: primary.complete, started: primary.completed > 0, detail: `${primary.completed} of ${primary.total}` },
      { id: 'focused', label: 'History & focused assessment', requirement: requiredFocused.length ? 'Required + clinically appropriate' : 'Clinically appropriate', complete: focused.complete, started: [...requiredFocused, ...appropriateFocused].some(key => has(record, key)), detail: requiredFocused.length ? `${focused.completed} of ${focused.total} required` : 'Use when indicated' },
      { id: 'vitals', label: 'Initial vitals', requirement: 'Required + clinically appropriate', complete: vitals.complete, started: [...requiredVitals, ...appropriateVitals].some(key => has(record, key)), detail: `${vitals.completed} of ${vitals.total} required` },
      { id: 'treatment', label: 'Immediate treatment', requirement: 'Required when indicated', complete: treatments.length > 0, started: treatments.length > 0, detail: treatments.length ? `${treatments.length} recorded` : 'Not yet recorded' },
      { id: 'reassessment', label: 'Targeted reassessment', requirement: 'Required after treatment', complete: reassessmentStatus.complete, started: reassessments.length > 0, detail: reassessmentStatus.total ? `${reassessmentStatus.completed} of ${reassessmentStatus.total} treatment targets reassessed` : 'No reassessment targets recorded' },
      { id: 'impression', label: 'Impression & transport', requirement: 'Required', complete: impressionComplete && transportDocumented, started: impressionComplete || transportDocumented, detail: impressionComplete && !transportDocumented ? 'Transport decision still needed' : '' },
      { id: 'handoff', label: 'Handoff', requirement: 'Required', complete: handoffComplete, started: handoffComplete },
      { id: 'debrief', label: 'Debrief', requirement: 'Optional unless assigned', complete: debriefComplete, started: debriefComplete }
    ].map(phase => ({ ...phase, status: phaseState(phase.complete, phase.started) }));

    const missing = [];
    if (!has(record, 'scene_size_up')) missing.push('Scene size-up');
    requiredPrimary.filter(key => !has(record, key)).forEach(key => missing.push(labelFor(key)));
    requiredFocused.filter(key => !has(record, key)).forEach(key => missing.push(labelFor(key)));
    requiredVitals.filter(key => !has(record, key)).forEach(key => missing.push(labelFor(key)));
    if (!treatments.length) missing.push('Immediate treatment decision');
    reassessmentStatus.missing.forEach(item => missing.push(`Reassess ${item.label}`));
    if (treatments.length && !reassessmentStatus.total) missing.push('Reassessment after treatment');
    if (!impressionComplete) missing.push('Working impression');
    if (!transportDocumented) missing.push('Transport priority or destination');
    if (!handoffComplete) missing.push('PCR or verbal handoff');

    return {
      caseId,
      plan,
      phases,
      missing,
      essentialComplete: missing.length === 0,
      completedRequiredPhases: phases.filter(phase => phase.requirement.startsWith('Required') && phase.complete).length,
      requiredPhaseCount: phases.filter(phase => phase.requirement.startsWith('Required')).length
    };
  }

  window.EMSCodeSimScenarioPhases = { PLANS, planFor, classification, labelFor, evaluate, treatmentTargets, reassessmentTargets, targetedReassessmentStatus, hasReassessmentAfterTreatment };
})();
