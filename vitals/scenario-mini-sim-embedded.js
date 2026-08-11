(() => {
  'use strict';

  const body = document.body;
  if (!body || body.dataset.emsMiniSimEnhanced === '1') return;
  body.dataset.emsMiniSimEnhanced = '1';
  body.classList.add('ems-embedded-mini-sim');

  const flow = document.createElement('div');
  flow.className = 'ems-mini-flow';
  flow.setAttribute('aria-label', 'Mini simulator workflow');
  flow.innerHTML = '<span data-step="1" class="active">Perform</span><span data-step="2">Observe</span><span data-step="3">Document</span>';
  body.prepend(flow);

  const flowSteps = [...flow.querySelectorAll('span')];
  function setFlow(step) {
    flowSteps.forEach((node, index) => {
      const number = index + 1;
      node.classList.toggle('active', number === step);
      node.classList.toggle('complete', number < step);
    });
  }

  const answer = document.getElementById('answerCard');
  const submit = document.getElementById('submitBtn');
  const sim = body.dataset.scenarioVital || '';
  let unlocked = false;

  function unlockDocument() {
    if (unlocked) return;
    unlocked = true;
    if (answer) answer.classList.remove('ems-discovery-locked');
    setFlow(3);
    window.setTimeout(() => answer?.querySelector('input,select,button:not([disabled])')?.focus?.({ preventScroll:true }), 30);
  }

  function markObserved() {
    if (!unlocked) setFlow(2);
  }

  if (answer) answer.classList.add('ems-discovery-locked');

  // Numeric/device simulations already gate the Save button until the learner has
  // actually completed the measurement. Use that signal to reveal documentation.
  if (submit && ['pulse','respirations','spo2','bgl','temperature'].includes(sim)) {
    const watchSubmit = new MutationObserver(() => {
      if (!submit.disabled) unlockDocument();
      else if (!unlocked) markObserved();
    });
    watchSubmit.observe(submit, { attributes:true, attributeFilter:['disabled'] });
    if (!submit.disabled) unlockDocument();
  }

  // Blood pressure has its own mature cuff/auscultation engine. Its answer area
  // unlocks only after the cuff sequence has enabled the submit control.
  if (body.querySelector('.bp-scenario-answer') && submit) {
    body.querySelector('.bp-scenario-answer')?.classList.add('ems-discovery-locked');
    const watchBp = new MutationObserver(() => {
      if (!submit.disabled) {
        body.querySelector('.bp-scenario-answer')?.classList.remove('ems-discovery-locked');
        unlockDocument();
      } else if (!unlocked) markObserved();
    });
    watchBp.observe(submit, { attributes:true, attributeFilter:['disabled'] });
  }

  function unlockAfterClicks(selectors, required) {
    const done = new Set();
    selectors.forEach(selector => {
      document.querySelector(selector)?.addEventListener('click', () => {
        done.add(selector);
        markObserved();
        if (done.size >= required) unlockDocument();
      });
    });
  }

  if (sim === 'pupils') unlockAfterClicks(['#lightLeft','#lightRight','#trackingTest'], 3);
  if (sim === 'skin') unlockAfterClicks(['#inspectSkin','#touchSkin','#moistureSkin'], 3);
  if (sim === 'mental-status') {
    ['#observeBtn','#voiceBtn','#painBtn'].forEach(selector => {
      document.querySelector(selector)?.addEventListener('click', () => {
        markObserved();
        unlockDocument();
      });
    });
  }
  if (sim === 'breath-sounds') {
    document.querySelectorAll('.sv-point').forEach(point => point.addEventListener('click', () => {
      markObserved();
      const heard = document.querySelectorAll('.sv-point.done').length;
      if (heard >= 4) unlockDocument();
    }));
  }

  // Visual assessment-suite pages create their own interpretation panel only after
  // the physical/visual exam is complete. Keep the flow indicator in sync.
  const result = document.getElementById('result');
  if (result && !answer) {
    const observer = new MutationObserver(() => {
      if (result.querySelector('.va-interpret')) {
        unlocked = true;
        setFlow(3);
      } else if (!result.classList.contains('saved')) {
        markObserved();
      }
    });
    observer.observe(result, { childList:true, subtree:true, attributes:true });
  }

  document.addEventListener('click', event => {
    if (event.target.closest('button,a,[role="button"]')) markObserved();
  }, true);

  window.EMSCodeSimEmbeddedMiniSim = Object.freeze({
    version: '2026.08.11.1',
    unlockDocument,
    markObserved,
    setFlow
  });
})();
