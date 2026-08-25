(() => {
  'use strict';

  const DAY_MS = 86400000;

  function todayKey() {
    const d = new Date();
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    );
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch] || ch));
  }

  function shuffle(list) {
    const items = list.slice();
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  function normalizeQuestion(q) {
    return {
      question: q.question || '',
      choices: q.choices || q.options || [],
      answer: q.answer || '',
      topic: q.topic || q.category || '',
      reason: q.reason || q.explanation || 'Review the topic and confirm why the correct answer best matches the patient-care priority.'
    };
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function readStreak(streakKey) {
    const data = readJson(streakKey, { count: 0, lastCompleted: '', best: 0 });
    return {
      count: Number(data.count) || 0,
      lastCompleted: data.lastCompleted || '',
      best: Number(data.best) || 0
    };
  }

  function recordCompletion(streakKey) {
    const today = todayKey();
    const streak = readStreak(streakKey);
    if (streak.lastCompleted === today) return streak;

    let next = 1;
    if (streak.lastCompleted) {
      const prev = new Date(`${streak.lastCompleted}T00:00:00`);
      const now = new Date(`${today}T00:00:00`);
      const diff = Math.round((now - prev) / DAY_MS);
      if (diff === 1) next = Math.max(1, streak.count + 1);
      else if (diff === 0) next = Math.max(1, streak.count);
    }

    const updated = {
      count: next,
      lastCompleted: today,
      best: Math.max(streak.best || 0, next)
    };
    writeJson(streakKey, updated);
    return updated;
  }

  function msUntilTomorrow() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    return Math.max(0, next - now);
  }

  function formatCountdown(ms) {
    const total = Math.floor(ms / 1000);
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function gradeMessage(score, total) {
    const ratio = total ? score / total : 0;
    if (ratio === 1) return 'Perfect run. Protect that streak tomorrow.';
    if (ratio >= 0.8) return 'Strong work. One more clean day keeps momentum going.';
    if (ratio >= 0.6) return 'Solid baseline. Review the misses and come back tomorrow.';
    return 'Useful diagnostic day. Re-read the explanations and try again tomorrow.';
  }

  function resultEmoji(correct) {
    return correct ? '🟩' : '🟥';
  }

  function start(config) {
    const {
      quizFile,
      storageKey,
      streakKey,
      levelLabel = 'EMT',
      shareTitle = 'Daily EMS Quiz',
      shareUrl = location.href
    } = config;

    const stage = document.getElementById('quizStage');
    const answeredLabel = document.getElementById('answeredLabel');
    const scoreBig = document.getElementById('scoreBig');
    const progressBar = document.getElementById('progressBar');
    const streakLabel = document.getElementById('streakLabel');
    const bestLabel = document.getElementById('bestLabel');
    const countdownLabel = document.getElementById('countdownLabel');
    const actionPrimary = document.getElementById('actionPrimary');
    const actionSecondary = document.getElementById('actionSecondary');
    const actionShare = document.getElementById('actionShare');
    const statusLine = document.getElementById('statusLine');

    if (!stage || !actionPrimary) return;

    let bank = [];
    let session = null;
    let index = 0;
    let selectedIndex = -1;
    let revealed = false;
    let countdownTimer = null;

    function syncHud() {
      const total = session?.questions?.length || 5;
      const answered = (session?.answers || []).filter((a) => a != null).length;
      const streak = readStreak(streakKey);
      if (answeredLabel) {
        answeredLabel.textContent = session?.completed
          ? `Finished ${session.score}/${total}`
          : `${Math.min(index + (revealed ? 1 : 0), total)} of ${total}`;
      }
      if (scoreBig) {
        scoreBig.textContent = session?.completed
          ? `${session.score}/${total}`
          : (answered ? `${answered}/${total}` : 'Ready');
      }
      if (progressBar) {
        const pct = session?.completed
          ? 100
          : Math.round(((index + (revealed ? 1 : 0)) / total) * 100);
        progressBar.style.width = `${pct}%`;
      }
      if (streakLabel) streakLabel.textContent = `🔥 ${streak.count}-day streak`;
      if (bestLabel) bestLabel.textContent = `Best ${streak.best || streak.count}`;
    }

    function startCountdown() {
      if (!countdownLabel) return;
      const tick = () => {
        countdownLabel.textContent = `Next quiz in ${formatCountdown(msUntilTomorrow())}`;
      };
      tick();
      clearInterval(countdownTimer);
      countdownTimer = window.setInterval(tick, 1000);
    }

    function persist() {
      writeJson(storageKey, session);
    }

    function ensureSession() {
      const today = todayKey();
      const saved = readJson(storageKey, null);
      if (saved && saved.date === today && Array.isArray(saved.questions) && saved.questions.length) {
        session = {
          date: today,
          questions: saved.questions.map(normalizeQuestion),
          answers: Array.isArray(saved.answers) ? saved.answers : Array(saved.questions.length).fill(null),
          correctMap: Array.isArray(saved.correctMap) ? saved.correctMap : Array(saved.questions.length).fill(null),
          completed: Boolean(saved.completed),
          score: Number(saved.score) || 0
        };
        return;
      }
      const questions = shuffle(bank).slice(0, Math.min(5, bank.length)).map(normalizeQuestion);
      session = {
        date: today,
        questions,
        answers: Array(questions.length).fill(null),
        correctMap: Array(questions.length).fill(null),
        completed: false,
        score: 0
      };
      persist();
    }

    function setActions({ primary, secondary, share, primaryDisabled }) {
      actionPrimary.textContent = primary;
      actionPrimary.hidden = !primary;
      actionPrimary.disabled = Boolean(primaryDisabled);
      if (actionSecondary) {
        actionSecondary.textContent = secondary || '';
        actionSecondary.hidden = !secondary;
      }
      if (actionShare) actionShare.hidden = !share;
    }

    function renderChoice(q, i, state) {
      const chosen = state.selectedIndex === i;
      const show = state.revealed;
      const isCorrect = q.choices[i] === q.answer;
      let cls = 'choice-btn';
      if (chosen) cls += ' selected';
      if (show && isCorrect) cls += ' correct';
      if (show && chosen && !isCorrect) cls += ' incorrect';
      return `<button type="button" class="${cls}" data-choice="${i}" ${show ? 'disabled' : ''} aria-pressed="${chosen ? 'true' : 'false'}">
        <span class="choice-marker">${String.fromCharCode(65 + i)}</span>
        <span class="choice-copy">${escapeHtml(q.choices[i])}</span>
      </button>`;
    }

    function renderQuestion() {
      const q = session.questions[index];
      const total = session.questions.length;
      selectedIndex = session.answers[index] == null ? -1 : session.answers[index];
      revealed = session.correctMap[index] != null;

      stage.innerHTML = `
        <article class="play-card" aria-live="polite">
          <div class="play-kicker">
            <span>Question ${index + 1} of ${total}</span>
            <span>${escapeHtml(levelLabel)} practice</span>
          </div>
          <h2 class="play-question">${escapeHtml(q.question)}</h2>
          ${q.topic ? `<p class="play-topic">${escapeHtml(q.topic)}</p>` : ''}
          <div class="choice-grid" role="group" aria-label="Answer choices">
            ${q.choices.map((_, i) => renderChoice(q, i, { selectedIndex, revealed })).join('')}
          </div>
          <div class="feedback-panel ${revealed ? 'is-open' : ''}" ${revealed ? '' : 'hidden'}>
            <strong>${session.correctMap[index] ? 'Correct' : 'Not quite'}</strong>
            <p><span>Answer:</span> ${escapeHtml(q.answer)}</p>
            <p>${escapeHtml(q.reason)}</p>
          </div>
        </article>
      `;

      stage.querySelectorAll('[data-choice]').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (revealed) return;
          selectedIndex = Number(btn.dataset.choice);
          session.answers[index] = selectedIndex;
          persist();
          renderQuestion();
          setActions({
            primary: 'Check answer',
            secondary: index > 0 ? 'Back' : '',
            share: false,
            primaryDisabled: selectedIndex < 0
          });
          if (statusLine) statusLine.textContent = 'Lock in your answer, then check it.';
        });
      });

      if (revealed) {
        const last = index >= total - 1;
        setActions({
          primary: last ? 'See results' : 'Next question',
          secondary: 'Review answer',
          share: false
        });
        if (statusLine) {
          statusLine.textContent = last
            ? 'Daily set complete — open your results.'
            : 'Nice. Keep the streak alive with the next question.';
        }
      } else {
        setActions({
          primary: 'Check answer',
          secondary: index > 0 ? 'Back' : '',
          share: false,
          primaryDisabled: selectedIndex < 0
        });
        if (statusLine) statusLine.textContent = 'Pick one answer to continue.';
      }
      syncHud();
    }

    function renderResults() {
      const total = session.questions.length;
      const streak = recordCompletion(streakKey);
      const misses = session.questions
        .map((q, i) => ({ q, i, ok: session.correctMap[i] }))
        .filter((row) => !row.ok);

      stage.innerHTML = `
        <section class="results-card">
          <div class="results-burst" aria-hidden="true"></div>
          <p class="results-eyebrow">Today’s ${escapeHtml(levelLabel)} result</p>
          <h2 class="results-score">${session.score}/${total}</h2>
          <p class="results-message">${escapeHtml(gradeMessage(session.score, total))}</p>
          <div class="results-grid" aria-label="Answer grid">${session.correctMap.map((ok) => `<span>${resultEmoji(Boolean(ok))}</span>`).join('')}</div>
          <div class="results-stats">
            <div><strong>${streak.count}</strong><span>Day streak</span></div>
            <div><strong>${streak.best || streak.count}</strong><span>Best streak</span></div>
            <div><strong>${total - misses.length}</strong><span>Correct</span></div>
          </div>
          <p class="results-countdown" id="resultsCountdown">Next quiz in ${formatCountdown(msUntilTomorrow())}</p>
          ${misses.length ? `
            <div class="miss-review">
              <h3>Review misses</h3>
              ${misses.map(({ q, i }) => `
                <article>
                  <strong>Q${i + 1}</strong>
                  <p>${escapeHtml(q.question)}</p>
                  <p class="miss-answer"><span>Correct:</span> ${escapeHtml(q.answer)}</p>
                </article>
              `).join('')}
            </div>
          ` : `<p class="perfect-note">No misses today. Screenshot this and share it with your crew.</p>`}
          <div class="results-next">
            <a class="btn btn-primary" href="${levelLabel === 'Paramedic' ? '/quiz/emt_quiz.html' : '/quiz/paramedic_quiz.html'}">Try the ${levelLabel === 'Paramedic' ? 'EMT' : 'Paramedic'} quiz</a>
            <a class="btn btn-secondary" href="/quiz/medword.html">Play MedWord</a>
            <a class="btn btn-ghost" href="/quiz/">Quiz home</a>
          </div>
        </section>
      `;

      setActions({ primary: 'Share result', secondary: 'Quiz home', share: false });
      if (statusLine) statusLine.textContent = 'Share your score, then come back tomorrow for a new set.';
      syncHud();
      startCountdown();
      const cd = document.getElementById('resultsCountdown');
      if (cd && countdownLabel) {
        clearInterval(countdownTimer);
        countdownTimer = window.setInterval(() => {
          const text = `Next quiz in ${formatCountdown(msUntilTomorrow())}`;
          cd.textContent = text;
          countdownLabel.textContent = text;
        }, 1000);
      }
    }

    function checkAnswer() {
      if (selectedIndex < 0 || revealed) return;
      const q = session.questions[index];
      const correct = q.choices[selectedIndex] === q.answer;
      session.answers[index] = selectedIndex;
      session.correctMap[index] = correct;
      revealed = true;
      persist();
      renderQuestion();
    }

    function advance() {
      if (!revealed) {
        checkAnswer();
        return;
      }
      if (index >= session.questions.length - 1) {
        session.score = session.correctMap.filter(Boolean).length;
        session.completed = true;
        persist();
        recordCompletion(streakKey);
        renderResults();
        return;
      }
      index += 1;
      revealed = session.correctMap[index] != null;
      selectedIndex = session.answers[index] == null ? -1 : session.answers[index];
      renderQuestion();
    }

    function goBack() {
      if (index <= 0) {
        location.href = '/quiz/';
        return;
      }
      index -= 1;
      revealed = session.correctMap[index] != null;
      selectedIndex = session.answers[index] == null ? -1 : session.answers[index];
      renderQuestion();
    }

    async function shareResult() {
      const total = session.questions.length;
      const streak = readStreak(streakKey);
      const grid = session.correctMap.map((ok) => resultEmoji(Boolean(ok))).join('');
      const text = `${shareTitle} ${session.date}
Score: ${session.score}/${total}  •  🔥 Streak ${streak.count}
${grid}
${shareUrl}`;
      try {
        if (navigator.share) {
          await navigator.share({ title: shareTitle, text, url: shareUrl });
          if (statusLine) statusLine.textContent = 'Shared. See you tomorrow.';
          return;
        }
      } catch (_) {}
      try {
        await navigator.clipboard.writeText(text);
        if (statusLine) statusLine.textContent = 'Result copied — paste it in a message or post.';
      } catch (_) {
        if (statusLine) statusLine.textContent = 'Copy failed. Long-press and copy the score manually.';
      }
    }

    actionPrimary.addEventListener('click', () => {
      if (session?.completed) shareResult();
      else advance();
    });
    actionSecondary?.addEventListener('click', () => {
      if (session?.completed) {
        location.href = '/quiz/';
        return;
      }
      if (revealed && actionSecondary.textContent === 'Review answer') {
        stage.querySelector('.feedback-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      goBack();
    });
    actionShare?.addEventListener('click', shareResult);

    stage.innerHTML = '<div class="loading">Loading today’s quiz…</div>';
    fetch(quizFile)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        bank = Array.isArray(data) ? data : (data.quiz || []);
        ensureSession();
        syncHud();
        if (session.completed) {
          index = session.questions.length - 1;
          renderResults();
        } else {
          index = Math.max(0, session.answers.findIndex((a) => a == null));
          if (index < 0) index = 0;
          // Resume after last revealed question if mid-set.
          const firstOpen = session.correctMap.findIndex((v) => v == null);
          index = firstOpen < 0 ? 0 : firstOpen;
          renderQuestion();
        }
      })
      .catch((err) => {
        console.error(err);
        stage.innerHTML = '<div class="loading">Failed to load questions. Refresh and try again.</div>';
        setActions({ primary: '', secondary: 'Quiz home', share: false });
      });
  }

  window.EMSCodeSimDailyQuiz = Object.freeze({ start, readStreak, todayKey });
})();
