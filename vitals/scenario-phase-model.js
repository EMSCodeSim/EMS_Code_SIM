(() => {
  'use strict';

  const PLANS = Object.freeze({
    asthma: {
      requiredFindings: ['scene_size_up','airway','breathing','perfusion','respirations','breath_sounds','spo2'],
      appropriateFindings: ['pulse','blood_pressure','skin','sample'],
      optionalFindings: ['mental_status','pupils','temperature','blood_glucose','pain'],
      notIndicatedFindings: ['motor_sensory','chest_assessment','abdominal_assessment','trauma_assessment','pediatric_assessment_triangle','rule_of_nines']
    },
    stroke: {
      requiredFindings: ['scene_size_up','airway','breathing','perfusion','mental_status','motor_sensory','blood_glucose','blood_pressure','pulse','respirations','spo2','sample'],
      appropriateFindings: ['pupils','skin','breath_sounds'],
      optionalFindings: ['temperature','pain'],
      notIndicatedFindings: ['chest_assessment','abdominal_assessment','trauma_assessment','pediatric_assessment_triangle','rule_of_nines']
    },
    hypoglycemia: {
      requiredFindings: ['scene_size_up','airway','breathing','perfusion','mental_status','blood_glucose','pulse','blood_pressure','respirations','spo2'],
      appropriateFindings: ['skin','pupils','motor_sensory','sample'],
      optionalFindings: ['temperature','breath_sounds','pain'],
      notIndicatedFindings: ['chest_assessment','abdominal_assessment','trauma_assessment','pediatric_assessment_triangle','rule_of_nines']
    },
    trauma: {
      requiredFindings: ['scene_size_up','airway','breathing','perfusion','respirations','breath_sounds','spo2','pulse','blood_pressure','skin','chest_assessment','trauma_assessment','abdominal_assessment'],
      appropriateFindings: ['mental_status','pupils','pain','sample'],
      optionalFindings: ['blood_glucose','temperature','motor_sensory'],
      notIndicatedFindings: ['pediatric_assessment_triangle','rule_of_nines']
    },
    pediatric: {
      requiredFindings: ['scene_size_up','pediatric_assessment_triangle','airway','breathing','perfusion','respirations','breath_sounds','spo2','pulse','skin'],
      appropriateFindings: ['temperature','blood_pressure','mental_status','sample'],
      optionalFindings: ['pupils','blood_glucose','pain'],
      notIndicatedFindings: ['motor_sensory','chest_assessment','abdominal_assessment','trauma_assessment','rule_of_nines']
    }
  });

  const LABELS = {
    scene_size_up: 'Scene size-up', airway: 'Airway assessment', breathing: 'Breathing assessment', perfusion: 'Circulation and perfusion',
    respirations: 'Respiratory rate', breath_sounds: 'Breath sounds', spo2: 'SpO₂', pulse: 'Pulse', blood_pressure: 'Blood pressure',
    blood_glucose: 'Blood glucose', temperature: 'Temperature', skin: 'Skin signs', mental_status: 'Mental status', pupils: 'Pupils',
    motor_sensory: 'Motor and sensory', sample: 'SAMPLE history', pain: 'Pain / OPQRST', chest_assessment: 'Chest assessment',
    trauma_assessment: 'Rapid trauma assessment', abdominal_assessment: 'Abdominal assessment', pediatric_assessment_triangle: 'Pediatric Assessment Triangle',
    rule_of_nines: 'Rule of Nines'
  };

  const PRIMARY_KEYS = ['airway','breathing','perfusion'];
  const VITAL_KEYS = ['respirations','breath_sounds','spo2','pulse','blood_pressure','blood_glucose','temperature','skin','mental_status','pupils'];
  const FOCUSED_KEYS = ['pediatric_assessment_triangle','motor_sensory','sample','pain','chest_assessment','trauma_assessment','abdominal_assessment','rule_of_nines'];

  function planFor(caseId) { return PLANS[caseId] || PLANS.asthma; }
  function has(record, key) { return Boolean(record?.findings?.[key]); }
  function timestamp(value) {
    const time = new Date(value || 0).getTime();
    return Number.isFinite(time) ? time : 0;
  }
  function hasReassessmentAfterTreatment(record) {
    const treatments = Array.isArray(record?.treatments) ? record.treatments : [];
    const reassessments = Array.isArray(record?.reassessments) ? record.reassessments : [];
    if (!treatments.length || !reassessments.length) return false;
    const lastTreatment = Math.max(...treatments.map(item => timestamp(item.recordedAt || item.time)));
    const lastReassessment = Math.max(...reassessments.map(item => timestamp(item.recordedAt || item.time)));
    return lastReassessment >= lastTreatment;
  }
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
      { id: 'reassessment', label: 'Reassessment', requirement: 'Required after treatment', complete: hasReassessmentAfterTreatment(record), started: reassessments.length > 0, detail: reassessments.length ? `${reassessments.length} recorded` : 'Not yet recorded' },
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
    if (!hasReassessmentAfterTreatment(record)) missing.push('Reassessment after treatment');
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

  window.EMSCodeSimScenarioPhases = { PLANS, planFor, classification, labelFor, evaluate, hasReassessmentAfterTreatment };
})();
