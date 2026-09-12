(() => {
  'use strict';

  const VERSION = '2026.09.12.2';
  const COVER = '/vitals/assets/breathing-problem-cover.webp';
  const VIDEOS = Object.freeze({
    intro: {
      url: 'https://dnznrvs05pmza.cloudfront.net/seedance_2/cgt-20260910065357-qd2md/Single_continuous_realistic_EMS_training_scene__Preserve_the_same_woman__clothing__park_bench__water.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMWNjNzk4NjFjNGRlMWIxNSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTI5NzEyMX0.OxlGcsx6o5ujSdj8GcWrF4_BBJP8ua3OiTOwSpGP0oc',
      eyebrow: 'ARRIVAL · PUBLIC PARK',
      copy: 'Observe the patient before beginning your assessment.'
    },
    worsening: {
      url: 'https://dnznrvs05pmza.cloudfront.net/kling-o3-pro/926809681547366413/Preserve_the_same_woman__clothing__park_bench__daylight__public_park__framing__and_overall_appearanc.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiNmJmNDY0MDUzNDM1ZjI0NyIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTMxOTMwMX0.8lj3CyCcKsn3Z9Zn9gy8pyYejEu3mAkWx7W54r2mxCc',
      eyebrow: 'PATIENT UPDATE · RESPIRATORY DISTRESS',
      copy: 'The patient appears more fatigued with increased work of breathing.'
    },
    improved: {
      url: 'https://dnznrvs05pmza.cloudfront.net/kling-o3-pro/926809727395954732/Preserve_the_same_woman__clothing__park_bench__daylight__public_park__framing__and_overall_appearanc.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMjFhMzhjZTg0MTk2NTIyMyIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTI1OTM2OH0.Tkmx-KfFcbwZn-fcsve9LwULX2kr8KJt1jOLChOytGc',
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

  function installStyles() {
    if (document.getElementById('scenarioIntroVideoStyles')) return;
    const style = document.createElement('style');
    style.id = 'scenarioIntroVideoStyles';
    style.textContent = `
      html body.asthma-video-only .patient-stage > img#patientImage,
      html body.asthma-video-only img#focusImage{display:none!important;visibility:hidden!important;opacity:0!important}
      html body.asthma-video-only #clinicalReasoningBoard,
      html body.asthma-video-only #reasoningDiscoveryCue{display:none!important}
      html body.asthma-video-only .patient-stage{position:relative;background:#071625!important}
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
      .scenario-intro-video-shell.resting{pointer-events:none}
      .scenario-intro-video-shell.resting .scenario-intro-video-controls{display:none}
      .scenario-intro-video-controls{position:absolute;left:14px;right:14px;bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:12px;background:rgba(5,18,31,.76);backdrop-filter:blur(8px);color:#fff}
      .scenario-intro-video-copy small{display:block;font-size:.68rem;font-weight:800;letter-spacing:.12em;opacity:.78}
      .scenario-intro-video-copy strong{display:block;margin-top:2px;font-size:.95rem}
      .scenario-intro-video-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      .scenario-intro-video-actions button{border:1px solid rgba(255,255,255,.34);border-radius:9px;background:rgba(255,255,255,.1);color:#fff;padding:8px 11px;font:inherit;font-weight:800;cursor:pointer}
      .scenario-intro-video-actions button.primary{background:#fff;color:#102b43}
      .scenario-intro-replay{position:absolute;right:12px;top:12px;z-index:35;border:1px solid rgba(255,255,255,.38);border-radius:9px;background:rgba(5,18,31,.72);color:#fff;padding:8px 10px;font:inherit;font-size:.78rem;font-weight:800;cursor:pointer}
      @media(min-width:980px){
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .scenario-hero-layout{
          grid-template-columns:minmax(300px,.72fr) minmax(520px,1.45fr) minmax(420px,1.1fr)!important;
          gap:16px!important;
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .clinical-interaction-column{
          padding:16px!important;
          gap:14px!important;
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 #patientCommunicationStage{
          min-height:320px!important;
          padding:16px 4px 6px!important;
          overflow:auto!important;
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 #patientConversationTurn{
          min-height:220px!important;
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
          min-height:46px!important;
          font-size:.95rem!important;
        }
        body.asthma-video-only.desktop-scenario-layout.clinical-domain-workspace-v2.clinical-interaction-workspace-v4 .action-sheet{
          min-width:420px!important;
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

  function enforceVideoOnly() {
    document.body.classList.add('asthma-video-only');
    for (const id of ['patientImage','focusImage']) {
      const image = document.getElementById(id);
      if (!image) continue;
      image.hidden = true;
      image.setAttribute('aria-hidden','true');
      image.style.setProperty('display','none','important');
      image.style.setProperty('visibility','hidden','important');
      image.style.setProperty('opacity','0','important');
    }
  }

  function rest() {
    if (!shell) return;
    enforceVideoOnly();
    try { video?.pause(); } catch (_) {}
    shell.hidden = false;
    shell.classList.add('resting');
  }

  function playState(state,options={}) {
    const config = VIDEOS[state];
    if (!config || !shell || !video) return;
    enforceVideoOnly();
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
    if (options.once) markSeen(state,current);
    try { video.currentTime=0; video.play().catch(() => rest()); } catch (_) { rest(); }
    if (replayButton) replayButton.textContent = state === 'intro' ? 'Replay intro' : 'Replay patient update';
  }

  function evaluatePatientState() {
    enforceVideoOnly();
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
    enforceVideoOnly();

    shell = document.createElement('section');
    shell.id = 'scenarioIntroVideo';
    shell.className = 'scenario-intro-video-shell';
    shell.hidden = true;
    shell.setAttribute('aria-label','Asthma patient video');
    shell.innerHTML = `
      <video id="scenarioIntroVideoElement" muted playsinline preload="auto" poster="${COVER}"><source src="${VIDEOS.intro.url}" type="video/mp4"></video>
      <div class="scenario-intro-video-controls">
        <div class="scenario-intro-video-copy"><small id="scenarioVideoEyebrow"></small><strong id="scenarioVideoCopy"></strong></div>
        <div class="scenario-intro-video-actions"><button id="scenarioIntroReplay" type="button">Replay</button><button id="scenarioIntroSkip" class="primary" type="button">Continue assessment</button></div>
      </div>`;
    stage.appendChild(shell);
    video = document.getElementById('scenarioIntroVideoElement');

    document.getElementById('scenarioIntroSkip')?.addEventListener('click',rest);
    document.getElementById('scenarioIntroReplay')?.addEventListener('click',() => playState(activeState));
    video?.addEventListener('ended',rest);
    video?.addEventListener('error',rest);

    replayButton = document.createElement('button');
    replayButton.type='button';
    replayButton.className='scenario-intro-replay';
    replayButton.textContent='Replay intro';
    replayButton.addEventListener('click',() => playState(activeState));
    stage.appendChild(replayButton);

    playState('intro',{once:true});
    window.addEventListener('emscodesim:patient-record-updated',() => window.setTimeout(evaluatePatientState,40));
    window.setInterval(evaluatePatientState,5000);
  }

  window.EMSCodeSimScenarioIntroVideo = Object.freeze({ version:VERSION, caseId:'asthma', replay:() => playState(activeState), evaluate:evaluatePatientState });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
