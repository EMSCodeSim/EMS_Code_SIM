
(()=>{'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const qs=new URLSearchParams(location.search), caseId=qs.get('case')||'', mode=qs.get('mode')||'standalone';
function result(key,label,value,detail=''){
 const box=$('#result'); if(box) box.innerHTML=`<strong>${label}</strong><br>${value}${detail?`<br><small>${detail}</small>`:''}`;
 try{
  const api=window.EMSCodeSimPatientRecord;
  if(mode==='scenario'&&api&&caseId){
   api.recordFinding?.(key,{value,description:detail||value,source:'visual-assessment-sim'},caseId);
  }
 }catch(e){}
}
window.VA={result,$,$$};
})();
