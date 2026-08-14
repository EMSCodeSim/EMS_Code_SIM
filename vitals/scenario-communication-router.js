(() => {
  'use strict';

  const VERSION = '2026.08.14.20';
  const params = new URLSearchParams(location.search);
  const requested = String(params.get('case') || '').replace(/-/g, '_').toLowerCase();
  const $ = id => document.getElementById(id);
  const api = window.EMSCodeSimPatientRecord;
  const session = window.EMSCodeSimScenarioSession;
  let infoObserver = null;
  let bodyObserver = null;
  let historyObserver = null;
  let restoreGuard = false;
  let queued = false;
  let lastPatientSignature = '';
  let lastPatientShownAt = 0;
  let lastExternalInfo = null;
  let communicationFilter = 'all';
  let lastTimelineSignature = '';
  let lastTimelineAt = 0;

  function record() {
    try { return session?.sync?.() || api?.active?.() || null; }
    catch (_) { return null; }
  }

  function horseScenario() {
    const current = record();
    return requested === 'horse_crush' || current?.scenarioId === 'horse_crush' || current?.id === 'horse_crush';
  }

  if (!horseScenario()) return;

  const clean = value => String(value || '').replace(/[“”]/g, '').replace(/\s+/g, ' ').trim();
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
    return /PATIENT|HISTORY ANSWER|PATIENT RESPONSE|PATIENT QUESTION|SAMPLE ANSWER|OPQRST ANSWER/.test(type)
      || /^[“"]/u.test(snapshot.text);
  }

  function partnerInfo(snapshot = infoSnapshot()) {
    return /PARTNER|CREW MEMBER|ASSIGNED/i.test(`${snapshot.type} ${snapshot.title} ${snapshot.text}`);
  }

  function vitalInfo(snapshot = infoSnapshot()) {
    return /VITAL|BLOOD PRESSURE|\bBP\b|PULSE|HEART RATE|RESPIRAT|SPO[₂2]|OXYGEN SATURATION|GLUCOSE|TEMPERATURE/i.test(`${snapshot.type} ${snapshot.title} ${snapshot.text}`);
  }

  function rememberExternalInfo(snapshot) {
    if (snapshot?.text && !patientInfo(snapshot)) lastExternalInfo = { ...snapshot };
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

  const SOURCE_META = {
    dispatch:{ label:'Dispatch', icon:'📟' },
    crew:{ label:'Crew', icon:'👥' },
    patient:{ label:'Patient', icon:'👤' },
    finding:{ label:'Observed finding', icon:'👁' },
    critical:{ label:'Critical change', icon:'⚠' },
    provider:{ label:'You', icon:'🩺' }
  };

  function sourceFor(snapshot = {}) {
    const value = `${snapshot.type || ''} ${snapshot.title || ''} ${snapshot.text || ''}`;
    if (patientInfo(snapshot)) return 'patient';
    if (partnerInfo(snapshot)) return 'crew';
    if (/DISPATCH|RADIO|CALL INFORMATION/i.test(value)) return 'dispatch';
    if (/ALERT|CRITICAL|DETERIORAT|WORSEN/i.test(value)) return 'critical';
    return 'finding';
  }

  function timelineStorageKey() {
    const current = record();
    return `emscodesim:communications:${current?.startedAt || current?.id || 'horse-crush'}`;
  }

  function timelineMessages() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(timelineStorageKey()) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function ensureTimeline(stage) {
    if (!stage) return null;
    let timeline = $('communicationTimeline');
    if (!timeline) {
      timeline = document.createElement('section');
      timeline.id = 'communicationTimeline';
      timeline.className = 'communication-timeline';
      timeline.setAttribute('aria-label', 'Communication timeline');
      timeline.innerHTML = `
        <header class="communication-timeline-head"><strong>Communication</strong><span id="communicationNewBadge" hidden>New message</span></header>
        <nav class="communication-filters" aria-label="Filter communications">
          ${[['all','All'],['dispatch','Dispatch'],['crew','Crew'],['patient','Patient'],['finding','Findings']].map(([key,label]) => `<button type="button" data-communication-filter="${key}" class="${key === 'all' ? 'active' : ''}">${label}</button>`).join('')}
        </nav>
        <div id="communicationTimelineList" class="communication-timeline-list" role="log" aria-live="polite"></div>`;
      stage.prepend(timeline);
      timeline.querySelectorAll('[data-communication-filter]').forEach(button => button.addEventListener('click', () => {
        communicationFilter = button.dataset.communicationFilter || 'all';
        timeline.querySelectorAll('[data-communication-filter]').forEach(item => item.classList.toggle('active', item === button));
        renderTimeline();
      }));
    }
    renderTimeline();
    return timeline;
  }

  function renderTimeline() {
    const list = $('communicationTimelineList');
    if (!list) return;
    const messages = timelineMessages();
    const visible = communicationFilter === 'all'
      ? messages
      : messages.filter(message => message.source === communicationFilter || (communicationFilter === 'finding' && message.source === 'critical'));
    list.innerHTML = visible.map(message => {
      const meta = SOURCE_META[message.source] || SOURCE_META.finding;
      const stamp = new Date(message.at || Date.now()).toLocaleTimeString([], { hour:'numeric', minute:'2-digit' });
      const safe = String(message.text || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      return `<article class="communication-entry source-${message.source}" data-communication-source="${message.source}"><header><span aria-hidden="true">${meta.icon}</span><strong>${meta.label}</strong><time>${stamp}</time></header><p>${safe}</p></article>`;
    }).join('') || '<p class="communication-empty">No messages in this filter yet.</p>';
    list.scrollTop = list.scrollHeight;
  }

  function pushTimeline(source, text) {
    const value = clean(text);
    if (!value) return;
    const signature = `${source}|${value.toLowerCase()}`;
    const now = Date.now();
    if (signature === lastTimelineSignature && now - lastTimelineAt < 1800) return;
    lastTimelineSignature = signature;
    lastTimelineAt = now;
    const messages = timelineMessages();
    messages.push({ id:`comm-${now}-${messages.length}`, source, text:value, at:now });
    try { sessionStorage.setItem(timelineStorageKey(), JSON.stringify(messages.slice(-80))); } catch (_) {}
    const stage = ensureStage();
    if (stage) ensureTimeline(stage);
    const column = $('clinicalInteractionColumn');
    const badge = $('communicationNewBadge');
    column?.classList.add('communication-has-new');
    if (badge) badge.hidden = false;
    window.setTimeout(() => {
      column?.classList.remove('communication-has-new');
      if (badge) badge.hidden = true;
    }, 1800);
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
      typeNode.textContent = snapshot.type;
      titleNode.textContent = snapshot.title;
      textNode.textContent = snapshot.text;
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
    ensureTimeline(stage);
    return stage;
  }

  function placePatientControls() {
    const stage = ensureStage();
    if (!stage) return;

    const patientTurn = $('patientConversationTurn');
    if (patientTurn && patientTurn.parentElement !== stage) stage.appendChild(patientTurn);

    const clinicalQuestion = $('horseClinicalQuestionBox');
    if (clinicalQuestion?.classList.contains('active') && clinicalQuestion.querySelector('.horse-question-choice')) {
      clinicalQuestion.hidden = false;
    }
    const belongsInCommunication = clinicalQuestion?.classList.contains('history-active')
      || clinicalQuestion?.classList.contains('treatment-active');
    if (clinicalQuestion && belongsInCommunication && clinicalQuestion.parentElement !== stage) {
      stage.appendChild(clinicalQuestion);
    } else if (clinicalQuestion && !belongsInCommunication) {
      const rightField = document.querySelector('.patient-control-column');
      const currentAssessment = $('horseCurrentAssessment');
      if (rightField && clinicalQuestion.parentElement !== rightField) {
        if (currentAssessment?.parentElement === rightField) {
          currentAssessment.insertAdjacentElement('beforebegin', clinicalQuestion);
        } else {
          rightField.prepend(clinicalQuestion);
        }
      }
    }

    // Assessment follow-ups are owned by the right-side assessment workspace.
    // Never relocate this node into the communication center.
    const assessmentQuestion = $('horseAssessmentInlineQuestion');
    const assessmentTools = $('assessmentTools');
    if (assessmentQuestion && assessmentTools && !assessmentTools.contains(assessmentQuestion)) {
      assessmentTools.appendChild(assessmentQuestion);
    }

    const active = [patientTurn, belongsInCommunication ? clinicalQuestion : null]
      .some(node => node && !node.hidden && clean(node.textContent));
    const idle = stage.querySelector('.patient-communication-idle');
    if (idle) idle.hidden = active;
  }

  function renderPatientLine(text, label = 'Patient') {
    const stage = ensureStage();
    const value = clean(text);
    if (!stage || !value) return;
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
    routed.innerHTML = `<header><span aria-hidden="true">👤</span><strong>${label}</strong></header><p>“${value.replace(/[“”"]/g, '')}”</p>`;
    routed.hidden = false;
    pushTimeline('patient', value);
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
      restoreExternalInfo();
    } else {
      rememberExternalInfo(snapshot);
      pushTimeline(sourceFor(snapshot), snapshot.text);
    }
  }

  function watchInfoWindow() {
    const info = $('infoUpdateWindow');
    if (!info) return;
    infoObserver?.disconnect();
    rememberExternalInfo(infoSnapshot());
    infoObserver = new MutationObserver(routeInfoWindow);
    infoObserver.observe(info, { childList:true, subtree:true, characterData:true });
  }

  function watchHistory() {
    const response = $('historyResponseText');
    if (!response || response.__emsCommunicationRouterObserved) return;
    response.__emsCommunicationRouterObserved = true;
    historyObserver?.disconnect();
    historyObserver = new MutationObserver(() => {
      const value = clean(response.textContent);
      if (value) renderPatientLine(value, 'Patient');
    });
    historyObserver.observe(response, { childList:true, subtree:true, characterData:true });
  }

  function sameEnough(a, b) {
    const x = normalize(a), y = normalize(b);
    return Boolean(x && y && (x === y || x.includes(y) || y.includes(x)));
  }

  function installVitalSpeechRule() {
    const synth = window.speechSynthesis;
    if (!synth || synth.__emsVitalSourceSpeechRule || typeof synth.speak !== 'function') return;
    const nativeSpeak = synth.speak.bind(synth);
    try {
      synth.speak = utterance => {
        const snapshot = infoSnapshot();
        if (vitalInfo(snapshot) && !partnerInfo(snapshot) && sameEnough(clean(utterance?.text), snapshot.text)) return;
        return nativeSpeak(utterance);
      };
      synth.__emsVitalSourceSpeechRule = true;
    } catch (_) {}
  }

  function reconcile() {
    queued = false;
    placePatientControls();
    watchInfoWindow();
    watchHistory();
    installVitalSpeechRule();
  }

  function scheduleReconcile() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(reconcile);
  }

  function installStyles() {
    if (document.querySelector('style[data-communication-router]')) return;
    const style = document.createElement('style');
    style.dataset.communicationRouter = VERSION;
    style.textContent = `@media(min-width:980px){
      #clinicalInteractionColumn{display:flex!important;flex-direction:column!important;position:relative!important;align-self:stretch!important;min-height:0!important;height:100%!important;overflow:hidden!important}
      #clinicalInteractionColumn>#infoUpdateWindow{display:none!important}
      #patientCommunicationStage{order:5!important;flex:1 1 0!important;min-height:0!important;height:auto!important;display:flex;flex-direction:column;justify-content:stretch;gap:8px;padding:12px 4px 82px!important;overflow:hidden!important}
      body.desktop-scenario-layout #clinicalInteractionColumn>.bottom-nav.clinical-domain-rail{position:absolute!important;inset:auto 4px 4px 4px!important;z-index:190!important;order:99!important;margin:0!important;flex:0 0 auto!important;transform:none!important}
      #patientCommunicationStage>.communication-timeline{flex:1 1 auto!important;min-height:0!important}
      #patientCommunicationStage #patientConversationTurn,#patientCommunicationStage #horseClinicalQuestionBox{position:relative!important;inset:auto!important;width:100%!important;margin:0!important}
      .patient-communication-idle{margin:auto;text-align:center;opacity:.58;max-width:260px}.patient-communication-idle[hidden]{display:none!important}.patient-communication-idle small{font-size:.64rem;font-weight:900;letter-spacing:.09em}.patient-communication-idle p{margin:5px 0 0;font-size:.75rem;line-height:1.35}
      .routed-patient-communication{padding:11px 12px;border:1px solid #397d9c;border-radius:11px;background:#0e2b3d;display:grid;gap:6px}.routed-patient-communication[hidden]{display:none!important}.routed-patient-communication header{display:flex;gap:7px;align-items:center;font-size:.67rem;font-weight:900;letter-spacing:.08em;color:#9edfff;text-transform:uppercase}.routed-patient-communication p{margin:0;color:#fff;font-size:.93rem;line-height:1.4;font-weight:700}
      #communicationTimeline{flex:1 1 auto;min-height:0;display:grid;grid-template-rows:auto auto minmax(0,1fr);gap:7px;overflow:hidden}
      .communication-timeline-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.communication-timeline-head strong{font-size:.72rem;letter-spacing:.07em;text-transform:uppercase;color:#a8dbf2}.communication-timeline-head span{font-size:.59rem;font-weight:900;color:#fff;background:#9b342f;border-radius:999px;padding:3px 7px}
      .communication-filters{display:flex;gap:4px;overflow-x:auto}.communication-filters button{min-height:27px;padding:4px 8px;border:1px solid #31566d;border-radius:999px;background:transparent;color:#b7cfda;font-size:.61rem;font-weight:850;cursor:pointer}.communication-filters button.active{background:#174a68;border-color:#67c2f5;color:#fff}
      .communication-timeline-list{min-height:0;overflow:auto;display:grid;align-content:start;gap:3px;padding-right:3px}.communication-entry{padding:7px 6px 7px 9px;border-left:3px solid #547b90}.communication-entry.source-dispatch{border-left-color:#4fb3ff}.communication-entry.source-crew{border-left-color:#9da9cf}.communication-entry.source-patient{border-left-color:#55c990}.communication-entry.source-critical{border-left-color:#ff6b61}.communication-entry header{display:flex;align-items:center;gap:5px}.communication-entry header strong{font-size:.62rem;text-transform:uppercase;letter-spacing:.06em}.communication-entry time{margin-left:auto;font-size:.56rem;color:#7897a7}.communication-entry p{margin:3px 0 0;color:#e8f3f9;font-size:.75rem;line-height:1.34}.communication-empty{margin:auto;text-align:center;color:#7694a3;font-size:.7rem}
      #patientCommunicationStage #patientConversationTurn:not([hidden]),#patientCommunicationStage #horseClinicalQuestionBox:not([hidden]){flex:0 0 auto;position:sticky!important;bottom:0!important;z-index:8;background:#0b2231!important;box-shadow:0 -8px 20px rgba(3,13,20,.32)!important}
      #clinicalInteractionColumn.communication-has-new{box-shadow:0 0 0 2px rgba(103,194,245,.55),0 12px 30px rgba(0,0,0,.18)!important}
      .horse-question-choice-grid{display:grid!important;grid-template-columns:1fr!important;gap:9px!important;margin-top:12px!important}
      .horse-question-choice{width:100%!important;min-height:52px!important;display:grid!important;grid-template-columns:24px 1fr!important;align-items:center!important;gap:9px!important;padding:11px 13px!important;border:1px solid #315f76!important;border-radius:10px!important;background:#0b2636!important;color:#f4fbff!important;text-align:left!important;cursor:pointer!important}
      .horse-question-choice:hover,.horse-question-choice:focus-visible{border-color:#68c9f5!important;background:#10364a!important;outline:2px solid rgba(104,201,245,.25)!important}
      #horseClinicalQuestionBox.active[hidden]:has(.horse-question-choice){display:block!important}
      .horse-question-choice.selected{border-color:#55c990!important;background:#103b34!important}
      .horse-question-choice span{color:#68c9f5;font-weight:900}.horse-question-choice strong{font-size:.82rem;line-height:1.25}.horse-question-choice-help{margin:9px 0 0!important;color:#8faeba!important;font-size:.68rem!important}
    }`;
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

  window.EMSCodeSimCommunicationRouter = Object.freeze({ version:VERSION, reconcile:scheduleReconcile, push:(source,text) => pushTimeline(source,text), patientInfo, partnerInfo, vitalInfo });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
