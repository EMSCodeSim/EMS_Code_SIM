(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const sectionKey = 'emscodesim_bls_bootcamp_sections_v1';
  const videoKey = 'emscodesim_bls_bootcamp_video_v1';
  const debriefKey = 'emscodesim_bls_bootcamp_debrief_v1';
  const stationAliases = {
    'patient-assessment':'assessment','trauma-assessment':'trauma','medical-assessment':'medical',
    'vitals-only':'vitals','narrative-only':'narrative',bvm:'initial',oxygen:'primary',
    bleeding:'primary',immobilization:'secondary'
  };
  const validPaths = new Set(['assessment','vitals','initial','trauma','medical','narrative']);
  const requested = params.get('path') || stationAliases[params.get('station')] || 'assessment';
  const currentPath = validPaths.has(requested) ? requested : 'assessment';
  const today = () => new Date().toLocaleDateString('en-CA');
  const read = (key, fallback = {}) => { try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };

  function bootcampUrl(raw, path = currentPath) {
    const url = new URL(raw, location.origin);
    if (url.origin !== location.origin) return raw;
    url.searchParams.set('mode', 'bootcamp');
    url.searchParams.set('path', path);
    url.searchParams.delete('skillsMode');
    return url.pathname + url.search + url.hash;
  }

  function wireLinks() {
    document.querySelectorAll('[data-bootcamp-link]').forEach(link => {
      const call = link.closest('[data-call]')?.dataset.call;
      link.href = bootcampUrl(link.getAttribute('href'), call || currentPath);
    });
  }

  function sectionProgress() {
    const saved = read(sectionKey);
    if (saved.date !== today()) return { date: today(), done: {} };
    return saved;
  }

  function renderSectionProgress() {
    const saved = sectionProgress();
    const cards = [...document.querySelectorAll('[data-section]')];
    cards.forEach(card => {
      const done = Boolean(saved.done[card.dataset.section]);
      card.classList.toggle('practiced', done);
      const button = card.querySelector('.mark-section');
      if (button) {
        button.classList.toggle('done', done);
        button.textContent = done ? 'Practiced today ✓' : 'Mark section practiced today';
      }
    });
    const count = Object.keys(saved.done).length;
    document.querySelector('#progressCount').textContent = `${count} of ${cards.length} sections practiced today`;
    document.querySelector('#progressBar').style.width = `${cards.length ? count / cards.length * 100 : 0}%`;
  }

  function wireAccordion() {
    const cards = [...document.querySelectorAll('.assessment-card')];
    cards.forEach(card => {
      card.addEventListener('toggle', () => {
        if (card.open) cards.forEach(other => { if (other !== card) other.open = false; });
      });
      card.querySelector('.mark-section')?.addEventListener('click', () => {
        const saved = sectionProgress();
        saved.done[card.dataset.section] = true;
        write(sectionKey, saved);
        renderSectionProgress();
      });
    });
  }

  function wireVideoLab() {
    const state = read(videoKey, { checks:{}, answers:{} });
    document.querySelectorAll('[data-video-check]').forEach(input => {
      input.checked = Boolean(state.checks[input.dataset.videoCheck]);
      input.addEventListener('change', () => { state.checks[input.dataset.videoCheck] = input.checked; write(videoKey, state); });
    });
    document.querySelectorAll('[data-video-answer]').forEach(input => {
      input.value = state.answers[input.dataset.videoAnswer] || '';
      input.addEventListener('input', () => { state.answers[input.dataset.videoAnswer] = input.value; write(videoKey, state); });
    });
    document.querySelector('#resetVideoChecks')?.addEventListener('click', () => {
      state.checks = {};
      document.querySelectorAll('[data-video-check]').forEach(input => { input.checked = false; });
      write(videoKey, state);
    });
  }

  function wireDebriefs() {
    const saved = read(debriefKey, { trauma:{}, medical:{} });
    document.querySelectorAll('[data-debrief]').forEach(form => {
      const path = form.dataset.debrief;
      saved[path] ||= {};
      const fields = [...form.querySelectorAll('[data-question]')];
      fields.forEach(field => {
        field.value = saved[path][field.dataset.question] || '';
        field.addEventListener('input', () => {
          saved[path][field.dataset.question] = field.value.trim();
          write(debriefKey, saved);
          update();
        });
      });
      function update() {
        const complete = fields.every(field => field.value.trim().length >= 3);
        const status = form.querySelector('.debrief-status');
        status.classList.toggle('complete', complete);
        status.textContent = complete ? 'Thinking debrief complete. Assessment mode and documentation unlocked ✓' : `Answer all six decisions to continue (${fields.filter(field => field.value.trim().length >= 3).length}/6 complete).`;
        document.querySelectorAll(`[data-unlock="${path}"]`).forEach(link => {
          link.classList.toggle('unlocked', complete);
          link.setAttribute('aria-disabled', complete ? 'false' : 'true');
          link.tabIndex = complete ? 0 : -1;
        });
      }
      update();
    });
    document.querySelectorAll('.locked-link').forEach(link => link.addEventListener('click', event => {
      if (!link.classList.contains('unlocked')) event.preventDefault();
    }));
  }

  function routePath() {
    const targets = {
      assessment: document.querySelector('#assessment'),
      initial: document.querySelector('#initial'),
      vitals: document.querySelector('#vitals'),
      trauma: document.querySelector('#trauma-path'),
      medical: document.querySelector('#medical-path'),
      narrative: document.querySelector('#narrative')
    };
    const target = targets[currentPath];
    if (!target || location.hash) return;
    target.classList.add('path-highlight');
    setTimeout(() => target.scrollIntoView({ behavior:'smooth', block:'start' }), 120);
    setTimeout(() => target.classList.remove('path-highlight'), 1800);
  }

  wireLinks();
  wireAccordion();
  renderSectionProgress();
  wireVideoLab();
  wireDebriefs();
  routePath();
})();
