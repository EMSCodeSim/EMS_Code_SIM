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

  function ensureVideoRecoveryStyle() {
    if (q('#asthmaVideoRecoveryStyle')) return;
    const style = document.createElement('style');
    style.id = 'asthmaVideoRecoveryStyle';
    style.textContent = `
      #asthmaVideoStartFallback{
        position:absolute;inset:auto 50% 22px auto;transform:translateX(50%);z-index:60;
        border:1px solid rgba(255,255,255,.5);border-radius:12px;background:#fff;color:#102b43;
        padding:12px 16px;font:inherit;font-weight:900;box-shadow:0 8px 24px rgba(0,0,0,.28);cursor:pointer
      }
      #asthmaVideoStartFallback[hidden]{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function ensureVideoFallbackButton() {
    const stage = q('.patient-stage');
    if (!stage) return null;
    ensureVideoRecoveryStyle();
    let button = q('#asthmaVideoStartFallback');
    if (!button) {
      button = document.createElement('button');
      button.id = 'asthmaVideoStartFallback';
      button.type = 'button';
      button.textContent = 'Start patient video';
      button.hidden = true;
      button.addEventListener('click', async () => {
        const shell = q('#scenarioIntroVideo');
        const video = q('#scenarioIntroVideoElement');
        if (!video) return;
        shell?.classList.remove('resting');
        if (shell) shell.hidden = false;
        button.hidden = true;
        try {
          video.muted = true;
          video.playsInline = true;
          video.currentTime = 0;
          await video.play();
        } catch (_) {
          button.hidden = false;
        }
      });
      stage.appendChild(button);
    }
    return button;
  }

  function repairAsthmaVideo() {
    if (caseId !== 'asthma') return;
    const shell = q('#scenarioIntroVideo');
    const video = q('#scenarioIntroVideoElement');
    if (!shell || !video) return;

    const fallback = ensureVideoFallbackButton();
    if (!video.dataset.asthmaRecoveryWired) {
      video.dataset.asthmaRecoveryWired = '1';
      video.addEventListener('playing', () => { if (fallback) fallback.hidden = true; });
      video.addEventListener('ended', () => { if (fallback) fallback.hidden = true; });
      video.addEventListener('error', () => { if (fallback) fallback.hidden = false; });
      video.addEventListener('stalled', () => { if (!video.ended && fallback) fallback.hidden = false; });
      video.addEventListener('waiting', () => {
        window.setTimeout(() => {
          if (video.paused && !video.ended && fallback) fallback.hidden = false;
        }, 900);
      });
    }

    const atStart = !Number.isFinite(video.currentTime) || video.currentTime < 0.15;
    const looksStuck = shell.hidden || (video.paused && !video.ended && atStart);
    if (looksStuck && !shell.dataset.recoveryAttempted) {
      shell.dataset.recoveryAttempted = '1';
      shell.hidden = false;
      shell.classList.remove('resting');
      try { window.EMSCodeSimScenarioIntroVideo?.replay?.(); } catch (_) {}
      window.setTimeout(() => {
        if (video.paused && !video.ended && fallback) fallback.hidden = false;
      }, 1200);
    }
  }

  function ensureAsthmaStartupGuard() {
    if (caseId !== 'asthma' || q('script[data-asthma-startup-guard]')) return;
    const script = document.createElement('script');
    script.src = '/vitals/scenario-asthma-startup-guard.js?v=2026.09.12.1';
    script.async = false;
    script.dataset.asthmaStartupGuard = '1';
    document.head.appendChild(script);
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

    ensureAsthmaStartupGuard();
    repairAsthmaVideo();
    return true;
  }

  function run() {
    if (caseId === 'horse_crush') bindHorseContract();
    if (caseId === 'asthma') return sweepAsthma();
    return true;
  }

  run();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });

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
      if (caseId !== 'asthma' || (window.EMSCodeSimAsthmaLearningCase && passes > 20)) observer.disconnect();
    });
  });
  if (document.documentElement) observer.observe(document.documentElement, { subtree: true, childList: true });

  if (caseId === 'asthma') {
    ensureAsthmaStartupGuard();
    window.setTimeout(repairAsthmaVideo, 250);
    window.setTimeout(repairAsthmaVideo, 900);
    window.setTimeout(repairAsthmaVideo, 1800);
  }

  window.addEventListener('emscodesim:scenario-updated', run);
  window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
})();
