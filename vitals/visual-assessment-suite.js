(()=>{'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const qs=new URLSearchParams(location.search), caseId=qs.get('case')||'', mode=qs.get('mode')||((qs.get('embedded')==='1')?'scenario':'standalone');
const runtime=window.EMSCodeSimScenarioRuntime;
function vital(key,fallback=''){try{return runtime?.vital?.(key,fallback)??fallback}catch(_){return fallback}}
function tone(freq=440,d=.08,vol=.04,type='sine'){try{const C=window.AudioContext||window.webkitAudioContext,c=new C,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol;o.connect(g);g.connect(c.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+d);o.stop(c.currentTime+d+.02);o.onended=()=>c.close().catch(()=>{})}catch(_){}}
function click(){tone(760,.035,.018,'square')}
function beep(){tone(920,.09,.035,'sine')}
function pulse(){tone(90,.05,.04,'sine');try{navigator.vibrate?.(25)}catch(_){}}
function playBreath(kind='normal',volume=.9){
 const files={normal:'/vitals/normal_sound.mp3',wheeze:'/vitals/wheezing_sound.mp3',crackles:'/vitals/Lung-CoarseCrackles.mp3',stridor:'/vitals/Lung-InspiratoryStridor.mp3',diminished:'/vitals/normal_sound.mp3'};
 const a=new Audio(files[kind]||files.normal);a.volume=volume;a.play().catch(()=>{});return a
}
function result(key,label,value,detail=''){
 const box=$('#result');if(box){box.classList.add('saved');box.innerHTML=`<strong>✓ ${label}</strong><span>${value}</span>`}
 try{
  const api=window.EMSCodeSimPatientRecord;
  if(mode==='scenario'&&api&&caseId){api.ensure?.({id:caseId});api.setFinding?.(key,value,{description:detail||value,source:'visual-assessment-sim',label})}
 }catch(_){}
 beep();
 try{parent?.postMessage?.({type:'ems-assessment-saved',key,label,value},location.origin)}catch(_){}
}
window.VA={result,$,$$,vital,tone,click,beep,pulse,playBreath,caseId,mode};
})();