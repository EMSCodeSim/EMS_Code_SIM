(() => {
  'use strict';

  const VERSION = '2026.08.12.1';
  const params = new URLSearchParams(location.search);
  const requested = String(params.get('case') || '').replace(/-/g, '_').toLowerCase();
  const $ = id => document.getElementById(id);
  const api = window.EMSCodeSimPatientRecord;
  const session = window.EMSCodeSimScenarioSession;
  if (requested !== 'horse_crush') return;

  const answeredQuestions = new Set();
  const questionAttempts = new Map();
  const events = [];
  let rapport = 0;
  let unanswered = 0;
  let currentQuestion = '';
  let pendingPatientToneUntil = 0;
  let pendingTone = 'neutral';
  let observer = null;
  let gradeObserver = null;

  const normalize = value => String(value || '')
    .replace(/[“”"'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  function record() {
    try { return session?.sync?.() || api?.active?.() || null; }
    catch (_) { return null; }
  }

  function sessionKey() {
    const r = record();
    return `emscodesim:rapport:${r?.startedAt || r?.id || 'horse-crush'}`;
  }

  function saveState() {
    const state = {
      version:VERSION, rapport, unanswered,
      answered:[...answeredQuestions],
      attempts:[...questionAttempts.entries()],
      events:events.slice(-60)
    };
    try { sessionStorage.setItem(sessionKey(), JSON.stringify(state)); } catch (_) {}
    try {
      const r = record();
      if (r?.documentation) {
        r.documentation.patientCommunication = communicationModel();
        api?.save?.(r);
      }
    } catch (_) {}
  }

  function loadState() {
    try {
      const raw = sessionStorage.getItem(sessionKey());
      if (!raw) return;
      const state = JSON.parse(raw);
      rapport = Number(state.rapport) || 0;
      unanswered = Number(state.unanswered) || 0;
      (state.answered || []).forEach(q => answeredQuestions.add(q));
      (state.attempts || []).forEach(([q,n]) => questionAttempts.set(q,n));
      (state.events || []).forEach(e => events.push(e));
    } catch (_) {}
  }

  function responseQuality(text) {
    const t = normalize(text);
    let score = 0;
    if (/tell you|explain|keep you updated|warn|before (we|i) move|go slowly|support|keep.*still|recheck|reassess|make sure|i hear you|you.re right|thank|understand|safest/.test(t)) score += 2;
    if (/i can.t tell|need to evaluate|don.t want to guess|hospital.*evaluate/.test(t)) score += 1;
    if (/one more|little more|still checking|wait|taking so long/.test(t)) score -= 1;
    if (/just relax|calm down|stop asking|you.ll be fine|nothing to worry|we don.t have time|because i said/.test(t)) score -= 3;
    return Math.max(-3, Math.min(3, score));
  }

  function mood() {
    if (rapport >= 8) return 'calm-cooperative';
    if (rapport >= 2) return 'reassured';
    if (rapport <= -7) return 'frustrated';
    if (rapport <= -2) return 'anxious';
    return 'uncertain';
  }

  function recordEvent(type, data = {}) {
    events.push({ type, at:new Date().toISOString(), ...data });
    if (events.length > 60) events.shift();
    saveState();
  }

  function patientBehaviorLine() {
    switch (mood()) {
      case 'calm-cooperative': return 'The patient is visibly calmer, follows directions readily, and waits for your explanation before moving.';
      case 'reassured': return 'The patient remains worried but is cooperative and responds well when you explain what you are doing.';
      case 'frustrated': return 'The patient is frustrated and repeatedly asks what is happening. She is less willing to cooperate until you address her concerns.';
      case 'anxious': return 'The patient is increasingly anxious and needs clearer reassurance and explanation before movement or treatment.';
      default: return 'The patient is watching you closely and is waiting to understand what will happen next.';
    }
  }

  function injectBehaviorIntoSpokenResponse(text) {
    const source = String(text || '');
    if (Date.now() > pendingPatientToneUntil) return source;
    pendingPatientToneUntil = 0;
    if (pendingTone === 'positive') {
      if (rapport >= 8) return `${source} Okay, I trust you. Just keep telling me what you're doing.`;
      return `${source} Thanks for explaining that.`;
    }
    if (pendingTone === 'negative') {
      if (rapport <= -7) return `${source} I don't feel like anyone is listening to me. Please tell me what's happening.`;
      return `${source} I'm still pretty worried. Can you explain that to me?`;
    }
    return source;
  }

  function installSpeechFilter() {
    const synth = window.speechSynthesis;
    if (!synth || synth.__emsRapportSpeechInstalled || !synth.speak) return;
    const nativeSpeak = synth.speak.bind(synth);
    try {
      synth.speak = utterance => {
        const raw = String(utterance?.text || '');
        const key = normalize(raw);
        if (answeredQuestions.has(key) && /\?$/.test(raw.trim())) return;
        if (Date.now() <= pendingPatientToneUntil && window.SpeechSynthesisUtterance) {
          const changed = injectBehaviorIntoSpokenResponse(raw);
          if (changed !== raw) {
            const clone = new SpeechSynthesisUtterance(changed);
            clone.voice = utterance.voice || null;
            clone.lang = utterance.lang || 'en-US';
            clone.rate = utterance.rate || 1;
            clone.pitch = utterance.pitch || 1;
            clone.volume = utterance.volume ?? 1;
            clone.onstart = event => utterance.onstart?.(event);
            clone.onend = event => utterance.onend?.(event);
            clone.onerror = event => utterance.onerror?.(event);
            return nativeSpeak(clone);
          }
        }
        return nativeSpeak(utterance);
      };
      synth.__emsRapportSpeechInstalled = true;
    } catch (_) {}
  }

  function currentQuestionText(host) {
    const line = host?.querySelector('.patient-line');
    if (!line || host.classList.contains('replying')) return '';
    return String(line.textContent || '').replace(/[“”]/g, '').trim();
  }

  function suppressAnsweredRepeat(host) {
    const question = currentQuestionText(host);
    if (!question) return false;
    const key = normalize(question);
    currentQuestion = key;
    const count = (questionAttempts.get(key) || 0) + 1;
    questionAttempts.set(key, count);
    if (answeredQuestions.has(key)) {
      host.hidden = true;
      host.innerHTML = '';
      recordEvent('suppressed-repeat', { question });
      return true;
    }
    if (count > 1) recordEvent('repeated-unanswered', { question, count });
    return false;
  }

  function handleChoice(button) {
    const host = button.closest('#patientConversationTurn');
    const question = currentQuestionText(host) || currentQuestion;
    const key = normalize(question);
    const response = String(button.textContent || '').trim();
    if (key) answeredQuestions.add(key);
    const quality = responseQuality(response);
    rapport += quality;
    pendingTone = quality >= 2 ? 'positive' : quality < 0 ? 'negative' : 'neutral';
    pendingPatientToneUntil = Date.now() + 1800;
    recordEvent('provider-response', { question, response, quality, rapport, mood:mood() });
  }

  function noteIgnoredQuestion(previous) {
    if (!previous || answeredQuestions.has(previous)) return;
    unanswered += 1;
    rapport -= 2;
    recordEvent('unanswered-concern', { question:previous, rapport, mood:mood() });
  }

  function communicationModel() {
    const answered = events.filter(e => e.type === 'provider-response');
    const positives = answered.filter(e => e.quality >= 2).length;
    const negatives = answered.filter(e => e.quality < 0).length;
    const ignored = events.filter(e => e.type === 'unanswered-concern').length;
    const repeatedIgnored = events.filter(e => e.type === 'repeated-unanswered').length;
    const opportunities = Math.max(1, answered.length + ignored);
    let score = 70;
    score += positives * 6;
    score -= negatives * 9;
    score -= ignored * 10;
    score -= repeatedIgnored * 4;
    score += Math.max(-12, Math.min(12, rapport));
    if (answered.length >= 4) score += 5;
    score = Math.max(0, Math.min(100, Math.round(score)));
    return { score, rapport, mood:mood(), answered:answered.length, positiveResponses:positives, poorResponses:negatives, unanswered:ignored, repeatedUnanswered:repeatedIgnored };
  }

  function gradeLabel(score) {
    if (score >= 90) return 'Excellent patient communication';
    if (score >= 80) return 'Strong communication';
    if (score >= 70) return 'Adequate communication';
    if (score >= 60) return 'Communication needs improvement';
    return 'Patient communication was a major weakness';
  }

  function renderGrade() {
    const workspace = $('horseGradeWorkspace');
    const categories = $('horseGradeCategories');
    if (!workspace || workspace.hidden || !categories) return;
    const model = communicationModel();
    let card = $('horseCommunicationGrade');
    if (!card) {
      card = document.createElement('article');
      card.id = 'horseCommunicationGrade';
      card.className = 'horse-grade-category horse-communication-grade';
      categories.appendChild(card);
    }
    card.innerHTML = `<div><small>PATIENT COMMUNICATION</small><strong>${model.score}/100</strong></div><p><b>${gradeLabel(model.score)}</b></p><p>${model.positiveResponses} strong responses • ${model.unanswered} unanswered concern${model.unanswered===1?'':'s'} • final rapport: ${model.mood.replace(/-/g,' ')}</p>`;

    const strengths = $('horseGradeStrengths');
    const improvements = $('horseGradeImprovements');
    if (strengths && model.score >= 80 && !strengths.querySelector('[data-communication-feedback]')) {
      const li = document.createElement('li'); li.dataset.communicationFeedback = '1'; li.textContent = 'You communicated clearly enough to build patient trust while continuing clinical care.'; strengths.appendChild(li);
    }
    if (improvements && model.score < 80 && !improvements.querySelector('[data-communication-feedback]')) {
      const li = document.createElement('li'); li.dataset.communicationFeedback = '1';
      li.textContent = model.unanswered ? 'Address patient questions instead of letting concerns go unanswered; ignored concerns increase anxiety and distraction.' : 'Use clearer explanations, reassurance, and warnings before movement to improve cooperation and patient trust.';
      improvements.appendChild(li);
    }
  }

  function start() {
    loadState();
    installSpeechFilter();
    document.addEventListener('click', event => {
      const button = event.target.closest?.('#patientConversationTurn [data-patient-choice]');
      if (button) handleChoice(button);
    }, true);

    const host = $('patientConversationTurn');
    if (host) {
      observer = new MutationObserver(() => {
        if (host.hidden) return;
        const next = normalize(currentQuestionText(host));
        if (next && next !== currentQuestion) {
          noteIgnoredQuestion(currentQuestion);
          suppressAnsweredRepeat(host);
        }
      });
      observer.observe(host, { childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden','class'] });
    }

    gradeObserver = new MutationObserver(renderGrade);
    gradeObserver.observe(document.body, { childList:true,subtree:true,attributes:true,attributeFilter:['hidden'] });
    document.addEventListener('click', event => {
      if (event.target.closest?.('#openHorseCallGrade,.handoff-grade-button,[data-grade]')) setTimeout(renderGrade, 120);
    }, true);

    const style = document.createElement('style');
    style.dataset.patientRapport = VERSION;
    style.textContent = `.horse-communication-grade{border:1px solid #397b95;border-radius:10px;padding:10px;background:#0f2a3b}.horse-communication-grade>div{display:flex;justify-content:space-between;gap:10px}.horse-communication-grade small{color:#93cde4;font-weight:900;letter-spacing:.06em}.horse-communication-grade strong{font-size:1.05rem}.horse-communication-grade p{margin:5px 0 0;font-size:.76rem;line-height:1.35}.patient-rapport-status{font-size:.7rem}`;
    document.head.appendChild(style);

    window.EMSCodeSimPatientRapport = Object.freeze({ version:VERSION, model:communicationModel, behavior:patientBehaviorLine });
    window.addEventListener('pagehide', () => { observer?.disconnect(); gradeObserver?.disconnect(); saveState(); }, { once:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
