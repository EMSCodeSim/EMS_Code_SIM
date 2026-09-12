(()=>{
  'use strict';

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const rawCase=()=>String(new URLSearchParams(location.search).get('case')||window.EMSCodeSimScenarioSession?.requestedCaseId?.()||window.EMSCodeSimPatientRecord?.active?.()?.scenarioId||'').toLowerCase();
  const isAsthma=()=>document.body.classList.contains('asthma-video-only')||['asthma','respiratory'].includes(rawCase());
  const isMobile=()=>isAsthma()&&window.matchMedia('(max-width:979px)').matches;
  const isDesktop=()=>isAsthma()&&!window.matchMedia('(max-width:979px)').matches;

  let responseObserver=null;
  let sheetObserver=null;
  let lastResponse='';
  let lastQuestion='';
  let refreshQueued=false;
  let mobileFeed=null;
  let mobileQuick=null;
  let mobileNav=null;
  let clockTimer=null;
  let careBaselineReady=false;
  const seenCareEvents=new Set();

  function scalar(value){
    if(value==null) return '';
    if(typeof value==='string'||typeof value==='number') return clean(value);
    if(Array.isArray(value)) return clean(value.map(scalar).filter(Boolean).join('; '));
    if(typeof value==='object') return clean(value.value||value.finding||value.details||value.description||value.name||value.label||'');
    return clean(value);
  }

  function record(){
    try{return window.EMSCodeSimScenarioSession?.sync?.()||window.EMSCodeSimPatientRecord?.active?.()||{};}catch(_){return {};}
  }

  function findingValue(key){
    const item=record()?.findings?.[key];
    return scalar(item?.value??item?.finding??item);
  }

  function installStyles(){
    if(q('#patientFirstUxStyles')) return;
    const style=document.createElement('style');
    style.id='patientFirstUxStyles';
    style.textContent=`
      .patient-first-mobile-nav,.patient-first-mobile-feed,.patient-first-stage-overlay,.patient-first-mobile-hint{display:none}

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
        html{scroll-behavior:smooth}
        body.asthma-video-only{overflow-x:hidden!important;padding:0 0 calc(82px + env(safe-area-inset-bottom))!important;background:#f5f8fb!important;color:#102a3c!important}
        body.asthma-video-only.mobile-patient-sheet-open{overscroll-behavior:none}
        body.asthma-video-only .vp-shell{width:100%!important;max-width:none!important;margin:0!important;padding:0!important}
        body.asthma-video-only .vp-top,
        body.asthma-video-only .scenario-quick-controls{display:none!important}
        body.asthma-video-only .patient-desktop-workspace{width:100%!important;max-width:none!important;padding:0!important;margin:0!important;overflow:visible!important}
        body.asthma-video-only .scenario-hero-layout{display:block!important;width:100%!important;max-width:none!important;overflow:visible!important;gap:0!important;margin:0!important}

        body.asthma-video-only .scenario-hero-layout>.patient-stage{
          display:block!important;position:relative!important;width:100%!important;max-width:none!important;height:clamp(220px,32dvh,335px)!important;min-height:220px!important;
          overflow:hidden!important;border-radius:0!important;background:#03111c!important;transition:height .22s ease!important
        }
        body.asthma-video-only.mobile-patient-video-playing .scenario-hero-layout>.patient-stage{height:min(62dvh,640px)!important}
        body.asthma-video-only .patient-stage img,
        body.asthma-video-only .patient-stage video{width:100%!important;height:100%!important;max-height:none!important;object-fit:cover!important}
        body.asthma-video-only .patient-stage .scenario-intro-video-shell{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;z-index:9!important}
        body.asthma-video-only .patient-stage .scenario-intro-video-shell video{width:100%!important;height:100%!important;object-fit:cover!important}
        body.asthma-video-only .scenario-intro-video-controls{left:10px!important;right:10px!important;bottom:44px!important;padding:9px 10px!important;border-radius:12px!important}
        body.asthma-video-only .scenario-intro-video-copy strong{font-size:.86rem!important;line-height:1.3!important}
        body.asthma-video-only .scenario-intro-replay{top:48px!important;right:10px!important;min-height:40px!important}

        .patient-first-stage-overlay{display:flex;position:absolute;left:0;right:0;top:0;z-index:36;align-items:flex-start;justify-content:space-between;gap:10px;padding:calc(10px + env(safe-area-inset-top)) 12px 10px;background:linear-gradient(180deg,rgba(2,13,22,.78),rgba(2,13,22,0));pointer-events:none;color:#fff}
        .patient-first-stage-overlay .patient-first-stage-title{min-width:0;text-shadow:0 2px 10px rgba(0,0,0,.55)}
        .patient-first-stage-overlay small{display:block;font-size:.64rem;font-weight:900;letter-spacing:.1em;opacity:.82}
        .patient-first-stage-overlay strong{display:block;margin-top:2px;font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .patient-first-stage-menu{pointer-events:auto;display:grid;place-items:center;width:42px;height:42px;border:1px solid rgba(255,255,255,.34);border-radius:13px;background:rgba(3,17,28,.68);color:#fff;font-size:1.3rem;font-weight:900;backdrop-filter:blur(9px)}
        .patient-first-stage-meta{display:flex;position:absolute;left:10px;right:10px;bottom:10px;z-index:35;align-items:center;justify-content:space-between;gap:8px;pointer-events:none}
        .patient-first-stage-meta span{padding:7px 9px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(3,17,28,.74);color:#fff;font-size:.7rem;font-weight:850;backdrop-filter:blur(8px);text-shadow:0 1px 5px rgba(0,0,0,.4)}
        body.asthma-video-only.mobile-patient-video-playing .patient-first-stage-meta{display:none}

        body.asthma-video-only #clinicalInteractionColumn{display:block!important;width:100%!important;min-width:0!important;max-width:none!important;height:auto!important;min-height:58dvh!important;overflow:visible!important;padding:0!important;background:#f5f8fb!important;color:#102a3c!important}
        body.asthma-video-only #clinicalInteractionColumn>.info-update-window,
        body.asthma-video-only #siteReviewNextAction,
        body.asthma-video-only #clinicalInteractionColumn>.bottom-nav,
        body.asthma-video-only .persistent-clinical-bar{display:none!important}
        body.asthma-video-only #patientCommunicationStage{display:none!important}

        body.asthma-video-only .patient-control-column{position:static!important;width:100%!important;min-width:0!important;max-width:none!important;height:auto!important;overflow:visible!important;padding:0!important;background:transparent!important}
        body.asthma-video-only .patient-control-column>.bottom-nav,
        body.asthma-video-only body>.bottom-nav{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;opacity:0!important;pointer-events:none!important}

        body.asthma-video-only .action-sheet{
          position:fixed!important;left:0!important;right:0!important;bottom:0!important;top:auto!important;z-index:9992!important;width:100%!important;max-width:none!important;
          max-height:min(82dvh,780px)!important;border-radius:24px 24px 0 0!important;overflow-y:auto!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;
          padding-bottom:max(92px,calc(80px + env(safe-area-inset-bottom)))!important;box-shadow:0 -18px 55px rgba(0,0,0,.38)!important;background:#f8fbfd!important;color:#102a3c!important
        }
        body.asthma-video-only .sheet-backdrop{position:fixed!important;inset:0!important;z-index:9991!important;background:rgba(3,15,25,.58)!important;backdrop-filter:blur(2px)}
        body.asthma-video-only .action-sheet .sheet-handle{position:sticky!important;top:0!important;z-index:7!important;margin:6px auto 0!important;background:#9eb0bc!important}
        body.asthma-video-only .action-sheet .sheet-header{position:sticky!important;top:0!important;z-index:6!important;background:#f8fbfd!important;padding:8px 14px 10px!important;border-bottom:1px solid #e1e9ee!important}
        body.asthma-video-only .action-sheet .sheet-header h2{font-size:1.18rem!important;margin:1px 0!important}
        body.asthma-video-only .action-sheet .sheet-header p{font-size:.65rem!important;margin:0!important}
        body.asthma-video-only .action-sheet .close-btn{min-width:48px!important;min-height:44px!important}
        body.asthma-video-only .action-sheet .sheet-patient-context{display:none!important}
        body.asthma-video-only .action-sheet .vp-panel{padding:12px 14px 18px!important}
        body.asthma-video-only .action-sheet .vp-panel>.sub{font-size:.84rem!important;line-height:1.35!important;margin:0 0 10px!important;color:#5d7484!important}
        body.asthma-video-only .action-sheet button,
        body.asthma-video-only .action-sheet summary,
        body.asthma-video-only .action-sheet a{touch-action:manipulation}
        body.asthma-video-only #historyPanel .history-response-card,
        body.asthma-video-only #historyPanel .history-patient-banner,
        body.asthma-video-only #historyPanel .known-history-section,
        body.asthma-video-only #historyPanel .history-guided-tools{display:none!important}
        body.asthma-video-only #historyPanel .history-question-list{display:block!important}
        body.asthma-video-only #historyPanel .history-question-category{border-radius:13px!important;overflow:hidden!important;margin-bottom:8px!important;background:#fff!important;border:1px solid #d9e4eb!important}
        body.asthma-video-only #historyPanel .history-question-category>summary{min-height:56px!important;padding:12px 13px!important;cursor:pointer!important;display:flex!important;align-items:center!important}
        body.asthma-video-only #historyPanel .history-question-button{min-height:52px!important;font-size:.96rem!important;text-align:left!important;margin-bottom:7px!important}
        body.asthma-video-only #historyPanel .history-custom-question{margin-top:12px!important}
        body.asthma-video-only .patient-first-focus{outline:3px solid #18a7df!important;outline-offset:3px!important;border-radius:12px!important;transition:outline-color .2s ease!important}

        .patient-first-mobile-feed{display:block;background:#f5f8fb;color:#102a3c;min-height:58dvh;padding:13px 14px 112px;box-sizing:border-box}
        .patient-first-mobile-feed-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
        .patient-first-mobile-feed-head div small{display:block;color:#687f90;font-size:.66rem;font-weight:900;letter-spacing:.1em}
        .patient-first-mobile-feed-head div strong{display:block;margin-top:1px;font-size:1.12rem;letter-spacing:-.01em}
        .patient-first-mobile-status{font-size:.72rem;font-weight:850;color:#0878a8;background:#e6f5fb;border:1px solid #b8e2f2;border-radius:999px;padding:6px 9px;white-space:nowrap}
        .patient-first-context{margin:0 0 10px;color:#5c7281;font-size:.8rem;line-height:1.35}
        .patient-first-vitals{display:flex;gap:6px;overflow-x:auto;padding:1px 0 10px;margin-bottom:2px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
        .patient-first-vitals::-webkit-scrollbar{display:none}
        .patient-first-vital{flex:0 0 auto;min-width:72px;padding:7px 9px;border:1px solid #d8e3ea;border-radius:11px;background:#fff}
        .patient-first-vital small{display:block;color:#6f8492;font-size:.61rem;font-weight:850;letter-spacing:.04em}
        .patient-first-vital strong{display:block;margin-top:2px;color:#17364a;font-size:.9rem}
        .patient-first-vital.empty{min-width:0;color:#6f8492;font-size:.74rem;padding:7px 10px}
        .patient-first-conversation{display:grid;gap:9px;margin:6px 0 14px}
        .patient-first-empty{padding:14px;border:1px solid #d7e3eb;border-radius:13px;background:#fff;color:#50697a;line-height:1.45}
        .patient-first-bubble{max-width:88%;padding:10px 12px;border-radius:15px;line-height:1.38;box-shadow:0 2px 8px rgba(13,45,65,.06);word-break:break-word}
        .patient-first-bubble small{display:block;margin-bottom:4px;font-size:.65rem;font-weight:900;letter-spacing:.05em;opacity:.72}
        .patient-first-bubble.user{justify-self:end;background:#dceeff;border:1px solid #bdddf6;border-bottom-right-radius:5px}
        .patient-first-bubble.patient{justify-self:start;background:#fff;border:1px solid #d7e3eb;border-bottom-left-radius:5px}
        .patient-first-event{display:grid;grid-template-columns:32px 1fr;gap:9px;align-items:start;padding:10px 11px;border:1px solid #d9e4eb;border-radius:13px;background:#eef4f7;color:#17364a}
        .patient-first-event-icon{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:#fff;border:1px solid #d4e0e7;font-size:.95rem}
        .patient-first-event small{display:block;color:#6b808e;font-size:.62rem;font-weight:900;letter-spacing:.07em}
        .patient-first-event strong{display:block;margin-top:2px;font-size:.86rem;line-height:1.35}
        .patient-first-quick{margin-top:14px;padding-top:12px;border-top:1px solid #dce5eb}
        .patient-first-quick>strong{display:block;margin-bottom:8px;font-size:.88rem}
        .patient-first-quick-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .patient-first-quick button{min-height:52px;padding:10px 11px;border:1px solid #cad9e3;border-radius:13px;background:#fff;color:#17364a;text-align:left;font:inherit;font-size:.88rem;font-weight:800;line-height:1.25;touch-action:manipulation}
        .patient-first-quick button.primary{grid-column:1/-1;background:#0b6fa8;color:#fff;border-color:#0b6fa8;text-align:center}

        .patient-first-mobile-nav{display:grid;position:fixed;left:9px;right:9px;bottom:max(8px,env(safe-area-inset-bottom));z-index:9996;grid-template-columns:repeat(4,1fr);gap:4px;padding:5px;border:1px solid rgba(142,213,239,.25);border-radius:17px;background:rgba(4,20,32,.97);box-shadow:0 12px 34px rgba(0,0,0,.4);backdrop-filter:blur(14px)}
        .patient-first-mobile-nav button{min-height:52px;border:0;border-radius:12px;background:transparent;color:#d2e3ec;font:inherit;font-size:.74rem;font-weight:850;display:grid;place-items:center;gap:2px;touch-action:manipulation}
        .patient-first-mobile-nav button span{font-size:1.15rem;line-height:1}
        .patient-first-mobile-nav button.active{background:#0d6fa7;color:#fff}
        .patient-first-mobile-nav button:active{transform:scale(.97)}
        .patient-first-mobile-hint{display:block;position:absolute;left:12px;bottom:44px;z-index:20;padding:7px 10px;border-radius:999px;background:rgba(3,17,28,.82);color:#fff;font-size:.71rem;font-weight:850;backdrop-filter:blur(8px)}
        body.asthma-video-only.mobile-patient-video-playing .patient-first-mobile-hint{display:none}

        @media(orientation:landscape){
          body.asthma-video-only .scenario-hero-layout>.patient-stage{height:44dvh!important;min-height:190px!important}
          body.asthma-video-only.mobile-patient-video-playing .scenario-hero-layout>.patient-stage{height:72dvh!important}
        }
        @media(prefers-reduced-motion:reduce){
          html{scroll-behavior:auto}.patient-first-mobile-nav button,.scenario-hero-layout>.patient-stage{transition:none!important}
        }
      }
    `;
    document.head.appendChild(style);
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

  function ensureStageOverlay(){
    if(!isMobile()) return;
    const stage=q('.patient-stage');
    if(!stage) return;
    let overlay=q('#patientFirstStageOverlay',stage);
    if(!overlay){
      overlay=document.createElement('div');
      overlay.id='patientFirstStageOverlay';
      overlay.className='patient-first-stage-overlay';
      overlay.innerHTML=`<div class="patient-first-stage-title"><small>BREATHING PROBLEM</small><strong>24 y/o • Public park</strong></div><button class="patient-first-stage-menu" type="button" aria-label="Scenario options">⋮</button>`;
      stage.appendChild(overlay);
      q('.patient-first-stage-menu',overlay)?.addEventListener('click',()=>q('#scenarioMenuButton')?.click());
    }
    let meta=q('#patientFirstStageMeta',stage);
    if(!meta){
      meta=document.createElement('div');
      meta.id='patientFirstStageMeta';
      meta.className='patient-first-stage-meta';
      meta.innerHTML='<span id="patientFirstClock">00:00</span><span id="patientFirstVisualStatus">Speaking in short sentences</span>';
      stage.appendChild(meta);
    }
  }

  function syncClock(){
    if(!isMobile()) return;
    const target=q('#patientFirstClock');
    const source=q('#timer');
    if(target&&source) target.textContent=clean(source.textContent)||'00:00';
  }

  function renderVitalStrip(){
    if(!isMobile()) return;
    const host=q('#patientFirstVitals');
    if(!host) return;
    const items=[
      ['SpO₂','spo2'],['RR','respirations'],['Pulse','pulse'],['BP','blood_pressure']
    ].map(([label,key])=>[label,findingValue(key)]).filter(([,value])=>value);
    host.replaceChildren();
    if(!items.length){
      const empty=document.createElement('div');
      empty.className='patient-first-vital empty';
      empty.textContent='No vital signs obtained yet';
      host.appendChild(empty);
      return;
    }
    items.forEach(([label,value])=>{
      const card=document.createElement('div');
      card.className='patient-first-vital';
      card.innerHTML='<small></small><strong></strong>';
      q('small',card).textContent=label;
      q('strong',card).textContent=value;
      host.appendChild(card);
    });
  }

  function openingLine(){
    try{
      const interview=window.EMSCodeSimScenarioInterviews?.get?.('asthma')||window.EMSCodeSimScenarioInterviews?.PROFILES?.asthma;
      const value=clean(interview?.opening);
      if(value&&!/select a question|patient interview/i.test(value)) return value;
    }catch(_){}
    return '“I can’t catch my breath.”';
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
        <p class="patient-first-context">Public park • Shortness of breath and wheezing</p>
        <div id="patientFirstVitals" class="patient-first-vitals" aria-label="Vital signs obtained"></div>
        <div id="patientFirstConversation" class="patient-first-conversation" role="log" aria-live="polite"></div>
        <section class="patient-first-quick" aria-label="Suggested next actions">
          <strong>What would you like to do?</strong>
          <div id="patientFirstQuickGrid" class="patient-first-quick-grid"></div>
        </section>`;
      center.prepend(mobileFeed);
      appendBubble('patient',openingLine(),'PATIENT');
      baselineCareLog();
    }
    mobileQuick=q('#patientFirstQuickGrid');
    renderVitalStrip();
    renderQuickActions();
    return mobileFeed;
  }

  function appendBubble(type,text,label){
    if(!isMobile()) return;
    if(!mobileFeed) createMobileFeed();
    const value=clean(text);
    if(!value) return;
    const conversation=q('#patientFirstConversation');
    if(!conversation) return;
    const signature=`${type}:${value}`;
    if(qa('[data-signature]',conversation).slice(-8).some(node=>node.dataset.signature===signature)) return;
    const bubble=document.createElement('article');
    bubble.className=`patient-first-bubble ${type}`;
    bubble.dataset.signature=signature;
    bubble.innerHTML='<small></small><div></div>';
    q('small',bubble).textContent=label||(type==='user'?'YOU':'PATIENT');
    q('div',bubble).textContent=value;
    conversation.appendChild(bubble);
    window.setTimeout(()=>bubble.scrollIntoView({behavior:'smooth',block:'nearest'}),40);
  }

  function baselineCareLog(){
    if(careBaselineReady) return;
    const log=Array.isArray(record()?.careLog)?record().careLog:[];
    log.forEach((event,index)=>seenCareEvents.add(String(event.id||event.eventId||`${event.type||'event'}:${event.key||''}:${event.recordedAt||index}`)));
    careBaselineReady=true;
  }

  function eventSignature(event,index){
    return String(event?.id||event?.eventId||`${event?.type||'event'}:${event?.key||''}:${event?.recordedAt||index}:${event?.value||''}`);
  }

  function careEventPresentation(event){
    const category=clean(event?.category||'').toLowerCase();
    const type=clean(event?.type||'').toLowerCase();
    if(category==='history'||type==='history'||type==='documentation') return null;
    let icon='🩺',label='ASSESSMENT';
    if(category==='vital'){icon='♥';label='VITAL SIGN';}
    else if(category==='treatment'||type==='treatment'){icon='✚';label='TREATMENT';}
    else if(type==='reassessment'){icon='↻';label='REASSESSMENT';}
    const title=clean(event?.label||event?.key||label);
    const value=scalar(event?.value??event?.finding??event?.description??event?.details);
    if(!title&&!value) return null;
    const text=value&&title&&!value.toLowerCase().startsWith(title.toLowerCase())?`${title}: ${value}`:(value||title);
    return {icon,label,text};
  }

  function appendCareEvent(event,index){
    const presentation=careEventPresentation(event);
    if(!presentation||!isMobile()) return;
    createMobileFeed();
    const conversation=q('#patientFirstConversation');
    if(!conversation) return;
    const signature=`care:${eventSignature(event,index)}`;
    if(q(`[data-signature="${CSS.escape(signature)}"]`,conversation)) return;
    const card=document.createElement('article');
    card.className='patient-first-event';
    card.dataset.signature=signature;
    card.innerHTML='<div class="patient-first-event-icon"></div><div><small></small><strong></strong></div>';
    q('.patient-first-event-icon',card).textContent=presentation.icon;
    q('small',card).textContent=presentation.label;
    q('strong',card).textContent=presentation.text;
    conversation.appendChild(card);
    const status=q('#patientFirstStatus');
    if(status) status.textContent=presentation.label==='TREATMENT'?'Treatment recorded':'New finding';
    renderVitalStrip();
    renderQuickActions();
    window.setTimeout(()=>card.scrollIntoView({behavior:'smooth',block:'nearest'}),40);
    if(!q('#embeddedSimWorkspace:not([hidden]),.scenario-mini-sim-overlay:not([hidden])')) window.setTimeout(closeSheet,160);
  }

  function syncCareLog(){
    if(!isMobile()) return;
    const log=Array.isArray(record()?.careLog)?record().careLog:[];
    if(!careBaselineReady){baselineCareLog();return;}
    log.forEach((event,index)=>{
      const sig=eventSignature(event,index);
      if(seenCareEvents.has(sig)) return;
      seenCareEvents.add(sig);
      appendCareEvent(event,index);
    });
  }

  function underlyingDomainButton(panel){
    return q(`.bottom-nav button[data-panel="${panel}"]`);
  }

  function syncNavActive(panel=''){
    qa('#patientFirstMobileNav button').forEach(button=>button.classList.toggle('active',button.dataset.mobileDomain===panel));
  }

  function focusTool(panel,key){
    openDomain(panel);
    window.setTimeout(()=>{
      const sheet=q('#actionSheet');
      const target=sheet?.querySelector(`[data-tool-key="${key}"], [data-key="${key}"], [data-assessment-key="${key}"]`);
      if(!target) return;
      target.classList.add('patient-first-focus');
      target.scrollIntoView({behavior:'smooth',block:'center'});
      window.setTimeout(()=>target.classList.remove('patient-first-focus'),1800);
    },120);
  }

  function openDomain(panel){
    const button=underlyingDomainButton(panel);
    if(!button) return false;
    try{navigator.vibrate?.(8);}catch(_){}
    button.click();
    syncNavActive(panel);
    window.setTimeout(syncSheetState,30);
    return true;
  }

  function closeSheet(){
    const sheet=q('#actionSheet');
    if(!sheet||sheet.hidden) return;
    const close=q('#closeSheet');
    if(close) close.click();
    else{
      sheet.hidden=true;
      const backdrop=q('#sheetBackdrop');
      if(backdrop) backdrop.hidden=true;
    }
    document.body.classList.remove('mobile-patient-sheet-open');
    syncNavActive('');
    window.setTimeout(()=>q('#patientFirstMobileFeed')?.scrollIntoView({behavior:'smooth',block:'nearest'}),80);
  }

  function syncSheetState(){
    if(!isMobile()) return;
    const sheet=q('#actionSheet');
    const open=Boolean(sheet&&!sheet.hidden);
    document.body.classList.toggle('mobile-patient-sheet-open',open);
    if(!open){syncNavActive('');return;}
    const visible=['historyPanel','assessmentPanel','vitalsPanel','treatmentPanel'].find(id=>q(`#${id}`)?.hidden===false)||'';
    if(visible) syncNavActive(visible);
  }

  function ensureSheetObserver(){
    if(sheetObserver) return;
    const sheet=q('#actionSheet');
    if(!sheet) return;
    sheetObserver=new MutationObserver(syncSheetState);
    sheetObserver.observe(sheet,{attributes:true,subtree:true,attributeFilter:['hidden']});
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
        const alreadyOpen=q('#actionSheet')?.hidden===false&&button.classList.contains('active');
        if(alreadyOpen){closeSheet();return;}
        openDomain(panel);
      });
    }
    return mobileNav;
  }

  function historyQuestionButtons(){return qa('#historyPanel .history-question-button');}

  function askHistoryByPattern(pattern){
    const source=historyQuestionButtons().find(button=>pattern.test(clean(button.textContent))&&!button.disabled);
    if(!source){openDomain('historyPanel');return false;}
    const question=clean(source.querySelector('span')?.textContent||source.textContent||'Question').replace(/Ask again|Ask$/i,'');
    lastQuestion=question;
    appendBubble('user',question,'YOU ASKED');
    source.click();
    window.setTimeout(()=>{syncLatestHistoryResponse();closeSheet();},130);
    return true;
  }

  function renderQuickActions(){
    if(!isMobile()) return;
    if(!mobileFeed) return;
    const grid=mobileQuick||q('#patientFirstQuickGrid');
    if(!grid) return;
    grid.replaceChildren();
    const r=record();
    const findings=r?.findings||{};
    const treatments=Array.isArray(r?.treatments)?r.treatments:[];
    const reassessments=Array.isArray(r?.reassessments)?r.reassessments:[];
    const historyCount=Object.keys(r?.history||{}).length;

    const add=(label,action,primary=false)=>{
      const button=document.createElement('button');
      button.type='button';
      button.textContent=label;
      if(primary) button.className='primary';
      button.addEventListener('click',action);
      grid.appendChild(button);
    };

    if(!findings.airway&&!findings.breathing){
      add('Assess airway & breathing',()=>focusTool('assessmentPanel','breathing'),true);
      add('Ask what happened',()=>askHistoryByPattern(/what happened|what were you doing|when did.*start|start(ed)?|begin/i));
      add('Get vital signs',()=>openDomain('vitalsPanel'));
      return;
    }
    if(!findingValue('spo2')){
      add('Get respiratory vitals',()=>focusTool('vitalsPanel','spo2'),true);
      if(historyCount<2) add('Ask what happened',()=>askHistoryByPattern(/what happened|what were you doing|when did.*start|start(ed)?|begin/i));
      add('Continue assessment',()=>openDomain('assessmentPanel'));
      return;
    }
    if(historyCount<2){
      add('Continue patient interview',()=>openDomain('historyPanel'),true);
      add('Assess breath sounds',()=>focusTool('assessmentPanel','breath_sounds'));
      add('Review vital signs',()=>openDomain('vitalsPanel'));
      return;
    }
    if(!treatments.length){
      add('Review treatment options',()=>openDomain('treatmentPanel'),true);
      add('Ask another question',()=>openDomain('historyPanel'));
      add('Continue assessment',()=>openDomain('assessmentPanel'));
      return;
    }
    if(!reassessments.length){
      add('Reassess the patient',()=>openDomain('assessmentPanel'),true);
      add('Repeat vital signs',()=>openDomain('vitalsPanel'));
      add('Ask how they feel now',()=>openDomain('historyPanel'));
      return;
    }
    add('Continue patient interview',()=>openDomain('historyPanel'),true);
    add('Repeat vital signs',()=>openDomain('vitalsPanel'));
    add('Review treatment',()=>openDomain('treatmentPanel'));
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
    responseObserver=new MutationObserver(()=>window.setTimeout(syncLatestHistoryResponse,20));
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
        window.setTimeout(()=>{syncLatestHistoryResponse();closeSheet();},130);
      });
    });
    qa('#historyPanel .history-question-category>summary').forEach(summary=>{
      if(summary.dataset.patientFirstWired) return;
      summary.dataset.patientFirstWired='1';
      summary.addEventListener('click',()=>window.setTimeout(()=>summary.scrollIntoView({behavior:'smooth',block:'start'}),60));
    });
    const custom=q('#askHistoryCustom');
    if(custom&&!custom.dataset.patientFirstWired){
      custom.dataset.patientFirstWired='1';
      custom.addEventListener('click',()=>{
        const text=clean(q('#historyCustomInput')?.value);
        if(text){lastQuestion=text;appendBubble('user',text,'YOU ASKED');}
        window.setTimeout(()=>{syncLatestHistoryResponse();closeSheet();},170);
      });
    }
  }

  function ensurePatientHint(){
    if(!isMobile()) return;
    const stage=q('.patient-stage');
    if(!stage||q('.patient-first-mobile-hint',stage)) return;
    let seen=false;
    try{seen=sessionStorage.getItem('emscodesim:mobile-patient-hint')==='1';}catch(_){}
    if(seen) return;
    const hint=document.createElement('div');
    hint.className='patient-first-mobile-hint';
    hint.textContent='Watch the patient, then work the call below.';
    stage.appendChild(hint);
    try{sessionStorage.setItem('emscodesim:mobile-patient-hint','1');}catch(_){}
    window.setTimeout(()=>hint.remove(),4200);
  }

  function wireVideos(){
    if(!isMobile()) return;
    qa('video').forEach(video=>{
      if(video.dataset.patientFirstVideoWired) return;
      video.dataset.patientFirstVideoWired='1';
      const begin=()=>{
        document.body.classList.add('mobile-patient-video-playing');
        const status=q('#patientFirstStatus');
        if(status) status.textContent='Watch patient';
        const visual=q('#patientFirstVisualStatus');
        if(visual) visual.textContent='Patient update';
        q('.patient-stage')?.scrollIntoView({behavior:'smooth',block:'start'});
      };
      const end=()=>{
        document.body.classList.remove('mobile-patient-video-playing');
        const status=q('#patientFirstStatus');
        if(status) status.textContent='Continue care';
        const visual=q('#patientFirstVisualStatus');
        if(visual) visual.textContent='Speaking in short sentences';
        window.setTimeout(()=>q('#patientFirstMobileFeed')?.scrollIntoView({behavior:'smooth',block:'start'}),220);
      };
      video.addEventListener('play',begin);
      video.addEventListener('ended',end);
      video.addEventListener('error',end);
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
      const button=document.createElement('button');
      button.type='button';
      button.textContent=clean(source.querySelector('span')?.textContent||source.textContent||'Ask patient').replace(/Ask again|Ask$/i,'');
      button.style.cssText='min-height:48px;padding:10px 12px;text-align:left;border-radius:10px;border:1px solid #31566d;background:#10283a;color:#eef8fb;font:inherit;font-weight:750';
      button.addEventListener('click',()=>source.click());
      list.appendChild(button);
    });
  }

  function refresh(){
    if(refreshQueued) return;
    refreshQueued=true;
    requestAnimationFrame(()=>{
      refreshQueued=false;
      if(!isAsthma()) return;
      document.body.classList.add('asthma-video-only');
      installStyles();
      if(isMobile()){
        ensureInteractionColumn();
        ensureStageOverlay();
        createMobileFeed();
        ensureMobileNav();
        ensurePatientHint();
        wireHistoryQuestions();
        wireVideos();
        ensureSheetObserver();
        syncLatestHistoryResponse();
        syncCareLog();
        renderVitalStrip();
        renderQuickActions();
        syncClock();
        syncSheetState();
      }else{
        q('#patientFirstMobileNav')?.remove();
        q('#patientFirstStageOverlay')?.remove();
        q('#patientFirstStageMeta')?.remove();
        document.body.classList.remove('mobile-patient-sheet-open','mobile-patient-video-playing');
        desktopQuestionTray();
      }
    });
  }

  function start(){
    if(!isAsthma()) return;
    installStyles();
    refresh();
    observeHistory();
    if(!clockTimer) clockTimer=window.setInterval(syncClock,1000);

    document.addEventListener('toggle',event=>{
      if(event.target?.matches?.('#historyPanel .history-question-category')) window.setTimeout(refresh,20);
    },true);
    document.addEventListener('click',event=>{
      if(!isAsthma()) return;
      if(event.target.closest?.('#historyPanel .history-question-category>summary,.bottom-nav button[data-panel],#closeSheet,#sheetBackdrop')) window.setTimeout(refresh,35);
    });

    const observer=new MutationObserver(mutations=>{
      const selfOnly=mutations.every(m=>m.target.closest?.('#patientFirstMobileFeed,#patientFirstMobileNav,#patientFirstStageOverlay,#patientFirstStageMeta,#patientQuestionChoiceTray'));
      if(!selfOnly) refresh();
    });
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','open']});
    window.addEventListener('emscodesim:scenario-updated',refresh);
    window.addEventListener('emscodesim:patient-record-updated',()=>window.setTimeout(()=>{syncCareLog();renderVitalStrip();renderQuickActions();},30));
    window.addEventListener('resize',refresh);
    window.addEventListener('orientationchange',()=>window.setTimeout(refresh,180));
    window.addEventListener('pagehide',()=>{
      observer.disconnect();
      responseObserver?.disconnect();
      sheetObserver?.disconnect();
      if(clockTimer) window.clearInterval(clockTimer);
    },{once:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
