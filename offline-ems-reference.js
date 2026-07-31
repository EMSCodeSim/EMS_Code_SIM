const state={data:null,category:'all',query:'',favorites:new Set(JSON.parse(localStorage.getItem('emsRefFavorites')||'[]')),deferred:null};
const $=selector=>document.querySelector(selector);
const esc=value=>String(value).replace(/[&<>"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));

async function requestCacheStatus(registration){
  const worker=registration.active||registration.waiting||registration.installing;
  if(!worker)return null;
  return new Promise(resolve=>{
    const channel=new MessageChannel();
    const timer=setTimeout(()=>resolve(null),2500);
    channel.port1.onmessage=event=>{clearTimeout(timer);resolve(event.data);};
    worker.postMessage({type:'GET_CACHE_STATUS'},[channel.port2]);
  });
}

async function setupOffline(){
  const status=$('#offlineStatus');
  if(!('serviceWorker'in navigator)){status.textContent='Offline install is not supported in this browser';return;}
  try{
    const registration=await navigator.serviceWorker.register('/offline-reference-sw.js');
    await navigator.serviceWorker.ready;
    const cacheStatus=await requestCacheStatus(registration);
    if(cacheStatus&&cacheStatus.type==='CACHE_STATUS'){
      status.textContent=cacheStatus.cached>=cacheStatus.total
        ?`Offline pack ready (${cacheStatus.cached} files cached)`
        :`Core offline pack ready (${cacheStatus.cached} of ${cacheStatus.total} files cached)`;
    }else{
      status.textContent='Offline pack installed; keep this page open once while online';
    }
  }catch(_){
    status.textContent='Page works online; offline installation is unavailable';
  }
}

async function init(){
  const response=await fetch('/data/ems-reference-pack.json');
  if(!response.ok)throw new Error('Reference data unavailable');
  state.data=await response.json();
  renderCategories();render();setupOffline();
}
function renderCategories(){
  const element=$('#categoryButtons');
  element.innerHTML='<button class="active" data-cat="all">All</button>'+state.data.sections.map(section=>`<button data-cat="${esc(section.id)}">${esc(section.icon)} ${esc(section.title)}</button>`).join('');
  element.onclick=event=>{const button=event.target.closest('button');if(!button)return;state.category=button.dataset.cat;element.querySelectorAll('button').forEach(item=>item.classList.toggle('active',item===button));render();};
}
function render(){
  const query=state.query.toLowerCase().trim();const favoritesOnly=$('#favoritesOnly').checked;let count=0;
  const html=state.data.sections.filter(section=>state.category==='all'||section.id===state.category).map(section=>{
    const items=section.items.filter(item=>{const id=section.id+'::'+item.term;const match=!query||[item.term,item.summary,item.details,item.remember].join(' ').toLowerCase().includes(query);return match&&(!favoritesOnly||state.favorites.has(id));});
    if(!items.length)return'';count+=items.length;
    return `<section class="section-block"><h2>${esc(section.icon)} ${esc(section.title)}</h2>${items.map(item=>entry(section,item)).join('')}</section>`;
  }).join('');
  $('#referenceList').innerHTML=html||'<section class="section-block"><h2>No matches</h2><p>Try a broader term or another category.</p></section>';
  $('#resultCount').textContent=`${count} reference ${count===1?'item':'items'}`;
  document.querySelectorAll('.fav').forEach(button=>button.onclick=event=>{event.preventDefault();event.stopPropagation();toggleFav(button.dataset.id);});
}
function entry(section,item){
  const id=section.id+'::'+item.term;const active=state.favorites.has(id);
  return `<details class="entry"><summary><div><h3>${esc(item.term)}</h3><p class="summary">${esc(item.summary)}</p></div><button class="fav ${active?'active':''}" data-id="${esc(id)}" aria-label="Favorite ${esc(item.term)}">★</button></summary><div class="entry-body"><p>${esc(item.details||'')}</p><p class="remember"><strong>Remember:</strong> ${esc(item.remember||'')}</p></div></details>`;
}
function toggleFav(id){state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);localStorage.setItem('emsRefFavorites',JSON.stringify([...state.favorites]));render();}

$('#searchInput').addEventListener('input',event=>{state.query=event.target.value;render();});
$('#favoritesOnly').addEventListener('change',render);
$('#expandAll').onclick=()=>document.querySelectorAll('.entry').forEach(details=>details.open=true);
$('#collapseAll').onclick=()=>document.querySelectorAll('.entry').forEach(details=>details.open=false);
$('#downloadFavorites').onclick=()=>{
  const output=['EMSCodeSim - My Favorite EMS References',''];
  state.data.sections.forEach(section=>section.items.forEach(item=>{if(state.favorites.has(section.id+'::'+item.term))output.push(section.title+' - '+item.term,item.summary,item.details,'Remember: '+item.remember,'');}));
  if(output.length===2)output.push('No favorites selected yet.');
  const href=URL.createObjectURL(new Blob([output.join('\n')],{type:'text/plain'}));
  const anchor=document.createElement('a');anchor.href=href;anchor.download='My-EMS-Reference-Favorites.txt';anchor.click();setTimeout(()=>URL.revokeObjectURL(href),0);
};
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();state.deferred=event;$('#installBtn').hidden=false;});
$('#installBtn').onclick=async()=>{if(!state.deferred)return;state.deferred.prompt();await state.deferred.userChoice;state.deferred=null;$('#installBtn').hidden=true;};

init().catch(()=>{
  $('#offlineStatus').textContent='Reference pack is not available on this device yet';
  $('#referenceList').innerHTML='<section class="section-block"><h2>Reference pack could not load</h2><p>Reconnect once and refresh this page so a complete offline copy can be stored.</p></section>';
});
