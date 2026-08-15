(() => {
  'use strict';

  const VERSION = '2026.08.12.1';
  const params = new URLSearchParams(location.search);
  const requested = String(params.get('case') || '').replace(/-/g, '_').toLowerCase();
  if (requested !== 'horse_crush') return;

  const api = window.EMSCodeSimPatientRecord;
  const session = window.EMSCodeSimScenarioSession;
  const runtime = window.EMSCodeSimScenarioRuntime;
  const $ = id => document.getElementById(id);

  let anger = 8;
  let peakAnger = 8;
  let escalations = 0;
  let deescalations = 0;
  let painPenaltyTicks = 0;
  let lastRapportEventCount = 0;
  let lastUnsafeMovement = false;
  let lastStage = '';
  let timer = 0;
  let hostObserver = null;

  function record() {
    try { return session?.sync?.() || api?.active?.() || null; }
    catch (_) { return null; }
  }

  function key() {
    const r = record();
    return `emscodesim:anger:${r?.startedAt || r?.id || 'horse-crush'}`;
  }

  function rapportKey() {
    const r = record();
    return `emscodesim:rapport:${r?.startedAt || r?.id || 'horse-crush'}`;
  }

  function clamp(value) { return Math.max(0, Math.min(100, Math.round(value))); }

  function level(value = anger) {
    if (value >= 80) return 'very-angry';
    if (value >= 60) return 'angry';
    if (value >= 40) return 'irritated';
    if (value >= 20) return 'tense';
    return 'calm';
  }

  function save() {
    const state = { version:VERSION, anger, peakAnger, escalations, deescalations, painPenaltyTicks, level:level() };
    try { sessionStorage.setItem(key(), JSON.stringify(state)); } catch (_) {}
    try {
      const r = record();
      if (r?.documentation) {
        r.documentation.patientAnger = state;
        api?.save?.(r);
      }
    } catch (_) {}
  }

  function load() {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(key()) || '{}');
      anger = Number.isFinite(Number(parsed.anger)) ? clamp(parsed.anger) : 8;
      peakAnger = Number.isFinite(Number(parsed.peakAnger)) ? clamp(parsed.peakAnger) : anger;
      escalations = Number(parsed.escalations) || 0;
      deescalations = Number(parsed.deescalations) || 0;
      painPenaltyTicks = Number(parsed.painPenaltyTicks) || 0;
    } catch (_) {}
  }

  function change(delta, reason = '') {
    if (!delta) return;
    const before = anger;
    anger = clamp(anger + delta);
    peakAnger = Math.max(peakAnger, anger);
    if (anger > before) escalations += 1;
    if (anger < before) deescalations += 1;
    save();
    window.dispatchEvent(new CustomEvent('emscodesim:patient-anger-change', { detail:{ before, anger, delta, reason, level:level() } }));
  }

  function responseEffect(text) {
    const t = String(text || '').toLowerCase();
    let delta = 0;
    if (/i hear you|you.re right|understand|i know this hurts|sorry|thank you for telling|keep you updated|tell you before|warn you|go slowly|support your leg|keep.*still|safest way|recheck|reassess/.test(t)) delta -= 10;
    if (/i can.t tell|don.t want to guess|need.*evaluate|hospital.*evaluate/.test(t)) delta -= 3;
    if (/one more|little more|still checking|wait|just a minute/.test(t)) delta += 5;
    if (/calm down|just relax|stop asking|you.ll be fine|nothing to worry|we don.t have time|because i said|do what i say|quit moving/.test(t)) delta += 18;
    return delta;
  }

  function readRapportEvents() {
    let state;
    try { state = JSON.parse(sessionStorage.getItem(rapportKey()) || '{}'); }
    catch (_) { return; }
    const events = Array.isArray(state.events) ? state.events : [];
    if (lastRapportEventCount > events.length) lastRapportEventCount = 0;
    const fresh = events.slice(lastRapportEventCount);
    lastRapportEventCount = events.length;
    fresh.forEach(event => {
      if (event?.type === 'provider-response') change(responseEffect(event.response), 'provider-response');
      if (event?.type === 'unanswered-concern') change(12, 'ignored-patient');
      if (event?.type === 'repeated-unanswered') change(6, 'repeated-ignored-concern');
    });
  }

  function evaluatePainAndCare() {
    const state = runtime?.horseClinicalState?.(record());
    if (!state) return;

    if (state.unsafeMovement && !lastUnsafeMovement) change(18, 'painful-or-unsafe-movement');
    lastUnsafeMovement = Boolean(state.unsafeMovement);

    if (state.stage !== lastStage) {
      if (state.stage === 'supported') change(-12, 'leg-supported');
      if (state.stage === 'pain-improved') change(-16, 'pain-treated');
      if (state.stage === 'relieved') change(-24, 'pain-controlled-and-supported');
      if (state.stage === 'pain-escalating') change(8, 'pain-worsening');
      if (state.stage === 'delayed-care') change(14, 'pain-treatment-delayed');
      if (state.stage === 'worse') change(15, 'patient-worsened');
      lastStage = state.stage;
    }

    if (!state.stabilization && !state.painControl && state.elapsedSeconds >= 180) {
      painPenaltyTicks += 1;
      const delta = state.elapsedSeconds >= 480 ? 7 : state.elapsedSeconds >= 300 ? 5 : 3;
      change(delta, 'ongoing-untreated-pain');
    } else if (state.stabilization || state.painControl) {
      painPenaltyTicks = 0;
    }
  }

  function angerPrefix() {
    switch (level()) {
      case 'very-angry': return 'No. Stop for a second and listen to me. ';
      case 'angry': return 'I need you to listen to me. ';
      case 'irritated': return 'I’m getting frustrated here. ';
      case 'tense': return 'I’m getting pretty worried. ';
      default: return '';
    }
  }

  function angerSuffix() {
    switch (level()) {
      case 'very-angry': return ' I am not letting anyone move me until you tell me exactly what you are doing.';
      case 'angry': return ' Please explain what you are doing before you touch or move my leg again.';
      case 'irritated': return ' I need somebody to tell me what is happening.';
      case 'tense': return ' Please keep me informed.';
      default: return '';
    }
  }

  function alterVisiblePatientResponse(host) {
    if (!host || host.hidden || anger < 20) return;
    const line = host.querySelector('.patient-line');
    if (!line) return;
    const raw = String(line.textContent || '').replace(/[“”]/g, '').trim();
    if (!raw || line.dataset.angerAdjusted === '1') return;
    const isReply = host.classList.contains('replying');
    if (isReply) return;
    const adjusted = `${angerPrefix()}${raw}`;
    line.textContent = `“${adjusted}”`;
    line.dataset.angerAdjusted = '1';
  }

  function behavior() {
    if (anger >= 80) return 'Very angry: confrontational, frequently interrupts, and refuses movement until the crew acknowledges her pain and clearly explains the plan.';
    if (anger >= 60) return 'Angry: demanding, skeptical, and less cooperative. She needs respectful explanation and evidence that the crew is addressing her pain.';
    if (anger >= 40) return 'Irritated: asks sharper questions and becomes less patient with delays or vague answers.';
    if (anger >= 20) return 'Tense: worried and increasingly sensitive to delays, unexplained actions, and painful movement.';
    return 'Calm enough to cooperate with assessment and treatment.';
  }

  function model() {
    return { anger, peakAnger, level:level(), escalations, deescalations, painPenaltyTicks, behavior:behavior() };
  }

  function start() {
    load();
    try {
      const parsed = JSON.parse(sessionStorage.getItem(rapportKey()) || '{}');
      lastRapportEventCount = Array.isArray(parsed.events) ? parsed.events.length : 0;
    } catch (_) {}

    const host = $('patientConversationTurn');
    if (host) {
      hostObserver = new MutationObserver(() => alterVisiblePatientResponse(host));
      hostObserver.observe(host, { childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['hidden','class'] });
    }

    document.addEventListener('click', event => {
      const button = event.target.closest?.('#patientConversationTurn [data-patient-choice]');
      if (button) window.setTimeout(() => {
        const effect = responseEffect(button.textContent || '');
        if (effect < 0 && anger >= 40) change(Math.round(effect * 0.35), 'active-deescalation');
      }, 40);
    }, true);

    timer = window.setInterval(() => {
      readRapportEvents();
      evaluatePainAndCare();
    }, 30000);
    window.setTimeout(() => { readRapportEvents(); evaluatePainAndCare(); }, 5000);

    window.EMSCodeSimPatientAnger = Object.freeze({ version:VERSION, model, behavior, change });
    window.addEventListener('pagehide', () => {
      clearInterval(timer);
      hostObserver?.disconnect();
      save();
    }, { once:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
