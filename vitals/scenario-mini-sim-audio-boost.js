(() => {
  'use strict';

  if (window.__emsMiniSimAudioBoostInstalled) return;
  window.__emsMiniSimAudioBoostInstalled = true;

  const sim = document.body?.dataset?.scenarioVital || '';
  const isPulse = sim === 'pulse' || location.pathname.endsWith('/pulse-scenario.html');
  const isBp = location.pathname.endsWith('/bp-scenario.html');
  if (!isPulse && !isBp) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  let ctx = null;

  function ensureContext() {
    if (!ctx || ctx.state === 'closed') ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function transient(parts, duration = 0.15) {
    const audio = ensureContext();
    if (!audio || audio.state === 'closed') return;
    const master = audio.createGain();
    master.gain.setValueAtTime(0.0001, audio.currentTime);
    master.gain.exponentialRampToValueAtTime(0.34, audio.currentTime + 0.006);
    master.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    master.connect(audio.destination);

    parts.forEach(({ frequency, level, type = 'sine' }) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, audio.currentTime);
      gain.gain.value = level;
      osc.connect(gain).connect(master);
      osc.start();
      osc.stop(audio.currentTime + duration + 0.02);
    });
  }

  function playPulseBoost() {
    transient([
      { frequency: 72, level: 1.0 },
      { frequency: 138, level: 0.28 }
    ], 0.16);
  }

  function playBpBoost() {
    transient([
      { frequency: 86, level: 1.0 },
      { frequency: 172, level: 0.34 }
    ], 0.13);
  }

  function watchPulse() {
    const heart = document.getElementById('heart');
    if (!heart) return false;
    let wasBeat = heart.classList.contains('beat');
    new MutationObserver(() => {
      const beat = heart.classList.contains('beat');
      if (beat && !wasBeat) playPulseBoost();
      wasBeat = beat;
    }).observe(heart, { attributes: true, attributeFilter: ['class'] });
    return true;
  }

  function watchBp() {
    const gauge = document.getElementById('gauge-container');
    if (!gauge) return false;
    let wasBeat = gauge.classList.contains('korotkoff-beat');
    new MutationObserver(() => {
      const beat = gauge.classList.contains('korotkoff-beat');
      if (beat && !wasBeat) playBpBoost();
      wasBeat = beat;
    }).observe(gauge, { attributes: true, attributeFilter: ['class'] });
    return true;
  }

  function install() {
    document.addEventListener('pointerdown', ensureContext, { once: true, passive: true });
    document.addEventListener('keydown', ensureContext, { once: true });
    if (isPulse && watchPulse()) return;
    if (isBp && watchBp()) return;
    window.setTimeout(install, 80);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();

  window.addEventListener('pagehide', () => {
    try { ctx?.close?.(); } catch (_) {}
  }, { once: true });
})();
