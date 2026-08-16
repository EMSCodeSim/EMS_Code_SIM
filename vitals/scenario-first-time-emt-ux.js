(() => {
  'use strict';

  const VERSION = '2026.08.16.7';
  const params = new URLSearchParams(location.search);
  const requested = String(params.get('case') || '').replace(/-/g, '_').toLowerCase();
  const assessmentMode = String(params.get('training') || '').toLowerCase() === 'assessment';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const api = window.EMSCodeSimPatientRecord;
  let observer = null;
  let queued = false;
  let extraTreatmentsShown = false;
  let movementPromptActive = false;
  let activeFirstTimeChoices = [];
  const abcSpoken = new Set();

  function record() {
    try { return window.EMSCodeSimScenarioSession?.sync?.() || api?.active?.() || null; }
    catch (_) { return null; }
  }

  function horseScenario() {
    const current = record();
    return requested === 'horse_crush' || current?.scenarioId === 'horse_crush' || current?.id === 'horse_crush';
  }

  if (!horseScenario()) return;

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function speakPatient(text) {
    const value = clean(text);
    if (!value) return;
    try {
      if (window.EMSCodeSimPatientConversation?.speakPatient) {
        window.EMSCodeSimPatientConversation.speakPatient(value);
        return;
      }
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
      const utterance = new SpeechSynthesisUtterance(value);
      utterance.lang = 'en-US';
      utterance.rate = .96;
      utterance.pitch = 1.04;
      utterance.volume = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  }

  function communicationStage() {
    return document.getElementById('patientCommunicationStage') || document.getElementById('clinicalInteractionColumn');
  }

  function conversationHost() {
    let host = document.getElementById('patientConversationTurn');
    const stage = communicationStage();
    if (!host && stage) {
      host = document.createElement('section');
      host.id = 'patientConversationTurn';
      host.className = 'patient-conversation-turn';
      stage.appendChild(host);
    }
    if (host && stage && host.parentElement !== stage) stage.appendChild(host);
    return host;
  }

  function showPatientStatement(text, label = 'Linda') {
    // ABC speech belongs in the unified communication feed. Never replace an
    // active patient question or its provider-response buttons.
    window.EMSCodeSimCommunicationRouter?.push?.('patient', clean(text));
    speakPatient(text);
  }

  function showPatientChoicePrompt(text, choices) {
    const host = conversationHost();
    if (!host) return false;
    if (host.querySelector('[data-patient-choice]')) return false;
    host.hidden = false;
    host.classList.remove('replying');
    activeFirstTimeChoices = choices;
    host.innerHTML = `
      <header><span aria-hidden="true">👤</span><strong>Linda</strong></header>
      <p class="patient-line">“${clean(text).replace(/[“”"]/g, '')}”</p>
      <div class="patient-conversation-choices">
        ${choices.map((choice, index) => `<button type="button" data-first-time-choice="${index}">${choice.label}</button>`).join('')}
      </div>`;
    speakPatient(text);
    return true;
  }

  function handleFirstTimeChoiceClick(event) {
    const button = event.target.closest?.('#patientConversationTurn [data-first-time-choice]');
    if (!button) return;
    const choice = activeFirstTimeChoices[Number(button.dataset.firstTimeChoice)];
    const host = conversationHost();
    if (!choice || !host) return;
    event.preventDefault();
    event.stopPropagation();
    activeFirstTimeChoices = [];
    choice.onChoose?.();
    host.classList.add('replying');
    host.innerHTML = `<header><span aria-hidden="true">👤</span><strong>Linda</strong></header><p class="patient-line">“${choice.patient.replace(/[“”"]/g, '')}”</p><p class="patient-provider-reply">You: ${choice.label}</p>`;
    speakPatient(choice.patient);
  }

  // 1 + 11: conversation-first center column and stronger visual hierarchy.
  function simplifyConversationCenter() {
    const stage = communicationStage();
    if (!stage) return;
    stage.classList.add('emt-conversation-first');
    const idle = stage.querySelector('.patient-communication-idle');
    if (idle) idle.hidden = true;
    const progress = stage.querySelector('.horse-encounter-progress');
    if (progress) progress.hidden = true;
  }

  // 2: Scene / Crew Update is the single top information surface.
  function renameTopWindow() {
    const info = document.getElementById('infoUpdateWindow');
    if (!info) return;
    info.setAttribute('aria-label', 'Scene and crew updates');
    info.dataset.firstTimeLabel = 'scene-crew';
    const type = document.getElementById('infoUpdateType');
    const title = document.getElementById('infoUpdateTitle');
    if (type && /PATIENT UPDATE/i.test(type.textContent || '')) type.textContent = 'SCENE / CREW';
    if (title && /patient update/i.test(title.textContent || '')) title.textContent = 'Scene / Crew Update';
    const toggle = document.getElementById('infoUpdateVoiceToggle');
    if (toggle) toggle.setAttribute('aria-label', 'Turn automatic scene and crew voice on or off');
    const replay = document.getElementById('infoUpdateReplay');
    if (replay) replay.setAttribute('aria-label', 'Replay the current scene or crew update');
  }

  // 3: the four domains are the only permanent navigation and stay at the bottom.
  function lockDomainRailToBottom() {
    const column = document.getElementById('clinicalInteractionColumn');
    if (!column) return;
    const nav = column.querySelector('.bottom-nav');
    if (!nav) return;
    nav.classList.add('emt-primary-domain-rail');
    const allowed = new Set(['assessmentPanel','vitalsPanel','historyPanel','treatmentPanel']);
    [...nav.querySelectorAll('button[data-panel]')].forEach(button => {
      button.hidden = !allowed.has(button.dataset.panel);
    });
  }

  // 4: right workspace should immediately show actions, not explanatory prose.
  function simplifyRightWorkspace() {
    const root = document.getElementById('clinicalDomainWorkspace') || document.querySelector('.clinical-domain-workspace');
    if (!root) return;
    root.classList.add('emt-action-first-workspace');
    ['assessmentPanel','vitalsPanel','historyPanel','treatmentPanel'].forEach(id => {
      const panel = document.getElementById(id);
      if (!panel) return;
      panel.classList.add('emt-action-first-panel');
      $$(':scope > p, :scope > .sub, :scope > .panel-description, :scope > .domain-description', panel).forEach(node => node.hidden = true);
    });
  }

  function simplifyAssessmentClock() {
    if (!assessmentMode) return;
    const status = document.getElementById('patientClockStatus');
    if (status && status.textContent !== 'Patient clock') status.textContent = 'Patient clock';
  }

  // 6: patient speech itself becomes part of the ABC assessment evidence.
  const ABC_PATIENT_LINES = {
    airway: 'Yes, I can breathe. My hip is what really hurts.',
    breathing: 'I’m breathing okay. It just hurts when I move.',
    perfusion: 'I feel a little shaky, but I’m not dizzy. My hip is still the main thing.',
    mental_status: 'I’m awake. I know where I am. I just want this hip to stop hurting.'
  };

  function maybeSpeakAbc(button) {
    const key = button?.dataset?.assessmentItem || '';
    if (!ABC_PATIENT_LINES[key] || abcSpoken.has(key)) return;
    abcSpoken.add(key);
    window.setTimeout(() => showPatientStatement(ABC_PATIENT_LINES[key]), 80);
  }

  // 5: History is a question launcher; answers live in the center conversation.
  function makeHistoryQuestionLauncher() {
    const panel = document.getElementById('historyPanel');
    if (!panel) return;
    panel.classList.add('history-question-launcher-mode');
    const response = document.getElementById('historyResponseText');
    if (response) response.setAttribute('aria-hidden', 'true');
    $$('.history-question-button', panel).forEach(button => {
      button.title = 'Ask the patient';
      button.setAttribute('aria-label', `Ask patient: ${clean(button.textContent).replace(/Ask again|Ask$/i, '').trim()}`);
    });
  }

  // 7: surface the small, case-relevant set first.
  const PRIMARY_TREATMENT_ORDER = ['splinting','medications','movement','reassessment','resources'];

  function primaryTreatmentGroup(button) {
    const id = String(button?.dataset?.horseTreatmentGroup || '').toLowerCase();
    return PRIMARY_TREATMENT_ORDER.includes(id);
  }

  function simplifyTreatmentGroups() {
    const panel = document.getElementById('treatmentPanel');
    const tools = document.getElementById('treatmentTools');
    if (!panel || !tools) return;
    const groups = $$('[data-horse-treatment-group]', tools);
    if (!groups.length) return;
    const orderedGroups = groups.sort((a,b) => {
        const aId = String(a.dataset.horseTreatmentGroup || '').toLowerCase();
        const bId = String(b.dataset.horseTreatmentGroup || '').toLowerCase();
        const aRank = PRIMARY_TREATMENT_ORDER.indexOf(aId);
        const bRank = PRIMARY_TREATMENT_ORDER.indexOf(bId);
        return (aRank < 0 ? 99 : aRank) - (bRank < 0 ? 99 : bRank);
      });
    const currentOrder = $(':scope > [data-horse-treatment-group]', tools);
    if (orderedGroups.some((button, index) => currentOrder[index] !== button)) {
      orderedGroups.forEach(button => tools.appendChild(button));
    }
    groups.forEach(button => {
      const endEncounter = /transport|handoff/.test(String(button.dataset.horseTreatmentGroup || '').toLowerCase());
      const primary = primaryTreatmentGroup(button);
      button.classList.toggle('horse-case-extra-treatment', !primary && !endEncounter);
      button.classList.toggle('horse-end-encounter-treatment', endEncounter);
      if (!primary && !endEncounter) button.hidden = !extraTreatmentsShown;
      if (endEncounter) button.hidden = true;
    });
    let more = document.getElementById('horseMoreTreatmentsToggle');
    if (!more) {
      more = document.createElement('button');
      more.id = 'horseMoreTreatmentsToggle';
      more.type = 'button';
      more.className = 'horse-more-treatments-toggle';
      more.addEventListener('click', () => {
        extraTreatmentsShown = !extraTreatmentsShown;
        simplifyTreatmentGroups();
      });
      tools.appendChild(more);
    }
    more.textContent = extraTreatmentsShown ? 'Show fewer treatments' : 'More treatments…';
  }

  function treatmentReadyForMovement() {
    const treatments = record()?.treatments || [];
    return treatments.some(item => /manual_leg_support|splint|support|pain/i.test(String(item?.actionId || item?.treatment || item?.name || '')));
  }

  // 8: Movement is a focused consent/cooperation moment.
  function focusMovementWorkspace(active) {
    const panel = document.getElementById('treatmentPanel');
    if (!panel) return;
    panel.classList.toggle('emt-movement-focus', Boolean(active));
  }

  function movementConsentPrompt(button) {
    if (movementPromptActive) return;
    movementPromptActive = true;
    focusMovementWorkspace(true);
    const supported = treatmentReadyForMovement();
    const shown = showPatientChoicePrompt(
      'Hold on. Before you move me, tell me what you’re going to do with my leg.',
      [
        {
          label:'You’re right. We’ll support your leg, move together, and I’ll tell you before we start.',
          patient:supported ? 'Okay. If you keep it supported and go slowly, I’ll work with you.' : 'Okay. Please support it first, then tell me when you’re ready.',
          onChoose:() => {
            movementPromptActive = false;
            focusMovementWorkspace(false);
            if (!supported) return;
            button.dataset.movementConsentReady = '1';
            window.setTimeout(() => button.click(), 80);
          }
        },
        {
          label:'We have to move you, so just stay still.',
          patient:'No. Stop. You haven’t explained anything, and I’m not letting you move me like that.',
          onChoose:() => { movementPromptActive = false; }
        },
        {
          label:'Don’t worry, this won’t hurt.',
          patient:'You can’t promise me that. It already hurts. Tell me what you’re actually going to do.',
          onChoose:() => { movementPromptActive = false; }
        }
      ]
    );
    if (!shown) {
      movementPromptActive = false;
      focusMovementWorkspace(false);
    }
  }

  function interceptMovement(event) {
    const button = event.target.closest?.('[data-movement-id]');
    if (!button || !horseScenario()) return;
    if (button.dataset.movementConsentReady === '1') {
      delete button.dataset.movementConsentReady;
      focusMovementWorkspace(false);
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    movementConsentPrompt(button);
  }

  // 9: transport/handoff is the natural finish of Treatment.
  function makeTransportNaturalEnd() {
    const actions = document.getElementById('horseTransportHandoffActions');
    if (!actions) return;
    actions.classList.add('horse-natural-encounter-end');
    // The endpoint module supplies the single Transport / Handoff heading.
    actions.querySelector('.horse-natural-end-heading')?.remove();
  }

  function hideAssessmentModeHandoffHelp() {
    if (!assessmentMode) return;
    const sample = document.getElementById('showSampleHospitalHandoff');
    if (!sample) return;
    const saved = Boolean(record()?.documentation?.handoffSavedAt);
    sample.hidden = !saved;
  }

  // 10: remove permanent development/status clutter in Assessment Mode.
  function reduceAssessmentChrome() {
    if (!assessmentMode) return;
    $$('.scenario-build-stamp-dark,.horse-encounter-progress,.horse-next-clinical-cue').forEach(node => node.hidden = true);
    const bar = document.getElementById('persistentClinicalBar');
    if (bar) bar.hidden = true;
    const monitor = document.getElementById('desktopPatientMonitor');
    if (monitor) monitor.classList.add('emt-monitor-deemphasized');
    const quick = document.querySelector('.scenario-quick-controls');
    if (quick) quick.classList.add('emt-secondary-quick-controls');
  }

  // 12: one-time, non-blocking first-use tip (not a modal overlay).
  function firstUseOrientation() {
    document.getElementById('emtFirstUseOrientation')?.remove();
    let seen = false;
    try { seen = localStorage.getItem('emscodesim_horse_orientation_v1') === '1'; } catch (_) { seen = true; }
    if (seen || document.getElementById('emtFirstUseTip')) return;
    const tip = document.createElement('aside');
    tip.id = 'emtFirstUseTip';
    tip.className = 'emt-first-use-tip';
    tip.setAttribute('role', 'status');
    tip.innerHTML = `
      <div>
        <strong>Quick tip</strong>
        <p>Start with ABC assessment, then treat and reassess. Use the bottom bar to open History, Treat, and your care record.</p>
      </div>
      <button type="button" data-dismiss-tip>Got it</button>`;
    tip.addEventListener('click', event => {
      if (!event.target.closest?.('[data-dismiss-tip]')) return;
      try { localStorage.setItem('emscodesim_horse_orientation_v1', '1'); } catch (_) {}
      tip.remove();
    });
    document.body.appendChild(tip);
  }

  function installStyles() {
    if (document.querySelector('style[data-first-time-emt-ux]')) return;
    const style = document.createElement('style');
    style.dataset.firstTimeEmtUx = VERSION;
    style.textContent = `
      @media(min-width:980px){
        #clinicalInteractionColumn{display:flex!important;flex-direction:column!important}
        #patientCommunicationStage.emt-conversation-first{justify-content:flex-start!important;padding:14px 2px 6px!important;min-height:280px!important;flex:1 1 auto!important;background:transparent!important;border:0!important;box-shadow:none!important}
        #patientCommunicationStage .patient-communication-idle{display:none!important}
        #patientCommunicationStage #patientConversationTurn{font-size:1rem;border:0!important;background:transparent!important;padding:6px 2px!important;box-shadow:none!important}
        #patientCommunicationStage #patientConversationTurn header{font-size:.72rem!important;margin-bottom:5px!important}
        #patientCommunicationStage .patient-line{font-size:1.08rem!important;line-height:1.48!important;font-weight:760!important}
        #patientCommunicationStage .patient-conversation-choices{gap:8px!important;margin-top:6px!important}
        #patientCommunicationStage .patient-conversation-choices button{min-height:44px!important;font-size:.81rem!important;border-radius:9px!important}
        #clinicalInteractionColumn>.emt-primary-domain-rail{order:99!important;margin-top:auto!important;position:sticky!important;bottom:0!important;z-index:15!important;background:rgba(6,23,34,.96)!important;padding-top:7px!important}
        #clinicalInteractionColumn>.emt-primary-domain-rail button{min-height:44px!important}
        .emt-action-first-workspace .emt-action-first-panel{align-content:start!important}
        .emt-action-first-workspace .emt-action-first-panel>header{margin-bottom:6px!important;padding-bottom:6px!important}
        .emt-action-first-workspace .emt-action-first-panel>header small,.emt-action-first-workspace .emt-action-first-panel>header p{display:none!important}
        #historyPanel.history-question-launcher-mode #historyResponseText,#historyPanel.history-question-launcher-mode .history-response,#historyPanel.history-question-launcher-mode .history-answer,#historyPanel.history-question-launcher-mode [data-history-response]{display:none!important}
        #historyPanel.history-question-launcher-mode .history-question-button{min-height:42px!important}
        #assessmentPanel [data-assessment-category="abc"]{font-weight:900!important}
        #assessmentPanel [data-assessment-item="airway"],#assessmentPanel [data-assessment-item="breathing"],#assessmentPanel [data-assessment-item="perfusion"]{min-height:46px!important;font-size:.86rem!important}
        #assessmentPanel .horse-question-choice,#treatmentPanel [data-horse-treatment-group],#treatmentPanel [data-horse-workspace-plan],#treatmentPanel .horse-treatment-perform{position:relative!important;z-index:3!important;pointer-events:auto!important;touch-action:manipulation!important}
        #treatmentPanel .horse-more-treatments-toggle{width:100%;min-height:40px;margin-top:7px;border:1px dashed rgba(116,181,210,.42);border-radius:9px;background:rgba(8,30,45,.45);color:#b9d7e5;font-weight:800;cursor:pointer}
        #treatmentPanel.emt-movement-focus #treatmentTools,#treatmentPanel.emt-movement-focus #horseTreatmentWorkspaceDetail{opacity:.22;pointer-events:none}
        #treatmentPanel.emt-movement-focus #horseMovementChoices{border-color:rgba(113,211,245,.75)!important;box-shadow:0 0 0 1px rgba(113,211,245,.14),0 12px 30px rgba(0,0,0,.22)}
        #treatmentPanel .horse-natural-encounter-end{margin-top:10px!important;padding-top:10px!important;border-top:1px solid rgba(91,145,171,.35)}
        #treatmentPanel .horse-natural-end-heading{display:grid;gap:2px;margin-bottom:8px}
        #treatmentPanel .horse-natural-end-heading small{font-size:.65rem;font-weight:900;letter-spacing:.09em;color:#8fcbe2}
        #treatmentPanel .horse-natural-end-heading strong{font-size:.98rem;color:#fff}
        #treatmentPanel .horse-natural-end-heading span{font-size:.7rem;line-height:1.35;color:#a8c2cf}
        #infoUpdateWindow[data-first-time-label="scene-crew"]{border-color:rgba(99,160,190,.4)!important}
        #infoUpdateWindow[data-first-time-label="scene-crew"] #infoUpdateText{font-size:.79rem!important;line-height:1.4!important}
        .emt-monitor-deemphasized{opacity:.92}
        .emt-secondary-quick-controls{opacity:.7;transform:scale(.94);transform-origin:right top}
      }
      .emt-first-use-tip{position:fixed;z-index:85;left:10px;right:10px;bottom:calc(78px + env(safe-area-inset-bottom));max-width:420px;margin:0 auto;padding:12px 12px 12px 14px;display:flex;gap:10px;align-items:flex-start;border:1px solid rgba(114,201,235,.45);border-radius:14px;background:rgba(8,30,45,.96);color:#fff;box-shadow:0 12px 30px rgba(0,0,0,.28);backdrop-filter:blur(10px)}
      .emt-first-use-tip strong{display:block;font-size:.82rem;margin-bottom:3px}
      .emt-first-use-tip p{margin:0;color:#c9dce6;font-size:.78rem;line-height:1.4}
      .emt-first-use-tip button{flex:0 0 auto;min-height:40px;padding:8px 12px;border:0;border-radius:10px;background:#d9f3ff;color:#062238;font-weight:900;cursor:pointer}
      @media(min-width:980px){.emt-first-use-tip{left:auto;right:24px;bottom:24px;margin:0}}
      .emt-first-use-orientation{display:none!important}
      .emt-first-use-card{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function reconcile() {
    queued = false;
    simplifyConversationCenter();
    renameTopWindow();
    lockDomainRailToBottom();
    simplifyRightWorkspace();
    simplifyAssessmentClock();
    makeHistoryQuestionLauncher();
    simplifyTreatmentGroups();
    makeTransportNaturalEnd();
    hideAssessmentModeHandoffHelp();
    reduceAssessmentChrome();
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(reconcile);
  }

  function start() {
    installStyles();
    document.addEventListener('click', handleFirstTimeChoiceClick, true);
    document.addEventListener('click', event => {
      const assessment = event.target.closest?.('[data-assessment-item]');
      if (assessment) maybeSpeakAbc(assessment);
    }, true);
    document.addEventListener('click', interceptMovement, true);
    window.addEventListener('emscodesim:treatment-saved', schedule);
    window.addEventListener('emscodesim:scenario-updated', schedule);
    window.addEventListener('emscodesim:transport-saved', schedule);
    observer = new MutationObserver(mutations => {
      const relevant = mutations.some(mutation => {
        const target = mutation.target?.nodeType === 1 ? mutation.target : mutation.target?.parentElement;
        if (target?.closest?.('#patientCommunicationStage,#assessmentFollowupHost,#horseAssessmentInlineQuestion,#horseClinicalQuestionBox,#treatmentTools')) return false;
        return Boolean(target?.closest?.('#infoUpdateWindow,#historyPanel,#treatmentPanel,#hospitalHandoffWorkspace,#patientClockStatus,#clinicalInteractionColumn,.clinical-domain-workspace'));
      });
      if (relevant) schedule();
    });
    observer.observe(document.body, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['hidden','class'] });
    schedule();
    window.setTimeout(schedule, 250);
    window.setTimeout(() => { schedule(); firstUseOrientation(); }, 900);
    window.addEventListener('pagehide', () => observer?.disconnect(), { once:true });
  }

  window.EMSCodeSimFirstTimeEmtUx = Object.freeze({ version:VERSION, refresh:schedule });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
