(() => {
  'use strict';

  const VERSION='2026.09.12.2';
  const mq=window.matchMedia('(max-width:979px)');
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const asthma=()=>document.body.classList.contains('asthma-video-only');
  let queued=false;
  let observer=null;
  const cooldowns=new Map();

  function mobile(){return asthma()&&mq.matches;}

  function installStyles(){
    if(q('style[data-scenario-reliability-polish]')) return;
    const style=document.createElement('style');
    style.dataset.scenarioReliabilityPolish=VERSION;
    style.textContent=`
      @media(max-width:979px){
        body.asthma-video-only.patient-sheet-open{overflow:hidden!important;touch-action:pan-x pan-y}
        body.asthma-video-only .action-sheet[hidden],body.asthma-video-only .sheet-backdrop[hidden]{display:none!important}
        body.asthma-video-only .patient-first-mobile-nav button:disabled{opacity:.48!important;pointer-events:none!important}
        body.asthma-video-only .patient-experience-action-grid button:disabled{opacity:.52!important;cursor:not-allowed!important}
      }
      @media(min-width:980px){
        #patientFirstMobileNav,#patientFirstMobileFeed,.patient-first-mobile-hint{display:none!important}
        body.mobile-patient-video-playing{overflow:auto!important}
      }
    `;
    document.head.appendChild(style);
  }

  function clearVideoState(){
    if(!asthma()) return;
    const playing=qa('.patient-stage video').some(v=>!v.paused&&!v.ended&&v.readyState>1);
    if(playing&&mobile()) return;
    document.body.classList.remove('mobile-patient-video-playing');
    const status=q('#patientFirstStatus');
    if(status&&/patient changing/i.test(status.textContent||'')) status.textContent='Continue assessment';
  }

  function wireVideos(){
    qa('.patient-stage video').forEach(video=>{
      if(video.dataset.reliabilityVideoWired) return;
      video.dataset.reliabilityVideoWired='1';
      video.addEventListener('pause',()=>setTimeout(clearVideoState,20));
      video.addEventListener('ended',clearVideoState);
      video.addEventListener('error',clearVideoState);
      video.addEventListener('emptied',clearVideoState);
    });
  }

  function panelForVisibleSheet(){
    const sheet=q('#actionSheet');
    if(!sheet||sheet.hidden) return '';
    const panel=qa('#actionSheet .vp-panel').find(p=>!p.hidden&&getComputedStyle(p).display!=='none');
    return panel?.id||'';
  }

  function syncNav(){
    if(!mobile()) return;
    const panel=panelForVisibleSheet();
    qa('#patientFirstMobileNav [data-mobile-domain]').forEach(button=>{
      const active=!!panel&&button.dataset.mobileDomain===panel;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',active?'true':'false');
    });
    const open=!!panel&&!q('#actionSheet')?.hidden;
    document.body.classList.toggle('patient-sheet-open',open);
  }

  function normalizeDuplicates(){
    const feed=q('#patientFirstConversation');
    if(!feed) return;
    const bubbles=qa('.patient-first-bubble',feed);
    for(let i=bubbles.length-1;i>0;i--){
      const a=bubbles[i],b=bubbles[i-1];
      const aType=a.classList.contains('user')?'user':'patient';
      const bType=b.classList.contains('user')?'user':'patient';
      if(aType===bType&&clean(a.textContent)===clean(b.textContent)) a.remove();
    }
  }

  function removeDuplicateShells(){
    const keepFirst=selector=>{
      const nodes=qa(selector);
      nodes.slice(1).forEach(node=>node.remove());
    };
    keepFirst('#patientFirstMobileNav');
    keepFirst('#patientFirstMobileFeed');
    keepFirst('#patientExperienceReview');
    keepFirst('#patientExperienceActions');
  }

  function manageExperienceButtons(){
    qa('#patientExperienceActions button').forEach(button=>{
      if(button.dataset.reliabilityExperienceWired) return;
      button.dataset.reliabilityExperienceWired='1';
      button.addEventListener('click',()=>{
        const label=clean(button.textContent).toLowerCase();
        const repeatable=/reassure|explain next step/.test(label);
        if(!repeatable) return;
        const until=Date.now()+20000;
        cooldowns.set(label,until);
        button.disabled=true;
        const original=button.textContent;
        button.dataset.originalLabel=original;
        button.textContent='Done — continue care';
        setTimeout(()=>{
          if(!button.isConnected) return;
          if((cooldowns.get(label)||0)>Date.now()) return;
          button.disabled=false;
          button.textContent=button.dataset.originalLabel||original;
        },20100);
      },{capture:true});
    });
  }

  function restoreExperienceCooldowns(){
    qa('#patientExperienceActions button').forEach(button=>{
      const label=clean(button.dataset.originalLabel||button.textContent).toLowerCase();
      const until=cooldowns.get(label)||0;
      if(until>Date.now()){
        button.disabled=true;
        button.dataset.originalLabel=button.dataset.originalLabel||button.textContent;
        button.textContent='Done — continue care';
        setTimeout(()=>schedule(),Math.max(50,until-Date.now()+50));
      }else if(button.disabled&&button.dataset.originalLabel){
        button.disabled=false;
        button.textContent=button.dataset.originalLabel;
      }
    });
  }

  function cleanupForDesktop(){
    if(mobile()) return;
    document.body.classList.remove('patient-sheet-open','mobile-patient-video-playing');
    q('#patientFirstMobileNav')?.remove();
    const review=q('#patientExperienceReview');
    if(review&&!review.hidden) review.hidden=true;
  }

  function repair(){
    queued=false;
    if(!asthma()) return;
    installStyles();
    removeDuplicateShells();
    wireVideos();
    normalizeDuplicates();
    manageExperienceButtons();
    restoreExperienceCooldowns();
    syncNav();
    cleanupForDesktop();
  }

  function schedule(){
    if(queued) return;
    queued=true;
    requestAnimationFrame(repair);
  }

  function closeTransientUi(){
    const review=q('#patientExperienceReview');
    if(review&&!review.hidden){review.hidden=true;return true;}
    const sheet=q('#actionSheet');
    if(sheet&&!sheet.hidden){
      q('#closeSheet')?.click();
      setTimeout(syncNav,20);
      return true;
    }
    return false;
  }

  function wireGlobal(){
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&closeTransientUi()) event.preventDefault();
    });
    document.addEventListener('click',event=>{
      if(event.target.closest?.('#closeSheet,#sheetBackdrop,.return-patient-btn')) setTimeout(syncNav,30);
      if(event.target.closest?.('#patientFirstMobileNav [data-mobile-domain]')) setTimeout(syncNav,60);
    },true);
    window.addEventListener('resize',schedule,{passive:true});
    try{mq.addEventListener('change',schedule);}catch(_){mq.addListener?.(schedule);}
    window.addEventListener('orientationchange',()=>setTimeout(schedule,120),{passive:true});
    window.addEventListener('emscodesim:scenario-updated',schedule);
    window.addEventListener('emscodesim:patient-record-updated',schedule);
  }

  function start(){
    if(!asthma()) return;
    installStyles();
    wireGlobal();
    observer=new MutationObserver(mutations=>{
      if(mutations.some(m=>m.type==='childList'||['hidden','class','open'].includes(m.attributeName))) schedule();
    });
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','open']});
    repair();
    window.EMSCodeSimScenarioReliability=Object.freeze({version:VERSION,repair,closeTransientUi});
    window.addEventListener('pagehide',()=>observer?.disconnect(),{once:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();

(()=>{
  'use strict';
  const load=(src,key,selector)=>{
    if(document.querySelector(selector)) return;
    const script=document.createElement('script');
    script.src=src;
    script.async=false;
    script.dataset[key]='1';
    document.head.appendChild(script);
  };
  load('/vitals/scenario-desktop-polish.js?v=2026.09.12.2','scenarioDesktopPolish','script[data-scenario-desktop-polish]');
  load('/vitals/scenario-desktop-layout-override.js?v=2026.09.12.1','scenarioDesktopLayoutOverride','script[data-scenario-desktop-layout-override]');
})();
