(() => {
  'use strict';

  const VERSION = '2026.08.18.15';
  const params = new URLSearchParams(location.search);
  const requested = String(params.get('case') || '').trim().toLowerCase();
  const api = window.EMSCodeSimPatientRecord;
  const runtime = window.EMSCodeSimScenarioRuntime;
  const session = window.EMSCodeSimScenarioSession;
  const $ = id => document.getElementById(id);

  let patientTimer = 0;
  let smallTalkTimer = 0;
  let infoObserver = null;
  let cleanupObserver = null;
  let lastNarratorSignature = '';
  let lastPatientTurnAt = 0;
  let turnSequence = 0;
  let activeTurn = null;

  function record() {
    try { return session?.sync?.() || api?.active?.() || null; }
    catch (_) { return null; }
  }

  function horseScenario() {
    const current = record();
    return requested === 'horse_crush'
      || requested === 'horse-crush'
      || current?.scenarioId === 'horse_crush'
      || current?.id === 'horse_crush';
  }

  if (!horseScenario()) return;

  function clinicalState() {
    return runtime?.horseClinicalState?.(record()) || {
      stage:'baseline', painScore:8, stabilization:false, painControl:false,
      elapsedSeconds:0, patientText:'My left hip really hurts.'
    };
  }

  function cleanSpeech(value) {
    return String(value || '')
      .replace(/[“”]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\bSpO₂\b/gi, 'oxygen saturation')
      .replace(/\bCSM\b/g, 'circulation, sensation, and movement')
      .replace(/\bA&O\s*[x×]\s*4\b/gi, 'alert and oriented times four')
      .trim();
  }

  function voiceScore(voice, role) {
    const name = `${voice?.name || ''} ${voice?.voiceURI || ''}`;
    const lang = voice?.lang || '';
    const female = /Samantha|Ava|Jenny|Zira|Aria|Joanna|Karen|Moira|Tessa|Serena|Victoria|Susan|Female/i;
    const male = /Alex|Daniel|David|Tom|Guy|Mark|Fred|Aaron|Arthur|George|Microsoft David|Male/i;
    let score = 0;
    if (/^en-US$/i.test(lang)) score += 25;
    else if (/^en/i.test(lang)) score += 15;
    if (voice?.localService) score += 8;
    if (role === 'patient' && female.test(name)) score += 80;
    if (role !== 'patient' && male.test(name)) score += 80;
    if (role === 'patient' && male.test(name)) score -= 45;
    if (role !== 'patient' && female.test(name)) score -= 35;
    if (/Enhanced|Premium|Natural|Neural/i.test(name)) score += 20;
    if (/Google US English/i.test(name)) score += 6;
    return score;
  }

  function preferredVoice(role) {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices?.() || [];
    if (!voices.length) return null;
    return [...voices].sort((a,b) => voiceScore(b, role) - voiceScore(a, role))[0] || voices[0];
  }

  function autoVoiceEnabled() {
    try { return localStorage.getItem('emscodesim_patient_update_auto_voice') !== 'off'; }
    catch (_) { return true; }
  }

  function speak(text, role = 'patient', options = {}) {
    if (!autoVoiceEnabled() || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return false;
    const cleaned = cleanSpeech(text);
    if (!cleaned) return false;
    try {
      if (options.interrupt !== false) window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleaned);
      const voice = preferredVoice(role);
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang || 'en-US';
      if (role === 'patient') {
        utterance.rate = 0.96;
        utterance.pitch = 1.04;
      } else {
        utterance.rate = 0.98;
        utterance.pitch = 0.94;
      }
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (_) { return false; }
  }

  function removeSimulationDisclaimers() {
    document.querySelectorAll('.training-deid-note').forEach(node => node.remove());
    document.querySelectorAll('#historyPanel p, #historyPanel small, #historyPanel span').forEach(node => {
      const text = String(node.textContent || '').toLowerCase();
      if (text.includes('fictional') || text.includes('de-identified') || text.includes('deidentified')) node.remove();
    });
  }

  const QUESTION_BANK = {
    baseline: [
      {
        text:'Is my leg broken?',
        choices:[
          ['I can’t tell that yet. I’m checking the injury carefully.', 'Okay. I just really don’t want anybody moving it until you know what’s going on.'],
          ['It may be injured, but I need to examine you before I can say more.', 'That makes sense. Please tell me before you touch or move my hip.'],
          ['I’m going to keep your leg still while we figure that out.', 'Thank you. Keeping it still definitely feels better.']
        ]
      },
      {
        text:'Are you going to have to move me?',
        choices:[
          ['Eventually, yes, but we’ll support your leg and explain it first.', 'Okay. Just warn me before you move it.'],
          ['I’m still checking you before we decide the safest way to move you.', 'Okay. I can handle that as long as this leg stays still.'],
          ['We need to move you, but we’ll do it together and keep you supported.', 'All right. Please go slowly.']
        ]
      },
      {
        text:'Can you tell me what you’re checking right now?',
        choices:[
          ['I’m making sure there aren’t any immediate life threats, then I’ll focus on your hip.', 'Okay. I appreciate you telling me what you’re doing.'],
          ['I’m checking your breathing, circulation, and the rest of you for other injuries.', 'Got it. I don’t think anything else hurts like the hip does.'],
          ['I’m figuring out the safest way to treat and move you.', 'That’s what I’m worried about. Moving this leg hurts a lot.']
        ]
      }
    ],
    pain: [
      {
        text:'Can you do something for this pain?',
        choices:[
          ['Yes. I’m working on supporting the leg and treating your pain.', 'Thank you. Even keeping it still helps some.'],
          ['I hear you. I need a little more information before I decide what to do next.', 'Okay, but it’s getting pretty hard to stay comfortable.'],
          ['Tell me what makes it better or worse while I get things ready.', 'Keeping it bent and still helps. Any movement makes it sharp.']
        ]
      },
      {
        text:'Why is it taking so long? This really hurts.',
        choices:[
          ['You’re right. We’re going to address the pain and stabilize you now.', 'Okay. Please do.'],
          ['I’m making sure we move you safely, but I’ll keep you updated.', 'All right. I just need you to know the pain is getting worse.'],
          ['I need one more check, then we’ll move on to treatment.', 'Okay. Just please don’t move the leg without warning me.']
        ]
      }
    ],
    supported: [
      {
        text:'Are you going to keep my leg like this when you move me?',
        choices:[
          ['Yes. We’ll keep it supported in the position you tolerate best.', 'Good. This position is a lot easier to tolerate.'],
          ['We’ll support it and make any change slowly with the whole crew.', 'Okay. Please tell me before you start.'],
          ['I’m going to recheck your foot and pain before we move you.', 'That sounds good. My foot feels normal right now.']
        ]
      }
    ],
    relieved: [
      {
        text:'That feels a lot better. How far is the hospital?',
        choices:[
          ['We’re getting you moving shortly and we’ll keep monitoring you on the way.', 'Okay. I’m ready as long as you keep the leg supported.'],
          ['We’ve made the transport plan. I’ll keep you updated as we go.', 'Thank you. I’m a lot less worried now that the pain is down.'],
          ['Before we go, I’m going to do one more reassessment.', 'Sure. Go ahead.']
        ]
      },
      {
        text:'Do you think I’m going to be able to walk on this later?',
        choices:[
          ['The hospital will need to evaluate the injury before anyone can answer that.', 'Yeah, I figured. I just had to ask.'],
          ['I don’t want to guess. Right now our job is to protect the injury and get you evaluated.', 'Fair enough. Thank you for being straight with me.'],
          ['We’ll keep it protected until imaging and a physician can evaluate it.', 'Okay. That makes me feel better about not trying to stand up.']
        ]
      }
    ],
    worse: [
      {
        text:'Please don’t move it like that again. What are you going to do now?',
        choices:[
          ['I’m stopping. I’ll support the leg and recheck circulation and sensation.', 'Okay. Thank you. Just keep it still for a minute.'],
          ['We’re going to reassess you before doing anything else.', 'Good. The pain jumped a lot when it moved.'],
          ['I’m going to get the leg back to the position you tolerate.', 'Yes, please. That position was much better.']
        ]
      }
    ]
  };

  const SMALL_TALK = [
    'I was just trying to get the horses settled when this happened.',
    'They usually don’t crowd me like that. It happened so fast.',
    'I’m glad somebody was nearby when I went down.',
    'I really don’t want to try standing on this leg.',
    'I can feel my foot fine. It’s the hip that is killing me.',
    'Thanks for telling me what you’re doing. That helps.'
  ];

  function stateBucket(state = clinicalState()) {
    if (state.stage === 'worse') return 'worse';
    if (state.stage === 'relieved' || state.stage === 'pain-improved') return 'relieved';
    if (state.stage === 'supported') return 'supported';
    if (state.stage === 'pain-escalating' || state.stage === 'delayed-care') return 'pain';
    return 'baseline';
  }

  function currentConversationHost() {
    const info = $('infoUpdateWindow');
    if (!info) return null;
    let host = $('patientConversationTurn');
    if (!host) {
      host = document.createElement('section');
      host.id = 'patientConversationTurn';
      host.className = 'patient-conversation-turn';
      host.hidden = true;
      const text = $('infoUpdateText');
      if (text?.parentElement === info) text.insertAdjacentElement('afterend', host);
      else info.appendChild(host);
    }
    return host;
  }

  function injectStyles() {
    if (document.querySelector('style[data-patient-conversation]')) return;
    const style = document.createElement('style');
    style.dataset.patientConversation = VERSION;
    style.textContent = `
      .training-deid-note{display:none!important}
      .patient-conversation-turn{margin:8px 0 2px;padding:9px 10px;border:1px solid #38789a;border-radius:11px;background:#0d2a3c;display:grid;gap:8px}
      .patient-conversation-turn[hidden]{display:none!important}
      .patient-conversation-turn header{display:flex;align-items:center;gap:7px;color:#9edfff;font-size:.69rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
      .patient-conversation-turn .patient-line{margin:0!important;color:#fff!important;font-size:.91rem!important;line-height:1.35!important;font-weight:750}
      .patient-conversation-choices{display:grid;gap:5px}
      .patient-conversation-choices button{min-height:34px!important;max-height:none!important;padding:6px 8px!important;border:1px solid #477c97!important;border-radius:8px!important;background:#143b51!important;color:#fff!important;text-align:left!important;font-size:.76rem!important;line-height:1.25!important;cursor:pointer}
      .patient-conversation-choices button:hover{background:#1a4b65!important}
      .patient-provider-reply{margin:0;color:#b9d2df;font-size:.72rem;line-height:1.3}
      .patient-conversation-turn.replying{border-color:#4d9b73;background:#0d302d}
      @media(max-width:979px){.patient-conversation-turn .patient-line{font-size:.86rem!important}.patient-conversation-choices button{font-size:.74rem!important}}
    `;
    document.head.appendChild(style);
  }

  function logConversation(label, value, source) {
    try {
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
      api?.mergeCareLog?.([{
        id:`patient-conversation-${stamp}`,
        eventId:`patient-conversation-${stamp}`,
        type:'communication', category:'history', key:'patient_conversation', label,
        value, source, suppressInfoUpdate:true, suppressCareLog:true, recordedAt:new Date().toISOString()
      }]);
    } catch (_) {}
  }

  function showPatientTurn(turn, spontaneous = false) {
    const host = currentConversationHost();
    if (!host || !turn?.text) return;
    activeTurn = turn;
    turnSequence += 1;
    lastPatientTurnAt = Date.now();
    host.hidden = false;
    host.classList.remove('replying');
    host.innerHTML = `
      <header><span aria-hidden="true">👤</span><strong>${spontaneous ? 'Patient' : 'Patient asks'}</strong></header>
      <p class="patient-line">“${String(turn.text).replace(/[“”"]/g,'')}”</p>
      ${Array.isArray(turn.choices) && turn.choices.length ? `<div class="patient-conversation-choices">${turn.choices.map((choice,index) => `<button type="button" data-patient-choice="${index}" data-satisfaction-event="${choice[2] || 'patient_question_response'}">${choice[0]}</button>`).join('')}</div>` : ''}`;
    host.querySelectorAll('[data-patient-choice]').forEach(button => button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      chooseResponse(Number(button.dataset.patientChoice));
    }));
    speak(turn.text, 'patient');
    logConversation(spontaneous ? 'Patient comment' : 'Patient question', turn.text, spontaneous ? 'patient-small-talk' : 'patient-initiated-question');
    if (spontaneous || !turn.choices?.length) {
      window.EMSCodeSimCommunicationRouter?.push?.('patient', turn.text);
      window.setTimeout(() => {
        if (host && !host.hidden && activeTurn === turn) { host.hidden = true; host.innerHTML = ''; activeTurn = null; }
      }, 10000);
    }
  }

  function handlePatientChoiceClick(event) {
    const button = event.target.closest?.('#patientConversationTurn [data-patient-choice]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    chooseResponse(Number(button.dataset.patientChoice));
  }

  function chooseResponse(index) {
    const host = currentConversationHost();
    const choice = activeTurn?.choices?.[index];
    if (!host || !choice) return;
    const provider = choice[0];
    let patient = choice[1];
    const state = clinicalState();
    if (state.stage === 'delayed-care' && /little more|one more|still checking/i.test(provider)) {
      patient = 'Okay, but I need you to know this is getting harder to tolerate. Please keep the leg still.';
    } else if ((state.stage === 'supported' || state.stage === 'relieved') && /support|keep.*still/i.test(provider)) {
      patient = state.stage === 'relieved'
        ? 'Thank you. Between the support and the pain medicine, that is much better.'
        : 'Thank you. Keeping it supported makes a real difference.';
    }
    logConversation('Provider response', provider, 'patient-conversation-choice');
    logConversation('Patient response', patient, 'patient-conversation-response');
    window.EMSCodeSimCommunicationRouter?.push?.('patient', activeTurn.text);
    window.EMSCodeSimCommunicationRouter?.push?.('provider', provider);
    window.EMSCodeSimCommunicationRouter?.push?.('patient', patient);
    host.classList.add('replying');
    host.innerHTML = `
      <header><span aria-hidden="true">👤</span><strong>Patient responds</strong></header>
      <p class="patient-provider-reply"><strong>You:</strong> ${provider}</p>
      <p class="patient-line">“${String(patient).replace(/[“”"]/g,'')}”</p>`;
    speak(patient, 'patient');
    activeTurn = null;
    window.setTimeout(() => {
      if (host && !host.hidden && !activeTurn) { host.hidden = true; host.innerHTML = ''; }
    }, 9000);
    schedulePatientQuestion(42000, 76000);
  }

  function chooseQuestion() {
    const bucket = stateBucket();
    const bank = QUESTION_BANK[bucket] || QUESTION_BANK.baseline;
    const index = (turnSequence + Math.floor(Math.random() * bank.length)) % bank.length;
    return bank[index];
  }

  function conversationAllowed() {
    const current = record();
    if (!current || document.hidden || !horseScenario()) return false;
    if (document.body.classList.contains('sim-workspace-open')) return false;
    const grade = $('horseGradeWorkspace');
    if (grade && !grade.hidden) return false;
    if (current.documentation?.handoffSavedAt) return false;
    const phase = document.body.dataset.horseIntro;
    if (phase && phase !== 'arrived') return false;
    if (!current.findings?.bls_handoff) return false;
    return true;
  }

  function randomBetween(min, max) {
    return Math.round(min + Math.random() * Math.max(0, max - min));
  }

  function schedulePatientQuestion(min = 48000, max = 78000) {
    clearTimeout(patientTimer);
    patientTimer = window.setTimeout(() => {
      if (conversationAllowed() && !activeTurn && Date.now() - lastPatientTurnAt > 26000) showPatientTurn(chooseQuestion(), false);
      schedulePatientQuestion(52000, 88000);
    }, randomBetween(min, max));
  }

  function scheduleSmallTalk(min = 65000, max = 110000) {
    clearTimeout(smallTalkTimer);
    smallTalkTimer = window.setTimeout(() => {
      if (conversationAllowed() && !activeTurn && Date.now() - lastPatientTurnAt > 40000 && Math.random() < 0.62) {
        const state = clinicalState();
        let line = SMALL_TALK[Math.floor(Math.random() * SMALL_TALK.length)];
        if (state.stage === 'pain-escalating' || state.stage === 'delayed-care') line = 'I’m trying not to move, but the pain is definitely getting worse.';
        if (state.stage === 'supported') line = 'This is better with you holding it like that. Please keep it supported.';
        if (state.stage === 'relieved') line = 'I can finally relax a little. That pain is much more manageable now.';
        if (state.stage === 'worse') line = 'Please keep it still. That last movement really set the pain off.';
        showPatientTurn({ text:line, choices:[] }, true);
      }
      scheduleSmallTalk(70000, 120000);
    }, randomBetween(min, max));
  }

  function infoRole() {
    const type = String($('infoUpdateType')?.textContent || '').trim().toUpperCase();
    const text = String($('infoUpdateText')?.textContent || '').trim();
    if (/DISPATCH|BLS ENGINE|HANDOFF|AMBULANCE POSITION|SCENE ARRIVAL|ON-SCENE CREW/.test(type)) return 'narrator';
    if (/PATIENT|HISTORY ANSWER/.test(type) || /^[“"]/u.test(text)) return 'patient';
    if (/PARTNER/.test(type)) return 'partner';
    return 'narrator';
  }

  function narrateNonPatientUpdate() {
    if (!autoVoiceEnabled()) return;
    const role = infoRole();
    if (role === 'patient') return;
    const type = String($('infoUpdateType')?.textContent || '').trim();
    const title = String($('infoUpdateTitle')?.textContent || '').trim();
    const text = String($('infoUpdateText')?.textContent || '').trim();
    if (!text) return;
    const signature = `${type}|${title}|${text}`;
    if (signature === lastNarratorSignature) return;
    lastNarratorSignature = signature;
    window.setTimeout(() => {
      if (signature !== lastNarratorSignature || infoRole() === 'patient') return;
      speak(text, 'narrator', { interrupt:false });
    }, 120);
  }

  function watchInfoWindow() {
    const info = $('infoUpdateWindow');
    if (!info) return;
    infoObserver?.disconnect();
    infoObserver = new MutationObserver(mutations => {
      const external = mutations.some(m => !m.target?.closest?.('#patientConversationTurn'));
      if (external) narrateNonPatientUpdate();
    });
    infoObserver.observe(info, { childList:true, subtree:true,characterData:true });
  }

  function start() {
    injectStyles();
    removeSimulationDisclaimers();
    currentConversationHost();
    watchInfoWindow();
    schedulePatientQuestion(18000, 30000);
    scheduleSmallTalk(52000, 85000);
    cleanupObserver = new MutationObserver(() => removeSimulationDisclaimers());
    cleanupObserver.observe(document.body, { childList:true, subtree:true });
    window.addEventListener('pagehide', () => {
      clearTimeout(patientTimer);
      clearTimeout(smallTalkTimer);
      infoObserver?.disconnect();
      cleanupObserver?.disconnect();
      try { window.speechSynthesis?.cancel?.(); } catch (_) {}
    }, { once:true });
  }

  window.EMSCodeSimPatientConversation = Object.freeze({
    version:VERSION,
    speakPatient:text => speak(text,'patient'),
    speakNarrator:text => speak(text,'narrator'),
    showPatientTurn,
    preferredPatientVoice:() => preferredVoice('patient')?.name || '',
    preferredNarratorVoice:() => preferredVoice('narrator')?.name || ''
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
