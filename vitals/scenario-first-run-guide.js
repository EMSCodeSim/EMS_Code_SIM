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
    return { active: Boolean(findingCount || historyCount || treatmentCount || careCount) };
  }

  function respiratoryDesktop() {
    return window.matchMedia?.('(min-width:980px)')?.matches && document.body.classList.contains('asthma-video-only');
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

      @media(min-width:980px){
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .clinical-interaction-column{
          overflow:hidden!important;display:flex!important;flex-direction:column!important;min-height:0!important
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .clinical-interaction-column>.info-update-window.cockpit-center-update,
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 #siteReviewNextAction{display:none!important}
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 #patientCommunicationStage{
          flex:1 1 auto!important;min-height:0!important;height:100%!important;width:100%!important;overflow:auto!important;padding:12px!important;margin:0!important;border-top:0!important;justify-content:flex-start!important;scrollbar-gutter:stable!important
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 #patientConversationTurn{
          display:block!important;min-height:0!important;width:100%!important;height:auto!important;overflow:visible!important;font-size:1rem!important
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 #patientConversationTurn .patient-conversation-choices{
          display:grid!important;grid-template-columns:1fr!important;gap:10px!important;width:100%!important;margin-top:12px!important
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 #patientConversationTurn .patient-conversation-choices button{
          width:100%!important;min-height:48px!important;text-align:left!important;font-size:.95rem!important;line-height:1.35!important
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 #patientQuestionChoiceTray{
          display:grid;gap:10px;width:100%;margin:0 0 14px;padding:12px;border:1px solid #31596f;border-radius:13px;background:#0b2333;color:#eef8fb
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 #patientQuestionChoiceTray[hidden]{display:none!important}
        #patientQuestionChoiceTray .patient-question-tray-head{display:flex;align-items:end;justify-content:space-between;gap:12px;padding-bottom:8px;border-bottom:1px solid rgba(142,213,239,.18)}
        #patientQuestionChoiceTray .patient-question-tray-head small{display:block;color:#8ed5ef;font-weight:900;letter-spacing:.1em;font-size:.64rem}
        #patientQuestionChoiceTray .patient-question-tray-head strong{display:block;margin-top:3px;font-size:1rem}
        #patientQuestionChoiceTray .patient-question-tray-head span{color:#a9c2cf;font-size:.74rem;text-align:right}
        #patientQuestionChoiceTray .patient-question-tray-list{display:grid;grid-template-columns:1fr;gap:8px}
        #patientQuestionChoiceTray .patient-question-choice{width:100%;min-height:48px;padding:10px 12px;border:1px solid #31566d;border-radius:10px;background:#10283a;color:#eef8fb;text-align:left;font:inherit;font-size:.9rem;font-weight:750;line-height:1.3;cursor:pointer}
        #patientQuestionChoiceTray .patient-question-choice:hover{border-color:#67c2f5;background:#174a68}
        #patientQuestionChoiceTray .patient-question-choice.asked{opacity:.72}
        #patientQuestionChoiceTray .patient-question-empty{padding:16px;border:1px dashed #31596f;border-radius:10px;color:#b8ced9;font-size:.86rem;line-height:1.45}
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 #historyPanel .history-question-list{display:none!important}
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 #historyPanel .history-question-category>summary{cursor:pointer!important}
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .clinical-interaction-column .bottom-nav.clinical-domain-rail{
          position:static!important;flex:0 0 auto!important;width:100%!important;margin-top:8px!important;padding-top:8px!important;padding-bottom:2px!important;background:#081a28!important;z-index:8!important
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

  function ensureQuestionTray() {
    if (!respiratoryDesktop()) return null;
    const stage = q('#patientCommunicationStage');
    if (!stage) return null;
    let tray = q('#patientQuestionChoiceTray');
    if (!tray) {
      tray = document.createElement('section');
      tray.id = 'patientQuestionChoiceTray';
      tray.setAttribute('aria-label', 'Patient interview question choices');
      tray.innerHTML = '<div class="patient-question-tray-head"><div><small>PATIENT INTERVIEW</small><strong>Choose what you want to ask</strong></div><span>Select a category on the right</span></div><div class="patient-question-tray-list"></div>';
      const turn = q('#patientConversationTurn', stage);
      if (turn) stage.insertBefore(tray, turn);
      else stage.prepend(tray);
    }
    return tray;
  }

  function activeHistoryCategory() {
    return q('#historyCategoryList .history-question-category[open]') || q('#historyPanel .history-question-category[open]');
  }

  function historyPanelOpen() {
    const panel = q('#historyPanel');
    if (!panel) return false;
    return !panel.hidden || q('button[data-panel="historyPanel"].active') !== null;
  }

  function syncPatientQuestionChoices() {
    const tray = ensureQuestionTray();
    if (!tray) return;
    tray.hidden = !historyPanelOpen();
    if (tray.hidden) return;

    const list = q('.patient-question-tray-list', tray);
    const status = q('.patient-question-tray-head span', tray);
    const category = activeHistoryCategory();
    const sourceButtons = category ? qa('.history-question-button[data-history-question], .history-question-button', category) : [];
    const categoryLabel = category ? String(q('summary strong,summary span:not(.history-category-icon),summary', category)?.textContent || '').replace(/\s+/g,' ').trim() : '';
    if (status) status.textContent = categoryLabel || 'Select a category on the right';
    if (!list) return;
    list.replaceChildren();

    if (!sourceButtons.length) {
      const empty = document.createElement('div');
      empty.className = 'patient-question-empty';
      empty.textContent = 'Choose a History category on the right — such as Current problem, Symptoms / OPQRST, Medical background, or What happened — and the questions will appear here.';
      list.appendChild(empty);
      return;
    }

    sourceButtons.forEach(source => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `patient-question-choice${source.classList.contains('asked') ? ' asked' : ''}`;
      const label = String(source.querySelector('span')?.textContent || source.textContent || '').replace(/Ask again|Ask$/i,'').replace(/\s+/g,' ').trim();
      button.textContent = label || 'Ask patient';
      button.addEventListener('click', () => {
        source.click();
        window.setTimeout(syncPatientQuestionChoices, 80);
        q('#patientConversationTurn')?.scrollIntoView?.({ block:'nearest', behavior:'smooth' });
      });
      list.appendChild(button);
    });
  }

  function renderGuide() {
    q('#siteReviewNextAction')?.remove();
    const state = activityState();
    document.body.classList.toggle('site-review-first-load', !state.active);
    syncHistoryBadge(state.active);
    syncPatientQuestionChoices();
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
    document.addEventListener('toggle', event => {
      if (event.target?.matches?.('#historyPanel .history-question-category')) refresh();
    }, true);
    document.addEventListener('click', event => {
      if (event.target.closest?.('button[data-panel="historyPanel"],#historyPanel .history-question-category>summary')) window.setTimeout(refresh, 20);
    });
    const observer = new MutationObserver(mutations => {
      const onlyOwnChanges = mutations.every(mutation => mutation.target.closest?.('#patientQuestionChoiceTray,#siteReviewOrientation'));
      if (!onlyOwnChanges) refresh();
    });
    observer.observe(document.body, { subtree:true, childList:true, attributes:true, attributeFilter:['hidden','class','open'] });
    window.addEventListener('emscodesim:scenario-updated', refresh);
    window.addEventListener('resize', refresh);
    window.addEventListener('pagehide', () => observer.disconnect(), { once:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
