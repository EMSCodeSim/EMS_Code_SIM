(() => {
  'use strict';

  const CASE_ID = 'horse_crush';
  const BUILD = '2026.08.14.11';

  function loadOnce(attribute, src) {
    if (document.querySelector(`script[${attribute}]`)) return;
    const script = document.createElement('script');
    script.src = `${src}?v=${encodeURIComponent(BUILD)}`;
    script.async = false;
    script.setAttribute(attribute, '1');
    script.addEventListener('error', () => showLoadError('A scenario support file could not be loaded. Check your connection and try again.'));
    document.head.appendChild(script);
  }

  function showLoadError(message) {
    if (document.getElementById('scenarioLoadRecovery')) return;
    const panel = document.createElement('section');
    panel.id = 'scenarioLoadRecovery';
    panel.className = 'scenario-load-recovery';
    panel.setAttribute('role', 'alert');
    panel.innerHTML = `
      <div><strong>Scenario could not finish loading</strong><p>${message}</p></div>
      <div><button type="button" data-retry-scenario>Retry</button><a href="/vitals/scenario-launcher.html">Choose another scenario</a></div>`;
    panel.querySelector('[data-retry-scenario]')?.addEventListener('click', () => location.reload());
    document.body.prepend(panel);
  }

  function installDesktopLayoutGuard() {
    if (document.querySelector('style[data-horse-desktop-layout-guard]')) return;
    const style = document.createElement('style');
    style.dataset.horseDesktopLayoutGuard = '1';
    style.textContent = `
      @media (min-width: 961px) {
        body.horse-current-emt-call.desktop-scenario-layout .patient-control-column {
          display: flex !important;
          flex-direction: column !important;
          gap: 7px !important;
          min-height: 0 !important;
          height: 100% !important;
          overflow: hidden !important;
        }
        body.horse-current-emt-call.desktop-scenario-layout #infoUpdateWindow,
        body.horse-current-emt-call.desktop-scenario-layout #reasoningDiscoveryCue,
        body.horse-current-emt-call.desktop-scenario-layout .bottom-nav {
          flex: 0 0 auto !important;
        }
        body.horse-current-emt-call.desktop-scenario-layout #reasoningDiscoveryCue {
          position: static !important;
          inset: auto !important;
          width: 100% !important;
          margin: 0 !important;
          z-index: auto !important;
        }
        body.horse-current-emt-call.desktop-scenario-layout #actionSheet.action-sheet {
          flex: 1 1 0 !important;
          width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow: hidden !important;
        }
        body.horse-current-emt-call.desktop-scenario-layout #actionSheet.action-sheet:not([hidden]) {
          display: grid !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function clearScenarioControlOverlay() {
    const dialog = document.getElementById('scenarioControlDialog');
    const backdrop = document.getElementById('scenarioControlBackdrop');
    if (dialog) dialog.hidden = true;
    if (backdrop) backdrop.hidden = true;
  }

  function installScenarioTransitionGuard() {
    document.addEventListener('click', event => {
      const params = new URLSearchParams(location.search);
      if (params.get('case') !== CASE_ID) return;
      if (!event.target.closest?.('#handoffFromProgress, #transportScenarioQuick')) return;
      window.setTimeout(clearScenarioControlOverlay, 0);
      window.requestAnimationFrame(clearScenarioControlOverlay);
    });
  }

  installDesktopLayoutGuard();
  installScenarioTransitionGuard();

  loadOnce('data-scenario-learning-upgrade', '/vitals/scenario-learning-upgrade.js');
  loadOnce('data-condition-alert-priority', '/vitals/scenario-condition-alert-priority.js');
  loadOnce('data-horse-crush-ui-fix', '/vitals/horse-crush-ui-fix.js');
  loadOnce('data-horse-photo-layer-fix', '/vitals/horse-photo-layer-fix.js');

  const defs = window.EMSCodeSimScenarioDefinitions;
  const requiredGroups = ['CATALOG','PROFILES','PHASE_PLANS','PATIENT_CASES','CONDITION_STAGES','TREATMENT_PLANS'];
  const missing = [];
  if (!defs) missing.push('EMSCodeSimScenarioDefinitions');
  else requiredGroups.forEach(group => { if (!defs[group]?.[CASE_ID]) missing.push(`${group}.${CASE_ID}`); });
  const validationErrors = defs?.validate?.()?.filter(error => String(error).startsWith(`${CASE_ID}:`)) || [];
  const ok = missing.length === 0 && validationErrors.length === 0;
  window.EMSCodeSimScenarioBootstrapStatus = Object.freeze({caseId:CASE_ID,build:BUILD,ok,missing:Object.freeze([...missing]),validationErrors:Object.freeze([...validationErrors])});
  if (!ok) {
    console.error('[EMSCodeSim] Horse-crush scenario definition contract failed.', {missing,validationErrors,build:BUILD});
    showLoadError('Required scenario information is unavailable. Your saved progress has not been erased.');
  }
})();
