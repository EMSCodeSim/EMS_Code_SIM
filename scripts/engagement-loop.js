(function(){
  'use strict';
  const tools=[
    ['Blood Pressure Simulator','/vitals/bp.html'],['Pulse Trainer','/vitals/pulse.html'],['Pulse Oximeter Simulator','/vitals/pulse-ox.html'],['Blood Glucose Simulator','/vitals/bgl.html'],['Breath Sound Simulator','/vitals/breath-sound-simulator.html'],['GCS Trainer','/vitals/gcs.html'],['Stroke Assessment Trainer','/vitals/stroke.html'],['Pupil Simulator','/vitals/pupil.html']
  ];
  function dayIndex(){const d=new Date(),s=new Date(d.getFullYear(),0,0);return Math.floor((d-s)/86400000);}
  document.addEventListener('DOMContentLoaded',function(){
    if(document.querySelector('.practice-next')||document.body.dataset.noEngagement==='true')return;
    const path=location.pathname;let title='',copy='',primary='',primaryUrl='',secondary='',secondaryUrl='';
    if(path.startsWith('/quiz/')){const tool=tools[dayIndex()%tools.length];title='Turn today’s review into hands-on practice';copy='Use one short simulator to reinforce assessment skills after the quiz.';primary='Practice '+tool[0];primaryUrl=tool[1];secondary='Browse all training tools';secondaryUrl='/ems-training-tools.html';}
    else if(path.startsWith('/vitals/')||path.startsWith('/APGAR/')){title='Keep your daily practice streak going';copy='Finish with today’s short EMT or paramedic review, then return tomorrow for a new activity.';primary='Take today’s quiz';primaryUrl='/quiz/';secondary='Browse all training tools';secondaryUrl='/ems-training-tools.html';}
    else return;
    const box=document.createElement('section');box.className='practice-next';box.setAttribute('aria-label','Continue practicing');box.innerHTML='<span class="practice-next-label">Next five-minute step</span><h2>'+title+'</h2><p>'+copy+'</p><div class="practice-next-actions"><a href="'+primaryUrl+'">'+primary+'</a><a class="secondary" href="'+secondaryUrl+'">'+secondary+'</a></div>';
    const footer=document.querySelector('footer,.site-footer');if(footer)footer.parentNode.insertBefore(box,footer);else document.body.appendChild(box);
  });
})();

