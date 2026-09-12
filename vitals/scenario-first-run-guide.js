(() => {
  'use strict';

  const ORIENTATION_KEY = 'emscodesim_patient_orientation_v2';
  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  let queued = false;

  function patientRecord() {
    try {
      return window.EMSCodeSimScenarioSession?.sync?.() || window.EMSCodeSimPatientRecord?.active?.() || null;
    } catch (_) {
      return null;
    }
  }

  function activityState() {
    const r = patientRecord() || {};
    const findingCount = r.findings ? Object.keys(r.findings).length : 0;
    const historyCount = r.history ? Object.keys(r.history).length : 0;
    const treatmentCount = Array.isArray(r.treatments) ? r.treatments.length : 0;
    const careCount = Array.isArray(r.careLog) ? r.careLog.length : 0;
    return { findingCount, historyCount, treatmentCount, careCount, active: Boolean(findingCount || historyCount || treatmentCount || careCount) };
  }

  function installStyles() {
    if (q('style[data-scenario-first-run-guide]')) return;
    const style = document.createElement('style');
    style.dataset.scenarioFirstRunGuide = '1';
    style.textContent = `
      .site-review-orientation{position:fixed;inset:0;z-index:10000;background:rgba(3,14,24,.74);display:grid;place-items:center;padding:20px}
      .site-review-orientation-card{width:min(520px,100%);background:#fff;color:#102a3c;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.38);padding:24px}
      .site-review-orientation-card small{font-weight:900;letter-spacing:.09em;color:#0878a8}.site-review-orientation-card h2{margin:6px 0 8px;font-size:1.55rem}.site-review-orientation-card>p{margin:0 0 16px;color:#526879;line-height:1.5}
      .site-review-orientation-steps{display:grid;gap:10px;margin:16px 0}.site-review-orientation-step{display:grid;grid-template-columns:34px 1fr;gap:10px;align-items:start;padding:11px;border:1px solid #d7e3eb;border-radius:12px;background:#f8fbfd}.site-review-orientation-step b{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#0878a8;color:#fff}.site-review-orientation-step strong{display:block;margin-bottom:2px}.site-review-orientation-step span{font-size:.88rem;color:#526879;line-height:1.4}
      .site-review-orientation-card button{width:100%;min-height:48px;border:0;border-radius:11px;background:#0878a8;color:#fff;font:inherit;font-weight:900;cursor:pointer}
      .site-review-first-load .reasoning-card.locked.assessment-hidden{display:none!important}
      .site-review-next-action{margin:10px 0;padding:14px;border:1px solid #31596f;border-radius:12px;background:#0d2b3b;color:#edf8fb;display:grid;gap:5px}.site-review-next-action small{font-weight:900;letter-spacing:.08em;color:#8ed5ef}.site-review-next-action strong{font-size:1rem}.site-review-next-action span{font-size:.82rem;line-height:1.45;color:#bad1dc}

      /* Respiratory desktop: the center column is patient communication only. */
      @media(min-width:980px){
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .clinical-interaction-column{
          overflow:hidden!important;
          display:flex!important;
          flex-direction:column!important;
          min-height:0!important;
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .clinical-interaction-column>.info-update-window.cockpit-center-update{
          display:none!important;
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 #siteReviewNextAction{
          display:none!important;
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 #patientCommunicationStage{
          flex:1 1 auto!important;
          min-height:0!important;
          height:100%!important;
          width:100%!important;
          overflow:auto!important;
          padding:10px 4px 12px!important;
          margin:0!important;
          border-top:0!important;
          justify-content:flex-start!important;
          scrollbar-gutter:stable!important;
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 #patientConversationTurn{
          display:block!important;
          min-height:100%!important;
          width:100%!important;
          height:auto!important;
          overflow:visible!important;
          font-size:1rem!important;
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 #patientConversationTurn .patient-conversation-choices{
          display:grid!important;
          grid-template-columns:1fr!important;
          gap:10px!important;
          width:100%!important;
          margin-top:12px!important;
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 #patientConversationTurn .patient-conversation-choices button{
          width:100%!important;
          min-height:48px!important;
          text-align:left!important;
          font-size:.95rem!important;
          line-height:1.35!important;
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .clinical-interaction-column .bottom-nav.clinical-domain-rail{
          position:static!important;
          flex:0 0 auto!important;
          width:100%!important;
          margin-top:8px!important;
          padding-top:8px!important;
          padding-bottom:2px!important;
          background:#081a28!important;
          z-index:8!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function syncHistoryBadge(active) {
    qa('button[data-panel="historyPanel"] span,button[data-panel="historyPanel"] b,button[data-panel="historyPanel"] em,#historyBadge,#historyCount').forEach(el => {
      const text = (el.textContent || '').trim();
      const zero = text === '0' || /^0\s*(items?|new|questions?)?$/i.test(text);
      if (!active && zero) {
        if (!el.hidden) el.hidden = true;
        el.dataset.siteReviewZeroHidden = '1';
      } else if (el.dataset.siteReviewZeroHidden === '1' && (active || !zero)) {
        el.hidden = false;
        delete el.dataset.siteReviewZeroHidden;
      }
    });
  }

  function renderGuide() {
    const host = q('#patientCommunicationStage') || q('#clinicalInteractionColumn') || q('.patient-control-column');
    if (!host) return;

    let box = q('#siteReviewNextAction');
    if (!box) {
      box = document.createElement('aside');
      box.id = 'siteReviewNextAction';
      box.className = 'site-review-next-action';
      host.prepend(box);
    }

    const state = activityState();
    const stateKey = state.active ? `active:${state.findingCount}:${state.historyCount}:${state.treatmentCount}` : 'empty';
    if (box.dataset.state !== stateKey) {
      box.dataset.state = stateKey;
      box.innerHTML = state.active
        ? `<small>NEXT</small><strong>Build the patient picture.</strong><span>${state.findingCount} finding${state.findingCount === 1 ? '' : 's'} · ${state.historyCount} history item${state.historyCount === 1 ? '' : 's'} · ${state.treatmentCount} treatment${state.treatmentCount === 1 ? '' : 's'}. Choose Assessment, Vitals, History, or Treatment below.</span>`
        : '<small>START</small><strong>Look at the patient, then gather one finding.</strong><span>Choose Assessment or History below. Clinical decisions unlock as you collect patient information.</span>';
    }

    if (state.active) {
      if (document.body.classList.contains('site-review-first-load')) document.body.classList.remove('site-review-first-load');
    } else if (!document.body.classList.contains('site-review-first-load')) {
      document.body.classList.add('site-review-first-load');
    }
    syncHistoryBadge(state.active);
  }

  function showOnboarding() {
    let seen = false;
    try { seen = localStorage.getItem(ORIENTATION_KEY) === '1'; } catch (_) {}
    if (seen || q('#siteReviewOrientation')) return;

    const wrap = document.createElement('div');
    wrap.id = 'siteReviewOrientation';
    wrap.className = 'site-review-orientation';
    wrap.innerHTML = '<section class="site-review-orientation-card" role="dialog" aria-modal="true" aria-labelledby="siteReviewOrientationTitle"><small>FIRST SCENARIO</small><h2 id="siteReviewOrientationTitle">How to work the patient</h2><p>The simulator opens like an EMS call: start with what you can see, then gather enough information to make decisions.</p><div class="site-review-orientation-steps"><div class="site-review-orientation-step"><b>1</b><div><strong>Look at the patient.</strong><span>Use the scene, dispatch, appearance, and patient clock.</span></div></div><div class="site-review-orientation-step"><b>2</b><div><strong>Open Assessment or ask History.</strong><span>Collect findings instead of guessing ahead.</span></div></div><div class="site-review-orientation-step"><b>3</b><div><strong>Unlock clinical decisions.</strong><span>Discover → Decide → Treat → Reassess as the call develops.</span></div></div></div><button type="button" id="siteReviewOrientationClose">Start assessment</button></section>';
    document.body.appendChild(wrap);
    q('#siteReviewOrientationClose', wrap)?.addEventListener('click', () => {
      try { localStorage.setItem(ORIENTATION_KEY, '1'); } catch (_) {}
      wrap.remove();
      const firstAction = q('button[data-panel="assessmentPanel"],#startSceneSizeupPhoto');
      firstAction?.focus?.();
    }, { once: true });
  }

  function refresh() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      renderGuide();
    });
  }

  function start() {
    installStyles();
    renderGuide();
    showOnboarding();
    const observer = new MutationObserver(mutations => {
      const onlyOwnChanges = mutations.every(mutation => mutation.target.closest?.('#siteReviewNextAction,#siteReviewOrientation'));
      if (!onlyOwnChanges) refresh();
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    window.addEventListener('emscodesim:scenario-updated', refresh);
    window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
