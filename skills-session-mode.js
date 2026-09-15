(() => {
  'use strict';
  const params=new URLSearchParams(location.search);if(params.get('mode')!=='skills'&&params.get('skillsMode')!=='1')return;
  const station=params.get('station')||'patient-assessment';document.body.classList.add('skills-session-mode');
  const stationLabel=station.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const bar=document.createElement('div');bar.className='skills-session-return';bar.innerHTML=`<a href="/skills-session?station=${encodeURIComponent(station)}">← Back to Skills Session</a><span>${stationLabel} practice</span>`;document.body.insertBefore(bar,document.body.firstChild);
  document.querySelectorAll('a[href^="/"]').forEach(link=>{if(link.closest('.skills-session-return'))return;const url=new URL(link.href,location.origin);if(url.origin!==location.origin||url.pathname==='/skills-session')return;url.searchParams.set('mode','skills');url.searchParams.set('station',station);link.href=url.pathname+url.search+url.hash});
  const focusMap={bvm:'bvm',oxygen:'oxygen',bleeding:'bleeding',immobilization:'long-bone','trauma-assessment':'trauma','medical-assessment':'medical'};
  if(location.pathname.includes('nremt-skill-sheets')){const target=document.querySelector(`[data-skill="${focusMap[station]||''}"]`);if(target){target.classList.add('skills-session-focus');setTimeout(()=>target.scrollIntoView({behavior:'smooth',block:'center'}),250)}}
})();
