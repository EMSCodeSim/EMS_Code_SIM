(() => {
  'use strict';

  const VERSION = '2026.08.18.28';
  const desktop = window.matchMedia('(min-width:980px)');
  const $ = id => document.getElementById(id);
  function eventNode(event) {
    const target = event?.target;
    if (!target) return null;
    return target.nodeType === 1 ? target : target.parentElement;
  }
  let queued = false;
  let observer = null;
  let lastSignature = '';
  let stylesInstalled = false;
  let lastEndpointActivate = 0;
  let lastEndpointAction = '';

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
      #horseTransportHandoffActions{margin:0;padding:0;border:0;display:grid;gap:4px;position:relative;z-index:8;overflow:visible;pointer-events:auto}
      #horseTransportHandoffActions .horse-endpoint-actions-head{display:none}
      #horseTransportHandoffActions .horse-endpoint-action-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;position:relative;z-index:9;pointer-events:auto}
      #horseTransportHandoffActions .horse-endpoint-action{position:relative;z-index:9;min-height:32px;max-height:34px;display:grid;grid-template-columns:16px 1fr;gap:5px;align-items:center;padding:4px 8px;border:1px solid #3c6a80;border-radius:8px;background:#12384d;color:#fff;text-align:left;font:inherit;cursor:pointer;touch-action:manipulation;pointer-events:auto}
      #horseTransportHandoffActions .horse-endpoint-action::after{content:"";position:absolute;inset:0;z-index:2;pointer-events:auto}
      #horseTransportHandoffActions .horse-endpoint-action > *{position:relative;z-index:0;pointer-events:none}
      #horseTransportHandoffActions .horse-endpoint-action strong{display:block;font-size:.68rem;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #horseTransportHandoffActions .horse-endpoint-action small{display:none}
      #horseTransportHandoffActions .horse-endpoint-action:hover,#horseTransportHandoffActions .horse-endpoint-action:focus-visible{background:#194c66;border-color:#67b9df;outline:2px solid rgba(104,201,245,.25)}
      #horseTransportHandoffActions .horse-endpoint-action.complete{border-color:#4d9b73;background:#103a35}
      #horseTransportHandoffActions .horse-endpoint-detail{display:grid;gap:8px;padding:10px;border:1px solid #31566d;border-radius:12px;background:#0b2231}
      #horseTransportHandoffActions .horse-endpoint-detail[hidden]{display:none!important}
      #horseTransportHandoffActions .horse-endpoint-detail-head{display:flex;align-items:center;gap:8px}
      #horseTransportHandoffActions .horse-endpoint-detail-head button{min-height:34px;padding:0 10px;border:1px solid #3c6a80;border-radius:8px;background:#12384d;color:#fff;cursor:pointer}
      #horseTransportHandoffActions .horse-endpoint-transport-form{display:grid;gap:8px}
      #horseTransportHandoffActions .horse-endpoint-transport-form .horse-transport-prompt{margin:0;color:#cfe3ee;font-size:.72rem;font-weight:800}
      #horseTransportHandoffActions .horse-endpoint-transport-form .horse-transport-urgency-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      #horseTransportHandoffActions .horse-endpoint-transport-form .horse-transport-urgency{min-height:46px;border:1px solid #3c6a80;border-radius:10px;background:#12384d;color:#fff;font:inherit;font-weight:900;cursor:pointer}
      #horseTransportHandoffActions .horse-endpoint-transport-form .horse-transport-urgency.selected{border-color:#4d9b73;background:#17664f}
      #horseTransportHandoffActions .horse-endpoint-transport-form p{margin:0;color:#7ae0b4;font-size:.72rem;font-weight:800}
      @media(min-width:980px){
        #treatmentTools.horse-treatment-group-menu > .horse-treatment-menu-head{grid-column:1/-1;order:0}
        #treatmentTools.horse-treatment-group-menu > .horse-treatment-group-choice{order:10}
        #treatmentTools.horse-treatment-group-menu > #horseMoreTreatmentsToggle{
          grid-column:1/2!important;order:30;align-self:start;min-height:32px!important;max-height:34px!important;overflow:hidden
        }
        #treatmentTools.horse-treatment-group-menu > #horseTransportHandoffActions{
          grid-column:2/3!important;order:30;align-self:start;margin:0!important;padding:0!important;border:0!important;max-height:34px;overflow:visible;z-index:8
        }
        #treatmentTools.horse-treatment-group-menu > #horseTransportHandoffActions[data-mode="detail"]{
          grid-column:1/-1!important;order:20;max-height:none;overflow:auto
        }
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
      host.setAttribute('aria-label', 'Transport, hospital handoff, and grade');
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
      <div class="horse-endpoint-action-grid">
        <button type="button" id="horseOpenTransport" class="horse-endpoint-action${transported ? ' complete' : ''}" data-horse-endpoint="transport">
          <span aria-hidden="true">${transported ? '✓' : '🚑'}</span><strong>${transported ? 'Review transport' : 'Transport'}</strong>
        </button>
        <button type="button" id="horseOpenHandoff" class="horse-endpoint-action${handedOff ? ' complete' : ''}" data-horse-endpoint="handoff">
          <span aria-hidden="true">${handedOff ? '✓' : 'H'}</span><strong>${handedOff ? 'Review handoff' : 'Handoff'}</strong>
        </button>
        <button type="button" id="horseOpenGrade" class="horse-endpoint-action" data-horse-endpoint="grade">
          <span aria-hidden="true">✓</span><strong>Grade</strong>
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
    if (signature === lastSignature && host.querySelector('#horseOpenTransport') && host.querySelector('#horseOpenHandoff') && host.querySelector('#horseOpenGrade')) {
      return;
    }
    lastSignature = signature;
    host.innerHTML = summaryMarkup();
    bindEndpointButtons(host);
  }

  function bindEndpointButtons(host) {
    const transport = host?.querySelector('#horseOpenTransport');
    const handoff = host?.querySelector('#horseOpenHandoff');
    const grade = host?.querySelector('#horseOpenGrade');
    const onActivate = event => activateEndpointFromEvent(event);
    transport?.addEventListener('pointerup', onActivate);
    transport?.addEventListener('click', onActivate);
    handoff?.addEventListener('pointerup', onActivate);
    handoff?.addEventListener('click', onActivate);
    grade?.addEventListener('pointerup', onActivate);
    grade?.addEventListener('click', onActivate);
  }

  function activateEndpointFromEvent(event) {
    const node = eventNode(event);
    const transport = node?.closest?.('#horseOpenTransport, [data-horse-endpoint="transport"]');
    const handoff = node?.closest?.('#horseOpenHandoff, [data-horse-endpoint="handoff"]');
    const grade = node?.closest?.('#horseOpenGrade, [data-horse-endpoint="grade"]');
    if (!transport && !handoff && !grade) return false;
    if (event.type === 'pointerup' && event.button) return false;
    const action = transport ? 'transport' : handoff ? 'handoff' : 'grade';
    const now = Date.now();
    if (action === lastEndpointAction && now - lastEndpointActivate < 400) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    }
    lastEndpointActivate = now;
    lastEndpointAction = action;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (transport) openTransport();
    else if (handoff) openHandoff();
    else openGrade();
    return true;
  }

  function openTransportViaQuickAction() {
    const actions = window.EMSCodeSimHorseEncounterActions;
    if (typeof actions?.openTransport === 'function') {
      actions.openTransport();
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
    // Keep Transport inside the visible Treatment workspace. Do not hide the
    // action sheet or rely on promoting a form out of the hidden question box.
    if (openTransportViaQuickAction()) return;

    const host = ensureHost();
    const detail = $('horseEndpointDetail');
    const current = record() || {};
    if (!host || !detail) return;
    host.dataset.mode = 'detail';
    focusEndpoint(host);
    showEndpointDetail(host, detail);
    const d = current.documentation || {};
    const selected = /non[- ]?emergent/i.test(String(d.transportPriority || '')) ? 'Non-emergent'
      : /emergent|prompt/i.test(String(d.transportPriority || '')) ? 'Emergent' : '';

    detail.innerHTML = `
      <div class="horse-endpoint-detail-head"><button type="button" id="horseEndpointBack">‹ Back</button><div><small>TRANSPORT</small><strong>Transport decision</strong></div></div>
      <form id="horseEndpointTransportForm" class="horse-endpoint-transport-form">
        <p class="horse-transport-prompt">Choose transport urgency.</p>
        <div class="horse-transport-urgency-choices" role="group" aria-label="Transport urgency">
          <button type="submit" class="horse-transport-urgency${selected === 'Emergent' ? ' selected' : ''}" name="priority" value="Emergent">Emergent</button>
          <button type="submit" class="horse-transport-urgency${selected === 'Non-emergent' ? ' selected' : ''}" name="priority" value="Non-emergent">Non-emergent</button>
        </div>
        <p id="horseEndpointTransportStatus" aria-live="polite"></p>
      </form>`;

    $('horseEndpointBack')?.addEventListener('click', closeDetail);
    $('horseEndpointTransportForm')?.addEventListener('submit', saveTransport);
  }

  function saveTransport(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form, event.submitter);
    const priority = String(event.submitter?.value || data.get('priority') || '').trim();
    const status = $('horseEndpointTransportStatus');
    if (!priority) {
      if (status) status.textContent = 'Choose Emergent or Non-emergent.';
      return;
    }

    const now = new Date().toISOString();
    const api = window.EMSCodeSimPatientRecord;
    try {
      api?.setImpressions?.({ action: priority, source:'scenario-treatment-transport', updatedAt: now });
      api?.setDocumentation?.({
        transportPriority: priority,
        transportDecisionAt: now
      });
      api?.setFinding?.('transport_decision', priority, {
        label:'Transport decision',
        source:'scenario-treatment-transport',
        details: priority
      });
      api?.mergeCareLog?.([{
        id:`transport-${Date.now()}`,
        eventId:`transport-${Date.now()}`,
        type:'transport', category:'transport', key:'transport_decision', label:'Transport initiated',
        value:priority,
        details:priority,
        source:'scenario-treatment-transport', recordedAt:now
      }]);
    } catch (error) {
      console.error(error);
      if (status) status.textContent = 'Unable to save transport. Try again.';
      return;
    }
    lastSignature = '';
    window.dispatchEvent(new CustomEvent('emscodesim:transport-saved', { detail:{ priority } }));
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

  function openGrade() {
    const actions = window.EMSCodeSimHorseEncounterActions;
    if (typeof actions?.openGrade === 'function') {
      actions.openGrade();
      return;
    }
    $('gradeScenarioFromPatient')?.click();
    $('openHorseCallGrade')?.click();
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
    bindEndpointButtons(host);
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
    document.addEventListener('pointerup', event => {
      if (event.button) return;
      activateEndpointFromEvent(event);
    }, true);
    document.addEventListener('click', event => {
      if (activateEndpointFromEvent(event)) return;
      if (eventNode(event)?.closest?.('button[data-panel="treatmentPanel"]')) {
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

  window.EMSCodeSimTransportHandoff = Object.freeze({ version:VERSION, render:schedule, openTransport, openHandoff, openGrade });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
