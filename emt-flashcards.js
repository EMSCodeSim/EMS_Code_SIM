(() => {
  'use strict';
  const DATA_URL = '/data/emt-flashcards.json';
  const STORAGE_KEY = 'emscodeFlashcardProgressV2';
  const LEGACY_KEY = 'emscodeFlashcardProgressV1';
  const state = {
    data: null,
    selected: new Set(),
    deck: [],
    index: 0,
    flipped: false,
    lastOrder: [],
    session: { correct: 0, incorrect: 0, skipped: 0, incorrectIds: [] },
    progress: { cards: {}, favorites: [] }
  };
  const $ = (id) => document.getElementById(id);
  const els = {};

  function shuffle(items, previousOrder = []) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    if (copy.length > 2 && previousOrder.length === copy.length && copy.every((card, i) => card.id === previousOrder[i])) {
      [copy[0], copy[1]] = [copy[1], copy[0]];
    }
    return copy;
  }

  function normalizeProgress(raw) {
    const progress = { cards: {}, favorites: Array.isArray(raw?.favorites) ? raw.favorites : [] };
    if (raw?.cards && typeof raw.cards === 'object') progress.cards = raw.cards;
    if (raw?.status && typeof raw.status === 'object') {
      Object.entries(raw.status).forEach(([id, status]) => {
        progress.cards[id] = {
          correct: status === 'known' ? 1 : 0,
          incorrect: status === 'review' ? 1 : 0,
          last: status === 'known' ? 'correct' : 'incorrect'
        };
      });
    }
    return progress;
  }

  function loadProgress() {
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (current) state.progress = normalizeProgress(current);
      else {
        const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '{}');
        state.progress = normalizeProgress(legacy);
      }
    } catch (_) {
      state.progress = { cards: {}, favorites: [] };
    }
  }

  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); } catch (_) {}
    updateStats();
  }

  function cacheEls() {
    ['categoryGrid','selectedCount','cardSearch','deckOrder','startSelected','randomMix','selectAll','clearAll','reviewMissed','favoritesOnly','studyShell','sessionSummary','progressFill','progressText','sessionText','flashcard','cardCategory','cardLevel','cardTerm','cardDefinition','cardNote','flipButton','reviewButton','knownButton','favoriteButton','previousButton','nextButton','restartButton','incorrectAgainButton','newDeckButton','summaryTotal','summaryKnown','summaryReview','deckTotal','masteredTotal','reviewTotal','favoriteTotal','statusMessage','cardHistory'].forEach(id => els[id] = $(id));
  }

  function cardRecord(id) {
    return state.progress.cards[id] || { correct: 0, incorrect: 0, last: null };
  }

  function updateStats() {
    if (!state.data) return;
    const records = Object.values(state.progress.cards);
    els.deckTotal.textContent = state.data.cards.length;
    els.masteredTotal.textContent = records.filter(r => r.last === 'correct').length;
    els.reviewTotal.textContent = records.filter(r => r.last === 'incorrect').length;
    els.favoriteTotal.textContent = state.progress.favorites.length;
  }

  function renderCategories() {
    els.categoryGrid.innerHTML = '';
    state.data.categories.forEach(cat => {
      const label = document.createElement('label');
      label.className = 'category-choice';
      label.innerHTML = `<input type="checkbox" value="${cat.name}" checked><span><strong>${cat.name}</strong><small>${cat.count} cards</small></span>`;
      const input = label.querySelector('input');
      state.selected.add(cat.name);
      input.addEventListener('change', () => {
        input.checked ? state.selected.add(cat.name) : state.selected.delete(cat.name);
        updateSelection();
      });
      els.categoryGrid.appendChild(label);
    });
    updateSelection();
  }

  function matchesQuery(card, query) {
    return !query || [card.front, card.back, card.note, card.category, ...(card.tags || [])].join(' ').toLowerCase().includes(query);
  }

  function updateSelection() {
    const query = els.cardSearch.value.trim().toLowerCase();
    const count = state.data.cards.filter(c => state.selected.has(c.category) && matchesQuery(c, query)).length;
    els.selectedCount.textContent = `${count} cards match your selection`;
  }

  function orderDeck(cards, mode) {
    const order = els.deckOrder.value;
    if (mode === 'review') return shuffle(cards, state.lastOrder);
    if (mode === 'favorites') return shuffle(cards, state.lastOrder);
    if (mode === 'random' || order === 'random') return shuffle(cards, state.lastOrder);
    if (order === 'alphabetical') return [...cards].sort((a,b) => a.front.localeCompare(b.front));
    if (order === 'category') return [...cards].sort((a,b) => a.category.localeCompare(b.category) || a.front.localeCompare(b.front));
    if (order === 'incorrect-first') {
      return [...cards].sort((a,b) => {
        const ar = cardRecord(a.id).last === 'incorrect' ? 0 : 1;
        const br = cardRecord(b.id).last === 'incorrect' ? 0 : 1;
        return ar - br || a.category.localeCompare(b.category) || a.front.localeCompare(b.front);
      });
    }
    return shuffle(cards, state.lastOrder);
  }

  function buildDeck(mode = 'selected') {
    const query = els.cardSearch.value.trim().toLowerCase();
    let cards = state.data.cards.filter(c => state.selected.has(c.category) && matchesQuery(c, query));
    if (mode === 'review') cards = state.data.cards.filter(c => cardRecord(c.id).last === 'incorrect' && matchesQuery(c, query));
    if (mode === 'favorites') cards = state.data.cards.filter(c => state.progress.favorites.includes(c.id) && matchesQuery(c, query));
    if (mode === 'random') cards = state.data.cards.filter(c => matchesQuery(c, query));
    if (!cards.length) {
      els.statusMessage.innerHTML = '<div class="empty-state">No cards match this deck. Select a category, clear the search, or answer some cards incorrectly first.</div>';
      return;
    }
    state.deck = orderDeck(cards, mode);
    state.lastOrder = state.deck.map(c => c.id);
    state.index = 0;
    state.flipped = false;
    state.session = { correct: 0, incorrect: 0, skipped: 0, incorrectIds: [] };
    els.statusMessage.textContent = '';
    els.sessionSummary.classList.remove('active');
    els.studyShell.classList.add('active');
    renderCard();
    els.studyShell.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderCard() {
    const card = state.deck[state.index];
    if (!card) { finishSession(); return; }
    state.flipped = false;
    els.flashcard.classList.remove('is-flipped');
    els.flashcard.setAttribute('aria-pressed', 'false');
    els.flashcard.setAttribute('aria-label', `Question: ${card.front}. Show answer.`);
    els.cardCategory.textContent = card.category;
    els.cardLevel.textContent = card.level || 'EMT Prep';
    els.cardTerm.textContent = card.front;
    els.cardDefinition.textContent = card.back;
    els.cardNote.textContent = card.note || 'Connect this term to a patient finding, piece of equipment, or assessment step.';
    els.progressText.textContent = `Card ${state.index + 1} of ${state.deck.length}`;
    els.sessionText.textContent = `Correct ${state.session.correct} • Incorrect ${state.session.incorrect} • Skipped ${state.session.skipped}`;
    els.progressFill.style.width = `${((state.index + 1) / state.deck.length) * 100}%`;
    els.flipButton.hidden = false;
    els.reviewButton.hidden = true;
    els.knownButton.hidden = true;
    const record = cardRecord(card.id);
    const attempts = (record.correct || 0) + (record.incorrect || 0);
    els.cardHistory.textContent = attempts ? `Previous results: ${record.correct || 0} correct, ${record.incorrect || 0} incorrect. Last answer: ${record.last || 'none'}.` : 'No previous answer recorded for this card.';
    updateFavoriteButton();
  }

  function flipCard(force) {
    state.flipped = typeof force === 'boolean' ? force : !state.flipped;
    els.flashcard.classList.toggle('is-flipped', state.flipped);
    els.flashcard.setAttribute('aria-pressed', String(state.flipped));
    els.flashcard.setAttribute('aria-label', state.flipped ? 'Answer shown. Choose correct or incorrect.' : 'Show flashcard answer');
    els.flipButton.hidden = state.flipped;
    els.reviewButton.hidden = !state.flipped;
    els.knownButton.hidden = !state.flipped;
  }

  function rate(result) {
    const card = state.deck[state.index];
    if (!card || !state.flipped) return;
    const record = cardRecord(card.id);
    if (result === 'correct') {
      record.correct = (record.correct || 0) + 1;
      state.session.correct++;
    } else {
      record.incorrect = (record.incorrect || 0) + 1;
      state.session.incorrect++;
      if (!state.session.incorrectIds.includes(card.id)) state.session.incorrectIds.push(card.id);
    }
    record.last = result;
    record.updated = new Date().toISOString();
    state.progress.cards[card.id] = record;
    saveProgress();
    next(false);
  }

  function next(countSkip = true) {
    if (countSkip && !state.flipped) state.session.skipped++;
    if (state.index < state.deck.length - 1) {
      state.index++;
      renderCard();
    } else finishSession();
  }

  function previous() {
    if (state.index > 0) {
      state.index--;
      renderCard();
    }
  }

  function finishSession() {
    els.studyShell.classList.remove('active');
    els.sessionSummary.classList.add('active');
    els.summaryTotal.textContent = state.deck.length;
    els.summaryKnown.textContent = state.session.correct;
    els.summaryReview.textContent = state.session.incorrect;
    els.incorrectAgainButton.hidden = state.session.incorrectIds.length === 0;
    els.sessionSummary.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function studySessionIncorrect() {
    const ids = new Set(state.session.incorrectIds);
    const cards = state.data.cards.filter(c => ids.has(c.id));
    if (!cards.length) return;
    state.deck = shuffle(cards, state.lastOrder);
    state.lastOrder = state.deck.map(c => c.id);
    state.index = 0;
    state.flipped = false;
    state.session = { correct: 0, incorrect: 0, skipped: 0, incorrectIds: [] };
    els.sessionSummary.classList.remove('active');
    els.studyShell.classList.add('active');
    renderCard();
  }

  function toggleFavorite() {
    const card = state.deck[state.index];
    if (!card) return;
    const idx = state.progress.favorites.indexOf(card.id);
    if (idx >= 0) state.progress.favorites.splice(idx, 1);
    else state.progress.favorites.push(card.id);
    saveProgress();
    updateFavoriteButton();
  }

  function updateFavoriteButton() {
    const card = state.deck[state.index];
    if (!card) return;
    const saved = state.progress.favorites.includes(card.id);
    els.favoriteButton.textContent = saved ? '★ Saved favorite' : '☆ Save favorite';
    els.favoriteButton.setAttribute('aria-pressed', String(saved));
  }

  function selectAll(value) {
    document.querySelectorAll('#categoryGrid input[type=checkbox]').forEach(input => {
      input.checked = value;
      if (value) state.selected.add(input.value); else state.selected.delete(input.value);
    });
    updateSelection();
  }

  function restartDeck() {
    state.deck = shuffle(state.deck, state.lastOrder);
    state.lastOrder = state.deck.map(c => c.id);
    state.index = 0;
    state.session = { correct: 0, incorrect: 0, skipped: 0, incorrectIds: [] };
    els.sessionSummary.classList.remove('active');
    els.studyShell.classList.add('active');
    renderCard();
  }

  function bind() {
    els.selectAll.addEventListener('click', () => selectAll(true));
    els.clearAll.addEventListener('click', () => selectAll(false));
    els.cardSearch.addEventListener('input', updateSelection);
    els.startSelected.addEventListener('click', () => buildDeck('selected'));
    els.randomMix.addEventListener('click', () => { selectAll(true); els.deckOrder.value = 'random'; buildDeck('random'); });
    els.reviewMissed.addEventListener('click', () => buildDeck('review'));
    els.favoritesOnly.addEventListener('click', () => buildDeck('favorites'));
    els.flashcard.addEventListener('click', () => flipCard());
    els.flashcard.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); flipCard(); }
    });
    els.flipButton.addEventListener('click', () => flipCard(true));
    els.reviewButton.addEventListener('click', () => rate('incorrect'));
    els.knownButton.addEventListener('click', () => rate('correct'));
    els.favoriteButton.addEventListener('click', toggleFavorite);
    els.previousButton.addEventListener('click', previous);
    els.nextButton.addEventListener('click', () => next(true));
    els.restartButton.addEventListener('click', restartDeck);
    els.incorrectAgainButton.addEventListener('click', studySessionIncorrect);
    els.newDeckButton.addEventListener('click', () => {
      els.sessionSummary.classList.remove('active');
      document.querySelector('.deck-builder').scrollIntoView({ behavior: 'smooth' });
    });
    document.addEventListener('keydown', event => {
      if (!els.studyShell.classList.contains('active') || ['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (event.code === 'Space') { event.preventDefault(); flipCard(); }
      if (event.key === 'ArrowRight') next(true);
      if (event.key === 'ArrowLeft') previous();
      if (state.flipped && event.key === '1') rate('incorrect');
      if (state.flipped && event.key === '2') rate('correct');
    });
  }

  async function init() {
    cacheEls();
    loadProgress();
    try {
      const res = await fetch(DATA_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.data = await res.json();
      renderCategories();
      updateStats();
      bind();
    } catch (err) {
      els.statusMessage.innerHTML = '<div class="empty-state">The flashcard deck could not load. Confirm that <code>/data/emt-flashcards.json</code> was uploaded with this page.</div>';
      console.error(err);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
