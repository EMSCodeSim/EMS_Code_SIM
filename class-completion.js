(() => {
  'use strict';
  const PROGRESS_KEY = 'emscode_report_class_progress_v1';
  const PENDING_KEY = 'emscode_report_class_completion_pending_v1';
  const ANSWER_KEY = [0, 2, 0, 1, 1, 2, 0, 1, 2, 2];
  const startForm = document.querySelector('#courseStartForm');
  const testForm = document.querySelector('#classCompletionForm');
  if (!startForm || !testForm) return;
  const $ = selector => document.querySelector(selector);
  const status = $('#classCompletionStatus');
  const result = $('#classWrittenResult');
  const button = $('#prepareCompletionBtn');
  const progressSummary = $('#courseProgressSummary');

  function readProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null'); } catch (_) { return null; }
  }
  function writeProgress(value) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(value)); return true; } catch (_) { return false; }
  }
  function makeKey() {
    const bytes = new Uint8Array(16);
    if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
  }
  function show(message, kind = 'info') { status.textContent = message; status.className = 'rw-callout ' + kind; status.hidden = false; }
  function render() {
    const p = readProgress();
    const complete = !!p?.started;
    const guide = !!p?.guidedNarrativeComplete;
    const test = !!p?.writtenTestComplete;
    const ai = !!p?.aiNarrativeComplete;
    const mark = (id, done, detail) => {
      const item = document.querySelector(id);
      item.classList.toggle('complete', done);
      item.querySelector('.rw-step-status').textContent = done ? 'Complete' : 'Not complete';
      const detailNode = item.querySelector('span:last-of-type');
      if (detailNode && detail) detailNode.textContent = detail;
    };
    mark('#progress-start', complete, complete ? 'Name entered: ' + p.learnerName : 'Enter your name.');
    mark('#progress-guide', guide, guide ? 'A guided narrative has been generated.' : 'Use the guided PCR template and generate a narrative.');
    mark('#progress-test', test, test ? 'Written test score: ' + p.writtenTestScore + '%.' : 'Answer all 10 content questions.');
    mark('#progress-ai', ai, ai ? 'First AI grade: ' + p.aiNarrativeScore + '/100. Extra narratives are optional.' : 'Submit a fictional narrative for a grade. More practice narratives are optional.');
    const aiLink = document.querySelector('#progress-ai a');
    const aiUnlocked = complete && guide && test && !ai;
    aiLink.href = (aiUnlocked || ai) ? '/narrative-writing-lab.html' : '#courseProgress';
    aiLink.textContent = ai ? 'Practice another narrative (optional) →' : aiUnlocked ? 'Start required AI grade →' : 'Locked until steps 1–3 are complete';
    aiLink.setAttribute('aria-disabled', String(!aiUnlocked && !ai));
    aiLink.classList.toggle('locked', !aiUnlocked && !ai);
    startForm.elements.learnerName.value = complete ? p.learnerName : '';
    if (complete) {
      startForm.elements.learnerName.readOnly = true;
      startForm.elements.completionConsent.checked = true;
      startForm.elements.completionConsent.disabled = true;
      $('#startClassBtn').textContent = 'Class started';
      progressSummary.textContent = ai ? 'All required steps are complete. You may keep practicing with additional narratives.' :
        'Progress saved in this browser. ' + [!guide && 'complete the guided narrative', !test && 'complete the written test', !ai && 'submit one AI-graded narrative'].filter(Boolean).join(', then ');
      if (test) {
        result.hidden = false;
        result.textContent = 'Written test score: ' + p.writtenTestScore + '% (' + p.writtenTestCorrect + ' of 10).';
        button.textContent = 'Written test complete';
      }
    } else {
      startForm.elements.learnerName.readOnly = false;
      startForm.elements.completionConsent.disabled = false;
      progressSummary.textContent = 'Start class to begin tracking your required steps.';
    }
  }
  document.querySelector('#progress-ai a')?.addEventListener('click', event => {
    const p = readProgress();
    if (!p?.started || !p.guidedNarrativeComplete || !p.writtenTestComplete) {
      event.preventDefault();
      progressSummary.textContent = 'Complete steps 1, 2, and 3 before the required AI-graded narrative.';
    }
  });\n  startForm.addEventListener('submit', event => {
    event.preventDefault();
    const name = String(startForm.elements.learnerName.value || '').trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 120) { $('#startClassStatus').textContent = 'Enter a name between 2 and 120 characters.'; return; }
    if (!startForm.elements.completionConsent.checked) { $('#startClassStatus').textContent = 'Check the box to confirm score tracking.'; return; }
    const p = readProgress() || { version: 'ems-report-writing-class-v1', submissionKey: makeKey(), guidedNarrativeComplete: false, writtenTestComplete: false, aiNarrativeComplete: false };
    p.started = true; p.learnerName = name; p.consent = true;
    if (!writeProgress(p)) { $('#startClassStatus').textContent = 'This browser could not save progress. Enable local storage and try again.'; return; }
    $('#startClassStatus').textContent = 'Class started. Your checklist is ready.';
    render();
  });
  testForm.addEventListener('submit', event => {
    event.preventDefault();
    const p = readProgress();
    if (!p?.started) { show('Start the class and enter your name before taking the written test.', 'error'); $('#courseProgress').scrollIntoView({ behavior: 'smooth' }); return; }
    if (!p.guidedNarrativeComplete) { show('Complete and generate a narrative in the PCR Narrative Coach before taking the written test.', 'error'); return; }
    const answers = [];
    for (let i = 0; i < ANSWER_KEY.length; i += 1) {
      const selected = testForm.querySelector('input[name="q' + (i + 1) + '"]:checked');
      if (!selected) { show('Answer all 10 questions before continuing. Question ' + (i + 1) + ' is unanswered.', 'error'); testForm.querySelector('input[name="q' + (i + 1) + '"]')?.focus(); return; }
      answers.push(Number(selected.value));
    }
    const correct = answers.reduce((sum, answer, index) => sum + (answer === ANSWER_KEY[index] ? 1 : 0), 0);
    p.quizAnswers = answers; p.writtenTestComplete = true; p.writtenTestScore = correct * 10; p.writtenTestCorrect = correct;
    if (!writeProgress(p)) { show('This browser could not save your test result. Enable local storage, then try again.', 'error'); return; }
    const completion = { version: p.version, submissionKey: p.submissionKey, learnerName: p.learnerName, quizAnswers: answers, consent: p.consent, guidedNarrativeComplete: true };
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(completion)); } catch (_) { show('Your result could not be saved in this browser. Enable local storage and try again.', 'error'); return; }
    show('Written test complete: ' + (correct * 10) + '% (' + correct + ' of 10). Continue to the AI Narrative Writing Lab for one required grade. Additional narratives are optional.', 'success');
    render();
    $('#openNarrativeLab').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  render();
})();