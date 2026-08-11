(() => {
  'use strict';

  const CASE_ID = 'horse_crush';
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

  function isHorseScenario() {
    return activeCase() === CASE_ID;
  }

  function record() {
    return window.EMSCodeSimScenarioSession?.active?.(CASE_ID)
      || window.EMSCodeSimPatientRecord?.active?.()
      || null;
  }

  function finding(key) {
    return record()?.findings?.[key] || window.EMSCodeSimPatientRecord?.getFinding?.(key) || null;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  function markRecorded(button) {
    if (!button) return;
    button.classList.add('used');
    const marker = button.querySelector('span');
    if (marker) marker.textContent = '✓';
  }

  function showObservation(key) {
    const item = ABC[key];
    if (!item) return;
    window.EMSCodeSimPatientInfo?.showSceneObservation?.({
      id: `horse-abc-fix-${key}-${Date.now()}`,
      type: 'NEW ASSESSMENT INFORMATION',
      title: `${item.label} assessment`,
      text: item.observation,
      kind: 'assessment',
      sticky: true,
      recordedAt: new Date().toISOString()
    });
  }

  function resetQuestionBox() {
    const box = document.getElementById('horseClinicalQuestionBox');
    if (!box) return;
    box.classList.remove('active', 'history-active', 'treatment-active');
    box.innerHTML = `
      <div class="horse-question-placeholder">
        <small>FOLLOW-UP QUESTION</small>
        <strong>Select Airway, Breathing, or Circulation.</strong>
      </div>`;
  }

  function saveAbcFinding(key, value, normality) {
    const item = ABC[key];
    if (!item || !value) return false;
    const payload = {
      source: 'horse-rapid-abc',
      label: item.label,
      finding: value,
      normality,
      status: normality === 'normal' ? 'normal' : normality === 'not-normal' ? 'abnormal' : 'uncertain',
      rapidAssessment: true,
      reviewAtDebrief: true,
      suppressInfoUpdate: true
    };
    try {
      if (window.EMSCodeSimScenarioSession?.saveFinding) {
        window.EMSCodeSimScenarioSession.saveFinding(key, value, payload, CASE_ID);
      } else {
        window.EMSCodeSimPatientRecord?.setFinding?.(key, value, payload);
      }
      resetQuestionBox();
      renderCurrentAssessmentIfNeeded(true);
      return true;
    } catch (error) {
      console.error('[EMSCodeSim] Unable to save horse ABC finding.', error);
      return false;
    }
  }

  function openAbcFollowup(key) {
    const item = ABC[key];
    const box = document.getElementById('horseClinicalQuestionBox');
    if (!item || !box) return;
    const current = finding(key);
    box.classList.remove('history-active', 'treatment-active');
    box.classList.add('active');
    box.innerHTML = `
      <div class="horse-question-head">
        <div><small>FOLLOW-UP QUESTION</small><strong>${escapeHtml(item.label)}</strong></div>
      </div>
      <p>${escapeHtml(item.prompt)}</p>
      <div class="horse-question-answer-row">
        <label><span>Your finding</span><select aria-label="${escapeHtml(item.label)} finding">
          <option value="">Choose your finding</option>
          ${item.choices.map(([value, label, normality]) => `<option value="${escapeHtml(value)}" data-normality="${normality}" ${current && (current.value === value || current.finding === value) ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
        </select></label>
        <button type="button" class="horse-question-save" disabled>Record</button>
      </div>`;

    const select = box.querySelector('select');
    const save = box.querySelector('.horse-question-save');
    const sync = () => { if (save) save.disabled = !select?.value; };
    select?.addEventListener('change', sync);
    sync();
    save?.addEventListener('click', () => {
      if (!select?.value) return;
      const normality = select.selectedOptions[0]?.dataset?.normality || '';
      saveAbcFinding(key, select.value, normality);
    });
    window.requestAnimationFrame(() => select?.focus());
  }

  function openAssessmentPanel() {
    document.querySelector('.bottom-nav button[data-panel="assessmentPanel"]')?.click();
  }

  function renderCurrentAssessmentIfNeeded(force = false) {
    if (!isHorseScenario()) return;
    const body = document.getElementById('horseCurrentAssessmentBody');
    const title = document.getElementById('horseCurrentAssessmentTitle');
    const choose = document.getElementById('horseChooseAssessment');
    const collapse = document.getElementById('horseCollapseAssessment');
    if (!body || !title) return;

    // If the core runtime has already initialized this workspace, leave it in
    // control. This shim only fills the desktop early-return gap.
    if (!force && body.querySelector('.horse-current-exam-button')) return;

    title.textContent = 'ABC Assessment';
    body.hidden = false;
    body.innerHTML = `
      <p class="horse-current-assessment-help">Rapidly confirm immediate life threats.</p>
      <div class="horse-current-exam-grid"></div>`;
    const grid = body.querySelector('.horse-current-exam-grid');

    Object.entries(ABC).forEach(([key, item]) => {
      const current = finding(key);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `horse-current-exam-button${current ? ' complete' : ''}${current?.normality === 'not-normal' || current?.status === 'abnormal' ? ' abnormal' : ''}`;
      button.dataset.horseAbcKey = key;
      button.innerHTML = `<span>${current ? '✓' : '○'}</span><div><strong>${escapeHtml(item.label)}</strong><small>${current ? 'Recorded — click to reassess/review' : 'Perform exam'}</small></div>`;
      button.addEventListener('click', () => {
        showObservation(key);
        openAbcFollowup(key);
      });
      grid.appendChild(button);
    });

    if (choose) choose.onclick = openAssessmentPanel;
    if (collapse) {
      collapse.textContent = '⌃';
      collapse.setAttribute('aria-expanded', 'true');
      collapse.onclick = () => {
        const collapsed = !body.hidden;
        body.hidden = collapsed;
        collapse.textContent = collapsed ? '⌄' : '⌃';
        collapse.setAttribute('aria-expanded', String(!collapsed));
      };
    }
  }

  // The desktop assessment-category workspace historically passed item ids such
  // as "pelvis_hip" into selectHorseCurrentAssessment(), which only accepts
  // abc/head_to_toe/focused_leg. The call then silently fell back to ABC. Handle
  // the actual horse focused-exam items before that legacy click handler runs.
  document.addEventListener('click', event => {
    if (!isHorseScenario()) return;
    const button = event.target.closest?.('#assessmentTools [data-assessment-item]');
    if (!button) return;
    const key = String(button.dataset.assessmentItem || '');
    if (!FOCUSED_EXAMS.has(key)) return;

    const horse = window.EMSCodeSimHorseCrush;
    if (!horse?.performExam) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    const result = horse.performExam(key);
    if (result) markRecorded(button);
  }, true);

  function init() {
    if (!isHorseScenario()) return;
    renderCurrentAssessmentIfNeeded();
    window.addEventListener('emscodesim:scenario-finding-saved', () => renderCurrentAssessmentIfNeeded(true));
    window.addEventListener('pageshow', () => renderCurrentAssessmentIfNeeded());
  }

  window.EMSCodeSimHorseCrushUiFix = Object.freeze({
    version: '1.1',
    focusedExams: Object.freeze([...FOCUSED_EXAMS]),
    renderCurrentAssessment: renderCurrentAssessmentIfNeeded
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else window.setTimeout(init, 0);
})();
