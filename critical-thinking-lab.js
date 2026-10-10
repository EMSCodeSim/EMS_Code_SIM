(() => {
  'use strict';

  const STORAGE_KEY = 'emscode_critical_thinking_lab_v1';
  const state = { scenarios: [], mode: 'solo', scenario: null, level: 'EMT', team: [], index: 0, decisions: [], roomToken: null, roomSession: null, dirty: false, roomSavePending: 0, pollTimer: null };
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
  const stages = [
    { id:'arrival', title:'You arrive on scene', prompt:'What is your first priority, and what will you do next?', help:'Use the dispatch and scene details. State what you notice before you choose an action.', facts:s => [['Dispatch',s.dispatch],['Scene',s.scene]] },
    { id:'history', title:'You gather more history', prompt:'How does this information change your working picture?', help:'Which details matter most? What important question or uncertainty remains?', facts:s => [['History', (s.history || []).slice(0,4).join(' ')]] },
    { id:'assessment', title:'You complete an assessment', prompt:'What finding drives your next decision?', help:'Connect the findings to your priority. Name what you would reassess or clarify.', facts:s => [['Assessment findings',(s.findings || []).slice(0,5).join(' ')]] },
    { id:'vitals', title:'You obtain vital signs', prompt:'What do the vital signs add, and what will you do with them?', help:'Describe what concerns you, what you would trend, and what could change your plan.', facts:s => [['Vital signs',(s.vitals || []).slice(0,3).join(' ')]] },
    { id:'reassessment', title:'The patient’s course develops', prompt:'How will you adapt and communicate your plan?', help:'Use the new information. Explain what you would reassess and what needs to be communicated to the team.', facts:s => [['Patient response',s.response || 'No additional response is available for this case.']] }
  ];
  const el = {
    modeButtons:[...document.querySelectorAll('[data-mode]')], groupSetup:$('#groupSetup'), teamNames:$('#teamNames'), level:$('#levelSelect'), scenario:$('#caseSelect'), begin:$('#beginBtn'), status:$('#libraryStatus'),
    start:$('#startPanel'), work:$('#workPanel'), debrief:$('#debriefPanel'), meta:$('#caseMeta'), title:$('#scenarioTitle'), dispatch:$('#scenarioDispatch'), phase:$('#phaseLabel'), count:$('#phaseCount'), fill:$('#progressFill'), facts:$('#currentFacts'), roles:$('#groupRoles'), promptTitle:$('#promptTitle'), help:$('#promptHelp'), decision:$('#decisionText'), reasoning:$('#reasoningText'), form:$('#decisionForm'), next:$('#nextBtn'), save:$('#saveStatus'), trail:$('#decisionTrail'),
    debriefLabel:$('#debriefModeLabel'), summary:$('#debriefSummary'), ai:$('#aiDebrief'), createRoom:$('#createRoomBtn'), roomCode:$('#roomCode'), joinRoom:$('#joinRoomBtn'), roomStatus:$('#roomStatus'), roomShare:$('#roomShare'), roomShareUrl:$('#roomShareUrl'), copyRoom:$('#copyRoomBtn'),
  };

  function setMode(mode) {
    state.mode = mode === 'group' ? 'group' : 'solo';
    el.modeButtons.forEach(button => button.classList.toggle('active', button.dataset.mode === state.mode));
    el.groupSetup.hidden = state.mode !== 'group';
  }

  function populateScenarios() {
    const available = state.level === 'Paramedic' ? state.scenarios : state.scenarios.filter(item => item.level !== 'Paramedic');
    el.scenario.innerHTML = '<option value="">Choose a scenario</option>' + available.map(item => `<option value="${esc(item.id)}">${esc(item.title)} · ${esc(item.category)}</option>`).join('');
    el.begin.disabled = !available.length;
  }

  function loadProgress(id) {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved?.scenarioId === id && saved?.level === state.level && saved?.mode === state.mode && Array.isArray(saved.decisions)) return saved;
    } catch (_) {}
    return null;
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ scenarioId:state.scenario.id, level:state.level, mode:state.mode, team:state.team, index:state.index, decisions:state.decisions, savedAt:new Date().toISOString() }));
      el.save.textContent = state.roomToken ? 'Saving to this device and online session…' : 'Progress saved on this device.';
    } catch (_) { el.save.textContent = 'Could not save on this device. Keep this tab open.'; }
    if (state.roomToken) saveRoomProgress().catch(() => { el.save.textContent = 'Device copy saved; online sync needs a retry.'; });
  }

  async function saveRoomProgress() {
    if (!state.roomToken || !state.scenario) return;
    state.roomSavePending += 1;
    try {
      const response = await fetch('/.netlify/functions/critical-thinking-sessions', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'save',token:state.roomToken,currentStage:state.index,decisions:state.decisions.map(item => ({action:item.action,reasoning:item.reasoning}))})
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Online session sync failed.');
      el.save.textContent = 'Progress saved on this device and online session.';
    } finally { state.roomSavePending = Math.max(0, state.roomSavePending - 1); }
  }

  function displayRoomLink(token) {
    const url = new URL(window.location.href);
    url.searchParams.set('room', token);
    el.roomShareUrl.value = url.toString();
    el.roomShare.hidden = false;
    el.roomCode.value = token;
    history.replaceState(null, '', url.toString());
  }

  function tokenFromInput(value) {
    const raw = String(value || '').trim();
    try { return new URL(raw).searchParams.get('room') || raw; } catch (_) { return raw; }
  }

  async function createRoom() {
    const scenarioId = el.scenario.value;
    if (!state.scenarios.some(item => item.id === scenarioId)) {
      el.roomStatus.textContent = 'Choose a scenario before creating an online session.';
      el.scenario.focus();
      return;
    }
    el.createRoom.disabled = true;
    el.roomStatus.textContent = 'Creating your private online session…';
    try {
      const response = await fetch('/.netlify/functions/critical-thinking-sessions', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'create',scenarioId,level:el.level.value,mode:state.mode})
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.token) throw new Error(payload.error || 'Could not create an online session.');
      state.roomToken = payload.token;
      state.roomSession = {currentStage:0,decisions:[]};
      displayRoomLink(payload.token);
      el.roomStatus.textContent = `Online session created. Its private link expires in ${payload.expiresInDays} days.`;
      beginRun();
    } catch (error) {
      el.roomStatus.textContent = error.message || 'Online session storage is temporarily unavailable.';
    } finally { el.createRoom.disabled = false; }
  }

  async function joinRoom(tokenValue = el.roomCode.value) {
    const token = tokenFromInput(tokenValue);
    if (!/^[a-f0-9]{48}$/.test(token)) { el.roomStatus.textContent = 'Paste a valid room code or private session link.'; return; }
    el.joinRoom.disabled = true;
    el.roomStatus.textContent = 'Loading the shared session…';
    try {
      const response = await fetch(`/.netlify/functions/critical-thinking-sessions?token=${encodeURIComponent(token)}`, {cache:'no-store'});
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.session) throw new Error(payload.error || 'Could not load this online session.');
      const session = payload.session;
      const scenario = state.scenarios.find(item => item.id === session.scenarioId);
      if (!scenario) throw new Error('The case linked to this session is no longer in the scenario library.');
      state.roomToken = token;
      state.roomSession = session;
      state.level = session.level;
      el.level.value = session.level;
      setMode(session.mode);
      populateScenarios();
      el.scenario.value = scenario.id;
      state.team = [];
      displayRoomLink(token);
      el.roomStatus.textContent = `Joined the ${session.mode === 'group' ? 'group' : 'solo'} session. Shared progress is saved online for 30 days.`;
      beginRun();
    } catch (error) {
      el.roomStatus.textContent = error.message || 'Could not load this online session.';
    } finally { el.joinRoom.disabled = false; }
  }

  function beginRun() {
    const id = el.scenario.value;
    const scenario = state.scenarios.find(item => item.id === id);
    if (!scenario) { el.status.textContent = 'Choose a scenario to begin.'; return; }
    state.scenario = scenario;
    state.level = el.level.value;
    state.team = state.mode === 'group' ? el.teamNames.value.split(',').map(value => value.trim()).filter(Boolean).slice(0,8) : [];
    const saved = state.roomToken ? state.roomSession : loadProgress(id);
    state.index = saved ? Math.min(saved.currentStage ?? saved.index ?? 0, stages.length - 1) : 0;
    state.decisions = saved && Array.isArray(saved.decisions) ? saved.decisions : [];
    el.start.classList.add('hidden'); el.debrief.classList.add('hidden'); el.work.classList.remove('hidden');
    el.meta.textContent = `${scenario.category} · ${state.level} · ${state.mode === 'group' ? 'Group discussion' : 'Solo practice'}`;
    el.title.textContent = scenario.title;
    el.dispatch.textContent = scenario.dispatch;
    state.dirty = false;
    renderStage();
    startRoomPolling();
    el.work.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function renderFacts(stage) {
    const items = stage.facts(state.scenario);
    el.facts.innerHTML = items.map(([label,value]) => `<div class="ct-fact"><strong>${esc(label)}</strong><span>${esc(value)}</span></div>`).join('');
  }

  function renderTrail() {
    el.trail.innerHTML = state.decisions.map((item,index) => `<li><strong>${esc(stages[index].title)}:</strong> ${esc(item.action)}</li>`).join('');
  }

  function renderStage(options = {}) {
    const stage = stages[state.index];
    const existing = state.decisions[state.index];
    el.phase.textContent = stage.title;
    el.count.textContent = `${state.index + 1} of ${stages.length}`;
    el.fill.style.width = `${Math.round((state.index / stages.length) * 100)}%`;
    el.promptTitle.textContent = stage.prompt;
    el.help.textContent = stage.help;
    el.decision.value = existing?.action || '';
    el.reasoning.value = existing?.reasoning || '';
    el.next.textContent = state.index === stages.length - 1 ? 'Finish and debrief' : 'Record decision';
    renderFacts(stage);
    const role = state.team.length ? state.team[state.index % state.team.length] : '';
    el.roles.hidden = state.mode !== 'group';
    el.roles.innerHTML = state.mode === 'group' ? `<strong>${role ? `Decision lead: ${esc(role)}` : 'Choose a team member to lead this decision.'}</strong><span>Invite the rest of the team to name the clues they noticed and what could change their plan.</span>` : '';
    renderTrail();
    if (!options.skipSave) saveProgress();
  }

  function startRoomPolling() {
    if (state.pollTimer) window.clearInterval(state.pollTimer);
    if (!state.roomToken) return;
    state.pollTimer = window.setInterval(async () => {
      if (!state.scenario || state.dirty || state.roomSavePending || el.work.classList.contains('hidden')) return;
      try {
        const response = await fetch(`/.netlify/functions/critical-thinking-sessions?token=${encodeURIComponent(state.roomToken)}`, {cache:'no-store'});
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.session) return;
        const session = payload.session;
        const decisions = Array.isArray(session.decisions) ? session.decisions.map(item => ({action:item.action,reasoning:item.reasoning,role:''})) : [];
        if (session.scenarioId !== state.scenario.id) return;
        if (session.currentStage === state.index && JSON.stringify(decisions) === JSON.stringify(state.decisions.map(item => ({action:item.action,reasoning:item.reasoning,role:''})))) return;
        state.roomSession = session;
        state.index = Math.min(session.currentStage, stages.length - 1);
        state.decisions = decisions;
        state.dirty = false;
        renderStage({skipSave:true});
        el.save.textContent = 'Shared room update received.';
      } catch (_) {}
    }, 7000);
  }

  async function recordDecision(event) {
    event.preventDefault();
    const action = el.decision.value.trim();
    const reasoning = el.reasoning.value.trim();
    if (action.length < 8 || reasoning.length < 12) {
      el.save.textContent = 'Add a clear next action and a brief explanation before continuing.';
      (!action || action.length < 8 ? el.decision : el.reasoning).focus();
      return;
    }
    state.decisions[state.index] = { action, reasoning, role:state.team.length ? state.team[state.index % state.team.length] : '' };
    state.dirty = false;
    if (state.index < stages.length - 1) { state.index += 1; renderStage(); return; }
    saveProgress();
    if (state.roomToken) { try { await saveRoomProgress(); } catch (_) {} }
    finishRun();
  }

  function renderDebrief(payload) {
    const result = payload?.debrief;
    if (!result) { el.ai.innerHTML = '<div class="ct-feedback-card"><h3>AI feedback is unavailable</h3><p>Your decision trail is still saved on this device. Review the case with an instructor or try again later.</p></div>'; return; }
    const rubric = Array.isArray(result.rubric) ? result.rubric : [];
    const pills = rubric.map(item => `<span class="ct-score-pill">${esc(item.label)} · ${esc(item.score)}/4</span>`).join('');
    const list = items => `<ul>${(Array.isArray(items) ? items : []).map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
    el.ai.innerHTML = `<div class="ct-score-row">${pills}</div><div class="ct-feedback-grid"><article class="ct-feedback-card"><h3>How your thinking developed</h3><p>${esc(result.summary)}</p></article><article class="ct-feedback-card"><h3>Strong reasoning</h3>${list(result.strengths)}</article><article class="ct-feedback-card"><h3>Try next time</h3>${list(result.opportunities)}</article><article class="ct-feedback-card"><h3>Reflect as a team</h3><p>${esc(result.reflectionQuestion)}</p></article></div>`;
  }

  async function finishRun() {
    el.work.classList.add('hidden'); el.debrief.classList.remove('hidden');
    el.debriefLabel.textContent = `${state.mode === 'group' ? 'Group discussion' : 'Solo practice'} · ${state.scenario.title}`;
    const actions = state.decisions.map((decision,index) => `<li><strong>${esc(stages[index].title)}</strong><br>${esc(decision.action)}<br><span>${esc(decision.reasoning)}</span></li>`).join('');
    el.summary.innerHTML = `<strong>Your decision trail</strong><ol>${actions}</ol><p><strong>Scenario course:</strong> ${esc(state.scenario.response)} ${esc(state.scenario.disposition)}</p>`;
    $('#aiLoading').classList.remove('hidden');
    el.ai.innerHTML = '<div class="ct-ai-loading" id="aiLoading"><span class="ct-spinner" aria-hidden="true"></span><span>Preparing your AI-guided debrief…</span></div>';
    try {
      const response = await fetch('/.netlify/functions/critical-thinking-coach', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenarioId:state.scenario.id,level:state.level,mode:state.mode,decisions:state.decisions})});
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'AI feedback is unavailable.');
      renderDebrief(payload);
    } catch (_) { renderDebrief(null); }
    el.debrief.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function resetRun() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    if (state.pollTimer) window.clearInterval(state.pollTimer);
    state.pollTimer = null;
    state.scenario = null; state.index = 0; state.decisions = []; state.roomToken = null; state.roomSession = null;
    el.roomShare.hidden = true;
    const url = new URL(window.location.href); url.searchParams.delete('room'); history.replaceState(null, '', url.toString());
    el.work.classList.add('hidden'); el.debrief.classList.add('hidden'); el.start.classList.remove('hidden');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  el.modeButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  el.level.addEventListener('change', populateScenarios);
  el.begin.addEventListener('click', beginRun);
  el.form.addEventListener('submit', recordDecision);
  el.decision.addEventListener('input', () => { state.dirty = true; });
  el.reasoning.addEventListener('input', () => { state.dirty = true; });
  $('#changeRun').addEventListener('click', resetRun);
  $('#newRunBtn').addEventListener('click', resetRun);
  $('#mobileMenu').addEventListener('change', event => { if (event.target.value) location.href = event.target.value; });
  el.createRoom.addEventListener('click', createRoom);
  el.joinRoom.addEventListener('click', () => joinRoom());
  el.copyRoom.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(el.roomShareUrl.value); el.roomStatus.textContent = 'Private session link copied. Anyone with it can access this session.'; }
    catch (_) { el.roomShareUrl.focus(); el.roomShareUrl.select(); el.roomStatus.textContent = 'Select and copy the private session link to share it.'; }
  });

  fetch('/data/narrative-lab-scenarios.json', {cache:'no-cache'})
    .then(response => { if (!response.ok) throw new Error('Scenario library could not be loaded.'); return response.json(); })
    .then(scenarios => {
      state.scenarios = Array.isArray(scenarios) ? scenarios.filter(item => item?.id && item?.dispatch && item?.scene) : [];
      populateScenarios();
      el.status.textContent = `${state.scenarios.length} current fictional cases loaded. Practice can stay on this device or use an optional online session.`;
      const linkedRoom = new URLSearchParams(window.location.search).get('room');
      if (linkedRoom) { el.roomCode.value = linkedRoom; joinRoom(linkedRoom); }
    })
    .catch(() => { el.status.textContent = 'The scenario library could not be loaded. Please refresh and try again.'; el.begin.disabled = true; });
})();
