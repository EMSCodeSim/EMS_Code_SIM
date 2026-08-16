(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const requested = String(params.get('case') || '').replace(/-/g, '_').toLowerCase();
  const horse = () => requested === 'horse_crush' || window.EMSCodeSimPatientRecord?.active?.()?.scenarioId === 'horse_crush';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const historyCounts = new Map();
  let historyTimer = 0;
  let observer = null;
  let queued = false;

  const MOVEMENT_OPTIONS = [
    {
      id:'scoop_position_comfort',
      label:'Scoop stretcher — keep leg in position of comfort',
      short:'Scoop stretcher',
      classification:'appropriate-effective',
      response:'We will slide the scoop under you and keep your leg supported exactly where it is comfortable.',
      patient:'Okay. Please keep my leg right where it is. That feels a lot better than trying to straighten it.'
    },
    {
      id:'vacuum_mattress',
      label:'Scoop transfer to vacuum mattress with leg supported',
      short:'Vacuum mattress',
      classification:'appropriate-effective',
      response:'We will use a scoop to minimize movement, then support you in a vacuum mattress without forcing the hip or knee straight.',
      patient:'That sounds okay. Just tell me before you move me and keep supporting this leg.'
    },
    {
      id:'board_transfer',
      label:'Controlled multi-person lift with padding and leg supported',
      short:'Controlled lift',
      classification:'appropriate-effective',
      response:'The crew coordinates a controlled lift while one provider maintains support of the injured leg and padding preserves the tolerated position.',
      patient:'All right. Please go slowly. It hurts whenever that hip moves.'
    },
    {
      id:'stand_pivot',
      label:'Help patient stand and pivot to the stretcher',
      short:'Stand and pivot',
      classification:'contraindicated',
      response:'Standing places unnecessary load through a severely painful hip and is not appropriate for this patient.',
      patient:'No, I can’t stand on that leg. Please don’t make me get up.'
    },
    {
      id:'force_straight',
      label:'Straighten the leg before moving to the stretcher',
      short:'Straighten leg first',
      classification:'contraindicated',
      response:'Forcing the leg straight sharply increases pain and may worsen the injury. Preserve the tolerated position instead.',
      patient:'Stop! Please stop — that really hurts. Don’t straighten it.'
    }
  ];

  function record() {
    try { return window.EMSCodeSimScenarioSession?.sync?.() || window.EMSCodeSimPatientRecord?.active?.() || null; }
    catch (_) { return null; }
  }

  function speakPatient(text) {
    if (!text) return;
    try {
      if (window.EMSCodeSimPatientConversation?.speakPatient) {
        window.EMSCodeSimPatientConversation.speakPatient(text);
        return;
      }
      if (!window.SpeechSynthesisUtterance || !window.speechSynthesis) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = .96;
      utterance.pitch = 1.04;
      utterance.volume = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  }

  function naturalHistoryAnswer(_question, displayed) {
    return String(displayed || '').replace(/[“”]/g, '').trim() || 'I’m not sure.';
  }

  function historyQuestionText(button) {
    return String(button?.querySelector('span')?.textContent || button?.textContent || '')
      .replace(/Ask again|Ask$/i, '').trim();
  }

  function handleHistoryClick(event) {
    const button = event.target.closest?.('.history-question-button, .horse-history-drill-question, #horseHistoryCustomAsk, #askHistoryCustom');
    if (!button || !horse()) return;
    const customInput = button.id === 'horseHistoryCustomAsk'
      ? document.getElementById('horseHistoryCustomText')
      : button.id === 'askHistoryCustom'
        ? document.getElementById('historyCustomInput')
        : null;
    const question = String(customInput?.value || historyQuestionText(button)).trim();
    if (!question) return;
    const count = (historyCounts.get(question) || 0) + 1;
    historyCounts.set(question, count);
    // The existing natural-dialogue layer owns repeat-question variation.
    // This layer makes the FIRST answer sound like a real patient too.
    if (count !== 1) return;
    clearTimeout(historyTimer);
    historyTimer = window.setTimeout(() => {
      const response = document.getElementById('historyResponseText');
      if (!response) return;
      const spoken = naturalHistoryAnswer(question, response.textContent);
      if (!spoken) return;
      response.textContent = spoken;
      speakPatient(spoken);
    }, 90);
  }

  function enhanceSelect(select) {
    if (!select || select.dataset.choiceButtonsReady === '1') return;
    if (select.closest('.horse-transport-selection-form')) return;
    const form = select.closest('.horse-treatment-action-form');
    if (!form) return;
    const options = [...select.options].filter(option => option.value);
    if (!options.length) return;

    // Native constraint validation on opacity-0 selects blocks submit with no
    // visible feedback, which makes Perform treatment look broken.
    form.setAttribute('novalidate', '');
    select.dataset.choiceButtonsReady = '1';
    if (select.required) {
      select.dataset.wasRequired = '1';
      select.required = false;
    }
    select.classList.add('treatment-native-select-hidden');
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;
    const group = document.createElement('div');
    group.className = 'treatment-followup-choice-group';
    group.setAttribute('role', 'group');
    const label = select.closest('label');
    const labelText = label ? String(label.childNodes[0]?.textContent || '').trim() : '';
    if (labelText) group.setAttribute('aria-label', labelText);

    options.forEach(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'treatment-followup-choice';
      button.textContent = option.textContent;
      button.dataset.value = option.value;
      if (select.value === option.value) button.classList.add('selected');
      button.addEventListener('click', () => {
        select.value = option.value;
        select.dispatchEvent(new Event('input', { bubbles:true }));
        select.dispatchEvent(new Event('change', { bubbles:true }));
        group.querySelectorAll('.treatment-followup-choice').forEach(item => item.classList.toggle('selected', item === button));
        const error = form.querySelector('.treatment-entry-error');
        if (error) error.hidden = true;
      });
      group.appendChild(button);
    });
    select.insertAdjacentElement('afterend', group);
  }

  function enhanceTreatmentSelects() {
    $$('#treatmentPanel .horse-treatment-action-form:not(.horse-transport-selection-form) select').forEach(enhanceSelect);
  }

  function treatmentExists(id) {
    return (record()?.treatments || []).some(item => item?.actionId === id);
  }

  function saveMovement(option) {
    if (!option || !horse()) return;
    const now = new Date().toISOString();
    const entry = {
      id:`movement-${option.id}-${Date.now()}`,
      eventId:`movement-${option.id}-${Date.now()}`,
      actionId:option.id,
      treatment:option.label,
      name:option.label,
      description:option.label,
      category:'movement',
      classification:option.classification,
      response:option.response,
      recordedAt:now,
      time:now
    };
    const api = window.EMSCodeSimPatientRecord;
    api?.update?.(draft => {
      draft.treatments = Array.isArray(draft.treatments) ? draft.treatments : [];
      draft.treatments.push(entry);
      return draft;
    });
    api?.mergeCareLog?.([{
      id:entry.id,
      eventId:entry.eventId,
      type:'treatment',
      category:'movement',
      key:option.id,
      label:'Patient movement / packaging',
      value:option.label,
      details:option.response,
      source:'horse-movement-choice',
      recordedAt:now
    }]);
    window.dispatchEvent(new CustomEvent('emscodesim:treatment-saved', { detail:{ treatment:entry } }));
    window.dispatchEvent(new CustomEvent('emscodesim:scenario-updated', { detail:{ source:'horse-movement-choice' } }));
    speakPatient(option.patient);
    const info = window.EMSCodeSimPatientInfo;
    info?.showSceneObservation?.({
      id:`horse-movement-${Date.now()}`,
      type:'PATIENT MOVEMENT',
      title:option.short,
      text:option.response,
      kind:option.classification === 'contraindicated' ? 'alert' : 'treatment',
      sticky:true
    });
    renderMovementChoices();
  }

  function renderMovementChoices() {
    if (!horse()) return;
    const panel = document.getElementById('treatmentPanel');
    if (!panel) return;
    const tools = document.getElementById('treatmentTools');
    let section = document.getElementById('horseMovementChoices');
    if (!section) {
      section = document.createElement('section');
      section.id = 'horseMovementChoices';
      section.className = 'horse-movement-choices';
      if (tools?.parentElement === panel) tools.insertAdjacentElement('afterend', section);
      else panel.appendChild(section);
    }
    const selected = MOVEMENT_OPTIONS.find(option => treatmentExists(option.id));
    section.innerHTML = `
      <div class="horse-movement-head">
        <div><small>MOVEMENT / PACKAGING</small><strong>How will you move this patient?</strong></div>
        <span>${selected ? 'Movement documented' : 'Choose when ready'}</span>
      </div>
      <p>Protect the painful left hip, preserve the position she tolerates, and plan how the crew will transfer her to the stretcher.</p>
      <div class="horse-movement-option-grid">
        ${MOVEMENT_OPTIONS.map(option => `<button type="button" data-movement-id="${option.id}" class="${treatmentExists(option.id) ? 'selected' : ''}"><strong>${option.short}</strong><span>${option.label}</span></button>`).join('')}
      </div>`;
    section.querySelectorAll('[data-movement-id]').forEach(button => {
      button.addEventListener('click', () => saveMovement(MOVEMENT_OPTIONS.find(option => option.id === button.dataset.movementId)));
    });
  }

  function refresh() {
    queued = false;
    enhanceTreatmentSelects();
    // Movement is already a treatment category. Remove the legacy always-open
    // movement workspace so Treatment has one drill-down surface.
    document.getElementById('horseMovementChoices')?.remove();
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refresh);
  }

  function start() {
    document.addEventListener('click', handleHistoryClick, true);
    document.addEventListener('click', event => {
      if (event.target.closest?.('button[data-panel="treatmentPanel"], #treatmentPanel button')) setTimeout(schedule, 0);
    }, true);
    window.addEventListener('emscodesim:treatment-saved', schedule);
    observer = new MutationObserver(mutations => {
      const relevant = mutations.some(mutation => {
        const target = mutation.target?.nodeType === 1 ? mutation.target : mutation.target?.parentElement;
        return Boolean(target?.closest?.('#treatmentPanel,#historyPanel'));
      });
      if (relevant) schedule();
    });
    observer.observe(document.body, { childList:true, subtree:true });
    window.addEventListener('pagehide', () => observer?.disconnect(), { once:true });
    schedule();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