(function(){
  'use strict';
  const HOME_PATHS=new Set(['/','/index.html']);
  const DEFAULT_SCENARIO='/vitals/visual-patient.html?case=asthma&training=learning&reset=1';
  const isHome=()=>HOME_PATHS.has(location.pathname);
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];

  function normalizeBrand(){
    qa('.brand small').forEach(el=>{el.textContent='EMS Career & Training Hub';});
  }

  function enhanceFooter(){
    const footer=q('footer.site-footer, footer');
    if(!footer||q('[data-site-review-trust]',footer))return;
    const trust=document.createElement('div');
    trust.dataset.siteReviewTrust='1';
    trust.className='site-review-trust';
    trust.innerHTML='<div><strong>Built from field and teaching experience.</strong><span>Created and reviewed by a practicing paramedic/firefighter with EMS instruction and quality-improvement experience. Educational support only—follow your approved program, local protocols, and medical direction.</span></div><div class="site-review-trust-links"><a href="/about.html">About & editorial standards</a><a href="/about.html">Corrections & contact</a><a href="/vitals/scenario-launcher.html">Patient scenarios</a><a href="/#daily-practice">5-minute practice</a><a href="/ems-training-tools.html">Training tools</a><a href="https://fireopssim.com/" rel="noopener">FireOpsSim</a></div><small>Last editorial review: September 2026</small>';
    const bottom=q('.footer-bottom',footer);
    if(bottom)footer.insertBefore(trust,bottom);else footer.appendChild(trust);
  }

  function installSharedStyles(){
    if(q('style[data-site-review-polish]'))return;
    const style=document.createElement('style');
    style.dataset.siteReviewPolish='1';
    style.textContent=`
      .site-review-trust{max-width:1120px;margin:18px auto 0;padding:18px 20px;border-top:1px solid rgba(148,163,184,.35);display:grid;gap:10px}
      .site-review-trust>div:first-child{display:grid;gap:4px}.site-review-trust strong{font-size:.92rem}.site-review-trust span,.site-review-trust small{font-size:.78rem;line-height:1.45;opacity:.82}
      .site-review-trust-links{display:flex;gap:12px 18px;flex-wrap:wrap}.site-review-trust-links a{font-size:.8rem;font-weight:700}
      .home-mobile-scenario-cta{display:none}
      .home-page .hero-scene-still{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;border:1px solid #475569;background:#0f172a}
      .home-page .hero-sim-card ul,.home-page .hero-sim-card .hero-sim-primary,.home-page .hero-sim-card .hero-sim-secondary,.home-page .hero-sim-icon{display:none!important}
      .home-page .hero-sim-card{padding:14px}.home-page .hero-sim-card h2{margin:10px 0 4px}.home-page .hero-sim-card p{font-size:.86rem}
      .home-page .site-review-scenario-catalog{max-width:1120px;margin:0 auto;padding:28px 20px 10px}
      .home-page .site-review-scenario-catalog header{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:14px}
      .home-page .site-review-scenario-catalog h2{margin:0;font-size:1.45rem}.home-page .site-review-scenario-catalog p{margin:4px 0 0;color:#475569}
      .home-page .scenario-catalog-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .home-page .scenario-catalog-card{display:grid;grid-template-columns:150px 1fr;gap:14px;padding:12px;border:1px solid #d8e0ea;border-radius:12px;background:#fff;color:#0f172a;box-shadow:0 1px 2px rgba(15,23,42,.05);align-items:center}
      .home-page .scenario-catalog-card img{width:150px;height:104px;object-fit:cover;border-radius:9px;background:#e2e8f0}
      .home-page .scenario-catalog-card .scenario-card-copy{display:grid;gap:6px}.home-page .scenario-catalog-card:hover{border-color:#93c5fd;background:#f8fbff}.home-page .scenario-catalog-card small{color:#64748b}.home-page .scenario-catalog-card em{font-style:normal;color:#2563eb;font-weight:800;font-size:.84rem}
      .home-page .mobile-career-picker,.home-page .mobile-home-shortcuts,.home-page .ideal-quick-wrap,.home-page .start-here{display:none!important}
      .home-page .path-and-practice .practice-box{display:none!important}.home-page .path-and-practice{grid-template-columns:1fr!important}
      .home-page .career-stage-wrap{padding-top:22px}.home-page .daily-practice-home{margin-top:0}
      @media(max-width:760px){
        .home-page .scenario-catalog-grid{grid-template-columns:1fr}.home-page .site-review-scenario-catalog header{display:block}.home-page .scenario-catalog-card{grid-template-columns:120px 1fr}.home-page .scenario-catalog-card img{width:120px;height:92px}
        .home-mobile-scenario-cta{display:flex;position:fixed;z-index:150;left:14px;right:14px;bottom:calc(12px + env(safe-area-inset-bottom));min-height:50px;align-items:center;justify-content:center;border-radius:13px;background:#2563eb;color:#fff!important;font-weight:850;text-decoration:none;box-shadow:0 8px 28px rgba(15,23,42,.28)}
        .home-page{padding-bottom:78px}
      }
      @media(max-width:480px){.home-page .scenario-catalog-card{grid-template-columns:1fr}.home-page .scenario-catalog-card img{width:100%;height:auto;aspect-ratio:16/9}}
    `;
    document.head.appendChild(style);
  }

  function scenarioCatalog(){
    let section=q('.site-review-scenario-catalog');
    if(section)return section;
    section=document.createElement('section');
    section.className='site-review-scenario-catalog';
    section.setAttribute('aria-labelledby','scenarioCatalogTitle');
    const cases=[
      ['Breathing Problem','Shortness of breath / wheezing','EMT · Medical','8–12 min','asthma','/vitals/assets/breathing-problem-cover.webp'],
      ['Horse-Crush Trauma','Severe hip pain after blunt trauma','EMT · Trauma','12–15 min','horse_crush','/vitals/assets/horse-crush/patient-initial.webp']
    ];
    section.innerHTML='<header><div><h2 id="scenarioCatalogTitle">Choose a patient scenario</h2><p>These are the two complete scenarios currently ready for practice.</p></div><a href="/vitals/scenario-launcher.html">Open scenario selector →</a></header><div class="scenario-catalog-grid">'+cases.map(c=>`<a class="scenario-catalog-card" href="/vitals/visual-patient.html?case=${c[4]}&training=learning&reset=1"><img src="${c[5]}" alt="${c[0]} scenario cover"><span class="scenario-card-copy"><strong>${c[0]}</strong><span>${c[1]}</span><small>${c[2]} · ${c[3]}</small><em>Start case →</em></span></a>`).join('')+'</div>';
    return section;
  }

  function applyHome(){
    if(!isHome())return;
    const heroTitle=q('#heroTitle');
    const heroKicker=q('#heroKicker');
    const heroCopy=q('#heroCopy');
    const primary=q('#heroPrimary');
    const secondary=q('#heroSecondary');
    if(heroKicker)heroKicker.textContent='Free EMT practice · no account required';
    if(heroTitle)heroTitle.innerHTML='Free EMT patient simulations <span>and career tools.</span>';
    if(heroCopy)heroCopy.textContent='Run a full EMT assessment. No login. Practice patient care first, then use daily review and career tools when you need them.';
    if(primary){primary.href=DEFAULT_SCENARIO;primary.textContent='Start a scenario';}
    if(secondary){secondary.href='#daily-practice';secondary.textContent='Do today’s 5-minute practice';}
    const summary=q('.stage-summary-line');if(summary)summary.textContent='Career-stage personalization is optional and never blocks the training tools.';
    const headerCta=q('.header-cta');if(headerCta)headerCta.href=DEFAULT_SCENARIO;

    const sim=q('.hero-sim-card');
    if(sim&&!q('.hero-scene-still',sim)){
      sim.insertAdjacentHTML('afterbegin','<img class="hero-scene-still" src="/vitals/assets/breathing-problem-cover.webp" alt="Breathing problem visual patient scenario">');
      const label=q('.hero-sim-label',sim);if(label)label.textContent='Visual patient simulator';
      const h2=q('h2',sim);if(h2)h2.textContent='Look at the patient. Decide what to do next.';
      const p=q('p',sim);if(p)p.textContent='Assessment Mode, patient clock, findings, treatment, reassessment, and debrief.';
    }else if(sim){const image=q('.hero-scene-still',sim);if(image)image.src='/vitals/assets/breathing-problem-cover.webp';}

    const oldQuick=q('.ideal-quick-wrap');
    const hero=q('.hero-home');
    const catalog=scenarioCatalog();
    if(hero&&catalog.parentNode!==hero.parentNode)hero.insertAdjacentElement('afterend',catalog);
    if(oldQuick)oldQuick.hidden=true;

    const daily=q('.daily-practice-home');
    const career=q('.career-stage-wrap');
    if(daily&&career&&daily.nextElementSibling!==career)career.parentNode.insertBefore(daily,career);

    const stageIntro=q('.career-stage-panel .stage-intro p');if(stageIntro)stageIntro.textContent='Optional: choose your stage to personalize recommended guides and practice links.';
    const stageBadge=q('.stage-badge');if(stageBadge)stageBadge.textContent='Optional personalization';

    if(!q('.home-mobile-scenario-cta')){
      const a=document.createElement('a');a.className='home-mobile-scenario-cta';a.href=DEFAULT_SCENARIO;a.textContent='Start a scenario';document.body.appendChild(a);
    }else{
      q('.home-mobile-scenario-cta').href=DEFAULT_SCENARIO;
    }
  }

  function keepHeroScenarioFirst(){
    if(!isHome())return;
    document.addEventListener('click',event=>{if(event.target.closest?.('[data-stage],#stagePrev,#stageNext'))setTimeout(applyHome,0);},true);
    document.addEventListener('change',event=>{if(event.target.matches?.('#mobileStageSelect'))setTimeout(applyHome,0);},true);
  }

  function start(){normalizeBrand();installSharedStyles();enhanceFooter();applyHome();keepHeroScenarioFirst();setTimeout(()=>{normalizeBrand();enhanceFooter();applyHome();},100);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
