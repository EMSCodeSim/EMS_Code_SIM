(()=>{
'use strict';
const api=window.EMSCodeSimPatientRecord,session=window.EMSCodeSimScenarioSession,rt=window.EMSCodeSimScenarioRuntime;
const $=id=>document.getElementById(id);
function record(){return session?.sync?.()||api?.active?.()||null}
function scenarioId(){const r=record();return String(r?.scenarioId||r?.id||'').toLowerCase()}
function rr(){const n=Number(rt?.vital?.('respirations',18));return Number.isFinite(n)?n:18}
function profile(){
 const id=scenarioId(),rate=rr();
 const map={
  horse_crush:{rhythm:'Regular',depth:'Normal',effort:'Unlabored'},
  asthma:{rhythm:'Regular',depth:'Shallow',effort:'Labored'},
  trauma:{rhythm:'Regular',depth:'Shallow',effort:'Labored'},
  pediatric:{rhythm:'Regular',depth:'Shallow',effort:'Labored'},
  stroke:{rhythm:'Regular',depth:'Normal',effort:'Unlabored'},
  hypoglycemia:{rhythm:'Regular',depth:'Normal',effort:'Unlabored'}
 };
 return map[id]||{rhythm:'Regular',depth:rate>24?'Shallow':'Normal',effort:rate>24?'Labored':'Unlabored'};
}
function install(){
 if(document.body.dataset.scenarioVital!=='respirations')return;
 const stage=$('stage');if(!stage||document.getElementById('respObservationClues'))return;
 const p=profile(),box=document.createElement('div');box.id='respObservationClues';box.className='resp-observation-clues';
 box.innerHTML=`<strong>Observed breathing characteristics</strong><div class="resp-clue-grid"><div class="resp-clue"><small>Rhythm</small><b>${p.rhythm}</b></div><div class="resp-clue"><small>Depth</small><b>${p.depth}</b></div><div class="resp-clue"><small>Effort</small><b>${p.effort}</b></div></div><small>Count the rate from visible chest rise. These descriptors represent findings you could observe at the bedside but may not be obvious from animation alone.</small>`;
 stage.insertAdjacentElement('afterend',box);
 const start=$('startMeasure');start?.addEventListener('click',()=>{box.classList.add('active')});
}
document.addEventListener('DOMContentLoaded',()=>{setTimeout(install,40);new MutationObserver(install).observe(document.body,{childList:true,subtree:true})});
})();
