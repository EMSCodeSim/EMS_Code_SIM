(() => {
  'use strict';

  const api = window.EMSCodeSimPatientRecord;
  if (!api) return;

  const STATE_PREFIX = 'emscodesim_scenario_';
  const PARTNER_PREFIX = 'emscodesim_partner_tasks_';
  const params = new URLSearchParams(location.search);
  let syncing = false;

  const SCENARIO_CATALOG = Object.freeze({
    asthma: {
      id: 'asthma', title: 'Respiratory Distress', patient: '24-year-old adult',
      dispatch: 'Worsening shortness of breath and wheezing.', scene: 'Apartment; rescue inhaler nearby',
      goal: 'Assess respiratory adequacy, treat, reassess, and report.'
    },
    stroke: {
      id: 'stroke', title: 'Possible Acute Stroke', patient: '68-year-old adult',
      dispatch: 'Sudden speech difficulty and right-sided weakness.', scene: 'Private residence; family present',
      goal: 'Identify time-sensitive neurologic findings and prepare rapid stroke-center transport.'
    },
    hypoglycemia: {
      id: 'hypoglycemia', title: 'Altered Mental Status', patient: '57-year-old adult',
      dispatch: 'Confused, sweaty, and behaving abnormally.', scene: 'Workplace break room',
      goal: 'Find a reversible cause, protect the airway, treat, and reassess.'
    },
    trauma: {
      id: 'trauma', title: 'Blunt Trauma', patient: '36-year-old adult',
      dispatch: 'Two-vehicle collision with chest and abdominal pain.', scene: 'Roadway collision; moderate vehicle damage',
      goal: 'Find immediate threats, support ABCs, and expedite trauma transport.'
    },
    pediatric: {
      id: 'pediatric', title: 'Sick Pediatric Patient', patient: '3-year-old child',
      dispatch: 'Fever, poor interaction, and increased work of breathing.', scene: 'Home; caregiver present',
      goal: 'Use the pediatric first look, support ABCs, and reassess response.'
    }
  });

  function requestedCaseId() {
    return params.get('case') || api.active()?.scenarioId || api.active()?.id || '';
  }

  function stateKey(caseId) {
    return `${STATE_PREFIX}${caseId}`;
  }

  function readState(caseId = requestedCaseId()) {
    const fallback = { done: [], complete: false, findings: {}, treatments: [], reassessments: [], careLog: [] };
    if (!caseId) return fallback;
    try {
      const parsed = JSON.parse(localStorage.getItem(stateKey(caseId)) || '{}');
      return {
        ...fallback,
        ...parsed,
        done: Array.isArray(parsed.done) ? parsed.done : [],
        findings: parsed.findings && typeof parsed.findings === 'object' ? parsed.findings : {},
        treatments: Array.isArray(parsed.treatments) ? parsed.treatments : [],
        reassessments: Array.isArray(parsed.reassessments) ? parsed.reassessments : [],
        careLog: Array.isArray(parsed.careLog) ? parsed.careLog : []
      };
    } catch {
      return fallback;
    }
  }

  function writeState(caseId, state) {
    if (!caseId) return state;
    const next = { ...state, updatedAt: new Date().toISOString() };
    localStorage.setItem(stateKey(caseId), JSON.stringify(next));
    return next;
  }

  function ensureRecord(caseId = requestedCaseId()) {
    let record = api.active?.() || null;
    if (!caseId) return record;
    if (record && (record.scenarioId === caseId || record.id === caseId)) return record;

    const stored = api.load?.(caseId) || null;
    if (stored) {
      api.save(stored);
      return api.active?.() || stored;
    }

    const scenario = SCENARIO_CATALOG[caseId];
    if (scenario && api.create) return api.create(scenario);
    return null;
  }

  function mirrorRecordToState(record, state) {
    const caseId = record?.scenarioId || record?.id;
    if (!caseId) return state;
    const next = { ...state, patientRecordId: record.id, findings: { ...(state.findings || {}) } };
    Object.entries(record.findings || {}).forEach(([key, finding]) => {
      next.findings[key] = finding;
    });
    next.treatments = Array.isArray(record.treatments) ? record.treatments : next.treatments;
    next.reassessments = Array.isArray(record.reassessments) ? record.reassessments : next.reassessments;
    next.careLog = Array.isArray(record.careLog) ? record.careLog : next.careLog;
    return writeState(caseId, next);
  }

  function restoreStateToRecord(record, state) {
    if (!record) return record;
    let changed = false;
    Object.entries(state.findings || {}).forEach(([key, finding]) => {
      if (api.hasFinding?.(key, api.active?.() || record)) return;
      api.setFinding(key, finding.value ?? finding.finding ?? '', finding);
      changed = true;
    });

    const treatmentExists = item => {
      const current = api.active?.() || record;
      return (current.treatments || []).some(saved =>
        (item.eventId && saved.eventId === item.eventId) ||
        ((saved.time || saved.recordedAt) === (item.time || item.recordedAt) &&
          (saved.treatment || saved.name || saved.description) === (item.treatment || item.name || item.description))
      );
    };
    (state.treatments || []).forEach(item => {
      if (treatmentExists(item)) return;
      api.addTreatment(item);
      changed = true;
    });

    const reassessmentExists = item => {
      const current = api.active?.() || record;
      return (current.reassessments || []).some(saved =>
        (item.eventId && saved.eventId === item.eventId) ||
        ((saved.time || saved.recordedAt) === (item.time || item.recordedAt) &&
          (saved.response || saved.description || saved.nextAction) === (item.response || item.description || item.nextAction))
      );
    };
    (state.reassessments || []).forEach(item => {
      if (reassessmentExists(item)) return;
      api.addReassessment(item);
      changed = true;
    });

    const current = api.active?.() || record;
    const knownIds = new Set((current.careLog || []).map(event => event.id || event.eventId).filter(Boolean));
    const missingEvents = (state.careLog || []).filter(event => {
      const id = event.id || event.eventId;
      return id ? !knownIds.has(id) : true;
    });
    if (missingEvents.length && api.mergeCareLog) {
      api.mergeCareLog(missingEvents);
      changed = true;
    }
    return changed ? api.active?.() || record : record;
  }

  function sync(caseId = requestedCaseId()) {
    if (syncing) return api.active?.() || null;
    syncing = true;
    try {
      let record = ensureRecord(caseId);
      if (!record) return null;
      const resolvedCase = record.scenarioId || record.id;
      let state = readState(resolvedCase);
      record = restoreStateToRecord(record, state);
      state = mirrorRecordToState(record, state);
      return record;
    } finally {
      syncing = false;
    }
  }

  function saveFinding(category, value, meta = {}) {
    const record = sync();
    if (!record) throw new Error('No active scenario patient record.');
    const canonical = api.normalizeKey?.(category) || category;
    api.setFinding(canonical, value, meta);
    const saved = api.getFinding?.(canonical);
    if (!saved) throw new Error(`Unable to verify saved finding: ${canonical}`);

    const caseId = record.scenarioId || record.id;
    const state = readState(caseId);
    state.findings[canonical] = saved;
    state.lastFinding = canonical;
    state.careLog = api.active?.()?.careLog || state.careLog || [];
    writeState(caseId, state);

    window.dispatchEvent(new CustomEvent('emscodesim:scenario-finding-saved', {
      detail: { caseId, category: canonical, finding: saved }
    }));
    return saved;
  }

  function addTreatment(treatment = {}) {
    const record = sync();
    if (!record) throw new Error('No active scenario patient record.');
    api.addTreatment(treatment);
    const updated = api.active?.() || record;
    const caseId = updated.scenarioId || updated.id;
    const state = readState(caseId);
    state.treatments = updated.treatments || [];
    state.careLog = updated.careLog || state.careLog || [];
    writeState(caseId, state);
    return state.treatments[state.treatments.length - 1] || treatment;
  }

  function addReassessment(entry = {}) {
    const record = sync();
    if (!record) throw new Error('No active scenario patient record.');
    api.addReassessment(entry);
    const updated = api.active?.() || record;
    const caseId = updated.scenarioId || updated.id;
    const state = readState(caseId);
    state.reassessments = updated.reassessments || [];
    state.careLog = updated.careLog || state.careLog || [];
    writeState(caseId, state);
    return state.reassessments[state.reassessments.length - 1] || entry;
  }

  function partnerTaskKey(caseId = requestedCaseId()) {
    return `${PARTNER_PREFIX}${caseId}`;
  }

  function readPartnerTasks(caseId = requestedCaseId()) {
    if (!caseId) return {};
    try {
      const parsed = JSON.parse(localStorage.getItem(partnerTaskKey(caseId)) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function writePartnerTasks(caseId, tasks) {
    if (!caseId) return tasks || {};
    localStorage.setItem(partnerTaskKey(caseId), JSON.stringify(tasks || {}));
    return tasks || {};
  }

  function assignPartnerTask(task = {}, caseId = requestedCaseId()) {
    const record = sync(caseId);
    const resolvedCase = caseId || record?.scenarioId || record?.id;
    if (!resolvedCase || !task.key) throw new Error('A scenario and partner task key are required.');
    const assignedAt = new Date().toISOString();
    const delaySeconds = Math.max(1, Number(task.delaySeconds || task.delay || 12));
    const dueAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
    const tasks = readPartnerTasks(resolvedCase);
    tasks[task.key] = {
      key: task.key,
      label: task.label || api.labelFor?.(task.key) || task.key,
      value: task.value == null ? 'Obtained' : String(task.value),
      assignedAt,
      dueAt,
      delaySeconds,
      status: 'pending'
    };
    writePartnerTasks(resolvedCase, tasks);
    window.dispatchEvent(new CustomEvent('emscodesim:partner-task-updated', { detail: { caseId: resolvedCase, task: tasks[task.key] } }));
    return tasks[task.key];
  }

  function resolvePartnerTasks(caseId = requestedCaseId()) {
    const record = sync(caseId);
    const resolvedCase = caseId || record?.scenarioId || record?.id;
    if (!resolvedCase) return [];
    const tasks = readPartnerTasks(resolvedCase);
    const completed = [];
    Object.values(tasks).forEach(task => {
      if (!task || task.status !== 'pending') return;
      if (new Date(task.dueAt).getTime() > Date.now()) return;
      try {
        saveFinding(task.key, task.value, {
          label: task.label,
          source: 'partner-assignment',
          locked: true,
          partnerAssignedAt: task.assignedAt,
          partnerCompletedAt: new Date().toISOString()
        });
        task.status = 'complete';
        task.completedAt = new Date().toISOString();
        completed.push(task);
      } catch (error) {
        console.error('Partner task could not be completed', error);
      }
    });
    if (completed.length) {
      writePartnerTasks(resolvedCase, tasks);
      completed.forEach(task => window.dispatchEvent(new CustomEvent('emscodesim:partner-task-completed', { detail: { caseId: resolvedCase, task } })));
    }
    return completed;
  }

  function scenarioHome(caseId = requestedCaseId()) {
    return caseId
      ? `/vitals/visual-patient.html?case=${encodeURIComponent(caseId)}`
      : '/vitals/scenario-launcher.html';
  }

  window.EMSCodeSimScenarioSession = {
    requestedCaseId,
    readState,
    writeState,
    ensureRecord,
    sync,
    saveFinding,
    addTreatment,
    addReassessment,
    partnerTaskKey,
    readPartnerTasks,
    writePartnerTasks,
    assignPartnerTask,
    resolvePartnerTasks,
    scenarioHome,
    SCENARIO_CATALOG
  };

  setTimeout(() => {
    try { sync(); resolvePartnerTasks(); } catch (error) { console.error('Scenario session sync failed', error); }
  }, 0);
  window.addEventListener('pageshow', () => {
    try { sync(); resolvePartnerTasks(); } catch (error) { console.error('Scenario session restore failed', error); }
  });
})();
