(() => {
  'use strict';

  const api = window.EMSCodeSimPatientRecord;
  const session = window.EMSCodeSimScenarioSession;
  const runtime = window.EMSCodeSimScenarioRuntime;
  const registry = window.EMSCodeSimToolRegistry;
  const phases = window.EMSCodeSimScenarioPhases;
  const params = new URLSearchParams(location.search);
  const requestedId = params.get('case') || session?.requestedCaseId?.() || api?.active?.()?.scenarioId || 'asthma';

  const CASES = window.EMSCodeSimScenarioDefinitions?.PATIENT_CASES || {};


  const CONDITION_STAGES = window.EMSCodeSimScenarioDefinitions?.CONDITION_STAGES || {};


  const TREATMENT_PLANS = window.EMSCodeSimScenarioDefinitions?.TREATMENT_PLANS || {};

  const scenario = CASES[requestedId] || CASES.asthma;
  const id = CASES[requestedId] ? requestedId : 'asthma';
  const $ = value => document.getElementById(value);
  const MEASURABLE_TOOL_KEYS = new Set(['blood_pressure','pulse','respirations','spo2','blood_glucose','temperature']);
  const PRIMARY_KEYS = new Set(['scene_size_up','airway','breathing','perfusion']);
  let activeFocus = null;
  let findingFilter = 'all';
  let infoUpdates = [];
  let infoUpdateIndex = 0;
  let lastInfoSignature = '';
  let timerInterval = 0;
  let conditionInterval = 0;
  let scenarioStartMs = 0;
  const TRANSPORT_PLANS = {
    asthma: { impressions:['Acute asthma exacerbation','Respiratory distress with hypoxia','Impending respiratory failure'], priorities:['Routine transport','Prompt transport','Emergent transport / ALS intercept'], destinations:['Closest appropriate emergency department','Respiratory-capable emergency department'], bestPriority:'Prompt transport', bestDestination:'Closest appropriate emergency department' },
    stroke: { impressions:['Acute stroke syndrome','Hypoglycemia mimicking stroke','Nonspecific weakness'], priorities:['Routine transport','Emergent stroke transport','Remain on scene for complete exam'], destinations:['Stroke-capable center','Closest emergency department','Trauma center'], bestPriority:'Emergent stroke transport', bestDestination:'Stroke-capable center' },
    hypoglycemia: { impressions:['Symptomatic hypoglycemia','Acute stroke','Medication overdose'], priorities:['Routine transport after improvement','Prompt transport / ALS intercept','No transport needed'], destinations:['Closest appropriate emergency department','Stroke-capable center','Trauma center'], bestPriority:'Prompt transport / ALS intercept', bestDestination:'Closest appropriate emergency department' },
    trauma: { impressions:['Blunt multisystem trauma with shock','Isolated chest-wall pain','Minor collision without injury'], priorities:['Routine transport','Emergent trauma transport','Remain on scene for complete history'], destinations:['Trauma center','Closest emergency department','Stroke-capable center'], bestPriority:'Emergent trauma transport', bestDestination:'Trauma center' },
    pediatric: { impressions:['Pediatric respiratory distress','Simple febrile illness','Foreign-body airway obstruction'], priorities:['Routine transport','Prompt pediatric transport','Emergent transport / ALS intercept'], destinations:['Pediatric-capable emergency department','Closest appropriate emergency department'], bestPriority:'Prompt pediatric transport', bestDestination:'Pediatric-capable emergency department' }
  };

  let partnerInterval = 0;
  let conditionEvaluationActive = false;

  function ensureRecord() {
    const restored = session?.sync?.(id) || api?.active?.();
    if (restored && restored.scenarioId === id) return restored;
    const stored = api?.load?.(id);
    if (stored) return api.save(stored);
    return api?.create?.({
      id,
      title: scenario.title,
      patient: id === 'pediatric' ? '3-year-old child' : 'Adult patient',
      dispatch: runtime?.PROFILES?.[id]?.dispatch || scenario.title,
      scene: runtime?.PROFILES?.[id]?.scene || 'Active scene',
      goal: 'Assess, treat, reassess, and report'
    });
  }

  function record() { return session?.active?.(id) || api?.active?.(); }
  function trainingMode() { return params.get('training') || record()?.documentation?.trainingMode || 'learning'; }
  function assessmentMode() { return trainingMode() === 'assessment'; }
  function modeTag(label, className = 'optional') { return assessmentMode() ? '' : `<span class="requirement-tag ${className}">${escapeHtml(label)}</span>`; }
  function existing(key) { return Boolean(api?.hasFinding?.(key, record())); }
  function labelFor(key) { return api?.labelFor?.(key) || phases?.labelFor?.(key) || String(key).replace(/_/g, ' '); }
  function valueFor(key) { return runtime?.formatVital?.(key) || 'Obtained'; }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }
  function formatClock(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  }
  function elapsedLabel(value, startedAt) {
    const eventTime = new Date(value).getTime();
    const startTime = new Date(startedAt).getTime();
    if (!Number.isFinite(eventTime) || !Number.isFinite(startTime) || eventTime < startTime) return '00:00';
    const total = Math.floor((eventTime - startTime) / 1000);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
  function eventTypeLabel(event) {
    if (event.type === 'treatment') return 'Treatment';
    if (event.type === 'reassessment') return 'Reassessment';
    if (event.category === 'vital') return 'Vital';
    if (event.category === 'history') return 'History';
    if (event.type === 'impression') return 'Impression';
    if (event.type === 'documentation') return 'Report';
    return 'Assessment';
  }

  function toast(message) {
    $('toast').textContent = message;
    $('toast').hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { $('toast').hidden = true; }, 2800);
  }

  function setPatientImage(image, path) {
    if (!image) return;
    image.onerror = () => {
      image.onerror = null;
      image.src = id === 'pediatric' ? '/vitals/assets/scenario-patient-pediatric-v3.png' : '/vitals/assets/scenario-patient-adult-v3.png';
      image.classList.add('image-fallback');
    };
    image.src = path;
    image.hidden = false;
  }

  function saveFinding(key, value, source = 'assessment', meta = {}) {
    const normality = runtime?.classifyFinding?.(key, value) || '';
    const payload = { source, normality, status: normality === 'normal' ? 'normal' : normality === 'not-normal' ? 'abnormal' : '', ...meta };
    try {
      if (session?.saveFinding) session.saveFinding(key, value, payload);
      else api?.setFinding?.(key, value, payload);
      refreshFromRecord();
      toast(`${labelFor(key)} recorded`);
    } catch (error) {
      console.error(error);
      toast('Finding was not saved. Try again before leaving this screen.');
    }
  }

  function toolUrl(url, returnLabel = 'Patient', context = '') {
    return registry?.buildUrl?.(url, {
      caseId: id,
      returnTo: `/vitals/visual-patient.html?case=${encodeURIComponent(id)}&training=${encodeURIComponent(trainingMode())}`,
      training: trainingMode(),
      returnLabel,
      context
    }) || url;
  }

  function classificationLabel(key) {
    if (assessmentMode()) return 'Available';
    const value = phases?.classification?.(id, key) || (scenario.recommended.includes(key) ? 'appropriate' : 'optional');
    return {
      required: 'Required',
      appropriate: 'Clinically appropriate',
      optional: 'Optional',
      'not-indicated': 'Not indicated now'
    }[value] || 'Optional';
  }

  function classificationClass(key) {
    return phases?.classification?.(id, key) || (scenario.recommended.includes(key) ? 'appropriate' : 'optional');
  }

  function partnerTaskFor(key) { return session?.readPartnerTasks?.(id)?.[key] || null; }
  function secondsRemaining(task) { return Math.max(0, Math.ceil((new Date(task?.dueAt).getTime() - Date.now()) / 1000)); }

  function renderVitalTool(tool) {
    const complete = existing(tool.key);
    const task = partnerTaskFor(tool.key);
    const pending = task?.status === 'pending' && !complete;
    const queued = task?.status === 'queued' && !complete;
    const article = document.createElement('article');
    article.className = `tool ${classificationClass(tool.key)}${complete ? ' done' : ''}`;
    article.dataset.toolKey = tool.key;
    article.innerHTML = `
      <div class="tool-head"><div>${modeTag(classificationLabel(tool.key), classificationClass(tool.key))}<h3>${escapeHtml(tool.label)}</h3><p>${escapeHtml(tool.description)}</p></div>
      <span class="status-chip ${complete ? 'done' : pending || queued ? 'pending' : ''}">${complete ? 'Obtained' : pending ? 'Partner working' : queued ? 'Waiting for partner' : 'Not taken'}</span></div>
      <div class="tool-actions"><a href="${toolUrl(tool.url)}">Perform</a>
      <button class="partner-action" type="button" ${complete || pending || queued ? 'disabled' : ''}>${complete ? 'Complete' : pending ? 'In progress' : queued ? 'Queued' : 'Assign to partner'}</button></div>
      <div class="assignment-progress" ${pending || queued ? '' : 'hidden'}>${pending ? `Partner gathering ${escapeHtml(tool.label.toLowerCase())}… ${secondsRemaining(task)}s` : queued ? `Queued — partner will start after the current skill.` : ''}</div>`;
    const button = article.querySelector('.partner-action');
    button?.addEventListener('click', () => {
      try {
        session?.assignPartnerTask?.({ key: tool.key, label: tool.label, value: valueFor(tool.key), delaySeconds: tool.delay || 12 }, id);
        buildVitals();
        toast(`${tool.label} assigned to partner`);
      } catch (error) {
        console.error(error);
        toast('Partner task could not be assigned.');
      }
    });
    return article;
  }

  function appendToolGroup(host, title, copy, tools, className = '') {
    if (!tools.length) return;
    const heading = document.createElement('div');
    heading.className = `tool-group-heading ${className}`;
    heading.innerHTML = `<h3>${escapeHtml(title)}</h3>${copy ? `<p>${escapeHtml(copy)}</p>` : ''}`;
    host.appendChild(heading);
    tools.forEach(tool => host.appendChild(renderVitalTool(tool)));
  }

  function buildVitals() {
    const box = $('vitalTools');
    box.innerHTML = '';
    const tools = (registry?.vitalTools || []).filter(tool => MEASURABLE_TOOL_KEYS.has(tool.key));
    if (assessmentMode()) {
      appendToolGroup(box, 'Patient tools', 'Choose the measurements you believe are appropriate. Results and decisions are reviewed during debrief.', tools, 'assessment-mode');
      return;
    }
    const relevant = tools.filter(tool => ['required','appropriate'].includes(classificationClass(tool.key)));
    const more = tools.filter(tool => !relevant.includes(tool));
    appendToolGroup(box, 'Relevant for this patient', 'Required and clinically appropriate measurable tools appear first.', relevant, 'relevant');
    if (more.length) {
      const details = document.createElement('details');
      details.className = 'more-tools';
      details.innerHTML = '<summary>More tools <span>Optional or not currently indicated</span></summary><div class="more-tools-grid"></div>';
      const grid = details.querySelector('.more-tools-grid');
      more.forEach(tool => grid.appendChild(renderVitalTool(tool)));
      box.appendChild(details);
    }
  }

  function openFocus(title, instruction, finding, key) {
    activeFocus = { title, instruction, finding, key };
    $('focusTitle').textContent = title;
    $('focusInstruction').textContent = instruction;
    setPatientImage($('focusImage'), scenario.image);
    $('recordFocus').disabled = true;
    $('recordFocus').textContent = 'Observe patient…';
    $('focusTimer').innerHTML = '';
    void $('focusTimer').offsetWidth;
    $('assessmentFocus').hidden = false;
    setTimeout(() => {
      if (!activeFocus) return;
      $('recordFocus').disabled = false;
      $('recordFocus').textContent = 'Record observed finding';
    }, 4000);
  }

  function registryTool(key) {
    return [...(registry?.assessmentTools || []), ...(registry?.vitalTools || [])].find(tool => tool.key === key);
  }

  function eventTime(value) {
    const time = new Date(value || 0).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function conditionState(current = record()) {
    return current?.documentation?.conditionEngine || { stageIds: [], pendingTargets: [], lastCheckpoint: '', imageMode: scenario.imageMode || '', updatedAt: current?.startedAt || new Date().toISOString() };
  }

  function effectiveTreatmentIds(current = record()) {
    return new Set((current?.treatments || []).filter(item => item.classification === 'appropriate-effective' || !item.classification).map(item => item.actionId).filter(Boolean));
  }

  function evaluatePatientCondition(checkpoint = 'patient-home') {
    if (conditionEvaluationActive) return false;
    const current = record();
    if (!current?.startedAt) return false;
    const stages = CONDITION_STAGES[id] || [];
    if (!stages.length) return false;
    const state = conditionState(current);
    const completed = new Set(state.stageIds || []);
    const treatments = effectiveTreatmentIds(current);
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(current.startedAt).getTime()) / 1000));
    const stage = stages.find(item => !completed.has(item.id) && elapsed >= item.after);
    if (!stage) return false;
    const protectedByCare = (stage.blockedBy || []).some(actionId => treatments.has(actionId));
    conditionEvaluationActive = true;
    try {
      const recordedAt = new Date().toISOString();
      const nextStageIds = [...completed, stage.id];
      const pendingTargets = protectedByCare ? (state.pendingTargets || []) : [...new Set([...(state.pendingTargets || []), ...(stage.targets || [])])];
      api?.update?.(draft => {
        draft.documentation = draft.documentation || {};
        draft.documentation.conditionEngine = {
          ...state,
          stageIds: nextStageIds,
          pendingTargets,
          lastCheckpoint: checkpoint,
          imageMode: protectedByCare ? (state.imageMode || scenario.imageMode || '') : (stage.imageMode || state.imageMode || scenario.imageMode || ''),
          updatedAt: recordedAt
        };
        return draft;
      });
      if (!protectedByCare) {
        api?.mergeCareLog?.([{
          id:`condition-${id}-${stage.id}`,
          eventId:`condition-${id}-${stage.id}`,
          type:'condition_change', category:'assessment', key:'patient_condition', label:stage.title,
          value:stage.text, details:`Triggered at ${checkpoint}. Reassessment due: ${(stage.targets || []).map(labelFor).join(', ')}.`,
          status:'abnormal', normality:'not-normal', source:'dynamic-condition-engine', recordedAt
        }]);
      }
      return !protectedByCare;
    } finally {
      conditionEvaluationActive = false;
    }
  }

  function treatmentTargets(item = {}) {
    const explicit = Array.isArray(item.targetKeys) ? item.targetKeys : [];
    if (explicit.length) return explicit;
    if (item.assessment) return [item.assessment];
    if (item.context && item.context !== 'general') return [item.context];
    return [];
  }

  function latestTreatmentFor(key) {
    const current = record();
    const treatments = (current?.treatments || [])
      .filter(item => treatmentTargets(item).includes(key));
    const condition = conditionState(current);
    const latestReassessmentTime = Math.max(0, ...(current?.reassessments || [])
      .filter(item => (Array.isArray(item.targetKeys) && item.targetKeys.includes(key)) || item.assessment === key || item.context === key)
      .map(item => eventTime(item.recordedAt || item.time)));
    if ((condition.pendingTargets || []).includes(key) && eventTime(condition.updatedAt) > latestReassessmentTime) treatments.push({
      actionId:'condition-change', treatment:'Patient condition changed', targetKeys:condition.pendingTargets, recordedAt:condition.updatedAt, time:condition.updatedAt, source:'dynamic-condition-engine'
    });
    return treatments.sort((a, b) => eventTime(b.recordedAt || b.time) - eventTime(a.recordedAt || a.time))[0] || null;
  }

  function latestReassessmentFor(key) {
    return (record()?.reassessments || [])
      .filter(item => (Array.isArray(item.targetKeys) && item.targetKeys.includes(key)) || item.assessment === key || item.context === key)
      .sort((a, b) => eventTime(b.recordedAt || b.time) - eventTime(a.recordedAt || a.time))[0] || null;
  }

  function assessmentState(key) {
    const finding = api?.getFinding?.(key, record());
    const treatment = latestTreatmentFor(key);
    const reassessment = latestReassessmentFor(key);
    const treatedAt = eventTime(treatment?.recordedAt || treatment?.time);
    const reassessedAt = eventTime(reassessment?.recordedAt || reassessment?.time);
    if (treatment && treatedAt > reassessedAt) return { code: 'reassessment-due', label: 'Reassessment due', finding, treatment, reassessment };
    if (reassessment && reassessedAt >= treatedAt) {
      const comparison = reassessment.comparison || (/wors/i.test(reassessment.description || '') ? 'worsened' : /unchang/i.test(reassessment.description || '') ? 'unchanged' : 'improved');
      return { code: comparison, label: comparison.charAt(0).toUpperCase() + comparison.slice(1), finding, treatment, reassessment };
    }
    if (!finding) return { code: 'not-assessed', label: 'Not assessed', finding: null, treatment: null, reassessment: null };
    if (finding.status === 'abnormal' || finding.normality === 'not-normal') return { code: 'abnormal', label: 'Abnormal', finding, treatment, reassessment };
    return { code: 'normal', label: 'Normal', finding, treatment, reassessment };
  }

  function assessmentHref(tool, key) {
    const state = assessmentState(key);
    const base = toolUrl(tool?.url || `/vitals/${key}-assessment.html`, 'Patient', key);
    if (state.code !== 'reassessment-due') return base;
    const url = new URL(base, location.origin);
    url.searchParams.set('reassess', '1');
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function assessmentStatusText(tool, state) {
    if (state.code === 'reassessment-due') return 'Treatment performed — repeat this assessment now.';
    if (['improved','unchanged','worsened'].includes(state.code)) {
      return state.reassessment?.finding || state.reassessment?.response || state.finding?.value || state.finding?.finding || `${state.label} on reassessment.`;
    }
    if (state.finding) return state.finding.value || state.finding.finding || 'Assessment recorded.';
    return tool.description || 'Not yet assessed.';
  }

  function renderAssessmentRow(tool) {
    const state = assessmentState(tool.key);
    const kind = classificationClass(tool.key);
    const complete = state.code !== 'not-assessed';
    const actionLabel = state.code === 'reassessment-due' ? 'Reassess' : complete ? 'Review' : 'Assess';
    const row = document.createElement('div');
    row.className = `primary-assessment-row assessment-tool-row ${kind} state-${state.code}`;
    row.innerHTML = `
      <div>
        <span>${escapeHtml(tool.label)} <em class="clinical-state ${state.code}">${escapeHtml(state.label)}</em></span>
        <strong>${escapeHtml(assessmentStatusText(tool, state))}</strong>
        ${assessmentMode() ? '' : `<small class="assessment-row-requirement ${kind}">${escapeHtml(classificationLabel(tool.key))}</small>`}
      </div>
      <a href="${assessmentHref(tool, tool.key)}">${escapeHtml(actionLabel)}</a>`;
    return row;
  }

  function buildAssessmentGroup(title, copy, tools, options = {}) {
    const article = document.createElement('article');
    const completed = tools.filter(tool => assessmentState(tool.key).code !== 'not-assessed').length;
    article.className = `assessment-card unified-primary-card unified-assessment-group${completed === tools.length && tools.length ? ' complete' : ''}`;
    article.innerHTML = `
      <div class="primary-card-heading">
        <div>${modeTag(options.tag || 'Patient relevant', options.tagClass || 'appropriate')}<h3>${escapeHtml(title)}</h3></div>
        <span class="status-chip ${completed === tools.length && tools.length ? 'done' : ''}">${completed} of ${tools.length} assessed</span>
      </div>
      <p class="primary-assessment-copy">${escapeHtml(copy)}</p>
      <div class="primary-assessment-table" role="table" aria-label="${escapeHtml(title)} status and actions">
        <div class="primary-assessment-header" role="row"><span>Area</span><span>Current status</span><span>Action</span></div>
      </div>`;
    const table = article.querySelector('.primary-assessment-table');
    tools.forEach(tool => table.appendChild(renderAssessmentRow(tool)));
    return article;
  }

  function buildSceneSizeUpCard(box) {
    const complete = existing('scene_size_up');
    const article = document.createElement('article');
    article.className = `assessment-card sequence-card scene-size-card${complete ? ' complete' : ''}`;
    article.innerHTML = `
      <span class="sequence-number">1</span>
      <div class="sequence-card-body">
        ${modeTag('Required', 'required')}
        <h3>Scene size-up and first impression</h3>
        <p>Use the dispatch and first patient picture to establish safety, patient count, NOI/MOI, resources, general impression, responsiveness, and priority.</p>
        <div class="tool-actions"><button class="primary-action scene-guide-card-button" type="button">${complete ? 'Review scene size-up' : 'Begin scene size-up'}</button>
        <span class="status-chip ${complete ? 'done' : ''}">${complete ? 'Recorded' : 'Not started'}</span></div>
      </div>`;
    article.querySelector('button').addEventListener('click', () => {
      closeSheet();
      window.requestAnimationFrame(() => {
        const opened = window.EMSCodeSimSceneGuide?.start?.(complete);
        if (opened === false || !window.EMSCodeSimSceneGuide?.start) {
          const guide = document.getElementById('sceneGuide');
          if (guide) {
            guide.hidden = false;
            guide.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          showToast('Scene size-up opened. Refresh the page if the questions do not appear.');
        }
      });
    });
    box.appendChild(article);
  }

  function primaryStatus(key) {
    const state = assessmentState(key);
    if (state.code === 'reassessment-due') return `Treatment performed — ${state.label}`;
    if (['improved','unchanged','worsened'].includes(state.code)) return `${state.label}: ${state.finding?.value || state.finding?.finding || 'Reassessment recorded'}`;
    if (state.finding) return state.finding.value || state.finding.finding || 'Assessment recorded';
    return assessmentMode() ? 'Not assessed' : (scenario.primary[key]?.initial || 'Unknown');
  }

  function primaryToolLink(key) {
    const tool = registryTool(key);
    const config = scenario.primary[key] || {};
    const state = assessmentState(key);
    return {
      href: assessmentHref(tool, key),
      label: state.code === 'reassessment-due' ? 'Reassess' : state.code !== 'not-assessed' ? 'Review' : (config.action || 'Assess'),
      urgent: Boolean(config.urgent) || state.code === 'reassessment-due',
      state
    };
  }

  function buildPrimaryAssessmentCard(box) {
    const completed = ['airway','breathing','perfusion'].filter(existing).length;
    const treatments = record()?.treatments || [];
    const article = document.createElement('article');
    article.className = `assessment-card sequence-card unified-primary-card${completed === 3 ? ' complete' : ''}`;
    const rows = [
      ['airway','Airway'],
      ['breathing','Breathing'],
      ['perfusion','Circulation']
    ].map(([key, label]) => {
      const action = primaryToolLink(key);
      return `<div class="primary-assessment-row ${action.urgent && action.state.code === 'not-assessed' ? 'urgent' : ''} state-${action.state.code}">
        <div><span>${label} <em class="clinical-state ${action.state.code}">${escapeHtml(action.state.label)}</em></span><strong>${escapeHtml(primaryStatus(key))}</strong></div>
        <a href="${action.href}">${escapeHtml(action.label)}</a>
      </div>`;
    }).join('');
    const threatStatus = treatments.length ? `${treatments.length} treatment${treatments.length === 1 ? '' : 's'} recorded` : 'Not yet addressed';
    article.innerHTML = `
      <span class="sequence-number">2</span>
      <div class="sequence-card-body">
        <div class="primary-card-heading"><div>${modeTag('Required', 'required')}<h3>Primary Assessment</h3></div><span class="status-chip ${completed === 3 ? 'done' : ''}">${completed} of 3 assessed</span></div>
        <p>Make the rapid life-threat decision here, then open only the area that needs closer assessment. There is no separate Rapid ABC step.</p>
        <div class="primary-assessment-table" role="table" aria-label="Primary assessment status and actions">
          <div class="primary-assessment-header" role="row"><span>Area</span><span>Current status</span><span>Action</span></div>
          ${rows}
          <div class="primary-assessment-row immediate-threats">
            <div><span>Immediate threats</span><strong>${escapeHtml(threatStatus)}</strong></div>
            <a href="${toolUrl('/vitals/treatment-reassessment.html', 'Patient', 'general')}">${treatments.length ? 'Review care' : 'Treat'}</a>
          </div>
        </div>
      </div>`;
    box.appendChild(article);
  }

  function buildAssessments() {
    const box = $('assessmentTools');
    box.innerHTML = '';
    buildSceneSizeUpCard(box);
    buildPrimaryAssessmentCard(box);

    const focused = (registry?.assessmentTools || []).filter(tool => !PRIMARY_KEYS.has(tool.key));
    if (assessmentMode()) {
      box.appendChild(buildAssessmentGroup(
        'Assessment and history options',
        'Select assessments from your clinical judgment. Relevance and missed opportunities are reviewed during debrief.',
        focused,
        { tag: '', tagClass: 'optional' }
      ));
      return;
    }
    const relevant = focused.filter(tool => ['required','appropriate'].includes(classificationClass(tool.key)));
    const more = focused.filter(tool => !relevant.includes(tool));

    if (relevant.length) {
      box.appendChild(buildAssessmentGroup(
        'Relevant assessment and history',
        'These assessments fit the current presentation. Each row uses the same status-and-action design as Primary Assessment.',
        relevant,
        { tag: 'Patient relevant', tagClass: 'appropriate' }
      ));
    }

    if (more.length) {
      const details = document.createElement('details');
      details.className = 'more-assessments';
      details.innerHTML = '<summary>More assessments <span>Optional or not indicated by the current presentation</span></summary><div class="more-assessment-list"></div>';
      const list = details.querySelector('.more-assessment-list');
      more.sort((a, b) => classificationClass(a.key).localeCompare(classificationClass(b.key)) || a.label.localeCompare(b.label));
      list.appendChild(buildAssessmentGroup(
        'Additional Assessment Tools',
        'Use these only when the patient presentation, mechanism, history, or new findings make them clinically useful.',
        more,
        { tag: 'Additional tools', tagClass: 'optional' }
      ));
      box.appendChild(details);
    }
  }

  function treatmentEvidence(plan, current = record()) {
    const findings = current?.findings || {};
    const present = (plan.evidence || []).filter(key => findings[key]);
    const abnormal = present.filter(key => {
      const finding = findings[key] || {};
      return finding.status === 'abnormal' || finding.normality === 'not-normal';
    });
    const text = present.map(key => `${findings[key]?.value || ''} ${findings[key]?.finding || ''}`).join(' ');
    return { present, abnormal, text };
  }

  function treatmentDecision(plan, current = record()) {
    const evidence = treatmentEvidence(plan, current);
    if (typeof plan.contraindication === 'function' && plan.contraindication(current)) {
      return { code:'contraindicated', label:'Contraindicated', detail:'Current findings make this treatment unsafe.' };
    }
    if (plan.requireText && !plan.requireText.test(evidence.text)) {
      if (!evidence.present.length) return { code:'assessment-needed', label:'Assessment needed', detail:'Obtain the supporting assessment before choosing this intervention.' };
      return { code:'not-indicated', label:'Not indicated', detail:'The current finding does not support this intervention.' };
    }
    if (evidence.abnormal.length) return { code:'indicated', label:'Indicated', detail:`Supported by ${evidence.abnormal.map(labelFor).join(', ')}.` };
    if (!evidence.present.length) return { code:'assessment-needed', label:'Assessment needed', detail:'Obtain the supporting assessment before choosing this intervention.' };
    return { code:'not-indicated', label:'Not indicated', detail:'Available findings are normal or do not support this treatment.' };
  }

  function treatmentAlreadyRecorded(plan) {
    return (record()?.treatments || []).some(item => item.actionId === plan.id);
  }

  function recordTreatment(plan) {
    const current = record();
    const decision = treatmentDecision(plan, current);
    const startedAt = new Date(current?.startedAt || Date.now()).getTime();
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    let classification = 'appropriate-effective';
    let response = plan.response;
    if (decision.code === 'contraindicated') {
      classification = 'contraindicated';
      response = 'The intervention is unsafe for the current patient condition and does not improve the patient.';
    } else if (decision.code === 'assessment-needed') {
      classification = 'premature';
      response = 'The intervention was selected before the indication was established. Obtain the missing assessment and reevaluate.';
    } else if (decision.code === 'not-indicated') {
      classification = 'unnecessary';
      response = 'The intervention does not address a current abnormal finding and produces no meaningful improvement.';
    }
    const treatment = {
      actionId: plan.id,
      treatment: plan.label,
      name: plan.label,
      description: plan.label,
      label: 'Treatment performed',
      source: 'scenario-aware-treatment',
      classification,
      indicationStatus: decision.code,
      indication: decision.detail,
      targetKeys: plan.targets || [],
      reassessmentRequired: classification === 'appropriate-effective',
      patientResponse: response,
      elapsedSeconds,
      elapsedLabel: `${String(Math.floor(elapsedSeconds / 60)).padStart(2,'0')}:${String(elapsedSeconds % 60).padStart(2,'0')}`
    };
    if (session?.addTreatment) session.addTreatment(treatment);
    else api?.addTreatment?.(treatment);
    api?.mergeCareLog?.([{
      type:'patient_response', category:'treatment', key:plan.targets?.[0] || 'treatment',
      label: classification === 'appropriate-effective' ? 'Patient response' : 'Treatment consequence',
      value: response,
      details: classification === 'appropriate-effective' ? `Targeted reassessment is due: ${(plan.targets || []).map(labelFor).join(', ')}.` : decision.detail,
      source:'scenario-aware-treatment', recordedAt:new Date(Date.now() + 1).toISOString()
    }]);
    refreshFromRecord();
    toast(classification === 'appropriate-effective' ? `${plan.label} recorded — reassessment due` : `${plan.label} recorded — ${classification.replace('-', ' ')}`);
  }

  function renderTreatmentCard(plan) {
    const decision = treatmentDecision(plan);
    const recorded = treatmentAlreadyRecorded(plan);
    const article = document.createElement('article');
    article.className = `treatment-card treatment-decision-card${assessmentMode() ? ' assessment-mode' : ` state-${decision.code}`}${recorded ? ' complete' : ''}`;
    const decisionTag = assessmentMode() ? '' : `<span class="requirement-tag ${decision.code === 'indicated' ? 'appropriate' : decision.code === 'contraindicated' ? 'not-indicated' : 'optional'}">${escapeHtml(decision.label)}</span>`;
    const decisionStatus = recorded ? 'Recorded' : assessmentMode() ? 'Available' : decision.label;
    const clinicalCheck = assessmentMode() ? '' : `<div class="treatment-indication"><strong>Clinical check:</strong> ${escapeHtml(decision.detail)}</div>`;
    article.innerHTML = `
      <div class="treatment-card-heading">
        <div>${decisionTag}<h3>${escapeHtml(plan.label)}</h3></div>
        <span class="status-chip ${recorded ? 'done' : ''}">${decisionStatus}</span>
      </div>
      <p>${escapeHtml(plan.summary)}</p>
      ${clinicalCheck}
      <div class="treatment-targets"><strong>Reassess after treatment:</strong> ${escapeHtml((plan.targets || []).map(labelFor).join(', ') || 'Patient condition')}</div>
      <button class="primary-action treatment-apply" type="button" ${recorded ? 'disabled' : ''}>${recorded ? 'Treatment recorded' : 'Perform treatment'}</button>`;
    article.querySelector('.treatment-apply')?.addEventListener('click', () => {
      const warning = assessmentMode() ? `Perform ${plan.label}? This decision will be reviewed during debrief.` : decision.code === 'indicated' ? `Perform ${plan.label}?` : `${decision.label}: ${decision.detail}

Record this decision and its consequence?`;
      if (!window.confirm(warning)) return;
      recordTreatment(plan);
    });
    return article;
  }

  function buildTreatments() {
    const box = $('treatmentTools');
    box.innerHTML = '';
    const plans = TREATMENT_PLANS[id] || [];
    const intro = document.createElement('div');
    intro.className = 'treatment-guidance';
    if (assessmentMode()) {
      intro.innerHTML = `<strong>Choose care from your findings.</strong><span>Treatment indications and decision feedback remain hidden until the final debrief.</span>`;
      box.appendChild(intro);
      plans.forEach(plan => box.appendChild(renderTreatmentCard(plan)));
    } else {
      const indicated = plans.filter(plan => treatmentDecision(plan).code === 'indicated');
      const others = plans.filter(plan => !indicated.includes(plan));
      intro.innerHTML = `<strong>Treat findings, not the scenario title.</strong><span>Options supported by abnormal findings appear first. Every decision is timed, logged, and linked to targeted reassessment.</span>`;
      box.appendChild(intro);
      indicated.forEach(plan => box.appendChild(renderTreatmentCard(plan)));
      if (others.length) {
        const details = document.createElement('details');
        details.className = 'more-treatments';
        details.open = indicated.length === 0;
        details.innerHTML = '<summary>Other treatment options <span>Assessment needed, not indicated, or contraindicated</span></summary><div class="more-treatment-list"></div>';
        const list = details.querySelector('.more-treatment-list');
        others.forEach(plan => list.appendChild(renderTreatmentCard(plan)));
        box.appendChild(details);
      }
    }
    const full = document.createElement('article');
    full.className = 'treatment-card full-treatment-menu';
    full.innerHTML = `${modeTag('Protocol-dependent options', 'optional')}<h3>Complete treatment and reassessment tool</h3><p>Use this when the needed intervention is not represented above or when advanced decision practice is required.</p><a class="primary-action" href="${toolUrl('/vitals/treatment-reassessment.html', 'Patient', 'general')}">Open complete treatment tool</a>`;
    box.appendChild(full);
  }

  function infoElapsed(value, startedAt) { return elapsedLabel(value, startedAt); }
  function abnormalEvent(event) {
    return event.status === 'abnormal' || event.normality === 'not-normal' || /critical|severe|inadequate|absent|low|high|hypox|shock|unresponsive|weak|labored|wheeze|slurred|drift|diaphoretic|pale/i.test(`${event.value || ''} ${event.details || ''}`);
  }
  function significantHistory(event) {
    return /last known well|anticoagul|allerg|anaphyl|insulin|diabet|overdose|naloxone|seizure|mechanism|blood thinner|pregnan|medication/i.test(`${event.value || ''} ${event.details || ''}`);
  }
  function isInformationUpdate(event) {
    if (event.source === 'partner-assignment') return true;
    if (event.type === 'treatment' || event.type === 'reassessment' || event.type === 'patient_response' || event.type === 'condition_change') return true;
    if (event.type === 'impression' || event.type === 'documentation') return true;
    if (abnormalEvent(event)) return true;
    if (event.category === 'history' && significantHistory(event)) return true;
    return false;
  }
  function updateFromCareEvent(event) {
    const isAbnormal = abnormalEvent(event);
    if (event.source === 'partner-assignment') return { id: event.id || event.eventId, type: 'PARTNER UPDATE', title: `${event.label || labelFor(event.key)} obtained`, text: event.value || 'Partner task complete.', kind: 'partner', recordedAt: event.recordedAt };
    if (event.type === 'treatment') return { id: event.id || event.eventId, type: 'TREATMENT', title: event.label || 'Treatment performed', text: event.value || event.details || 'Treatment was recorded.', kind: 'treatment', recordedAt: event.recordedAt };
    if (event.type === 'reassessment') return { id: event.id || event.eventId, type: 'REASSESSMENT', title: event.label || 'Patient reassessed', text: event.value || event.details || 'The patient condition was reassessed.', kind: 'reassessment', recordedAt: event.recordedAt };
    if (event.type === 'condition_change') return { id: event.id || event.eventId, type: 'PATIENT CONDITION CHANGE', title: event.label || 'Patient condition changed', text: event.value || event.details || 'The patient condition changed.', kind: 'alert', recordedAt: event.recordedAt };
    if (event.type === 'patient_response') return { id: event.id || event.eventId, type: 'PATIENT RESPONSE', title: event.label || 'Response to treatment', text: event.value || event.details || 'The patient responded to treatment.', kind: 'reassessment', recordedAt: event.recordedAt };
    if (event.category === 'history') return { id: event.id || event.eventId, type: 'HISTORY ALERT', title: event.label || 'Important history', text: event.value || event.details || 'Relevant history was obtained.', kind: 'history', recordedAt: event.recordedAt };
    if (event.type === 'impression' || event.type === 'documentation') return { id: event.id || event.eventId, type: 'TRANSPORT / REPORT', title: event.label || 'Care plan updated', text: event.value || event.details || 'The care plan was updated.', kind: 'transport', recordedAt: event.recordedAt };
    return { id: event.id || event.eventId, type: isAbnormal ? 'CONDITION ALERT' : 'PATIENT UPDATE', title: event.label || labelFor(event.key), text: event.value || event.details || 'New patient information was obtained.', kind: isAbnormal ? 'alert' : 'assessment', recordedAt: event.recordedAt };
  }
  function buildInfoUpdates(current) {
    const startedAt = current?.startedAt || new Date().toISOString();
    const updates = [
      { id: 'dispatch', type: 'DISPATCH', title: 'Dispatch information', text: current?.dispatch || scenario.title, kind: 'dispatch', recordedAt: startedAt },
      { id: 'visible', type: 'VISIBLE CONDITION', title: 'First patient view', text: scenario.visible, kind: 'visible', recordedAt: new Date(new Date(startedAt).getTime() + 1).toISOString() }
    ];
    const log = api?.listCareLog?.(current, 'all') || [];
    log.filter(isInformationUpdate).forEach(event => updates.push(updateFromCareEvent(event)));
    return updates;
  }
  function renderInfoUpdate(forceLatest = false) {
    const current = record() || {};
    const nextUpdates = buildInfoUpdates(current);
    const signature = nextUpdates.map(item => `${item.id}:${item.text}`).join('|');
    const changed = signature !== lastInfoSignature;
    infoUpdates = nextUpdates;
    if (forceLatest || changed) infoUpdateIndex = Math.max(0, infoUpdates.length - 1);
    infoUpdateIndex = Math.max(0, Math.min(infoUpdateIndex, infoUpdates.length - 1));
    lastInfoSignature = signature;
    const item = infoUpdates[infoUpdateIndex];
    if (!item || !$('infoUpdateWindow')) return;
    $('infoUpdateWindow').className = `info-update-window info-${item.kind || 'assessment'}${$('infoUpdateWindow').dataset.collapsed === 'true' ? ' is-collapsed' : ''}`;
    $('infoUpdateType').textContent = item.type;
    $('infoUpdateTitle').textContent = item.title;
    $('infoUpdateText').textContent = item.text;
    $('infoUpdateTime').textContent = infoElapsed(item.recordedAt, current.startedAt);
    $('infoUpdateCount').textContent = `${infoUpdateIndex + 1} of ${infoUpdates.length}`;
    $('infoUpdatePrevious').disabled = infoUpdateIndex <= 0;
    $('infoUpdateNext').disabled = infoUpdateIndex >= infoUpdates.length - 1;
  }

  function renderFindings() {
    const list = $('findingList');
    const current = record() || {};
    const filterMap = { vitals: 'vital', treatments: 'treatment', assessments: 'assessment', history: 'history', reassessments: 'reassessment' };
    let events = api?.listCareLog?.(current, 'all') || [];
    if (findingFilter === 'reassessments') events = events.filter(event => event.type === 'reassessment');
    else if (findingFilter !== 'all') events = events.filter(event => event.category === filterMap[findingFilter]);
    document.querySelectorAll('[data-log-filter]').forEach(button => button.classList.toggle('active', button.dataset.logFilter === findingFilter));
    const activeFilter = document.querySelector(`[data-log-filter="${findingFilter}"]`)?.dataset.label || 'All log';
    $('findingFilterSummary').textContent = `${events.length} ${activeFilter.toLowerCase()} entr${events.length === 1 ? 'y' : 'ies'} shown.`;
    list.innerHTML = '';
    if (!events.length) {
      list.innerHTML = '<li class="empty">No matching patient-care events have been recorded.</li>';
      return;
    }
    events.forEach((event, index) => {
      const item = document.createElement('li');
      item.className = `care-log-item ${event.category || 'assessment'} ${event.type || 'finding'}`;
      item.innerHTML = `
        <div class="care-log-order"><b>${index + 1}</b><span>${escapeHtml(elapsedLabel(event.recordedAt, current.startedAt))}</span></div>
        <div class="care-log-content">
          <div class="care-log-heading"><span class="care-log-type">${eventTypeLabel(event)}</span><time datetime="${escapeHtml(event.recordedAt)}">${escapeHtml(formatClock(event.recordedAt))}</time></div>
          <strong>${escapeHtml(event.label || labelFor(event.key))}</strong>
          <p>${escapeHtml(event.value || 'Recorded')}</p>
          ${event.details ? `<small>${escapeHtml(event.details)}</small>` : ''}
        </div>`;
      list.appendChild(item);
    });
  }

  function updateCounts() {
    const current = record() || {};
    const log = api?.listCareLog?.(current, 'all') || [];
    if ($('findingBadge')) {
      $('findingBadge').hidden = !log.length;
      $('findingBadge').textContent = String(log.length);
    }
  }

  function renderSceneClues() {
    const layer = $('sceneClueLayer');
    if (!layer) return;
    document.querySelector('.patient-stage')?.setAttribute('data-scene-mode', scenario.imageMode || id);
    layer.innerHTML = scenario.sceneClues.map((clue, index) => `<span class="scene-clue clue-${index + 1}">${escapeHtml(clue)}</span>`).join('');
  }

  function transportPlan() { return TRANSPORT_PLANS[id] || TRANSPORT_PLANS.asthma; }
  function selectOptions(values, selected, placeholder) {
    return `<option value="">${escapeHtml(placeholder)}</option>${values.map(value => `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}`;
  }
  function saveTransportDecision() {
    const impression = $('transportImpression')?.value || '';
    const priority = $('transportPriority')?.value || '';
    const destination = $('transportDestination')?.value || '';
    const rationale = ($('transportRationale')?.value || '').trim();
    if (!impression || !priority || !destination) { toast('Choose an impression, transport priority, and destination'); return; }
    api?.setImpressions?.({ primary: impression, action: priority, source: 'transport-decision', updatedAt: new Date().toISOString() });
    api?.setDocumentation?.({ transportPriority: priority, destination, transportRationale: rationale, transportDecisionAt: new Date().toISOString() });
    api?.setFinding?.('transport_decision', `${priority} to ${destination}`, { label: 'Transport decision', source: 'transport-decision', details: rationale || `Working impression: ${impression}` });
    const plan = transportPlan();
    const feedback = priority === plan.bestPriority && destination === plan.bestDestination
      ? 'Transport plan matches this patient’s current presentation.'
      : 'Transport plan recorded. The final debrief will compare it with the patient’s presentation and timing.';
    toast('Transport decision saved');
    const box = $('transportDecisionFeedback'); if (box) { box.hidden = assessmentMode(); box.textContent = assessmentMode() ? '' : feedback; }
    renderTransport(); renderProgress(); renderInfoUpdate(true);
  }
  function handoffText(current = record() || {}) {
    const findings = current.findings || {};
    const age = current.patient || (id === 'pediatric' ? '3-year-old child' : 'Adult patient');
    const impression = current.impressions?.primary || 'working impression not yet selected';
    const initialVitals = ['blood_pressure','pulse','respirations','spo2','blood_glucose','temperature'].filter(key => findings[key]).map(key => `${labelFor(key)} ${findings[key].value}`).join(', ');
    const important = ['airway','breathing','perfusion','mental_status','motor_sensory','breath_sounds','skin'].filter(key => findings[key]).map(key => `${labelFor(key)}: ${findings[key].value}`).join('; ');
    const treatments = (current.treatments || []).map(item => item.description || item.name || item.treatmentLabel || item.value).filter(Boolean).join('; ');
    const reassess = (current.reassessments || []).slice(-3).map(item => item.description || item.response || item.value).filter(Boolean).join('; ');
    const priority = current.documentation?.transportPriority || current.impressions?.action || 'transport priority not yet selected';
    const destination = current.documentation?.destination || 'destination not yet selected';
    return `${age} with ${current.dispatch || scenario.title}. Working impression: ${impression}. Key findings: ${important || 'assessment findings pending'}. Vitals: ${initialVitals || 'initial vitals pending'}. Treatments: ${treatments || 'none recorded'}. Response/reassessment: ${reassess || 'reassessment pending'}. Transporting ${priority.toLowerCase()} to ${destination}.`;
  }
  function generateHandoff() { $('handoffDraft').value = handoffText(); }
  function saveHandoff() {
    const text = ($('handoffDraft')?.value || '').trim();
    if (!text) { toast('Generate or enter the handoff report first'); return; }
    api?.setDocumentation?.({ handoff: text, handoffSavedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    toast('Handoff saved'); renderTransport(); renderProgress();
  }
  function renderTransport() {
    const current = record() || {};
    const plan = transportPlan();
    const impression = current.impressions?.primary || '';
    const priority = current.documentation?.transportPriority || current.impressions?.action || '';
    const destination = current.documentation?.destination || '';
    $('transportDecisionCard').innerHTML = `<div class="transport-card-head"><div><span class="requirement-tag required">Required</span><h3>Impression and transport priority</h3></div><span class="status-chip ${impression && priority ? 'done' : ''}">${impression && priority ? 'Recorded' : 'Not recorded'}</span></div><label>Working impression<select id="transportImpression">${selectOptions(plan.impressions, impression, 'Choose the best impression')}</select></label><label>Transport priority<select id="transportPriority">${selectOptions(plan.priorities, priority, 'Choose transport priority')}</select></label>`;
    $('destinationCard').innerHTML = `<div class="transport-card-head"><div><span class="requirement-tag required">Required</span><h3>Destination</h3></div><span class="status-chip ${destination ? 'done' : ''}">${destination ? 'Selected' : 'Not selected'}</span></div><label>Receiving facility<select id="transportDestination">${selectOptions(plan.destinations, destination, 'Choose destination')}</select></label><label>Reason for this choice<textarea id="transportRationale" rows="3" placeholder="Use findings, time sensitivity, and specialty needs">${escapeHtml(current.documentation?.transportRationale || '')}</textarea></label><button id="saveTransportDecision" class="primary-action" type="button">Save transport decision</button><p id="transportDecisionFeedback" class="transport-feedback" hidden></p>`;
    $('saveTransportDecision')?.addEventListener('click', saveTransportDecision);
    const evaluation = phases?.evaluate?.(current);
    const relevant = (evaluation?.phases || []).filter(phase => ['scene','primary','focused','vitals','treatment','reassessment','impression','handoff'].includes(phase.id));
    $('transportReadinessList').innerHTML = relevant.map(phase => `<div class="transport-ready-row ${phase.complete ? 'complete' : phase.started ? 'in-progress' : 'missing'}"><span>${phase.complete ? '✓' : phase.started ? '•' : '!'}</span><div><strong>${escapeHtml(phase.label)}</strong><small>${escapeHtml(phase.complete ? 'Complete' : phase.detail || phase.requirement)}</small></div></div>`).join('');
    const careReady = relevant.filter(phase => !['handoff'].includes(phase.id)).every(phase => phase.complete);
    $('transportReadinessStatus').textContent = careReady ? 'Ready for handoff' : 'Items remain';
    $('transportReadinessStatus').classList.toggle('done', careReady);
    const savedHandoff = current.documentation?.handoff || '';
    if (!$('handoffDraft').value || $('handoffDraft').dataset.loaded !== current.id) { $('handoffDraft').value = savedHandoff; $('handoffDraft').dataset.loaded = current.id || id; }
    $('handoffStatusChip').textContent = savedHandoff ? 'Saved' : 'Not saved';
    $('handoffStatusChip').classList.toggle('done', Boolean(savedHandoff));
    $('openFullHandoff').href = toolUrl('/vitals/pcr-handoff.html', 'Patient');
  }

  function renderProgress() {
    const current = record();
    const evaluation = phases?.evaluate?.(current);
    if (!evaluation) return;
    const list = $('scenarioPhaseList');
    list.innerHTML = evaluation.phases.map(phase => `
      <div class="scenario-phase ${phase.status}">
        <span class="phase-state" aria-hidden="true">${phase.complete ? '✓' : phase.started ? '•' : ''}</span>
        <div><strong>${escapeHtml(phase.label)}</strong><small>${escapeHtml(phase.requirement)}${phase.detail ? ` • ${escapeHtml(phase.detail)}` : ''}</small></div>
      </div>`).join('');
    const completed = evaluation.phases.filter(phase => phase.complete).length;
    $('scenarioProgressSummary').textContent = `${completed} of ${evaluation.phases.length} phases addressed`;
    $('handoffFromProgress').href = '#';
    $('handoffFromProgress').onclick = event => { event.preventDefault(); openSheet('transportPanel'); };
    const button = $('completeScenarioFromPatient');
    button.textContent = evaluation.essentialComplete ? 'Open debrief' : 'Check completion';
    button.dataset.ready = evaluation.essentialComplete ? 'true' : 'false';
  }

  function assignmentSessionForScenario() {
    try {
      const assignment = JSON.parse(localStorage.getItem('emscodesim_student_assignment_v1') || 'null');
      if (!assignment) return null;
      const aliases = { respiratory: 'asthma' };
      const assignedCase = aliases[assignment.scenario] || assignment.scenario;
      return assignedCase === id ? assignment : null;
    } catch { return null; }
  }

  function markAssignmentComplete(assignment) {
    if (!assignment) return;
    const completedAt = new Date().toISOString();
    const next = { ...assignment, completedAt, scenarioComplete: true };
    localStorage.setItem('emscodesim_student_assignment_v1', JSON.stringify(next));
    localStorage.setItem('emscodesim_assignment_completion_v1', JSON.stringify({
      assignmentCode: next.assignmentCode,
      assignmentId: next.assignmentId || null,
      learnerName: next.learnerName || '',
      scenario: id,
      scenarioTitle: scenario.title,
      completedAt,
      requireDebrief: Boolean(next.requireDebrief)
    }));
  }

  function checkScenarioCompletion() {
    const current = record();
    const evaluation = phases?.evaluate?.(current);
    const message = $('scenarioCompletionMessage');
    if (!evaluation) return;
    $('scenarioProgress').open = true;
    message.hidden = false;
    if (!evaluation.essentialComplete) {
      const remaining = evaluation.missing.slice(0, 7);
      message.className = 'scenario-completion-message incomplete';
      message.innerHTML = `<strong>Before finishing</strong><span>${escapeHtml(remaining.join(' • '))}${evaluation.missing.length > remaining.length ? ` • +${evaluation.missing.length - remaining.length} more` : ''}</span><div class="completion-choice-actions"><button id="continueScenarioCare" type="button">Return to patient care</button><button id="finishScenarioAnyway" class="secondary" type="button">Finish anyway</button></div>`;
      $('continueScenarioCare')?.addEventListener('click', () => { message.hidden = true; });
      $('finishScenarioAnyway')?.addEventListener('click', () => finishScenarioAndOpenDebrief(current, evaluation, true));
      return;
    }
    finishScenarioAndOpenDebrief(current, evaluation, false);
  }

  function finishScenarioAndOpenDebrief(current, evaluation, incomplete) {
    const assignment = assignmentSessionForScenario();
    const state = session?.readState?.(id) || {};
    state.clinicalComplete = !incomplete;
    state.clinicalCompletedAt = new Date().toISOString();
    state.complete = !assignment?.requireDebrief && !incomplete;
    if (state.complete) state.completedAt = state.clinicalCompletedAt;
    session?.writeState?.(id, state);
    if (!incomplete) localStorage.setItem(`emscodesim_mastered_scenario_${id}`, 'true');
    if (assignment && !assignment.requireDebrief && !incomplete) markAssignmentComplete(assignment);
    message.className = 'scenario-completion-message complete';
    message.innerHTML = incomplete ? '<strong>Scenario ended with care items outstanding.</strong><span>The debrief will identify the missing and delayed actions.</span>' : '<strong>Essential patient care is complete.</strong><span>Open the debrief to review timing, missed choices, unnecessary assessments, and documentation.</span>';
    location.href = toolUrl('/vitals/scenario-debrief.html', 'Patient');
  }

  function updateTimer() {
    if (!scenarioStartMs) {
      const startedAt = record()?.startedAt;
      scenarioStartMs = new Date(startedAt || Date.now()).getTime();
    }
    const elapsed = Math.max(0, Math.floor((Date.now() - scenarioStartMs) / 1000));
    $('timer').textContent = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  }

  function updatePartnerTasks() {
    const tasks = session?.readPartnerTasks?.(id) || {};
    document.querySelectorAll('[data-tool-key]').forEach(article => {
      const task = tasks[article.dataset.toolKey];
      if (!task || !['pending','queued'].includes(task.status)) return;
      const progress = article.querySelector('.assignment-progress');
      if (progress) progress.textContent = task.status === 'pending'
        ? `Partner gathering ${String(task.label || '').toLowerCase()}… ${secondsRemaining(task)}s`
        : 'Queued — partner will start after the current skill.';
    });
  }

  function runConditionClock() {
    const changed = evaluatePatientCondition('timed-condition-check');
    if (changed) {
      refreshFromRecord();
      renderInfoUpdate(true);
    }
  }

  function openSheet(panelId) {
    evaluatePatientCondition(panelId === 'transportPanel' ? 'transport-review' : 'patient-tool-open');
    document.querySelectorAll('.vp-panel').forEach(panel => { panel.hidden = panel.id !== panelId; });
    document.querySelectorAll('.bottom-nav button').forEach(button => button.classList.toggle('active', button.dataset.panel === panelId));
    $('sheetTitle').textContent = { vitalsPanel: 'Patient tools', assessmentPanel: 'Assessment', treatmentPanel: 'Treatment', transportPanel: 'Transport and handoff', findingsPanel: 'Patient care log' }[panelId];
    $('actionSheet').hidden = false;
    $('sheetBackdrop').hidden = false;
    document.body.style.overflow = 'hidden';
    if (panelId === 'findingsPanel') renderFindings();
  }

  function closeSheet() {
    $('actionSheet').hidden = true;
    $('sheetBackdrop').hidden = true;
    document.body.style.overflow = '';
    document.querySelectorAll('.bottom-nav button').forEach(button => button.classList.remove('active'));
  }

  function finishFocus() {
    if (!activeFocus) return;
    saveFinding(activeFocus.key, activeFocus.finding, 'visual-assessment');
    $('assessmentFocus').hidden = true;
    activeFocus = null;
    buildAssessments();
  }

  function refreshFromRecord() {
    if (!conditionEvaluationActive) evaluatePatientCondition('patient-home');
    const current = record();
    const dynamicState = conditionState(current);
    const patientImage = $('patientImage');
    if (patientImage) patientImage.dataset.conditionMode = dynamicState.imageMode || scenario.imageMode || '';
    buildVitals();
    buildAssessments();
    buildTreatments();
    renderTransport();
    renderFindings();
    updateCounts();
    renderProgress();
    $('dispatch').textContent = current?.dispatch || scenario.title;
    $('scene').textContent = current?.scene || '';
    renderInfoUpdate();
    updateTimer();
  }

  const initialRecord = ensureRecord();
  const requestedTrainingMode = params.get('training');
  if (requestedTrainingMode === 'learning' || requestedTrainingMode === 'assessment') api?.setDocumentation?.({ trainingMode: requestedTrainingMode });
  document.body.dataset.trainingMode = trainingMode();
  if ($('modeBadge')) $('modeBadge').textContent = assessmentMode() ? 'Assessment Mode' : 'Learning Mode';
  scenarioStartMs = new Date(initialRecord?.startedAt || Date.now()).getTime();
  $('caseTitle').textContent = scenario.title;
  setPatientImage($('patientImage'), scenario.image);
  setPatientImage($('focusImage'), scenario.image);
  renderSceneClues();
  $('generateHandoff').addEventListener('click', generateHandoff);
  $('saveHandoff').addEventListener('click', saveHandoff);
  $('recordTreatmentLink').href = toolUrl('/vitals/treatment-reassessment.html', 'Patient', 'general');
  $('fullPatientRecordLink').href = `/vitals/patient-record.html?mode=scenario&resume=1&case=${encodeURIComponent(id)}&return=${encodeURIComponent(`/vitals/visual-patient.html?case=${id}`)}`;
  refreshFromRecord();

  document.querySelectorAll('[data-log-filter]').forEach(button => button.addEventListener('click', () => {
    findingFilter = button.dataset.logFilter || 'all';
    renderFindings();
  }));
  $('infoUpdatePrevious').addEventListener('click', () => { infoUpdateIndex = Math.max(0, infoUpdateIndex - 1); renderInfoUpdate(); });
  $('infoUpdateNext').addEventListener('click', () => { infoUpdateIndex = Math.min(infoUpdates.length - 1, infoUpdateIndex + 1); renderInfoUpdate(); });
  $('infoUpdateCollapse').addEventListener('click', () => {
    const collapsed = $('infoUpdateWindow').dataset.collapsed !== 'true';
    $('infoUpdateWindow').dataset.collapsed = collapsed ? 'true' : 'false';
    $('infoUpdateCollapse').textContent = collapsed ? '⌄' : '⌃';
    $('infoUpdateCollapse').setAttribute('aria-expanded', String(!collapsed));
    $('infoUpdateCollapse').setAttribute('aria-label', collapsed ? 'Expand patient update' : 'Collapse patient update');
    renderInfoUpdate();
  });
  document.querySelectorAll('.bottom-nav button').forEach(button => button.addEventListener('click', () => openSheet(button.dataset.panel)));
  $('closeSheet').addEventListener('click', closeSheet);
  $('sheetBackdrop').addEventListener('click', closeSheet);
  $('recordFocus').addEventListener('click', finishFocus);
  $('cancelFocus').addEventListener('click', () => { $('assessmentFocus').hidden = true; activeFocus = null; });
  $('completeScenarioFromPatient').addEventListener('click', checkScenarioCompletion);
  $('endScenario').addEventListener('click', () => {
    if (confirm('Leave this patient and return to scenario selection? Your progress will remain saved.')) location.href = `/vitals/scenario-launcher.html?select=${encodeURIComponent(id)}&training=${encodeURIComponent(trainingMode())}`;
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!$('assessmentFocus').hidden) { $('assessmentFocus').hidden = true; activeFocus = null; }
    else closeSheet();
  });
  window.addEventListener('emscodesim:patient-record-updated', refreshFromRecord);
  window.addEventListener('emscodesim:scenario-finding-saved', refreshFromRecord);
  window.addEventListener('emscodesim:partner-task-updated', updatePartnerTasks);
  window.addEventListener('emscodesim:partner-task-completed', () => { refreshFromRecord(); renderInfoUpdate(true); updatePartnerTasks(); });
  window.addEventListener('pageshow', () => {
    session?.sync?.(id, { force: true });
    session?.resolvePartnerTasks?.(id);
    const current = record();
    scenarioStartMs = new Date(current?.startedAt || Date.now()).getTime();
    refreshFromRecord();
  });
  timerInterval = window.setInterval(updateTimer, 1000);
  partnerInterval = window.setInterval(updatePartnerTasks, 1000);
  conditionInterval = window.setInterval(runConditionClock, 5000);
  session?.schedulePartnerTasks?.(id);
  runConditionClock();
  window.addEventListener('pagehide', () => {
    clearInterval(timerInterval);
    clearInterval(partnerInterval);
    clearInterval(conditionInterval);
  }, { once: true });
})();
