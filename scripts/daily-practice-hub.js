(function () {
  'use strict';

  const STORAGE_KEY = 'emscodesim-daily-practice';
  const STAGE_KEY = 'emscodesim-career-stage';

  const SIMULATORS = [
    { label: 'Blood Pressure', href: '/vitals/bp.html', tag: 'Vital signs' },
    { label: 'Pulse Trainer', href: '/vitals/pulse.html', tag: 'Vital signs' },
    { label: 'Breath Sounds', href: '/vitals/breath-sound-simulator.html', tag: 'Respiratory' },
    { label: 'Pulse Oximetry', href: '/vitals/pulse-ox.html', tag: 'Vital signs' },
    { label: 'GCS Trainer', href: '/vitals/gcs.html', tag: 'Neurologic' },
    { label: 'Stroke Assessment', href: '/vitals/stroke.html', tag: 'Neurologic' },
    { label: 'Blood Glucose', href: '/vitals/bgl.html', tag: 'Vital signs' },
    { label: 'Skin Signs', href: '/vitals/skin.html', tag: 'Perfusion' }
  ];

  const SCENARIOS = [
    { id: 'horse_crush', label: 'Horse-Crush Trauma', href: '/vitals/visual-patient.html?case=horse_crush&training=assessment&reset=1', tag: 'Featured scenario' },
    { id: 'asthma', label: 'Respiratory Distress', href: '/vitals/visual-patient.html?case=asthma&training=learning&reset=1', tag: 'Medical scenario' },
    { id: 'stroke', label: 'Possible Stroke', href: '/vitals/visual-patient.html?case=stroke&training=learning&reset=1', tag: 'Medical scenario' },
    { id: 'hypoglycemia', label: 'Altered Mental Status', href: '/vitals/visual-patient.html?case=hypoglycemia&training=learning&reset=1', tag: 'Medical scenario' },
    { id: 'trauma', label: 'Blunt Trauma', href: '/vitals/visual-patient.html?case=trauma&training=learning&reset=1', tag: 'Trauma scenario' },
    { id: 'pediatric', label: 'Sick Pediatric Patient', href: '/vitals/visual-patient.html?case=pediatric&training=learning&reset=1', tag: 'Pediatric scenario' }
  ];

  const NREMT_TOPICS = [
    { label: 'Airway & Respiration', href: '/quiz/emt_quiz.html?topic=Airway%2C%20Respiration%20%26%20Ventilation', study: '/breath-sound-training.html' },
    { label: 'Cardiology & CPR', href: '/quiz/emt_quiz.html?topic=Cardiology%20%26%20Resuscitation', study: '/cpr-training.html' },
    { label: 'Trauma', href: '/quiz/emt_quiz.html?topic=Trauma', study: '/vitals/scenario-launcher.html' },
    { label: 'Medical', href: '/quiz/emt_quiz.html?topic=Medical%20Emergencies', study: '/abc-training.html' },
    { label: 'Operations', href: '/quiz/emt_quiz.html?topic=EMS%20Operations', study: '/nremt-skill-sheets.html' },
    { label: 'OB/GYN', href: '/quiz/emt_quiz.html?topic=Obstetrics%20%26%20Gynecology', study: '/APGAR/' }
  ];

  function dayIndex() {
    const d = new Date();
    const start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / 86400000);
  }

  function todayKey() {
    return new Date().toISOString().split('T')[0];
  }

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (_) {
      return {};
    }
  }

  function writeState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function normalizeStreak(state) {
    const today = todayKey();
    if (!state.date) {
      state.date = today;
      state.completed = [];
      state.streak = state.streak || 0;
      return state;
    }
    if (state.date === today) return state;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split('T')[0];
    const finishedYesterday = Array.isArray(state.completed) && state.completed.length >= 2;
    if (state.date === yesterdayKey && finishedYesterday) {
      state.streak = (state.streak || 0) + 1;
    } else if (state.date !== today) {
      state.streak = finishedYesterday && state.date === yesterdayKey ? state.streak || 1 : 0;
    }
    state.date = today;
    state.completed = [];
    return state;
  }

  function stageId() {
    try {
      return localStorage.getItem(STAGE_KEY) || 'explore';
    } catch (_) {
      return 'explore';
    }
  }

  function pick(list, offset) {
    return list[(dayIndex() + offset) % list.length];
  }

  function buildActivities() {
    const stage = stageId();
    const sim = pick(SIMULATORS, 0);
    const scenario = pick(SCENARIOS, 1);
    const quizHref = stage === 'career' || stage === 'senior' ? '/quiz/paramedic_quiz.html' : '/quiz/emt_quiz.html';
    const quizLabel = quizHref.includes('paramedic') ? 'Paramedic Quiz' : 'Daily EMT Quiz';

    return [
      {
        id: 'quiz',
        kicker: 'Step 1',
        title: quizLabel,
        copy: 'Five NREMT-style questions with explanations.',
        href: quizHref,
        cta: 'Start quiz'
      },
      {
        id: 'fact',
        kicker: 'Step 2',
        title: 'Daily EMS Fact',
        copy: 'One focused concept to remember today.',
        href: '/quiz/ems_fact.html',
        cta: 'Learn fact'
      },
      {
        id: 'protocol',
        kicker: 'Step 3',
        title: 'Protocol Drill',
        copy: 'Apply a local protocol to a short patient case.',
        href: '/daily-protocol.html',
        cta: 'Open drill'
      },
      {
        id: 'skill',
        kicker: 'Step 4',
        title: stage === 'student' || stage === 'new' ? scenario.label : sim.label,
        copy: stage === 'student' || stage === 'new'
          ? 'Work a patient from assessment through reassessment.'
          : `${sim.tag} practice in about two minutes.`,
        href: stage === 'student' || stage === 'new' ? scenario.href : sim.href,
        cta: stage === 'student' || stage === 'new' ? 'Run scenario' : 'Practice skill'
      }
    ];
  }

  function formatDate() {
    return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function renderShell() {
    const mount = document.getElementById('dailyPracticeGrid');
    if (!mount) return;

    let state = normalizeStreak(readState());
    writeState(state);

    const completed = new Set(Array.isArray(state.completed) ? state.completed : []);
    const activities = buildActivities();
    const dateEl = document.getElementById('dailyPracticeDate');
    const streakEl = document.getElementById('dailyPracticeStreak');
    const progressEl = document.getElementById('dailyPracticeProgress');
    const topicsEl = document.getElementById('dailyPracticeTopics');

    if (dateEl) dateEl.textContent = formatDate();
    if (streakEl) {
      const streak = state.streak || 0;
      streakEl.textContent = streak ? `${streak}-day streak` : 'Start your streak today';
      streakEl.hidden = false;
    }
    if (progressEl) {
      const done = activities.filter(a => completed.has(a.id)).length;
      progressEl.textContent = `${done} of ${activities.length} complete today`;
    }

    mount.innerHTML = activities.map(item => {
      const done = completed.has(item.id);
      return `<a class="daily-practice-card${done ? ' is-complete' : ''}" href="${item.href}" data-activity="${item.id}">
        <span>${item.kicker}${done ? ' · Done' : ''}</span>
        <strong>${item.title}</strong>
        <small>${item.copy}</small>
        <em>${done ? 'Open again' : item.cta} →</em>
      </a>`;
    }).join('');

    mount.querySelectorAll('[data-activity]').forEach(link => {
      link.addEventListener('click', () => {
        const id = link.getAttribute('data-activity');
        const next = normalizeStreak(readState());
        const set = new Set(Array.isArray(next.completed) ? next.completed : []);
        set.add(id);
        next.completed = [...set];
        writeState(next);
      });
    });

    if (topicsEl) {
      topicsEl.innerHTML = `<div class="daily-topic-head"><strong>Study by NREMT topic</strong><a href="/quiz/emt_practice_exam.html" style="color:#b9def4;font-weight:800;text-decoration:none">Timed practice exam →</a></div><div class="daily-topic-chips">${NREMT_TOPICS.map(topic =>
        `<a class="daily-topic-chip" href="${topic.href}">${topic.label}</a>`
      ).join('')}</div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', renderShell);
  window.EMSCodeSimDailyPractice = { render: renderShell, buildActivities };
})();
