(() => {
  'use strict';

  const CASE_ID = 'horse_crush';
  const BUILD = '2026.08.11.1';

  function loadOnce(attribute, src) {
    if (document.querySelector(`script[${attribute}]`)) return;
    const script = document.createElement('script');
    script.src = `${src}?v=${encodeURIComponent(BUILD)}`;
    script.async = false;
    script.setAttribute(attribute, '1');
    document.head.appendChild(script);
  }

  // These helpers are shared by the finished learning cases. They are defensive
  // and wait for DOMContentLoaded, so they can be requested before the main
  // visual-patient runtime without creating a parser-order dependency.
  loadOnce('data-scenario-learning-upgrade', '/vitals/scenario-learning-upgrade.js');
  loadOnce('data-condition-alert-priority', '/vitals/scenario-condition-alert-priority.js');
  loadOnce('data-horse-crush-ui-fix', '/vitals/horse-crush-ui-fix.js');

  const defs = window.EMSCodeSimScenarioDefinitions;
  const requiredGroups = [
    'CATALOG',
    'PROFILES',
    'PHASE_PLANS',
    'PATIENT_CASES',
    'CONDITION_STAGES',
    'TREATMENT_PLANS'
  ];

  const missing = [];
  if (!defs) {
    missing.push('EMSCodeSimScenarioDefinitions');
  } else {
    requiredGroups.forEach(group => {
      if (!defs[group]?.[CASE_ID]) missing.push(`${group}.${CASE_ID}`);
    });
  }

  const validationErrors = defs?.validate?.()
    ?.filter(error => String(error).startsWith(`${CASE_ID}:`)) || [];

  const ok = missing.length === 0 && validationErrors.length === 0;
  window.EMSCodeSimScenarioBootstrapStatus = Object.freeze({
    caseId: CASE_ID,
    build: BUILD,
    ok,
    missing: Object.freeze([...missing]),
    validationErrors: Object.freeze([...validationErrors])
  });

  if (!ok) {
    // Do not try to patch scenario definitions here. CATALOG is intentionally
    // frozen by scenario-definitions.js, and mutating a stale/frozen definition
    // can throw in strict mode and prevent the entire patient workspace from
    // initializing. A bad deployment should fail loudly and be caught by CI.
    console.error(
      '[EMSCodeSim] Horse-crush scenario definition contract failed.',
      { missing, validationErrors, build: BUILD }
    );
  }
})();
