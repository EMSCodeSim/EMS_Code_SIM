(() => {
  'use strict';

  const topics = {
    bp: {
      title:'Blood Pressure', icon:'🩺', subtitle:'Learn cuff selection, positioning, Korotkoff sounds, interpretation, and documentation.',
      steps:['Explain the procedure and position the patient when possible.','Choose a cuff whose bladder fits the arm; place it on bare skin.','Support the arm near heart level and locate the brachial artery.','Inflate above the estimated systolic pressure.','Deflate slowly while listening for the first and last Korotkoff sounds.','Repeat or confirm unusual readings and compare the trend.'],
      why:['Systolic pressure reflects arterial pressure during ventricular contraction.','Diastolic pressure reflects arterial pressure while the heart relaxes.','Cuff size, arm position, movement, noise, and deflation speed can alter the reading.','A BP matters most when combined with pulse, skin, mental status, complaint, and trend.'],
      normal:'A common adult reference is roughly 90–119 systolic and 60–79 diastolic, interpreted in context.',
      abnormal:['Low BP with cool, clammy skin or altered mental status may indicate poor perfusion.','High BP can accompany pain, anxiety, illness, or a hypertensive emergency when symptoms are present.','A narrowing pulse pressure or falling trend may be clinically important.'],
      docExample:'BP 92/60 mmHg, left arm, seated, manual; patient pale and cool.',
      prompts:[['Which sound marks systolic pressure?',['The first clear tapping sound','The loudest sound','The last sound heard'],0],['Which technique most improves accuracy?',['Deflate as fast as possible','Support the arm near heart level','Place the cuff over clothing'],1]],
      challenge:'Obtain three readings. Before submitting each answer, predict whether the result is normal or not normal and explain which patient findings would change its significance.'
    },
    pulse: {
      title:'Pulse', icon:'❤️', subtitle:'Measure rate, rhythm, and quality—not just a number.',
      steps:['Explain the assessment and select the appropriate pulse site.','Use finger pads, not your thumb.','Count for 30 seconds and multiply by two when regular; count a full minute when irregular.','Assess rhythm as regular or irregular.','Assess quality as strong, weak, bounding, or absent.','Compare peripheral pulses and reassess after treatment.'],
      why:['Rate reflects how quickly the heart is beating.','Rhythm can reveal irregular cardiac activity.','Quality helps describe perfusion and stroke volume.','A rapid weak pulse is more concerning than the same rate with strong pulses and normal skin.'],
      normal:'Typical resting adult rate: about 60–100 beats/min, regular, and strong.',
      abnormal:['Tachycardia may occur with pain, fever, dehydration, anxiety, hypoxia, or shock.','Bradycardia may be normal or may accompany hypoxia, medications, or conduction problems.','Weak, irregular, or absent pulses require correlation with the whole patient.'],
      docExample:'Radial pulse 124/min, weak and regular.',
      prompts:[['A pulse is irregular. How long should you count?',['15 seconds','30 seconds','A full minute'],2],['Which documentation is most complete?',['Pulse 110','Pulse fast','Radial pulse 110, weak and regular'],2]],
      challenge:'Complete five pulse assessments and document rate, rhythm, quality, and site each time.'
    },
    respirations: {
      title:'Respiratory Rate', icon:'🫁', subtitle:'Count without alerting the patient, then describe the complete breathing pattern.',
      steps:['Observe without telling the patient you are counting respirations.','Watch chest or abdominal rise and fall.','Count for 30 seconds and multiply by two when regular; count a full minute when irregular.','Assess rhythm, depth, and effort.','Note position, speech, accessory muscle use, and chest movement.','Reassess after oxygen, ventilation, positioning, or other treatment.'],
      why:['Rate alone can miss respiratory failure.','Depth and effort help distinguish compensation from fatigue.','A slowing rate with worsening mental status may be more dangerous than tachypnea.','Speaking ability and accessory muscle use reveal functional respiratory distress.'],
      normal:'Typical adult reference: about 12–20 breaths/min, regular, adequate depth, and unlabored.',
      abnormal:['Tachypnea may occur with distress, pain, fever, anxiety, hypoxia, or shock.','Bradypnea may occur with CNS depression, overdose, or fatigue.','Shallow, irregular, or labored respirations require prompt attention.'],
      docExample:'RR 28/min, shallow and labored; speaks in short phrases.',
      prompts:[['Why should you avoid announcing the count?',['The patient may change breathing','It improves oxygen saturation','It makes the pulse slower'],0],['Which finding is most concerning?',['RR 16 unlabored','RR 28 with accessory muscle use','RR 12 regular'],1]],
      challenge:'Perform five timed counts and include rate, rhythm, depth, and effort in every entry.'
    },
    spo2: {
      title:'Pulse Oximetry', icon:'📟', subtitle:'Obtain a reliable signal and interpret SpO₂ with the patient—not in isolation.',
      steps:['Choose a warm, well-perfused site and remove barriers when appropriate.','Apply the probe correctly and minimize motion.','Wait for a stable reading and pulse signal.','Compare the displayed pulse with the patient’s palpated pulse.','Check for factors that may distort the value.','Document the reading, oxygen device, flow, and patient response.'],
      why:['SpO₂ estimates oxygen saturation but does not measure ventilation.','Poor perfusion, motion, cold extremities, nail products, and device limitations can distort results.','A normal SpO₂ does not rule out respiratory distress or carbon monoxide exposure.','Trend and response to treatment are often more useful than one number.'],
      normal:'Typical healthy-adult reference: about 95–100%, while baseline and condition matter.',
      abnormal:['90–94% warrants assessment and context.','Below 90% is generally a significant oxygenation concern.','Any number that conflicts with the patient should be verified.'],
      docExample:'SpO₂ 88% on room air with good waveform; improved to 95% after oxygen per protocol.',
      prompts:[['SpO₂ primarily estimates:',['Ventilation','Oxygen saturation','Blood pressure'],1],['A reading conflicts with the patient. First action?',['Ignore the patient','Verify signal and reassess','Document it as exact'],1]],
      challenge:'Practice obtaining stable readings under different simulated signal conditions and decide whether each value is trustworthy.'
    },
    bgl: {
      title:'Blood Glucose', icon:'🩸', subtitle:'Perform a safe glucose check and connect the result to mental status and symptoms.',
      steps:['Use standard precautions and confirm the indication.','Prepare the meter and insert the test strip.','Choose and clean an appropriate puncture site; allow it to dry.','Use the lancet safely and obtain an adequate sample.','Apply blood according to device instructions and read the result.','Control bleeding, dispose of sharps, document, treat, and reassess.'],
      why:['Glucose abnormalities can mimic stroke, intoxication, seizure, and psychiatric conditions.','A normal glucose does not end the altered mental-status assessment.','Ability to swallow and protect the airway determines whether oral treatment is safe.','Device errors, contaminated fingers, and poor samples can produce inaccurate results.'],
      normal:'App practice bands: low below 70 mg/dL; reference band 70–180; high above 180.',
      abnormal:['Hypoglycemia may cause confusion, diaphoresis, weakness, combativeness, seizure, or unconsciousness.','Hyperglycemia may cause thirst, polyuria, dehydration, weakness, vomiting, or altered mental status.','Very abnormal results should be confirmed when inconsistent with the patient.'],
      docExample:'BGL 48 mg/dL at 14:20; confused and diaphoretic; treated per protocol and reassessed.',
      prompts:[['An unresponsive patient has BGL 39. Safest principle?',['Give oral glucose','Nothing by mouth; support ABCs','Ignore the reading'],1],['A normal BGL in an altered patient means:',['Assessment is complete','Continue searching for other causes','Stroke is excluded'],1]],
      challenge:'Complete the meter sequence without hints, interpret five values, and state whether oral treatment would be safe.'
    },
    temperature: {
      title:'Temperature', icon:'🌡️', subtitle:'Use correct technique, recognize measurement limitations, and interpret the trend.',
      steps:['Choose the measurement route appropriate for the patient and device.','Inspect and prepare the device according to instructions.','Position the probe correctly for the selected route.','Wait for a completed reading without disrupting placement.','Consider environmental exposure and route-specific differences.','Document route, value, time, and associated findings.'],
      why:['Temperature helps identify infection, heat illness, cold exposure, and metabolic stress.','Different routes can produce different values.','One reading should be interpreted with history, skin, mental status, and trend.','Environmental conditions and recent hot or cold intake can alter some measurements.'],
      normal:'A common adult oral reference is approximately 97–99°F, but route and patient baseline matter.',
      abnormal:['Fever may accompany infection, inflammation, or heat illness.','Hypothermia may impair mental status, coagulation, and cardiac stability.','Extreme values require prompt confirmation and treatment according to protocol.'],
      docExample:'Tympanic temperature 103.1°F; skin hot and flushed; patient reports chills.',
      prompts:[['Why document the measurement route?',['Routes can yield different values','It changes the pulse','It is never necessary'],0],['A single abnormal value should be:',['Ignored','Interpreted with patient findings and trend','Used alone for diagnosis'],1]],
      challenge:'Measure five simulated patients, identify fever or hypothermia, and document route plus associated findings.'
    },
    pupils: {
      title:'Pupil Assessment', icon:'👁️', subtitle:'Assess size, equality, shape, and reactivity while naming the patient’s sides correctly.',
      steps:['Observe both pupils in ambient light before using a light.','Compare size and shape.','Shine light from the side and assess direct reaction.','Repeat on the other eye and compare responses.','Document patient-left and patient-right findings separately when abnormal.','Correlate with mental status, trauma, medications, and neurologic findings.'],
      why:['Pupils can provide clues about neurologic injury, hypoxia, and drug effects.','Baseline inequality may exist, so history and trend matter.','Side labeling errors can create dangerous documentation mistakes.','Pupil findings do not replace a complete neurologic assessment.'],
      normal:'PERRL: pupils equal, round, and reactive to light.',
      abnormal:['Unequal, sluggish, or nonreactive pupils may be neurologic red flags.','Pinpoint pupils may occur with opioid effects and other conditions.','Dilated pupils may occur with stimulants, hypoxia, or neurologic injury.'],
      docExample:'Patient-right pupil 6 mm and sluggish; patient-left pupil 3 mm and brisk.',
      prompts:[['Best documentation for unequal pupils?',['Right bigger','Patient-right 6 mm sluggish; patient-left 3 mm brisk','Pupils abnormal'],1],['PERRL means:',['Equal, round, reactive to light','Painful, equal, rapid, reactive','Pupils enlarged and reactive'],0]],
      challenge:'Assess five pupil patterns and correctly identify patient-left versus patient-right every time.'
    },
    skin: {
      title:'Skin Signs', icon:'✋', subtitle:'Describe color, temperature, and moisture together and relate them to perfusion.',
      steps:['Inspect exposed skin and compare with the patient’s normal appearance.','Assess color in multiple appropriate areas and consider skin tone.','Use the back of your hand to assess temperature.','Assess moisture and note diaphoresis.','Look for mottling, cyanosis, flushing, pallor, or jaundice.','Reassess after treatment and document objective descriptors.'],
      why:['Skin signs provide a rapid picture of perfusion and physiologic stress.','Color assessment must account for the patient’s baseline and skin tone.','Temperature and moisture often add meaning that color alone cannot.','Changes over time can reveal improvement or deterioration.'],
      normal:'A common description is warm and dry with color appropriate for the patient.',
      abnormal:['Cool, pale, clammy skin may indicate poor perfusion or sympathetic stress.','Hot, flushed skin may occur with fever, sepsis, or heat illness.','Cyanosis and mottling are concerning findings requiring context and action.'],
      docExample:'Skin pale, cool, and diaphoretic.',
      prompts:[['Most objective documentation?',['Skin bad','Pale, cool, and diaphoretic','Looks shocky'],1],['Skin signs should be compared with:',['Only age','Pulse, BP, mental status, and environment','Nothing else'],1]],
      challenge:'Identify color, temperature, and moisture in five patients and write one complete objective sentence for each.'
    },
    avpu: {
      title:'AVPU', icon:'🧠', subtitle:'Use the least stimulus needed and describe exactly what produced a response.',
      steps:['Observe whether the patient is spontaneously alert.','Speak clearly and assess response to verbal stimulus.','If needed, apply an appropriate painful stimulus according to training and policy.','If there is no response, classify as unresponsive.','Immediately assess airway, breathing, circulation, and reversible causes.','Reassess and document changes after treatment.'],
      why:['AVPU is a rapid neurologic screen, not a full mental-status exam.','A response to voice is not the same as being alert.','Declining AVPU may reflect hypoxia, shock, head injury, stroke, overdose, seizure, sepsis, or hypoglycemia.','Changes from baseline are clinically important.'],
      normal:'A typical awake patient is Alert (A).',
      abnormal:['V, P, or U indicate decreased responsiveness.','Any decline requires rapid ABC assessment and investigation of reversible causes.','AVPU should be paired with pupils, glucose, orientation, and other neurologic findings.'],
      docExample:'AVPU: P — opens eyes and withdraws only after painful stimulus.',
      prompts:[['Eyes open only after painful stimulus. AVPU?',['A','V','P','U'],2],['A patient responds when spoken to but was not awake before. AVPU?',['A','V','P','U'],1]],
      challenge:'Classify five response patterns and state the least stimulus that produced each response.'
    },
    breath: {
      title:'Breath Sounds', icon:'🎧', subtitle:'Auscultate systematically, identify sounds, and connect them to respiratory findings.',
      steps:['Position the patient when possible and expose the chest appropriately.','Use the diaphragm of the stethoscope directly on skin.','Ask for slow deep breaths through the mouth when tolerated.','Compare matching locations side to side.','Listen through a full respiratory cycle at each site.','Describe location, timing, intensity, and sound quality; reassess after treatment.'],
      why:['Comparing side to side helps identify focal abnormalities.','Wheezes suggest narrowed lower airways; crackles suggest fluid or reopening of small airways.','Stridor is an upper-airway emergency sound.','Absent or diminished sounds can be subtle and clinically significant.'],
      normal:'Normal vesicular sounds are soft and heard over most peripheral lung fields.',
      abnormal:['Wheezing is commonly associated with lower-airway narrowing.','Crackles may occur with pulmonary edema, pneumonia, or other fluid/alveolar processes.','Stridor indicates upper-airway obstruction and requires urgent attention.','Unequal or absent sounds may suggest pneumothorax, obstruction, poor effort, or positioning issues.'],
      docExample:'Bilateral expiratory wheezes, louder at bases; respirations labored at 28/min.',
      prompts:[['Which sound suggests upper-airway obstruction?',['Crackles','Stridor','Vesicular'],1],['Best auscultation method?',['Listen over clothing','Compare matching sites side to side','Listen to one location only'],1]],
      challenge:'Identify each available sound twice, then document location, timing, and associated respiratory effort.'
    }
  };

  const map = {
    'bp.html':'bp','pulse.html':'pulse','respiratory-rate.html':'respirations','pulse-ox.html':'spo2',
    'bgl.html':'bgl','temperature.html':'temperature','pupil.html':'pupils','skin.html':'skin',
    'avpu.html':'avpu','breath-sound-simulator.html':'breath'
  };
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const key = () => document.body.dataset.vitalTopic || map[location.pathname.split('/').pop()];

  function panel(t){
    const steps=t.steps.map((s,i)=>`<label class="avl-step"><input type="checkbox" data-step="${i}"><span><b>${i+1}</b>${esc(s)}</span></label>`).join('');
    const why=t.why.map(x=>`<li>${esc(x)}</li>`).join('');
    const abnormal=t.abnormal.map(x=>`<li>${esc(x)}</li>`).join('');
    const qs=t.prompts.map((q,qi)=>`<fieldset class="avl-q" data-answer="${q[2]}"><legend>${esc(q[0])}</legend>${q[1].map((a,ai)=>`<label><input type="radio" name="q${qi}" value="${ai}"> ${esc(a)}</label>`).join('')}<div class="avl-q-feedback" aria-live="polite"></div></fieldset>`).join('');
    return `<section class="app-vitals-learning" data-app-vitals-learning>
      <header class="avl-head"><div><p class="avl-kicker">Standalone vital learning center</p><h2>${t.icon} Learn ${esc(t.title)}</h2><p>${esc(t.subtitle)}</p></div><div class="avl-progress"><span>Lesson progress</span><b>0%</b><div><i></i></div></div></header>
      <nav class="avl-tabs" aria-label="Lesson phases"><button class="active" data-tab="how">1. How</button><button data-tab="why">2. Why</button><button data-tab="practice">3. Practice</button><button data-tab="review">4. Review</button></nav>
      <div class="avl-body">
        <section class="avl-pane active" data-pane="how"><div class="avl-intro"><span class="avl-label">Skill sequence</span><h3>How to perform the assessment</h3><p>Complete each step before moving into the simulator.</p></div><div class="avl-checklist">${steps}</div><button class="avl-next" type="button" data-next="why">Continue to Why</button></section>
        <section class="avl-pane" data-pane="why"><div class="avl-grid"><article><span class="avl-label">Why it matters</span><h3>Understand the physiology and limitations</h3><ul>${why}</ul></article><article><span class="avl-label">Quick reference</span><h3>Typical and abnormal findings</h3><p class="avl-normal">${esc(t.normal)}</p><ul>${abnormal}</ul></article></div><div class="avl-doc"><span class="avl-label">Objective documentation</span><code>${esc(t.docExample)}</code></div><button class="avl-next" type="button" data-next="practice">Continue to Practice</button></section>
        <section class="avl-pane" data-pane="practice"><div class="avl-practice"><div><span class="avl-label">Interactive simulator</span><h3>Perform the skill yourself</h3><p>${esc(t.challenge)}</p><ol><li>Perform the assessment using the simulator on this page.</li><li>Enter or identify the finding before viewing feedback.</li><li>Decide whether it is normal or not normal.</li><li>Repeat until you can perform the skill without hints.</li></ol></div><button type="button" class="avl-launch">Open simulator</button></div><div class="avl-reflection"><label>What finding did you obtain?<input id="avlFinding" type="text" placeholder="Enter the complete finding"></label><label>Interpretation<select id="avlInterpret"><option value="">Choose…</option><option>Normal</option><option>Not normal</option></select></label><label>How would you document it?<textarea id="avlDocument" rows="3" placeholder="Write an objective PCR-style statement"></textarea></label><button type="button" class="avl-save-practice">Save practice entry</button><div class="avl-practice-feedback" aria-live="polite"></div></div><button class="avl-next" type="button" data-next="review">Continue to Review</button></section>
        <section class="avl-pane" data-pane="review"><span class="avl-label">Knowledge check</span><h3>Confirm what you learned</h3>${qs}<button type="button" class="avl-grade">Check answers</button><div class="avl-score" aria-live="polite"></div><div class="avl-finish"><button type="button" class="avl-reset">Practice lesson again</button><a href="/vitals/">Return to Vitals Learning Center</a></div></section>
      </div></section>`;
  }

  function init(root){
    const tabs=[...root.querySelectorAll('[data-tab]')], panes=[...root.querySelectorAll('[data-pane]')];
    const progress=root.querySelector('.avl-progress');
    const completed=new Set();
    function update(){const pct=Math.round((completed.size/4)*100);progress.querySelector('b').textContent=pct+'%';progress.querySelector('i').style.width=pct+'%';}
    function show(name){tabs.forEach(b=>b.classList.toggle('active',b.dataset.tab===name));panes.forEach(p=>p.classList.toggle('active',p.dataset.pane===name));completed.add(name);update();root.scrollIntoView({behavior:'smooth',block:'start'});}
    tabs.forEach(b=>b.addEventListener('click',()=>show(b.dataset.tab)));
    root.querySelectorAll('[data-next]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.next)));
    root.querySelector('.avl-launch').addEventListener('click',()=>{const candidates=[...document.body.children].filter(el=>!root.contains(el)&&!['SCRIPT','STYLE','LINK'].includes(el.tagName));const target=candidates.find(el=>el.querySelector?.('button,input,canvas,img'))||document.querySelector('main,.app,.container');if(target) target.scrollIntoView({behavior:'smooth',block:'start'});});
    root.querySelector('.avl-save-practice').addEventListener('click',()=>{const f=root.querySelector('#avlFinding').value.trim(),i=root.querySelector('#avlInterpret').value,d=root.querySelector('#avlDocument').value.trim(),out=root.querySelector('.avl-practice-feedback');if(!f||!i||!d){out.textContent='Complete the finding, interpretation, and documentation before saving.';out.className='avl-practice-feedback bad';return;}out.textContent='Practice entry complete. Compare your wording with the objective example, then repeat the simulator with a new finding.';out.className='avl-practice-feedback good';completed.add('practice');update();});
    root.querySelector('.avl-grade').addEventListener('click',()=>{let correct=0;const qs=[...root.querySelectorAll('.avl-q')];qs.forEach(q=>{const pick=q.querySelector('input:checked');const fb=q.querySelector('.avl-q-feedback');if(!pick){fb.textContent='Choose an answer.';fb.className='avl-q-feedback bad';return;}const ok=Number(pick.value)===Number(q.dataset.answer);if(ok)correct++;fb.textContent=ok?'Correct.':'Review this concept and try again.';fb.className='avl-q-feedback '+(ok?'good':'bad');});const score=root.querySelector('.avl-score');score.textContent=`Score: ${correct}/${qs.length}. ${correct===qs.length?'Lesson complete.':'Review missed items and check again.'}`;if(correct===qs.length){completed.add('review');update();}});
    root.querySelector('.avl-reset').addEventListener('click',()=>{root.querySelectorAll('input').forEach(x=>{if(x.type==='checkbox'||x.type==='radio')x.checked=false;else x.value='';});root.querySelectorAll('textarea,select').forEach(x=>x.value='');root.querySelectorAll('.avl-q-feedback,.avl-score,.avl-practice-feedback').forEach(x=>x.textContent='');completed.clear();show('how');});
    root.querySelectorAll('[data-step]').forEach(x=>x.addEventListener('change',()=>{const all=[...root.querySelectorAll('[data-step]')];if(all.every(y=>y.checked)){completed.add('how');update();}}));
    show('how');
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const params=new URLSearchParams(location.search);
    if(params.get('mode')==='scenario'||document.body.dataset.scenarioOnly==='true') return;
    const t=topics[key()]; if(!t||document.querySelector('[data-app-vitals-learning]')) return;
    const holder=document.createElement('div');holder.className='app-vitals-learning-shell';holder.innerHTML=panel(t);
    const anchor=document.querySelector('.topbar,header');
    if(anchor&&anchor.parentNode) anchor.insertAdjacentElement('afterend',holder); else document.body.prepend(holder);
    init(holder.querySelector('.app-vitals-learning'));
  });
})();
