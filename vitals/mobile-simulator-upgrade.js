(() => {
  'use strict';

  const PHONE_QUERY = '(max-width: 979px)';
  const mq = window.matchMedia(PHONE_QUERY);

  function setMode() {
    document.body.classList.toggle('mobile-simulator-v3', mq.matches);
  }

  function activePanelButton() {
    return document.querySelector('.bottom-nav button.active[data-panel]');
  }

  function updateSheetCopy() {
    if (!mq.matches) return;
    const active = activePanelButton();
    const returnButton = document.getElementById('closeSheet');
    if (returnButton) {
      const label = returnButton.querySelector('span');
      if (label) label.textContent = 'Patient';
      returnButton.setAttribute('aria-label', 'Return to patient photo');
    }
    if (active) {
      document.body.dataset.mobileClinicalPanel = active.dataset.panel || '';
    } else {
      delete document.body.dataset.mobileClinicalPanel;
    }
  }

  function wireDock() {
    const nav = document.querySelector('.bottom-nav');
    if (!nav || nav.dataset.mobileV3Wired === '1') return;
    nav.dataset.mobileV3Wired = '1';
    nav.addEventListener('click', () => window.setTimeout(updateSheetCopy, 0));
  }

  function wirePatientReturn() {
    const close = document.getElementById('closeSheet');
    if (!close || close.dataset.mobileV3Wired === '1') return;
    close.dataset.mobileV3Wired = '1';
    close.addEventListener('click', () => {
      if (!mq.matches) return;
      window.setTimeout(() => {
        document.getElementById('patientImage')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 40);
    });
  }

  function ensurePatientImage() {
    if (!mq.matches) return;
    const image = document.getElementById('patientImage');
    if (!image) return;
    image.style.removeProperty('display');
    image.style.removeProperty('visibility');
    image.style.removeProperty('opacity');
  }

  function initialize() {
    setMode();
    wireDock();
    wirePatientReturn();
    updateSheetCopy();
    ensurePatientImage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }

  mq.addEventListener?.('change', () => {
    setMode();
    updateSheetCopy();
    ensurePatientImage();
  });

  window.addEventListener('ems-scenario-rendered', () => {
    updateSheetCopy();
    ensurePatientImage();
  });
})();
