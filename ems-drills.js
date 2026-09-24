'use strict';

(function () {
  const DATA_URL = '/data/ems-drills.json';
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));

  let catalog = null;

  function track(eventName, params) {
    try {
      if (typeof gtag === 'function') gtag('event', eventName, Object.assign({ event_category: 'ems_drills' }, params || {}));
    } catch (_) { /* no-op */ }
  }

  function categoryName(id) {
    return catalog.categories.find((item) => item.id === id)?.name || id;
  }

  function filteredDrills() {
    const query = ($('drillSearch')?.value || '').trim().toLowerCase();
    const category = $('drillCategory')?.value || '';
    const level = $('drillLevel')?.value || '';
    const crew = $('drillCrew')?.value || '';
    const completion = $('drillCompletion')?.value || '';

    return catalog.drills.filter((drill) => {
      if (category && drill.categoryId !== category) return false;
      if (level && !(drill.certificationLevels || []).includes(level)) return false;
      if (crew && drill.crewType !== crew) return false;
      if (completion && drill.completionType !== completion) return false;
      if (!query) return true;
      const haystack = [
        drill.title,
        drill.summary,
        categoryName(drill.categoryId),
        ...(drill.certificationLevels || []),
        drill.difficulty,
        drill.id
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }

  function renderFilters() {
    $('drillCategory').innerHTML = '<option value="">All categories</option>' + catalog.categories.map((item) =>
      `<option value="${esc(item.id)}">${esc(item.name)}</option>`
    ).join('');
  }

  function renderLibrary() {
    const drills = filteredDrills();
    $('drillSummary').textContent = `${drills.length} drill${drills.length === 1 ? '' : 's'} shown`;
    $('drillGrid').innerHTML = drills.map((drill) => `
      <article class="ems-drill-card">
        <div class="ems-drill-card-meta">
          <span>${esc(categoryName(drill.categoryId))}</span>
          <span>${esc((drill.certificationLevels || []).join(' / '))}</span>
          <span>${esc(String(drill.estimatedMinutes))} min</span>
          <span>${esc(drill.difficulty)}</span>
          <span>${drill.crewType === 'crew' ? 'Crew' : 'Individual'}</span>
          <span>${drill.completionType === 'evaluator' ? 'Evaluator-verified' : 'Self-completed'}</span>
        </div>
        <h2><a href="/ems-drill.html?id=${esc(drill.id)}">${esc(drill.title)}</a></h2>
        <p>${esc(drill.summary)}</p>
        <a class="ems-btn ems-btn-primary" href="/ems-drill.html?id=${esc(drill.id)}">Start Drill</a>
      </article>
    `).join('') || '<p class="ems-empty">No drills match these filters.</p>';
  }

  function renderCategories() {
    $('categoryGuide').innerHTML = catalog.categories.map((category) => {
      const count = catalog.drills.filter((drill) => drill.categoryId === category.id).length;
      return `<article class="ems-category-card">
        <h3>${esc(category.name)}</h3>
        <p>${esc(category.description)}</p>
        <p class="ems-muted">${count} drill${count === 1 ? '' : 's'} in the initial pack</p>
      </article>`;
    }).join('');
  }

  async function init() {
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to load EMS Drills.');
    catalog = await response.json();
    track('ems_drill_view', { surface: 'library' });
    renderFilters();
    renderCategories();
    renderLibrary();

    ['drillSearch', 'drillCategory', 'drillLevel', 'drillCrew', 'drillCompletion'].forEach((id) => {
      $(id)?.addEventListener('input', renderLibrary);
      $(id)?.addEventListener('change', renderLibrary);
    });
    $('clearDrillFilters')?.addEventListener('click', () => {
      ['drillSearch', 'drillCategory', 'drillLevel', 'drillCrew', 'drillCompletion'].forEach((id) => {
        if ($(id)) $(id).value = '';
      });
      renderLibrary();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    init().catch((error) => {
      console.error(error);
      if ($('drillGrid')) $('drillGrid').innerHTML = '<p class="ems-empty">EMS Drills could not load. Refresh and try again.</p>';
    });
  });
})();
