(() => {
  'use strict';

  const SOUND_FILES = {
    normal: '/vitals/Lung-NormalVesicular.mp3',
    wheeze: '/vitals/Lung-Wheezing.mp3',
    crackles: '/vitals/Lung-CoarseCrackles.mp3',
    stridor: '/vitals/Lung-InspiratoryStridor.mp3',
    diminished: '/vitals/Lung-NormalVesicular.mp3'
  };
  const SOUND_LABELS = {
    normal: 'Normal vesicular',
    wheeze: 'Wheezing',
    crackles: 'Coarse crackles',
    stridor: 'Inspiratory stridor',
    diminished: 'Diminished'
  };
  const SITE_LABELS = {
    ru: 'Right upper',
    lu: 'Left upper',
    rl: 'Right lower',
    ll: 'Left lower'
  };

  function torsoSvg() {
    return `<svg viewBox="0 0 320 410" role="img" aria-label="Anatomical chest for lung auscultation">
      <defs>
        <linearGradient id="skinFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e8c2a6"/><stop offset="1" stop-color="#c48a6a"/>
        </linearGradient>
        <linearGradient id="skinBack" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#deb59a"/><stop offset="1" stop-color="#b67d60"/>
        </linearGradient>
        <linearGradient id="lungFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#7fd0ff" stop-opacity=".42"/><stop offset="1" stop-color="#3a88b0" stop-opacity=".22"/>
        </linearGradient>
        <filter id="lungGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <ellipse cx="160" cy="390" rx="118" ry="14" fill="#041018" opacity=".35"/>
      <g class="art-front">
        <rect x="146" y="18" width="28" height="38" rx="12" fill="url(#skinFront)"/>
        <path class="sv-torso-body" d="M86 78c18-28 46-42 74-42s56 14 74 42c16 24 28 38 34 68 8 42 6 86-8 128-10 30-28 52-58 62-18 6-42 8-42 8s-24-2-42-8c-30-10-48-32-58-62-14-42-16-86-8-128 6-30 18-44 34-68z" fill="url(#skinFront)"/>
        <path d="M70 92c18-8 34-6 46 8M250 92c-18-8-34-6-46 8" fill="none" stroke="#a56c52" stroke-width="7" stroke-linecap="round"/>
        <path d="M160 86v118" stroke="#fff8" stroke-width="3" stroke-linecap="round"/>
        <path d="M118 118c18 10 42 14 42 14s24-4 42-14M112 148c22 12 48 16 48 16s26-4 48-16M110 178c24 12 50 16 50 16s26-4 50-16M118 210c20 10 42 14 42 14s22-4 42-14" fill="none" stroke="#fff6" stroke-width="2.4" stroke-linecap="round"/>
        <path class="lung-field lung-right" d="M92 108c22-18 46-16 60-4 8 8 10 22 8 46-4 38-8 70-22 92-10 16-24 18-38 8-18-14-22-46-18-86 2-22 6-42 10-56z" fill="url(#lungFill)"/>
        <path class="lung-field lung-left" d="M228 108c-22-18-46-16-60-4-8 8-10 22-8 46 4 38 8 70 22 92 10 16 24 18 38 8 18-14 22-46 18-86-2-22-6-42-10-56z" fill="url(#lungFill)"/>
        <circle cx="118" cy="196" r="5" fill="#b67862"/><circle cx="202" cy="196" r="5" fill="#b67862"/>
      </g>
      <g class="art-back">
        <rect x="146" y="18" width="28" height="38" rx="12" fill="url(#skinBack)"/>
        <path class="sv-torso-body" d="M86 78c18-28 46-42 74-42s56 14 74 42c16 24 28 38 34 68 8 42 6 86-8 128-10 30-28 52-58 62-18 6-42 8-42 8s-24-2-42-8c-30-10-48-32-58-62-14-42-16-86-8-128 6-30 18-44 34-68z" fill="url(#skinBack)"/>
        <path d="M160 78v176" stroke="#8a5a46" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="118" cy="132" rx="36" ry="28" fill="#00000014" stroke="#a56c52" stroke-width="3"/>
        <ellipse cx="202" cy="132" rx="36" ry="28" fill="#00000014" stroke="#a56c52" stroke-width="3"/>
        <path class="lung-field lung-left" d="M92 108c22-18 46-16 60-4 8 8 10 22 8 46-4 38-8 70-22 92-10 16-24 18-38 8-18-14-22-46-18-86 2-22 6-42 10-56z" fill="url(#lungFill)"/>
        <path class="lung-field lung-right" d="M228 108c-22-18-46-16-60-4-8 8-10 22-8 46 4 38 8 70 22 92 10 16 24 18 38 8 18-14 22-46 18-86-2-22-6-42-10-56z" fill="url(#lungFill)"/>
      </g>
    </svg>`;
  }

  function pointButton(view, site, shortLabel) {
    return `<button class="sv-point" type="button" data-view="${view}" data-site="${site}" data-label="${SITE_LABELS[site]}" aria-label="${SITE_LABELS[site]} lung, ${view} view">${shortLabel}</button>`;
  }

  function stageMarkup(options = {}) {
    const countText = options.countText || '0 of 4 fields heard';
    return `<div class="sv-ausc" data-view="front">
      <div class="sv-ausc-toolbar" role="group" aria-label="Chest view">
        <button type="button" data-ausc-view="front" class="active">Anterior</button>
        <button type="button" data-ausc-view="back">Posterior</button>
      </div>
      <div class="sv-ausc-stage breathing" id="auscultationStage">
        ${torsoSvg()}
        ${pointButton('front','ru','RUL')}
        ${pointButton('front','lu','LUL')}
        ${pointButton('front','rl','RLL')}
        ${pointButton('front','ll','LLL')}
        ${pointButton('back','lu','LUL')}
        ${pointButton('back','ru','RUL')}
        ${pointButton('back','ll','LLL')}
        ${pointButton('back','rl','RLL')}
        <div class="sv-steth" id="auscultationScope" hidden></div>
        <div class="sv-ausc-wave" id="auscultationWave" aria-hidden="true">${'<i></i>'.repeat(18)}</div>
        <div class="sv-listen-count" id="listenCount">${countText}</div>
      </div>
      <p class="sv-ausc-hint" id="auscultationHint">Anterior: screen-left is the patient’s <strong>right</strong>. Compare matching fields side to side.</p>
      <p class="sv-ausc-now" id="auscultationNow">Tap a lung field to auscultate.</p>
    </div>`;
  }

  function bindStage(root, options = {}) {
    const host = root?.querySelector?.('.sv-ausc') || root;
    if (!host) return { destroy() {} };
    const stage = host.querySelector('.sv-ausc-stage');
    const scope = host.querySelector('.sv-steth');
    const wave = host.querySelector('.sv-ausc-wave');
    const hint = host.querySelector('.sv-ausc-hint');
    const now = host.querySelector('.sv-ausc-now');
    const count = host.querySelector('#listenCount');
    const heard = new Set();
    let audio = null;
    let stopTimer = 0;

    function setView(view) {
      host.dataset.view = view;
      host.querySelectorAll('[data-ausc-view]').forEach(button => {
        button.classList.toggle('active', button.dataset.auscView === view);
      });
      if (hint) {
        hint.innerHTML = view === 'front'
          ? 'Anterior: screen-left is the patient’s <strong>right</strong>. Compare matching fields side to side.'
          : 'Posterior: screen-left is the patient’s <strong>left</strong>. Lower lobes are heard best here.';
      }
    }

    function stopListen() {
      clearTimeout(stopTimer);
      stage?.classList.remove('listening');
      stage?.removeAttribute('data-sound');
      host.querySelectorAll('.sv-point.active').forEach(node => node.classList.remove('active'));
      host.querySelectorAll('.lung-active').forEach(node => node.classList.remove('lung-active'));
    }

    function playSite(button) {
      const site = button.dataset.site;
      const view = host.dataset.view || 'front';
      const type = options.soundForSite?.(site, view) || options.soundType || 'normal';
      const file = SOUND_FILES[type] || SOUND_FILES.normal;
      const left = site.startsWith('l');
      audio?.pause?.();
      audio = new Audio(file);
      audio.volume = type === 'diminished' && left ? 0.22 : 0.92;
      host.querySelectorAll('.sv-point.active').forEach(node => node.classList.remove('active'));
      button.classList.add('active', 'done');
      heard.add(site);
      if (count) count.textContent = `${heard.size} of 4 fields heard`;
      const lung = stage?.querySelector(left ? '.lung-left' : '.lung-right');
      host.querySelectorAll('.lung-active').forEach(node => node.classList.remove('lung-active'));
      lung?.classList.add('lung-active');
      if (scope) {
        scope.hidden = false;
        scope.style.left = button.style.left || getComputedStyle(button).left;
        scope.style.top = button.style.top || getComputedStyle(button).top;
        const box = button.getBoundingClientRect();
        const stageBox = stage.getBoundingClientRect();
        scope.style.left = `${box.left - stageBox.left + box.width / 2}px`;
        scope.style.top = `${box.top - stageBox.top + box.height / 2}px`;
      }
      stage.classList.add('listening');
      stage.dataset.sound = type;
      if (now) now.textContent = `Listening · ${SITE_LABELS[site]} · ${SOUND_LABELS[type] || type}`;
      audio.play().catch(() => {
        if (now) now.textContent = 'Tap the field again to allow audio playback.';
      });
      clearTimeout(stopTimer);
      stopTimer = window.setTimeout(stopListen, 2800);
      options.onListen?.({ site, view, type, heard: new Set(heard), button });
    }

    host.querySelectorAll('[data-ausc-view]').forEach(button => {
      button.addEventListener('click', () => setView(button.dataset.auscView));
    });
    host.querySelectorAll('.sv-point').forEach(button => {
      button.addEventListener('click', () => playSite(button));
    });
    setView('front');

    return {
      heard,
      destroy() {
        stopListen();
        audio?.pause?.();
      }
    };
  }

  window.EMSCodeSimBreathAuscultation = Object.freeze({
    version: '2026.08.17.8',
    SOUND_FILES,
    SOUND_LABELS,
    SITE_LABELS,
    stageMarkup,
    bindStage
  });
})();
