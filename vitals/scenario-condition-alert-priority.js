(() => {
  'use strict';

  let lastConditionId = '';

  function currentRecord() {
    return window.EMSCodeSimPatientRecord?.active?.() || null;
  }

  function latestConditionEvent(record) {
    const events = Array.isArray(record?.careLog) ? record.careLog : [];
    return [...events]
      .filter(event => event?.type === 'condition_change')
      .sort((a, b) => new Date(b.recordedAt || 0).getTime() - new Date(a.recordedAt || 0).getTime())[0] || null;
  }

  function surfaceLatestCondition() {
    const event = latestConditionEvent(currentRecord());
    if (!event) return;
    const eventId = String(event.id || event.eventId || `${event.key || 'condition'}:${event.recordedAt || ''}`);
    if (!eventId || eventId === lastConditionId) return;

    const patientInfo = window.EMSCodeSimPatientInfo;
    if (!patientInfo?.showSceneObservation) return;

    lastConditionId = eventId;
    patientInfo.showSceneObservation({
      id: `priority-${eventId}`,
      type: 'PATIENT CONDITION CHANGE',
      title: event.label || 'Patient condition changed',
      text: event.value || event.details || 'The patient condition has changed. Reassess now.',
      kind: 'alert',
      sticky: true,
      recordedAt: event.recordedAt || new Date().toISOString()
    });
  }

  function init() {
    surfaceLatestCondition();
    window.setInterval(surfaceLatestCondition, 350);
  }

  window.EMSCodeSimConditionAlertPriority = Object.freeze({ version: '1.0' });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
