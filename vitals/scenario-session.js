(() => {
  'use strict';

  const api = window.EMSCodeSimPatientRecord;
  if (!api) return;

  const STATE_PREFIX = 'emscodesim_scenario_';
  const PARTNER_PREFIX = 'emscodesim_partner_tasks_';
  const params = new URLSearchParams(location.search);
  let syncing = false;
  const synchronizedCases = new Set();
  const partnerTimers = new Map();

  const SCENARIO_CATALOG = window.EMSCodeSimScenarioDefinitions?.CATALOG || Object.freeze({});

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

  function sync(caseId = requestedCaseId(), options = {}) {
    if (syncing) return api.active?.() || null;
    let record = ensureRecord(caseId);
    if (!record) return null;
    const resolvedCase = record.scenarioId || record.id;
    const force = options === true || options?.force === true;
    if (!force && synchronizedCases.has(resolvedCase)) return record;

    syncing = true;
    try {
      let state = readState(resolvedCase);
      record = restoreStateToRecord(record, state);
      mirrorRecordToState(record, state);
      synchronizedCases.add(resolvedCase);
      return api.active?.() || record;
    } finally {
      syncing = false;
    }
  }

  function active(caseId = requestedCaseId()) {
    const current = api.active?.() || null;
    if (current && (!caseId || current.scenarioId === caseId || current.id === caseId)) return current;
    return sync(caseId);
  }

  function saveFinding(category, value, meta = {}, caseId = requestedCaseId()) {
    const record = active(caseId);
    if (!record) throw new Error('No active scenario patient record.');
    const canonical = api.normalizeKey?.(category) || category;
    api.setFinding(canonical, value, meta);
    const saved = api.getFinding?.(canonical);
    if (!saved) throw new Error(`Unable to verify saved finding: ${canonical}`);

    const resolvedCase = record.scenarioId || record.id;
    const state = readState(resolvedCase);
    state.findings[canonical] = saved;
    state.lastFinding = canonical;
    state.careLog = api.active?.()?.careLog || state.careLog || [];
    writeState(resolvedCase, state);

    window.dispatchEvent(new CustomEvent('emscodesim:scenario-finding-saved', {
      detail: { caseId: resolvedCase, category: canonical, finding: saved }
    }));
    return saved;
  }

  function addTreatment(treatment = {}) {
    const record = active();
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
    const record = active();
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

  // Partner queue states include status: 'pending' for the one active skill and 'queued' for later skills.
  function taskTime(value) {
    const parsed = new Date(value || 0).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalizePartnerQueue(tasks = {}) {
    const ordered = Object.values(tasks)
      .filter(task => task && ['pending','queued'].includes(task.status))
      .sort((a,b) => taskTime(a.assignedAt) - taskTime(b.assignedAt));
    let cursor = Date.now();
    ordered.forEach((task, index) => {
      const duration = Math.max(1, Number(task.delaySeconds || 12)) * 1000;
      if (index === 0) {
        task.status = 'pending';
        task.startedAt = task.startedAt || new Date(Math.max(cursor, taskTime(task.assignedAt))).toISOString();
        const start = Math.max(cursor, taskTime(task.startedAt));
        if (!task.dueAt) task.dueAt = new Date(start + duration).toISOString();
        cursor = taskTime(task.dueAt) || (start + duration);
      } else {
        task.status = 'queued';
        task.startedAt = '';
        task.dueAt = '';
        task.queuePosition = index + 1;
      }
    });
    return tasks;
  }

  function assignPartnerTask(task = {}, caseId = requestedCaseId()) {
    const record = active(caseId);
    const resolvedCase = caseId || record?.scenarioId || record?.id;
    if (!resolvedCase || !task.key) throw new Error('A scenario and partner task key are required.');
    const assignedAt = new Date().toISOString();
    const delaySeconds = Math.max(1, Number(task.delaySeconds || task.delay || 12));
    const tasks = readPartnerTasks(resolvedCase);
    const alreadyBusy = Object.values(tasks).some(item => item && ['pending','queued'].includes(item.status));
    tasks[task.key] = {
      key: task.key,
      label: task.label || api.labelFor?.(task.key) || task.key,
      value: task.value == null ? 'Obtained' : String(task.value),
      assignedAt,
      startedAt: alreadyBusy ? '' : assignedAt,
      dueAt: alreadyBusy ? '' : new Date(Date.now() + delaySeconds * 1000).toISOString(),
      delaySeconds,
      status: alreadyBusy ? 'queued' : 'pending'
    };
    normalizePartnerQueue(tasks);
    writePartnerTasks(resolvedCase, tasks);
    window.dispatchEvent(new CustomEvent('emscodesim:partner-task-updated', { detail: { caseId: resolvedCase, task: tasks[task.key] } }));
    schedulePartnerTasks(resolvedCase);
    return tasks[task.key];
  }

  function partnerFindingMeta(task, completedAt = task.completedAt || new Date().toISOString()) {
    return {
      label: task.label,
      source: 'partner-assignment',
      locked: true,
      recordedAt: completedAt,
      partnerAssignedAt: task.assignedAt,
      partnerStartedAt: task.startedAt,
      partnerCompletedAt: completedAt
    };
  }

  function recoverCompletedPartnerFindings(caseId, tasks) {
    const recovered = [];
    Object.values(tasks || {}).forEach(task => {
      if (!task || task.status !== 'complete' || !task.key) return;
      const current = api.getFinding?.(task.key, api.active?.());
      if (current) return;
      try {
        const completedAt = task.completedAt || new Date().toISOString();
        const saved = saveFinding(task.key, task.value, partnerFindingMeta(task, completedAt), caseId);
        if (saved) recovered.push(task);
      } catch (error) {
        console.error('Completed partner result could not be recovered', error);
      }
    });
    return recovered;
  }

  function clearPartnerTimer(caseId) {
    const timer = partnerTimers.get(caseId);
    if (timer) clearTimeout(timer);
    partnerTimers.delete(caseId);
  }

  function schedulePartnerTasks(caseId = requestedCaseId()) {
    const record = active(caseId);
    const resolvedCase = caseId || record?.scenarioId || record?.id;
    if (!resolvedCase) return null;
    clearPartnerTimer(resolvedCase);
    const tasks = readPartnerTasks(resolvedCase);
    normalizePartnerQueue(tasks);
    const pending = Object.values(tasks).find(task => task && task.status === 'pending');
    if (!pending) return null;
    const wait = Math.max(0, taskTime(pending.dueAt) - Date.now());
    const dueAt = taskTime(pending.dueAt);
    const timer = setTimeout(() => {
      partnerTimers.delete(resolvedCase);
      // Some test harnesses execute timers synchronously. Never recurse when the
      // scheduled completion time has not actually arrived.
      if (Date.now() < dueAt) return;
      resolvePartnerTasks(resolvedCase);
    }, Math.min(wait, 2_147_483_647));
    partnerTimers.set(resolvedCase, timer);
    return pending;
  }

  function resolvePartnerTasks(caseId = requestedCaseId()) {
    const record = active(caseId);
    const resolvedCase = caseId || record?.scenarioId || record?.id;
    if (!resolvedCase) return [];
    const original = readPartnerTasks(resolvedCase);
    const tasks = normalizePartnerQueue(original);
    const completed = recoverCompletedPartnerFindings(resolvedCase, tasks);
    const activeTask = Object.values(tasks).find(task => task && task.status === 'pending');
    let changed = completed.length > 0;

    if (activeTask && taskTime(activeTask.dueAt) <= Date.now()) {
      activeTask.status = 'completing';
      activeTask.completingAt = new Date().toISOString();
      writePartnerTasks(resolvedCase, tasks);
      try {
        const completedAt = new Date().toISOString();
        const saved = saveFinding(activeTask.key, activeTask.value, partnerFindingMeta(activeTask, completedAt), resolvedCase);
        const verified = saved || api.getFinding?.(activeTask.key, api.active?.());
        if (!verified) throw new Error(`Partner vital was not verified after save: ${activeTask.key}`);
        activeTask.status = 'complete';
        activeTask.completedAt = completedAt;
        activeTask.lastError = '';
        completed.push(activeTask);
        changed = true;
      } catch (error) {
        activeTask.status = 'pending';
        activeTask.dueAt = new Date(Date.now() + 1000).toISOString();
        activeTask.lastError = String(error?.message || error);
        changed = true;
        console.error('Partner task could not be completed', error);
      } finally {
        delete activeTask.completingAt;
      }
    }

    const beforeNormalize = JSON.stringify(tasks);
    normalizePartnerQueue(tasks);
    if (beforeNormalize !== JSON.stringify(tasks)) changed = true;
    if (changed) writePartnerTasks(resolvedCase, tasks);
    completed.forEach(task => window.dispatchEvent(new CustomEvent('emscodesim:partner-task-completed', { detail: { caseId: resolvedCase, task } })));
    schedulePartnerTasks(resolvedCase);
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
    active,
    sync,
    saveFinding,
    addTreatment,
    addReassessment,
    partnerTaskKey,
    readPartnerTasks,
    writePartnerTasks,
    assignPartnerTask,
    schedulePartnerTasks,
    resolvePartnerTasks,
    scenarioHome,
    SCENARIO_CATALOG
  };

  setTimeout(() => {
    try { sync(); resolvePartnerTasks(); } catch (error) { console.error('Scenario session sync failed', error); }
  }, 0);
  window.addEventListener('pageshow', () => {
    try { sync(undefined, { force: true }); resolvePartnerTasks(); } catch (error) { console.error('Scenario session restore failed', error); }
  });
})();
