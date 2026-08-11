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
      id: `horse-abc-desktop-${key}-${Date.now()}`,
      type: 'NEW ASSESSMENT INFORMATION',
      title: `${item.label} assessment`,
      text: item.observation,
      kind: 'assessment',
      sticky: true,
      recordedAt: new Date().toISOString()
    });
  }

  function saveAbcFinding(key, value, normality) {
    const item = ABC[key];
    if (!item || !value) return null;
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
    if (window.EMSCodeSimScenarioSession?.saveFinding) {
      return window.EMSCodeSimScenarioSession.saveFinding(key, value, payload, CASE_ID);
    }
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
    inline.innerHTML = `
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

    const select = inline.querySelector('select');
    const save = inline.querySelector('.horse-question-save');
    const sync = () => { if (save) save.disabled = !select?.value; };
    select?.addEventListener('change', sync);
    sync();
    save?.addEventListener('click', () => {
      if (!select?.value) return;
      try {
        const normality = select.selectedOptions[0]?.dataset?.normality || '';
        const saved = saveAbcFinding(key, select.value, normality);
        if (!saved) return;
        markRecorded(button);
        inline.hidden = true;
        inline.innerHTML = '';
      } catch (error) {
        console.error('[EMSCodeSim] Unable to save horse ABC finding.', error);
      }
    });
    window.requestAnimationFrame(() => select?.focus());
    return true;
  }

  // The desktop horse assessment menu passes concrete item ids such as
  // "airway" and "pelvis_hip" into a fallback that only understands the group
  // ids abc/head_to_toe/focused_leg. Intercept those item clicks and route them
  // to the actual ABC or focused-exam engine before the legacy fallback runs.
  document.addEventListener('click', event => {
    if (!isHorseScenario()) return;
    const button = event.target.closest?.('#assessmentTools [data-assessment-item]');
    if (!button) return;
    const key = String(button.dataset.assessmentItem || '');

    if (ABC[key]) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      openDesktopAbcFollowup(button, key);
      return;
    }

    if (!FOCUSED_EXAMS.has(key)) return;
    const horse = window.EMSCodeSimHorseCrush;
    if (!horse?.performExam) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    const result = horse.performExam(key);
    if (result) markRecorded(button);
  }, true);

  window.EMSCodeSimHorseCrushUiFix = Object.freeze({
    version: '1.2',
    abcKeys: Object.freeze(Object.keys(ABC)),
    focusedExams: Object.freeze([...FOCUSED_EXAMS])
  });
})();
