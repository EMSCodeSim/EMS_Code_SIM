
(function(){
  function qs(sel,ctx){return (ctx||document).querySelector(sel)}
  function qsa(sel,ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  const goalData={
    new:{title:'Start with normal pulse and the four pulse qualities',text:'Learn rate, rhythm, strength, and equality before you begin scenarios or simulator work.',link:'/pulse-ranges.html',label:'Learn pulse basics'},
    practice:{title:'Go to the pulse skills lab',text:'Learn radial and carotid sites, correct finger placement, counting methods, and documentation before using the simulator.',link:'/pulse-skills.html',label:'Open pulse skills lab'},
    danger:{title:'Learn fast, slow, and irregular pulse warning signs',text:'Review tachycardia, bradycardia, irregular pulse, causes, symptoms, treatment basics, and emergency red flags.',link:'/pulse-problems.html',label:'Open pulse problems'},
    sim:{title:'Use your Pulse Trainer',text:'Launch the EMSCodeSim Pulse Trainer to practice counting beats and calculating the pulse rate.',link:'/vitals/pulse.html',label:'Launch Pulse Trainer'}
  };
  qsa('[data-pulse-goal]').forEach(function(btn){btn.addEventListener('click',function(){qsa('[data-pulse-goal]').forEach(function(b){b.classList.remove('active')});btn.classList.add('active');const d=goalData[btn.dataset.pulseGoal];const out=qs('#goalResult');if(out&&d)out.innerHTML='<h3>'+d.title+'</h3><p>'+d.text+'</p><div class="pulse-actions"><a class="pulse-btn pink" href="'+d.link+'">'+d.label+'</a><a class="pulse-btn ghost" href="/vitals/pulse.html">Practice in simulator</a></div>';});});

  qsa('[data-range-tab]').forEach(function(tab){tab.addEventListener('click',function(){const id=tab.dataset.rangeTab;qsa('[data-range-tab]').forEach(function(t){t.setAttribute('aria-selected',String(t===tab))});qsa('[data-range-panel]').forEach(function(p){p.hidden=p.dataset.rangePanel!==id});});});

  const ranges={
    newborn:{name:'Newborn 0–1 month',low:70,high:190},
    infant:{name:'Infant 1–11 months',low:80,high:160},
    toddler:{name:'Child 1–2 years',low:80,high:130},
    preschool:{name:'Child 3–4 years',low:80,high:120},
    earlyschool:{name:'Child 5–6 years',low:75,high:115},
    school:{name:'Child 7–9 years',low:70,high:110},
    adult:{name:'Age 10+ and adult',low:60,high:100},
    athlete:{name:'Well-trained athlete',low:40,high:60}
  };
  const rateForm=qs('#pulseRateForm'), rateResult=qs('#pulseRateResult');
  function updateRate(){
    if(!rateForm||!rateResult)return;
    const age=qs('#pulseAge').value, bpm=Number(qs('#pulseBpm').value), d=ranges[age];
    if(!bpm){rateResult.innerHTML='<span class="result-badge">Choose an age and enter a pulse</span><h2>See how the rate compares</h2><p>This checker compares a resting pulse with age-based reference ranges. It does not diagnose the rhythm or the patient.</p>';return;}
    let badge='Within the reference range', cls='', summary='This resting pulse falls inside the selected age range.';
    if(bpm<d.low){badge='Below the reference range';cls='blue';summary='This pulse is slower than the selected age reference. That may be normal during sleep or in trained athletes, but symptoms and the patient context matter.';}
    if(bpm>d.high){badge='Above the reference range';cls='red';summary='This pulse is faster than the selected age reference. Exercise, fever, pain, anxiety, dehydration, medications, or an arrhythmia can contribute.';}
    rateResult.innerHTML='<span class="result-badge '+cls+'">'+badge+'</span><h2>'+bpm+' BPM — '+d.name+'</h2><p>'+summary+'</p><p><strong>Reference range:</strong> '+d.low+'–'+d.high+' BPM at rest.</p><p><strong>Next thought:</strong> Check rhythm, strength, equality, symptoms, recent activity, temperature, medications, hydration, and perfusion.</p><p class="small-print">Age ranges are educational references from MedlinePlus. A single number cannot determine whether a patient is stable.</p>';
  }
  if(rateForm){rateForm.addEventListener('input',updateRate);updateRate();}

  qsa('form[data-pulse-quiz]').forEach(function(form){form.addEventListener('submit',function(e){e.preventDefault();let score=0,total=0,complete=true;qsa('.quiz-question',form).forEach(function(q){total++;const chosen=form.querySelector('input[name="'+q.dataset.name+'"]:checked');if(!chosen){complete=false;return}if(chosen.value===q.dataset.answer)score++;});const out=qs('.quiz-result',form);if(!complete){out.hidden=false;out.textContent='Answer each question before checking your score.';return}out.hidden=false;out.innerHTML='<strong>'+score+' of '+total+' correct.</strong> '+(score===total?'Excellent. Move on to pulse-site and counting practice.':score>=Math.ceil(total*.7)?'Good start. Review the missed concept and try again.':'Review rate, rhythm, strength, equality, and counting technique, then repeat the quiz.');});});

  const siteData={
    radial:{title:'Radial pulse: the everyday workhorse',text:'Place your index and middle fingers on the thumb side of the inner wrist. Use light pressure and avoid using your thumb.',extra:'A good site for routine pulse rate, rhythm, and quality in a conscious patient.'},
    carotid:{title:'Carotid pulse: central pulse site',text:'Place two fingers gently in the groove beside the trachea. Never press both carotid arteries at the same time.',extra:'Commonly used when checking for a central pulse in an unresponsive adult.'},
    brachial:{title:'Brachial pulse: important in infants',text:'Feel along the inside of the upper arm between the shoulder and elbow.',extra:'Frequently used for an infant pulse check and for locating the brachial artery during manual BP practice.'},
    femoral:{title:'Femoral pulse: central circulation clue',text:'The femoral pulse is felt in the groin where the femoral artery passes near the skin.',extra:'Used in selected trauma, shock, or central-pulse assessments.'},
    pedal:{title:'Dorsalis pedis: distal circulation',text:'Feel on the top of the foot, usually just lateral to the tendon of the great toe.',extra:'Useful when checking distal perfusion and comparing sides.'}
  };
  qsa('[data-site]').forEach(function(btn){btn.addEventListener('click',function(){qsa('[data-site]').forEach(function(b){b.classList.remove('active')});btn.classList.add('active');const d=siteData[btn.dataset.site];const out=qs('#siteResult');if(out&&d)out.innerHTML='<h3>'+d.title+'</h3><p>'+d.text+'</p><p><strong>Use:</strong> '+d.extra+'</p>';});});

  const seqOptions=qs('#sequenceOptions'),seqChosen=qs('#sequenceChosen'),seqResult=qs('#sequenceResult');
  const expected=['Rest and position the patient','Choose the pulse site','Use index and middle fingers','Press lightly until pulse is felt','Count 30 seconds and multiply by 2','Count 60 seconds if irregular','Assess rhythm, strength, and equality','Document site and findings'];
  if(seqOptions&&seqChosen){qsa('button',seqOptions).forEach(function(btn){btn.addEventListener('click',function(){seqChosen.appendChild(btn)})});seqChosen.addEventListener('click',function(e){if(e.target.matches('button'))seqOptions.appendChild(e.target)});const check=qs('#checkSequence');if(check)check.addEventListener('click',function(){const selected=qsa('button',seqChosen).map(function(b){return b.textContent.trim()});if(selected.length!==expected.length){seqResult.textContent='Move all eight steps into your sequence first.';return}const ok=selected.every(function(v,i){return v===expected[i]});seqResult.textContent=ok?'Correct. Position, locate, feel, count, assess the pulse qualities, and document.':'Almost. Start with the patient and site, then fingers, counting, pulse qualities, and documentation.';});const reset=qs('#resetSequence');if(reset)reset.addEventListener('click',function(){qsa('button',seqChosen).forEach(function(b){seqOptions.appendChild(b)});seqResult.textContent='';});}

  const tapPad=qs('#tapPad'),tapBpm=qs('#tapBpm'),tapCount=qs('#tapCount'),tapRhythm=qs('#tapRhythm'),tapMessage=qs('#tapMessage');let taps=[];
  function resetTaps(){taps=[];if(tapBpm)tapBpm.textContent='—';if(tapCount)tapCount.textContent='0';if(tapRhythm)tapRhythm.textContent='—';if(tapMessage)tapMessage.textContent='Tap with each beat you feel. After several taps, the page estimates the rate and regularity.';}
  if(tapPad){tapPad.addEventListener('click',function(){const now=performance.now();if(taps.length&&now-taps[taps.length-1]>3000)taps=[];taps.push(now);if(taps.length>12)taps.shift();tapPad.classList.add('beat');setTimeout(function(){tapPad.classList.remove('beat')},100);if(tapCount)tapCount.textContent=String(taps.length);if(taps.length<3){if(tapMessage)tapMessage.textContent='Keep tapping…';return}const intervals=[];for(let i=1;i<taps.length;i++)intervals.push(taps[i]-taps[i-1]);const avg=intervals.reduce(function(a,b){return a+b},0)/intervals.length;const bpm=Math.round(60000/avg);const maxDev=Math.max.apply(null,intervals.map(function(v){return Math.abs(v-avg)}));const variability=maxDev/avg;const rhythm=variability<.12?'Regular':variability<.25?'Mostly regular':'Irregular pattern';if(tapBpm)tapBpm.textContent=String(bpm);if(tapRhythm)tapRhythm.textContent=rhythm;if(tapMessage)tapMessage.textContent=bpm+' BPM — '+rhythm+'. This is a practice estimate; a true irregular pulse should be counted for a full minute and assessed in context.';});const reset=qs('#resetTap');if(reset)reset.addEventListener('click',resetTaps);resetTaps();}

  qsa('[data-scenario-answer]').forEach(function(btn){btn.addEventListener('click',function(){const group=btn.closest('[data-scenario]');if(group.dataset.answered)return;group.dataset.answered='1';const correct=btn.dataset.scenarioAnswer==='correct';btn.classList.add(correct?'correct':'wrong');qsa('[data-scenario-answer]',group).forEach(function(b){if(b.dataset.scenarioAnswer==='correct')b.classList.add('correct')});const out=qs('.scenario-feedback',group);out.textContent=btn.dataset.feedback || (correct?'Correct.':'Review the patient context and pulse qualities again.');});});
})();
