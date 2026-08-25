(function () {
  'use strict';

  if (window.EMSCodeSimShare) return;

  const STYLE_ID = 'ems-share-style';
  const TOAST_ID = 'ems-share-toast';
  const FAB_ID = 'ems-share-fab';

  function meta(selector, attr) {
    const el = document.querySelector(selector);
    if (!el) return '';
    return (attr ? el.getAttribute(attr) : el.textContent) || '';
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function absoluteUrl(href) {
    try {
      return new URL(href || location.href, location.origin).href;
    } catch (_) {
      return location.href;
    }
  }

  function defaultPayload(overrides) {
    overrides = overrides || {};
    const title =
      overrides.title ||
      meta('meta[property="og:title"]', 'content') ||
      document.title ||
      'EMSCodeSim';
    const text =
      overrides.text ||
      meta('meta[property="og:description"]', 'content') ||
      meta('meta[name="description"]', 'content') ||
      'Free EMT practice tools and EMS training simulators from EMSCodeSim.';
    const url =
      overrides.url ||
      meta('link[rel="canonical"]', 'href') ||
      meta('meta[property="og:url"]', 'content') ||
      location.href;
    return {
      title: cleanText(title),
      text: cleanText(text),
      url: absoluteUrl(url)
    };
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .ems-share-fab{
        position:fixed;z-index:9400;right:16px;bottom:16px;
        display:inline-flex;align-items:center;gap:8px;
        min-height:48px;padding:12px 16px;border:0;border-radius:999px;
        background:#0b4771;color:#fff;font:inherit;font-weight:800;
        box-shadow:0 14px 36px rgba(8,34,58,.28);cursor:pointer;
      }
      .ems-share-fab:hover,.ems-share-fab:focus-visible{background:#08385a;outline:none}
      .ems-share-fab[hidden]{display:none!important}
      .ems-share-fab-icon{font-size:1.05rem;line-height:1}
      .ems-share-inline{
        display:inline-flex;align-items:center;justify-content:center;gap:6px;
        min-height:40px;padding:8px 12px;border-radius:10px;
        border:1px solid #aac7d8;background:#fff;color:#0b4771;
        font:inherit;font-weight:800;cursor:pointer;text-decoration:none;
      }
      .ems-share-inline:hover,.ems-share-inline:focus-visible{background:#edf6fb;outline:none}
      .ems-share-toast{
        position:fixed;z-index:9600;left:50%;bottom:84px;transform:translateX(-50%);
        max-width:min(420px,calc(100vw - 24px));padding:12px 16px;border-radius:12px;
        background:#081626;color:#fff;font-weight:700;box-shadow:0 12px 30px rgba(0,0,0,.28);
        opacity:0;pointer-events:none;transition:opacity .18s ease, transform .18s ease;
      }
      .ems-share-toast.is-open{opacity:1;transform:translateX(-50%) translateY(-4px)}
      .practice-next-actions .ems-share-inline{background:#fff}
      .training-card .ems-share-inline{margin-top:10px;width:100%}
      .page-hero-inner .ems-share-inline{margin-top:14px}
      @media (max-width:560px){
        .ems-share-fab{right:12px;bottom:12px;padding:12px 14px}
        .ems-share-fab-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
        .ems-share-toast{bottom:76px}
      }
      @media (prefers-reduced-motion:reduce){
        .ems-share-toast{transition:none}
      }
    `;
    document.head.appendChild(style);
  }

  function showToast(message) {
    ensureStyles();
    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = TOAST_ID;
      toast.className = 'ems-share-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-open');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.remove('is-open'), 2400);
  }

  function composeMessage(payload) {
    const parts = [payload.title];
    if (payload.text) parts.push(payload.text);
    parts.push(payload.url);
    return parts.join('\n\n');
  }

  async function share(overrides) {
    const payload = defaultPayload(overrides || {});
    const message = composeMessage(payload);

    try {
      if (navigator.share) {
        await navigator.share({
          title: payload.title,
          text: payload.text ? `${payload.text}\n\n${payload.url}` : payload.url,
          url: payload.url
        });
        showToast('Shared. Thanks for spreading the tools.');
        return { ok: true, method: 'share' };
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return { ok: false, method: 'cancelled' };
    }

    try {
      await navigator.clipboard.writeText(message);
      showToast('Link copied — paste it in a message or post.');
      return { ok: true, method: 'clipboard' };
    } catch (_) {}

    window.prompt('Copy this link to share:', payload.url);
    return { ok: true, method: 'prompt' };
  }

  function bindButton(button, getOverrides) {
    if (!button || button.dataset.shareBound === '1') return;
    button.dataset.shareBound = '1';
    button.addEventListener('click', function (event) {
      event.preventDefault();
      share(typeof getOverrides === 'function' ? getOverrides() : getOverrides);
    });
  }

  function isImmersiveSimulator() {
    const path = location.pathname || '';
    if (/\/vitals\/visual-patient\.html$|\/visual-patient\.html$|\/APGAR\/?$/.test(path)) return true;
    if (document.body.classList.contains('scenario-mode')) return true;
    if (document.body.classList.contains('horse-current-emt-call')) return true;
    return false;
  }

  function mountFab() {
    if (document.body.dataset.noShare === 'true' || isImmersiveSimulator()) {
      const existing = document.getElementById(FAB_ID);
      if (existing) existing.remove();
      return null;
    }
    if (document.getElementById(FAB_ID)) return document.getElementById(FAB_ID);
    ensureStyles();
    const button = document.createElement('button');
    button.type = 'button';
    button.id = FAB_ID;
    button.className = 'ems-share-fab';
    button.setAttribute('aria-label', 'Share this page');
    button.innerHTML = '<span class="ems-share-fab-icon" aria-hidden="true">↗</span><span class="ems-share-fab-label">Share</span>';
    document.body.appendChild(button);
    bindButton(button);
    return button;
  }

  function enhanceTrainingCards() {
    document.querySelectorAll('.training-card').forEach(function (card) {
      if (card.querySelector('[data-ems-share]')) return;
      const link = card.querySelector('h2 a, a.card-action');
      if (!link) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ems-share-inline';
      button.setAttribute('data-ems-share', 'card');
      button.textContent = 'Share this tool';
      card.appendChild(button);
      bindButton(button, function () {
        return {
          title: cleanText(link.textContent) + ' | EMSCodeSim',
          text: cleanText((card.querySelector('p') || {}).textContent || ''),
          url: absoluteUrl(link.getAttribute('href'))
        };
      });
    });
  }

  function enhanceMarkedButtons() {
    document.querySelectorAll('[data-ems-share]').forEach(function (el) {
      bindButton(el, function () {
        return {
          title: el.getAttribute('data-share-title') || undefined,
          text: el.getAttribute('data-share-text') || undefined,
          url: el.getAttribute('data-share-url') || undefined
        };
      });
    });
  }

  function enhancePracticeNext() {
    document.querySelectorAll('.practice-next-actions').forEach(function (row) {
      if (row.querySelector('[data-ems-share="practice"]')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ems-share-inline';
      button.setAttribute('data-ems-share', 'practice');
      button.textContent = 'Share this page';
      row.appendChild(button);
      bindButton(button);
    });
  }

  function enhanceHero() {
    const hero = document.querySelector('.page-hero-inner, .hero-copy, .quiz-title-card, .daily-practice-shell, .scenario-hero > div');
    if (!hero || hero.querySelector('[data-ems-share="hero"]')) return;
    if (document.body.dataset.noShareHero === 'true') return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ems-share-inline';
    button.setAttribute('data-ems-share', 'hero');
    button.textContent = 'Share with a classmate';
    hero.appendChild(button);
    bindButton(button);
  }

  function boot() {
    ensureStyles();
    mountFab();
    enhanceMarkedButtons();
    enhanceTrainingCards();
    if (!isImmersiveSimulator()) enhanceHero();
    enhancePracticeNext();

    // Engagement loop injects late; watch briefly for it.
    const observer = new MutationObserver(function () {
      enhancePracticeNext();
      enhanceTrainingCards();
      mountFab();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-no-share'], childList: true, subtree: true });
    setTimeout(function () { observer.disconnect(); }, 4000);
  }

  window.EMSCodeSimShare = Object.freeze({
    share: share,
    mount: mountFab,
    payload: defaultPayload
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
