'use strict';

const DATA_URL = '/data/ems-encyclopedia.json';
const DAILY_KEY = 'emsEncyclopediaDailyV1';
const STUDY_KEY = 'emsEncyclopediaStudyV1';
const FAVORITES_KEY = 'emsEncyclopediaFavorites';
const $ = selector => document.querySelector(selector);
const slug = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let data;
let dailyTopic;
let questions = [];
let questionIndex = 0;
let score = 0;
let answered = false;

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function previousDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day - 1);
  return localDateKey(date);
}

function hashString(value) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getDailyState() {
  try {
    return JSON.parse(localStorage.getItem(DAILY_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveDailyState(state) {
  localStorage.setItem(DAILY_KEY, JSON.stringify(state));
}

function getStudyState() {
  try {
    const state = JSON.parse(localStorage.getItem(STUDY_KEY) || '{}');
    state.topics = state.topics || {};
    state.totalAnswered = Number(state.totalAnswered) || 0;
    state.totalCorrect = Number(state.totalCorrect) || 0;
    state.currentStreak = Number(state.currentStreak) || 0;
    return state;
  } catch {
    return {topics:{}, totalAnswered:0, totalCorrect:0, currentStreak:0};
  }
}

function saveStudyResult(topic, correct) {
  const state = getStudyState();
  const id = slug(topic.term);
  const record = state.topics[id] || {correct:0, wrong:0};
  if (correct) record.correct += 1;
  else record.wrong += 1;
  record.lastResult = correct ? 'correct' : 'wrong';
  record.lastStudied = Date.now();
  state.topics[id] = record;
  state.totalAnswered += 1;
  if (correct) state.totalCorrect += 1;
  localStorage.setItem(STUDY_KEY, JSON.stringify(state));
}

function chooseDailyTopic() {
  const dateKey = localDateKey();
  const index = hashString(`EMSCodeSim:${dateKey}`) % data.entries.length;
  return data.entries[index];
}

function sampleDistractors(topic, count, seedOffset = 0) {
  const sameCategory = data.entries.filter(entry => entry.term !== topic.term && entry.category === topic.category);
  const pool = sameCategory.length >= count ? sameCategory : data.entries.filter(entry => entry.term !== topic.term);
  const chosen = [];
  let cursor = hashString(`${localDateKey()}:${topic.term}:${seedOffset}`) % pool.length;
  while (chosen.length < count && chosen.length < pool.length) {
    const candidate = pool[cursor % pool.length];
    if (!chosen.includes(candidate)) chosen.push(candidate);
    cursor += 17;
  }
  return chosen;
}

function shuffled(values, seed) {
  const result = [...values];
  let value = hashString(seed);
  for (let i = result.length - 1; i > 0; i -= 1) {
    value = Math.imul(value ^ (value >>> 15), 2246822519) >>> 0;
    const j = value % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildQuestions(topic) {
  const distractorsA = sampleDistractors(topic, 3, 1);
  const distractorsB = sampleDistractors(topic, 3, 2);
  const applicationPool = sampleDistractors(topic, 2, 3);
  return [
    {
      type:'Identify the topic',
      prompt:`Which EMS term best matches this description? “${topic.summary}”`,
      choices: shuffled([topic.term, ...distractorsA.map(item => item.term)], `${localDateKey()}:1`),
      answer:topic.term,
      explanation:topic.details
    },
    {
      type:'Field takeaway',
      prompt:`Which field takeaway belongs with ${topic.term}?`,
      choices: shuffled([topic.remember, ...distractorsB.map(item => item.remember)], `${localDateKey()}:2`),
      answer:topic.remember,
      explanation:`${topic.term}: ${topic.remember}`
    },
    {
      type:'Match the meaning',
      prompt:`Which statement correctly describes ${topic.term}?`,
      choices: shuffled([topic.details, ...applicationPool.map(item => item.details), 'This term has no role in EMS assessment or operations.'], `${localDateKey()}:3`),
      answer:topic.details,
      explanation:topic.summary
    }
  ];
}

function renderTopic() {
  $('#topicCategory').textContent = dailyTopic.categoryTitle;
  $('#topicTerm').textContent = dailyTopic.term;
  $('#topicSummary').textContent = dailyTopic.summary;
  $('#topicDetails').textContent = dailyTopic.details;
  $('#topicRemember').textContent = dailyTopic.remember;
  $('#todayLabel').textContent = new Intl.DateTimeFormat('en-US', {weekday:'long', month:'long', day:'numeric'}).format(new Date());
  const links = dailyTopic.links || [];
  $('#topicLinks').innerHTML = [
    `<a href="/ems-encyclopedia.html#${slug(dailyTopic.term)}">Open full entry</a>`,
    ...links.map(link => `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`)
  ].join('');
  $('#reviewTopicLink').href = `/ems-encyclopedia.html#${slug(dailyTopic.term)}`;
  $('#loadingState').hidden = true;
  $('#topicPanel').hidden = false;
}

function renderProgressCards() {
  const daily = getDailyState();
  const study = getStudyState();
  const records = Object.values(study.topics);
  const mastered = records.filter(record => record.correct >= 2 && record.correct > record.wrong).length;
  let favorites = [];
  try { favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch { favorites = []; }
  $('#dailyStreak').textContent = daily.streak || 0;
  $('#streakMessage').textContent = daily.lastCompleted === localDateKey() ? 'Today complete' : 'Complete today’s challenge';
  $('#savedCount').textContent = favorites.length;
  $('#masteredCount').textContent = mastered;
  $('#studiedTopics').textContent = records.length;
}

function startChallenge() {
  questions = buildQuestions(dailyTopic);
  questionIndex = 0;
  score = 0;
  $('#topicPanel').hidden = true;
  $('#completePanel').hidden = true;
  $('#challengePanel').hidden = false;
  renderQuestion();
}

function renderQuestion() {
  answered = false;
  const question = questions[questionIndex];
  $('#challengeProgress').textContent = `Question ${questionIndex + 1} of ${questions.length}`;
  $('#challengeScore').textContent = `${score} correct`;
  $('#challengeBar').style.width = `${(questionIndex / questions.length) * 100}%`;
  $('#questionType').textContent = question.type;
  $('#questionPrompt').textContent = question.prompt;
  $('#answerFeedback').hidden = true;
  $('#nextQuestion').hidden = true;
  $('#answerChoices').innerHTML = question.choices.map((choice, index) => `<button type="button" data-index="${index}">${escapeHtml(choice)}</button>`).join('');
}

function answerQuestion(button) {
  if (answered) return;
  answered = true;
  const question = questions[questionIndex];
  const choice = question.choices[Number(button.dataset.index)];
  const correct = choice === question.answer;
  if (correct) score += 1;
  saveStudyResult(dailyTopic, correct);
  [...$('#answerChoices').querySelectorAll('button')].forEach((item, index) => {
    item.disabled = true;
    const value = question.choices[index];
    if (value === question.answer) item.classList.add('correct');
    else if (item === button) item.classList.add('incorrect');
  });
  const feedback = $('#answerFeedback');
  feedback.className = `answer-feedback ${correct ? 'correct' : 'incorrect'}`;
  feedback.innerHTML = `<strong>${correct ? 'Correct.' : 'Not quite.'}</strong><p>${escapeHtml(question.explanation)}</p>`;
  feedback.hidden = false;
  $('#challengeScore').textContent = `${score} correct`;
  $('#challengeBar').style.width = `${((questionIndex + 1) / questions.length) * 100}%`;
  $('#nextQuestion').textContent = questionIndex === questions.length - 1 ? 'Finish challenge' : 'Next question';
  $('#nextQuestion').hidden = false;
}

function nextQuestion() {
  if (!answered) return;
  if (questionIndex < questions.length - 1) {
    questionIndex += 1;
    renderQuestion();
  } else {
    completeChallenge();
  }
}

function completeChallenge() {
  const today = localDateKey();
  const state = getDailyState();
  if (state.lastCompleted !== today) {
    state.streak = state.lastCompleted === previousDateKey(today) ? (Number(state.streak) || 0) + 1 : 1;
  }
  state.lastCompleted = today;
  state.lastScore = score;
  state.completedDays = Number(state.completedDays) || 0;
  if (!state.history || !state.history[today]) state.completedDays += 1;
  state.history = state.history || {};
  state.history[today] = {score, topic:slug(dailyTopic.term), completedAt:Date.now()};
  saveDailyState(state);
  $('#challengePanel').hidden = true;
  $('#completePanel').hidden = false;
  $('#completeHeading').textContent = score === 3 ? 'Excellent recall' : score === 2 ? 'Good work' : 'Today’s topic is in your review queue';
  $('#completeSummary').textContent = score === 3 ? `You answered all three questions about ${dailyTopic.term} correctly.` : `You scored ${score} out of 3. The topic has been added to your study history so it can return during weak-area review.`;
  $('#finalScore').textContent = `${score}/3`;
  $('#finalStreak').textContent = state.streak;
  renderProgressCards();
  window.scrollTo({top:0, behavior:'smooth'});
}

async function init() {
  const response = await fetch(DATA_URL, {cache:'no-store'});
  if (!response.ok) throw new Error('Could not load encyclopedia data');
  data = await response.json();
  dailyTopic = chooseDailyTopic();
  renderTopic();
  renderProgressCards();
  const daily = getDailyState();
  if (daily.lastCompleted === localDateKey()) {
    $('#startDailyChallenge').textContent = 'Practice today’s challenge again';
  }
  $('#startDailyChallenge').addEventListener('click', startChallenge);
  $('#answerChoices').addEventListener('click', event => {
    const button = event.target.closest('button[data-index]');
    if (button) answerQuestion(button);
  });
  $('#nextQuestion').addEventListener('click', nextQuestion);
}

init().catch(error => {
  $('#loadingState').innerHTML = '<h2>Daily topic unavailable</h2><p>Confirm that <code>/data/ems-encyclopedia.json</code> is uploaded.</p>';
  console.error(error);
});
