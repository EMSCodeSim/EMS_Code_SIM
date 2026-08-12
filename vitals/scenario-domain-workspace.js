(() => {
  'use strict';

  const VERSION = '2026.08.11.12';
  const desktopQuery = window.matchMedia('(min-width:980px)');
  let reconcileQueued = false;
  let observer = null;

  const $ = id => document.getElementById(id);

  function desktopActive() {
    return desktopQuery.matches && document.body.classList.contains('desktop-scenario-layout');
  }

  function horseScenarioRequested() {
    const requested = new URLSearchParams(location.search).get('case');
    return requested === 'horse_crush'
      || document.body.classList.contains('horse-current-emt-call')
      || window.EMSCodeSimPatientRecord?.active?.()?.scenarioId === 'horse_crush';
  }

  function horseArrivalComplete() {
    const record = window.EMSCodeSimScenarioSession?.active?.('horse_crush')
      || window.EMSCodeSimPatientRecord?.active?.();
    return Boolean(record?.findings?.arrival_parking);
  }

  function placeNode(parent, node, reference = null) {
    if (!parent || !node) return false;
    if (reference && reference.parentElement === parent) parent.insertBefore(node, reference);
    else parent.appendChild(node);
    return node.parentElement === parent;
  }

  function installStyles() {
    if (!document.querySelector('link[data-domain-workspace-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `/vitals/scenario-domain-workspace.css?v=${encodeURIComponent(VERSION)}`;
      link.dataset.domainWorkspaceCss = VERSION;
      document.head.appendChild(link);
    }
    if (!document.querySelector('link[data-clinical-cockpit-css]')) {
      const cockpit = document.createElement('link');
      cockpit.rel = 'stylesheet';
      cockpit.href = `/vitals/scenario-clinical-cockpit.css?v=${encodeURIComponent(VERSION)}`;
      cockpit.dataset.clinicalCockpitCss = VERSION;
      document.head.appendChild(cockpit);
    }
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

  function interactionColumn() {
    return $('clinicalInteractionColumn');
  }

  function setInteractionOrder(node, value) {
    if (!node) return;
    node.style.setProperty('order', String(value), 'important');
  }

  function clearInteractionOrder(node) {
    node?.style?.removeProperty('order');
  }

  function ensureInteractionColumn() {
    const layout = document.querySelector('.scenario-hero-layout');
    const control = document.querySelector('.patient-control-column');
    if (!layout || !control) return null;

    let column = interactionColumn();
    if (!column) {
      column = document.createElement('section');
      column.id = 'clinicalInteractionColumn';
      column.className = 'clinical-interaction-column';
      column.setAttribute('aria-label', 'Patient interaction and clinical controls');
    }

    if (column.parentElement !== layout || column.nextElementSibling !== control) {
      placeNode(layout, column, control.parentElement === layout ? control : null);
    }
    return column;
  }

  function moveInteractionToCenter() {
    const column = ensureInteractionColumn();
    const nav = centerRail();
    if (!column || !nav) return false;

    nav.classList.add('clinical-domain-rail');
    nav.setAttribute('aria-label', 'Clinical domains');
    nav.querySelector('button[data-panel="historyPanel"]')?.classList.remove('desktop-domain-hidden');
    nav.querySelector('button[data-panel="findingsPanel"]')?.classList.add('desktop-domain-hidden');
    if (nav.parentElement !== column) column.appendChild(nav);
    setInteractionOrder(nav, 0);

    const update = document.querySelector('.info-update-window');
    if (update) {
      update.classList.remove('cockpit-patient-update');
      update.classList.add('cockpit-center-update');
      if (update.parentElement !== column) column.appendChild(update);
      setInteractionOrder(update, 1);
    }

    const question = $('horseClinicalQuestionBox');
    if (question) {
      if (question.parentElement !== column) column.appendChild(question);
      setInteractionOrder(question, 2);
    }

    const inlineQuestion = $('horseAssessmentInlineQuestion');
    if (inlineQuestion) {
      if (inlineQuestion.parentElement !== column) column.appendChild(inlineQuestion);
      setInteractionOrder(inlineQuestion, 3);
    }

    const arrival = $('horseArrivalDecision');
    if (arrival) {
      if (arrival.parentElement !== column) column.appendChild(arrival);
      setInteractionOrder(arrival, 4);
    }

    const entryWorkflow = document.querySelector('.patient-entry-workflow');
    if (entryWorkflow) {
      // horse-crush-scenario.js creates the arrival card with
      // controlColumn.insertBefore(section, entryWorkflow). Keep that original
      // anchor in place only until the arrival card has been created. Afterward,
      // the arrival card and normal interaction workflow both belong here.
      const preserveArrivalAnchor = horseScenarioRequested() && !arrival && !horseArrivalComplete();
      if (!preserveArrivalAnchor) {
        if (entryWorkflow.parentElement !== column) column.appendChild(entryWorkflow);
        setInteractionOrder(entryWorkflow, arrival ? 5 : 4);
      }
    }

    return true;
  }

  function restoreMobileStructure() {
    const layout = document.querySelector('.scenario-hero-layout');
    const control = document.querySelector('.patient-control-column');
    const column = interactionColumn();
    const nav = centerRail();
    if (!layout || !control) return;

    clearInteractionOrder(nav);
    if (nav && nav.parentElement !== layout) {
      placeNode(layout, nav, control.parentElement === layout ? control : null);
    }

    const update = document.querySelector('.info-update-window');
    clearInteractionOrder(update);
    if (update && update.parentElement !== control) {
      update.classList.remove('cockpit-center-update');
      placeNode(control, update, control.firstElementChild);
    }

    const currentAssessment = $('horseCurrentAssessment');
    const question = $('horseClinicalQuestionBox');
    clearInteractionOrder(question);
    if (question && question.parentElement !== control) {
      const reference = [currentAssessment, control.querySelector('.patient-entry-workflow'), $('actionSheet')]
        .find(node => node?.parentElement === control) || null;
      placeNode(control, question, reference);
    }

    const arrival = $('horseArrivalDecision');
    clearInteractionOrder(arrival);
    const entryWorkflow = document.querySelector('.patient-entry-workflow');
    clearInteractionOrder(entryWorkflow);

    if (entryWorkflow && entryWorkflow.parentElement !== control) {
      if (currentAssessment?.parentElement === control) {
        placeNode(control, entryWorkflow, currentAssessment.nextElementSibling);
      } else {
        const sheet = $('actionSheet');
        placeNode(control, entryWorkflow, sheet?.parentElement === control ? sheet : null);
      }
    }

    if (arrival && arrival.parentElement !== control) {
      const reference = entryWorkflow?.parentElement === control
        ? entryWorkflow
        : ($('actionSheet')?.parentElement === control ? $('actionSheet') : null);
      placeNode(control, arrival, reference);
    }

    const inlineQuestion = $('horseAssessmentInlineQuestion');
    clearInteractionOrder(inlineQuestion);
    const assessmentTools = $('assessmentTools');
    if (inlineQuestion && assessmentTools && inlineQuestion.parentElement !== assessmentTools) assessmentTools.prepend(inlineQuestion);

    if (column?.parentElement && !column.children.length) column.remove();
  }

  function keepSheetInRightField() {
    const sheet = $('actionSheet');
    const control = document.querySelector('.patient-control-column');
    if (!sheet || !control) return false;
    if (sheet.parentElement !== control) control.appendChild(sheet);
    return sheet.parentElement === control;
  }

  function expandAssessmentChoices() {
    const panel = $('assessmentPanel');
    if (!panel || panel.hidden) return;
    panel.querySelectorAll('details').forEach(details => { details.open = true; });
  }

  function domainLabel(panelId) {
    return ({
      assessmentPanel: 'Assessment',
      vitalsPanel: 'Vitals',
      historyPanel: 'History',
      treatmentPanel: 'Treatment',
      findingsPanel: 'Patient record'
    })[panelId] || 'Clinical workspace';
  }

  function updateWorkspaceHeading(panelId) {
    const eyebrow = $('sheetEyebrow');
    const title = $('sheetTitle');
    if (eyebrow) eyebrow.textContent = 'CLINICAL DOMAIN';
    if (title) title.textContent = domainLabel(panelId);
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

    // On desktop the core scenario runtime adds desktop-scenario-layout shortly
    // after parsing. Do not temporarily restore the mobile DOM while that class
    // is still settling; just retry once the desktop runtime is ready.
    if (desktopQuery.matches && !document.body.classList.contains('desktop-scenario-layout')) {
      window.setTimeout(scheduleReconcile, 40);
      return;
    }

    if (!desktopActive()) {
      document.body.classList.remove('clinical-domain-workspace-v2', 'clinical-cockpit-v3', 'clinical-interaction-workspace-v4');
      restoreMobileStructure();
      return;
    }

    installStyles();
    document.body.classList.add('clinical-domain-workspace-v2', 'clinical-cockpit-v3', 'clinical-interaction-workspace-v4');
    moveInteractionToCenter();
    keepSheetInRightField();
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
    if (!button || !desktopActive() || button.classList.contains('desktop-domain-hidden')) return;
    window.requestAnimationFrame(() => {
      const panelId = button.dataset.panel || '';
      updateWorkspaceHeading(panelId);
      if (panelId === 'assessmentPanel') expandAssessmentChoices();
      const sheet = $('actionSheet');
      if (sheet && !document.body.classList.contains('horse-arrival-pending')) sheet.hidden = false;
      scheduleReconcile();
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
    rightWorkspaceReady,
    interactionColumnReady: () => Boolean(interactionColumn())
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
