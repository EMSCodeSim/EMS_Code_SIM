(function () {
  'use strict';

  const progressKey = 'emscodesim:emt-prep:progress';
  const planKey = 'emscodesim:emt-prep:plan';
  const moduleMeta = [
    { key: 'understanding-ems', number: 1, title: 'Understanding EMS and the EMT’s Role', href: '/emt-prep/module-1-understanding-ems.html', min: 50, max: 65 },
    { key: 'emt-school-expectations', number: 2, title: 'What EMT School Is Really Like', href: '/emt-prep/module-2-emt-school-expectations.html', min: 70, max: 90 },
    { key: 'medical-terminology', number: 3, title: 'Medical Terminology Foundations', href: '/emt-prep/module-3-medical-terminology.html', min: 75, max: 95 },
    { key: 'anatomy-physiology', number: 4, title: 'Anatomy and Physiology Foundations', href: '/emt-prep/module-4-anatomy-physiology.html', min: 45, max: 55 },
    { key: 'vital-signs', number: 5, title: 'Vital Signs Foundations', href: '/emt-prep/module-5-vital-signs.html', min: 150, max: 190 },
    { key: 'patient-assessment', number: 6, title: 'Patient Assessment Foundations', href: '/emt-prep/module-6-patient-assessment.html', min: 60, max: 75 },
    { key: 'abc-foundations', number: 7, title: 'Airway, Breathing, and Circulation Basics', href: '/emt-prep/module-7-abc-foundations.html', min: 55, max: 70 },
    { key: 'equipment-orientation', number: 8, title: 'EMS Equipment Orientation', href: '/emt-prep/module-8-equipment-orientation.html', min: 50, max: 65 },
    { key: 'communication-professionalism', number: 9, title: 'Communication and Professionalism', href: '/emt-prep/module-9-communication-professionalism.html', min: 45, max: 60 },
    { key: 'study-testing', number: 10, title: 'Studying, Testing, and Skills Practice', href: '/emt-prep/module-10-study-testing.html', min: 45, max: 60 },
    { key: 'physical-emotional-readiness', number: 11, title: 'Physical, Emotional, and Lifestyle Readiness', href: '/emt-prep/module-11-physical-emotional-readiness.html', min: 35, max: 45 },
    { key: 'enrollment-costs', number: 12, title: 'Course Selection, Costs, and Enrollment', href: '/emt-prep/module-12-enrollment-costs.html', min: 45, max: 60 }
  ];
  const moduleKeys = moduleMeta.map((module) => module.key);
  const moduleBoxes = Array.from(document.querySelectorAll('[data-prep-module]'));
  const readinessBoxes = Array.from(document.querySelectorAll('[data-prep-readiness]'));
  const progressBar = document.getElementById('prepProgressBar');
  const progressText = document.getElementById('prepProgressText');
  const progressTrack = document.getElementById('prepProgressTrack');
  const progressDetail = document.getElementById('prepProgressDetail');
  let activeFilter = 'all';
  let saved = { modules: {}, readiness: {} };

  try {
    saved = Object.assign(saved, JSON.parse(localStorage.getItem(progressKey) || '{}'));
  } catch (error) {
    console.warn('EMT Prep progress could not be restored.', error);
  }
  saved.modules = saved.modules || {};
  saved.readiness = saved.readiness || {};

  function persist() {
    try {
      localStorage.setItem(progressKey, JSON.stringify(saved));
    } catch (error) {
      console.warn('EMT Prep progress could not be saved.', error);
    }
  }

  function formatMinutes(min, max) {
    if (max < 60) return `${min}–${max} minutes`;
    const minHours = (min / 60).toFixed(min % 60 ? 1 : 0);
    const maxHours = (max / 60).toFixed(max % 60 ? 1 : 0);
    return `${minHours}–${maxHours} hours`;
  }

  function updateResumePanel(completed) {
    const remaining = moduleMeta.filter((module) => !saved.modules[module.key]);
    const next = remaining[0];
    const minRemaining = remaining.reduce((sum, module) => sum + module.min, 0);
    const maxRemaining = remaining.reduce((sum, module) => sum + module.max, 0);
    const percent = Math.round((completed / moduleMeta.length) * 100);
    const title = document.getElementById('resumeTitle');
    const description = document.getElementById('resumeDescription');
    const link = document.getElementById('resumePrepLink');
    const count = document.getElementById('resumeModuleCount');
    const time = document.getElementById('resumeTimeRemaining');
    const completedCount = document.getElementById('prepCompletedCount');
    const remainingCount = document.getElementById('prepRemainingCount');
    const percentCount = document.getElementById('prepPercentCount');

    if (completedCount) completedCount.textContent = String(completed);
    if (remainingCount) remainingCount.textContent = String(remaining.length);
    if (percentCount) percentCount.textContent = `${percent}%`;

    if (!next) {
      if (title) title.textContent = 'Complete your final readiness profile';
      if (description) description.textContent = 'You completed all 12 modules. Use the final assessment to identify any subjects worth reviewing before class begins.';
      if (link) {
        link.href = '/emt-prep/final-readiness-assessment.html';
        link.textContent = 'Open final assessment';
      }
      if (count) count.textContent = 'All modules completed';
      if (time) time.textContent = 'Final review is ready';
      return;
    }

    if (title) title.textContent = `${completed ? 'Continue with' : 'Start'} Module ${next.number}: ${next.title}`;
    if (description) description.textContent = `Your next unfinished lesson is Module ${next.number}. Complete it in one sitting or return later—progress remains saved on this device.`;
    if (link) {
      link.href = next.href;
      link.textContent = `${completed ? 'Continue' : 'Start'} Module ${next.number}`;
    }
    if (count) count.textContent = `${remaining.length} module${remaining.length === 1 ? '' : 's'} remaining`;
    if (time) time.textContent = `About ${formatMinutes(minRemaining, maxRemaining)} remaining`;
  }

  function applyModuleFilter() {
    document.querySelectorAll('[data-module-card]').forEach((card) => {
      const done = Boolean(saved.modules[card.dataset.moduleCard]);
      card.hidden = activeFilter === 'completed' ? !done : activeFilter === 'remaining' ? done : false;
    });
  }

  function updateProgress() {
    const completed = moduleKeys.filter((key) => saved.modules[key]).length;
    const percent = Math.round((completed / moduleKeys.length) * 100);
    const nextKey = moduleKeys.find((key) => !saved.modules[key]);

    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressTrack) progressTrack.setAttribute('aria-valuenow', String(percent));
    if (progressText) progressText.textContent = `${completed} of 12 modules`;
    if (progressDetail) progressDetail.textContent = completed === 12
      ? 'Foundation program complete. Use the final assessment to target your review.'
      : `${percent}% complete — progress is saved on this device.`;

    moduleBoxes.forEach((box) => {
      box.checked = Boolean(saved.modules[box.value]);
      const section = box.closest('.prep-module');
      if (section) section.classList.toggle('is-complete', box.checked);
    });

    document.querySelectorAll('[data-module-card]').forEach((card) => {
      const done = Boolean(saved.modules[card.dataset.moduleCard]);
      const isNext = !done && card.dataset.moduleCard === nextKey;
      card.classList.toggle('is-complete', done);
      card.classList.toggle('is-next', isNext);
      const status = card.querySelector('[data-module-status]');
      if (status) status.textContent = done ? 'Completed' : isNext ? 'Recommended next' : 'Not started';
    });

    updateResumePanel(completed);
    applyModuleFilter();
  }

  moduleBoxes.forEach((box) => {
    box.checked = Boolean(saved.modules[box.value]);
    box.addEventListener('change', () => {
      saved.modules[box.value] = box.checked;
      persist();
      updateProgress();
    });
  });

  readinessBoxes.forEach((box) => {
    box.checked = Boolean(saved.readiness[box.value]);
    box.addEventListener('change', () => {
      saved.readiness[box.value] = box.checked;
      persist();
    });
  });

  document.querySelectorAll('[data-module-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.moduleFilter || 'all';
      document.querySelectorAll('[data-module-filter]').forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      applyModuleFilter();
    });
  });

  const reset = document.getElementById('resetPrepProgress');
  if (reset) reset.addEventListener('click', () => {
    if (!window.confirm('Clear all saved EMT Prep progress on this device?')) return;
    saved = { modules: {}, readiness: {} };
    moduleBoxes.concat(readinessBoxes).forEach((box) => { box.checked = false; });
    persist();
    updateProgress();
  });

  const printButton = document.getElementById('printPrepPlan');
  if (printButton) printButton.addEventListener('click', () => window.print());
  updateProgress();

  const plans = {
    four: [['Week 1', 'Modules 1–3: EMS role, school expectations, and terminology.'], ['Week 2', 'Modules 4–6: anatomy, the interactive vital-sign skill course, and patient assessment. Plan about 4–5 hours.'], ['Week 3', 'Modules 7–9: ABC priorities, equipment practice, and communication. Plan about 2.5–3 hours.'], ['Week 4', 'Modules 10–12 plus the final readiness assessment.']],
    six: [['Week 1', 'Modules 1–2: EMS role and school expectations.'], ['Week 2', 'Modules 3–4: terminology and anatomy.'], ['Week 3', 'Modules 5–6: the interactive vital-sign skill course and patient assessment. Plan about 3.5–4.5 hours.'], ['Week 4', 'Modules 7–8: ABCs and equipment.'], ['Week 5', 'Modules 9–10: communication and study systems.'], ['Week 6', 'Modules 11–12 and final assessment.']],
    twelve: moduleMeta.map((module) => [`Week ${module.number}`, `Module ${module.number}: ${module.title}.`])
  };
  const planContainer = document.getElementById('studyPlan');
  const planButtons = Array.from(document.querySelectorAll('[data-plan]'));

  function renderPlan(name) {
    const chosen = plans[name] || plans.four;
    if (planContainer) {
      planContainer.innerHTML = chosen.map((item) => `<div class="study-week"><strong>${item[0]}</strong><p>${item[1]}</p></div>`).join('');
    }
    planButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.plan === name)));
    try { localStorage.setItem(planKey, name); } catch (error) { console.warn(error); }
  }

  planButtons.forEach((button) => button.addEventListener('click', () => renderPlan(button.dataset.plan)));
  let savedPlan = 'four';
  try { savedPlan = localStorage.getItem(planKey) || 'four'; } catch (error) { console.warn(error); }
  if (planContainer) renderPlan(plans[savedPlan] ? savedPlan : 'four');

  const questions = [
    { term: 'Bradycardia', prompt: 'What does this term most directly describe?', options: ['A slow heart rate', 'A fast breathing rate', 'Low blood glucose'], answer: 0, explain: 'brady- means slow and cardi refers to the heart.' },
    { term: 'Tachypnea', prompt: 'What does this term most directly describe?', options: ['Painful breathing', 'A fast breathing rate', 'Absent breathing'], answer: 1, explain: 'tachy- means fast and -pnea refers to breathing.' },
    { term: 'Hypoglycemia', prompt: 'What does this term most directly describe?', options: ['High blood pressure', 'Low blood glucose', 'Inflammation of a joint'], answer: 1, explain: 'hypo- means low, glyc refers to sugar, and -emia refers to a blood condition.' },
    { term: 'Bilateral', prompt: 'What does this term mean?', options: ['Toward the midline', 'On both sides', 'Farther from the trunk'], answer: 1, explain: 'bi- means two and lateral refers to the side.' },
    { term: 'Dyspnea', prompt: 'What does this term most directly describe?', options: ['Difficult or uncomfortable breathing', 'A weak pulse', 'Loss of sensation'], answer: 0, explain: 'dys- means difficult, abnormal, or painful and -pnea refers to breathing.' }
  ];
  let current = 0;
  let score = 0;
  let answered = false;
  const termEl = document.getElementById('termWord');
  const promptEl = document.getElementById('termPrompt');
  const optionsEl = document.getElementById('termOptions');
  const feedbackEl = document.getElementById('termFeedback');
  const nextEl = document.getElementById('nextTermQuestion');
  const restartEl = document.getElementById('restartTermDrill');

  function showQuestion() {
    answered = false;
    const question = questions[current];
    if (termEl) termEl.textContent = question.term;
    if (promptEl) promptEl.textContent = question.prompt;
    if (feedbackEl) feedbackEl.textContent = `Question ${current + 1} of ${questions.length}`;
    if (optionsEl) {
      optionsEl.innerHTML = '';
      question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'term-option';
        button.textContent = option;
        button.addEventListener('click', () => answer(index, button));
        optionsEl.appendChild(button);
      });
    }
    if (nextEl) {
      nextEl.hidden = true;
      nextEl.textContent = current === questions.length - 1 ? 'See score' : 'Next question';
    }
  }

  function answer(index, button) {
    if (answered || !optionsEl) return;
    answered = true;
    const question = questions[current];
    const buttons = Array.from(optionsEl.querySelectorAll('button'));
    buttons.forEach((item, itemIndex) => {
      item.disabled = true;
      if (itemIndex === question.answer) item.classList.add('correct');
    });
    if (index === question.answer) {
      score += 1;
      if (feedbackEl) feedbackEl.textContent = `Correct. ${question.explain}`;
    } else {
      button.classList.add('incorrect');
      if (feedbackEl) feedbackEl.textContent = `Not quite. ${question.explain}`;
    }
    if (nextEl) nextEl.hidden = false;
  }

  if (nextEl) nextEl.addEventListener('click', () => {
    if (current < questions.length - 1) {
      current += 1;
      showQuestion();
      return;
    }
    if (termEl) termEl.textContent = 'Finished';
    if (promptEl) promptEl.textContent = `You scored ${score} of ${questions.length}. Review the word parts, then try again later.`;
    if (optionsEl) optionsEl.innerHTML = '';
    if (feedbackEl) feedbackEl.textContent = score >= 4 ? 'Strong start for EMT school.' : 'Use the table above and repeat the drill.';
    nextEl.hidden = true;
    if (restartEl) restartEl.hidden = false;
  });
  if (restartEl) restartEl.addEventListener('click', () => {
    current = 0;
    score = 0;
    restartEl.hidden = true;
    showQuestion();
  });
  if (termEl) showQuestion();
}());
