'use strict';

/**
 * EMSCodeSim reusable drill engine.
 * Learn → Perform → Document → Complete
 */
(function (global) {
  const STORAGE_KEY = 'emscodesimEmsDrillsV1';
  const PASS_THRESHOLD = 0.7;

  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function $(id) {
    return document.getElementById(id);
  }

  function clone(value) {
    return typeof structuredClone === 'function'
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

  function track(eventName, params) {
    try {
      if (typeof global.gtag === 'function') {
        global.gtag('event', eventName, Object.assign({ event_category: 'ems_drills' }, params || {}));
      }
    } catch (_) { /* analytics must never break drills */ }
  }

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { completions: [], pendingSync: [] };
    } catch (_) {
      return { completions: [], pendingSync: [] };
    }
  }

  function saveHistory(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) { /* ignore quota */ }
  }

  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function arraysEqual(a, b) {
    return a.length === b.length && a.every((value, index) => value === b[index]);
  }

  function wordCount(text) {
    return String(text || '').trim().split(/\s+/).filter(Boolean).length;
  }

  function createSession(drill, roadmapContext) {
    return {
      drillId: drill.id,
      drillVersion: drill.version || 1,
      startedAt: Date.now(),
      stepIndex: 0,
      activityResults: {},
      criticalChecked: {},
      knowledgeResults: {},
      evaluatorId: '',
      evaluatorName: '',
      notes: '',
      completed: false,
      passed: false,
      score: null,
      roadmap: roadmapContext || null
    };
  }

  function buildSteps(drill) {
    const content = drill.content || {};
    const steps = [];
    const enabled = new Set(drill.components || []);

    if (enabled.has('introduction')) {
      steps.push({ id: 'introduction', label: 'Learn', title: 'Introduction', kind: 'intro' });
    }
    if (enabled.has('objective')) {
      steps.push({ id: 'objective', label: 'Learn', title: 'Objectives', kind: 'objectives' });
    }
    if (enabled.has('equipment')) {
      steps.push({ id: 'equipment', label: 'Learn', title: 'Equipment', kind: 'equipment' });
    }
    if (enabled.has('scenario')) {
      steps.push({ id: 'scenario', label: 'Learn', title: 'Scenario', kind: 'scenario' });
    }
    if (enabled.has('instructions')) {
      steps.push({ id: 'instructions', label: 'Learn', title: 'Instructions', kind: 'instructions' });
    }

    (content.activities || []).forEach((activity, index) => {
      steps.push({
        id: `activity:${activity.id || index}`,
        label: 'Perform',
        title: activity.title || `Activity ${index + 1}`,
        kind: 'activity',
        activity
      });
    });

    if (enabled.has('criticalActions') && (content.criticalActions || []).length) {
      steps.push({ id: 'critical', label: 'Document', title: 'Critical Actions', kind: 'critical' });
    }
    if (enabled.has('knowledgeChecks') && (content.knowledgeChecks || []).length) {
      steps.push({ id: 'knowledge', label: 'Document', title: 'Knowledge Check', kind: 'knowledge' });
    }
    if (enabled.has('debrief')) {
      steps.push({ id: 'debrief', label: 'Document', title: 'Debrief', kind: 'debrief' });
    }
    steps.push({ id: 'complete', label: 'Complete', title: 'Completion', kind: 'complete' });
    return steps;
  }

  function scoreSession(drill, session) {
    const content = drill.content || {};
    let earned = 0;
    let possible = 0;

    (content.activities || []).forEach((activity) => {
      const result = session.activityResults[activity.id];
      possible += 1;
      if (result && result.passed) earned += 1;
    });

    (content.criticalActions || []).forEach((action) => {
      possible += 1;
      if (session.criticalChecked[action.id]) earned += 1;
    });

    (content.knowledgeChecks || []).forEach((item, index) => {
      possible += 1;
      if (session.knowledgeResults[index] && session.knowledgeResults[index].correct) earned += 1;
    });

    if (drill.completionType === 'evaluator') {
      const evaluatorActivity = (content.activities || []).find((item) => item.type === 'evaluator-checklist');
      if (evaluatorActivity) {
        const result = session.activityResults[evaluatorActivity.id];
        if (!result || !result.passed) {
          return { score: Math.round((earned / Math.max(possible, 1)) * 100), passed: false, earned, possible };
        }
      }
    }

    const ratio = possible ? earned / possible : 1;
    return {
      score: Math.round(ratio * 100),
      passed: ratio >= PASS_THRESHOLD,
      earned,
      possible
    };
  }

  function gradeActivity(activity, draft) {
    switch (activity.type) {
      case 'mcq':
      case 'vitals-interp': {
        const choice = (activity.choices || []).find((item) => item.id === draft.choiceId);
        return {
          passed: Boolean(choice && choice.correct),
          feedback: choice ? choice.feedback : 'Select an answer to continue.',
          detail: { choiceId: draft.choiceId }
        };
      }
      case 'ordered-steps': {
        const passed = arraysEqual(draft.order || [], activity.correctOrder || []);
        return {
          passed,
          feedback: passed ? 'Correct sequence.' : 'Not quite—review the clinical priority order and try again.',
          detail: { order: draft.order || [] }
        };
      }
      case 'equipment-select':
      case 'communication': {
        const selected = new Set(draft.selected || []);
        const options = activity.options || [];
        const correctIds = options.filter((item) => item.correct).map((item) => item.id);
        const incorrectSelected = options.filter((item) => !item.correct && selected.has(item.id));
        const correctSelected = correctIds.filter((id) => selected.has(id));
        const minCorrect = activity.minCorrect || correctIds.length;
        const passed = incorrectSelected.length === 0 && correctSelected.length >= minCorrect;
        return {
          passed,
          feedback: passed ? 'Good selection.' : 'Review required items and remove incorrect selections.',
          detail: { selected: [...selected] }
        };
      }
      case 'branching': {
        const branch = (activity.branches || []).find((item) => item.id === draft.branchId);
        return {
          passed: Boolean(branch && branch.result === 'pass'),
          feedback: branch ? branch.feedback : 'Choose a path.',
          detail: { branchId: draft.branchId }
        };
      }
      case 'checklist': {
        const required = (activity.items || []).filter((item) => item.required).map((item) => item.id);
        const selected = new Set(draft.selected || []);
        const forbidden = (activity.items || []).filter((item) => item.required === false && selected.has(item.id) && /undocumented|leave|ignore/i.test(item.text || ''));
        const passed = required.every((id) => selected.has(id)) && forbidden.length === 0;
        return {
          passed,
          feedback: passed ? 'Checklist complete.' : 'Include every required reassessment/action item.',
          detail: { selected: [...selected] }
        };
      }
      case 'med-calc': {
        const value = Number(draft.value);
        const expected = Number(activity.answer);
        const tolerance = Number(activity.tolerance || 0);
        const passed = Number.isFinite(value) && Math.abs(value - expected) <= tolerance;
        return {
          passed,
          feedback: passed ? 'Correct.' : (activity.hint || 'Check your calculation and try again.'),
          detail: { value }
        };
      }
      case 'narrative': {
        const text = String(draft.text || '');
        const words = wordCount(text);
        const required = activity.requiredTerms || [];
        const lower = text.toLowerCase();
        const missing = required.filter((term) => !lower.includes(String(term).toLowerCase()));
        const passed = words >= (activity.minWords || 15)
          && words <= (activity.maxWords || 220)
          && missing.length === 0;
        return {
          passed,
          feedback: passed
            ? 'Narrative includes the required clinical elements.'
            : `Add missing elements: ${missing.join(', ') || 'check length'}.`,
          detail: { text, words, missing }
        };
      }
      case 'evaluator-checklist': {
        const items = activity.items || [];
        const checked = new Set(draft.checked || []);
        const passed = activity.requireAll === false
          ? checked.size >= Math.ceil(items.length * 0.8)
          : items.every((item) => checked.has(item.id));
        return {
          passed,
          feedback: passed ? 'Evaluator verified critical performance items.' : 'Evaluator must verify all required items before completion.',
          detail: {
            checked: [...checked],
            evaluatorId: draft.evaluatorId || '',
            evaluatorName: draft.evaluatorName || ''
          }
        };
      }
      default:
        return { passed: true, feedback: 'Activity recorded.', detail: draft };
    }
  }

  function EmsDrillEngine(options) {
    this.root = typeof options.root === 'string' ? $(options.root) : options.root;
    this.dataUrl = options.dataUrl || '/data/ems-drills.json';
    this.catalog = null;
    this.drill = null;
    this.steps = [];
    this.session = null;
    this.roadmap = options.roadmap || null;
    this.onComplete = options.onComplete || null;
    this.drafts = {};
  }

  EmsDrillEngine.prototype.loadCatalog = async function loadCatalog() {
    const response = await fetch(this.dataUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Unable to load drills (${response.status}).`);
    this.catalog = await response.json();
    return this.catalog;
  };

  EmsDrillEngine.prototype.getDrill = function getDrill(id) {
    return (this.catalog?.drills || []).find((drill) => drill.id === id || drill.slug === id) || null;
  };

  EmsDrillEngine.prototype.start = function start(drillId, roadmapContext) {
    this.drill = this.getDrill(drillId);
    if (!this.drill) throw new Error('Drill not found.');
    this.roadmap = roadmapContext || this.roadmap;
    this.session = createSession(this.drill, this.roadmap);
    this.steps = buildSteps(this.drill);
    this.drafts = {};
    track('ems_drill_start', {
      drill_id: this.drill.id,
      drill_version: this.drill.version,
      roadmap: Boolean(this.roadmap)
    });
    if (this.roadmap) track('ems_drill_roadmap_launch', { drill_id: this.drill.id });
    this.render();
  };

  EmsDrillEngine.prototype.currentStep = function currentStep() {
    return this.steps[this.session.stepIndex] || null;
  };

  EmsDrillEngine.prototype.go = function go(index) {
    this.session.stepIndex = Math.max(0, Math.min(index, this.steps.length - 1));
    const step = this.currentStep();
    track('ems_drill_step', {
      drill_id: this.drill.id,
      step_id: step?.id,
      step_index: this.session.stepIndex
    });
    this.render();
    this.root?.querySelector('.ems-drill-shell')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  EmsDrillEngine.prototype.next = function next() {
    this.go(this.session.stepIndex + 1);
  };

  EmsDrillEngine.prototype.prev = function prev() {
    this.go(this.session.stepIndex - 1);
  };

  EmsDrillEngine.prototype.render = function render() {
    if (!this.root || !this.drill || !this.session) return;
    const step = this.currentStep();
    const phase = step?.label || 'Drill';
    this.root.innerHTML = `
      <section class="ems-drill-shell" aria-live="polite">
        ${this.renderAssignmentBanner()}
        <header class="ems-drill-header">
          <div>
            <p class="ems-drill-kicker">${esc(phase)} · Step ${this.session.stepIndex + 1} of ${this.steps.length}</p>
            <h1>${esc(this.drill.title)}</h1>
            <p class="ems-drill-meta">
              <span>${esc(this.categoryName())}</span>
              <span>${esc((this.drill.certificationLevels || []).join(' / '))}</span>
              <span>${esc(String(this.drill.estimatedMinutes))} min</span>
              <span>${esc(this.drill.difficulty)}</span>
              <span>${this.drill.crewType === 'crew' ? 'Crew' : 'Individual'}</span>
              <span>${this.drill.completionType === 'evaluator' ? 'Evaluator-verified' : 'Self-completed'}</span>
            </p>
          </div>
          <a class="ems-drill-exit" href="/ems-drills.html">All drills</a>
        </header>
        <ol class="ems-drill-progress" aria-label="Drill progress">
          ${this.steps.map((item, index) => `
            <li class="${index === this.session.stepIndex ? 'is-current' : ''} ${index < this.session.stepIndex ? 'is-done' : ''}">
              <span>${esc(item.label)}</span>
              <strong>${esc(item.title)}</strong>
            </li>
          `).join('')}
        </ol>
        <div class="ems-drill-panel">${this.renderStep(step)}</div>
        <div class="ems-drill-actions">
          <button type="button" class="ems-btn ems-btn-secondary" data-action="prev" ${this.session.stepIndex === 0 ? 'disabled' : ''}>Back</button>
          ${step?.kind === 'complete'
            ? ''
            : `<button type="button" class="ems-btn ems-btn-primary" data-action="next">${step?.kind === 'activity' || step?.kind === 'critical' || step?.kind === 'knowledge' ? 'Continue' : 'Next'}</button>`}
        </div>
        <p class="ems-protocol-note">${esc(this.drill.protocolNote || this.catalog.protocolDisclaimer || '')}</p>
      </section>
    `;
    this.bind();
  };

  EmsDrillEngine.prototype.categoryName = function categoryName() {
    const category = (this.catalog?.categories || []).find((item) => item.id === this.drill.categoryId);
    return category?.name || this.drill.categoryId || 'EMS Drill';
  };

  EmsDrillEngine.prototype.renderAssignmentBanner = function renderAssignmentBanner() {
    if (!this.roadmap) return '';
    return `
      <aside class="ems-roadmap-banner" role="status">
        <p class="ems-drill-kicker">Responder Roadmap assignment</p>
        <p>You launched this drill from Responder Roadmap. Completion will sync back to your assignment record. Practice here remains an EMSCodeSim training experience — Roadmap owns official accountability.</p>
      </aside>
    `;
  };

  EmsDrillEngine.prototype.renderStep = function renderStep(step) {
    const content = this.drill.content || {};
    const titled = (inner) => `<h2>${esc(step.title)}</h2>${inner}`;
    switch (step.kind) {
      case 'intro':
        return titled(`<p class="ems-lead">${esc(content.introduction || '')}</p>
          <p>Philosophy: <strong>Learn → Perform → Document → Complete</strong></p>`);
      case 'objectives':
        return titled(`<ul class="ems-list">${(content.objectives || []).map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`);
      case 'equipment':
        return titled(`<ul class="ems-list">${(content.equipment || []).map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`);
      case 'scenario':
        return titled(`<dl class="ems-scenario">
          <dt>Dispatch</dt><dd>${esc(content.scenario?.dispatch || '')}</dd>
          <dt>Scene</dt><dd>${esc(content.scenario?.scene || '')}</dd>
          <dt>Patient</dt><dd>${esc(content.scenario?.patient || '')}</dd>
        </dl>`);
      case 'instructions':
        return titled(`<ul class="ems-list">${(content.instructions || []).map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`);
      case 'activity':
        return this.renderActivity(step.activity);
      case 'critical':
        return titled(this.renderCritical(content.criticalActions || []));
      case 'knowledge':
        return titled(this.renderKnowledge(content.knowledgeChecks || []));
      case 'debrief':
        return titled(`<div class="ems-debrief">
          <p class="ems-lead">${esc(content.debrief?.summary || '')}</p>
          <h3>Takeaways</h3>
          <ul class="ems-list">${(content.debrief?.takeaways || []).map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
          <h3>Common misses</h3>
          <ul class="ems-list">${(content.debrief?.commonMisses || []).map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
          <label class="ems-field"><span>Optional notes</span>
            <textarea data-field="notes" rows="3" placeholder="What will you change next time?">${esc(this.session.notes)}</textarea>
          </label>
        </div>`);
      case 'complete':
        return this.renderCompletion();
      default:
        return '<p>Unknown step.</p>';
    }
  };

  EmsDrillEngine.prototype.renderActivity = function renderActivity(activity) {
    const existing = this.session.activityResults[activity.id];
    const draft = this.drafts[activity.id] || {};
    let body = '';

    if (activity.type === 'mcq' || activity.type === 'vitals-interp') {
      if (activity.vitals) {
        body += `<dl class="ems-vitals">${Object.entries(activity.vitals).map(([key, value]) => `<dt>${esc(key)}</dt><dd>${esc(value)}</dd>`).join('')}</dl>`;
      }
      body += `<fieldset class="ems-choice-set"><legend>${esc(activity.prompt || '')}</legend>
        ${(activity.choices || []).map((choice) => `
          <label class="ems-choice">
            <input type="radio" name="choice-${esc(activity.id)}" value="${esc(choice.id)}" ${draft.choiceId === choice.id ? 'checked' : ''}/>
            <span>${esc(choice.text)}</span>
          </label>
        `).join('')}
      </fieldset>`;
    } else if (activity.type === 'ordered-steps') {
      const order = draft.order?.length ? draft.order : shuffle((activity.items || []).map((item) => item.id));
      draft.order = order;
      this.drafts[activity.id] = draft;
      const byId = Object.fromEntries((activity.items || []).map((item) => [item.id, item]));
      body += `<p>${esc(activity.prompt || '')}</p><ol class="ems-order-list" data-activity="${esc(activity.id)}">
        ${order.map((id, index) => `
          <li data-id="${esc(id)}">
            <span>${esc(byId[id]?.text || id)}</span>
            <span class="ems-order-controls">
              <button type="button" data-move="up" data-index="${index}" aria-label="Move up">↑</button>
              <button type="button" data-move="down" data-index="${index}" aria-label="Move down">↓</button>
            </span>
          </li>
        `).join('')}
      </ol>`;
    } else if (activity.type === 'equipment-select' || activity.type === 'communication' || activity.type === 'checklist') {
      const selected = new Set(draft.selected || []);
      body += `<p>${esc(activity.prompt || '')}</p><div class="ems-check-grid">
        ${((activity.options || activity.items || [])).map((item) => `
          <label class="ems-choice">
            <input type="checkbox" value="${esc(item.id)}" ${selected.has(item.id) ? 'checked' : ''}/>
            <span>${esc(item.label || item.text)}</span>
          </label>
        `).join('')}
      </div>`;
    } else if (activity.type === 'branching') {
      body += `<p>${esc(activity.prompt || '')}</p><div class="ems-branch-grid">
        ${(activity.branches || []).map((branch) => `
          <button type="button" class="ems-branch ${draft.branchId === branch.id ? 'is-selected' : ''}" data-branch="${esc(branch.id)}">${esc(branch.text)}</button>
        `).join('')}
      </div>`;
    } else if (activity.type === 'med-calc') {
      body += `<p>${esc(activity.prompt || '')}</p>
        <label class="ems-field"><span>Answer ${activity.unit ? `(${esc(activity.unit)})` : ''}</span>
          <input data-field="calc" inputmode="decimal" value="${esc(draft.value ?? '')}"/>
        </label>`;
    } else if (activity.type === 'narrative') {
      body += `<p>${esc(activity.prompt || '')}</p>
        <label class="ems-field"><span>Your response</span>
          <textarea data-field="narrative" rows="7" placeholder="Write clearly and objectively.">${esc(draft.text || '')}</textarea>
        </label>`;
    } else if (activity.type === 'evaluator-checklist') {
      const checked = new Set(draft.checked || []);
      body += `<p>${esc(activity.prompt || '')}</p>
        <div class="ems-check-grid">
          ${(activity.items || []).map((item) => `
            <label class="ems-choice">
              <input type="checkbox" value="${esc(item.id)}" ${checked.has(item.id) ? 'checked' : ''}/>
              <span>${esc(item.text)}</span>
            </label>
          `).join('')}
        </div>
        <div class="ems-eval-fields">
          <label class="ems-field"><span>Evaluator name</span>
            <input data-field="evaluatorName" value="${esc(draft.evaluatorName || this.session.evaluatorName || '')}" autocomplete="name"/>
          </label>
          <label class="ems-field"><span>Evaluator ID (optional / Roadmap)</span>
            <input data-field="evaluatorId" value="${esc(draft.evaluatorId || this.session.evaluatorId || '')}" autocomplete="off"/>
          </label>
        </div>`;
    }

    return `
      <div class="ems-activity" data-activity-id="${esc(activity.id)}" data-activity-type="${esc(activity.type)}">
        <h2>${esc(activity.title || 'Activity')}</h2>
        ${body}
        <div class="ems-activity-footer">
          <button type="button" class="ems-btn ems-btn-primary" data-action="grade-activity">Check</button>
          ${existing ? `<p class="ems-feedback ${existing.passed ? 'is-pass' : 'is-fail'}">${esc(existing.feedback || '')}</p>` : '<p class="ems-feedback">Check your work before continuing.</p>'}
        </div>
      </div>
    `;
  };

  EmsDrillEngine.prototype.renderCritical = function renderCritical(actions) {
    return `<p>Confirm you performed or considered each critical action.</p>
      <div class="ems-check-grid">
        ${actions.map((action) => `
          <label class="ems-choice">
            <input type="checkbox" data-critical="${esc(action.id)}" ${this.session.criticalChecked[action.id] ? 'checked' : ''}/>
            <span>${esc(action.text)}</span>
          </label>
        `).join('')}
      </div>`;
  };

  EmsDrillEngine.prototype.renderKnowledge = function renderKnowledge(questions) {
    return questions.map((item, index) => {
      const result = this.session.knowledgeResults[index];
      return `<fieldset class="ems-choice-set">
        <legend>${esc(item.question)}</legend>
        ${(item.options || []).map((option, optionIndex) => `
          <label class="ems-choice">
            <input type="radio" name="knowledge-${index}" value="${optionIndex}" ${result && result.selected === optionIndex ? 'checked' : ''}/>
            <span>${esc(option)}</span>
          </label>
        `).join('')}
        ${result ? `<p class="ems-feedback ${result.correct ? 'is-pass' : 'is-fail'}">${esc(result.correct ? item.rationale : item.rationale)}</p>` : ''}
      </fieldset>`;
    }).join('');
  };

  EmsDrillEngine.prototype.renderCompletion = function renderCompletion() {
    const grading = scoreSession(this.drill, this.session);
    const durationSec = Math.max(1, Math.round((Date.now() - this.session.startedAt) / 1000));
    const related = (this.drill.relatedTools || []).map((tool) => `
      <a class="ems-related-link" href="${esc(tool.url)}">${esc(tool.title)}</a>
    `).join('');

    return `
      <div class="ems-completion-panel" data-passed="${grading.passed ? 'true' : 'false'}">
        <h2>${grading.passed ? 'Ready to complete' : 'Not yet complete'}</h2>
        <p>Score: <strong>${grading.score}%</strong> (${grading.earned}/${grading.possible}). Duration so far: ${Math.round(durationSec / 60)} min.</p>
        <ul class="ems-list">
          ${(this.drill.content?.completionCriteria || []).map((item) => `<li>${esc(item)}</li>`).join('')}
        </ul>
        ${grading.passed
          ? `<button type="button" class="ems-btn ems-btn-primary" data-action="finish">Complete Drill</button>`
          : `<p class="ems-feedback is-fail">Return to missed activities or knowledge checks, then try completion again.</p>
             <button type="button" class="ems-btn ems-btn-secondary" data-action="review">Review activities</button>`}
        <div class="ems-related">${related}</div>
      </div>
    `;
  };

  EmsDrillEngine.prototype.collectActivityDraft = function collectActivityDraft(activity) {
    const root = this.root.querySelector(`[data-activity-id="${activity.id}"]`);
    if (!root) return this.drafts[activity.id] || {};
    const draft = Object.assign({}, this.drafts[activity.id] || {});

    if (activity.type === 'mcq' || activity.type === 'vitals-interp') {
      draft.choiceId = root.querySelector('input[type="radio"]:checked')?.value || '';
    } else if (activity.type === 'ordered-steps') {
      draft.order = [...root.querySelectorAll('.ems-order-list li')].map((item) => item.getAttribute('data-id'));
    } else if (activity.type === 'equipment-select' || activity.type === 'communication' || activity.type === 'checklist') {
      draft.selected = [...root.querySelectorAll('input[type="checkbox"]:checked')].map((item) => item.value);
    } else if (activity.type === 'branching') {
      draft.branchId = root.querySelector('.ems-branch.is-selected')?.getAttribute('data-branch') || draft.branchId || '';
    } else if (activity.type === 'med-calc') {
      draft.value = root.querySelector('[data-field="calc"]')?.value;
    } else if (activity.type === 'narrative') {
      draft.text = root.querySelector('[data-field="narrative"]')?.value || '';
    } else if (activity.type === 'evaluator-checklist') {
      draft.checked = [...root.querySelectorAll('input[type="checkbox"]:checked')].map((item) => item.value);
      draft.evaluatorName = root.querySelector('[data-field="evaluatorName"]')?.value || '';
      draft.evaluatorId = root.querySelector('[data-field="evaluatorId"]')?.value || '';
    }
    this.drafts[activity.id] = draft;
    return draft;
  };

  EmsDrillEngine.prototype.canLeaveStep = function canLeaveStep(step) {
    if (!step) return true;
    if (step.kind === 'activity') {
      const result = this.session.activityResults[step.activity.id];
      if (!result) {
        this.gradeCurrentActivity(true);
        return Boolean(this.session.activityResults[step.activity.id]);
      }
      return true;
    }
    if (step.kind === 'critical') {
      const actions = this.drill.content?.criticalActions || [];
      return actions.every((action) => this.session.criticalChecked[action.id]);
    }
    if (step.kind === 'knowledge') {
      const questions = this.drill.content?.knowledgeChecks || [];
      questions.forEach((_, index) => {
        if (!this.session.knowledgeResults[index]) this.captureKnowledge(index);
      });
      return questions.every((_, index) => this.session.knowledgeResults[index]);
    }
    if (step.kind === 'debrief') {
      this.session.notes = this.root.querySelector('[data-field="notes"]')?.value || this.session.notes;
    }
    return true;
  };

  EmsDrillEngine.prototype.gradeCurrentActivity = function gradeCurrentActivity(silent) {
    const step = this.currentStep();
    if (!step || step.kind !== 'activity') return;
    const draft = this.collectActivityDraft(step.activity);
    const graded = gradeActivity(step.activity, draft);
    this.session.activityResults[step.activity.id] = graded;
    if (step.activity.type === 'evaluator-checklist') {
      this.session.evaluatorId = draft.evaluatorId || '';
      this.session.evaluatorName = draft.evaluatorName || '';
    }
    if (!silent) this.render();
  };

  EmsDrillEngine.prototype.captureKnowledge = function captureKnowledge(index) {
    const selected = this.root.querySelector(`input[name="knowledge-${index}"]:checked`);
    if (!selected) return;
    const question = this.drill.content.knowledgeChecks[index];
    const selectedIndex = Number(selected.value);
    this.session.knowledgeResults[index] = {
      selected: selectedIndex,
      correct: selectedIndex === question.answer
    };
  };

  EmsDrillEngine.prototype.finish = async function finish() {
    const grading = scoreSession(this.drill, this.session);
    if (!grading.passed) {
      track('ems_drill_failed', { drill_id: this.drill.id, score: grading.score });
      this.render();
      return null;
    }

    const completedAt = new Date().toISOString();
    const durationSeconds = Math.max(1, Math.round((Date.now() - this.session.startedAt) / 1000));
    const completion = {
      completionId: null,
      drillId: this.drill.id,
      drillVersion: this.drill.version || 1,
      drillTitle: this.drill.title,
      assignmentId: this.roadmap?.assignmentId || null,
      status: 'completed',
      completedAt,
      durationSeconds,
      score: grading.score,
      passed: true,
      evaluatorId: this.session.evaluatorId || null,
      evaluatorName: this.session.evaluatorName || null,
      attemptNumber: this.roadmap?.attemptNumber || 1,
      source: this.roadmap ? 'responderroadmap' : 'standalone'
    };

    this.session.completed = true;
    this.session.passed = true;
    this.session.score = grading.score;

    const history = loadHistory();
    history.completions.unshift(completion);
    history.completions = history.completions.slice(0, 50);
    saveHistory(history);

    track('ems_drill_complete', {
      drill_id: this.drill.id,
      score: grading.score,
      duration_seconds: durationSeconds,
      roadmap: Boolean(this.roadmap)
    });

    if (typeof this.onComplete === 'function') {
      return this.onComplete(completion, this.session);
    }
    return completion;
  };

  EmsDrillEngine.prototype.bind = function bind() {
    this.root.querySelector('[data-action="prev"]')?.addEventListener('click', () => this.prev());
    this.root.querySelector('[data-action="next"]')?.addEventListener('click', () => {
      if (!this.canLeaveStep(this.currentStep())) {
        this.render();
        const feedback = this.root.querySelector('.ems-feedback');
        if (feedback) feedback.textContent = 'Complete this step before continuing.';
        return;
      }
      this.next();
    });
    this.root.querySelector('[data-action="grade-activity"]')?.addEventListener('click', () => this.gradeCurrentActivity());
    this.root.querySelector('[data-action="finish"]')?.addEventListener('click', () => this.finish());
    this.root.querySelector('[data-action="review"]')?.addEventListener('click', () => {
      const index = this.steps.findIndex((step) => step.kind === 'activity');
      this.go(index >= 0 ? index : 0);
    });

    this.root.querySelectorAll('[data-move]').forEach((button) => {
      button.addEventListener('click', () => {
        const step = this.currentStep();
        if (!step?.activity) return;
        const draft = this.collectActivityDraft(step.activity);
        const index = Number(button.getAttribute('data-index'));
        const order = draft.order.slice();
        const swapWith = button.getAttribute('data-move') === 'up' ? index - 1 : index + 1;
        if (swapWith < 0 || swapWith >= order.length) return;
        [order[index], order[swapWith]] = [order[swapWith], order[index]];
        draft.order = order;
        this.drafts[step.activity.id] = draft;
        this.render();
      });
    });

    this.root.querySelectorAll('[data-branch]').forEach((button) => {
      button.addEventListener('click', () => {
        const step = this.currentStep();
        if (!step?.activity) return;
        const draft = this.collectActivityDraft(step.activity);
        draft.branchId = button.getAttribute('data-branch');
        this.drafts[step.activity.id] = draft;
        this.render();
      });
    });

    this.root.querySelectorAll('[data-critical]').forEach((input) => {
      input.addEventListener('change', () => {
        this.session.criticalChecked[input.getAttribute('data-critical')] = input.checked;
      });
    });

    this.root.querySelectorAll('input[name^="knowledge-"]').forEach((input) => {
      input.addEventListener('change', () => {
        const index = Number(input.name.replace('knowledge-', ''));
        this.captureKnowledge(index);
        this.render();
      });
    });
  };

  global.EmsDrillEngine = EmsDrillEngine;
  global.EMS_DRILL_ENGINE_UTILS = {
    gradeActivity,
    scoreSession,
    buildSteps,
    loadHistory,
    saveHistory,
    track,
    PASS_THRESHOLD
  };
})(typeof window !== 'undefined' ? window : globalThis);
