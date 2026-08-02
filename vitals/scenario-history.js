(() => {
  'use strict';
  const KEY='emscodesim_scenario_history_v1';
  const $=id=>document.getElementById(id);
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read=()=>{try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(value)?value:[]}catch{return[]}};
  const write=value=>localStorage.setItem(KEY,JSON.stringify(value));
  const scoreOf=item=>Number.isFinite(Number(item.overallPercent))?Number(item.overallPercent):null;
  const formatDate=value=>{const d=new Date(value);return Number.isNaN(d.valueOf())?'Unknown date':d.toLocaleString([], {dateStyle:'medium',timeStyle:'short'})};
  const weakCatalog={
    assessment:{label:'Assessment completeness',detail:'Collect a complete baseline and complaint-focused assessment.',href:'/vitals/scenario-launcher.html'},
    classification:{label:'Normal vs. not normal',detail:'Classify each simulator finding before reporting it.',href:'/ems-encyclopedia.html?q=normal%20abnormal&level=emt&view=field'},
    impression:{label:'Clinical impression',detail:'Connect the full pattern of findings to a working impression.',href:'/ems-encyclopedia.html?q=clinical%20impression&level=emt&view=field'},
    reassessment:{label:'Reassessment',detail:'Repeat key findings after treatment and during transport.',href:'/vitals/treatment-reassessment.html?scenario=1'},
    documentation:{label:'PCR and handoff',detail:'Complete both the narrative and verbal transfer of care.',href:'/vitals/pcr-handoff.html?scenario=1'}
  };

  function calculateStats(items){
    const scores=items.map(scoreOf).filter(v=>v!==null);
    const average=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):null;
    const best=scores.length?Math.max(...scores):null;
    const recent=scores.slice(-3);const prior=scores.slice(-6,-3);
    let trend=null;
    if(recent.length&&prior.length){trend=Math.round(recent.reduce((a,b)=>a+b,0)/recent.length-prior.reduce((a,b)=>a+b,0)/prior.length)}
    return{average,best,trend};
  }

  function renderWeakAreas(items){
    const counts={};items.forEach(item=>(item.reviewAreas||[]).forEach(key=>counts[key]=(counts[key]||0)+1));
    const ranked=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,6);
    $('weakAreas').innerHTML=ranked.length?ranked.map(([key,count])=>{const meta=weakCatalog[key]||{label:key,detail:'Review this recurring performance area.',href:'/vitals/scenario-launcher.html'};return`<article class="weak-card"><h3>${escapeHtml(meta.label)}</h3><p>Flagged in ${count} scenario${count===1?'':'s'}. ${escapeHtml(meta.detail)}</p><a href="${escapeHtml(meta.href)}">Practice this area</a></article>`}).join(''):'<div class="no-weak">No repeated weak areas yet. Complete more debriefs to build a useful trend.</div>';
  }

  function renderTrend(items){
    const scored=items.filter(item=>scoreOf(item)!==null).slice(-12);
    $('trendChart').innerHTML=scored.length?scored.map((item,index)=>{const score=scoreOf(item);return`<div class="trend-bar ${score<70?'review':''}" title="${escapeHtml(item.title)}: ${score}%"><i style="height:${Math.max(4,score)}%"></i><span>${index+1}</span></div>`}).join(''):'<p>No scored scenarios yet.</p>';
  }

  function card(item){
    const score=scoreOf(item);const areas=(item.reviewAreas||[]).map(key=>weakCatalog[key]?.label||key);
    return`<article class="history-card" data-id="${escapeHtml(item.id)}"><div><h3>${escapeHtml(item.title||'Patient scenario')}</h3><div class="history-meta"><span>${escapeHtml(formatDate(item.completedAt||item.updatedAt))}</span><span>${Number(item.findingCount||0)} findings</span><span>${Number(item.abnormalCount||0)} abnormal</span></div><div>${areas.length?areas.map(v=>`<span class="tag review">${escapeHtml(v)}</span>`).join(' '):'<span class="tag">No major review flags</span>'}</div></div><div class="score-pill">${score===null?'—':`${score}%`}</div><div class="history-actions"><a href="/vitals/scenario-launcher.html">Repeat scenario practice</a><a href="/vitals/scenario-launcher.html">Choose patient scenario</a><button type="button" data-delete="${escapeHtml(item.id)}">Remove entry</button></div></article>`;
  }

  function renderList(items){
    const filter=$('historyFilter').value;
    const filtered=items.filter(item=>{const s=scoreOf(item);return filter==='all'||(filter==='review'&&(s===null||s<70||item.reviewAreas?.length))||(filter==='strong'&&s!==null&&s>=80)}).slice().reverse();
    $('historyList').innerHTML=filtered.length?filtered.map(card).join(''):'<p>No scenarios match this filter.</p>';
  }

  function render(){
    const items=read();$('emptyState').hidden=items.length>0;$('historyContent').hidden=!items.length;if(!items.length)return;
    const stats=calculateStats(items);$('scenarioCount').textContent=items.length;$('averageScore').textContent=stats.average===null?'—':`${stats.average}%`;$('bestScore').textContent=stats.best===null?'—':`${stats.best}%`;$('scoreTrend').textContent=stats.trend===null?'—':`${stats.trend>0?'+':''}${stats.trend} pts`;
    renderWeakAreas(items);renderTrend(items);renderList(items);
  }

  document.addEventListener('click',event=>{const id=event.target?.dataset?.delete;if(!id)return;const items=read().filter(item=>item.id!==id);write(items);render()});
  document.addEventListener('DOMContentLoaded',()=>{$('historyFilter').addEventListener('change',render);$('clearHistory').addEventListener('click',()=>{if(confirm('Clear all saved scenario history on this device?')){localStorage.removeItem(KEY);render()}});render()});
})();
