(() => {
  'use strict';

  const CASE_ID = 'horse_crush';
  const VERSION = '2026.08.14.5';
  const FOCUSED_EXAMS = new Set([
    'head_exam',
    'neck_back',
    'chest_assessment',
    'abdominal_assessment',
    'pelvis_hip',
    'upper_extremities',
    'left_leg',
    'distal_csm'
  ]);

  const SIM_ASSESSMENTS = {
    pupils: { label:'Eyes & pupils', url:'/vitals/pupil-scenario.html' },
    mental_status: { label:'Mental status / AVPU', url:'/vitals/avpu-scenario.html' },
    breath_sounds: { label:'Breath sounds', url:'/vitals/breath-sounds-scenario.html' }
  };

  const ABC = {
    airway: {
      label: 'Airway',
      observation: 'The patient answers in full sentences. No snoring, gurgling, stridor, blood, vomit, or visible obstruction is present.',
      prompt: 'Based on the new airway information, how would you classify the airway?',
      choices: [
        ['Patent', 'Airway patent', 'normal'],
        ['Threatened or obstructed', 'Airway threatened or obstructed', 'not-normal'],
        ['Not enough information at this time', 'Not enough information at this time', 'uncertain']
      ]
    },
    breathing: {
      label: 'Breathing',
      observation: 'Chest rise is symmetric with normal effort. The patient denies shortness of breath and can speak without pausing.',
      prompt: 'Based on the new breathing information, how would you classify breathing?',
      choices: [
        ['Breathing adequate', 'Breathing appears adequate', 'normal'],
        ['Breathing inadequate', 'Breathing is present but inadequate', 'not-normal'],
        ['Breathing absent', 'No effective breathing is present', 'not-normal'],
        ['Not enough information at this time', 'Not enough information at this time', 'uncertain']
      ]
    },
    perfusion: {
      label: 'Circulation / perfusion',
      observation: 'No major external bleeding is visible. Skin is warm and dry, and a regular radial pulse is readily palpable.',
      prompt: 'Based on the new circulation information, how would you classify perfusion?',
      choices: [
        ['Perfusion adequate; no major bleeding', 'Perfusion appears adequate; no major bleeding', 'normal'],
        ['Poor perfusion or major bleeding', 'Poor perfusion or major bleeding is present', 'not-normal'],
        ['Not enough information at this time', 'Not enough information at this time', 'uncertain']
      ]
    }
  };

  function activeCase() {
    const params = new URLSearchParams(location.search);
    return params.get('case') || window.EMSCodeSimPatientRecord?.active?.()?.scenarioId || '';
  }

  function isHorseScenario() { return activeCase() === CASE_ID; }
  function isDesktopHorse() { return isHorseScenario() && window.matchMedia?.('(min-width: 961px)')?.matches === true; }
  function record() {
    return window.EMSCodeSimScenarioSession?.active?.(CASE_ID)
      || window.EMSCodeSimPatientRecord?.active?.()
      || null;
  }
  function finding(key) { return record()?.findings?.[key] || window.EMSCodeSimPatientRecord?.getFinding?.(key) || null; }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function installStyles() {
    if (document.querySelector('style[data-horse-ui-fix]')) return;
    const style = document.createElement('style');
    style.dataset.horseUiFix = VERSION;
    style.textContent = `
      .horse-expanded-assessments{margin:10px 0 14px;padding:10px;border:1px solid #31566d;border-radius:12px;background:#0b2231;display:grid;gap:10px}
      .horse-expanded-assessments>header{display:flex;justify-content:space-between;align-items:flex-end;gap:10px}
      .horse-expanded-assessments>header small{display:block;color:#7fd0ff;font-size:.63rem;font-weight:900;letter-spacing:.09em}
      .horse-expanded-assessments>header strong{display:block;color:#fff;font-size:.95rem;margin-top:2px}
      .horse-assessment-group{display:grid;gap:6px}.horse-assessment-group>small{color:#91b9cc;font-size:.63rem;font-weight:900;letter-spacing:.08em}
      .horse-assessment-group-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
      .horse-assessment-deep-button{min-height:48px;padding:9px 10px;border:1px solid #3c6a80;border-radius:9px;background:#12384d;color:#fff;text-align:left;font:inherit;cursor:pointer}
      .horse-assessment-deep-button strong{display:block;font-size:.78rem}.horse-assessment-deep-button small{display:block;margin-top:2px;color:#a9c6d4;font-size:.64rem;line-height:1.25}
      .horse-assessment-deep-button:hover,.horse-assessment-deep-button:focus-visible{background:#194c66;border-color:#67b9df}
      .horse-assessment-deep-button.used{border-color:#4d9b73;background:#103a35}
      @media(max-width:760px){.horse-assessment-group-grid{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);
  }

  function markRecorded(button) {
    if (!button) return;
    button.classList.add('used');
    const marker = button.querySelector('[data-mark]');
    if (marker) marker.textContent = 'Recorded';
  }

  function openAssessmentSim(key, button) {
    const item = SIM_ASSESSMENTS[key];
    if (!item) return false;
    const opened = window.EMSCodeSimMiniSimOverlay?.openOverlay?.(item.url, item.label);
    if (opened) markRecorded(button);
    return Boolean(opened);
  }

  function deepButton(key, label, help, kind = 'exam') {
    return `<button type="button" class="horse-assessment-deep-button" data-horse-deep-kind="${kind}" data-horse-deep-key="${key}"><strong>${label}</strong><small>${help}</small></button>`;
  }

  function injectExpandedAssessments() {
    document.getElementById('horseExpandedAssessments')?.remove();
    return false;
  }

  function relocateReasoningBoard() {
    if (!isDesktopHorse()) return false;
    const board = document.getElementById('clinicalReasoningBoard');
    const recordPanel = document.getElementById('findingsPanel');
    if (!board || !recordPanel) return false;
    if (board.parentNode !== recordPanel) {
      board.classList.add('horse-reasoning-in-record');
      recordPanel.prepend(board);
    }
    return true;
  }

  function closeScenarioControlOverlay() {
    const dialog = document.getElementById('scenarioControlDialog');
    const backdrop = document.getElementById('scenarioControlBackdrop');
    if (dialog) dialog.hidden = true;
    if (backdrop) backdrop.hidden = true;
    return true;
  }

  function showPromotedTreatmentPanel(title = 'Transport') {
    if (!isDesktopHorse()) return false;
    const sheet = document.getElementById('actionSheet');
    const panel = document.getElementById('treatmentPanel');
    if (!sheet || !panel) return false;
    closeScenarioControlOverlay();
    document.querySelectorAll('.vp-panel').forEach(item => { item.hidden = item !== panel; });
    panel.hidden = false;
    sheet.hidden = false;
    const sheetTitle = document.getElementById('sheetTitle');
    if (sheetTitle) sheetTitle.textContent = title;
    document.querySelectorAll('.bottom-nav button').forEach(button => button.classList.toggle('active', button.dataset.panel === 'treatmentPanel'));
    document.body.classList.add('horse-tool-sheet-open');
    document.body.style.overflow = '';
    return true;
  }

  function promoteHiddenTransportForm() {
    if (!isDesktopHorse()) return false;
    const hiddenQuestion = document.getElementById('horseClinicalQuestionBox');
    const form = hiddenQuestion?.querySelector('form.horse-transport-selection-form');
    const tools = document.getElementById('treatmentTools');
    if (!form || !tools) return false;
    if (form.closest('#treatmentTools')) return showPromotedTreatmentPanel('Transport');
    const detail = form.closest('#horseTreatmentDetail') || form.parentElement;
    tools.className = 'treatment-list horse-treatment-category-workspace horse-promoted-transport-workspace';
    tools.innerHTML = `<div class="horse-treatment-workspace-head"><div><small>TRANSPORT</small><strong>Transport decision</strong><span>Choose working impression, urgency, destination, and notification from the findings you gathered.</span></div></div><div id="horsePromotedTransportHost" class="horse-treatment-workspace-detail"></div>`;
    const host = document.getElementById('horsePromotedTransportHost');
    if (!host) return false;
    if (detail && detail !== hiddenQuestion) host.appendChild(detail); else host.appendChild(form);
    hiddenQuestion?.classList.remove('active', 'treatment-active');
    showPromotedTreatmentPanel('Transport');
    return true;
  }

  function scheduleTransportPromotion() {
    window.setTimeout(() => { promoteHiddenTransportForm(); window.requestAnimationFrame(() => promoteHiddenTransportForm()); }, 0);
  }

  function showObservation(key) {
    const item = ABC[key];
    if (!item) return;
    window.EMSCodeSimPatientInfo?.showSceneObservation?.({
      id: `horse-abc-desktop-${key}-${Date.now()}`,
      type: 'NEW ASSESSMENT INFORMATION',
      title: `${item.label} assessment`,
      text: item.observation,
      kind: 'assessment', sticky: true, recordedAt: new Date().toISOString()
    });
  }

  function saveAbcFinding(key, value, normality) {
    const item = ABC[key];
    if (!item || !value) return null;
    const payload = { source:'horse-rapid-abc', label:item.label, finding:value, normality, status:normality === 'normal' ? 'normal' : normality === 'not-normal' ? 'abnormal' : 'uncertain', rapidAssessment:true, reviewAtDebrief:true, suppressInfoUpdate:true };
    if (window.EMSCodeSimScenarioSession?.saveFinding) return window.EMSCodeSimScenarioSession.saveFinding(key, value, payload, CASE_ID);
    window.EMSCodeSimPatientRecord?.setFinding?.(key, value, payload);
    return window.EMSCodeSimPatientRecord?.getFinding?.(key) || null;
  }

  function openDesktopAbcFollowup(button, key) {
    const item = ABC[key];
    const inline = document.getElementById('horseAssessmentInlineQuestion');
    if (!item || !inline) return false;
    const current = finding(key);
    showObservation(key);
    inline.hidden = false;
    inline.innerHTML = `<div class="horse-question-head"><div><small>FOLLOW-UP QUESTION</small><strong>${escapeHtml(item.label)}</strong></div></div><p>${escapeHtml(item.prompt)}</p><div class="horse-question-choice-grid" role="group" aria-label="${escapeHtml(item.label)} finding choices">${item.choices.map(([value, label, normality], index) => {
      const selected = current && (current.value === value || current.finding === value);
      return `<button type="button" class="horse-question-choice${selected ? ' selected' : ''}" data-abc-inline-choice="${index}" data-normality="${normality}" aria-pressed="${selected ? 'true' : 'false'}"><span>${selected ? '✓' : '○'}</span><strong>${escapeHtml(label)}</strong></button>`;
    }).join('')}</div><p class="horse-question-choice-help${current ? ' recorded' : ''}"${current ? ' role="status"' : ''}>${current ? `Recorded: ${escapeHtml(current.value || current.finding || '')}` : 'Select one finding to record it.'}</p>`;
    const choices = [...inline.querySelectorAll('[data-abc-inline-choice]')];
    choices.forEach(choiceButton => choiceButton.addEventListener('click', () => {
      const choice = item.choices[Number(choiceButton.dataset.abcInlineChoice)];
      if (!choice) return;
      const [value,label,normality] = choice;
      const saved = saveAbcFinding(key, value, normality);
      if (!saved) return;
      choices.forEach(node => {
        const selected = node === choiceButton;
        node.classList.toggle('selected', selected);
        node.setAttribute('aria-pressed', selected ? 'true' : 'false');
        const marker = node.querySelector('span');
        if (marker) marker.textContent = selected ? '✓' : '○';
      });
      const help = inline.querySelector('.horse-question-choice-help');
      if (help) {
        help.textContent = `Recorded: ${label}`;
        help.classList.add('recorded');
        help.setAttribute('role', 'status');
      }
      markRecorded(button);
      // Saving dispatches an assessment update that rebuilds this workspace.
      // Restore the same follow-up so the selected answer remains visible.
      window.setTimeout(() => {
        const freshButton = document.querySelector(`#assessmentTools [data-assessment-item="${CSS.escape(key)}"]`);
        const freshInline = document.getElementById('horseAssessmentInlineQuestion');
        if (freshButton && (!freshInline || !freshInline.querySelector('[data-abc-inline-choice]'))) {
          openDesktopAbcFollowup(freshButton, key);
        }
      }, 180);
    }));
    window.requestAnimationFrame(() => choices[0]?.focus());
    return true;
  }

  document.addEventListener('click', event => {
    if (!isHorseScenario()) return;
    const deep = event.target.closest?.('[data-horse-deep-key]');
    if (deep) {
      event.preventDefault();
      event.stopPropagation();
      const key = String(deep.dataset.horseDeepKey || '');
      if (deep.dataset.horseDeepKind === 'sim') { openAssessmentSim(key, deep); return; }
      if (FOCUSED_EXAMS.has(key)) {
        const result = window.EMSCodeSimHorseCrush?.performExam?.(key);
        if (result) markRecorded(deep);
      }
      return;
    }

    const button = event.target.closest?.('#assessmentTools [data-assessment-item]');
    if (!button) return;
    const key = String(button.dataset.assessmentItem || '');
    if (ABC[key]) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation?.(); openDesktopAbcFollowup(button, key); return;
    }
    if (!FOCUSED_EXAMS.has(key)) return;
    const horse = window.EMSCodeSimHorseCrush;
    if (!horse?.performExam) return;
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation?.();
    const result = horse.performExam(key); if (result) markRecorded(button);
  }, true);

  document.addEventListener('click', event => {
    if (!isDesktopHorse()) return;
    if (!event.target.closest?.('#handoffFromProgress, #transportScenarioQuick')) return;
    scheduleTransportPromotion();
  });

  function refresh() {
    installStyles();
    injectExpandedAssessments();
    relocateReasoningBoard();
    promoteHiddenTransportForm();
  }

  let refreshQueued = false;
  function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(() => {
      refreshQueued = false;
      refresh();
    });
  }

  function start() {
    refresh();
    const observer = new MutationObserver(scheduleRefresh);
    observer.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden'] });
    window.addEventListener('pagehide', () => observer.disconnect(), { once:true });
  }

  window.EMSCodeSimHorseCrushUiFix = Object.freeze({
    version: VERSION,
    abcKeys: Object.freeze(Object.keys(ABC)),
    focusedExams: Object.freeze([...FOCUSED_EXAMS]),
    simAssessments: Object.freeze(Object.keys(SIM_ASSESSMENTS)),
    injectExpandedAssessments,
    relocateReasoningBoard,
    promoteHiddenTransportForm,
    closeScenarioControlOverlay
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
