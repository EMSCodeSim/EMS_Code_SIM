(()=>{
'use strict';
const sim=document.body.dataset.scenarioVital||'', $=id=>document.getElementById(id), q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
function tone(freq=440,d=.08,vol=.16,type='sine'){try{const C=window.AudioContext||window.webkitAudioContext,c=new C,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol;o.connect(g);g.connect(c.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+d);o.stop(c.currentTime+d+.02);o.onended=()=>c.close().catch(()=>{})}catch(_){}}
function click(){tone(780,.035,.09,'square')}
function beep(){tone(940,.09,.16,'sine')}
function pulse(){try{navigator.vibrate?.(24)}catch(_){}}
function once(id,fn){if(document.documentElement.dataset[id])return;document.documentElement.dataset[id]='1';fn()}

function enhancePulse(){
 const stage=$('stage'); if(!stage)return;
 once('sensoryPulse',()=>{
   stage.classList.add('sensory-pulse-stage');
   const marker=document.createElement('div');marker.className='sensory-radial';marker.innerHTML='<span></span><span></span><i></i>';
   stage.prepend(marker);
   const heart=$('heart');
   if(heart)new MutationObserver(()=>{if(heart.classList.contains('beat')){marker.classList.remove('beat');void marker.offsetWidth;marker.classList.add('beat');pulse()}}).observe(heart,{attributes:true,attributeFilter:['class']});
 });
}
function enhanceResp(){
 const stage=$('stage');if(!stage)return;
 once('sensoryResp',()=>{stage.classList.add('sensory-resp-stage');const p=q('.sv-resp-patient');if(p){const airflow=document.createElement('div');airflow.className='sensory-airflow';airflow.innerHTML='<i></i><i></i><i></i>';p.appendChild(airflow)}});
}
function enhanceSpo2(){
 const stage=$('stage');if(!stage)return;
 once('sensorySpo2',()=>{
  stage.classList.add('sensory-spo2-stage');
  const m=q('.sv-monitor');if(!m)return;
  const finger=document.createElement('div');finger.className='sensory-ox-finger';finger.innerHTML='<div class="finger"></div><div class="clip">SpO₂</div>';m.before(finger);
  const canvas=document.createElement('canvas');canvas.className='sensory-pleth';canvas.width=520;canvas.height=100;m.appendChild(canvas);
  const ctx=canvas.getContext('2d');let phase=0,last=0;
  function draw(ts){const stable=!$('wave')?.hidden,w=canvas.width,h=canvas.height;ctx.fillStyle='#061717';ctx.fillRect(0,0,w,h);ctx.strokeStyle=stable?'#52f0a9':'#436c61';ctx.lineWidth=3;ctx.beginPath();for(let x=0;x<w;x++){const p=((x/w)*6+phase)%1;let y=.52;if(p<.1)y=.52-p/.1*.32;else if(p<.18)y=.2+(p-.1)/.08*.48;else if(p<.31)y=.68-(p-.18)/.13*.23;else y=.45+Math.sin(p*8)*.025;x?ctx.lineTo(x,y*h):ctx.moveTo(x,y*h)}ctx.stroke();phase=(phase+.009)%1;if(stable&&ts-last>760){last=ts;tone(820,.05,.09)}requestAnimationFrame(draw)}requestAnimationFrame(draw);
  $('placeProbe')?.addEventListener('click',()=>{finger.classList.add('on');click()});
 });
}
function enhanceBgl(){
 const stage=$('stage');if(!stage)return;
 once('sensoryBgl',()=>{
  stage.classList.add('sensory-bgl-stage');const visual=document.createElement('div');visual.className='sensory-bgl-hand';visual.innerHTML='<div class="finger"></div><div class="drop"></div><div class="strip"></div>';stage.prepend(visual);
  qa('.sv-step').forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.step);click();if(i===0)visual.classList.add('strip-in');if(i===1)visual.classList.add('clean');if(i===2){visual.classList.add('lance');tone(180,.04,.08,'square')}if(i===3)visual.classList.add('sample')}));
  const screen=$('deviceScreen');if(screen)new MutationObserver(()=>{if(/^\d+$/.test(screen.textContent.trim()))beep()}).observe(screen,{childList:true,characterData:true,subtree:true});
 });
}
function enhanceTemp(){
 const stage=$('stage');if(!stage)return;
 once('sensoryTemp',()=>{
  stage.classList.add('sensory-temp-stage');const visual=document.createElement('div');visual.className='sensory-ear-probe';visual.innerHTML='<div class="ear"><i></i></div><div class="probe"></div>';stage.prepend(visual);
  $('measureTemp')?.addEventListener('click',()=>{visual.classList.add('measuring');click();setTimeout(beep,1650)});
 });
}
function enhancePupils(){
 once('sensoryPupils',()=>{
  qa('.sv-eye').forEach(eye=>{const beam=document.createElement('span');beam.className='sensory-light-beam';eye.appendChild(beam)});
  ['lightLeft','lightRight'].forEach(id=>$(id)?.addEventListener('click',()=>{click();const eye=$(id==='lightLeft'?'leftEye':'rightEye');eye?.classList.add('sensory-lit');setTimeout(()=>eye?.classList.remove('sensory-lit'),720)}));
 });
}
function enhanceSkin(){
 once('sensorySkin',()=>{
   const patient=q('.sv-skin-compare figure:nth-child(2) .sv-skin-swatch');if(!patient)return;
   const raw=patient.getAttribute('style')||'';patient.classList.add('sensory-skin');
   $('touchSkin')?.addEventListener('click',()=>{patient.classList.add('touched');click();setTimeout(()=>patient.classList.remove('touched'),500)});
   $('moistureSkin')?.addEventListener('click',()=>{patient.classList.add('moisture-check');click()});
 });
}
function enhanceAvpu(){
 const stage=$('stage');if(!stage)return;
 once('sensoryAvpu',()=>{
   const response=$('patientResponse');if(!response)return;response.classList.add('sensory-avpu');
   const face=document.createElement('div');face.className='sensory-face';face.innerHTML='<span class="eye l"></span><span class="eye r"></span><span class="mouth"></span>';response.before(face);
   if(response)new MutationObserver(()=>{const t=response.textContent.toLowerCase();face.classList.toggle('no-response',/no response|unresponsive/.test(t));face.classList.toggle('respond',!/no response|unresponsive/.test(t));setTimeout(()=>face.classList.remove('respond'),650)}).observe(response,{childList:true,characterData:true,subtree:true});
   ['observeBtn','voiceBtn','painBtn'].forEach(id=>$(id)?.addEventListener('click',()=>{click()}));
 });
}
function enhanceLungs(){
 once('sensoryLungs',()=>{
   const chest=q('.sv-ausc-stage')||q('.sv-chest');if(!chest)return;
   if(q('.sv-steth')||q('.sv-ausc-wave'))return;
   const scope=document.createElement('div');scope.className='sensory-scope';scope.textContent='●';chest.appendChild(scope);const bars=document.createElement('div');bars.className='sensory-sound-bars';bars.innerHTML='<i></i>'.repeat(16);chest.appendChild(bars);
   qa('.sv-point').forEach(btn=>btn.addEventListener('click',()=>{const cr=chest.getBoundingClientRect(),br=btn.getBoundingClientRect();scope.style.left=`${br.left-cr.left+br.width/2}px`;scope.style.top=`${br.top-cr.top+br.height/2}px`;bars.classList.add('playing');setTimeout(()=>bars.classList.remove('playing'),2600)}));
 });
}
function run(){({pulse:enhancePulse,respirations:enhanceResp,spo2:enhanceSpo2,bgl:enhanceBgl,temperature:enhanceTemp,pupils:enhancePupils,skin:enhanceSkin,'mental-status':enhanceAvpu,'breath-sounds':enhanceLungs}[sim]||(()=>{}))()}
document.addEventListener('DOMContentLoaded',()=>{setTimeout(run,30);new MutationObserver(()=>run()).observe(document.body,{subtree:true,childList:true})});
})();