(function () {
  'use strict';

  const STORAGE_KEY = 'emscodesim:emt-prep:vitals-skills:v2';
  const page = document.querySelector('[data-vital-skill]');
  if (!page) return;

  function loadStore() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch (error) {
      return {};
    }
  }

  const store = loadStore();
  function saveStore() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch (error) {}
  }
  function skillData(slug) {
    store.skills = store.skills || {};
    store.skills[slug] = store.skills[slug] || { steps: {} };
    return store.skills[slug];
  }

  const labs = [...document.querySelectorAll('[data-vital-skill]')];
  const progressText = document.getElementById('vitalsCourseProgress');
  const progressBar = document.getElementById('vitalsCourseProgressBar');

  function updateProgress() {
    let earned = 0;
    let possible = 0;

    labs.forEach((lab) => {
      const slug = lab.dataset.vitalSkill;
      const data = skillData(slug);
      const steps = [...lab.querySelectorAll('[data-skill-step]')];
      possible += steps.length + 2;
      earned += steps.filter((button) => button.classList.contains('is-complete')).length;
      if (data.challengeCorrect) earned += 1;
      if (data.simComplete) earned += 1;

      const total = steps.length + 2;
      const localEarned = steps.filter((button) => button.classList.contains('is-complete')).length + (data.challengeCorrect ? 1 : 0) + (data.simComplete ? 1 : 0);
      const status = lab.querySelector('[data-vital-status]');
      if (status) {
        if (localEarned === total) {
          status.textContent = 'Complete';
          status.classList.add('is-complete');
        } else if (localEarned > 0) {
          status.textContent = `${localEarned} of ${total}`;
          status.classList.remove('is-complete');
        } else {
          status.textContent = 'Not started';
          status.classList.remove('is-complete');
        }
      }
    });

    const percent = possible ? Math.round((earned / possible) * 100) : 0;
    if (progressText) progressText.textContent = `${percent}%`;
    if (progressBar) progressBar.style.width = `${percent}%`;
  }

  labs.forEach((lab) => {
    const slug = lab.dataset.vitalSkill;
    const data = skillData(slug);

    lab.querySelectorAll('[data-skill-step]').forEach((button, index) => {
      if (data.steps && data.steps[index]) {
        button.classList.add('is-complete');
        button.setAttribute('aria-pressed', 'true');
      } else {
        button.setAttribute('aria-pressed', 'false');
      }
      button.addEventListener('click', () => {
        const completed = button.classList.toggle('is-complete');
        button.setAttribute('aria-pressed', String(completed));
        data.steps[index] = completed;
        saveStore();
        updateProgress();
      });
    });

    const record = lab.querySelector('[data-vital-record]');
    if (record) {
      record.value = data.record || '';
      record.addEventListener('input', () => {
        data.record = record.value;
        saveStore();
      });
    }

    const simComplete = lab.querySelector('[data-vital-sim-complete]');
    if (simComplete) {
      simComplete.checked = !!data.simComplete;
      simComplete.addEventListener('change', () => {
        data.simComplete = simComplete.checked;
        saveStore();
        updateProgress();
      });
    }

    lab.querySelectorAll('[data-vital-simulator]').forEach((link) => {
      link.addEventListener('click', () => {
        data.simOpened = true;
        saveStore();
      });
    });

    const challenge = lab.querySelector('[data-vital-challenge]');
    if (challenge) {
      const feedback = challenge.querySelector('.vital-challenge-feedback');
      const options = [...challenge.querySelectorAll('[data-vital-answer]')];
      if (data.challengeCorrect) {
        feedback.textContent = 'Correct. This technique checkpoint is complete.';
        feedback.classList.add('success');
        options.forEach((option) => {
          if (option.dataset.vitalAnswer === 'true') option.classList.add('is-correct');
        });
      }
      options.forEach((option) => {
        option.addEventListener('click', () => {
          options.forEach((item) => item.classList.remove('is-correct', 'is-incorrect'));
          const correct = option.dataset.vitalAnswer === 'true';
          if (correct) {
            option.classList.add('is-correct');
            feedback.textContent = 'Correct. Apply that correction before trusting the result.';
            feedback.className = 'vital-challenge-feedback success';
            data.challengeCorrect = true;
          } else {
            option.classList.add('is-incorrect');
            feedback.textContent = 'Not quite. Focus on the choice that improves measurement reliability and patient assessment.';
            feedback.className = 'vital-challenge-feedback warn';
          }
          saveStore();
          updateProgress();
        });
      });
    }
  });

  document.querySelectorAll('[data-trend-sorter] [data-trend-answer]').forEach((button) => {
    button.addEventListener('click', () => {
      const sorter = button.closest('[data-trend-sorter]');
      const feedback = sorter.querySelector('p[role="status"]');
      sorter.querySelectorAll('[data-trend-answer]').forEach((item) => item.classList.remove('is-correct', 'is-incorrect'));
      if (button.dataset.trendAnswer === 'true') {
        button.classList.add('is-correct');
        feedback.textContent = 'Correct. Rising respiratory rate with fatigue and declining alertness suggests deterioration and needs prompt patient-focused reassessment.';
        feedback.className = 'success';
      } else {
        button.classList.add('is-incorrect');
        feedback.textContent = 'Try again. Look for the combination showing worsening breathing and mental status.';
        feedback.className = 'warn';
      }
    });
  });

  const cases = [
    {
      title: 'Older adult with shortness of breath',
      story: 'The patient is seated upright, speaking in short phrases, and says breathing has worsened over the last hour.',
      readings: { BP: '148/86 manual', Pulse: '112, regular, weak', Respirations: '30, shallow, labored', 'SpO₂': '88% room air, stable signal', Skin: 'pale, cool, moist', Mental: 'A&O×4 but anxious' },
      priority: 'Respirations',
      context: ['work of breathing', 'short phrases', 'low oxygen saturation', 'weak pulse']
    },
    {
      title: 'Young adult after outdoor exercise',
      story: 'The patient is alert, hot, dizzy, and reports very little fluid intake today.',
      readings: { BP: '96/62 manual', Pulse: '124, regular, weak', Respirations: '24, deep, unlabored', 'SpO₂': '98% room air', Skin: 'hot, flushed, dry', Temperature: '103.1°F oral', Mental: 'A&O×4' },
      priority: 'Temperature',
      context: ['heat exposure', 'dizziness', 'poor fluid intake', 'tachycardia']
    },
    {
      title: 'Adult with sudden confusion',
      story: 'Family reports the patient became confused over 20 minutes. Speech is clear but answers are delayed.',
      readings: { BP: '132/78 manual', Pulse: '92, regular, strong', Respirations: '18, regular, unlabored', 'SpO₂': '97% room air', BGL: '48 mg/dL', Pupils: '3 mm equal and reactive', Mental: 'A&O×2 to person and place' },
      priority: 'BGL',
      context: ['acute mental-status change', 'low glucose result', 'swallowing and airway safety', 'trend after care']
    },
    {
      title: 'Patient after a minor fall',
      story: 'The patient denies pain, appears comfortable, and has no obvious injury. The pulse oximeter repeatedly jumps between 79% and 99%.',
      readings: { BP: '122/74 manual', Pulse: '76, regular, strong', Respirations: '16, regular, unlabored', 'SpO₂': '79–99%, unstable signal', Skin: 'warm, pink, dry', Mental: 'A&O×4' },
      priority: 'SpO₂',
      context: ['unstable signal', 'manual pulse comparison', 'motion or poor sensor placement', 'patient appearance']
    }
  ];

  const capstone = document.querySelector('[data-complete-vitals]');
  if (capstone) {
    let currentCase = 0;
    const title = capstone.querySelector('[data-case-title]');
    const story = capstone.querySelector('[data-case-story]');
    const readings = capstone.querySelector('[data-case-readings]');
    const priority = capstone.querySelector('[data-case-priority]');
    const context = capstone.querySelector('[data-case-context]');
    const report = capstone.querySelector('[data-case-report]');
    const feedback = capstone.querySelector('[data-case-feedback]');

    function drawCase(index) {
      currentCase = index;
      const item = cases[index];
      title.textContent = item.title;
      story.textContent = item.story;
      readings.innerHTML = '';
      Object.entries(item.readings).forEach(([label, value]) => {
        const card = document.createElement('div');
        const strong = document.createElement('strong');
        const span = document.createElement('span');
        strong.textContent = label;
        span.textContent = value;
        card.append(strong, span);
        readings.appendChild(card);
      });
      priority.innerHTML = '<option value="">Choose one</option>';
      Object.keys(item.readings).forEach((label) => {
        const option = document.createElement('option');
        option.value = label;
        option.textContent = label;
        priority.appendChild(option);
      });
      priority.value = '';
      context.value = '';
      report.value = '';
      feedback.textContent = 'Complete the three fields, then check your decisions.';
      feedback.className = 'case-feedback';
    }

    capstone.querySelector('[data-new-vitals-case]').addEventListener('click', () => {
      let next = currentCase;
      while (next === currentCase && cases.length > 1) next = Math.floor(Math.random() * cases.length);
      drawCase(next);
    });

    capstone.querySelector('[data-check-vitals-case]').addEventListener('click', () => {
      const item = cases[currentCase];
      if (!priority.value || !context.value.trim() || !report.value.trim()) {
        feedback.textContent = 'Complete the priority, patient context, and objective report before checking.';
        feedback.className = 'case-feedback warn';
        return;
      }
      const priorityCorrect = priority.value === item.priority;
      const contextText = context.value.toLowerCase();
      const contextMatched = item.context.some((phrase) => contextText.includes(phrase.split(' ')[0].toLowerCase()));
      const reportHasNumbers = /\d/.test(report.value);
      if (priorityCorrect && contextMatched && reportHasNumbers) {
        feedback.textContent = 'Strong work. You selected the priority finding, connected it to patient context, and used objective charting.';
        feedback.className = 'case-feedback success';
        store.capstoneComplete = true;
      } else {
        const tips = [];
        if (!priorityCorrect) tips.push(`reconsider which finding is least reliable or most immediately concerning`);
        if (!contextMatched) tips.push('name a specific symptom, trend, reliability problem, or safety concern');
        if (!reportHasNumbers) tips.push('include the actual vital-sign values');
        feedback.textContent = `Review and retry: ${tips.join('; ')}.`;
        feedback.className = 'case-feedback warn';
      }
      store.capstone = { case: currentCase, priority: priority.value, context: context.value, report: report.value };
      saveStore();
    });

    drawCase(Math.floor(Math.random() * cases.length));
  }

  updateProgress();
})();
