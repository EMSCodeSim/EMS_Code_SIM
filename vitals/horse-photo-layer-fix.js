(() => {
  'use strict';

  const CASE_ID = 'horse_crush';

  function activeCase() {
    const params = new URLSearchParams(location.search);
    return params.get('case') || window.EMSCodeSimPatientRecord?.active?.()?.scenarioId || '';
  }

  function isHorseScenario() {
    return activeCase() === CASE_ID;
  }

  function revealPatientImage() {
    const image = document.getElementById('patientImage');
    if (!image) return false;
    image.hidden = false;
    image.style.removeProperty('display');
    image.style.removeProperty('visibility');
    image.style.removeProperty('opacity');
    return true;
  }

  function restoreSimulatorToPatientStage() {
    if (!isHorseScenario()) return false;
    revealPatientImage();
    return window.EMSCodeSimMiniSimOverlay?.ensureWorkspaceOverPatient?.() || false;
  }

  // Compatibility alias retained for old tests/cached code. The previous sidecar
  // behavior intentionally no longer moves the simulator into the clinical column;
  // every mini sim now uses the shared overlay inside the patient window.
  function moveSimulatorToClinicalColumn() {
    return restoreSimulatorToPatientStage();
  }

  function sync() {
    return restoreSimulatorToPatientStage();
  }

  function start() {
    if (!isHorseScenario()) return;
    if (document.body.classList.contains('horse-intro-playing') || document.body.dataset.horseIntro === 'video') return;
    revealPatientImage();
    window.setTimeout(sync, 0);
    window.setTimeout(sync, 100);
  }

  window.EMSCodeSimHorsePhotoLayerFix = Object.freeze({
    version: '2.0',
    sync,
    moveSimulatorToClinicalColumn,
    restoreSimulatorToPatientStage,
    revealPatientImage
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
