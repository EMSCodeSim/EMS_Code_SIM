
(()=>{'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const qs=new URLSearchParams(location.search), caseId=qs.get('case')||'', mode=qs.get('mode')||((qs.get('embedded')==='1')?'scenario':'standalone');
function result(key,label,value,detail=''){
 const box=$('#result'); if(box) box.innerHTML=`<strong>${label}</strong><br>${value}${detail?`<br><small>${detail}</small>`:''}`;
 try{
  const api=window.EMSCodeSimPatientRecord;
  if(mode==='scenario'&&api&&caseId){
   if(caseId) api.ensure?.({id:caseId});
   api.setFinding?.(key,value,{description:detail||value,source:'visual-assessment-sim',label});
  }
 }catch(e){}
}
window.VA={result,$,$$};
})();
