(function(){
  'use strict';
  if(document.querySelector('[data-ems-intent-nav]'))return;
  if(document.body.classList.contains('home-page'))return;
  if(document.body.classList.contains('bootcamp-page'))return;
  if(document.querySelector('.main-nav.ems-intent-nav'))return;
  const header=document.querySelector('header.site-header, header.bootcamp-header');
  if(!header)return;

  const path=location.pathname.replace(/\/index\.html$/,'/')||'/';
  const links=[
    ['Learn','/emt-prep.html', path.indexOf('emt-prep')>=0||path.indexOf('training.html')>=0||path.indexOf('medication')>=0||path.indexOf('trauma-training')>=0||path.indexOf('abc-training')>=0||path.indexOf('encyclopedia')>=0],
    ['Practice','/vitals/', path.indexOf('/quiz')===0||path.indexOf('flashcards')>=0||path.indexOf('daily-protocol')>=0||path==='/vitals/'],
    ['Simulate','/vitals/scenario-launcher.html', path.indexOf('scenario')>=0],
    ['Games','/ems-training-tools.html', path.indexOf('ems-training-tools')>=0||path.indexOf('medword')>=0||path.indexOf('start-triage')>=0||path.indexOf('pack-med-bag')>=0||path.indexOf('outbreak-sweep')>=0||path.indexOf('pram-run')>=0],
    ['Career','/ems-career-growth.html', path.indexOf('ems-career')>=0||path.indexOf('ems-recertification')>=0||path.indexOf('ems-wellness')>=0||path.indexOf('ems-retirement')>=0||path.indexOf('ems-progress')>=0],
    ['NREMT','/nremt-cognitive-prep.html', path.indexOf('nremt')>=0||path.indexOf('practice_exam')>=0||path.indexOf('skill-sheets')>=0],
    ['Drills','/ems-drills.html', path.indexOf('ems-drills')>=0||path.indexOf('skills-session')>=0]
  ];

  const bar=document.createElement('div');
  bar.className='ems-intent-bar';
  bar.dataset.emsIntentNav='1';
  bar.innerHTML='<nav class="ems-intent-nav" aria-label="Training intent">'+links.map(function(item){
    return '<a href="'+item[1]+'"'+(item[2]?' aria-current="page"':'')+'>'+item[0]+'</a>';
  }).join('')+'</nav>';

  if(!document.querySelector('link[href*="ems-design-system.css"]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/styles/ems-design-system.css';
    document.head.appendChild(link);
  }
  header.insertAdjacentElement('afterend', bar);
})();
