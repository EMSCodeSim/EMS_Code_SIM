(() => {
  'use strict';

  const VERSION = '2026.08.11.1';
  const desktopQuery = window.matchMedia('(min-width:980px)');
  let observer = null;
  let lastSignature = '';
  let pulseTimer = 0;

  const $ = id => document.getElementById(id);

  function desktopActive() {
    return desktopQuery.matches && document.body.classList.contains('desktop-scenario-layout');
  }

  function historyActive() {
    return document.querySelector('.bottom-nav button[data-panel="historyPanel"].active') !== null;
  }

  function ensureLayer() {
    const stage = document.querySelector('.patient-stage');
    if (!stage) return null;
    let layer = $('patientConversationLayer');
    if (layer) {
      if (layer.parentElement !== stage) stage.appendChild(layer);
      return layer;
    }

    layer = document.createElement('section');
    layer.id = 'patientConversationLayer';
    layer.className = 'patient-conversation-layer';
    layer.hidden = true;
    layer.setAttribute('aria-live', 'polite');
    layer.setAttribute('aria-label', 'Patient conversation');
    layer.innerHTML = `
      <div class="patient-conversation-speaker" aria-hidden="true">
        <span class="patient-conversation-avatar">●</span>
        <i></i><i></i><i></i>
      </div>
      <div class="patient-conversation-bubble">
        <div class="patient-conversation-head">
          <span id="patientConversationResponder">PATIENT</span>
          <small id="patientConversationState">READY TO TALK</small>
        </div>
        <p id="patientConversationQuestion" class="patient-conversation-question">Choose a question from History.</p>
        <blockquote id="patientConversationResponse">Ask the patient what you need to know.</blockquote>
      </div>`;
    stage.appendChild(layer);
    return layer;
  }

  function normalizedQuestion() {
    const raw = $('historyResponseQuestion')?.textContent?.trim() || '';
    if (!raw || /focused questions|select a question|begin the interview/i.test(raw)) return '';
    return raw;
  }

  function normalizedResponse() {
    const raw = $('historyResponseText')?.textContent?.trim() || '';
    if (!raw || /select a question to begin/i.test(raw)) return '';
    return raw;
  }

  function pulse(layer) {
    layer.classList.remove('patient-conversation-new');
    void layer.offsetWidth;
    layer.classList.add('patient-conversation-new');
    window.clearTimeout(pulseTimer);
    pulseTimer = window.setTimeout(() => layer.classList.remove('patient-conversation-new'), 900);
  }

  function sync() {
    const layer = ensureLayer();
    if (!layer) return;

    if (!desktopActive() || !historyActive()) {
      layer.hidden = true;
      document.body.classList.remove('patient-conversation-active');
      return;
    }

    layer.hidden = false;
    document.body.classList.add('patient-conversation-active');

    const responder = $('historyResponderLabel')?.textContent?.trim() || 'PATIENT';
    const communication = $('historyCommunicationStatus')?.textContent?.trim() || 'Ready to answer questions';
    const question = normalizedQuestion();
    const response = normalizedResponse();

    const responderNode = $('patientConversationResponder');
    const stateNode = $('patientConversationState');
    const questionNode = $('patientConversationQuestion');
    const responseNode = $('patientConversationResponse');

    if (responderNode) responderNode.textContent = responder.toUpperCase();
    if (stateNode) stateNode.textContent = response ? 'RESPONDING' : communication.toUpperCase();
    if (questionNode) questionNode.textContent = question ? `You: ${question}` : 'You: Choose a question from History.';
    if (responseNode) responseNode.textContent = response || 'Ask the patient what you need to know.';

    const signature = `${responder}|${question}|${response}`;
    if (response && signature !== lastSignature) pulse(layer);
    lastSignature = signature;
  }

  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver(mutations => {
      const relevant = mutations.some(mutation => {
        const target = mutation.target.nodeType === Node.TEXT_NODE ? mutation.target.parentElement : mutation.target;
        return target?.closest?.('#historyPanel,.bottom-nav,#actionSheet');
      });
      if (relevant) window.requestAnimationFrame(sync);
    });
    observer.observe(document.body, { subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['class','hidden'] });
  }

  function start() {
    ensureLayer();
    document.addEventListener('click', event => {
      if (event.target.closest?.('#historyPanel,.bottom-nav')) window.setTimeout(sync, 0);
    }, true);
    desktopQuery.addEventListener?.('change', sync);
    window.addEventListener('resize', sync, { passive:true });
    window.addEventListener('emscodesim:patient-record-updated', sync);
    window.addEventListener('pageshow', sync);
    startObserver();
    sync();
  }

  window.EMSCodeSimPatientConversation = Object.freeze({ version:VERSION, sync });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
