(() => {
  'use strict';

  const VERSION = '2026.08.12.1';
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
    const host = conversationHost();
    if (!host) return;
    host.hidden = false;
    host.classList.remove('replying');
    host.innerHTML = `<header><span aria-hidden="true">👤</span><strong>${label}</strong></header><p class="patient-line">“${clean(text).replace(/[“”"]/g, '')}”</p>`;
    const idle = document.querySelector('#patientCommunicationStage .patient-communication-idle');
    if (idle) idle.hidden = true;
    speakPatient(text);
  }

  function showPatientChoicePrompt(text, choices) {
    const host = conversationHost();
    if (!host) return;
    host.hidden = false;
    host.classList.remove('replying');
    host.innerHTML = `
      <header><span aria-hidden="true">👤</span><strong>Linda</strong></header>
      <p class="patient-line">“${clean(text).replace(/[“”"]/g, '')}”</p>
      <div class="patient-conversation-choices">
        ${choices.map((choice, index) => `<button type="button" data-patient-choice="${index}" data-first-time-choice="${index}">${choice.label}</button>`).join('')}
      </div>`;
    host.querySelectorAll('[data-first-time-choice]').forEach(button => {
      button.addEventListener('click', () => {
        const choice = choices[Number(button.dataset.firstTimeChoice)];
        if (!choice) return;
        if (choice.onChoose) choice.onChoose();
        host.classList.add('replying');
        host.innerHTML = `<header><span aria-hidden="true">👤</span><strong>Linda</strong></header><p class="patient-line">“${choice.patient.replace(/[“”"]/g, '')}”</p><p class="patient-provider-reply">You: ${choice.label}</p>`;
        speakPatient(choice.patient);
      });
    });
    speakPatient(text);
  }

  function renameTopWindow() {
    const info = document.getElementById('infoUpdateWindow');
    if (!info) return;
    info.setAttribute('aria-label', 'Scene and crew updates');
    const type = document.getElementById('infoUpdateType');
    if (type && /PATIENT UPDATE/i.test(type.textContent || '')) type.textContent = 'SCENE / CREW';
    const title = document.getElementById('infoUpdateTitle');
    if (title && /patient update/i.test(title.textContent || '')) title.textContent = 'Scene / crew update';
    const toggle = document.getElementById('infoUpdateVoiceToggle');
    if (toggle) toggle.setAttribute('aria-label', 'Turn automatic scene and crew voice on or off');
    const replay = document.getElementById('infoUpdateReplay');
    if (replay) replay.setAttribute('aria-label', 'Replay the current scene or crew update');
  }

  function simplifyAssessmentClock() {
    if (!assessmentMode) return;
    const status = document.getElementById('patientClockStatus');
    if (status && status.textContent !== 'Patient clock') status.textContent = 'Patient clock';
  }

  const ABC_PATIENT_LINES = {
    airway: 'Yes, I can breathe. My hip is what really hurts.',
    breathing: 'I’m breathing okay. It just hurts when I move.',
    mental_status: 'I’m awake. I know where I am. I just want this hip to stop hurting.'
  };

  function maybeSpeakAbc(button) {
    const key = button?.dataset?.assessmentItem || '';
    if (!ABC_PATIENT_LINES[key] || abcSpoken.has(key)) return;
    abcSpoken.add(key);
    window.setTimeout(() => showPatientStatement(ABC_PATIENT_LINES[key]), 80);
  }

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

  function primaryTreatmentGroup(button) {
    const id = String(button?.dataset?.horseTreatmentGroup || '').toLowerCase();
    const text = clean(button?.textContent).toLowerCase();
    return /splint|support|pain|medicat|circulation|shock|resource|trauma/.test(`${id} ${text}`);
  }

  function simplifyTreatmentGroups() {
    const panel = document.getElementById('treatmentPanel');
    const tools = document.getElementById('treatmentTools');
    if (!panel || !tools) return;
    const groups = $$('[data-horse-treatment-group]', tools);
    if (!groups.length) return;

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

  function movementConsentPrompt(button) {
    if (movementPromptActive) return;
    movementPromptActive = true;
    const supported = treatmentReadyForMovement();
    showPatientChoicePrompt(
      'Hold on. Before you move me, tell me what you’re going to do with my leg.',
      [
        {
          label:'You’re right. We’ll support your leg, move together, and I’ll tell you before we start.',
          patient:supported ? 'Okay. If you keep it supported and go slowly, I’ll work with you.' : 'Okay. Please support it first, then tell me when you’re ready.',
          onChoose:() => {
            movementPromptActive = false;
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
  }

  function interceptMovement(event) {
    const button = event.target.closest?.('[data-movement-id]');
    if (!button || !horseScenario()) return;
    if (button.dataset.movementConsentReady === '1') {
      delete button.dataset.movementConsentReady;
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    movementConsentPrompt(button);
  }

  function makeTransportNaturalEnd() {
    const panel = document.getElementById('treatmentPanel');
    const movement = document.getElementById('horseMovementChoices');
    const actions = document.getElementById('horseTransportHandoffActions');
    if (!panel || !actions) return;
    actions.classList.add('horse-natural-encounter-end');
    if (movement?.parentElement === panel && actions.previousElementSibling !== movement) {
      movement.insertAdjacentElement('afterend', actions);
    }
    if (!actions.querySelector('.horse-natural-end-heading')) {
      const heading = document.createElement('div');
      heading.className = 'horse-natural-end-heading';
      heading.innerHTML = '<small>END OF ENCOUNTER</small><strong>Ready to transport?</strong><span>Choose transport when assessment, treatment, and movement planning are complete.</span>';
      actions.prepend(heading);
    }
  }

  function hideAssessmentModeHandoffHelp() {
    if (!assessmentMode) return;
    const sample = document.getElementById('showSampleHospitalHandoff');
    if (!sample) return;
    const saved = Boolean(record()?.documentation?.handoffSavedAt);
    sample.hidden = !saved;
  }

  function installStyles() {
    if (document.querySelector('style[data-first-time-emt-ux]')) return;
    const style = document.createElement('style');
    style.dataset.firstTimeEmtUx = VERSION;
    style.textContent = `
      @media(min-width:980px){
        #patientCommunicationStage{justify-content:flex-start!important;padding-top:12px!important;min-height:250px!important}
        #patientCommunicationStage .patient-communication-idle{display:none!important}
        #patientCommunicationStage #patientConversationTurn{font-size:1rem}
        #patientCommunicationStage .patient-line{font-size:1rem!important;line-height:1.45!important}
        #patientCommunicationStage .patient-conversation-choices{gap:8px!important}
        #patientCommunicationStage .patient-conversation-choices button{min-height:42px!important;font-size:.8rem!important}
        #historyPanel.history-question-launcher-mode #historyResponseText,
        #historyPanel.history-question-launcher-mode .history-response,
        #historyPanel.history-question-launcher-mode .history-answer,
        #historyPanel.history-question-launcher-mode [data-history-response]{display:none!important}
        #treatmentPanel .horse-more-treatments-toggle{width:100%;min-height:38px;margin-top:7px;border:1px dashed rgba(116,181,210,.42);border-radius:9px;background:rgba(8,30,45,.45);color:#b9d7e5;font-weight:800;cursor:pointer}
        #treatmentPanel .horse-natural-encounter-end{margin-top:10px!important;padding-top:10px!important;border-top:1px solid rgba(91,145,171,.35)}
        #treatmentPanel .horse-natural-end-heading{display:grid;gap:2px;margin-bottom:8px}
        #treatmentPanel .horse-natural-end-heading small{font-size:.65rem;font-weight:900;letter-spacing:.09em;color:#8fcbe2}
        #treatmentPanel .horse-natural-end-heading strong{font-size:.95rem;color:#fff}
        #treatmentPanel .horse-natural-end-heading span{font-size:.7rem;line-height:1.35;color:#a8c2cf}
      }
    `;
    document.head.appendChild(style);
  }

  function reconcile() {
    queued = false;
    renameTopWindow();
    simplifyAssessmentClock();
    makeHistoryQuestionLauncher();
    simplifyTreatmentGroups();
    makeTransportNaturalEnd();
    hideAssessmentModeHandoffHelp();
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(reconcile);
  }

  function start() {
    installStyles();
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
        return Boolean(target?.closest?.('#infoUpdateWindow,#historyPanel,#treatmentPanel,#hospitalHandoffWorkspace,#patientClockStatus'));
      });
      if (relevant) schedule();
    });
    observer.observe(document.body, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['hidden','class'] });
    schedule();
    window.setTimeout(schedule, 250);
    window.setTimeout(schedule, 900);
    window.addEventListener('pagehide', () => observer?.disconnect(), { once:true });
  }

  window.EMSCodeSimFirstTimeEmtUx = Object.freeze({ version:VERSION, refresh:schedule });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
