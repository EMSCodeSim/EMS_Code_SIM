(() => {
  'use strict';

  const PENDING_KEY = 'emscodesim_pending_assessment_findings';

  function pending() {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); }
    catch { return []; }
  }

  function savePending(entry) {
    const items = pending();
    items.push(entry);
    localStorage.setItem(PENDING_KEY, JSON.stringify(items.slice(-30)));
  }

  function showNotice(message, linked) {
    let notice = document.getElementById('patientRecordSaveNotice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'patientRecordSaveNotice';
      notice.setAttribute('role', 'status');
      Object.assign(notice.style, {
        position: 'fixed', right: '16px', bottom: '16px', zIndex: '9999',
        maxWidth: '360px', padding: '12px 14px', borderRadius: '12px',
        color: '#fff', fontWeight: '700', boxShadow: '0 8px 30px rgba(0,0,0,.25)',
        background: linked ? '#087f5b' : '#8a5a00'
      });
      document.body.appendChild(notice);
    }
    notice.style.background = linked ? '#087f5b' : '#8a5a00';
    notice.textContent = message;
    notice.hidden = false;
    clearTimeout(notice._timer);
    notice._timer = setTimeout(() => { notice.hidden = true; }, 5200);
  }

  function normalizeNormality(value) {
    return value === 'normal' ? 'normal' : 'not-normal';
  }

  function saveAssessment(input) {
    const entry = {
      assessment: input.assessment,
      label: input.label || input.assessment,
      finding: input.finding || '',
      details: input.details || '',
      learnerClassification: normalizeNormality(input.normality),
      expectedClassification: normalizeNormality(input.expectedNormality),
      interpretation: input.interpretation || '',
      action: input.action || '',
      documentation: input.documentation || '',
      score: Number(input.score || 0),
      maxScore: Number(input.maxScore || 4),
      scenarioTitle: input.scenarioTitle || '',
      recordedAt: new Date().toISOString(),
      source: location.pathname
    };

    const api = window.EMSCodeSimPatientRecord;
    const record = api?.active?.();
    if (record) {
      api.setFinding(entry.assessment, entry.finding, entry);
      showNotice(`Saved ${entry.label} to the active patient record.`, true);
      return { linked: true, entry };
    }

    savePending(entry);
    showNotice('Practice saved locally. Start a Full Scenario to link findings to a patient record.', false);
    return { linked: false, entry };
  }

  function importPendingToActive() {
    const api = window.EMSCodeSimPatientRecord;
    const record = api?.active?.();
    if (!record) return 0;
    const items = pending();
    if (!items.length) return 0;
    items.forEach(entry => api.setFinding(entry.assessment, entry.finding, entry));
    localStorage.removeItem(PENDING_KEY);
    return items.length;
  }

  window.EMSCodeSimAssessmentIntegration = { saveAssessment, importPendingToActive, pending };
})();
