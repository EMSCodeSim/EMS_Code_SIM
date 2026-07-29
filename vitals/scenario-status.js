
(()=>{'use strict';
function getRecord(){try{return window.EMSCodeSimPatientRecord?.active?.()||null}catch{return null}}
function render(){const r=getRecord();let el=document.getElementById('emsScenarioStatus');if(!el){el=document.createElement('aside');el.id='emsScenarioStatus';el.hidden=true;el.setAttribute('aria-live','polite');el.innerHTML='<div class="ess-wrap"><div class="ess-main"><div class="ess-label">Active patient</div><div class="ess-title"></div><div class="ess-meta"></div></div><div class="ess-actions"><a href="/vitals/patient-record.html">View findings</a><a class="secondary" href="/vitals/scenario-launcher.html">Return to scenario</a></div></div>';document.body.prepend(el)}if(!r){el.hidden=true;return}const findings=Object.keys(r.findings||{}).length;el.querySelector('.ess-title').textContent=[r.patient,r.title].filter(Boolean).join(' — ')||'Active EMS scenario';el.querySelector('.ess-meta').textContent=`${findings} finding${findings===1?'':'s'} saved${r.dispatch?' • '+r.dispatch:''}`;el.hidden=false}
window.addEventListener('emscodesim:patient-record-updated',render);document.addEventListener('DOMContentLoaded',render);render();
})();
