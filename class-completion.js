(() => {
  'use strict';
  const PROGRESS_KEY = 'emscode_report_class_progress_v1';
  const VERSION = 'ems-report-writing-class-v1';
  const ANSWER_KEY = [0, 2, 0, 1, 1, 2, 0, 1, 2, 2];
  const startForm = document.querySelector('#courseStartForm');
  const testForm = document.querySelector('#classCompletionForm');
  if (!startForm || !testForm) return;
  const $ = selector => document.querySelector(selector);
  const status = $('#classCompletionStatus');
  const result = $('#classWrittenResult');
  const button = $('#prepareCompletionBtn');
  const progressSummary = $('#courseProgressSummary');
  const finishButton = $('#finishClassBtn');

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
  function show(message, kind = 'info') {
    status.textContent = message;
    status.className = 'rw-callout ' + kind;
    status.hidden = false;
  }
  function setLockedLink(selector, href, text, unlocked) {
    const link = document.querySelector(selector);
    if (!link) return;
    link.href = unlocked ? href : '#courseProgress';
    link.textContent = unlocked ? text : 'Locked until earlier steps are complete';
    link.setAttribute('aria-disabled', String(!unlocked));
    link.classList.toggle('locked', !unlocked);
  }
  function render() {
    const p = readProgress();
    if (p?.aiNarrativeComplete && !p.aiCompletionProof) {
      p.aiNarrativeComplete = false;
      delete p.aiNarrativeScore;
      writeProgress(p);
    }
    const started = !!p?.started;
    const material = !!p?.classMaterialComplete;
    const guide = !!p?.guidedNarrativeComplete;
    const ai = !!p?.aiNarrativeComplete && !!p?.aiCompletionProof;
    const test = !!p?.writtenTestComplete && Number(p?.writtenTestScore) >= 80;
    const finished = !!p?.classFinished;
    const mark = (id, done, detail) => {
      const item = document.querySelector(id);
      if (!item) return;
      item.classList.toggle('complete', done);
      const state = item.querySelector('.rw-step-status');
      if (state) state.textContent = done ? 'Complete' : 'Not complete';
      const detailNode = item.querySelector('span:nth-of-type(2)');
      if (detailNode && detail) detailNode.textContent = detail;
    };
    mark('#progress-start', started, started ? 'Name entered: ' + p.learnerName : 'Enter your name.');
    mark('#progress-material', material, material ? 'Class information marked as read.' : 'Review the class information, then mark it complete.');
    mark('#progress-guide', guide, guide ? 'A guided narrative has been generated.' : 'Use the guided PCR template and generate a narrative.');
    mark('#progress-ai', ai, ai ? 'First AI grade: ' + p.aiNarrativeScore + '/100. Extra narratives are optional.' : 'Submit a fictional narrative for one grade.');
    mark('#progress-test', test, test ? 'Passed with ' + p.writtenTestScore + '% (' + p.writtenTestCorrect + ' of 10).' : p?.writtenTestScore != null ? 'Most recent score: ' + p.writtenTestScore + '%. At least 80% is required.' : 'Earn at least 8 correct answers (80%).');
    mark('#progress-finish', finished, finished ? 'Class finished and completion recorded.' : 'Finish after passing the written test.');
    setLockedLink('#progress-guide a', '/pcr-narrative-coach.html', guide ? 'Practice another guided narrative (optional) →' : 'Open PCR Narrative Coach →', started && material);
    setLockedLink('#progress-ai a', '/narrative-writing-lab.html', ai ? 'Practice another narrative (optional) →' : 'Open AI Narrative Writing Lab →', started && material && guide);
    setLockedLink('#progress-test a', '#course-completion', 'Go to written test →', started && material && guide && ai);
    startForm.elements.learnerName.value = started ? p.learnerName : '';
    startForm.elements.learnerName.readOnly = started;
    startForm.elements.completionConsent.checked = started ? true : startForm.elements.completionConsent.checked;
    startForm.elements.completionConsent.disabled = started;
    $('#startClassBtn').textContent = started ? 'Class started' : 'Start class';
    const canFinish = started && material && guide && ai && test && !finished;
    if (finishButton) {
      finishButton.disabled = !canFinish;
      finishButton.textContent = finished ? 'Class finished' : 'Finish class';
    }
    if (test) {
      result.hidden = false;
      result.className = 'rw-callout success';
      result.textContent = 'Passed: ' + p.writtenTestScore + '% (' + p.writtenTestCorrect + ' of 10).';
      button.textContent = 'Written test passed';
      button.disabled = true;
    } else if (p?.writtenTestScore != null) {
      result.hidden = false;
      result.className = 'rw-callout error';
      result.textContent = 'Score: ' + p.writtenTestScore + '% (' + (p.writtenTestCorrect || 0) + ' of 10). You need at least 80% to pass. Review the class material and try again.';
      button.textContent = 'Retake written test';
      button.disabled = false;
    }
    if (started) {
      progressSummary.textContent = finished ? 'All class requirements are complete.' :
        'Progress saved in this browser. ' + [
          !material && 'read the class material',
          !guide && 'complete a guided narrative',
          !ai && 'complete one AI-graded narrative',
          !test && 'pass the written test with at least 80%',
          !finished && material && guide && ai && test && 'select Finish class'
        ].filter(Boolean).join(', then ') + '.';
    } else {
      progressSummary.textContent = 'Start class and enter your name to begin the checklist.';
    }
  }

  $('#markMaterialRead')?.addEventListener('click', () => {
    const p = readProgress();
    if (!p?.started) {
      $('#materialReadStatus').textContent = 'Start class and enter your name before marking the material complete.';
      return;
    }
    p.classMaterialComplete = true;
    if (!writeProgress(p)) {
      $('#materialReadStatus').textContent = 'Progress could not be saved in this browser.';
      return;
    }
    $('#materialReadStatus').textContent = 'Class material marked complete. The guided narrative is now available.';
    render();
    $('#progress-guide').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  startForm.addEventListener('submit', event => {
    event.preventDefault();
    const name = String(startForm.elements.learnerName.value || '').trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 120) {
      $('#startClassStatus').textContent = 'Enter a name between 2 and 120 characters.';
      return;
    }
    if (!startForm.elements.completionConsent.checked) {
      $('#startClassStatus').textContent = 'Check the box to confirm score tracking.';
      return;
    }
    const p = readProgress() || { version: VERSION, submissionKey: makeKey(), guidedNarrativeComplete: false, aiNarrativeComplete: false, writtenTestComplete: false };
    p.version = VERSION;
    if (!p.submissionKey) p.submissionKey = makeKey();
    p.started = true;
    p.learnerName = name;
    p.consent = true;
    if (!writeProgress(p)) {
      $('#startClassStatus').textContent = 'This browser could not save progress. Enable local storage and try again.';
      return;
    }
    $('#startClassStatus').textContent = 'Class started. Review the material to unlock step 3.';
    render();
  });

  testForm.addEventListener('submit', event => {
    event.preventDefault();
    const p = readProgress();
    if (!p?.started || !p.classMaterialComplete || !p.guidedNarrativeComplete || !p.aiNarrativeComplete) {
      show('Complete steps 1–4 before taking the written test.', 'error');
      $('#courseProgress').scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (p.writtenTestComplete && Number(p.writtenTestScore) >= 80) {
      show('You have already passed the written test.', 'success');
      return;
    }
    const answers = [];
    for (let i = 0; i < ANSWER_KEY.length; i += 1) {
      const selected = testForm.querySelector('input[name="q' + (i + 1) + '"]:checked');
      if (!selected) {
        show('Answer all 10 questions before continuing. Question ' + (i + 1) + ' is unanswered.', 'error');
        testForm.querySelector('input[name="q' + (i + 1) + '"]')?.focus();
        return;
      }
      answers.push(Number(selected.value));
    }
    const correct = answers.reduce((sum, answer, index) => sum + (answer === ANSWER_KEY[index] ? 1 : 0), 0);
    p.writtenTestScore = correct * 10;
    p.writtenTestCorrect = correct;
    p.writtenTestComplete = correct >= 8;
    p.writtenTestPassed = correct >= 8;
    if (correct >= 8) p.quizAnswers = answers;
    if (!writeProgress(p)) {
      show('This browser could not save your test result. Enable local storage, then try again.', 'error');
      return;
    }
    if (correct < 8) {
      show('You scored ' + (correct * 10) + '% (' + correct + ' of 10). You need at least 80% to pass. Review the class material and retake the test.', 'error');
      render();
      return;
    }
    show('You passed with ' + (correct * 10) + '% (' + correct + ' of 10). Select Finish class in the checklist to record completion.', 'success');
    render();
    $('#progress-finish').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  finishButton?.addEventListener('click', async () => {
    const p = readProgress();
    if (!p?.started || !p.consent || !p.classMaterialComplete || !p.guidedNarrativeComplete || !p.aiNarrativeComplete || !p.writtenTestComplete || Number(p.writtenTestScore) < 80) {
      show('Complete every step and pass the test with at least 80% before finishing.', 'error');
      return;
    }
    finishButton.disabled = true;
    finishButton.textContent = 'Saving completion…';
    try {
      const response = await fetch('/.netlify/functions/narrative-grader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'completeClass',
          classCompletion: {
            version: p.version,
            submissionKey: p.submissionKey,
            learnerName: p.learnerName,
            consent: p.consent,
            classMaterialComplete: p.classMaterialComplete,
            guidedNarrativeComplete: p.guidedNarrativeComplete,
            aiNarrativeComplete: p.aiNarrativeComplete,
            aiNarrativeScore: p.aiNarrativeScore,
            aiCompletionProof: p.aiCompletionProof,
            quizAnswers: p.quizAnswers
          }
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.courseCompletionSaved) throw new Error(payload.error || 'The class record could not be saved.');
      p.classFinished = true;
      p.classFinishedAt = new Date().toISOString();
      if (!writeProgress(p)) throw new Error('The roster saved the class record, but this browser could not save the finished status.');
      show('Class finished. Your completion and scores were recorded.', 'success');
      const finishStatus = $('#finishClassStatus');
      if (finishStatus) finishStatus.textContent = 'Finished and recorded.';
      render();
    } catch (error) {
      show(error.message || 'Could not finish class. Check your connection and try again.', 'error');
      finishButton.disabled = false;
      finishButton.textContent = 'Finish class';
    }
  });

  render();
  window.addEventListener('pageshow', render);
  window.addEventListener('focus', render);
  window.addEventListener('storage', render);
})();