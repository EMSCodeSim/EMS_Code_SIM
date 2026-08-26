(function(){
  const form=document.getElementById('siteSearchForm');
  const input=document.getElementById('siteSearchInput');
  const category=document.getElementById('searchCategory');
  const results=document.getElementById('searchResults');
  const summary=document.getElementById('searchSummary');
  const index=(Array.isArray(window.EMSCODESIM_SEARCH_INDEX)?window.EMSCODESIM_SEARCH_INDEX:[]).map(item=>({
    ...item,
    summary:item.summary||item.description||'',
    tags:item.tags||(typeof item.keywords==='string'?item.keywords.split(/\s+/).filter(Boolean):[]),
    level:item.level||''
  }));
  if(!form||!input||!category||!results||!summary) return;
  const normalize=s=>(s||'').toLowerCase().replace(/[^a-z0-9&×]+/g,' ').trim();
  const categories=[...new Set(index.map(x=>x.category).filter(Boolean))].sort();
  categories.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;category.appendChild(o);});
  function score(item,terms){
    const title=normalize(item.title), summaryText=normalize(item.summary), tags=normalize((item.tags||[]).join(' ')), cat=normalize(item.category+' '+item.level);
    let total=0;
    terms.forEach(term=>{if(title===term) total+=30;else if(title.startsWith(term)) total+=18;else if(title.includes(term)) total+=12;if(tags.includes(term)) total+=8;if(summaryText.includes(term)) total+=5;if(cat.includes(term)) total+=3;});
    if(terms.every(t=>(title+' '+tags+' '+summaryText+' '+cat).includes(t))) total+=10;
    return total;
  }
  function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function render(){
    const q=input.value.trim();const terms=normalize(q).split(' ').filter(Boolean);const filter=category.value;
    let matches=index.filter(item=>!filter||item.category===filter).map(item=>({item,score:terms.length?score(item,terms):1})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.item.title.localeCompare(b.item.title));
    summary.textContent=q?`${matches.length} result${matches.length===1?'':'s'} for “${q}”`:`Browse ${matches.length} guides and training tools${filter?' in '+filter:''}.`;
    if(!matches.length){results.innerHTML='<div class="empty-state"><h2>No exact match found</h2><p>Try fewer words, a broader term, or browse the <a href="/ems-training-tools.html">training tools library</a>.</p></div>';return;}
    results.innerHTML=matches.map(({item})=>`<article class="search-result-card"><div><span class="result-category">${escapeHtml(item.category)}</span><span class="result-level">${escapeHtml(item.level)}</span></div><h2><a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a></h2><p>${escapeHtml(item.summary)}</p><p class="result-tags">${(item.tags||[]).slice(0,5).map(t=>`<span>${escapeHtml(t)}</span>`).join('')}</p></article>`).join('');
  }
  function updateUrl(){const url=new URL(location.href);const q=input.value.trim();if(q)url.searchParams.set('q',q);else url.searchParams.delete('q');if(category.value)url.searchParams.set('category',category.value);else url.searchParams.delete('category');history.replaceState({},'',url);}
  form.addEventListener('submit',e=>{e.preventDefault();updateUrl();render();});
  input.addEventListener('input',()=>{window.clearTimeout(input._timer);input._timer=window.setTimeout(()=>{updateUrl();render();},180);});
  category.addEventListener('change',()=>{updateUrl();render();});
  document.querySelectorAll('[data-search-term]').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.searchTerm;category.value='';updateUrl();render();input.focus();}));
  const params=new URLSearchParams(location.search);input.value=params.get('q')||'';category.value=params.get('category')||'';render();
})();
