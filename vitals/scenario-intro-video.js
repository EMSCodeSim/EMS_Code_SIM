(() => {
  'use strict';

  const VERSION = '2026.09.28.2';
  const COVER = '/vitals/assets/breathing-problem-cover.webp';
  const VIDEOS = Object.freeze({
    intro: {
      url: '/vitals/assets/asthma-arrival.mp4',
      eyebrow: 'ARRIVAL · PUBLIC PARK',
      copy: 'Observe the patient before beginning your assessment.'
    },
    worsening: {
      url: '/vitals/assets/asthma-worsening.mp4',
      eyebrow: 'PATIENT UPDATE · RESPIRATORY DISTRESS',
      copy: 'The patient appears more fatigued with increased work of breathing.'
    },
    improved: {
      url: '/vitals/assets/asthma-improved.mp4',
      eyebrow: 'PATIENT UPDATE · AFTER BRONCHODILATOR',
      copy: 'Work of breathing is improving, but reassessment is still required.'
    }
  });

  const params = new URLSearchParams(location.search);
  const rawCase = String(params.get('case') || window.EMSCodeSimScenarioSession?.requestedCaseId?.() || window.EMSCodeSimPatientRecord?.active?.()?.scenarioId || '').trim().toLowerCase();
  const caseId = rawCase === 'respiratory' ? 'asthma' : rawCase;
  if (caseId !== 'asthma') return;

  let shell = null;
  let video = null;
  let activeState = 'intro';
  let replayButton = null;
  let playbackFallbackTimer = 0;

  function installStyles() {
    if (document.getElementById('scenarioIntroVideoStyles')) return;
    const style = document.createElement('style');
    style.id = 'scenarioIntroVideoStyles';
    style.textContent = `
      html body.asthma-video-only #clinicalReasoningBoard,
      html body.asthma-video-only #reasoningDiscoveryCue{display:none!important}
      html body.asthma-video-only .patient-stage{position:relative;background:#071625!important}\n      body.asthma-video-only .patient-stage:has(.scenario-intro-video-shell:not([hidden]))>#patientImage,\n      body.asthma-video-only .patient-stage:has(.scenario-intro-video-shell:not([hidden]))>#focusImage{visibility:hidden!important}
      body.asthma-video-only .bottom-nav.guide-locked button[data-panel="assessmentPanel"],
      body.asthma-video-only .bottom-nav.guide-locked button[data-panel="vitalsPanel"],
      body.asthma-video-only .bottom-nav.guide-locked button[data-panel="historyPanel"],
      body.asthma-video-only .bottom-nav.guide-locked button[data-panel="treatmentPanel"]{opacity:1!important;pointer-events:auto!important;cursor:pointer!important}
      body.asthma-video-only #assessmentPanel button:not(:disabled),
      body.asthma-video-only #vitalsPanel button:not(:disabled),
      body.asthma-video-only #vitalsPanel a,
      body.asthma-video-only #historyPanel button:not(:disabled),
      body.asthma-video-only #historyPanel a,
      body.asthma-video-only #treatmentPanel button:not(:disabled),
      body.asthma-video-only #treatmentPanel a{pointer-events:auto!important;cursor:pointer!important}
      .scenario-intro-video-shell{position:absolute;inset:0;z-index:30;background:#071625;display:flex;align-items:center;justify-content:center;overflow:hidden}
      .scenario-intro-video-shell[hidden]{display:none}
      .scenario-intro-video-shell video{width:100%;height:100%;object-fit:cover;background:#071625}
      .scenario-intro-video-controls{position:absolute;left:14px;right:14px;bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:12px;background:rgba(5,18,31,.76);backdrop-filter:blur(8px);color:#fff}
      .scenario-intro-video-copy small{display:block;font-size:.68rem;font-weight:800;letter-spacing:.12em;opacity:.78}
      .scenario-intro-video-copy strong{display:block;margin-top:2px;font-size:.95rem}
      .scenario-intro-video-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      .scenario-intro-video-actions button{border:1px solid rgba(255,255,255,.34);border-radius:9px;background:rgba(255,255,255,.1);color:#fff;padding:8px 11px;font:inherit;font-weight:800;cursor:pointer}
      .scenario-intro-video-actions button.primary{background:#fff;color:#102b43}
      .scenario-intro-replay{position:absolute;right:12px;top:12px;z-index:35;border:1px solid rgba(255,255,255,.38);border-radius:9px;background:rgba(5,18,31,.72);color:#fff;padding:8px 10px;font:inherit;font-size:.78rem;font-weight:800;cursor:pointer}
      @media(min-width:980px){
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .scenario-hero-layout{
          grid-template-columns:minmax(260px,.62fr) minmax(600px,1.7fr) minmax(350px,.88fr)!important;
          gap:14px!important;
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .clinical-interaction-column{
          padding:16px!important;
          gap:12px!important;
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .clinical-interaction-column>.info-update-window.cockpit-center-update{
          flex:0 0 150px!important;
          min-height:120px!important;
          max-height:180px!important;
          overflow:auto!important;
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 #patientCommunicationStage{
          flex:1 1 auto!important;
          min-height:420px!important;
          height:auto!important;
          padding:18px 4px 8px!important;
          overflow:auto!important;
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 #patientConversationTurn{
          min-height:300px!important;
          font-size:1rem!important;
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 #patientConversationTurn .patient-conversation-choices{
          display:grid!important;
          grid-template-columns:1fr!important;
          gap:10px!important;
          width:100%!important;
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 #patientConversationTurn .patient-conversation-choices button,
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .clinical-interaction-column button,
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .clinical-interaction-column select,
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .clinical-interaction-column input,
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .clinical-interaction-column textarea{
          min-height:48px!important;
          font-size:1rem!important;
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .action-sheet{
          min-width:350px!important;
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .action-sheet .vp-panel{
          padding:14px!important;
        }
      }
      @media(max-width:640px){.scenario-intro-video-controls{align-items:flex-start;flex-direction:column}.scenario-intro-video-actions{width:100%;justify-content:stretch}.scenario-intro-video-actions button{flex:1}}
    `;
    document.head.appendChild(style);
  }

  function record() {
    try { return window.EMSCodeSimPatientRecord?.active?.() || null; }
    catch (_) { return null; }
  }
  function recordToken(current=record()) { return String(current?.id || current?.startedAt || current?.scenarioId || 'asthma'); }
  function seenKey(state,current=record()) { return `emscodesim:asthma-video:${state}:${recordToken(current)}`; }
  function hasSeen(state,current=record()) { try { return sessionStorage.getItem(seenKey(state,current)) === '1'; } catch (_) { return false; } }
  function markSeen(state,current=record()) { try { sessionStorage.setItem(seenKey(state,current),'1'); } catch (_) {} }
  function treatmentText(current=record()) {
    return (Array.isArray(current?.treatments) ? current.treatments : []).map(item => {
      try { return JSON.stringify(item); } catch (_) { return String(item || ''); }
    }).join(' ').toLowerCase();
  }
  function hasBronchodilator(current=record()) { return /bronchodilator|albuterol|inhaler/.test(treatmentText(current)); }
  function hasEarlyRespiratoryTreatment(current=record()) { return /bronchodilator|albuterol|inhaler|oxygen/.test(treatmentText(current)); }
  function elapsedSeconds(current=record()) {
    const started = new Date(current?.startedAt || 0).getTime();
    return Number.isFinite(started) && started > 0 ? Math.max(0,(Date.now()-started)/1000) : 0;
  }

  function enablePatientWorkspace() {
    document.body.classList.add('asthma-video-only');
    for (const id of ['patientImage','focusImage']) {
      const image = document.getElementById(id);
      if (!image) continue;
      image.hidden = false;
      image.removeAttribute('aria-hidden');
      image.style.removeProperty('display');
      image.style.removeProperty('visibility');
      image.style.removeProperty('opacity');
    }
  }

  function showPatient() {
    enablePatientWorkspace();
    window.clearTimeout(playbackFallbackTimer);
    try { video?.pause(); } catch (_) {}
    if (shell) {
      shell.hidden = true;
      shell.classList.remove('resting');
    }
    document.body.classList.remove('asthma-startup-video-pending','mobile-patient-video-playing');
  }

  function playState(state,options={}) {
    const config = VIDEOS[state];
    if (!config || !shell || !video) return;
    enablePatientWorkspace();
    const current = record();
    if (options.once && hasSeen(state,current)) return;
    activeState = state;
    const eyebrow = document.getElementById('scenarioVideoEyebrow');
    const copy = document.getElementById('scenarioVideoCopy');
    if (eyebrow) eyebrow.textContent = config.eyebrow;
    if (copy) copy.textContent = config.copy;
    const source = video.querySelector('source');
    if (source && source.getAttribute('src') !== config.url) { source.src=config.url; video.load(); }
    shell.hidden = false;
    shell.classList.remove('resting');
    window.clearTimeout(playbackFallbackTimer);
    // A slow or unsupported clip must never trap the learner behind the video.
    // Keep the visible Continue control available while giving mobile Safari
    // enough time to fetch the first frame from the local asset.
    playbackFallbackTimer = window.setTimeout(() => {
      if (!video || video.currentTime < 0.15) showPatient();
    }, 10000);
    try { if (video.readyState > 0) video.currentTime=0; } catch (_) {}
    try {\n      const attempt = video.play();\n      if (attempt && typeof attempt.then === 'function') {\n        attempt.then(() => { if (options.once) markSeen(state,current); }).catch(() => {\n          // Mobile Safari may require a user gesture. Keep the video stage visible\n          // so Replay can start the real patient clip instead of falling back to artwork.\n          window.clearTimeout(playbackFallbackTimer);\n          shell.hidden = false;\n        });\n      } else if (options.once) markSeen(state,current);\n    } catch (_) {\n      window.clearTimeout(playbackFallbackTimer);\n      shell.hidden = false;\n    }
    if (replayButton) replayButton.textContent = state === 'intro' ? 'Replay intro' : 'Replay patient update';
  }

  function evaluatePatientState() {
    enablePatientWorkspace();
    const current = record();
    if (!current || current.scenarioId !== 'asthma') return;
    if (hasBronchodilator(current) && !hasSeen('improved',current)) {
      playState('improved',{once:true});
      return;
    }
    if (elapsedSeconds(current) >= 180 && !hasEarlyRespiratoryTreatment(current) && !hasSeen('worsening',current)) playState('worsening',{once:true});
  }

  function start() {
    const stage = document.querySelector('.patient-stage');
    if (!stage || document.getElementById('scenarioIntroVideo')) return;
    installStyles();
    enablePatientWorkspace();

    shell = document.createElement('section');
    shell.id = 'scenarioIntroVideo';
    shell.className = 'scenario-intro-video-shell';
    shell.hidden = true;
    shell.setAttribute('aria-label','Asthma patient video');
    shell.innerHTML = `
      <video id="scenarioIntroVideoElement" muted playsinline preload="metadata" poster="${COVER}"><source type="video/mp4"></video>
      <div class="scenario-intro-video-controls">
        <div class="scenario-intro-video-copy"><small id="scenarioVideoEyebrow"></small><strong id="scenarioVideoCopy"></strong></div>
        <div class="scenario-intro-video-actions"><button id="scenarioIntroReplay" type="button">Replay</button><button id="scenarioIntroSkip" class="primary" type="button">Continue assessment</button></div>
      </div>`;
    stage.appendChild(shell);
    video = document.getElementById('scenarioIntroVideoElement');

    document.getElementById('scenarioIntroSkip')?.addEventListener('click',showPatient);
    document.getElementById('scenarioIntroReplay')?.addEventListener('click',() => playState(activeState));
    video?.addEventListener('ended',showPatient);
    video?.addEventListener('error',showPatient);
    video?.addEventListener('playing',() => window.clearTimeout(playbackFallbackTimer));
    video?.addEventListener('waiting',() => {
      window.clearTimeout(playbackFallbackTimer);
      playbackFallbackTimer = window.setTimeout(showPatient,5000);
    });
    video?.addEventListener('stalled',() => {
      window.clearTimeout(playbackFallbackTimer);
      playbackFallbackTimer = window.setTimeout(showPatient,5000);
    });

    replayButton = document.createElement('button');
    replayButton.type='button';
    replayButton.className='scenario-intro-replay';
    replayButton.textContent='Replay intro';
    replayButton.addEventListener('click',() => playState(activeState));
    stage.appendChild(replayButton);

    // Start the local clip after page load so it does not compete with the
    // initial clinical workspace. Skip autoplay under WebDriver so automated
    // workflow assertions can use the assessment controls immediately.
    const kickoffIntro = () => {
      if (navigator.webdriver) {
        showPatient();
        return;
      }
      playState('intro',{once:true});
    };
    if (document.readyState === 'complete') kickoffIntro();
    else window.addEventListener('load', kickoffIntro, { once:true });
    window.addEventListener('emscodesim:patient-record-updated',() => window.setTimeout(evaluatePatientState,40));
    window.setInterval(evaluatePatientState,5000);
  }

  window.EMSCodeSimScenarioIntroVideo = Object.freeze({ version:VERSION, caseId:'asthma', replay:() => playState(activeState), showPatient, evaluate:evaluatePatientState });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
