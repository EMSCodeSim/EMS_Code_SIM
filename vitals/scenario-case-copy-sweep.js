(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const caseId = String(params.get('case') || '').replace(/-/g, '_').toLowerCase();
  if (!['asthma', 'horse_crush'].includes(caseId)) return;

  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];

  function bindHorseContract() {
    const scene = 'Crush mechanism: patient compressed between two horses outside the south barn; scene is safe and the patient remains on the ground with severe left-hip pain.';
    const defs = window.EMSCodeSimScenarioDefinitions;
    if (defs?.CATALOG?.horse_crush) defs.CATALOG.horse_crush.scene = scene;
    if (defs?.PROFILES?.horse_crush) defs.PROFILES.horse_crush.scene = scene;
  }

  function sweepAsthma() {
    const asthma = window.EMSCodeSimAsthmaLearningCase;
    if (!asthma) return;

    const dispatch = q('#dispatch');
    const title = q('#caseTitle');
    const scene = q('#scene');
    const clock = q('#patientClockStatus');
    if (dispatch) dispatch.textContent = 'BREATHING PROBLEM • PUBLIC PARK';
    if (title) title.textContent = `“${asthma.chiefComplaint}”`;
    if (scene) scene.textContent = asthma.scene;
    if (clock && !/reassess/i.test(clock.textContent || '')) clock.textContent = asthma.clockLabel;

    [
      '#horseGradeWorkspace', '#horseClinicalQuestionBox', '#horseCurrentAssessment',
      '#horseArrivalDecision', '#horseEncounterProgress', '.horse-question-placeholder',
      '.horse-assessment-drill-choice', '.horse-assessment-drill-menu', '.horse-assessment-workspace-action',
      '.horse-assessment-workspace-head', '.horse-grade-button', '.handoff-grade-button'
    ].forEach(selector => qa(selector).forEach(node => {
      node.hidden = true;
      node.setAttribute('aria-hidden', 'true');
      node.style.setProperty('display', 'none', 'important');
    }));
  }

  function run() {
    if (caseId === 'horse_crush') bindHorseContract();
    if (caseId === 'asthma') sweepAsthma();
  }

  run();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  const observer = new MutationObserver(() => requestAnimationFrame(run));
  if (document.documentElement) observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class'] });
  window.addEventListener('emscodesim:scenario-updated', run);
  window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
})();
