
(function(){
  function qs(s,c){return (c||document).querySelector(s)}
  function qsa(s,c){return Array.from((c||document).querySelectorAll(s))}
  const sounds={
    normal:{name:'Normal vesicular',src:'/vitals/Lung-NormalVesicular.mp3',volume:1,phase:'Mostly inspiratory, soft and low-pitched',clue:'Expected over most peripheral lung fields.'},
    wheeze:{name:'Wheezing',src:'/vitals/Lung-Wheezing.mp3',volume:1,phase:'Continuous, musical, often louder on expiration',clue:'Suggests narrowed lower airways; connect it to work of breathing and history.'},
    crackles:{name:'Coarse crackles',src:'/vitals/Lung-CoarseCrackles.mp3',volume:1,phase:'Discontinuous popping or bubbling, commonly inspiratory',clue:'Can occur with fluid, secretions, infection, or reopening small airways.'},
    stridor:{name:'Inspiratory stridor',src:'/vitals/Lung-InspiratoryStridor.mp3',volume:1,phase:'Harsh, high-pitched upper-airway sound, often inspiratory',clue:'Treat as an airway warning sign, especially with distress.'},
    diminished:{name:'Diminished breath sounds',src:'/vitals/Lung-NormalVesicular.mp3',volume:.22,phase:'Quieter-than-expected airflow',clue:'May result from shallow breathing, poor air movement, obstruction, effusion, pneumothorax, body habitus, or technique.'}
  };
  const audio=new Audio(); audio.preload='auto';
  let currentKey='normal';
  function playSound(key,orb){const d=sounds[key];if(!d)return;currentKey=key;audio.pause();audio.src=d.src;audio.volume=d.volume;audio.currentTime=0;audio.play().catch(function(){});qsa('.sound-chip').forEach(function(b){b.classList.toggle('active',b.dataset.sound===key)});if(orb){orb.classList.add('playing');setTimeout(function(){orb.classList.remove('playing')},350)}const title=qs('#soundTitle'),desc=qs('#soundDescription');if(title)title.textContent=d.name;if(desc)desc.innerHTML='<strong>'+d.phase+'</strong><br>'+d.clue;}
  qsa('[data-sound]').forEach(function(btn){btn.addEventListener('click',function(){playSound(btn.dataset.sound,qs('#soundOrb'))})});
  const mainPlay=qs('#mainSoundPlay');if(mainPlay)mainPlay.addEventListener('click',function(){playSound(currentKey,qs('#soundOrb'))});

  const goalData={
    new:{title:'Start with the sound library',text:'Learn what normal vesicular sounds, wheezes, crackles, stridor, rhonchi, and diminished sounds mean before testing yourself.',link:'/breath-sound-library.html',label:'Open sound library'},
    listen:{title:'Use the audio listening lab',text:'Play the training clips side by side, compare normal with abnormal sounds, and try the mystery-sound challenge.',link:'/breath-sound-library.html#listen',label:'Start listening'},
    technique:{title:'Open the auscultation skills page',text:'Learn where to place the stethoscope, how to compare side to side, and how to avoid common listening errors.',link:'/breath-sound-skills.html',label:'Learn auscultation'},
    sim:{title:'Practice in your simulator',text:'Select left and right sounds, rotate the patient, and tap listening points in the existing EMSCodeSim simulator.',link:'/vitals/breath-sound-simulator.html',label:'Launch simulator'}
  };
  qsa('[data-breath-goal]').forEach(function(btn){btn.addEventListener('click',function(){qsa('[data-breath-goal]').forEach(function(b){b.classList.remove('active')});btn.classList.add('active');const d=goalData[btn.dataset.breathGoal],out=qs('#goalResult');if(out&&d)out.innerHTML='<h3>'+d.title+'</h3><p>'+d.text+'</p><div class="breath-actions"><a class="breath-btn teal" href="'+d.link+'">'+d.label+'</a><a class="breath-btn ghost" href="/vitals/breath-sound-simulator.html">Open simulator</a></div>';});});

  qsa('[data-sound-tab]').forEach(function(tab){tab.addEventListener('click',function(){const id=tab.dataset.soundTab;qsa('[data-sound-tab]').forEach(function(t){t.setAttribute('aria-selected',String(t===tab))});qsa('[data-sound-panel]').forEach(function(p){p.hidden=p.dataset.soundPanel!==id});});});

  qsa('[data-compare-play]').forEach(function(btn){btn.addEventListener('click',function(){const sel=qs(btn.dataset.comparePlay);if(sel)playSound(sel.value,null)});});

  let mysteryAnswer='normal', mysteryReady=false;
  const mysteryKeys=['normal','wheeze','crackles','stridor'];
  const newMystery=qs('#newMystery'),playMystery=qs('#playMystery'),mysteryStatus=qs('#mysteryStatus');
  function makeMystery(){mysteryAnswer=mysteryKeys[Math.floor(Math.random()*mysteryKeys.length)];mysteryReady=true;qsa('[data-mystery-answer]').forEach(function(b){b.classList.remove('correct','wrong');b.disabled=false});if(mysteryStatus)mysteryStatus.textContent='Mystery sound loaded. Play it, then choose the best answer.';}
  if(newMystery)newMystery.addEventListener('click',makeMystery);
  if(playMystery)playMystery.addEventListener('click',function(){if(!mysteryReady)makeMystery();playSound(mysteryAnswer,qs('#mysteryOrb'))});
  qsa('[data-mystery-answer]').forEach(function(btn){btn.addEventListener('click',function(){if(!mysteryReady){if(mysteryStatus)mysteryStatus.textContent='Load a mystery sound first.';return}const ok=btn.dataset.mysteryAnswer===mysteryAnswer;btn.classList.add(ok?'correct':'wrong');qsa('[data-mystery-answer]').forEach(function(b){if(b.dataset.mysteryAnswer===mysteryAnswer)b.classList.add('correct');b.disabled=true});if(mysteryStatus)mysteryStatus.textContent=ok?'Correct: '+sounds[mysteryAnswer].name+'.':'The correct answer is '+sounds[mysteryAnswer].name+'. Listen again and focus on pitch, continuity, and respiratory phase.';});});

  const siteData={
    anterior:{title:'Anterior chest',text:'Start above the clavicles, then compare matching upper and lower fields side to side. Avoid listening directly over bone when possible.'},
    lateral:{title:'Lateral chest',text:'Listen along the midaxillary areas to better assess the right middle lobe and lateral lower lung fields.'},
    posterior:{title:'Posterior chest',text:'Posterior fields provide broad access to the lower lobes. Move in a side-to-side ladder while the patient takes slow breaths through an open mouth.'},
    neck:{title:'Neck / upper airway',text:'Listen over the neck when stridor or an upper-airway obstruction is suspected. Stridor may be audible without a stethoscope.'}
  };
  qsa('[data-listen-site]').forEach(function(btn){btn.addEventListener('click',function(){qsa('[data-listen-site]').forEach(function(b){b.classList.remove('active')});btn.classList.add('active');const d=siteData[btn.dataset.listenSite],out=qs('#siteResult');if(out&&d)out.innerHTML='<h3>'+d.title+'</h3><p>'+d.text+'</p>';});});

  const seqOptions=qs('#sequenceOptions'),seqChosen=qs('#sequenceChosen'),seqResult=qs('#sequenceResult');
  const expected=['Expose the chest and reduce background noise','Warm the stethoscope and use the diaphragm','Ask for slow breaths through an open mouth','Listen to one full respiratory cycle','Compare matching sites side to side','Describe location, phase, pitch, and intensity','Reassess after treatment or patient change'];
  if(seqOptions&&seqChosen){qsa('button',seqOptions).forEach(function(btn){btn.addEventListener('click',function(){seqChosen.appendChild(btn)})});seqChosen.addEventListener('click',function(e){if(e.target.matches('button'))seqOptions.appendChild(e.target)});const check=qs('#checkSequence');if(check)check.addEventListener('click',function(){const selected=qsa('button',seqChosen).map(function(b){return b.textContent.trim()});if(selected.length!==expected.length){seqResult.textContent='Move all seven steps into your sequence first.';return}const ok=selected.every(function(v,i){return v===expected[i]});seqResult.textContent=ok?'Correct. Prepare, listen systematically, describe what you hear, then reassess.':'Not quite. Start with preparation, move side to side, describe the finding, and finish with reassessment.';});const reset=qs('#resetSequence');if(reset)reset.addEventListener('click',function(){qsa('button',seqChosen).forEach(function(b){seqOptions.appendChild(b)});seqResult.textContent='';});}

  qsa('form[data-breath-quiz]').forEach(function(form){form.addEventListener('submit',function(e){e.preventDefault();let score=0,total=0,complete=true;qsa('.quiz-question',form).forEach(function(q){total++;const chosen=form.querySelector('input[name="'+q.dataset.name+'"]:checked');if(!chosen){complete=false;return}if(chosen.value===q.dataset.answer)score++;});const out=qs('.quiz-result',form);if(!complete){out.hidden=false;out.textContent='Answer each question before checking your score.';return}out.hidden=false;out.innerHTML='<strong>'+score+' of '+total+' correct.</strong> '+(score===total?'Excellent. Move to the mystery-sound challenge or simulator.':score>=Math.ceil(total*.7)?'Good start. Review the missed sound patterns and try again.':'Review pitch, timing, continuity, and location, then retake the quiz.');});});

  qsa('[data-scenario-answer]').forEach(function(btn){btn.addEventListener('click',function(){const group=btn.closest('[data-scenario]');if(group.dataset.answered)return;group.dataset.answered='1';const ok=btn.dataset.scenarioAnswer==='correct';btn.classList.add(ok?'correct':'wrong');qsa('[data-scenario-answer]',group).forEach(function(b){if(b.dataset.scenarioAnswer==='correct')b.classList.add('correct')});const out=qs('.scenario-feedback',group);out.textContent=btn.dataset.feedback||'';});});
})();
