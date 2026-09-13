(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const caseId = String(params.get('case') || '').replace(/-/g, '_').toLowerCase();
  if (caseId !== 'asthma') return;

  const VERSION = '2026.09.12.1';
  const q = (s, r = document) => r.querySelector(s);
  const reset = params.get('reset') === '1';
  const pageLoadedAt = Date.now();
  let timerInterval = 0;
  let videoRetryTimer = 0;
  let wiredVideo = null;

  function installStyles() {
    if (q('#asthmaStartupGuardStyles')) return;
    const style = document.createElement('style');
    style.id = 'asthmaStartupGuardStyles';
    style.textContent = `
      #asthmaStartupPlay {
        position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:80;
        min-width:190px;min-height:52px;padding:12px 18px;border:0;border-radius:12px;
        background:#fff;color:#102b43;font:inherit;font-weight:900;box-shadow:0 10px 28px rgba(0,0,0,.34);cursor:pointer
      }
      #asthmaStartupPlay[hidden]{display:none!important}
      body.asthma-startup-video-pending #scenarioIntroVideo{display:flex!important;pointer-events:auto!important}
      body.asthma-startup-video-pending #scenarioIntroVideo .scenario-intro-video-controls{display:flex!important;pointer-events:auto!important}
      body.asthma-startup-video-pending #scenarioIntroSkip,
      body.asthma-startup-video-pending #scenarioIntroReplay{pointer-events:auto!important}
    `;
    document.head.appendChild(style);
  }

  function record() {
    try { return window.EMSCodeSimPatientRecord?.active?.() || null; }
    catch (_) { return null; }
  }

  function timerStartMs() {
    const current = record();
    const parsed = new Date(current?.startedAt || 0).getTime();
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= Date.now() + 1000) return parsed;
    return pageLoadedAt;
  }

  function timerSeconds(text) {
    const match = String(text || '').match(/^(\d+):(\d{2})$/);
    return match ? (Number(match[1]) * 60 + Number(match[2])) : 0;
  }

  function tickTimer() {
    const timer = q('#timer');
    if (!timer) return;
    const computed = Math.max(0, Math.floor((Date.now() - timerStartMs()) / 1000));
    const shown = timerSeconds(timer.textContent);
    const elapsed = Math.max(computed, shown);
    timer.textContent = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
    const monitor = q('#desktopMonitorClock');
    if (monitor) monitor.textContent = timer.textContent;
  }

  function clearStaleIntroSeen() {
    if (!reset) return;
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
        const key = sessionStorage.key(i) || '';
        if (key.startsWith('emscodesim:asthma-video:intro:')) sessionStorage.removeItem(key);
      }
    } catch (_) {}
  }

  function ensurePlayButton(stage) {
    let button = q('#asthmaStartupPlay');
    if (button) return button;
    button = document.createElement('button');
    button.id = 'asthmaStartupPlay';
    button.type = 'button';
    button.textContent = 'Play patient video';
    button.hidden = true;
    stage.appendChild(button);
    return button;
  }

  async function userPlay(video, shell, button) {
    if (!video) return;
    shell?.classList.remove('resting');
    if (shell) shell.hidden = false;
    document.body.classList.add('asthma-startup-video-pending');
    button.hidden = true;
    try {
      video.muted = true;
      video.defaultMuted = true;
      video.setAttribute('muted', '');
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      if (video.currentTime < 0.1 || video.ended) video.currentTime = 0;
      await video.play();
    } catch (_) {
      button.hidden = false;
    }
  }

  function wireVideo() {
    const stage = q('.patient-stage');
    const shell = q('#scenarioIntroVideo');
    const video = q('#scenarioIntroVideoElement');
    if (!stage || !shell || !video) return false;

    installStyles();
    const button = ensurePlayButton(stage);
    shell.hidden = false;
    shell.classList.remove('resting');
    document.body.classList.add('asthma-startup-video-pending');

    if (wiredVideo !== video) {
      wiredVideo = video;
      button.onclick = () => userPlay(video, shell, button);
      const hideButton = () => {
        button.hidden = true;
        document.body.classList.remove('asthma-startup-video-pending');
      };
      video.addEventListener('playing', hideButton);
      video.addEventListener('timeupdate', () => {
        if (video.currentTime > 0.15) hideButton();
      });
      video.addEventListener('error', () => {
        button.textContent = 'Retry patient video';
        button.hidden = false;
      });
      video.addEventListener('stalled', () => {
        if (!video.ended) button.hidden = false;
      });
      video.addEventListener('waiting', () => {
        window.setTimeout(() => {
          if (video.paused && video.currentTime < 0.2 && !video.ended) button.hidden = false;
        }, 800);
      });
    }

    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.autoplay = true;
    video.setAttribute('autoplay', '');

    const actuallyPlaying = !video.paused && !video.ended && video.currentTime > 0.05;
    if (actuallyPlaying) {
      button.hidden = true;
      document.body.classList.remove('asthma-startup-video-pending');
      return true;
    }

    try { window.EMSCodeSimScenarioIntroVideo?.replay?.(); } catch (_) {}
    Promise.resolve(video.play()).catch(() => {});
    window.setTimeout(() => {
      if (video.paused && video.currentTime < 0.2 && !video.ended) button.hidden = false;
    }, 1100);
    return true;
  }

  function start() {
    installStyles();
    clearStaleIntroSeen();
    tickTimer();
    clearInterval(timerInterval);
    timerInterval = window.setInterval(tickTimer, 500);

    let attempts = 0;
    const tryWire = () => {
      attempts += 1;
      const ready = wireVideo();
      if (ready || attempts >= 40) clearInterval(videoRetryTimer);
    };
    tryWire();
    videoRetryTimer = window.setInterval(tryWire, 250);

    window.addEventListener('emscodesim:patient-record-updated', tickTimer);
    window.addEventListener('pagehide', () => {
      clearInterval(timerInterval);
      clearInterval(videoRetryTimer);
    }, { once: true });

    window.EMSCodeSimAsthmaStartupGuard = Object.freeze({ version: VERSION, tickTimer, wireVideo });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
