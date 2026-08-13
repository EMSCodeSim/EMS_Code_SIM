(() => {
  'use strict';

  const VERSION = '2026.08.13.1';
  const params = new URLSearchParams(location.search);
  const requested = String(params.get('case') || '').replace(/-/g, '_').toLowerCase();
  if (requested !== 'horse_crush') return;

  const $ = id => document.getElementById(id);
  const api = window.EMSCodeSimPatientRecord;
  const session = window.EMSCodeSimScenarioSession;
  const runtime = window.EMSCodeSimScenarioRuntime;
  let observer = null;
  let queued = false;

  function record() {
    try { return session?.sync?.() || api?.active?.() || null; }
    catch (_) { return null; }
  }

  function clamp(value) {
    return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  }

  function comfortScore() {
    const state = runtime?.horseClinicalState?.(record());
    if (!state) return 55;
    if (state.stage === 'relieved') return 100;
    if (state.stage === 'pain-improved') return 88;
    if (state.stage === 'supported') return 78;
    if (state.stage === 'stabilized') return 75;
    if (state.stage === 'pain-escalating') return 38;
    if (state.stage === 'delayed-care') return 20;
    if (state.stage === 'worse') return 10;
    return state.painScore >= 9 ? 35 : state.painScore <= 5 ? 80 : 55;
  }

  function satisfactionModel() {
    const communication = window.EMSCodeSimPatientRapport?.model?.() || {};
    const anger = window.EMSCodeSimPatientAnger?.model?.() || {};
    const communicationScore = clamp(communication.score ?? 70);
    const angerScore = clamp(100 - (anger.anger ?? 8));
    const comfort = comfortScore();

    // Satisfaction is deliberately patient-experience based. Clinical actions only
    // matter here when they change what the patient experiences (pain, delay,
    // explanation, trust, cooperation), not because they match a checklist.
    const score = clamp((communicationScore * .55) + (angerScore * .25) + (comfort * .20));

    let label = 'Patient left dissatisfied';
    if (score >= 90) label = 'Patient felt exceptionally well cared for';
    else if (score >= 80) label = 'Patient felt well cared for';
    else if (score >= 70) label = 'Patient was generally satisfied';
    else if (score >= 60) label = 'Patient had mixed feelings about the encounter';

    const strengths = [];
    const friction = [];
    if ((communication.positiveResponses || 0) >= 3) strengths.push('You explained care and responded respectfully to concerns.');
    if ((communication.unanswered || 0) === 0) strengths.push('Linda did not feel ignored when she raised concerns.');
    if ((anger.deescalations || 0) > 0) strengths.push('You were able to calm Linda after frustration increased.');
    if (comfort >= 78) strengths.push('Her pain and physical comfort improved during the encounter.');

    if ((communication.unanswered || 0) > 0) friction.push(`${communication.unanswered} patient concern${communication.unanswered === 1 ? ' was' : 's were'} left unanswered.`);
    if ((communication.poorResponses || 0) > 0) friction.push('Some responses made Linda feel less heard or reassured.');
    if ((anger.anger || 0) >= 40) friction.push('Linda remained frustrated near the end of the encounter.');
    if (comfort < 55) friction.push('Pain or discomfort remained a major part of her experience.');

    return {
      score,
      label,
      communicationScore,
      angerScore,
      comfort,
      mood:communication.mood || 'uncertain',
      finalAnger:Number(anger.anger) || 0,
      peakAnger:Number(anger.peakAnger) || 0,
      strengths,
      friction
    };
  }

  function patientQuote(model) {
    if (model.score >= 90) return 'I was scared and hurting, but they listened to me, explained what was happening, and made me feel like I mattered.';
    if (model.score >= 80) return 'They kept me informed and treated me like a person. I still hurt, but I felt like they were taking care of me.';
    if (model.score >= 70) return 'Overall they took care of me, although there were a few times I wasn’t sure what was happening.';
    if (model.score >= 60) return 'They helped me, but I wish they had listened more and explained what they were doing.';
    return 'I was hurting and scared, and I didn’t feel like they were really listening to me.';
  }

  function hideClinicalGradeUi(workspace) {
    const ids = [
      'horseGradeCategories', 'horseGradeStrengths', 'horseGradeImprovements',
      'horseGradeTreatmentList', 'horseGradeTreatmentStatus', 'horseGradeNextFocus',
      'horseGradeNarrative', 'horseCommunicationGrade', 'horseCommunicationDetail'
    ];
    ids.forEach(id => {
      const node = $(id);
      if (node) node.hidden = true;
    });
    workspace.querySelectorAll('.horse-grade-treatment-review,.horse-grade-feedback-grid,.horse-grade-next-call').forEach(node => node.hidden = true);
  }

  function render() {
    queued = false;
    const workspace = $('horseGradeWorkspace');
    if (!workspace || workspace.hidden) return;

    hideClinicalGradeUi(workspace);
    const model = satisfactionModel();

    const score = $('horseGradeScore');
    if (score) {
      score.innerHTML = `<strong>${model.score}</strong><span>/100</span>`;
      score.setAttribute('aria-label', `Patient satisfaction score ${model.score} out of 100`);
    }

    const title = $('horseGradeTitle');
    if (title) title.textContent = 'Patient satisfaction';
    const label = $('horseGradeLabel');
    if (label) label.textContent = model.label;
    const outcome = $('horseGradeOutcome');
    if (outcome) outcome.innerHTML = '<strong>Surprise grading criterion</strong><p>This scenario was scored only on how the patient experienced the encounter. Clinical decisions were intentionally left for instructor-led discussion.</p>';

    const summary = workspace.querySelector('.horse-grade-summary');
    if (!summary) return;
    let card = $('horsePatientSatisfactionReveal');
    if (!card) {
      card = document.createElement('section');
      card.id = 'horsePatientSatisfactionReveal';
      card.className = 'horse-patient-satisfaction-reveal';
      summary.appendChild(card);
    }

    const positives = model.strengths.length ? model.strengths : ['Linda completed the encounter with enough trust to continue care.'];
    const friction = model.friction.length ? model.friction : ['No major patient-experience concerns stood out.'];
    card.innerHTML = `
      <div class="satisfaction-reveal-banner">
        <small>WHAT WAS ACTUALLY GRADED</small>
        <strong>Patient Satisfaction</strong>
        <p>Nothing else in this scenario contributes to the score.</p>
      </div>
      <blockquote>“${patientQuote(model)}”<cite>— Linda, patient perspective</cite></blockquote>
      <div class="satisfaction-experience-grid">
        <article><small>WHAT HELPED HER EXPERIENCE</small><ul>${positives.map(item => `<li>${item}</li>`).join('')}</ul></article>
        <article><small>WHAT HURT HER EXPERIENCE</small><ul>${friction.map(item => `<li>${item}</li>`).join('')}</ul></article>
      </div>
      <p class="satisfaction-instructor-note">Clinical assessment, treatment choices, transport decisions, and technical performance are not scored here. Use those for the class discussion.</p>`;
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(render);
  }

  function installStyles() {
    if (document.querySelector('style[data-patient-satisfaction-grade]')) return;
    const style = document.createElement('style');
    style.dataset.patientSatisfactionGrade = VERSION;
    style.textContent = `
      .horse-patient-satisfaction-reveal{display:grid;gap:12px;margin-top:12px}
      .satisfaction-reveal-banner{padding:14px;border:1px solid #4288a4;border-radius:12px;background:#0b2939;display:grid;gap:3px}
      .satisfaction-reveal-banner small,.satisfaction-experience-grid small{font-size:.68rem;font-weight:900;letter-spacing:.09em;color:#8fd1e9}
      .satisfaction-reveal-banner strong{font-size:1.18rem;color:#fff}.satisfaction-reveal-banner p{margin:0;color:#bed4de;font-size:.78rem}
      .horse-patient-satisfaction-reveal blockquote{margin:0;padding:14px 16px;border-left:4px solid #75c5df;border-radius:8px;background:#102d3c;color:#edf8fb;font-size:.95rem;line-height:1.5}
      .horse-patient-satisfaction-reveal cite{display:block;margin-top:7px;color:#9fc2d0;font-size:.72rem;font-style:normal}
      .satisfaction-experience-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.satisfaction-experience-grid article{padding:11px;border-radius:10px;background:#102736;border:1px solid #2c5568}.satisfaction-experience-grid ul{margin:7px 0 0;padding-left:18px;display:grid;gap:5px;font-size:.76rem;line-height:1.35;color:#e4eff3}
      .satisfaction-instructor-note{margin:0;padding-top:8px;border-top:1px solid #315465;color:#9fb9c5;font-size:.72rem;line-height:1.4}
      @media(max-width:760px){.satisfaction-experience-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function start() {
    installStyles();
    observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden'] });
    document.addEventListener('click', event => {
      if (event.target.closest?.('#openHorseCallGrade,.handoff-grade-button,[data-grade],#horseGradeReturn')) window.setTimeout(schedule, 100);
    }, true);
    window.addEventListener('emscodesim:scenario-updated', schedule);
    window.EMSCodeSimPatientSatisfactionGrade = Object.freeze({ version:VERSION, model:satisfactionModel });
    schedule();
    window.addEventListener('pagehide', () => observer?.disconnect(), { once:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
