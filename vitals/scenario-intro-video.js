(() => {
  'use strict';

  const VERSION = '2026.09.09.1';
  const ASTHMA_VIDEO_URL = 'https://dnznrvs05pmza.cloudfront.net/seedance_2/cgt-20260910065357-qd2md/Single_continuous_realistic_EMS_training_scene__Preserve_the_same_woman__clothing__park_bench__water.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMWNjNzk4NjFjNGRlMWIxNSIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc4OTEyNDMyMX0.WpQO4hyvfMk8hjfB0J6SEJg7HAr0I-KwX3x6d38T0ok';

  const params = new URLSearchParams(location.search);
  const rawCase = String(params.get('case') || window.EMSCodeSimScenarioSession?.requestedCaseId?.() || window.EMSCodeSimPatientRecord?.active?.()?.scenarioId || '').trim().toLowerCase();
  const caseId = rawCase === 'respiratory' ? 'asthma' : rawCase;
  if (caseId !== 'asthma') return;

  function installStyles() {
    if (document.getElementById('scenarioIntroVideoStyles')) return;
    const style = document.createElement('style');
    style.id = 'scenarioIntroVideoStyles';
    style.textContent = `
      .patient-stage{position:relative}
      .scenario-intro-video-shell{position:absolute;inset:0;z-index:30;background:#071625;display:flex;align-items:center;justify-content:center;overflow:hidden}
      .scenario-intro-video-shell[hidden]{display:none}
      .scenario-intro-video-shell video{width:100%;height:100%;object-fit:cover;background:#071625}
      .scenario-intro-video-controls{position:absolute;left:14px;right:14px;bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:12px;background:rgba(5,18,31,.76);backdrop-filter:blur(8px);color:#fff}
      .scenario-intro-video-copy small{display:block;font-size:.68rem;font-weight:800;letter-spacing:.12em;opacity:.78}
      .scenario-intro-video-copy strong{display:block;margin-top:2px;font-size:.95rem}
      .scenario-intro-video-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      .scenario-intro-video-actions button{border:1px solid rgba(255,255,255,.34);border-radius:9px;background:rgba(255,255,255,.1);color:#fff;padding:8px 11px;font:inherit;font-weight:800;cursor:pointer}
      .scenario-intro-video-actions button.primary{background:#fff;color:#102b43}
      .scenario-intro-replay{position:absolute;right:12px;top:12px;z-index:5;border:1px solid rgba(255,255,255,.38);border-radius:9px;background:rgba(5,18,31,.72);color:#fff;padding:8px 10px;font:inherit;font-size:.78rem;font-weight:800;cursor:pointer}
      @media(max-width:640px){.scenario-intro-video-controls{align-items:flex-start;flex-direction:column}.scenario-intro-video-actions{width:100%;justify-content:stretch}.scenario-intro-video-actions button{flex:1}}
    `;
    document.head.appendChild(style);
  }

  function start() {
    const stage = document.querySelector('.patient-stage');
    const patientImage = document.getElementById('patientImage');
    if (!stage || !patientImage || document.getElementById('scenarioIntroVideo')) return;

    installStyles();

    const shell = document.createElement('section');
    shell.id = 'scenarioIntroVideo';
    shell.className = 'scenario-intro-video-shell';
    shell.setAttribute('aria-label', 'Asthma patient intro video');
    shell.innerHTML = `
      <video id="scenarioIntroVideoElement" muted playsinline preload="metadata" poster="${patientImage.src}">
        <source src="${ASTHMA_VIDEO_URL}" type="video/mp4">
      </video>
      <div class="scenario-intro-video-controls">
        <div class="scenario-intro-video-copy"><small>ARRIVAL · PUBLIC PARK</small><strong>Observe the patient before beginning your assessment.</strong></div>
        <div class="scenario-intro-video-actions">
          <button id="scenarioIntroReplay" type="button">Replay</button>
          <button id="scenarioIntroSkip" class="primary" type="button">Begin assessment</button>
        </div>
      </div>`;

    stage.appendChild(shell);
    const video = document.getElementById('scenarioIntroVideoElement');
    const close = () => {
      if (!shell.hidden) {
        shell.hidden = true;
        try { video.pause(); } catch (_) {}
      }
    };
    const replay = () => {
      shell.hidden = false;
      try { video.currentTime = 0; video.play().catch(() => {}); } catch (_) {}
    };

    document.getElementById('scenarioIntroSkip')?.addEventListener('click', close);
    document.getElementById('scenarioIntroReplay')?.addEventListener('click', replay);
    video?.addEventListener('ended', close);
    video?.addEventListener('error', close, { once:true });

    const replayButton = document.createElement('button');
    replayButton.type = 'button';
    replayButton.className = 'scenario-intro-replay';
    replayButton.textContent = 'Replay intro';
    replayButton.addEventListener('click', replay);
    stage.appendChild(replayButton);

    try { video.play().catch(() => {}); } catch (_) {}
  }

  window.EMSCodeSimScenarioIntroVideo = Object.freeze({ version:VERSION, caseId:'asthma', replay:() => document.getElementById('scenarioIntroReplay')?.click() });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
