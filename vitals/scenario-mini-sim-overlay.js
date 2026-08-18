(() => {
  'use strict';

  const OVERLAY_VERSION = '2026.08.18.33';
  const registry = window.EMSCodeSimToolRegistry;
  const toolPaths = new Set([
    ...(registry?.vitalTools || []).map(tool => tool.url),
    ...(registry?.assessmentTools || []).map(tool => tool.url)
  ].filter(Boolean).filter(path => path !== '/vitals/visual-patient.html'));

  const $ = id => document.getElementById(id);
  const workspace = () => $('embeddedSimWorkspace');
  const frame = () => $('embeddedSimFrame');
  const patientStage = () => document.querySelector('.patient-stage');

  function activeCaseId() {
    const params = new URLSearchParams(location.search);
    return params.get('case')
      || window.EMSCodeSimScenarioSession?.requestedCaseId?.()
      || window.EMSCodeSimPatientRecord?.active?.()?.scenarioId
      || '';
  }

  function trainingMode() {
    const params = new URLSearchParams(location.search);
    return params.get('training') || window.EMSCodeSimPatientRecord?.active?.()?.documentation?.trainingMode || 'learning';
  }

  function installParentStyles() {
    if (document.querySelector('style[data-mini-sim-overlay]')) return;
    const style = document.createElement('style');
    style.dataset.miniSimOverlay = OVERLAY_VERSION;
    style.textContent = `
      .patient-stage{isolation:isolate}
      #embeddedSimWorkspace.embedded-sim-workspace{
        position:absolute!important;
        inset:0!important;
        z-index:90!important;
        width:auto!important;
        height:auto!important;
        min-width:0!important;
        min-height:0!important;
        max-width:none!important;
        max-height:none!important;
        overflow:hidden!important;
        display:flex!important;
        flex-direction:column!important;
        border:0!important;
        border-radius:inherit!important;
        background:#07131f!important;
        box-shadow:none!important;
        transform:none!important;
      }
      #embeddedSimWorkspace.embedded-sim-workspace[hidden]{display:none!important}
      #embeddedSimWorkspace .embedded-sim-header{
        min-height:48px!important;
        padding:7px 10px!important;
        border-bottom:1px solid #31566d!important;
        background:linear-gradient(180deg,#102b40,#0b1f2e)!important;
      }
      #embeddedSimWorkspace .embedded-sim-header small{color:#7fd0ff!important;font-size:.55rem!important;letter-spacing:.1em!important}
      #embeddedSimWorkspace .embedded-sim-header strong{font-size:.82rem!important}
      #embeddedSimWorkspace .embedded-sim-header button{
        min-height:34px!important;padding:6px 10px!important;border-radius:9px!important;
        border:1px solid #4b8caf!important;background:#173f5a!important;color:#fff!important;
      }
      #embeddedSimWorkspace iframe{display:block!important;flex:1 1 0!important;width:100%!important;height:100%!important;min-height:0!important;border:0!important;background:#e8f1f6!important}
      body.sim-workspace-open .patient-stage>#patientImage{
        display:block!important;visibility:visible!important;opacity:1!important;
      }
      body.sim-workspace-open .patient-stage:after{display:none!important}
      @media(max-width:979px){
        body.sim-workspace-open .patient-stage{height:min(72dvh,650px)!important;min-height:430px!important;max-height:650px!important}
        body.sim-workspace-open #actionSheet,
        body.sim-workspace-open #sheetBackdrop{
          display:none!important;
          pointer-events:none!important;
        }
        #embeddedSimWorkspace.embedded-sim-workspace{inset:6px!important;border-radius:16px!important;box-shadow:0 14px 44px rgba(0,0,0,.55)!important}
        #embeddedSimWorkspace .embedded-sim-header{min-height:44px!important;padding:6px 8px!important}
      }
      @media(max-width:480px){
        body.sim-workspace-open .patient-stage{height:72dvh!important;min-height:410px!important}
        #embeddedSimWorkspace.embedded-sim-workspace{inset:4px!important;border-radius:14px!important}
        #embeddedSimWorkspace .embedded-sim-header strong{font-size:.76rem!important}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureWorkspaceOverPatient() {
    const node = workspace();
    const stage = patientStage();
    const clue = $('sceneClueLayer');
    if (!node || !stage) return false;
    node.classList.remove('horse-sidecar-sim');
    if (node.parentElement !== stage) {
      if (clue?.parentElement === stage) clue.insertAdjacentElement('afterend', node);
      else stage.prepend(node);
    }
    const image = $('patientImage');
    if (image) {
      image.hidden = false;
      image.style.removeProperty('display');
      image.style.removeProperty('visibility');
      image.style.removeProperty('opacity');
    }
    return node.parentElement === stage;
  }

  function titleFor(url, anchor) {
    const tool = [...(registry?.vitalTools || []), ...(registry?.assessmentTools || [])]
      .find(item => item.url === url.pathname);
    return tool?.label || anchor?.textContent?.trim() || 'Assessment mini sim';
  }

  function buildEmbeddedUrl(href) {
    let url;
    try { url = new URL(href, location.href); } catch { return null; }
    if (url.origin !== location.origin || !toolPaths.has(url.pathname)) return null;
    url.searchParams.set('mode', 'scenario');
    url.searchParams.set('resume', '1');
    url.searchParams.set('embedded', '1');
    url.searchParams.set('autosaveclose', '1');
    const caseId = activeCaseId();
    if (caseId) url.searchParams.set('case', caseId);
    url.searchParams.set('training', trainingMode());
    return url;
  }

  function openOverlay(href, title = 'Assessment mini sim') {
    const node = workspace();
    const iframe = frame();
    const url = buildEmbeddedUrl(href);
    if (!node || !iframe || !url) return false;
    // Bump generation and cancel a previous sim's delayed close before this
    // overlay becomes visible, so pulse-ox save cannot hide airway a moment later.
    window.dispatchEvent(new CustomEvent('emscodesim:embedded-sim-opened'));
    ensureWorkspaceOverPatient();
    const titleNode = $('embeddedSimTitle');
    if (titleNode) titleNode.textContent = title;
    node.hidden = false;
    document.body.classList.add('sim-workspace-open');
    iframe.src = url.toString();
    return true;
  }

  function lockIframeViewport(doc) {
    const html = doc.documentElement;
    const body = doc.body;
    if (!html || !body) return;
    const lock = (node, prop, value) => node.style.setProperty(prop, value, 'important');
    lock(html, 'height', '100%');
    lock(html, 'max-height', '100%');
    lock(html, 'min-height', '0');
    lock(html, 'overflow', 'hidden');
    lock(body, 'height', '100%');
    lock(body, 'max-height', '100%');
    lock(body, 'min-height', '0');
    lock(body, 'overflow', 'hidden');
    lock(body, 'display', 'flex');
    lock(body, 'flex-direction', 'column');
  }

  function injectChildExperience() {
    const iframe = frame();
    if (!iframe || iframe.src === 'about:blank') return;
    try {
      const doc = iframe.contentDocument;
      if (!doc?.head || !doc.body) return;
      doc.documentElement.dataset.emsMiniSim = 'embedded';
      doc.body.classList.add('ems-embedded-mini-sim');
      lockIframeViewport(doc);
      if (!doc.querySelector('link[data-ems-mini-sim-css]')) {
        const link = doc.createElement('link');
        link.rel = 'stylesheet';
        link.href = `/vitals/scenario-mini-sim-embedded.css?v=${encodeURIComponent(OVERLAY_VERSION)}`;
        link.dataset.emsMiniSimCss = '1';
        doc.head.appendChild(link);
      }
      if (!doc.querySelector('link[data-ems-mini-sim-compact]')) {
        const compact = doc.createElement('link');
        compact.rel = 'stylesheet';
        compact.href = `/vitals/scenario-mini-sim-compact.css?v=${encodeURIComponent(OVERLAY_VERSION)}`;
        compact.dataset.emsMiniSimCompact = '1';
        doc.head.appendChild(compact);
      }
      if (!doc.querySelector('script[data-ems-mini-sim-js]')) {
        const script = doc.createElement('script');
        script.src = `/vitals/scenario-mini-sim-embedded.js?v=${encodeURIComponent(OVERLAY_VERSION)}`;
        script.dataset.emsMiniSimJs = '1';
        script.async = false;
        doc.body.appendChild(script);
      }
      if (!doc.querySelector('script[data-ems-mini-sim-audio-boost]')) {
        const audioBoost = doc.createElement('script');
        audioBoost.src = `/vitals/scenario-mini-sim-audio-boost.js?v=${encodeURIComponent(OVERLAY_VERSION)}`;
        audioBoost.dataset.emsMiniSimAudioBoost = '1';
        audioBoost.async = false;
        doc.body.appendChild(audioBoost);
      }
    } catch (_) {
      // Scenario mini sims are same-origin. Ignore a transient load/navigation state.
    }
  }

  function interceptMobileTools() {
    document.addEventListener('click', event => {
      if (window.matchMedia('(min-width:980px)').matches) return;
      const anchor = event.target.closest?.('a[href]');
      if (!anchor) return;
      if (!anchor.closest('#actionSheet') && !anchor.closest('.patient-control-column')) return;
      const url = buildEmbeddedUrl(anchor.href);
      if (!url) return;
      if (openOverlay(url.toString(), titleFor(url, anchor))) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
  }

  function start() {
    installParentStyles();
    ensureWorkspaceOverPatient();
    interceptMobileTools();

    const iframe = frame();
    iframe?.addEventListener('load', () => {
      ensureWorkspaceOverPatient();
      window.setTimeout(injectChildExperience, 0);
      window.setTimeout(injectChildExperience, 90);
      window.setTimeout(injectChildExperience, 250);
    });

    const observer = new MutationObserver(() => {
      if (!workspace()?.hidden || workspace()?.parentElement !== patientStage()) ensureWorkspaceOverPatient();
    });
    observer.observe(document.body, { childList:true, subtree:true });
    window.addEventListener('pagehide', () => observer.disconnect(), { once:true });
  }

  window.EMSCodeSimMiniSimOverlay = Object.freeze({
    version: OVERLAY_VERSION,
    openOverlay,
    ensureWorkspaceOverPatient,
    injectChildExperience,
    toolPaths: Object.freeze([...toolPaths])
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
