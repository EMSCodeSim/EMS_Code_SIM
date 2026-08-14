(()=>{'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const qs=new URLSearchParams(location.search), caseId=qs.get('case')||'', mode=qs.get('mode')||((qs.get('embedded')==='1')?'scenario':'standalone');
const runtime=window.EMSCodeSimScenarioRuntime,session=window.EMSCodeSimScenarioSession;
function vital(key,fallback=''){try{return runtime?.vital?.(key,fallback)??fallback}catch(_){return fallback}}
function tone(freq=440,d=.08,vol=.04,type='sine'){try{const C=window.AudioContext||window.webkitAudioContext,c=new C,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol;o.connect(g);g.connect(c.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+d);o.stop(c.currentTime+d+.02);o.onended=()=>c.close().catch(()=>{})}catch(_){}}
function click(){tone(760,.035,.018,'square')}
function beep(){tone(920,.09,.035,'sine')}
function pulse(){tone(90,.05,.04,'sine');try{navigator.vibrate?.(25)}catch(_){}}
function playBreath(kind='normal',volume=.9){
 const files={normal:'/vitals/normal_sound.mp3',wheeze:'/vitals/wheezing_sound.mp3',crackles:'/vitals/Lung-CoarseCrackles.mp3',stridor:'/vitals/Lung-InspiratoryStridor.mp3',diminished:'/vitals/normal_sound.mp3'};
 const a=new Audio(files[kind]||files.normal);a.volume=volume;a.play().catch(()=>{});return a
}
function installInterpretStyles(){if(document.querySelector('style[data-va-interpret]'))return;const s=document.createElement('style');s.dataset.vaInterpret='1';s.textContent='.va-interpret{display:grid;gap:10px}.va-interpret>small{color:#526777;font-size:.72rem;font-weight:900;letter-spacing:.05em}.va-interpret h2{margin:0;font-size:1rem}.va-interpret p{margin:0;color:#526777;line-height:1.4}.va-interpret-options{display:grid;gap:7px}.va-interpret-option{min-height:44px;border:1px solid #b8cbd7;border-radius:11px;background:#f7fbfd;color:#173044;padding:9px 10px;text-align:left;font:inherit;font-weight:800;cursor:pointer}.va-interpret-option.selected{border-color:#087eae;background:#e7f6fc;box-shadow:inset 0 0 0 1px #087eae}.va-interpret-save{min-height:44px;border:0;border-radius:11px;background:#087eae;color:#fff;font:inherit;font-weight:900;cursor:pointer}.va-interpret-save:disabled{opacity:.45;cursor:not-allowed}.va-result.saved{display:grid;gap:4px}.va-result.saved span{color:#526777}';document.head.appendChild(s)}
function result(key,label,value,detail='',meta={}){
 const box=$('#result');if(box){box.classList.add('saved');box.innerHTML=`<strong>✓ ${label} recorded</strong><span>${value}</span>`}
 try{
  const api=window.EMSCodeSimPatientRecord;
  if(mode==='scenario'&&api&&caseId){
   const payload={description:detail||value,source:'visual-assessment-sim',label,learnerFinding:String(value),reviewAtDebrief:true,...meta};
   if(session?.saveFinding)session.saveFinding(key,String(value),payload,caseId);else{api.ensure?.({id:caseId});api.setFinding?.(key,String(value),payload)}
  }
 }catch(_){}
 beep();
 try{parent?.postMessage?.({type:'ems-assessment-saved',key,label,value:String(value)},location.origin)}catch(_){}
 if(mode==='scenario'&&caseId&&window.parent===window){
  window.setTimeout(()=>location.replace(`/vitals/visual-patient.html?case=${encodeURIComponent(caseId)}&training=learning`),450);
 }
 return value
}
function interpret(config={}){
 installInterpretStyles();
 const box=$('#result');if(!box)return null;
 const choices=(config.choices||[]).map(choice=>typeof choice==='string'?{value:choice,label:choice}:choice).filter(choice=>choice?.value!=null);
 if(!choices.length)return null;
 let selected='';
 box.classList.remove('saved');
 box.innerHTML=`<div class="va-interpret"><small>INTERPRET WHAT YOU OBSERVED</small><h2>${config.prompt||'What finding did you obtain?'}</h2><p>${config.help||'Use only the visual, sound, movement, and exam clues you discovered.'}</p><div class="va-interpret-options"></div><button type="button" class="va-interpret-save" disabled>Record finding</button></div>`;
 const options=box.querySelector('.va-interpret-options'),save=box.querySelector('.va-interpret-save');
 choices.forEach(choice=>{const button=document.createElement('button');button.type='button';button.className='va-interpret-option';button.dataset.value=String(choice.value);button.textContent=choice.label||String(choice.value);button.addEventListener('click',()=>{selected=String(choice.value);options.querySelectorAll('.va-interpret-option').forEach(item=>item.classList.toggle('selected',item===button));save.disabled=false});options.appendChild(button)});
 save.addEventListener('click',()=>{
  if(!selected)return;
  const choice=choices.find(item=>String(item.value)===selected)||{label:selected};
  const correct=typeof config.isAccurate==='function'?Boolean(config.isAccurate(selected)):String(selected)===String(config.correctValue??'');
  const value=typeof config.formatValue==='function'?config.formatValue(selected,choice):String(choice.savedValue||choice.label||selected);
  const sharedMeta={expectedFinding:String(config.expectedFinding??''),expectedChoice:String(config.correctValue??''),accurate:correct,correct,selectedChoice:selected,...(config.meta||{})};
  (config.alsoSave||[]).forEach(extra=>{
   const extraValue=typeof extra.formatValue==='function'?extra.formatValue(selected,choice):String(extra.value??choice.savedValue??choice.label??selected);
   result(extra.key,extra.label||extra.key,extraValue,extra.detail||extraValue,{...sharedMeta,expectedFinding:String(extra.expectedFinding??config.expectedFinding??'')});
  });
  result(config.key||'assessment',config.label||'Assessment',value,config.detail||value,sharedMeta);
 });
 return {box,choices}
}
window.VA={result,interpret,$,$$,vital,tone,click,beep,pulse,playBreath,caseId,mode};
})();