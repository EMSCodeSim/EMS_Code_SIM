(() => {
  'use strict';
  const STORAGE_KEY = 'emscodesim_nremt_skill_practice_v1';
  const cards = [...document.querySelectorAll('.skill-card')];
  const search = document.getElementById('skillSearch');
  const category = document.getElementById('skillCategory');
  const empty = document.getElementById('skillEmpty');
  const practiced = (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } })();

  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(practiced)); }
  function updateProgress() {
    const count = cards.filter(card => practiced[card.dataset.skill]).length;
    const percent = Math.round((count / cards.length) * 100);
    document.getElementById('practiceCount').textContent = `${count} of ${cards.length}`;
    document.getElementById('practiceRing').style.setProperty('--progress', `${percent}%`);
    document.getElementById('practicePercent').textContent = `${percent}%`;
  }
  function syncButtons() {
    cards.forEach(card => {
      const button = card.querySelector('[data-practice]');
      const done = Boolean(practiced[card.dataset.skill]);
      button.classList.toggle('practiced', done);
      button.textContent = done ? 'Practiced ✓' : 'Mark practiced';
      button.setAttribute('aria-pressed', String(done));
    });
    updateProgress();
  }
  function filterCards() {
    const q = search.value.trim().toLowerCase();
    const selected = category.value;
    let shown = 0;
    cards.forEach(card => {
      const match = (!q || card.dataset.search.includes(q)) && (!selected || card.dataset.category === selected);
      card.hidden = !match;
      if (match) shown += 1;
    });
    empty.hidden = shown > 0;
  }
  cards.forEach(card => card.querySelector('[data-practice]').addEventListener('click', () => {
    if (practiced[card.dataset.skill]) delete practiced[card.dataset.skill];
    else practiced[card.dataset.skill] = new Date().toISOString();
    save(); syncButtons();
  }));
  search.addEventListener('input', filterCards);
  category.addEventListener('change', filterCards);
  syncButtons(); filterCards();
})();
