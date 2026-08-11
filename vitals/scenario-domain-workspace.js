(() => {
  'use strict';

  const VERSION = '2026.08.11.1';
  const desktopQuery = window.matchMedia('(min-width:980px)');
  let reconcileQueued = false;
  let observer = null;

  const $ = id => document.getElementById(id);

  function desktopActive() {
    return desktopQuery.matches && document.body.classList.contains('desktop-scenario-layout');
  }

  function installStyles() {
    if (document.querySelector('link[data-domain-workspace-css]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/vitals/scenario-domain-workspace.css?v=${encodeURIComponent(VERSION)}`;
    link.dataset.domainWorkspaceCss = VERSION;
    document.head.appendChild(link);
  }

  function centerRail() {
    return document.querySelector('.bottom-nav');
  }

  function domainButton(panelId) {
    return centerRail()?.querySelector(`button[data-panel="${panelId}"]`) || null;
  }

  function activePanelId() {
    return centerRail()?.querySelector('button[data-panel].active')?.dataset.panel || '';
  }

  function rightWorkspaceReady() {
    const sheet = $('actionSheet');
    const control = document.querySelector('.patient-control-column');
    return Boolean(sheet && control && sheet.parentElement === control);
  }

  function moveControlsToCenter() {
    const layout = document.querySelector('.scenario-hero-layout');
    const control = document.querySelector('.patient-control-column');
    const nav = centerRail();
    if (!layout || !control || !nav) return false;

    nav.classList.add('clinical-domain-rail');
    nav.setAttribute('aria-label', 'Clinical domains');
    if (nav.parentElement !== layout || nav.nextElementSibling !== control) {
      layout.insertBefore(nav, control);
    }

    // The previous dedicated History navigation button is removed from the
    // desktop control rail. History remains available as a clinical option in
    // the Assessment workspace so the interview still uses the same right field.
    nav.querySelector('button[data-panel="historyPanel"]')?.classList.add('desktop-domain-hidden');
    return true;
  }

  function keepSheetInRightField() {
    const sheet = $('actionSheet');
    const control = document.querySelector('.patient-control-column');
    if (!sheet || !control) return false;
    if (sheet.parentElement !== control) control.appendChild(sheet);
    return sheet.parentElement === control;
  }

  function ensureHistoryLauncher() {
    const panel = $('assessmentPanel');
    const tools = $('assessmentTools');
    const historyButton = domainButton('historyPanel');
    if (!panel || !tools || !historyButton) return;

    let launcher = panel.querySelector('.assessment-history-launcher');
    if (!launcher) {
      launcher = document.createElement('button');
      launcher.type = 'button';
      launcher.className = 'assessment-history-launcher';
      launcher.innerHTML = `
        <span><strong>Patient history & interview</strong><small>Ask SAMPLE, OPQRST, medications, allergies, events, or your own focused question.</small></span>
        <em>Open history ›</em>`;
      launcher.addEventListener('click', () => historyButton.click());
      panel.insertBefore(launcher, tools);
    }
  }

  function expandAssessmentChoices() {
    const panel = $('assessmentPanel');
    if (!panel || panel.hidden) return;
    panel.querySelectorAll('details').forEach(details => { details.open = true; });
  }

  function updateWorkspaceHeading(panelId) {
    const eyebrow = $('sheetEyebrow');
    if (eyebrow) eyebrow.textContent = 'CLINICAL WORKSPACE';
    const panel = $(panelId);
    if (panel) panel.dataset.domainWorkspaceActive = 'true';
    document.querySelectorAll('.vp-panel').forEach(item => {
      if (item !== panel) delete item.dataset.domainWorkspaceActive;
    });
  }

  function openDefaultDomainWhenReady() {
    if (!desktopActive()) return;
    if (document.body.classList.contains('horse-arrival-pending') || $('horseArrivalDecision')) return;
    const sheet = $('actionSheet');
    const activeId = activePanelId();
    if (activeId) {
      if (sheet) sheet.hidden = false;
      updateWorkspaceHeading(activeId);
      if (activeId === 'assessmentPanel') expandAssessmentChoices();
      return;
    }
    domainButton('assessmentPanel')?.click();
  }

  function reconcile() {
    reconcileQueued = false;
    if (!desktopActive()) {
      document.body.classList.remove('clinical-domain-workspace-v2');
      return;
    }

    installStyles();
    document.body.classList.add('clinical-domain-workspace-v2');
    moveControlsToCenter();
    keepSheetInRightField();
    ensureHistoryLauncher();
    openDefaultDomainWhenReady();
  }

  function scheduleReconcile() {
    if (reconcileQueued) return;
    reconcileQueued = true;
    window.requestAnimationFrame(reconcile);
  }

  function launchVitalFromRow(event) {
    if (!desktopActive()) return;
    const row = event.target.closest?.('#vitalTools .compact-vital-row');
    if (!row) return;
    if (event.target.closest('a,button,input,select,textarea,label')) return;
    const perform = row.querySelector('.vital-row-actions a[href]') || row.querySelector('a[href]');
    if (!perform) return;
    perform.click();
  }

  function handleDomainClick(event) {
    const button = event.target.closest?.('.bottom-nav button[data-panel]');
    if (!button || !desktopActive()) return;
    window.requestAnimationFrame(() => {
      const panelId = button.dataset.panel || '';
      updateWorkspaceHeading(panelId);
      if (panelId === 'assessmentPanel') expandAssessmentChoices();
      const sheet = $('actionSheet');
      if (sheet && !document.body.classList.contains('horse-arrival-pending')) sheet.hidden = false;
      ensureHistoryLauncher();
    });
  }

  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver(mutations => {
      if (!desktopActive()) return;
      const structuralChange = mutations.some(mutation => mutation.type === 'childList');
      if (structuralChange) scheduleReconcile();
    });
    observer.observe(document.body, { childList:true, subtree:true });
  }

  function start() {
    installStyles();
    document.addEventListener('click', launchVitalFromRow, true);
    document.addEventListener('click', handleDomainClick, true);
    desktopQuery.addEventListener?.('change', scheduleReconcile);
    window.addEventListener('resize', scheduleReconcile, { passive:true });
    window.addEventListener('emscodesim:assessment-saved', scheduleReconcile);
    window.addEventListener('emscodesim:vital-saved', scheduleReconcile);
    startObserver();
    scheduleReconcile();
    window.setTimeout(scheduleReconcile, 120);
    window.setTimeout(scheduleReconcile, 500);
  }

  window.EMSCodeSimDomainWorkspace = Object.freeze({
    version: VERSION,
    reconcile: scheduleReconcile,
    activePanelId,
    rightWorkspaceReady
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
