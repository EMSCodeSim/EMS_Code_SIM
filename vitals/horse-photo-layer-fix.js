(() => {
  'use strict';

  const CASE_ID = 'horse_crush';
  const DESKTOP_QUERY = '(min-width: 980px)';
  const desktopMedia = window.matchMedia?.(DESKTOP_QUERY);

  function activeCase() {
    const params = new URLSearchParams(location.search);
    return params.get('case') || window.EMSCodeSimPatientRecord?.active?.()?.scenarioId || '';
  }

  function isHorseScenario() {
    return activeCase() === CASE_ID;
  }

  function installStyles() {
    if (document.querySelector('style[data-horse-photo-layer-fix]')) return;
    const style = document.createElement('style');
    style.dataset.horsePhotoLayerFix = '1';
    style.textContent = `
      @media (min-width: 980px) {
        body.horse-current-emt-call.desktop-scenario-layout #embeddedSimWorkspace.horse-sidecar-sim {
          position: relative !important;
          inset: auto !important;
          flex: 1 1 0 !important;
          align-self: stretch !important;
          width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          z-index: 12 !important;
          overflow: hidden !important;
          border: 1px solid #31566d !important;
          border-radius: 14px !important;
          background: #07131f !important;
          box-shadow: none !important;
        }
        body.horse-current-emt-call.desktop-scenario-layout #embeddedSimWorkspace.horse-sidecar-sim[hidden] {
          display: none !important;
        }
        body.horse-current-emt-call.desktop-scenario-layout.sim-workspace-open #actionSheet.action-sheet {
          display: none !important;
        }
        body.horse-current-emt-call.desktop-scenario-layout .patient-stage > #patientImage {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
      }
    `;
    document.head.appendChild(style);
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

  function moveSimulatorToClinicalColumn() {
    if (!isHorseScenario() || !desktopMedia?.matches) return false;
    const workspace = document.getElementById('embeddedSimWorkspace');
    const controlColumn = document.querySelector('.patient-control-column');
    const actionSheet = document.getElementById('actionSheet');
    if (!workspace || !controlColumn) return false;

    workspace.classList.add('horse-sidecar-sim');
    if (workspace.parentElement !== controlColumn) {
      if (actionSheet?.parentElement === controlColumn) controlColumn.insertBefore(workspace, actionSheet);
      else controlColumn.appendChild(workspace);
    } else if (actionSheet?.parentElement === controlColumn && workspace.nextElementSibling !== actionSheet) {
      controlColumn.insertBefore(workspace, actionSheet);
    }

    revealPatientImage();
    return workspace.parentElement === controlColumn;
  }

  function restoreSimulatorToPatientStage() {
    if (!isHorseScenario() || desktopMedia?.matches) return false;
    const workspace = document.getElementById('embeddedSimWorkspace');
    const stage = document.querySelector('.patient-stage');
    const clueLayer = document.getElementById('sceneClueLayer');
    if (!workspace || !stage) return false;

    workspace.classList.remove('horse-sidecar-sim');
    if (workspace.parentElement !== stage) {
      if (clueLayer?.parentElement === stage) clueLayer.insertAdjacentElement('afterend', workspace);
      else stage.prepend(workspace);
    }
    return workspace.parentElement === stage;
  }

  function sync() {
    if (!isHorseScenario()) return false;
    installStyles();
    if (desktopMedia?.matches) return moveSimulatorToClinicalColumn();
    return restoreSimulatorToPatientStage();
  }

  function start() {
    if (!isHorseScenario()) return;
    sync();

    const observer = new MutationObserver(() => {
      if (desktopMedia?.matches) moveSimulatorToClinicalColumn();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const handleMediaChange = () => sync();
    desktopMedia?.addEventListener?.('change', handleMediaChange);
    window.addEventListener('pagehide', () => {
      observer.disconnect();
      desktopMedia?.removeEventListener?.('change', handleMediaChange);
    }, { once: true });
  }

  window.EMSCodeSimHorsePhotoLayerFix = Object.freeze({
    version: '1.0',
    sync,
    moveSimulatorToClinicalColumn,
    restoreSimulatorToPatientStage,
    revealPatientImage
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
