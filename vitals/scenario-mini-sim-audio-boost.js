(() => {
  'use strict';

  if (window.__emsMiniSimAudioBoostInstalled) return;
  window.__emsMiniSimAudioBoostInstalled = true;

  const BOOST = 2.4;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const boostedMedia = new WeakSet();

  function decorateContext(ctx) {
    if (!ctx || ctx.__emsAudioBoosted || typeof ctx.createGain !== 'function') return ctx;
    try {
      const master = ctx.createGain();
      master.gain.value = BOOST;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.knee.value = 16;
      compressor.ratio.value = 2.8;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.16;
      master.connect(compressor);
      compressor.connect(ctx.destination);
      ctx.__emsMasterGain = master;
      ctx.__emsCompressor = compressor;
      ctx.__emsAudioBoosted = true;
    } catch (_) { /* Fake or restricted AudioContext */ }
    return ctx;
  }

  if (AudioContextClass && !AudioContextClass.__emsBoostWrapped) {
    const Orig = AudioContextClass;
    function WrappedAudioContext(...args) {
      const ctx = new Orig(...args);
      decorateContext(ctx);
      return ctx;
    }
    WrappedAudioContext.prototype = Orig.prototype;
    Object.setPrototypeOf(WrappedAudioContext, Orig);
    WrappedAudioContext.__emsBoostWrapped = true;
    window.AudioContext = WrappedAudioContext;
    if (window.webkitAudioContext) window.webkitAudioContext = WrappedAudioContext;
  }

  const nativeConnect = AudioNode.prototype.connect;
  if (nativeConnect && !AudioNode.prototype.__emsBoostConnect) {
    AudioNode.prototype.connect = function connectBoosted(dest, ...rest) {
      const ctx = this.context;
      if (
        ctx?.__emsMasterGain
        && dest === ctx.destination
        && this !== ctx.__emsMasterGain
        && this !== ctx.__emsCompressor
      ) {
        return nativeConnect.call(this, ctx.__emsMasterGain, ...rest);
      }
      return nativeConnect.call(this, dest, ...rest);
    };
    AudioNode.prototype.__emsBoostConnect = true;
  }

  function boostMediaElement(media) {
    if (!media || boostedMedia.has(media) || !AudioContextClass) return;
    try {
      const ctx = decorateContext(new AudioContextClass());
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      if (typeof ctx.createMediaElementSource !== 'function') return;
      const source = ctx.createMediaElementSource(media);
      source.connect(ctx.__emsMasterGain || ctx.destination);
      boostedMedia.add(media);
      if (typeof media.volume === 'number' && media.volume <= 0) media.volume = 1;
    } catch (_) {
      try { media.volume = Math.min(1, Math.max(Number(media.volume) || 0, 0.95)); } catch { /* ignore */ }
    }
  }

  const NativeAudio = window.Audio;
  if (typeof NativeAudio === 'function' && !NativeAudio.__emsBoostWrapped) {
    function BoostedAudio(...args) {
      const audio = new NativeAudio(...args);
      audio.addEventListener('play', () => boostMediaElement(audio), { once: true });
      return audio;
    }
    BoostedAudio.prototype = NativeAudio.prototype;
    Object.setPrototypeOf(BoostedAudio, NativeAudio);
    BoostedAudio.__emsBoostWrapped = true;
    window.Audio = BoostedAudio;
  }

  document.addEventListener('play', event => {
    if (event.target instanceof HTMLMediaElement) boostMediaElement(event.target);
  }, true);

  document.addEventListener('pointerdown', () => {
    if (!AudioContextClass) return;
    try {
      const ctx = decorateContext(new AudioContextClass());
      ctx.resume?.().catch(() => {});
    } catch (_) { /* ignore */ }
  }, { once: true, passive: true });

  window.EMSCodeSimMiniSimAudioBoost = Object.freeze({
    version: '2026.08.18.23',
    boost: BOOST
  });
})();
