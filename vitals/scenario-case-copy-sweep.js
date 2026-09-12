(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const caseId = String(params.get('case') || '').replace(/-/g, '_').toLowerCase();
  if (!['asthma', 'horse_crush'].includes(caseId)) return;

  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];
  const setText = (node, value) => {
    if (node && node.textContent !== value) node.textContent = value;
  };

  function bindHorseContract() {
    const scene = 'Crush mechanism: patient compressed between two horses outside the south barn; scene is safe and the patient remains on the ground with severe left-hip pain.';
    const defs = window.EMSCodeSimScenarioDefinitions;
    if (defs?.CATALOG?.horse_crush && defs.CATALOG.horse_crush.scene !== scene) defs.CATALOG.horse_crush.scene = scene;
    if (defs?.PROFILES?.horse_crush && defs.PROFILES.horse_crush.scene !== scene) defs.PROFILES.horse_crush.scene = scene;
  }

  function hideNode(node) {
    if (!node) return;
    if (!node.hidden) node.hidden = true;
    if (node.getAttribute('aria-hidden') !== 'true') node.setAttribute('aria-hidden', 'true');
    if (node.style.getPropertyValue('display') !== 'none' || node.style.getPropertyPriority('display') !== 'important') {
      node.style.setProperty('display', 'none', 'important');
    }
  }

  function sweepAsthma() {
    const asthma = window.EMSCodeSimAsthmaLearningCase;
    if (!asthma) return false;

    setText(q('#dispatch'), 'BREATHING PROBLEM • PUBLIC PARK');
    setText(q('#caseTitle'), `“${asthma.chiefComplaint}”`);
    setText(q('#scene'), asthma.scene);
    const clock = q('#patientClockStatus');
    if (clock && !/reassess/i.test(clock.textContent || '')) setText(clock, asthma.clockLabel);

    [
      '#horseGradeWorkspace', '#horseClinicalQuestionBox', '#horseCurrentAssessment',
      '#horseArrivalDecision', '#horseEncounterProgress', '.horse-question-placeholder',
      '.horse-assessment-drill-choice', '.horse-assessment-drill-menu', '.horse-assessment-workspace-action',
      '.horse-assessment-workspace-head', '.horse-grade-button', '.handoff-grade-button'
    ].forEach(selector => qa(selector).forEach(hideNode));
    return true;
  }

  function run() {
    if (caseId === 'horse_crush') bindHorseContract();
    if (caseId === 'asthma') return sweepAsthma();
    return true;
  }

  run();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });

  // Late-loaded scenario modules can create the horse-only shells after this file runs.
  // Observe insertions only, debounce them, and stop once the asthma contract is present.
  let queued = false;
  let passes = 0;
  const observer = new MutationObserver(mutations => {
    if (!mutations.some(mutation => mutation.addedNodes?.length)) return;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      passes += 1;
      run();
      if (caseId !== 'asthma' || (window.EMSCodeSimAsthmaLearningCase && passes > 12)) observer.disconnect();
    });
  });
  if (document.documentElement) observer.observe(document.documentElement, { subtree: true, childList: true });

  window.addEventListener('emscodesim:scenario-updated', run);
  window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
})();
