(() => {
  'use strict';

  const VERSION = '2026.09.09.5';
  const ENDPOINT = '/api/scenario-question-labels';
  const ACTIVE_SCENARIOS = new Set(['asthma']);
  const MAX_QUICK_REPLIES = 4;
  const REQUEST_TIMEOUT_MS = 2200;
  const REFRESH_DELAY_MS = 140;

  const FALLBACK_WORDING = Object.freeze({
    chief_complaint: ['What is bothering you the most right now?','What feels worst right now?','Tell me what is bothering you most.'],
    symptoms: ['What symptoms are you having?','What else are you feeling right now?','Besides the breathing trouble, what are you noticing?'],
    onset: ['When did this start?','How long have you been short of breath?','When did you first notice the breathing problem?','Did this start suddenly or build over time?'],
    provocation: ['What makes your breathing better or worse?','Does anything make this easier or harder?','What seems to make the breathing trouble worse?'],
    quality: ['How would you describe what your chest feels like?','What does the breathing problem feel like?','How would you describe the tightness?'],
    radiation: ['Does the discomfort move anywhere else?','Does the tightness travel anywhere?','Are you feeling this anywhere besides your chest?'],
    severity: ['How severe is this right now?','On a zero-to-ten scale, how bad is it?','How bad does the breathing trouble feel?'],
    time: ['Has this changed since it started?','Is this getting better, worse, or staying the same?','How has the breathing problem changed over time?'],
    allergies: ['Do you have any allergies?','Are you allergic to any medications?','Do you have any known medication allergies?'],
    medications: ['What medications do you take?','Are you taking any prescription medications?','What medicines do you use regularly?','Have you taken any medicine for this today?'],
    medical_history: ['What medical problems do you have?','Do you have any medical history I should know about?','Have you been diagnosed with any ongoing conditions?'],
    last_intake: ['When did you last eat or drink?','What was the last thing you had to eat or drink?','How long has it been since you ate or drank?'],
    events: ['What were you doing when this started?','What happened just before the breathing trouble began?','Was there anything that seemed to trigger this?'],
    prior_episodes: ['Has this happened to you before?','Have you had an episode like this before?','Is this similar to your previous asthma attacks?']
  });

  const $ = id => document.getElementById(id);
  const shuffle = values => {
    const copy = values.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  function onPatientScenarioPage() {
    return /\/vitals\/visual-patient(?:\.html)?$/.test(location.pathname);
  }

  function shouldUseAiEndpoint() {
    const host = String(location.hostname || '').toLowerCase();
    const localStatic = (host === '127.0.0.1' || host === 'localhost') && location.port !== '8888';
    return !localStatic;
  }

  function scenarioId() {
    const params = new URLSearchParams(location.search);
    const raw = String(params.get('case') || window.EMSCodeSimScenarioSession?.requestedCaseId?.() || window.EMSCodeSimPatientRecord?.active?.()?.scenarioId || '').trim().toLowerCase();
    return raw === 'respiratory' ? 'asthma' : raw;
  }

  function interviewFor(id) {
    try { return window.EMSCodeSimScenarioInterviews?.get?.(id) || null; }
    catch (_) { return null; }
  }

  function historyButtons() {
    return Array.from(document.querySelectorAll('#historyCategoryList .history-question-button[data-history-question]'));
  }

  function buttonByQuestionId(questionId) {
    return historyButtons().find(button => button.dataset.historyQuestion === questionId) || null;
  }

  function askedIds() {
    return new Set(historyButtons().filter(button => button.classList.contains('asked')).map(button => button.dataset.historyQuestion).filter(Boolean));
  }

  function chooseFallbackCandidates(interview, asked) {
    const questions = Array.isArray(interview?.questions) ? interview.questions : [];
    const unasked = questions.filter(question => !asked.has(question.id));
    if (!unasked.length) return [];

    const required = new Set([...(interview.sampleRequired || []), ...(interview.opqrstRequired || [])]);
    const priority = shuffle(unasked.filter(question => required.has(question.id)));
    const other = shuffle(unasked.filter(question => !required.has(question.id)));
    const selected = [...priority.slice(0, 2), ...other.slice(0, 2)];
    const remaining = shuffle(unasked.filter(question => !selected.includes(question)));
    selected.push(...remaining.slice(0, MAX_QUICK_REPLIES - selected.length));
    return shuffle(selected).slice(0, MAX_QUICK_REPLIES);
  }

  function fallbackLabel(question) {
    const pool = (FALLBACK_WORDING[question.id] || [question.label || question.prompt || 'Ask this question']).filter(Boolean);
    return pool[Math.floor(Math.random() * pool.length)] || question.label || question.prompt;
  }

  function installStyles() {
    if ($('aiQuickHistoryStyles')) return;
    const style = document.createElement('style');
    style.id = 'aiQuickHistoryStyles';
    style.textContent = `
      .ai-quick-history{margin:0 0 14px;padding:14px;border:1px solid rgba(85,137,190,.38);border-radius:14px;background:rgba(8,28,47,.035)}
      .ai-quick-history-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
      .ai-quick-history-head small{display:block;font-size:.69rem;font-weight:800;letter-spacing:.12em;color:#52677b}
      .ai-quick-history-head strong{display:block;margin-top:2px;font-size:1rem;color:#102b43}
      .ai-quick-history-status{font-size:.72rem;color:#617487;text-align:right;max-width:15rem}
      .ai-quick-history-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .ai-quick-history-buttons button{min-height:48px;padding:10px 12px;border:1px solid #b8c9d8;border-radius:10px;background:#fff;color:#17364f;font:inherit;font-weight:700;text-align:left;cursor:pointer}
      .ai-quick-history-buttons button:hover,.ai-quick-history-buttons button:focus-visible{border-color:#557fa5;box-shadow:0 0 0 2px rgba(85,127,165,.12)}
      @media(max-width:640px){.ai-quick-history-buttons{grid-template-columns:1fr}.ai-quick-history-head{display:block}.ai-quick-history-status{text-align:left;margin-top:4px;max-width:none}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel() {
    if (!onPatientScenarioPage()) return null;
    const historyPanel = $('historyPanel');
    if (!historyPanel) return null;
    let panel = $('aiQuickHistory');
    if (panel) return panel;
    installStyles();
    panel = document.createElement('section');
    panel.id = 'aiQuickHistory';
    panel.className = 'ai-quick-history';
    panel.setAttribute('aria-label', 'Quick Response patient interview questions');
    panel.innerHTML = `
      <div class="ai-quick-history-head">
        <div><small>QUICK RESPONSE</small><strong>What do you want to ask next?</strong></div>
        <span id="aiQuickHistoryStatus" class="ai-quick-history-status">Loading choices…</span>
      </div>
      <div id="aiQuickHistoryButtons" class="ai-quick-history-buttons"></div>`;
    const responseCard = $('historyResponseCard');
    historyPanel.insertBefore(panel, responseCard || historyPanel.firstChild);
    return panel;
  }

  function renderQuickReplies(items, source = 'fallback') {
    const panel = ensurePanel();
    const host = $('aiQuickHistoryButtons');
    const status = $('aiQuickHistoryStatus');
    if (!panel || !host) return;
    host.replaceChildren();

    if (!items.length) {
      panel.hidden = true;
      return;
    }

    items.forEach(item => {
      if (!buttonByQuestionId(item.id)) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.aiQuickQuestion = item.id;
      button.textContent = item.label;
      button.addEventListener('click', () => {
        const target = buttonByQuestionId(item.id);
        if (!target) return;
        target.click();
        window.setTimeout(refresh, REFRESH_DELAY_MS);
      });
      host.appendChild(button);
    });

    panel.hidden = host.childElementCount === 0;
    if (status) status.textContent = source === 'ai'
      ? 'Choices adapt as you gather history.'
      : 'Instant fallback choices — scenario remains fully usable.';
  }

  async function requestAiSet(candidatePool, asked) {
    if (!onPatientScenarioPage() || !candidatePool.length || !shouldUseAiEndpoint()) return [];
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(ENDPOINT, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        signal:controller.signal,
        body:JSON.stringify({
          scenarioId:'asthma',
          askedIds:Array.from(asked),
          candidates:candidatePool.map(question => ({ id:question.id }))
        })
      });
      if (!response.ok) return [];
      const payload = await response.json();
      if (!Array.isArray(payload?.questions)) return [];
      const allowed = new Set(candidatePool.map(question => question.id));
      const used = new Set();
      return payload.questions
        .filter(item => item && allowed.has(item.id) && !used.has(item.id) && typeof item.label === 'string')
        .map(item => {
          used.add(item.id);
          return { id:item.id, label:item.label.replace(/\s+/g, ' ').trim().slice(0, 90) };
        })
        .filter(item => item.label.length >= 4)
        .slice(0, MAX_QUICK_REPLIES);
    } catch (_) {
      return [];
    } finally {
      window.clearTimeout(timeout);
    }
  }

  let refreshToken = 0;
  async function refresh() {
    if (!onPatientScenarioPage()) return;
    const id = scenarioId();
    if (!ACTIVE_SCENARIOS.has(id)) return;
    const interview = interviewFor(id);
    if (!interview || !ensurePanel()) return;

    const token = ++refreshToken;
    const asked = askedIds();
    const base = chooseFallbackCandidates(interview, asked);
    renderQuickReplies(base.map(question => ({ id:question.id, label:fallbackLabel(question) })), 'fallback');
    if (!base.length || !shouldUseAiEndpoint()) return;

    const allUnasked = shuffle(interview.questions.filter(question => !asked.has(question.id)));
    const approvedPool = Array.from(new Map([...base, ...allUnasked.slice(0, 8)].map(question => [question.id, question])).values()).slice(0, 10);
    const aiItems = await requestAiSet(approvedPool, asked);
    if (token !== refreshToken || !aiItems.length) return;
    renderQuickReplies(aiItems, 'ai');
  }

  function installObservers() {
    const history = $('historyCategoryList');
    if (history) {
      const observer = new MutationObserver(() => window.setTimeout(refresh, 25));
      observer.observe(history, { subtree:true, childList:true, attributes:true, attributeFilter:['class'] });
    }
    document.addEventListener('click', event => {
      if (event.target.closest?.('#askHistoryCustom')) window.setTimeout(refresh, REFRESH_DELAY_MS);
    });
  }

  function start() {
    if (!onPatientScenarioPage()) return;
    if (!ACTIVE_SCENARIOS.has(scenarioId())) return;
    ensurePanel();
    installObservers();
    window.setTimeout(refresh, 100);
  }

  window.EMSCodeSimAIQuestionLayer = Object.freeze({ version:VERSION, refresh, activeScenarios:Array.from(ACTIVE_SCENARIOS) });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
