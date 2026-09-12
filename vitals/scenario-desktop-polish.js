(()=>{
  'use strict';
  const VERSION='2026.09.12.1';
  const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const caseId=()=>String(new URLSearchParams(location.search).get('case')||window.EMSCodeSimScenarioSession?.requestedCaseId?.()||window.EMSCodeSimPatientRecord?.active?.()?.scenarioId||'').replace(/-/g,'_').toLowerCase();
  const active=()=>['asthma','respiratory'].includes(caseId())&&matchMedia('(min-width:980px)').matches;
  let observer=null,queued=false,lastHistory='';

  function record(){try{return window.EMSCodeSimScenarioSession?.sync?.()||window.EMSCodeSimPatientRecord?.active?.()||{};}catch(_){return {};}}
  function scalar(v){if(v==null)return'';if(typeof v==='string'||typeof v==='number')return clean(v);if(Array.isArray(v))return clean(v.map(scalar).filter(Boolean).join('; '));if(typeof v==='object')return clean(v.value||v.finding||v.details||v.description||v.name||v.label||'');return clean(v)}

  function styles(){
    if(q('#desktopPatientPolishStyles'))return;
    const s=document.createElement('style');s.id='desktopPatientPolishStyles';s.textContent=`
      @media(min-width:980px){
        body.asthma-video-only{background:#07131d!important}
        body.asthma-video-only .vp-shell{max-width:1680px!important;margin:0 auto!important;padding:14px 16px 22px!important}
        body.asthma-video-only .vp-top{margin-bottom:10px!important;padding:10px 14px!important;border-radius:14px!important;background:#0a1d2a!important;border:1px solid #19384a!important}
        body.asthma-video-only .vp-top #scene{max-width:760px!important}
        body.asthma-video-only .scenario-quick-controls{margin:0 0 10px!important}
        body.asthma-video-only .scenario-hero-layout{display:grid!important;grid-template-columns:minmax(250px,.7fr) minmax(620px,1.9fr) minmax(310px,.82fr)!important;gap:12px!important;align-items:stretch!important;min-height:calc(100vh - 175px)!important}
        body.asthma-video-only .patient-stage{position:sticky!important;top:12px!important;height:calc(100vh - 188px)!important;min-height:560px!important;max-height:none!important;border-radius:16px!important;overflow:hidden!important;border:1px solid #244557!important;background:#04131e!important;align-self:start!important}
        body.asthma-video-only .patient-stage video{object-fit:cover!important}
        body.asthma-video-only #clinicalInteractionColumn{position:relative!important;display:flex!important;flex-direction:column!important;min-width:0!important;min-height:560px!important;height:calc(100vh - 188px)!important;padding:0!important;border:1px solid #244557!important;border-radius:16px!important;background:#0b1e2b!important;overflow:hidden!important;box-shadow:0 16px 44px rgba(0,0,0,.18)!important}
        body.asthma-video-only .patient-control-column{position:sticky!important;top:12px!important;align-self:start!important;height:calc(100vh - 188px)!important;min-height:560px!important;overflow:auto!important;padding:10px!important;border:1px solid #244557!important;border-radius:16px!important;background:#0a1b27!important;scrollbar-width:thin!important}
        body.asthma-video-only .patient-control-column>.info-update-window,body.asthma-video-only #horseClinicalQuestionBox,body.asthma-video-only #horseCurrentAssessment{display:none!important}
        body.asthma-video-only .patient-control-column>.bottom-nav{position:sticky!important;top:0!important;z-index:20!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:7px!important;margin:0 0 10px!important;padding:8px!important;border-radius:13px!important;background:#0d2635!important;border:1px solid #294b5d!important}
        body.asthma-video-only .patient-control-column>.bottom-nav button{min-height:46px!important;border-radius:10px!important;padding:8px!important;font-size:.78rem!important}
        body.asthma-video-only .patient-control-column>.bottom-nav button.active{background:#0d78ae!important;color:#fff!important;border-color:#31a9d8!important}
        body.asthma-video-only .action-sheet{position:static!important;display:block!important;width:100%!important;max-width:none!important;max-height:none!important;min-width:0!important;padding:0!important;overflow:visible!important;border:0!important;box-shadow:none!important;background:transparent!important;color:#eaf5f8!important}
        body.asthma-video-only .action-sheet[hidden]{display:none!important}
        body.asthma-video-only .sheet-backdrop{display:none!important}
        body.asthma-video-only .action-sheet .sheet-handle,body.asthma-video-only .action-sheet .close-btn,body.asthma-video-only .action-sheet .sheet-patient-context{display:none!important}
        body.asthma-video-only .action-sheet .sheet-header{position:static!important;padding:8px 6px 9px!important;background:transparent!important;border-bottom:1px solid #294b5d!important;color:#eaf5f8!important}
        body.asthma-video-only .action-sheet .sheet-header h2{font-size:1rem!important;margin:0!important}
        body.asthma-video-only .action-sheet .sheet-header p{font-size:.72rem!important;color:#9bb9c8!important;margin:3px 0 0!important}
        body.asthma-video-only .action-sheet .vp-panel{padding:9px 5px 20px!important;color:#eaf5f8!important}
        body.asthma-video-only .action-sheet .vp-panel button,body.asthma-video-only .action-sheet .vp-panel summary,body.asthma-video-only .action-sheet .vp-panel a{min-height:44px!important}
        body.asthma-video-only #historyPanel .history-question-list{display:none!important}
        body.asthma-video-only #historyPanel .history-question-category{margin:0 0 6px!important;border:1px solid #294b5d!important;border-radius:10px!important;background:#0f2a39!important}
        body.asthma-video-only #historyPanel .history-question-category>summary{padding:10px!important;color:#eaf5f8!important;cursor:pointer!important}

        .desktop-patient-hub{display:flex;flex-direction:column;min-height:0;height:100%;color:#eaf5f8}
        .desktop-patient-hub-head{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 15px;border-bottom:1px solid #294b5d;background:#0d2635}
        .desktop-patient-hub-head small{display:block;font-size:.63rem;letter-spacing:.11em;font-weight:900;color:#7ec8e5}.desktop-patient-hub-head strong{display:block;margin-top:2px;font-size:1.05rem}.desktop-patient-state{font-size:.74rem;font-weight:850;padding:6px 9px;border:1px solid #3f748b;border-radius:999px;background:#12384a;color:#bce8f7}
        .desktop-patient-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;padding:10px 12px;border-bottom:1px solid #294b5d;background:#0b2130}
        .desktop-patient-actions button{min-height:44px;border:1px solid #31586b;border-radius:10px;background:#102d3d;color:#dcedf4;font:inherit;font-size:.8rem;font-weight:800;cursor:pointer}.desktop-patient-actions button.active{background:#0c78ad;color:#fff;border-color:#4ab9e1}
        .desktop-patient-summary{display:flex;gap:7px;overflow-x:auto;padding:9px 12px;border-bottom:1px solid #244557;scrollbar-width:thin;background:#091c29}.desktop-patient-summary article{flex:0 0 auto;min-width:92px;padding:7px 9px;border:1px solid #294b5d;border-radius:10px;background:#102837}.desktop-patient-summary small{display:block;color:#87a8b8;font-size:.6rem;font-weight:850}.desktop-patient-summary strong{display:block;margin-top:2px;color:#fff;font-size:.86rem}
        .desktop-patient-stream{flex:1 1 auto;min-height:0;overflow:auto;padding:13px 16px 26px;display:grid;align-content:start;gap:9px;scrollbar-width:thin}
        .desktop-stream-empty{padding:16px;border:1px dashed #365b6d;border-radius:12px;color:#aac1cc;background:#0e2735;line-height:1.45}
        .desktop-stream-item{display:grid;grid-template-columns:34px 1fr;gap:10px;align-items:start;padding:10px 12px;border:1px solid #294b5d;border-radius:12px;background:#102735}.desktop-stream-icon{width:32px;height:32px;border:1px solid #345f72;border-radius:9px;background:#0b1d29;display:grid;place-items:center}.desktop-stream-item small{display:block;font-size:.61rem;letter-spacing:.08em;font-weight:900;color:#7fc1dc}.desktop-stream-item strong{display:block;margin-top:2px;font-size:.88rem;line-height:1.35;color:#f2f8fa}.desktop-stream-item p{margin:3px 0 0;color:#afc5ce;font-size:.76rem;line-height:1.35}.desktop-stream-item.patient{border-left:4px solid #53b2d6}.desktop-stream-item.treatment{border-left:4px solid #68c794}.desktop-stream-item.vital{border-left:4px solid #e7bd5a}.desktop-stream-item.assessment{border-left:4px solid #84a9ed}
        body.asthma-video-only #patientCommunicationStage{flex:0 0 auto!important;max-height:260px!important;min-height:0!important;padding:0 14px 14px!important;overflow:auto!important;background:#0b1e2b!important}
        body.asthma-video-only #patientQuestionChoiceTray{margin-top:10px!important;background:#102837!important;border-color:#31586b!important}
        body.asthma-video-only #patientConversationTurn{min-height:0!important;padding:0!important}
      }
    `;document.head.appendChild(s);
  }

  function actionButton(label,panel,icon){const b=document.createElement('button');b.type='button';b.dataset.panel=panel;b.innerHTML=`<span aria-hidden="true">${icon}</span> ${label}`;b.addEventListener('click',()=>q(`.bottom-nav button[data-panel="${panel}"]`)?.click());return b}

  function ensureHub(){
    if(!active())return null;
    const center=q('#clinicalInteractionColumn');if(!center)return null;
    let hub=q('#desktopPatientHub');
    if(!hub){
      hub=document.createElement('section');hub.id='desktopPatientHub';hub.className='desktop-patient-hub';
      hub.innerHTML=`<header class="desktop-patient-hub-head"><div><small>PATIENT ENCOUNTER</small><strong>Work the patient</strong></div><span id="desktopPatientState" class="desktop-patient-state">Active encounter</span></header><nav id="desktopPatientActions" class="desktop-patient-actions" aria-label="Clinical actions"></nav><section id="desktopPatientSummary" class="desktop-patient-summary" aria-label="Current patient findings"></section><section id="desktopPatientStream" class="desktop-patient-stream" role="log" aria-live="polite"></section>`;
      center.prepend(hub);
      const nav=q('#desktopPatientActions',hub);[['Ask','historyPanel','💬'],['Assess','assessmentPanel','🩺'],['Vitals','vitalsPanel','♥'],['Treat','treatmentPanel','✚']].forEach(x=>nav.appendChild(actionButton(...x)));
    }
    return hub;
  }

  function renderSummary(){const host=q('#desktopPatientSummary');if(!host)return;const fields=[['SpO₂','spo2'],['RR','respirations'],['Pulse','pulse'],['BP','blood_pressure'],['Breath sounds','breath_sounds']];host.replaceChildren();fields.forEach(([label,key])=>{const v=scalar(record()?.findings?.[key]);if(!v)return;const a=document.createElement('article');a.innerHTML=`<small>${label}</small><strong></strong>`;q('strong',a).textContent=v;host.appendChild(a)});if(!host.children.length){const a=document.createElement('article');a.innerHTML='<small>FINDINGS</small><strong>Gather data</strong>';host.appendChild(a)}}

  function careItems(){
    const r=record(),items=[];
    const log=Array.isArray(r.careLog)?r.careLog:[];
    log.slice(-18).forEach((e,i)=>{const type=clean(e.category||e.type||'assessment').toLowerCase();const value=scalar(e.value||e.finding||e.description||e.details);if(!value)return;items.push({id:e.id||`care-${i}-${e.recordedAt||''}`,type:type.includes('vital')?'vital':type.includes('treat')||e.type==='treatment'?'treatment':'assessment',label:clean(e.label||e.key||e.type||'Clinical finding'),value,time:e.recordedAt||e.time||''})});
    const hq=clean(q('#historyResponseQuestion')?.textContent),hr=clean(q('#historyResponseText')?.textContent);if(hr&&!/select a question/i.test(hr)){const sig=`${hq}|${hr}`;items.push({id:`history-${sig}`,type:'patient',label:hq&&!/focused questions/i.test(hq)?hq:'Patient response',value:hr,time:''});lastHistory=sig}
    return items;
  }

  function renderStream(){const host=q('#desktopPatientStream');if(!host)return;const items=careItems();host.replaceChildren();if(!items.length){const e=document.createElement('div');e.className='desktop-stream-empty';e.textContent='Begin with the patient. Ask focused questions, assess immediate threats, obtain vitals, and treat what you find. The encounter timeline will build here.';host.appendChild(e);return}const icons={patient:'💬',vital:'♥',treatment:'✚',assessment:'🩺'};items.forEach(item=>{const a=document.createElement('article');a.className=`desktop-stream-item ${item.type}`;a.innerHTML=`<span class="desktop-stream-icon">${icons[item.type]||'•'}</span><div><small>${item.type==='patient'?'PATIENT':item.type.toUpperCase()}</small><strong></strong><p></p></div>`;q('strong',a).textContent=item.label;q('p',a).textContent=item.value;host.appendChild(a)});host.scrollTop=host.scrollHeight}

  function syncActive(){const activePanel=q('.bottom-nav button[data-panel].active')?.dataset.panel||'';qa('#desktopPatientActions button').forEach(b=>b.classList.toggle('active',b.dataset.panel===activePanel));const m=window.EMSCodeSimPatientExperience?.mood?.();const state=q('#desktopPatientState');if(state&&m?.label)state.textContent=`Patient: ${m.label}`}

  function render(){queued=false;if(!active()){q('#desktopPatientHub')?.remove();return}styles();ensureHub();renderSummary();renderStream();syncActive()}
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(render)}
  function start(){styles();schedule();observer=new MutationObserver(m=>{if(m.every(x=>x.target.closest?.('#desktopPatientHub')))return;schedule()});observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','open']});window.addEventListener('emscodesim:patient-record-updated',schedule);window.addEventListener('emscodesim:scenario-updated',schedule);window.addEventListener('resize',schedule);document.addEventListener('click',e=>{if(e.target.closest?.('.bottom-nav button[data-panel],#historyPanel .history-question-button'))setTimeout(schedule,80)},true);window.addEventListener('pagehide',()=>observer?.disconnect(),{once:true});window.EMSCodeSimDesktopPolish=Object.freeze({version:VERSION,refresh:schedule})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();