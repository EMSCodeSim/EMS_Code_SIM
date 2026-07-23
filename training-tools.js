(function(){
  const search=document.getElementById('toolSearch'), category=document.getElementById('toolCategory'), level=document.getElementById('toolLevel'), clear=document.getElementById('clearToolFilters'), summary=document.getElementById('toolSummary');
  const cards=[...document.querySelectorAll('.training-card')];if(!search||!category||!level||!summary)return;
  [...new Set(cards.map(c=>c.dataset.category))].sort().forEach(v=>category.add(new Option(v,v)));
  [...new Set(cards.map(c=>c.dataset.level))].sort().forEach(v=>level.add(new Option(v,v)));
  function update(){const q=search.value.trim().toLowerCase();let visible=0;cards.forEach(c=>{const show=(!q||c.dataset.search.includes(q))&&(!category.value||c.dataset.category===category.value)&&(!level.value||c.dataset.level===level.value);c.hidden=!show;if(show)visible++;});summary.textContent=`Showing ${visible} of ${cards.length} free training tools.`;}
  [search,category,level].forEach(x=>x.addEventListener(x===search?'input':'change',update));clear.addEventListener('click',()=>{search.value='';category.value='';level.value='';update();search.focus();});update();
})();
