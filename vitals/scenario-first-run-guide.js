(()=>{
  'use strict';

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const isAsthma=()=>document.body.classList.contains('asthma-video-only');
  const isMobile=()=>isAsthma()&&window.matchMedia('(max-width:979px)').matches;
  const isDesktop=()=>isAsthma()&&!window.matchMedia('(max-width:979px)').matches;
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();

  let responseObserver=null;
  let lastResponse='';
  let lastQuestion='';
  let refreshQueued=false;
  let mobileFeed=null;
  let mobileQuick=null;
  let mobileNav=null;

  function installStyles(){
    if(q('#patientFirstUxStyles')) return;
    const style=document.createElement('style');
    style.id='patientFirstUxStyles';
    style.textContent=`
      .patient-first-mobile-nav,.patient-first-mobile-feed,.patient-first-mobile-hint{display:none}

      @media(min-width:980px){
        body.asthma-video-only #clinicalInteractionColumn{display:flex!important;flex-direction:column!important;overflow:hidden!important;min-height:0!important}
        body.asthma-video-only #clinicalInteractionColumn>.info-update-window,
        body.asthma-video-only #siteReviewNextAction{display:none!important}
        body.asthma-video-only #patientCommunicationStage{display:flex!important;flex:1 1 auto!important;flex-direction:column!important;min-height:0!important;height:100%!important;overflow:auto!important;padding:12px!important;margin:0!important}
        body.asthma-video-only #patientConversationTurn{display:block!important;width:100%!important;min-height:0!important;height:auto!important;overflow:visible!important}
        body.asthma-video-only #patientQuestionChoiceTray{display:grid;gap:10px;width:100%;padding:12px;border:1px solid #31596f;border-radius:13px;background:#0b2333;color:#eef8fb;box-sizing:border-box}
        body.asthma-video-only #patientQuestionChoiceTray[hidden]{display:none!important}
        body.asthma-video-only #historyPanel .history-question-list{display:none!important}
      }

      @media(max-width:979px){
        body.asthma-video-only{overflow-x:hidden!important;padding-bottom:76px!important;background:#071724!important}
        body.asthma-video-only .patient-desktop-workspace{width:100%!important;max-width:none!important;padding:0!important;overflow:visible!important}
        body.asthma-video-only .scenario-hero-layout{display:block!important;width:100%!important;max-width:none!important;overflow:visible!important;gap:0!important}

        body.asthma-video-only .scenario-hero-layout>.patient-stage{
          display:block!important;position:relative!important;width:100%!important;max-width:none!important;height:36dvh!important;min-height:245px!important;max-height:390px!important;
          overflow:hidden!important;border-radius:0!important;background:#03111c!important;transition:height .22s ease,max-height .22s ease!important
        }
        body.asthma-video-only.mobile-patient-video-playing .scenario-hero-layout>.patient-stage{height:64dvh!important;max-height:680px!important}
        body.asthma-video-only .patient-stage img,
        body.asthma-video-only .patient-stage video{width:100%!important;height:100%!important;max-height:none!important;object-fit:cover!important}
        body.asthma-video-only .patient-stage .scenario-intro-video-shell{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;z-index:9!important}
        body.asthma-video-only .patient-stage .scenario-intro-video-shell video{width:100%!important;height:100%!important;object-fit:cover!important}

        body.asthma-video-only #clinicalInteractionColumn{
          display:block!important;width:100%!important;min-width:0!important;max-width:none!important;height:auto!important;min-height:52dvh!important;
          overflow:visible!important;padding:0!important;background:#f5f8fb!important;color:#102a3c!important
        }
        body.asthma-video-only #clinicalInteractionColumn>.info-update-window,
        body.asthma-video-only #siteReviewNextAction,
        body.asthma-video-only #clinicalInteractionColumn>.bottom-nav,
        body.asthma-video-only .persistent-clinical-bar{display:none!important}
        body.asthma-video-only #patientCommunicationStage{display:none!important}

        body.asthma-video-only .patient-control-column{position:static!important;width:100%!important;min-width:0!important;max-width:none!important;height:auto!important;overflow:visible!important;padding:0!important;background:transparent!important}
        body.asthma-video-only .patient-control-column>.bottom-nav{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;opacity:0!important;pointer-events:none!important}

        body.asthma-video-only .action-sheet{
          position:fixed!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;z-index:9992!important;width:100%!important;max-width:none!important;
          max-height:min(78dvh,760px)!important;border-radius:22px 22px 0 0!important;overflow-y:auto!important;padding-bottom:max(90px,calc(78px + env(safe-area-inset-bottom)))!important;
          box-shadow:0 -18px 55px rgba(0,0,0,.38)!important;background:#f8fbfd!important;color:#102a3c!important
        }
        body.asthma-video-only .sheet-backdrop{position:fixed!important;inset:0!important;z-index:9991!important;background:rgba(3,15,25,.56)!important}
        body.asthma-video-only .action-sheet .sheet-header{position:sticky!important;top:0!important;z-index:5!important;background:#f8fbfd!important;padding-top:8px!important}
        body.asthma-video-only .action-sheet .sheet-patient-context{display:none!important}
        body.asthma-video-only #historyPanel .history-response-card,
        body.asthma-video-only #historyPanel .history-patient-banner,
        body.asthma-video-only #historyPanel .known-history-section,
        body.asthma-video-only #historyPanel .history-guided-tools{display:none!important}
        body.asthma-video-only #historyPanel .sub{margin-top:0!important}
        body.asthma-video-only #historyPanel .history-question-list{display:block!important}
        body.asthma-video-only #historyPanel .history-question-category>summary{min-height:56px!important;padding:12px!important;cursor:pointer!important}
        body.asthma-video-only #historyPanel .history-question-button{min-height:50px!important;font-size:.96rem!important;text-align:left!important}
        body.asthma-video-only #historyPanel .history-custom-question{margin-top:12px!important}

        .patient-first-mobile-feed{display:block;background:#f5f8fb;color:#102a3c;min-height:52dvh;padding:14px 14px 108px;box-sizing:border-box}
        .patient-first-mobile-feed-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
        .patient-first-mobile-feed-head div small{display:block;color:#687f90;font-size:.68rem;font-weight:900;letter-spacing:.09em}
        .patient-first-mobile-feed-head div strong{display:block;margin-top:2px;font-size:1.05rem}
        .patient-first-mobile-status{font-size:.75rem;font-weight:800;color:#0878a8;background:#e6f5fb;border:1px solid #b8e2f2;border-radius:999px;padding:6px 9px;white-space:nowrap}
        .patient-first-conversation{display:grid;gap:9px;margin:8px 0 14px}
        .patient-first-empty{padding:14px;border:1px solid #d7e3eb;border-radius:13px;background:#fff;color:#50697a;line-height:1.45}
        .patient-first-bubble{max-width:88%;padding:10px 12px;border-radius:15px;line-height:1.38;box-shadow:0 2px 8px rgba(13,45,65,.07)}
        .patient-first-bubble small{display:block;margin-bottom:4px;font-size:.66rem;font-weight:900;letter-spacing:.05em;opacity:.72}
        .patient-first-bubble.user{justify-self:end;background:#dceeff;border:1px solid #bdddf6;border-bottom-right-radius:5px}
        .patient-first-bubble.patient{justify-self:start;background:#fff;border:1px solid #d7e3eb;border-bottom-left-radius:5px}
        .patient-first-quick{margin-top:12px}
        .patient-first-quick>strong{display:block;margin-bottom:8px;font-size:.88rem}
        .patient-first-quick-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .patient-first-quick button{min-height:50px;padding:10px 11px;border:1px solid #cad9e3;border-radius:12px;background:#fff;color:#17364a;text-align:left;font:inherit;font-size:.88rem;font-weight:800}
        .patient-first-quick button.primary{grid-column:1/-1;background:#0b6fa8;color:#fff;border-color:#0b6fa8}

        .patient-first-mobile-nav{display:grid;position:fixed;left:10px;right:10px;bottom:max(8px,env(safe-area-inset-bottom));z-index:9996;grid-template-columns:repeat(4,1fr);gap:4px;padding:5px;border:1px solid rgba(142,213,239,.25);border-radius:16px;background:rgba(4,20,32,.96);box-shadow:0 12px 34px rgba(0,0,0,.4);backdrop-filter:blur(12px)}
        .patient-first-mobile-nav button{min-height:50px;border:0;border-radius:11px;background:transparent;color:#d2e3ec;font:inherit;font-size:.75rem;font-weight:850;display:grid;place-items:center;gap:2px}
        .patient-first-mobile-nav button span{font-size:1.15rem;line-height:1}
        .patient-first-mobile-nav button.active{background:#0d6fa7;color:#fff}
        .patient-first-mobile-hint{display:block;position:absolute;left:12px;bottom:12px;z-index:20;padding:7px 10px;border-radius:999px;background:rgba(3,17,28,.82);color:#fff;font-size:.72rem;font-weight:850;backdrop-filter:blur(8px)}
        body.asthma-video-only.mobile-patient-video-playing .patient-first-mobile-hint{display:none}
      }
    `;
    document.head.appendChild(style);
  }

  function record(){
    try{return window.EMSCodeSimScenarioSession?.sync?.()||window.EMSCodeSimPatientRecord?.active?.()||{};}catch(_){return {};}
  }

  function ensureInteractionColumn(){
    const layout=q('.scenario-hero-layout');
    const patient=q('.patient-stage',layout||document);
    const control=q('.patient-control-column',layout||document);
    if(!layout||!patient||!control) return null;
    let center=q('#clinicalInteractionColumn');
    if(!center){
      center=document.createElement('section');
      center.id='clinicalInteractionColumn';
      center.className='clinical-interaction-column';
    }
    if(center.parentElement!==layout||center.previousElementSibling!==patient) layout.insertBefore(center,control);
    return center;
  }

  function createMobileFeed(){
    if(!isMobile()) return null;
    const center=ensureInteractionColumn();
    if(!center) return null;
    mobileFeed=q('#patientFirstMobileFeed');
    if(!mobileFeed){
      mobileFeed=document.createElement('section');
      mobileFeed.id='patientFirstMobileFeed';
      mobileFeed.className='patient-first-mobile-feed';
      mobileFeed.innerHTML=`
        <header class="patient-first-mobile-feed-head">
          <div><small>PATIENT INTERACTION</small><strong>Work the patient</strong></div>
          <span class="patient-first-mobile-status" id="patientFirstStatus">Ready</span>
        </header>
        <div id="patientFirstConversation" class="patient-first-conversation" role="log" aria-live="polite">
          <div class="patient-first-empty" id="patientFirstEmpty">Start by talking to the patient, assessing immediate threats, or obtaining vital signs. Everything you learn will stay in this conversation.</div>
        </div>
        <section class="patient-first-quick" aria-label="Suggested next actions">
          <strong>What would you like to do?</strong>
          <div id="patientFirstQuickGrid" class="patient-first-quick-grid"></div>
        </section>`;
      center.prepend(mobileFeed);
    }
    mobileQuick=q('#patientFirstQuickGrid');
    renderQuickActions();
    return mobileFeed;
  }

  function appendBubble(type,text,label){
    if(!isMobile()) return;
    createMobileFeed();
    const value=clean(text);
    if(!value) return;
    const conversation=q('#patientFirstConversation');
    if(!conversation) return;
    q('#patientFirstEmpty')?.remove();
    const last=conversation.lastElementChild;
    if(last&&last.dataset.signature===`${type}:${value}`) return;
    const bubble=document.createElement('article');
    bubble.className=`patient-first-bubble ${type}`;
    bubble.dataset.signature=`${type}:${value}`;
    bubble.innerHTML=`<small>${label|| (type==='user'?'YOU':'PATIENT')}</small><div></div>`;
    q('div',bubble).textContent=value;
    conversation.appendChild(bubble);
    window.setTimeout(()=>bubble.scrollIntoView({behavior:'smooth',block:'nearest'}),30);
  }

  function openDomain(panel){
    const button=q(`.bottom-nav button[data-panel="${panel}"]`);
    if(button){button.click();return true;}
    return false;
  }

  function closeSheet(){
    const close=q('#closeSheet');
    if(close&&!q('#actionSheet')?.hidden){close.click();return;}
    const sheet=q('#actionSheet');
    const backdrop=q('#sheetBackdrop');
    if(sheet) sheet.hidden=true;
    if(backdrop) backdrop.hidden=true;
  }

  function ensureMobileNav(){
    if(!isMobile()) return null;
    mobileNav=q('#patientFirstMobileNav');
    if(!mobileNav){
      mobileNav=document.createElement('nav');
      mobileNav.id='patientFirstMobileNav';
      mobileNav.className='patient-first-mobile-nav';
      mobileNav.setAttribute('aria-label','Patient care actions');
      mobileNav.innerHTML=`
        <button type="button" data-mobile-domain="historyPanel"><span>💬</span>Ask</button>
        <button type="button" data-mobile-domain="assessmentPanel"><span>🩺</span>Assess</button>
        <button type="button" data-mobile-domain="vitalsPanel"><span>♥</span>Vitals</button>
        <button type="button" data-mobile-domain="treatmentPanel"><span>✚</span>Treat</button>`;
      document.body.appendChild(mobileNav);
      mobileNav.addEventListener('click',event=>{
        const button=event.target.closest('[data-mobile-domain]');
        if(!button) return;
        const panel=button.dataset.mobileDomain;
        qa('#patientFirstMobileNav button').forEach(b=>b.classList.toggle('active',b===button));
        openDomain(panel);
      });
    }
    return mobileNav;
  }

  function historyCategoryButtons(){
    return qa('#historyPanel .history-question-category>summary');
  }

  function historyQuestionButtons(){
    return qa('#historyPanel .history-question-button');
  }

  function renderQuickActions(){
    if(!isMobile()) return;
    createMobileFeed();
    const grid=mobileQuick||q('#patientFirstQuickGrid');
    if(!grid) return;
    grid.replaceChildren();

    const add=(label,action,primary=false)=>{
      const b=document.createElement('button');
      b.type='button';
      b.textContent=label;
      if(primary) b.className='primary';
      b.addEventListener('click',action);
      grid.appendChild(b);
    };

    const unasked=historyQuestionButtons().filter(b=>!b.classList.contains('asked')&&!b.disabled).slice(0,2);
    if(unasked.length){
      unasked.forEach(source=>add(clean(source.querySelector('span')?.textContent||source.textContent||'Ask patient').replace(/Ask again|Ask$/i,''),()=>{
        lastQuestion=clean(source.querySelector('span')?.textContent||source.textContent||'Question').replace(/Ask again|Ask$/i,'');
        appendBubble('user',lastQuestion,'YOU ASKED');
        source.click();
        window.setTimeout(()=>{closeSheet();syncLatestHistoryResponse();},120);
      }));
      add('More questions',()=>openDomain('historyPanel'),true);
      return;
    }

    add('Ask a question',()=>openDomain('historyPanel'),true);
    add('Assess patient',()=>openDomain('assessmentPanel'));
    add('Get vital signs',()=>openDomain('vitalsPanel'));
    add('Consider treatment',()=>openDomain('treatmentPanel'));
  }

  function syncLatestHistoryResponse(){
    if(!isMobile()) return;
    const response=clean(q('#historyResponseText')?.textContent);
    const question=clean(q('#historyResponseQuestion')?.textContent);
    if(question&&question!==lastQuestion&&!/focused questions|select a question/i.test(question)){
      lastQuestion=question;
      appendBubble('user',question,'YOU ASKED');
    }
    if(response&&response!==lastResponse&&!/select a question to begin/i.test(response)){
      lastResponse=response;
      appendBubble('patient',response,clean(q('#historyResponseSource')?.textContent)||'PATIENT');
      const status=q('#patientFirstStatus');
      if(status) status.textContent='Patient answered';
      renderQuickActions();
    }
  }

  function observeHistory(){
    responseObserver?.disconnect();
    const target=q('#historyResponseCard')||q('#historyPanel');
    if(!target) return;
    responseObserver=new MutationObserver(()=>{
      window.setTimeout(syncLatestHistoryResponse,20);
    });
    responseObserver.observe(target,{subtree:true,childList:true,characterData:true});
  }

  function wireHistoryQuestions(){
    if(!isMobile()) return;
    historyQuestionButtons().forEach(button=>{
      if(button.dataset.patientFirstWired) return;
      button.dataset.patientFirstWired='1';
      button.addEventListener('click',()=>{
        const question=clean(button.querySelector('span')?.textContent||button.textContent||'Question').replace(/Ask again|Ask$/i,'');
        if(question){lastQuestion=question;appendBubble('user',question,'YOU ASKED');}
        window.setTimeout(()=>{syncLatestHistoryResponse();closeSheet();},120);
      });
    });
    const custom=q('#askHistoryCustom');
    if(custom&&!custom.dataset.patientFirstWired){
      custom.dataset.patientFirstWired='1';
      custom.addEventListener('click',()=>{
        const text=clean(q('#historyCustomInput')?.value);
        if(text){lastQuestion=text;appendBubble('user',text,'YOU ASKED');}
        window.setTimeout(()=>{syncLatestHistoryResponse();closeSheet();},160);
      });
    }
  }

  function ensurePatientHint(){
    if(!isMobile()) return;
    const stage=q('.patient-stage');
    if(!stage||q('.patient-first-mobile-hint',stage)) return;
    const hint=document.createElement('div');
    hint.className='patient-first-mobile-hint';
    hint.textContent='Watch the patient. Use the actions below to work the call.';
    stage.appendChild(hint);
    window.setTimeout(()=>hint.remove(),5200);
  }

  function wireVideos(){
    if(!isMobile()) return;
    qa('video').forEach(video=>{
      if(video.dataset.patientFirstVideoWired) return;
      video.dataset.patientFirstVideoWired='1';
      const begin=()=>{
        document.body.classList.add('mobile-patient-video-playing');
        const status=q('#patientFirstStatus');
        if(status) status.textContent='Patient changing';
        q('.patient-stage')?.scrollIntoView({behavior:'smooth',block:'start'});
      };
      const end=()=>{
        document.body.classList.remove('mobile-patient-video-playing');
        const status=q('#patientFirstStatus');
        if(status) status.textContent='Continue assessment';
        window.setTimeout(()=>q('#patientFirstMobileFeed')?.scrollIntoView({behavior:'smooth',block:'start'}),220);
      };
      video.addEventListener('play',begin);
      video.addEventListener('ended',end);
      video.addEventListener('pause',()=>{if(video.ended)end();});
    });
  }

  function desktopQuestionTray(){
    if(!isDesktop()) return;
    const stage=q('#patientCommunicationStage');
    if(!stage) return;
    let tray=q('#patientQuestionChoiceTray');
    if(!tray){
      tray=document.createElement('section');
      tray.id='patientQuestionChoiceTray';
      tray.innerHTML='<div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:10px"><div><small>PATIENT INTERVIEW</small><strong style="display:block">Choose what you want to ask</strong></div><span id="patientQuestionChoiceStatus">Select a History category</span></div><div id="patientQuestionChoiceList" style="display:grid;gap:8px"></div>';
      stage.prepend(tray);
    }
    const history=q('#historyPanel');
    tray.hidden=history?.hidden!==false&&!q('.bottom-nav button[data-panel="historyPanel"].active');
    if(tray.hidden) return;
    const category=q('#historyPanel .history-question-category[open]');
    const list=q('#patientQuestionChoiceList',tray);
    const status=q('#patientQuestionChoiceStatus',tray);
    if(!list) return;
    list.replaceChildren();
    if(status) status.textContent=clean(q('summary',category||document)?.textContent)||'Select a History category';
    const sources=category?qa('.history-question-button',category):[];
    if(!sources.length){
      const empty=document.createElement('div');
      empty.textContent='Choose Current problem, OPQRST, SAMPLE, Medical background, or another History category on the right.';
      empty.style.padding='14px';empty.style.border='1px dashed #31596f';empty.style.borderRadius='10px';
      list.appendChild(empty);
      return;
    }
    sources.forEach(source=>{
      const b=document.createElement('button');
      b.type='button';
      b.textContent=clean(source.querySelector('span')?.textContent||source.textContent||'Ask patient').replace(/Ask again|Ask$/i,'');
      b.style.cssText='min-height:48px;padding:10px 12px;text-align:left;border-radius:10px;border:1px solid #31566d;background:#10283a;color:#eef8fb;font:inherit;font-weight:750';
      b.addEventListener('click',()=>source.click());
      list.appendChild(b);
    });
  }

  function refresh(){
    if(refreshQueued) return;
    refreshQueued=true;
    requestAnimationFrame(()=>{
      refreshQueued=false;
      if(!isAsthma()) return;
      installStyles();
      if(isMobile()){
        ensureInteractionColumn();
        createMobileFeed();
        ensureMobileNav();
        ensurePatientHint();
        wireHistoryQuestions();
        wireVideos();
        syncLatestHistoryResponse();
        renderQuickActions();
      }else{
        q('#patientFirstMobileNav')?.remove();
        desktopQuestionTray();
      }
    });
  }

  function start(){
    if(!isAsthma()) return;
    installStyles();
    refresh();
    observeHistory();

    document.addEventListener('toggle',event=>{
      if(event.target?.matches?.('#historyPanel .history-question-category')) window.setTimeout(refresh,20);
    },true);
    document.addEventListener('click',event=>{
      if(!isAsthma()) return;
      if(event.target.closest?.('#historyPanel .history-question-category>summary,.bottom-nav button[data-panel]')) window.setTimeout(refresh,30);
    });

    const observer=new MutationObserver(mutations=>{
      const selfOnly=mutations.every(m=>m.target.closest?.('#patientFirstMobileFeed,#patientFirstMobileNav,#patientQuestionChoiceTray'));
      if(!selfOnly) refresh();
    });
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','open']});
    window.addEventListener('emscodesim:scenario-updated',refresh);
    window.addEventListener('resize',refresh);
    window.addEventListener('pagehide',()=>{observer.disconnect();responseObserver?.disconnect();},{once:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
