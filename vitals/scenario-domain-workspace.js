(() => {
  'use strict';

  const VERSION = '2026.08.11.7';
  const desktopQuery = window.matchMedia('(min-width:980px)');
  let reconcileQueued = false;
  let observer = null;
  let patientUpdateHome = null;
  let patientUpdateNext = null;

  const $ = id => document.getElementById(id);

  function desktopActive() {
    return desktopQuery.matches && document.body.classList.contains('desktop-scenario-layout');
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
    if (!document.querySelector('link[data-patient-conversation-css]')) {
      const conversation = document.createElement('link');
      conversation.rel = 'stylesheet';
      conversation.href = `/vitals/scenario-patient-conversation.css?v=${encodeURIComponent(VERSION)}`;
      conversation.dataset.patientConversationCss = VERSION;
      document.head.appendChild(conversation);
    }
    if (!document.querySelector('link[data-single-screen-css]')) {
      const compact = document.createElement('link');
      compact.rel = 'stylesheet';
      compact.href = `/vitals/scenario-single-screen.css?v=${encodeURIComponent(VERSION)}`;
      compact.dataset.singleScreenCss = VERSION;
      document.head.appendChild(compact);
    }
    if (!document.querySelector('script[data-patient-conversation-js]')) {
      const conversationScript = document.createElement('script');
      conversationScript.src = `/vitals/scenario-patient-conversation.js?v=${encodeURIComponent(VERSION)}`;
      conversationScript.defer = true;
      conversationScript.dataset.patientConversationJs = VERSION;
      document.head.appendChild(conversationScript);
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

    nav.querySelector('button[data-panel="historyPanel"]')?.classList.remove('desktop-domain-hidden');
    nav.querySelector('button[data-panel="findingsPanel"]')?.classList.add('desktop-domain-hidden');
    return true;
  }

  function keepSheetInRightField() {
    const sheet = $('actionSheet');
    const control = document.querySelector('.patient-control-column');
    if (!sheet || !control) return false;
    if (sheet.parentElement !== control) control.appendChild(sheet);
    return sheet.parentElement === control;
  }

  function patientUpdateWindow() {
    return document.querySelector('.info-update-window');
  }

  function movePatientUpdateToPatient() {
    const update = patientUpdateWindow();
    const stage = document.querySelector('.patient-stage');
    if (!update || !stage) return false;

    if (!patientUpdateHome) {
      patientUpdateHome = update.parentElement;
      patientUpdateNext = update.nextSibling;
    }
    if (update.parentElement !== stage) stage.appendChild(update);
    update.classList.add('cockpit-patient-update');
    return true;
  }

  function restorePatientUpdate() {
    const update = patientUpdateWindow();
    if (!update) return;
    update.classList.remove('cockpit-patient-update');
    if (!patientUpdateHome || update.parentElement === patientUpdateHome) return;
    if (patientUpdateNext && patientUpdateNext.parentNode === patientUpdateHome) {
      patientUpdateHome.insertBefore(update, patientUpdateNext);
    } else {
      patientUpdateHome.appendChild(update);
    }
  }

  function setSectionTitle(section, title, subtitle) {
    if (!section) return;
    const titleNode = section.querySelector('.assessment-section-title span');
    const subtitleNode = section.querySelector('.assessment-section-title small');
    if (titleNode) titleNode.textContent = title;
    if (subtitleNode) subtitleNode.textContent = subtitle;
  }

  function refineAssessmentHierarchy() {
    const panel = $('assessmentPanel');
    const tools = $('assessmentTools');
    if (!panel || !tools) return;

    tools.classList.add('assessment-priority-workspace');

    const immediate = tools.querySelector('.assessment-immediate');
    if (immediate) {
      immediate.dataset.assessmentPriority = 'immediate';
      setSectionTitle(immediate, 'Immediate', 'Scene safety and rapid Airway, Breathing, Circulation. Address immediate threats first.');
    }

    const focused = tools.querySelector('.horse-assessment-section');
    if (focused) {
      focused.dataset.assessmentPriority = 'focused';
      setSectionTitle(focused, 'Focused', 'Examine the chief complaint or injured region. You decide which findings matter and in what order.');
    }

    const more = tools.querySelector('.assessment-more');
    if (more) {
      more.dataset.assessmentPriority = 'more';
      const strong = more.querySelector('summary strong');
      const small = more.querySelector('summary small');
      if (strong) strong.textContent = 'More';
      if (small) small.textContent = 'Additional examinations when the presentation or your findings justify them';

      const body = more.querySelector('.assessment-more-body');
      if (body && !body.querySelector('.assessment-focused-guide')) {
        const guide = document.createElement('div');
        guide.className = 'assessment-focused-guide';
        guide.innerHTML = '<span>FOCUSED VIEW</span><p>Use the focus list to narrow the assessment library by complaint. This organizes choices only—it does not identify the correct exam.</p>';
        body.prepend(guide);
      }
    }

    panel.dataset.assessmentHierarchy = focused ? 'three-level' : 'progressive';
  }

  function compactAssessmentChoices() {
    const panel = $('assessmentPanel');
    if (!panel || panel.hidden) return;
    refineAssessmentHierarchy();

    // Secondary libraries stay collapsed on desktop. The learner can open them
    // deliberately, rather than landing in a long pre-expanded document.
    panel.querySelectorAll('details.assessment-more').forEach(details => {
      if (!details.dataset.userOpened) details.open = false;
    });
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
    if (eyebrow) eyebrow.textContent = panelId === 'historyPanel' ? 'TALK TO THE PATIENT' : 'CLINICAL DOMAIN';
    if (title) title.textContent = panelId === 'historyPanel' ? 'Ask a question' : domainLabel(panelId);
    const panel = $(panelId);
    if (panel) panel.dataset.domainWorkspaceActive = 'true';
    document.querySelectorAll('.vp-panel').forEach(item => {
      if (item !== panel) delete item.dataset.domainWorkspaceActive;
    });
    window.EMSCodeSimPatientConversation?.sync?.();
  }

  function openDefaultDomainWhenReady() {
    if (!desktopActive()) return;
    if (document.body.classList.contains('horse-arrival-pending') || $('horseArrivalDecision')) return;
    const sheet = $('actionSheet');
    const activeId = activePanelId();
    if (activeId) {
      if (sheet) sheet.hidden = false;
      updateWorkspaceHeading(activeId);
      if (activeId === 'assessmentPanel') compactAssessmentChoices();
      return;
    }
    domainButton('assessmentPanel')?.click();
  }

  function reconcile() {
    reconcileQueued = false;
    if (!desktopActive()) {
      document.body.classList.remove('clinical-domain-workspace-v2', 'clinical-cockpit-v3', 'single-screen-cockpit');
      restorePatientUpdate();
      window.EMSCodeSimPatientConversation?.sync?.();
      return;
    }

    installStyles();
    document.body.classList.add('clinical-domain-workspace-v2', 'clinical-cockpit-v3', 'single-screen-cockpit');
    moveControlsToCenter();
    keepSheetInRightField();
    movePatientUpdateToPatient();
    refineAssessmentHierarchy();
    openDefaultDomainWhenReady();
    window.EMSCodeSimPatientConversation?.sync?.();
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
      if (panelId === 'assessmentPanel') compactAssessmentChoices();
      const sheet = $('actionSheet');
      if (sheet && !document.body.classList.contains('horse-arrival-pending')) sheet.hidden = false;
    });
  }

  function trackAssessmentDisclosure(event) {
    if (!desktopActive()) return;
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement) || !details.classList.contains('assessment-more')) return;
    if (details.open) details.dataset.userOpened = 'true';
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
    document.addEventListener('toggle', trackAssessmentDisclosure, true);
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
