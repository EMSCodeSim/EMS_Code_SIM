(() => {
  'use strict';
  const STORAGE_KEY = 'emscode_report_class_completion_pending_v1';
  const ANSWER_KEY = [1, 2, 0, 3, 1, 2, 0, 1, 3, 2];
  const form = document.querySelector('#classCompletionForm');
  if (!form) return;
  const status = document.querySelector('#classCompletionStatus');
  const result = document.querySelector('#classWrittenResult');
  const button = document.querySelector('#prepareCompletionBtn');

  function show(message, kind = 'info') {
    status.textContent = message;
    status.className = 'rw-callout ' + kind;
    status.hidden = false;
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

  form.addEventListener('submit', event => {
    event.preventDefault();
    status.hidden = true;
    const learnerName = String(form.elements.learnerName.value || '').trim().replace(/\s+/g, ' ');
    if (learnerName.length < 2 || learnerName.length > 120) {
      show('Enter a name between 2 and 120 characters.', 'error');
      form.elements.learnerName.focus();
      return;
    }
    if (!form.elements.completionConsent.checked) {
      show('Confirm that you understand your name and scores will be stored for course completion tracking.', 'error');
      form.elements.completionConsent.focus();
      return;
    }
    const answers = [];
    for (let i = 0; i < ANSWER_KEY.length; i += 1) {
      const selected = form.querySelector('input[name="q' + (i + 1) + '"]:checked');
      if (!selected) {
        show('Answer all 10 questions before continuing. Question ' + (i + 1) + ' is unanswered.', 'error');
        form.querySelector('input[name="q' + (i + 1) + '"]')?.focus();
        return;
      }
      answers.push(Number(selected.value));
    }
    const correct = answers.reduce((sum, answer, index) => sum + (answer === ANSWER_KEY[index] ? 1 : 0), 0);
    const payload = { version: 'ems-report-writing-class-v1', submissionKey: makeKey(), learnerName, quizAnswers: answers, consent: true };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {
      show('This browser could not save your course progress. Enable local storage, then try again.', 'error');
      return;
    }
    result.textContent = 'Written test score: ' + (correct * 10) + '% (' + correct + ' of 10). Your score is ready. To record completion, submit one fictional narrative for AI grading using the link below.';
    result.hidden = false;
    button.textContent = 'Written test complete';
    document.querySelector('#openNarrativeLab')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
})();