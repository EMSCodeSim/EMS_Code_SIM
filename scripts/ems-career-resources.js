(function(){
  'use strict';
  document.querySelectorAll('[data-save-group]').forEach(function(group){
    var key='emscodesim:'+group.getAttribute('data-save-group');
    var boxes=Array.prototype.slice.call(group.querySelectorAll('input[type="checkbox"][data-item]'));
    try{
      var saved=JSON.parse(localStorage.getItem(key)||'{}');
      boxes.forEach(function(box){box.checked=Boolean(saved[box.getAttribute('data-item')]);});
    }catch(error){}
    group.addEventListener('change',function(){
      var state={};
      boxes.forEach(function(box){state[box.getAttribute('data-item')]=box.checked;});
      try{localStorage.setItem(key,JSON.stringify(state));}catch(error){}
    });
  });
})();
