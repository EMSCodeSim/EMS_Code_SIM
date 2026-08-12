(() => {
  'use strict';

  const VERSION = '2026.08.12.1';
  const params = new URLSearchParams(location.search);
  const requested = String(params.get('case') || '').replace(/-/g, '_').toLowerCase();
  if (requested !== 'horse_crush') return;

  const $ = id => document.getElementById(id);
  const api = window.EMSCodeSimPatientRecord;
  const session = window.EMSCodeSimScenarioSession;
  let observer = null;
  let queued = false;

  const normalize = value => String(value || '')
    .replace(/[“”"'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  function record() {
    try { return session?.sync?.() || api?.active?.() || null; }
    catch (_) { return null; }
  }

  function rapportState() {
    const r = record();
    const key = `emscodesim:rapport:${r?.startedAt || r?.id || 'horse-crush'}`;
    try {
      const parsed = JSON.parse(sessionStorage.getItem(key) || '{}');
      return {
        rapport:Number(parsed.rapport) || 0,
        unanswered:Number(parsed.unanswered) || 0,
        events:Array.isArray(parsed.events) ? parsed.events : []
      };
    } catch (_) {
      return { rapport:0, unanswered:0, events:[] };
    }
  }

  function responseEvents(state) {
    return state.events.filter(event => event?.type === 'provider-response');
  }

  function behaviorScore(events, positive, negative = null, base = 55) {
    let score = base;
    let positives = 0;
    let negatives = 0;
    events.forEach(event => {
      const text = normalize(event.response);
      if (positive.test(text)) { positives += 1; score += 14; }
      if (negative?.test(text)) { negatives += 1; score -= 20; }
    });
    return {
      score:Math.max(0, Math.min(100, Math.round(score))),
      positives,
      negatives
    };
  }

  function communicationBreakdown() {
    const state = rapportState();
    const responses = responseEvents(state);
    const ignored = state.events.filter(event => event?.type === 'unanswered-concern').length;
    const repeatedIgnored = state.events.filter(event => event?.type === 'repeated-unanswered').length;

    const rapport = behaviorScore(
      responses,
      /i hear you|understand|thank|you.re right|i know|appreciate|tell me|keep you updated|explain|safest|support|keep.*still/,
      /calm down|just relax|stop asking|because i said|dont have time|don't have time/
    );

    const explanations = behaviorScore(
      responses,
      /explain|tell you|keep you updated|what.*checking|making sure|safest|before.*move|reassess|recheck|hospital.*evaluate/,
      /because i said|dont need to know|don't need to know|just do what i say/
    );

    const concerns = behaviorScore(
      responses,
      /i hear you|you.re right|understand|call.*husband|horses|pain|worried|scared|tell me|address|help|support/,
      /stop asking|not important|doesnt matter|doesn't matter|ignore/
    );
    concerns.score = Math.max(0, concerns.score - ignored * 18 - repeatedIgnored * 7);

    const movement = behaviorScore(
      responses,
      /warn|before.*move|tell.*before|go slowly|support.*leg|keep.*supported|position.*comfort|recheck.*foot|reassess.*circulation/,
      /just move|straighten|stand up|move now/
    );

    const focus = behaviorScore(
      responses,
      /while.*check|while.*get|then.*reassess|continue|monitor|next|transport|hospital|assessment|checking|treat|stabil|recheck/,
      /we can talk about that|tell me more about the horse|what kind of horse|forget the assessment/
    );
    if (responses.length >= 4) focus.score = Math.min(100, focus.score + 10);

    const reassurance = behaviorScore(
      responses,
      /cant tell|can't tell|dont want to guess|don't want to guess|need.*evaluate|hospital.*evaluate|keep.*updated|we.ll.*check|we'll.*check/,
      /you.ll be fine|you'll be fine|nothing to worry|definitely not broken|definitely fine|promise/
    );

    const anxiety = behaviorScore(
      responses,
      /i hear you|understand|worried|scared|explain|keep you updated|tell.*before|go slowly|support|thank.*telling/,
      /calm down|just relax|stop asking|you.re overreacting|you're overreacting/
    );
    anxiety.score = Math.max(0, anxiety.score - ignored * 10);

    const items = [
      { key:'rapport', label:'Established rapport', ...rapport },
      { key:'explanations', label:'Explained procedures', ...explanations },
      { key:'concerns', label:'Addressed patient concerns', ...concerns },
      { key:'movement', label:'Warned before painful movement', ...movement },
      { key:'focus', label:'Maintained clinical focus during distraction', ...focus },
      { key:'reassurance', label:'Avoided false reassurance', ...reassurance },
      { key:'anxiety', label:'Responded to worsening anxiety', ...anxiety }
    ];

    return { state, responses, ignored, repeatedIgnored, items };
  }

  function statusFor(score) {
    if (score >= 85) return 'Strong';
    if (score >= 70) return 'Adequate';
    if (score >= 55) return 'Developing';
    return 'Needs improvement';
  }

  function patientNarrative(model) {
    const score = window.EMSCodeSimPatientRapport?.model?.()?.score ?? 70;
    const rapport = Number(model.state.rapport) || 0;
    const unanswered = model.ignored;
    const movement = model.items.find(item => item.key === 'movement')?.score || 0;
    const concerns = model.items.find(item => item.key === 'concerns')?.score || 0;

    if (rapport >= 8 && unanswered === 0) {
      return 'The patient became progressively calmer and more cooperative because you answered her concerns, explained what you were doing, and kept her informed. She trusted the crew and was more willing to follow directions during movement and transport.';
    }
    if (rapport >= 2 && score >= 75) {
      return unanswered
        ? `The patient generally trusted the crew, but ${unanswered} concern${unanswered === 1 ? ' went' : 's went'} unanswered and briefly increased her anxiety. Clear explanations helped restore cooperation.`
        : 'The patient remained worried but cooperative. Your explanations and reassurance kept her engaged without distracting from the clinical work.';
    }
    if (movement < 55) {
      return 'The patient became more guarded around movement because she was not consistently warned or prepared before painful actions. Her anxiety made cooperation more difficult until the crew slowed down and explained the plan.';
    }
    if (concerns < 55 || unanswered > 1) {
      return `The patient became increasingly anxious when ${unanswered || 'several'} concern${unanswered === 1 ? ' was' : 's were'} not addressed. She asked more questions and required additional reassurance, creating avoidable distraction during the call.`;
    }
    if (rapport <= -7) {
      return 'The patient became frustrated and less cooperative because she did not feel heard. Communication itself became a barrier to assessment, treatment, and movement.';
    }
    return 'The patient remained uncertain and watched the crew closely. More consistent explanation, acknowledgement of concerns, and warning before movement would have improved trust and cooperation.';
  }

  function rowMarkup(item) {
    const status = statusFor(item.score);
    return `<div class="communication-skill-row ${status.toLowerCase().replace(/\s+/g, '-')}"><span>${item.label}</span><strong>${status}</strong><small>${item.score}/100</small></div>`;
  }

  function render() {
    queued = false;
    const workspace = $('horseGradeWorkspace');
    const card = $('horseCommunicationGrade');
    if (!workspace || workspace.hidden || !card) return;

    const model = communicationBreakdown();
    let detail = $('horseCommunicationDetail');
    if (!detail) {
      detail = document.createElement('section');
      detail.id = 'horseCommunicationDetail';
      detail.className = 'horse-communication-detail';
      card.insertAdjacentElement('afterend', detail);
    }

    const narrative = patientNarrative(model);
    const html = `
      <div class="communication-detail-head">
        <div><small>COMMUNICATION SKILLS</small><strong>How you managed the patient</strong></div>
        <span>${model.responses.length} responses</span>
      </div>
      <div class="communication-skill-list">${model.items.map(rowMarkup).join('')}</div>
      <article class="communication-patient-effect">
        <small>PATIENT RESPONSE</small>
        <p>${narrative}</p>
      </article>`;
    if (detail.innerHTML !== html) detail.innerHTML = html;
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(render);
  }

  function installStyles() {
    if (document.querySelector('style[data-communication-debrief]')) return;
    const style = document.createElement('style');
    style.dataset.communicationDebrief = VERSION;
    style.textContent = `
      .horse-communication-detail{margin-top:10px;border:1px solid #35677d;border-radius:11px;background:#0b2231;padding:11px;display:grid;gap:10px}
      .communication-detail-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.communication-detail-head>div{display:grid;gap:2px}.communication-detail-head small,.communication-patient-effect small{font-size:.67rem;font-weight:900;letter-spacing:.08em;color:#8fcbe2}.communication-detail-head strong{font-size:.94rem}.communication-detail-head>span{font-size:.68rem;color:#b9d3df}
      .communication-skill-list{display:grid;gap:5px}.communication-skill-row{display:grid;grid-template-columns:minmax(0,1fr) auto 48px;align-items:center;gap:8px;padding:7px 8px;border-radius:8px;background:#102d3f;font-size:.75rem}.communication-skill-row strong{font-size:.7rem}.communication-skill-row small{text-align:right;color:#a9c9d6}.communication-skill-row.strong strong{color:#83e0ae}.communication-skill-row.adequate strong{color:#b9df8c}.communication-skill-row.developing strong{color:#ffd17b}.communication-skill-row.needs-improvement strong{color:#ff9b8f}
      .communication-patient-effect{border-top:1px solid #2d5263;padding-top:9px}.communication-patient-effect p{margin:4px 0 0;font-size:.77rem;line-height:1.45;color:#e7f1f5}
    `;
    document.head.appendChild(style);
  }

  function start() {
    installStyles();
    observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList:true,subtree:true,attributes:true,attributeFilter:['hidden'] });
    document.addEventListener('click', event => {
      if (event.target.closest?.('#openHorseCallGrade,.handoff-grade-button,[data-grade]')) setTimeout(schedule, 140);
    }, true);
    window.addEventListener('emscodesim:scenario-updated', schedule);
    schedule();
    window.addEventListener('pagehide', () => observer?.disconnect(), { once:true });
  }

  window.EMSCodeSimCommunicationDebrief = Object.freeze({ version:VERSION, model:communicationBreakdown });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
