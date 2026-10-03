(function(){
  'use strict';
  const drills=Array.isArray(window.EMS_DRILLS)?window.EMS_DRILLS:[];
  const backlog=Array.isArray(window.EMS_DRILL_BACKLOG)?window.EMS_DRILL_BACKLOG:[];
  const grid=document.getElementById('drillGrid');
  const filter=document.getElementById('drillFilter');
  const backlogEl=document.getElementById('drillBacklog');
  if(!grid||!filter||!backlogEl)return;

  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const list=items=>'<ul>'+items.map(i=>'<li>'+esc(i)+'</li>').join('')+'</ul>';
  const categories=[...new Set(drills.map(d=>d.category))].sort();
  categories.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;filter.appendChild(o)});

  function render(){
    const cat=filter.value;
    const items=cat?drills.filter(d=>d.category===cat):drills;
    grid.innerHTML=items.map(d=>`
      <article class="drill-card" id="${esc(d.id)}">
        <div class="drill-meta"><span>${esc(d.category)}</span><span>${esc(d.level)}</span><span>${esc(d.duration)}</span><span>${esc(d.participants)} learners</span></div>
        <h3>${esc(d.title)}</h3>
        <div class="drill-id">${esc(d.id)}</div>
        <p class="summary">${esc(d.summary)}</p>
        <details>
          <summary>Open full drill breakdown</summary>
          <div class="drill-detail">
            <h4>Goal</h4><p>${esc(d.goal)}</p>
            <h4>Needed resources</h4>${list(d.resources)}
            <h4>Dispatch / setup</h4><p>${esc(d.dispatch)}</p>
            <h4>Starting patient state</h4>${list(d.startingState)}
            <h4>Scenario progression</h4>${list(d.progression)}
            <h4>Critical actions</h4>${list(d.criticalActions)}
            <h4>Evaluation</h4>${list(d.evaluation)}
            <h4>Expected outcome</h4><p>${esc(d.outcome)}</p>
            <h4>Debrief prompts</h4>${list(d.debrief)}
            <div class="drill-links">${d.links.map(link=>'<a href="'+esc(link[1])+'">'+esc(link[0])+'</a>').join('')}</div>
          </div>
        </details>
      </article>`).join('');
  }
  filter.addEventListener('change',render);
  render();

  backlogEl.innerHTML=backlog.map(item=>'<article class="backlog-card"><strong>'+esc(item[1])+'</strong><small>'+esc(item[0])+' · '+esc(item[2])+'</small></article>').join('');

  const requested=(location.hash||'').replace('#','');
  if(requested&&document.getElementById(requested)){
    setTimeout(()=>document.getElementById(requested).scrollIntoView({behavior:'smooth',block:'start'}),80);
  }
})();