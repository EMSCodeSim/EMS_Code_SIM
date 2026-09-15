(() => {
  'use strict';

  const DRAFT_KEY = 'emscode_narrative_lab_draft_v1';
  const HISTORY_KEY = 'emscode_narrative_lab_history_v1';
  const formatGuides = {
    chronological: 'Tell the call in order: dispatch and arrival → history → assessment and vitals → care → response and reassessment → disposition and transfer.',
    chart: '<strong>C</strong>hief complaint · <strong>H</strong>istory · <strong>A</strong>ssessment · <strong>R</strong>x/treatment · <strong>T</strong>ransport. Labels are optional unless your program requires them.',
    soap: '<strong>S</strong>ubjective history · <strong>O</strong>bjective findings · <strong>A</strong>ssessment/impression · <strong>P</strong>lan, treatment, reassessment, and disposition.'
  };

  const state = { scenarios: [], level: 'EMT', selected: null, attempt: 0, priorScore: null };
  const el = {
    grid: document.querySelector('#scenarioGrid'), workspace: document.querySelector('#workspace'), caseMeta: document.querySelector('#caseMeta'),
    caseTitle: document.querySelector('#caseTitle'), caseFacts: document.querySelector('#caseFacts'), beginnerGuide: document.querySelector('#beginnerGuide'),
    format: document.querySelector('#formatSelect'), formatGuide: document.querySelector('#formatGuide'), narrative: document.querySelector('#narrativeText'),
    wordCount: document.querySelector('#wordCount'), draftStatus: document.querySelector('#draftStatus'), preflight: document.querySelector('#preflight'),
    grade: document.querySelector('#gradeBtn'), grading: document.querySelector('#gradingState'), feedback: document.querySelector('#feedback')
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const titleCase = value => String(value).replace(/\b\w/g, char => char.toUpperCase());
  const list = items => `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;

  function scenariosForLevel() {
    if (state.level === 'Paramedic') return state.scenarios;
    return state.scenarios.filter(scenario => scenario.level !== 'Paramedic');
  }

  function renderScenarioGrid() {
    el.grid.innerHTML = scenariosForLevel().map(scenario => `
      <button class="scenario-button ${state.selected?.id === scenario.id ? 'active' : ''}" type="button" data-scenario="${scenario.id}">
        <span>${escapeHtml(scenario.category)}</span><strong>${escapeHtml(scenario.title)}</strong>
        <small>${escapeHtml(scenario.dispatch)}</small>
      </button>`).join('');
    el.grid.querySelectorAll('[data-scenario]').forEach(button => button.addEventListener('click', () => selectScenario(button.dataset.scenario)));
  }

  function factBlock(label, content) {
    return `<section class="fact-block"><h3>${escapeHtml(label)}</h3>${content}</section>`;
  }

  function selectScenario(id, options = {}) {
    const scenario = state.scenarios.find(item => item.id === id);
    if (!scenario) return;
    const changed = state.selected?.id !== id;
    state.selected = scenario;
    state.attempt = changed ? 0 : state.attempt;
    state.priorScore = changed ? null : state.priorScore;
    el.caseMeta.textContent = `${scenario.category} · ${scenario.level} case`;
    el.caseTitle.textContent = scenario.title;
    el.caseFacts.innerHTML = [
      factBlock('Dispatch', `<p>${escapeHtml(scenario.dispatch)}</p>`),
      factBlock('Scene and presentation', `<p>${escapeHtml(scenario.scene)}</p>`),
      factBlock('History', list(scenario.history)),
      factBlock('Assessment findings', list(scenario.findings)),
      factBlock('Vital signs', scenario.vitals.map(vital => `<span class="vital-chip">${escapeHtml(vital)}</span>`).join('')),
      factBlock('Care provided', list(scenario.care)),
      factBlock('Response', `<p>${escapeHtml(scenario.response)}</p>`),
      factBlock('Disposition', `<p>${escapeHtml(scenario.disposition)}</p>`)
    ].join('');
    el.beginnerGuide.open = state.level === 'Beginner';
    el.beginnerGuide.classList.toggle('hidden', state.level !== 'Beginner');
    el.workspace.classList.remove('hidden');
    el.feedback.classList.add('hidden');
    renderScenarioGrid();
    if (changed) restoreDraft();
    if (!options.noScroll) el.workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function updateWritingState() {
    const text = el.narrative.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    el.wordCount.textContent = `${words} word${words === 1 ? '' : 's'}`;
    const warnings = [];
    if (text && words < 60) warnings.push({ type: 'warn', text: 'This is very brief. Most complete practice narratives need enough detail to cover assessment, care, response, and disposition.' });
    if (/\b(?:name|dob|date of birth|address|phone|incident|report)\s*(?:is|:|#)/i.test(text)) warnings.push({ type: 'danger', text: 'Possible patient identifier detected. Remove it before submitting.' });
    if (/\b(?:crazy|drunk|drug seeker|frequent flyer|noncompliant)\b/i.test(text)) warnings.push({ type: 'warn', text: 'Replace judgmental labels with objective observations and attributed statements.' });
    el.preflight.innerHTML = warnings.map(item => `<div class="preflight-item ${item.type}">${escapeHtml(item.text)}</div>`).join('');
    saveDraft();
  }

  function saveDraft() {
    if (!state.selected) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ scenarioId: state.selected.id, format: el.format.value, narrative: el.narrative.value, savedAt: Date.now() }));
      el.draftStatus.textContent = 'Draft saved on this device';
    } catch (_) { el.draftStatus.textContent = 'Draft could not be saved'; }
  }

  function restoreDraft() {
    el.narrative.value = '';
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (draft?.scenarioId === state.selected.id) {
        el.narrative.value = draft.narrative || '';
        el.format.value = formatGuides[draft.format] ? draft.format : 'chronological';
      }
    } catch (_) {}
    updateFormatGuide();
    updateWritingState();
  }

  function updateFormatGuide() { el.formatGuide.innerHTML = formatGuides[el.format.value]; saveDraft(); }

  function localValidation() {
    const text = el.narrative.value.trim();
    if (!state.selected) return 'Choose a scenario first.';
    if (text.length < 80) return 'Write at least a short complete narrative before requesting a grade.';
    if (/\b(?:name|dob|date of birth|address|phone|incident|report)\s*(?:is|:|#)/i.test(text)) return 'Remove possible patient identifiers before submitting.';
    return '';
  }

  async function gradeNarrative() {
    const error = localValidation();
    if (error) { el.preflight.innerHTML = `<div class="preflight-item danger">${escapeHtml(error)}</div>`; el.narrative.focus(); return; }
    el.grade.disabled = true;
    el.grading.classList.remove('hidden');
    el.feedback.classList.add('hidden');
    try {
      const response = await fetch('/.netlify/functions/narrative-grader', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: state.selected.id, format: el.format.value, level: state.level, narrative: el.narrative.value.trim(), website: '' })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'The AI grader is unavailable right now.');
      state.attempt += 1;
      renderFeedback(payload);
      recordAttempt(payload.totalScore);
    } catch (error) {
      el.preflight.innerHTML = `<div class="preflight-item danger">${escapeHtml(error.message)} Your draft is still saved on this device; please try again.</div>`;
    } finally {
      el.grade.disabled = false;
      el.grading.classList.add('hidden');
    }
  }

  function renderList(target, items, emptyText) {
    document.querySelector(target).innerHTML = (items?.length ? items : [emptyText]).map(item => `<li>${escapeHtml(item)}</li>`).join('');
  }

  function renderFeedback(result) {
    document.querySelector('#totalScore').textContent = result.totalScore;
    document.querySelector('#summaryText').textContent = result.summary;
    const comparison = state.priorScore == null ? '' : result.totalScore > state.priorScore ? ` · Up ${result.totalScore - state.priorScore} points` : result.totalScore < state.priorScore ? ` · Down ${state.priorScore - result.totalScore} points` : ' · Same score';
    document.querySelector('#attemptBadge').textContent = `Attempt ${state.attempt}${comparison}`;
    const categories = Array.isArray(result.categories) ? result.categories : [];
    document.querySelector('#categoryScores').innerHTML = categories.map(category => {
      const percent = category.maxScore ? Math.round(category.score / category.maxScore * 100) : 0;
      return `<div class="category-row"><span>${escapeHtml(titleCase(category.name))}</span><div class="score-track"><span style="width:${Math.max(0, Math.min(100, percent))}%"></span></div><strong>${category.score}</strong></div>`;
    }).join('');
    renderList('#strengthsList', result.strengths, 'No specific strength was identified yet.');
    renderList('#improvementsList', result.priorityImprovements, 'No major improvement was identified.');
    renderList('#missingList', result.missingFacts, 'No important supplied fact appears to be missing.');
    renderList('#unsupportedList', [...(result.unsupportedStatements || []), ...(result.contradictions || [])], 'No unsupported or conflicting statements were detected.');
    document.querySelector('#lineFeedback').innerHTML = (result.lineFeedback?.length ? result.lineFeedback : [{ excerpt: 'Overall narrative', coaching: 'Use the category feedback above for your next revision.' }]).map(item => `<div class="line-note"><q>${escapeHtml(item.excerpt)}</q><p>${escapeHtml(item.coaching)}</p></div>`).join('');
    document.querySelector('#exampleNarrative').textContent = result.exampleNarrative || 'Example unavailable.';
    el.feedback.classList.remove('hidden');
    el.feedback.scrollIntoView({ behavior: 'smooth', block: 'start' });
    state.priorScore = result.totalScore;
  }

  function recordAttempt(score) {
    try {
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      history.push({ scenarioId: state.selected.id, score, format: el.format.value, at: Date.now() });
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-30)));
    } catch (_) {}
  }

  function clearDraft() {
    if (el.narrative.value.trim() && !window.confirm('Clear this practice narrative?')) return;
    el.narrative.value = '';
    try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
    updateWritingState();
    el.feedback.classList.add('hidden');
  }

  async function init() {
    try {
      const response = await fetch('/data/narrative-lab-scenarios.json');
      if (!response.ok) throw new Error('Scenario library failed to load.');
      state.scenarios = await response.json();
      renderScenarioGrid();
      const requested = new URLSearchParams(location.search).get('scenario');
      if (requested && state.scenarios.some(scenario => scenario.id === requested)) selectScenario(requested, { noScroll: true });
    } catch (error) {
      el.grid.innerHTML = `<div class="preflight-item danger">${escapeHtml(error.message)} Please refresh the page.</div>`;
    }
  }

  document.querySelectorAll('[data-level]').forEach(button => button.addEventListener('click', () => {
    state.level = button.dataset.level;
    document.querySelectorAll('[data-level]').forEach(item => item.classList.toggle('active', item === button));
    if (state.selected && !scenariosForLevel().some(scenario => scenario.id === state.selected.id)) { state.selected = null; el.workspace.classList.add('hidden'); }
    if (state.selected) el.beginnerGuide.classList.toggle('hidden', state.level !== 'Beginner');
    renderScenarioGrid();
  }));
  document.querySelector('#changeCase').addEventListener('click', () => { document.querySelector('#chooseHeading').scrollIntoView({ behavior: 'smooth' }); });
  document.querySelector('#gradeBtn').addEventListener('click', gradeNarrative);
  document.querySelector('#clearBtn').addEventListener('click', clearDraft);
  document.querySelector('#reviseBtn').addEventListener('click', () => { el.narrative.focus(); el.workspace.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  el.narrative.addEventListener('input', updateWritingState);
  el.format.addEventListener('change', updateFormatGuide);
  document.querySelector('#mobileMenu').addEventListener('change', event => { if (event.target.value) location.href = event.target.value; });
  window.EMSNarrativeLab = { selectScenario: id => selectScenario(id) };
  init();
})();
