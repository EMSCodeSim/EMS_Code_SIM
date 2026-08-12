(() => {
  'use strict';

  const VERSION = '2026.08.12.1';
  const params = new URLSearchParams(location.search);
  const requested = String(params.get('case') || '').replace(/-/g, '_').toLowerCase();
  const $ = id => document.getElementById(id);
  const api = window.EMSCodeSimPatientRecord;
  const session = window.EMSCodeSimScenarioSession;
  let infoObserver = null;
  let bodyObserver = null;
  let historyObserver = null;
  let restoreGuard = false;
  let reconcileQueued = false;
  let lastPatientSignature = '';
  let lastPatientShownAt = 0;
  let lastExternalInfo = null;

  function record() {
    try { return session?.sync?.() || api?.active?.() || null; }
    catch (_) { return null; }
  }

  function horseScenario() {
    const current = record();
    return requested === 'horse_crush'
      || current?.scenarioId === 'horse_crush'
      || current?.id === 'horse_crush';
  }

  if (!horseScenario()) return;

  const clean = value => String(value || '')
    .replace(/[“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const normalize = value => clean(value).toLowerCase();

  function infoSnapshot() {
    return {
      type: clean($('infoUpdateType')?.textContent),
      title: clean($('infoUpdateTitle')?.textContent),
      text: clean($('infoUpdateText')?.textContent)
    };
  }

  function patientInfo(snapshot = infoSnapshot()) {
    const type = `${snapshot.type} ${snapshot.title}`.toUpperCase();
    const text = snapshot.text;
    return /PATIENT|HISTORY ANSWER|PATIENT RESPONSE|PATIENT QUESTION|SAMPLE ANSWER|OPQRST ANSWER/.test(type)
      || /^[“\"]/u.test(text);
  }

  function partnerInfo(snapshot = infoSnapshot()) {
    return /PARTNER|CREW MEMBER|ASSIGNED/i.test(`${snapshot.type} ${snapshot.title} ${snapshot.text}`);
  }

  function vitalInfo(snapshot = infoSnapshot()) {
    return /VITAL|BLOOD PRESSURE|\bBP\b|PULSE|HEART RATE|RESPIRAT|SPO[₂2]|OXYGEN SATURATION|GLUCOSE|TEMPERATURE/i.test(`${snapshot.type} ${snapshot.title} ${snapshot.text}`);
  }

  function rememberExternalInfo(snapshot) {
    if (!snapshot?.text || patientInfo(snapshot)) return;
    lastExternalInfo = { ...snapshot };
  }

  function fallbackExternalInfo() {
    const current = record();
    const dispatch = clean(current?.dispatch || current?.scenario?.dispatch || '');
    return {
      type:'DISPATCH',
      title:'Scene information',
      text:dispatch || 'Continue gathering information from the scene, your partner, observations, and patient care.'
    };
  }

  function restoreExternalInfo() {
    if (restoreGuard) return;
    const typeNode = $('infoUpdateType');
    const titleNode = $('infoUpdateTitle');
    const textNode = $('infoUpdateText');
    if (!typeNode || !titleNode || !textNode) return;
    const snapshot = lastExternalInfo || fallbackExternalInfo();
    restoreGuard = true;
    try {
      if (typeNode.textContent !== snapshot.type) typeNode.textContent = snapshot.type;
      if (titleNode.textContent !== snapshot.title) titleNode.textContent = snapshot.title;
      if (textNode.textContent !== snapshot.text) textNode.textContent = snapshot.text;
    } finally {
      queueMicrotask(() => { restoreGuard = false; });
    }
  }

  function ensureStage() {
    const column = $('clinicalInteractionColumn');
    if (!column) return null;
    let stage = $('patientCommunicationStage');
    if (!stage) {
      stage = document.createElement('section');
      stage.id = 'patientCommunicationStage';
      stage.className = 'patient-communication-stage';
      stage.setAttribute('aria-label', 'Patient communication');
      stage.innerHTML = '<div class="patient-communication-idle"><small>PATIENT COMMUNICATION</small><p>Patient questions, answers, and quick responses appear here.</p></div>';
    }
    const nav = column.querySelector('.bottom-nav.clinical-domain-rail, .bottom-nav');
    if (stage.parentElement !== column) {
      if (nav?.parentElement === column) nav.insertAdjacentElement('beforebegin', stage);
      else column.appendChild(stage);
    } else if (nav?.parentElement === column && stage.nextElementSibling !== nav) {
      nav.insertAdjacentElement('beforebegin', stage);
    }
    return stage;
  }

  function placePatientControls() {
    const stage = ensureStage();
    if (!stage) return;
    const host = $('patientConversationTurn');
    if (host && host.parentElement !== stage) stage.appendChild(host);

    // SAMPLE/history and assessment follow-up interaction belongs with the patient,
    // not in the top information window. Keep the original live controls so their
    // existing handlers, grading, and persistence remain intact.
    const clinical = $('horseClinicalQuestionBox');
    if (clinical && clinical.parentElement !== stage) stage.appendChild(clinical);
    const assessment = $('horseAssessmentInlineQuestion');
    if (assessment && assessment.parentElement !== stage) stage.appendChild(assessment);

    const idle = stage.querySelector('.patient-communication-idle');
    const active = [host, clinical, assessment].some(node => node && !node.hidden && clean(node.textContent));
    if (idle) idle.hidden = active;
  }

  function renderPatientLine(text, label = 'Patient') {
    const stage = ensureStage();
    if (!stage) return;
    const value = clean(text);
    if (!value) return;
    const signature = normalize(value);
    const now = Date.now();
    if (signature === lastPatientSignature && now - lastPatientShownAt < 1800) return;
    lastPatientSignature = signature;
    lastPatientShownAt = now;

    let routed = $('routedPatientCommunication');
    if (!routed) {
      routed = document.createElement('section');
      routed.id = 'routedPatientCommunication';
      routed.className = 'routed-patient-communication';
      stage.prepend(routed);
    }
    routed.innerHTML = `<header><span aria-hidden="true">👤</span><strong>${label}</strong></header><p>“${value.replace(/[“”\"]/g, '')}”</p>`;
    routed.hidden = false;
    stage.querySelector('.patient-communication-idle')?.setAttribute('hidden','');
    window.setTimeout(() => {
      if (routed && normalize(routed.textContent).includes(signature.slice(0, Math.min(24, signature.length)))) routed.hidden = true;
    }, 9000);
  }

  function routeInfoWindow() {
    if (restoreGuard) return;
    const snapshot = infoSnapshot();
    if (!snapshot.text) return;
    if (patientInfo(snapshot)) {
      renderPatientLine(snapshot.text, /QUESTION/i.test(`${snapshot.type} ${snapshot.title}`) ? 'Patient asks' : 'Patient');
      // Existing patient voice paths already speak patient responses. We are only
      // changing where they are displayed, then returning the top window to the
      // last dispatch/partner/bystander/observation update.
      restoreExternalInfo();
      return;
    }
    rememberExternalInfo(snapshot);
  }

  function watchInfoWindow() {
    const info = $('infoUpdateWindow');
    if (!info) return;
    infoObserver?.disconnect();
    rememberExternalInfo(infoSnapshot());
    infoObserver = new MutationObserver(() => routeInfoWindow());
    infoObserver.observe(info, { childList:true, subtree:true, characterData:true });
  }

  function routeHistoryAnswer() {
    const response = $('historyResponseText');
    if (!response) return;
    const value = clean(response.textContent);
    if (value) renderPatientLine(value, 'Patient');
  }

  function watchHistory() {
    const response = $('historyResponseText');
    if (!response || response.__emsCommunicationRouterObserved) return;
    response.__emsCommunicationRouterObserved = true;
    historyObserver?.disconnect();
    historyObserver = new MutationObserver(routeHistoryAnswer);
    historyObserver.observe(response, { childList:true, subtree:true, characterData:true });
  }

  function sameEnough(a, b) {
    const x = normalize(a), y = normalize(b);
    if (!x || !y) return false;
    return x === y || x.includes(y) || y.includes(x);
  }

  function installVitalSpeechRule() {
    const synth = window.speechSynthesis;
    if (!synth || synth.__emsVitalSourceSpeechRule || typeof synth.speak !== 'function') return;
    const nativeSpeak = synth.speak.bind(synth);
    try {
      synth.speak = utterance => {
        const spoken = clean(utterance?.text);
        const snapshot = infoSnapshot();
        // A vital taken directly by the learner is already visible in the right
        // clinical workspace. Do not read it aloud. A partner-obtained vital is a
        // verbal crew report and is intentionally allowed through.
        if (vitalInfo(snapshot) && !partnerInfo(snapshot) && sameEnough(spoken, snapshot.text)) return;
        return nativeSpeak(utterance);
      };
      synth.__emsVitalSourceSpeechRule = true;
    } catch (_) {}
  }

  function reconcile() {
    reconcileQueued = false;
    placePatientControls();
    watchInfoWindow();
    watchHistory();
    installVitalSpeechRule();
  }

  function scheduleReconcile() {
    if (reconcileQueued) return;
    reconcileQueued = true;
    requestAnimationFrame(reconcile);
  }

  function installStyles() {
    if (document.querySelector('style[data-communication-router]')) return;
    const style = document.createElement('style');
    style.dataset.communicationRouter = VERSION;
    style.textContent = `
      @media(min-width:980px){
        #clinicalInteractionColumn{display:flex!important;flex-direction:column!important}
        #patientCommunicationStage{order:5!important;flex:1 1 auto;min-height:190px;display:flex;flex-direction:column;justify-content:center;gap:8px;padding:8px 2px}
        #clinicalInteractionColumn>.bottom-nav{order:99!important;margin-top:auto!important}
        #patientCommunicationStage #patientConversationTurn,#patientCommunicationStage #horseClinicalQuestionBox,#patientCommunicationStage #horseAssessmentInlineQuestion{position:relative!important;inset:auto!important;width:100%!important;margin:0!important}
        .patient-communication-idle{margin:auto;text-align:center;opacity:.58;max-width:260px}.patient-communication-idle[hidden]{display:none!important}.patient-communication-idle small{font-size:.64rem;font-weight:900;letter-spacing:.09em}.patient-communication-idle p{margin:5px 0 0;font-size:.75rem;line-height:1.35}
        .routed-patient-communication{padding:11px 12px;border:1px solid #397d9c;border-radius:11px;background:#0e2b3d;display:grid;gap:6px}.routed-patient-communication[hidden]{display:none!important}.routed-patient-communication header{display:flex;gap:7px;align-items:center;font-size:.67rem;font-weight:900;letter-spacing:.08em;color:#9edfff;text-transform:uppercase}.routed-patient-communication p{margin:0;color:#fff;font-size:.93rem;line-height:1.4;font-weight:700}
      }
    `;
    document.head.appendChild(style);
  }

  function start() {
    installStyles();
    installVitalSpeechRule();
    scheduleReconcile();
    bodyObserver = new MutationObserver(mutations => {
      const own = mutations.every(m => m.target?.closest?.('#patientCommunicationStage'));
      if (!own) scheduleReconcile();
    });
    bodyObserver.observe(document.body, { childList:true, subtree:true });
    window.addEventListener('emscodesim:assessment-saved', scheduleReconcile);
    window.addEventListener('emscodesim:vital-saved', scheduleReconcile);
    window.addEventListener('resize', scheduleReconcile, { passive:true });
    window.setTimeout(scheduleReconcile, 180);
    window.setTimeout(scheduleReconcile, 700);
    window.addEventListener('pagehide', () => {
      infoObserver?.disconnect();
      historyObserver?.disconnect();
      bodyObserver?.disconnect();
    }, { once:true });
  }

  window.EMSCodeSimCommunicationRouter = Object.freeze({
    version:VERSION,
    reconcile:scheduleReconcile,
    patientInfo,
    partnerInfo,
    vitalInfo
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
