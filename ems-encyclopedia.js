'use strict';
const state={data:null,query:'',category:'all',letter:'all',favorites:new Set(JSON.parse(localStorage.getItem('emsEncyclopediaFavorites')||'[]')),recent:JSON.parse(localStorage.getItem('emsEncyclopediaRecent')||'[]'),favoritesOnly:false,recentOnly:false};
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=v=>String(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

async function init(){
  const response=await fetch('/data/ems-encyclopedia.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Encyclopedia data could not load');
  state.data=await response.json();
  $('#entryTotal').textContent=`${state.data.entries.length} EMS topics across ${state.data.categories.length} subjects`;
  renderCategories();renderAlphabet();bind();render();
  const hash=decodeURIComponent(location.hash.slice(1));
  if(hash)setTimeout(()=>openTopic(hash),50);
}
function bind(){
  $('#encyclopediaSearch').addEventListener('input',e=>{state.query=e.target.value.trim();$('#clearSearch').hidden=!state.query;state.letter='all';renderAlphabet();render();});
  $('#clearSearch').onclick=()=>{state.query='';$('#encyclopediaSearch').value='';$('#clearSearch').hidden=true;render();};
  $('#favoritesOnly').onchange=e=>{state.favoritesOnly=e.target.checked;if(e.target.checked){state.recentOnly=false;$('#recentOnly').checked=false}render();};
  $('#recentOnly').onchange=e=>{state.recentOnly=e.target.checked;if(e.target.checked){state.favoritesOnly=false;$('#favoritesOnly').checked=false}render();};
  $('#randomTopic').onclick=()=>{const list=filtered();if(!list.length)return;const item=list[Math.floor(Math.random()*list.length)];openTopic(slug(item.term),true);};
  $('#showAll').onclick=reset;
}
function reset(){state.query='';state.category='all';state.letter='all';state.favoritesOnly=false;state.recentOnly=false;$('#encyclopediaSearch').value='';$('#favoritesOnly').checked=false;$('#recentOnly').checked=false;renderCategories();renderAlphabet();render();}
function renderCategories(){
  const cats=[{id:'all',title:'All Topics',icon:'🔎',count:state.data?.entries.length||0},...(state.data?.categories||[])];
  $('#categoryGrid').innerHTML=cats.map(c=>`<button class="category-card ${state.category===c.id?'active':''}" data-category="${esc(c.id)}"><span class="icon">${esc(c.icon)}</span><strong>${esc(c.title)}</strong><small>${c.count}</small></button>`).join('');
  $('#categoryGrid').onclick=e=>{const b=e.target.closest('button[data-category]');if(!b)return;state.category=b.dataset.category;renderCategories();render();};
}
function renderAlphabet(){
  const letters=['all',...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
  $('#alphabetButtons').innerHTML=letters.map(l=>`<button class="${state.letter===l?'active':''}" data-letter="${l}">${l==='all'?'#':l}</button>`).join('');
  $('#alphabetButtons').onclick=e=>{const b=e.target.closest('button');if(!b)return;state.letter=b.dataset.letter;state.query='';$('#encyclopediaSearch').value='';$('#clearSearch').hidden=true;renderAlphabet();render();};
}
function filtered(){
  if(!state.data)return[];const q=state.query.toLowerCase();
  return state.data.entries.filter(e=>{
    const id=slug(e.term);const searchable=[e.term,e.summary,e.details,e.remember,...(e.aliases||[])].join(' ').toLowerCase();
    return (state.category==='all'||e.category===state.category)&&
      (state.letter==='all'||e.term.toUpperCase().startsWith(state.letter))&&
      (!q||searchable.includes(q))&&
      (!state.favoritesOnly||state.favorites.has(id))&&
      (!state.recentOnly||state.recent.includes(id));
  });
}
function render(){
  const list=filtered();
  const title=state.query?`Results for “${state.query}”`:state.category!=='all'?(state.data.categories.find(c=>c.id===state.category)?.title||'Topics'):state.letter!=='all'?`Topics beginning with ${state.letter}`:state.favoritesOnly?'Saved topics':state.recentOnly?'Recently viewed':'All topics';
  $('#resultsTitle').textContent=title;$('#resultCount').textContent=`${list.length} ${list.length===1?'topic':'topics'}`;
  $('#encyclopediaList').innerHTML=list.map(topicCard).join('');
  $('#emptyState').hidden=list.length>0;
  $('#encyclopediaList').onclick=e=>{
    const save=e.target.closest('.save-topic');if(save){e.preventDefault();e.stopPropagation();toggleFavorite(save.dataset.id);return;}
    const details=e.target.closest('.topic');if(details&&details.open)setTimeout(()=>rememberRecent(details.id),0);
  };
  $('#encyclopediaList').ontoggle=e=>{if(e.target.matches?.('.topic')&&e.target.open)rememberRecent(e.target.id);};
}
function topicCard(e){
  const id=slug(e.term),saved=state.favorites.has(id),links=(e.links||[]).map(l=>`<a href="${esc(l.url)}">${esc(l.label)}</a>`).join('');
  return `<details class="topic" id="${id}"><summary><span class="topic-icon">${esc(e.icon)}</span><div><h3>${highlight(e.term)}</h3><p class="topic-summary">${highlight(e.summary)}</p></div><div class="topic-actions"><button class="save-topic ${saved?'saved':''}" data-id="${id}" aria-label="${saved?'Remove':'Save'} ${esc(e.term)}">★</button><span class="chevron">⌄</span></div></summary><div class="topic-body"><p>${highlight(e.details)}</p><p class="remember"><strong>Field takeaway:</strong> ${highlight(e.remember)}</p><div class="topic-meta"><span class="pill">${esc(e.categoryTitle)}</span><span class="pill">${esc(e.level||'EMS')}</span></div>${links?`<div class="related-links">${links}</div>`:''}</div></details>`;
}
function highlight(text){const safe=esc(text);if(!state.query)return safe;const q=state.query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return safe.replace(new RegExp(`(${q})`,'ig'),'<mark>$1</mark>');}
function toggleFavorite(id){state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);localStorage.setItem('emsEncyclopediaFavorites',JSON.stringify([...state.favorites]));render();}
function rememberRecent(id){state.recent=[id,...state.recent.filter(x=>x!==id)].slice(0,12);localStorage.setItem('emsEncyclopediaRecent',JSON.stringify(state.recent));history.replaceState(null,'','#'+id);}
function openTopic(id,scroll=false){const el=document.getElementById(id);if(!el){reset();setTimeout(()=>openTopic(id,scroll),20);return}el.open=true;rememberRecent(id);if(scroll)el.scrollIntoView({behavior:'smooth',block:'start'});}
init().catch(err=>{$('#entryTotal').textContent='Encyclopedia unavailable';$('#encyclopediaList').innerHTML='<section class="empty-state"><h2>Could not load the encyclopedia</h2><p>Check that <code>/data/ems-encyclopedia.json</code> was uploaded with this page.</p></section>';console.error(err);});
