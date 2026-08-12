(() => {
  'use strict';

  const desktop = window.matchMedia('(min-width:980px)');
  const $ = id => document.getElementById(id);
  let queued = false;
  let observer = null;

  function horseScenario() {
    const requested = new URLSearchParams(location.search).get('case');
    return requested === 'horse_crush'
      || document.body.classList.contains('horse-current-emt-call')
      || window.EMSCodeSimPatientRecord?.active?.()?.scenarioId === 'horse_crush';
  }

  function active() {
    return horseScenario() && desktop.matches && document.body.classList.contains('desktop-scenario-layout');
  }

  function record() {
    return window.EMSCodeSimScenarioSession?.sync?.()
      || window.EMSCodeSimPatientRecord?.active?.()
      || null;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[ch]));
  }

  function option(value, selected) {
    return `<option value="${escapeHtml(value)}"${selected === value ? ' selected' : ''}>${escapeHtml(value)}</option>`;
  }

  function ensureHost() {
    if (!active()) return null;
    const panel = $('treatmentPanel');
    const tools = $('treatmentTools');
    if (!panel || !tools) return null;

    let host = $('horseTransportHandoffActions');
    if (!host) {
      host = document.createElement('section');
      host.id = 'horseTransportHandoffActions';
      host.className = 'horse-transport-handoff-actions';
      host.setAttribute('aria-label', 'Transport and hospital handoff');
    }

    const handoffCard = panel.querySelector('.handoff-treatment-card');
    const toolsInPanel = tools.parentElement === panel;
    const handoffInPanel = handoffCard?.parentElement === panel;
    const correctlyPlaced = host.parentElement === panel
      && ((toolsInPanel && host.previousElementSibling === tools)
        || (!toolsInPanel && (!handoffInPanel || host.nextElementSibling === handoffCard)));

    if (!correctlyPlaced) {
      if (toolsInPanel) tools.insertAdjacentElement('afterend', host);
      else if (handoffInPanel) handoffCard.insertAdjacentElement('beforebegin', host);
      else panel.appendChild(host);
    }
    return host;
  }

  function transportSaved(current = record()) {
    return Boolean(current?.documentation?.transportDecisionAt);
  }

  function handoffSaved(current = record()) {
    return Boolean(current?.documentation?.handoffSavedAt);
  }

  function summaryMarkup(current = record()) {
    const transported = transportSaved(current);
    const handedOff = handoffSaved(current);
    return `
      <div class="horse-endpoint-actions-head">
        <div><small>END OF ENCOUNTER</small><strong>Transport & handoff</strong></div>
        <span>${handedOff ? 'Complete' : transported ? 'Transport set' : 'Not started'}</span>
      </div>
      <div class="horse-endpoint-action-grid">
        <button type="button" id="horseOpenTransport" class="horse-endpoint-action${transported ? ' complete' : ''}">
          <span aria-hidden="true">${transported ? '✓' : '🚑'}</span><strong>${transported ? 'Review transport' : 'Transport patient'}</strong><small>Impression, urgency, destination</small>
        </button>
        <button type="button" id="horseOpenHandoff" class="horse-endpoint-action${handedOff ? ' complete' : ''}">
          <span aria-hidden="true">${handedOff ? '✓' : 'H'}</span><strong>${handedOff ? 'Review handoff' : 'Hospital handoff'}</strong><small>Give report from your documented findings</small>
        </button>
      </div>
      <div id="horseEndpointDetail" class="horse-endpoint-detail" hidden></div>`;
  }

  function render() {
    const host = ensureHost();
    if (!host) return;
    if (host.dataset.mode === 'detail') return;
    const next = summaryMarkup();
    if (host.innerHTML !== next) host.innerHTML = next;
    bindSummary(host);
  }

  function bindSummary(host) {
    $('horseOpenTransport')?.addEventListener('click', openTransport);
    $('horseOpenHandoff')?.addEventListener('click', openHandoff);
  }

  function openTransport() {
    const host = ensureHost();
    const detail = $('horseEndpointDetail');
    const current = record() || {};
    if (!host || !detail) return;
    host.dataset.mode = 'detail';
    detail.hidden = false;
    const d = current.documentation || {};
    const impression = current.impressions?.primary || '';
    const priorities = ['Non-emergent transport','Prompt trauma transport','Emergent trauma transport'];
    const destinations = ['Closest appropriate emergency department','Trauma center'];
    const impressions = ['Significant blunt hip/pelvic-region injury','Isolated soft-tissue hip injury','Occult proximal femur or acetabular injury'];
    const notifications = ['No specialty activation','Trauma activation'];

    detail.innerHTML = `
      <div class="horse-endpoint-detail-head"><button type="button" id="horseEndpointBack">‹ Back</button><div><small>TRANSPORT</small><strong>Transport decision</strong></div></div>
      <form id="horseEndpointTransportForm" class="horse-endpoint-transport-form">
        <label>Working impression<select name="impression" required><option value="">Choose impression</option>${impressions.map(v => option(v, impression)).join('')}</select></label>
        <label>Transport urgency<select name="priority" required><option value="">Choose urgency</option>${priorities.map(v => option(v, d.transportPriority || '')).join('')}</select></label>
        <label>Destination<select name="destination" required><option value="">Choose destination</option>${destinations.map(v => option(v, d.destination || '')).join('')}</select></label>
        <label>Notification<select name="notification"><option value="">Choose notification</option>${notifications.map(v => option(v, d.transportNotification || '')).join('')}</select></label>
        <label class="wide">Reason for decision<textarea name="rationale" rows="2" placeholder="Optional clinical reasoning">${escapeHtml(d.transportRationale || '')}</textarea></label>
        <div class="wide horse-endpoint-submit"><button type="submit">${transportSaved(current) ? 'Update transport decision' : 'Initiate transport'}</button><p id="horseEndpointTransportStatus" aria-live="polite"></p></div>
      </form>`;

    $('horseEndpointBack')?.addEventListener('click', closeDetail);
    $('horseEndpointTransportForm')?.addEventListener('submit', saveTransport);
  }

  function saveTransport(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const impression = String(data.get('impression') || '').trim();
    const priority = String(data.get('priority') || '').trim();
    const destination = String(data.get('destination') || '').trim();
    const notification = String(data.get('notification') || '').trim();
    const rationale = String(data.get('rationale') || '').trim();
    const status = $('horseEndpointTransportStatus');
    if (!impression || !priority || !destination) {
      if (status) status.textContent = 'Choose an impression, urgency, and destination.';
      return;
    }

    const now = new Date().toISOString();
    const api = window.EMSCodeSimPatientRecord;
    api?.update?.(draft => {
      draft.documentation = draft.documentation || {};
      draft.documentation.transportDecisionAt = now;
      draft.documentation.transportPriority = priority;
      draft.documentation.destination = destination;
      draft.documentation.transportNotification = notification;
      draft.documentation.transportRationale = rationale;
      draft.impressions = draft.impressions || {};
      draft.impressions.primary = impression;
      return draft;
    });
    api?.mergeCareLog?.([{
      id:`transport-${Date.now()}`,
      eventId:`transport-${Date.now()}`,
      type:'transport', category:'transport', key:'transport_decision', label:'Transport initiated',
      value:`${priority} to ${destination}`,
      details:`Working impression: ${impression}${notification ? ` • ${notification}` : ''}${rationale ? ` • ${rationale}` : ''}`,
      source:'scenario-treatment-transport', recordedAt:now
    }]);
    window.dispatchEvent(new CustomEvent('emscodesim:transport-saved', { detail:{ impression, priority, destination, notification } }));
    if (status) status.textContent = 'Transport decision recorded.';
    window.setTimeout(closeDetail, 500);
  }

  function openHandoff() {
    const host = ensureHost();
    const detail = $('horseEndpointDetail');
    const card = document.querySelector('#treatmentPanel .handoff-treatment-card');
    if (!host || !detail) return;
    host.dataset.mode = 'detail';
    detail.hidden = false;
    const transported = transportSaved();
    detail.innerHTML = `
      <div class="horse-endpoint-detail-head"><button type="button" id="horseEndpointBack">‹ Back</button><div><small>HANDOFF</small><strong>Hospital handoff</strong></div></div>
      <div class="horse-endpoint-handoff-launch">
        <p>${transported ? 'Transport is documented. Build your handoff from the findings, vitals, history, treatments, and reassessments you actually obtained.' : 'Transport has not been documented yet. You can prepare the report, but transport details may be incomplete.'}</p>
        <button type="button" id="horseUseHandoffCard">Open handoff report</button>
      </div>`;
    $('horseEndpointBack')?.addEventListener('click', closeDetail);
    $('horseUseHandoffCard')?.addEventListener('click', () => {
      if (!card) return;
      card.hidden = false;
      card.classList.add('horse-handoff-active');
      card.scrollIntoView({ behavior:'smooth', block:'start' });
      const generate = card.querySelector('#generateHandoff');
      if (generate && !card.querySelector('#handoffDraft')?.value?.trim()) generate.click();
      card.querySelector('#handoffDraft')?.focus?.({ preventScroll:true });
    });
  }

  function closeDetail() {
    const host = $('horseTransportHandoffActions');
    if (!host) return;
    host.dataset.mode = '';
    host.innerHTML = summaryMarkup();
    bindSummary(host);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      render();
    });
  }

  function start() {
    schedule();
    desktop.addEventListener?.('change', schedule);
    document.addEventListener('click', event => {
      if (event.target.closest?.('button[data-panel="treatmentPanel"]')) setTimeout(schedule, 0);
    }, true);
    window.addEventListener('emscodesim:transport-saved', schedule);
    window.addEventListener('storage', schedule);
    observer = new MutationObserver(mutations => {
      if (!active()) return;
      const meaningful = mutations.some(m => {
        const target = m.target?.nodeType === 1 ? m.target : m.target?.parentElement;
        return !target?.closest?.('#horseTransportHandoffActions');
      });
      if (meaningful) schedule();
    });
    observer.observe(document.body, { childList:true, subtree:true });
    window.addEventListener('pagehide', () => observer?.disconnect(), { once:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();