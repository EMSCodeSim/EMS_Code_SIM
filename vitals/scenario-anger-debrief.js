(() => {
  'use strict';

  const VERSION = '2026.08.13.1';
  const params = new URLSearchParams(location.search);
  const requested = String(params.get('case') || '').replace(/-/g, '_').toLowerCase();
  if (requested !== 'horse_crush') return;

  const $ = id => document.getElementById(id);
  let observer = null;
  let queued = false;

  function installPatientResponseHitTargetFix() {
    if (document.querySelector('style[data-patient-response-hit-target-fix]')) return;
    const style = document.createElement('style');
    style.dataset.patientResponseHitTargetFix = VERSION;
    style.textContent = `
      #patientCommunicationStage,
      #patientConversationTurn,
      #patientConversationTurn .patient-conversation-choices {
        position: relative !important;
        pointer-events: auto !important;
      }
      #patientCommunicationStage { z-index: 40 !important; }
      #patientConversationTurn { z-index: 41 !important; }
      #patientConversationTurn .patient-conversation-choices { z-index: 42 !important; }
      #patientConversationTurn .patient-conversation-choices button,
      #patientConversationTurn button[data-patient-choice],
      #patientConversationTurn button[data-first-time-choice] {
        position: relative !important;
        z-index: 43 !important;
        pointer-events: auto !important;
        touch-action: manipulation !important;
        cursor: pointer !important;
      }
    `;
    document.head.appendChild(style);
  }

  function statusFor(score) {
    if (score >= 85) return 'Strong';
    if (score >= 70) return 'Adequate';
    if (score >= 55) return 'Developing';
    return 'Needs improvement';
  }

  function deescalationScore(model) {
    if (!model) return 70;
    let score = 100;
    score -= Math.max(0, model.peakAnger - 20) * 0.55;
    score -= Math.max(0, model.anger - 15) * 0.6;
    score -= Math.max(0, model.painPenaltyTicks || 0) * 5;
    score += Math.min(12, Math.max(0, model.deescalations || 0) * 2);
    if (model.peakAnger >= 60 && model.anger <= 25) score += 12;
    if (model.peakAnger >= 80 && model.anger >= 60) score -= 15;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function narrative(model, score) {
    if (!model) return 'Patient anger data was not available for this call.';
    if (model.peakAnger < 30) return 'The patient never became significantly angry. You addressed concerns early enough to prevent communication from becoming a barrier to care.';
    if (model.peakAnger >= 60 && model.anger <= 25) return 'The patient became angry during the call, but you successfully de-escalated her by acknowledging her concerns, explaining the plan, and addressing pain or stabilization. Cooperation improved before movement and transport.';
    if (model.peakAnger >= 60 && model.anger >= 60) return 'The patient remained angry and increasingly resistant because her concerns or pain were not adequately addressed. Communication became a barrier to movement and treatment.';
    if ((model.painPenaltyTicks || 0) >= 2) return 'Pain was left inadequately addressed long enough to increase frustration. Better communication helped somewhat, but the patient needed timely stabilization or pain treatment—not reassurance alone.';
    if (score >= 70) return 'The patient became irritated at times, but you generally kept the interaction under control and restored cooperation with explanation and respectful communication.';
    return 'The patient became progressively more frustrated. More timely acknowledgement, explanation, and action on pain would have reduced escalation and improved cooperation.';
  }

  function render() {
    queued = false;
    const workspace = $('horseGradeWorkspace');
    const detail = $('horseCommunicationDetail');
    if (!workspace || workspace.hidden || !detail) return;
    const model = window.EMSCodeSimPatientAnger?.model?.();
    if (!model) return;
    const score = deescalationScore(model);
    const status = statusFor(score);

    const list = detail.querySelector('.communication-skill-list');
    if (list) {
      let row = $('horseAngerDeescalationRow');
      if (!row) {
        row = document.createElement('div');
        row.id = 'horseAngerDeescalationRow';
        list.appendChild(row);
      }
      row.className = `communication-skill-row ${status.toLowerCase().replace(/\s+/g, '-')}`;
      row.innerHTML = `<span>De-escalated patient anger</span><strong>${status}</strong><small>${score}/100</small>`;
    }

    let article = $('horseAngerNarrative');
    if (!article) {
      article = document.createElement('article');
      article.id = 'horseAngerNarrative';
      article.className = 'communication-patient-effect';
      detail.appendChild(article);
    }
    article.innerHTML = `<small>ANGER / DE-ESCALATION</small><p>${narrative(model, score)}</p><p><b>Peak anger:</b> ${model.peakAnger}/100 • <b>Final anger:</b> ${model.anger}/100 • <b>Final behavior:</b> ${String(model.level || '').replace(/-/g, ' ')}</p>`;
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(render);
  }

  function start() {
    installPatientResponseHitTargetFix();
    observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden'] });
    window.addEventListener('emscodesim:patient-anger-change', schedule);
    document.addEventListener('click', event => {
      if (event.target.closest?.('#openHorseCallGrade,.handoff-grade-button,[data-grade]')) setTimeout(schedule, 160);
    }, true);
    schedule();
    window.addEventListener('pagehide', () => observer?.disconnect(), { once:true });
  }

  window.EMSCodeSimAngerDebrief = Object.freeze({ version:VERSION, score:() => deescalationScore(window.EMSCodeSimPatientAnger?.model?.()) });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
