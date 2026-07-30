(() => {
  'use strict';

  const PENDING_KEY = 'emscodesim_pending_patient_care_steps';

  function getPending() {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); }
    catch { return []; }
  }

  function savePending(entry) {
    const items = getPending();
    items.push(entry);
    localStorage.setItem(PENDING_KEY, JSON.stringify(items.slice(-30)));
  }

  function notice(message, linked) {
    let el = document.getElementById('patientCareSaveNotice');
    if (!el) {
      el = document.createElement('div');
      el.id = 'patientCareSaveNotice';
      el.setAttribute('role', 'status');
      Object.assign(el.style, {
        position: 'fixed', right: '16px', bottom: '16px', zIndex: '9999',
        maxWidth: '380px', padding: '12px 14px', borderRadius: '12px',
        color: '#fff', fontWeight: '700', boxShadow: '0 8px 30px rgba(0,0,0,.25)',
        background: linked ? '#087f5b' : '#8a5a00'
      });
      document.body.appendChild(el);
    }
    el.style.background = linked ? '#087f5b' : '#8a5a00';
    el.textContent = message;
    el.hidden = false;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.hidden = true; }, 5200);
  }

  function saveOrQueue(type, payload, writer) {
    const entry = { type, ...payload, recordedAt: new Date().toISOString(), source: location.pathname };
    const api = window.EMSCodeSimPatientRecord;
    if (api?.active?.()) {
      writer(api, entry);
      notice(`${payload.label || 'Patient-care step'} saved to the active patient record.`, true);
      window.dispatchEvent(new CustomEvent('emscodesim:care-step-saved', { detail: entry }));
      setTimeout(() => window.EMSCodeSimScenarioFlow?.show?.(), 0);
      return { linked: true, entry };
    }
    savePending(entry);
    notice('Practice saved locally. Start a Full Scenario to link it to a patient record.', false);
    return { linked: false, entry };
  }

  function saveClinicalImpression(payload) {
    return saveOrQueue('clinical-impression', payload, (api, entry) => {
      api.setImpressions({
        primary: entry.primary || '',
        differentials: entry.differentials || [],
        supporting: entry.supporting || [],
        action: entry.action || '',
        documentation: entry.documentation || '',
        score: entry.score || 0,
        maxScore: entry.maxScore || 6,
        updatedAt: entry.recordedAt
      });
    });
  }

  function saveTreatmentReassessment(payload) {
    return saveOrQueue('treatment-reassessment', payload, (api, entry) => {
      api.addTreatment({
        treatment: entry.treatment || '',
        expectedResponse: entry.expectedResponse || '',
        scenario: entry.scenario || '',
        score: entry.score || 0,
        maxScore: entry.maxScore || 5
      });
      api.addReassessment({
        response: entry.response || '',
        nextAction: entry.nextAction || '',
        findings: entry.repeatFindings || [],
        documentation: entry.documentation || ''
      });
    });
  }

  function saveDocumentation(payload) {
    return saveOrQueue('documentation-handoff', payload, (api, entry) => {
      api.setImpressions({ primary: entry.impression || api.active()?.impressions?.primary || '' });
      api.setDocumentation({
        narrative: entry.narrative || '',
        handoff: entry.handoff || '',
        documentationScore: entry.score || 0,
        documentationMaxScore: entry.maxScore || 5,
        updatedAt: entry.recordedAt
      });
    });
  }

  function importPendingToActive() {
    const api = window.EMSCodeSimPatientRecord;
    if (!api?.active?.()) return 0;
    const items = getPending();
    if (!items.length) return 0;
    items.forEach(entry => {
      if (entry.type === 'clinical-impression') saveClinicalImpression(entry);
      if (entry.type === 'treatment-reassessment') saveTreatmentReassessment(entry);
      if (entry.type === 'documentation-handoff') saveDocumentation(entry);
    });
    localStorage.removeItem(PENDING_KEY);
    return items.length;
  }

  window.EMSCodeSimPatientCareIntegration = {
    saveClinicalImpression,
    saveTreatmentReassessment,
    saveDocumentation,
    importPendingToActive,
    pending: getPending
  };
})();
