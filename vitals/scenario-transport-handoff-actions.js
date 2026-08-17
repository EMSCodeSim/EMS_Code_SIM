(() => {
  'use strict';

  const VERSION = '2026.08.17.10';
  const desktop = window.matchMedia('(min-width:980px)');
  const $ = id => document.getElementById(id);
  let queued = false;
  let observer = null;
  let lastSignature = '';
  let stylesInstalled = false;

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

  function installStyles() {
    if (stylesInstalled || document.querySelector('style[data-transport-handoff-actions]')) return;
    stylesInstalled = true;
    const style = document.createElement('style');
    style.dataset.transportHandoffActions = VERSION;
    style.textContent = `
      #horseTransportHandoffActions{margin-top:8px;padding-top:8px;border-top:1px solid rgba(91,145,171,.35);display:grid;gap:6px}
      #horseTransportHandoffActions .horse-endpoint-actions-head{display:flex;justify-content:space-between;gap:8px;align-items:center}
      #horseTransportHandoffActions .horse-endpoint-actions-head small{display:block;color:#8fcbe2;font-size:.58rem;font-weight:900;letter-spacing:.09em}
      #horseTransportHandoffActions .horse-endpoint-actions-head strong{display:block;color:#fff;font-size:.78rem;line-height:1.2}
      #horseTransportHandoffActions .horse-endpoint-actions-head span{color:#a8c2cf;font-size:.62rem;font-weight:800;white-space:nowrap}
      #horseTransportHandoffActions .horse-endpoint-action-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
      #horseTransportHandoffActions .horse-endpoint-action{min-height:42px;display:grid;grid-template-columns:20px 1fr;gap:6px;align-items:center;padding:7px 8px;border:1px solid #3c6a80;border-radius:9px;background:#12384d;color:#fff;text-align:left;font:inherit;cursor:pointer;touch-action:manipulation}
      #horseTransportHandoffActions .horse-endpoint-action strong{display:block;font-size:.7rem}
      #horseTransportHandoffActions .horse-endpoint-action small{display:none}
      #horseTransportHandoffActions .horse-endpoint-action:hover,#horseTransportHandoffActions .horse-endpoint-action:focus-visible{background:#194c66;border-color:#67b9df;outline:2px solid rgba(104,201,245,.25)}
      #horseTransportHandoffActions .horse-endpoint-action.complete{border-color:#4d9b73;background:#103a35}
      #horseTransportHandoffActions .horse-endpoint-detail{display:grid;gap:8px;padding:10px;border:1px solid #31566d;border-radius:12px;background:#0b2231}
      #horseTransportHandoffActions .horse-endpoint-detail[hidden]{display:none!important}
      #horseTransportHandoffActions .horse-endpoint-detail-head{display:flex;align-items:center;gap:8px}
      #horseTransportHandoffActions .horse-endpoint-detail-head button{min-height:34px;padding:0 10px;border:1px solid #3c6a80;border-radius:8px;background:#12384d;color:#fff;cursor:pointer}
      #horseTransportHandoffActions .horse-endpoint-transport-form{display:grid;gap:8px}
      #horseTransportHandoffActions .horse-endpoint-transport-form label{display:grid;gap:4px;color:#cfe3ee;font-size:.72rem;font-weight:800}
      #horseTransportHandoffActions .horse-endpoint-transport-form select,#horseTransportHandoffActions .horse-endpoint-transport-form textarea{width:100%;min-height:38px;padding:8px 9px;border:1px solid #3c6a80;border-radius:8px;background:#0b1f2e;color:#fff;font:inherit}
      #horseTransportHandoffActions .horse-endpoint-submit{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
      #horseTransportHandoffActions .horse-endpoint-submit button{min-height:42px;padding:0 14px;border:0;border-radius:9px;background:#d9f3ff;color:#062238;font-weight:900;cursor:pointer}
      #horseTransportHandoffActions .horse-endpoint-submit p{margin:0;color:#7ae0b4;font-size:.72rem;font-weight:800}
      @media(min-width:980px){
        #treatmentTools.horse-treatment-group-menu > #horseTransportHandoffActions{grid-column:1/-1!important;order:40}
        #treatmentTools.horse-treatment-group-menu > #horseMoreTreatmentsToggle{grid-column:1/-1!important;order:30;max-height:44px}
        #treatmentTools.horse-treatment-group-menu > .horse-treatment-menu-head{order:0}
        #treatmentTools.horse-treatment-group-menu > .horse-treatment-group-choice{order:10}
      }
      @media(max-width:760px){#horseTransportHandoffActions .horse-endpoint-action-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureHost() {
    if (!active()) return null;
    const tools = $('treatmentTools');
    if (!tools) return null;

    let host = $('horseTransportHandoffActions');
    const menuActive = tools.classList.contains('horse-treatment-group-menu');
    if (!menuActive) {
      host?.remove();
      lastSignature = '';
      return null;
    }
    if (!host) {
      host = document.createElement('section');
      host.id = 'horseTransportHandoffActions';
      host.className = 'horse-transport-handoff-actions horse-natural-encounter-end';
      host.setAttribute('aria-label', 'Transport and hospital handoff');
    }
    if (host.parentElement !== tools) tools.appendChild(host);
    // Keep transport/handoff pinned under categories + More treatments.
    else if (tools.lastElementChild !== host) tools.appendChild(host);
    return host;
  }

  function focusEndpoint(host) {
    const tools = $('treatmentTools');
    if (!tools || !host) return;
    [...tools.children].forEach(child => {
      if (child !== host) {
        child.dataset.endpointHidden = child.hidden ? '1' : '0';
        child.hidden = true;
      }
    });
    tools.style.setProperty('display', 'block', 'important');
    const panel = $('treatmentPanel');
    if (panel) panel.scrollTop = 0;
    host.scrollIntoView({ block:'start' });
  }

  function restoreEndpointMenu(host) {
    const tools = $('treatmentTools');
    if (!tools) return;
    [...tools.children].forEach(child => {
      if (child === host) return;
      child.hidden = child.dataset.endpointHidden === '1';
      delete child.dataset.endpointHidden;
    });
    tools.style.removeProperty('display');
    tools.scrollIntoView({ block:'start' });
  }

  function showEndpointDetail(host, detail) {
    if (!host || !detail) return;
    [...host.children].forEach(child => {
      if (child !== detail) child.hidden = true;
    });
    detail.hidden = false;
    detail.scrollIntoView({ block:'start' });
  }

  function transportSaved(current = record()) {
    return Boolean(current?.documentation?.transportDecisionAt);
  }

  function handoffSaved(current = record()) {
    return Boolean(current?.documentation?.handoffSavedAt && current?.documentation?.handoff);
  }

  function stateSignature(current = record()) {
    const tools = $('treatmentTools');
    return [
      active() ? '1' : '0',
      tools?.classList.contains('horse-treatment-group-menu') ? '1' : '0',
      transportSaved(current) ? '1' : '0',
      handoffSaved(current) ? '1' : '0'
    ].join(':');
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
          <span aria-hidden="true">${transported ? '✓' : '🚑'}</span><strong>${transported ? 'Review transport' : 'Transport patient'}</strong>
        </button>
        <button type="button" id="horseOpenHandoff" class="horse-endpoint-action${handedOff ? ' complete' : ''}">
          <span aria-hidden="true">${handedOff ? '✓' : 'H'}</span><strong>${handedOff ? 'Review handoff' : 'Hospital handoff'}</strong>
        </button>
      </div>
      <div id="horseEndpointDetail" class="horse-endpoint-detail" hidden></div>`;
  }

  function render() {
    installStyles();
    const host = ensureHost();
    if (!host) return;
    if (host.dataset.mode === 'detail') return;
    const signature = stateSignature();
    // Avoid rewriting live buttons. Comparing innerHTML strings is unstable and
    // was detaching #horseOpenTransport / #horseOpenHandoff on every mutation.
    if (signature === lastSignature && host.querySelector('#horseOpenTransport') && host.querySelector('#horseOpenHandoff')) {
      return;
    }
    lastSignature = signature;
    host.innerHTML = summaryMarkup();
  }

  function openTransportViaQuickAction() {
    const actions = window.EMSCodeSimHorseEncounterActions;
    if (typeof actions?.openTransport === 'function') {
      actions.openTransport();
      // openHorseTransportQuick paints into #horseClinicalQuestionBox; promote it
      // into the treatment workspace so the form is actually usable.
      const promote = () => window.EMSCodeSimHorseCrushUiFix?.promoteHiddenTransportForm?.();
      window.setTimeout(promote, 0);
      window.requestAnimationFrame(promote);
      return true;
    }
    const quick = $('transportScenarioQuick');
    if (!quick) return false;
    quick.click();
    return true;
  }

  function openHandoffViaQuickAction() {
    const actions = window.EMSCodeSimHorseEncounterActions;
    if (typeof actions?.openHandoff === 'function') {
      actions.openHandoff(false);
      return true;
    }
    const quick = $('handoffScenarioQuick');
    if (!quick) return false;
    quick.click();
    return true;
  }

  function openTransport() {
    // Prefer the shared transport quick-action path, which already promotes the
    // transport form into the right clinical workspace.
    if (openTransportViaQuickAction()) return;

    const host = ensureHost();
    const detail = $('horseEndpointDetail');
    const current = record() || {};
    if (!host || !detail) return;
    host.dataset.mode = 'detail';
    focusEndpoint(host);
    showEndpointDetail(host, detail);
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
    try {
      api?.setImpressions?.({ primary: impression, action: priority, source:'scenario-treatment-transport', updatedAt: now });
      api?.setDocumentation?.({
        transportPriority: priority,
        destination,
        transportNotification: notification,
        transportRationale: rationale,
        transportDecisionAt: now
      });
      api?.setFinding?.('transport_decision', `${priority} to ${destination}`, {
        label:'Transport decision',
        source:'scenario-treatment-transport',
        details: rationale || `Working impression: ${impression}`
      });
      api?.mergeCareLog?.([{
        id:`transport-${Date.now()}`,
        eventId:`transport-${Date.now()}`,
        type:'transport', category:'transport', key:'transport_decision', label:'Transport initiated',
        value:`${priority} to ${destination}`,
        details:`Working impression: ${impression}${notification ? ` • ${notification}` : ''}${rationale ? ` • ${rationale}` : ''}`,
        source:'scenario-treatment-transport', recordedAt:now
      }]);
    } catch (error) {
      console.error(error);
      if (status) status.textContent = 'Unable to save transport. Try again.';
      return;
    }
    lastSignature = '';
    window.dispatchEvent(new CustomEvent('emscodesim:transport-saved', { detail:{ impression, priority, destination, notification } }));
    if (status) status.textContent = 'Transport decision recorded.';
    window.setTimeout(closeDetail, 500);
  }

  function openHandoff() {
    // Open the patient-picture hospital handoff workspace — the intended UX.
    if (openHandoffViaQuickAction()) return;

    const host = ensureHost();
    const detail = $('horseEndpointDetail');
    const card = document.querySelector('.handoff-treatment-card');
    if (!host || !detail || !card) return;
    host.dataset.mode = 'detail';
    focusEndpoint(host);
    showEndpointDetail(host, detail);
    const transported = transportSaved();
    detail.innerHTML = `
      <div class="horse-endpoint-detail-head"><button type="button" id="horseEndpointBack">‹ Back</button><div><small>HANDOFF</small><strong>Hospital handoff</strong></div></div>
      <p>${transported ? 'Transport is documented. Build your handoff from the findings, vitals, history, treatments, and reassessments you actually obtained.' : 'Transport has not been documented yet. You can prepare the report, but transport details may be incomplete.'}</p>
      <div id="horseEndpointHandoffMount"></div>`;
    $('horseEndpointHandoffMount')?.appendChild(card);
    card.hidden = false;
    card.classList.add('horse-handoff-active');
    window.requestAnimationFrame(() => card.scrollIntoView({ block:'start' }));
    const generate = card.querySelector('#generateHandoff');
    if (generate && !card.querySelector('#handoffDraft')?.value?.trim()) generate.click();
    $('horseEndpointBack')?.addEventListener('click', closeDetail);
  }

  function closeDetail() {
    const host = $('horseTransportHandoffActions');
    if (!host) return;
    const card = host.querySelector('.handoff-treatment-card');
    const tools = $('treatmentTools');
    if (card && tools) {
      tools.insertAdjacentElement('afterend', card);
      card.hidden = true;
      card.classList.remove('horse-handoff-active');
    }
    restoreEndpointMenu(host);
    host.dataset.mode = '';
    lastSignature = '';
    host.innerHTML = summaryMarkup();
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      render();
    });
  }

  function startObserver() {
    observer?.disconnect();
    const tools = $('treatmentTools');
    if (!tools) return;
    observer = new MutationObserver(mutations => {
      if (!active()) return;
      const host = $('horseTransportHandoffActions');
      if (host?.dataset.mode === 'detail') return;
      const meaningful = mutations.some(mutation => {
        if (mutation.type !== 'childList' && mutation.type !== 'attributes') return false;
        const target = mutation.target?.nodeType === 1 ? mutation.target : mutation.target?.parentElement;
        if (!target) return false;
        if (target.closest?.('#horseTransportHandoffActions')) return false;
        return target === tools || target.id === 'treatmentTools' || target.classList?.contains('horse-treatment-group-menu');
      });
      if (meaningful) schedule();
    });
    observer.observe(tools, { childList:true, attributes:true, attributeFilter:['class'] });
  }

  function start() {
    installStyles();
    schedule();
    desktop.addEventListener?.('change', schedule);
    document.addEventListener('click', event => {
      const transport = event.target.closest?.('#horseOpenTransport');
      const handoff = event.target.closest?.('#horseOpenHandoff');
      if (transport || handoff) {
        event.preventDefault();
        event.stopPropagation();
        if (transport) openTransport();
        else openHandoff();
        return;
      }
      if (event.target.closest?.('button[data-panel="treatmentPanel"]')) {
        setTimeout(() => { startObserver(); schedule(); }, 0);
      }
    }, true);
    window.addEventListener('emscodesim:transport-saved', () => { lastSignature = ''; schedule(); });
    window.addEventListener('emscodesim:scenario-finding-saved', () => { lastSignature = ''; schedule(); });
    window.addEventListener('emscodesim:patient-record-updated', () => { lastSignature = ''; schedule(); });
    window.addEventListener('storage', () => { lastSignature = ''; schedule(); });
    startObserver();
    window.setTimeout(() => { startObserver(); schedule(); }, 250);
    window.setTimeout(() => { startObserver(); schedule(); }, 900);
    window.addEventListener('pagehide', () => observer?.disconnect(), { once:true });
  }

  window.EMSCodeSimTransportHandoff = Object.freeze({ version:VERSION, render:schedule, openTransport, openHandoff });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
