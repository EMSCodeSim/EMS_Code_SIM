(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const legacy = params.get('mode') === 'skills' || params.get('skillsMode') === '1';
  const bootcamp = params.get('mode') === 'bootcamp' || params.get('bootcampMode') === '1';
  if (!legacy && !bootcamp) return;

  const station = params.get('station') || 'patient-assessment';
  const alias = {'patient-assessment':'assessment','trauma-assessment':'trauma','medical-assessment':'medical','vitals-only':'vitals','narrative-only':'narrative'};
  const path = params.get('path') || alias[station] || 'assessment';
  const caseId = params.get('case') || (path === 'trauma' ? 'horse_crush' : path === 'medical' ? 'asthma' : '');
  const pathLabel = {assessment:'Assessment sections',initial:'Initial assessment',vitals:'Vitals',trauma:'Horse-crush call',medical:'Asthma call',narrative:'Narrative'}[path] || 'Boot Camp';
  const backHash = path === 'trauma' ? '#trauma-path' : path === 'medical' ? '#medical-path' : `#${path}`;
  const backHref = bootcamp ? `/skills-session?path=${encodeURIComponent(path)}${backHash}` : `/skills-session?station=${encodeURIComponent(station)}`;

  document.body.classList.add('skills-session-mode');
  if (bootcamp) document.body.classList.add('bls-bootcamp-mode');
  const bar = document.createElement('div');
  bar.className = 'skills-session-return';
  bar.innerHTML = `<a href="${backHref}">← Back to ${bootcamp ? 'BLS Boot Camp' : 'Skills Session'}</a><span>${bootcamp ? pathLabel : station.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())} practice</span>`;
  document.body.insertBefore(bar, document.body.firstChild);

  document.querySelectorAll('a[href^="/"]').forEach(link => {
    if (link.closest('.skills-session-return')) return;
    const url = new URL(link.href, location.origin);
    if (url.origin !== location.origin || url.pathname === '/skills-session' || url.pathname === '/bls-bootcamp') return;
    if (bootcamp) {
      url.searchParams.set('mode','bootcamp');
      url.searchParams.set('path',path);
      url.searchParams.delete('skillsMode');
    } else {
      url.searchParams.set('mode','skills');
      url.searchParams.set('station',station);
    }
    link.href = url.pathname + url.search + url.hash;
  });

  const focusMap = {bvm:'bvm',oxygen:'oxygen',bleeding:'bleeding',immobilization:'long-bone','trauma-assessment':'trauma','medical-assessment':'medical'};
  if (location.pathname.includes('nremt-skill-sheets')) {
    const target = document.querySelector(`[data-skill="${focusMap[station] || (path === 'trauma' ? 'trauma' : path === 'medical' ? 'medical' : '')}"]`);
    if (target) { target.classList.add('skills-session-focus'); setTimeout(() => target.scrollIntoView({behavior:'smooth',block:'center'}), 250); }
  }

  if (bootcamp && /pcr-narrative-coach|narrative-writing-lab/.test(location.pathname) && caseId) {
    const label = caseId === 'horse_crush' ? 'Horse-crush trauma call' : 'Asthma breathing call';
    const reminder = document.createElement('aside');
    reminder.className = 'bootcamp-case-reminder';
    reminder.innerHTML = `<strong>Document the same case: ${label}</strong><span>Use only facts you obtained in that fictional Boot Camp scenario. Include assessment, vital trend, treatment, response, transport, and transfer.</span>`;
    bar.insertAdjacentElement('afterend', reminder);
  }
})();
