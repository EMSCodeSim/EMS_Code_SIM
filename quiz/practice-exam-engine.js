(function () {
  'use strict';

  const TOPICS = [
    'Airway, Respiration & Ventilation',
    'Cardiology & Resuscitation',
    'Trauma',
    'Medical Emergencies',
    'Obstetrics & Gynecology',
    'EMS Operations'
  ];

  // Approximate EMT cognitive domain emphasis for practice exams.
  const WEIGHTS = {
    'Airway, Respiration & Ventilation': 0.18,
    'Cardiology & Resuscitation': 0.24,
    'Trauma': 0.15,
    'Medical Emergencies': 0.27,
    'Obstetrics & Gynecology': 0.06,
    'EMS Operations': 0.10
  };

  const MODES = {
    quick: { id: 'quick', label: 'Quick check', count: 20, minutes: 20, copy: '20 questions · 20 minutes' },
    standard: { id: 'standard', label: 'Standard practice', count: 40, minutes: 40, copy: '40 questions · 40 minutes' },
    full: { id: 'full', label: 'Full practice exam', count: 60, minutes: 60, copy: '60 questions · 60 minutes' }
  };

  function shuffle(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function byTopic(pool) {
    const map = {};
    TOPICS.forEach(t => { map[t] = []; });
    pool.forEach(q => {
      const topic = TOPICS.includes(q.topic) ? q.topic : 'Medical Emergencies';
      (map[topic] || (map[topic] = [])).push(q);
    });
    return map;
  }

  function allocateCounts(total, available) {
    const raw = TOPICS.map(topic => ({
      topic,
      ideal: total * (WEIGHTS[topic] || 0),
      have: (available[topic] || []).length
    }));
    const counts = {};
    let assigned = 0;
    raw.forEach(row => {
      const n = Math.min(row.have, Math.floor(row.ideal));
      counts[row.topic] = n;
      assigned += n;
    });
    let remaining = Math.min(total, TOPICS.reduce((sum, t) => sum + (available[t] || []).length, 0)) - assigned;
    const order = raw.slice().sort((a, b) => (b.ideal - counts[b.topic]) - (a.ideal - counts[a.topic]));
    let guard = 0;
    while (remaining > 0 && guard < 1000) {
      let progressed = false;
      for (const row of order) {
        if (remaining <= 0) break;
        if (counts[row.topic] < row.have) {
          counts[row.topic] += 1;
          remaining -= 1;
          progressed = true;
        }
      }
      if (!progressed) break;
      guard += 1;
    }
    return counts;
  }

  function buildExam(pool, modeId) {
    const mode = MODES[modeId] || MODES.standard;
    const grouped = byTopic(pool);
    const counts = allocateCounts(mode.count, grouped);
    const selected = [];
    TOPICS.forEach(topic => {
      selected.push(...shuffle(grouped[topic] || []).slice(0, counts[topic] || 0));
    });
    const exam = shuffle(selected).slice(0, mode.count).map((q, index) => ({
      index,
      question: q.question,
      choices: shuffle((q.choices || q.options || []).slice()),
      answer: q.answer,
      reason: q.reason || q.explanation || 'Review why the correct answer best matches the patient-care priority.',
      topic: q.topic || 'Medical Emergencies',
      subtopic: q.subtopic || q.topic || 'General'
    }));
    return { mode, questions: exam, domainCounts: counts };
  }

  function scoreExam(questions, answers) {
    const missed = {};
    let correct = 0;
    const details = questions.map((q, i) => {
      const selected = answers[i];
      const isCorrect = selected === q.answer;
      if (isCorrect) correct += 1;
      else missed[q.topic] = (missed[q.topic] || 0) + 1;
      return {
        index: i,
        topic: q.topic,
        subtopic: q.subtopic,
        question: q.question,
        selected: selected || null,
        answer: q.answer,
        reason: q.reason,
        correct: isCorrect
      };
    });
    const byTopic = {};
    TOPICS.forEach(topic => {
      const subset = details.filter(d => d.topic === topic);
      if (!subset.length) return;
      const right = subset.filter(d => d.correct).length;
      byTopic[topic] = { total: subset.length, correct: right, percent: Math.round((right / subset.length) * 100) };
    });
    return {
      correct,
      total: questions.length,
      percent: questions.length ? Math.round((correct / questions.length) * 100) : 0,
      missed,
      byTopic,
      details
    };
  }

  function formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  window.EMSCodeSimPracticeExam = {
    TOPICS, WEIGHTS, MODES, buildExam, scoreExam, formatTime, shuffle
  };
})();
