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

  function activeCase() {
    const params = new URLSearchParams(location.search);
    return params.get('case') || window.EMSCodeSimPatientRecord?.active?.()?.scenarioId || '';
  }

  function isHorseScenario() {
    return activeCase() === CASE_ID;
  }

  function markRecorded(button) {
    if (!button) return;
    button.classList.add('used');
    const marker = button.querySelector('span');
    if (marker) marker.textContent = '✓';
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

  window.EMSCodeSimHorseCrushUiFix = Object.freeze({
    version: '1.0',
    focusedExams: Object.freeze([...FOCUSED_EXAMS])
  });
})();
