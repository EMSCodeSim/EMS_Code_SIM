(() => {
  'use strict';

  const path = () => location.pathname.replace(/\/+$/, '') || '/';
  function record() { try { return window.EMSCodeSimPatientRecord?.active?.() || null; } catch { return null; } }
  function scenarioId() { const current = record(); return current?.scenarioId || current?.id || ''; }
  function scenarioHome() { const id = scenarioId(); return id ? `/vitals/visual-patient.html?case=${encodeURIComponent(id)}` : '/vitals/scenario-launcher.html'; }
  function scenarioUrl(url, context = '') {
    const id = scenarioId();
    const query = new URLSearchParams({ mode:'scenario', resume:'1' });
    if (id) query.set('case', id);
    query.set('return', scenarioHome());
    query.set('returnLabel', 'Patient');
    if (context) query.set('context', context);
    return `${url}?${query.toString()}`;
  }

  const FOLLOWUPS = {
    '/vitals/airway-assessment.html': [['Breathing','/vitals/breathing-assessment.html','breathing'],['Treatment','/vitals/treatment-reassessment.html','airway']],
    '/vitals/breathing-assessment.html': [['Respiratory rate','/vitals/respiratory-rate-scenario.html'],['Treatment','/vitals/treatment-reassessment.html','breathing']],
    '/vitals/perfusion-assessment.html': [['Pulse','/vitals/pulse-scenario.html'],['Treatment','/vitals/treatment-reassessment.html','perfusion']],
    '/vitals/respiratory-rate-scenario.html': [['Breath sounds','/vitals/breath-sounds-scenario.html'],['Treatment','/vitals/treatment-reassessment.html','breathing']],
    '/vitals/breath-sounds-scenario.html': [['SpO₂','/vitals/pulse-ox-scenario.html'],['Treatment','/vitals/treatment-reassessment.html','breathing']],
    '/vitals/bp-scenario.html': [['Pulse','/vitals/pulse-scenario.html'],['Treatment','/vitals/treatment-reassessment.html','perfusion']],
    '/vitals/pulse-scenario.html': [['Blood pressure','/vitals/bp-scenario.html'],['Treatment','/vitals/treatment-reassessment.html','perfusion']],
    '/vitals/pulse-ox-scenario.html': [['Breathing','/vitals/breathing-assessment.html','breathing'],['Treatment','/vitals/treatment-reassessment.html','breathing']],
    '/vitals/bgl-scenario.html': [['Mental status','/vitals/avpu-scenario.html'],['Treatment','/vitals/treatment-reassessment.html','general']],
    '/vitals/sample-history.html': [['Clinical impression','/vitals/clinical-impression.html'],['Treatment','/vitals/treatment-reassessment.html','general']],
    '/vitals/clinical-impression.html': [['Treatment','/vitals/treatment-reassessment.html','general'],['PCR and handoff','/vitals/pcr-handoff.html']],
    '/vitals/treatment-reassessment.html': [['PCR and handoff','/vitals/pcr-handoff.html'],['Scenario log','/vitals/visual-patient.html#log']],
    '/vitals/pcr-handoff.html': [['Scenario debrief','/vitals/scenario-debrief.html']]
  };

  function latestEvent() {
    const current = record();
    const log = window.EMSCodeSimPatientRecord?.listCareLog?.(current, 'all') || [];
    return log[log.length - 1] || null;
  }

  function ensure() {
    let host = document.getElementById('emsScenarioFlow');
    if (host) return host;
    host = document.createElement('aside');
    host.id = 'emsScenarioFlow';
    host.hidden = true;
    host.setAttribute('aria-live', 'polite');
    host.innerHTML = `<div class="esf-card"><div class="esf-top"><div><p class="esf-eyebrow">Finding saved</p><h2 id="esfTitle">Assessment recorded</h2><p id="esfText"></p></div><button class="esf-close" type="button" aria-label="Close confirmation">×</button></div><div class="esf-actions" id="esfActions"></div><div class="esf-continue" id="esfContinue" hidden><span>Continue with:</span><div id="esfContinueLinks"></div></div></div>`;
    document.body.appendChild(host);
    host.querySelector('.esf-close').addEventListener('click', () => { host.hidden = true; });
    return host;
  }

  function show(detail = null) {
    const current = record();
    if (!current) return;
    const host = ensure();
    const event = latestEvent();
    const label = detail?.label || event?.label || 'Assessment';
    const value = detail?.finding || detail?.value || event?.value || 'Finding recorded to the patient care log.';
    host.querySelector('#esfTitle').textContent = `${label} recorded`;
    host.querySelector('#esfText').textContent = value;
    const actions = host.querySelector('#esfActions');
    actions.innerHTML = `<a class="esf-primary" href="${scenarioHome()}">Return to Patient</a>`;

    const followups = FOLLOWUPS[path()] || [];
    const continueBox = host.querySelector('#esfContinue');
    const links = host.querySelector('#esfContinueLinks');
    links.innerHTML = '';
    followups.slice(0, 2).forEach(([labelText, url, context]) => {
      const link = document.createElement('a');
      link.textContent = labelText;
      link.href = url.includes('#') ? scenarioHome() : scenarioUrl(url, context || '');
      links.appendChild(link);
    });
    continueBox.hidden = !followups.length;
    host.hidden = false;
  }

  window.addEventListener('emscodesim:assessment-saved', event => show(event.detail));
  window.addEventListener('emscodesim:care-step-saved', event => show(event.detail));
  window.EMSCodeSimScenarioFlow = { show };
})();
