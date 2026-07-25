(() => {
  'use strict';

  const topics = {
    bp: {
      title: 'Blood Pressure',
      subtitle: 'Connect the cuff reading to perfusion, patient presentation, technique, and trends.',
      image: '/vitals/assets/bp-cuff-stethoscope-placement.png',
      what: 'Blood pressure is the force of blood against arterial walls. In EMS it helps describe perfusion and identify patterns that may be consistent with shock, stress, pain, or severe hypertension when combined with the rest of the assessment.',
      range: 'App adult practice rule: about 90–119 systolic and 60–79 diastolic is marked Normal.',
      abnormal: [
        'Low pressure with cool or clammy skin, weak pulse, or altered mental status may suggest poor perfusion or shock.',
        'High pressure can occur with pain, anxiety, or illness. Severe readings must be interpreted with symptoms and local guidance.',
        'Weak pulses, noise, incorrect cuff size, poor positioning, and fast deflation can make the result inaccurate.'
      ],
      document: 'BP 92/60 mmHg, left arm, seated, manual; patient pale and cool.',
      mistake: 'Treating the number as a standalone answer instead of comparing it with pulse quality, skin signs, mental status, complaint, and trend.',
      normalExample: ['BP 118/76', 'Within the app’s adult practice range when the patient is warm, alert, and otherwise stable.'],
      abnormalExample: ['BP 84/50', 'Low systolic pressure is concerning when paired with weak pulse, cool/clammy skin, or altered mental status.'],
      abnormalLabel: 'Not normal',
      quiz: ['Which finding is most concerning for shock in an adult?', ['BP 118/76 with warm, dry skin', 'BP 92/60 with cool, clammy skin', 'BP 146/92 with anxiety'], 1, 'The low pressure plus cool, clammy skin creates a poor-perfusion pattern.'],
      links: [['Pulse', '/vitals/pulse.html'], ['Skin signs', '/vitals/skin.html'], ['Full vitals set', '/vitals/full-vitals-set.html']]
    },
    pulse: {
      title: 'Pulse Rate, Rhythm, and Quality',
      subtitle: 'A pulse assessment is more than a heart-rate number.',
      image: '/vitals/assets/pulse-points-diagram.png',
      what: 'Pulse rate reflects how fast the heart is beating. A complete pulse assessment also includes rhythm, strength or quality, and the location used.',
      range: 'Typical resting adult reference used in the app: about 60–100 BPM.',
      abnormal: [
        'Tachycardia may occur with pain, fever, dehydration, anxiety, hypoxia, or shock.',
        'Bradycardia may be a normal athletic finding or may relate to medications, hypoxia, or conduction problems.',
        'A weak rapid pulse changes the perfusion picture even when the rate alone is not extreme.'
      ],
      document: 'Radial pulse 124/min, weak and regular.',
      mistake: 'Documenting only the rate and forgetting rhythm and quality.',
      normalExample: ['Pulse 78, strong and regular', 'A typical adult rate with reassuring rhythm and quality when other perfusion findings agree.'],
      abnormalExample: ['Pulse 110, weak and irregular', 'Fast, weak, and irregular requires correlation with BP, skin, complaint, and mental status.'],
      abnormalLabel: 'Not normal',
      quiz: ['A weak rapid pulse with cool, clammy skin suggests:', ['Good perfusion', 'Possible shock or poor perfusion', 'A normal finding'], 1, 'The pulse quality and skin signs together are concerning for poor perfusion.'],
      links: [['Blood pressure', '/vitals/bp.html'], ['Skin signs', '/vitals/skin.html'], ['Full vitals set', '/vitals/full-vitals-set.html']]
    },
    respirations: {
      title: 'Respiratory Rate and Effort',
      subtitle: 'Count quietly, then describe the full breathing pattern.',
      image: '/vitals/assets/respirations-tutorial.png',
      what: 'Respiratory rate is breaths per minute, but the complete assessment includes rate, rhythm, depth, effort, chest movement, ability to speak, and associated sounds.',
      range: 'Typical adult reference used in the app: about 12–20 breaths/min.',
      abnormal: [
        'Tachypnea may occur with respiratory distress, pain, fever, anxiety, hypoxia, or shock.',
        'Bradypnea may occur with central nervous system depression, opioid exposure, or fatigue.',
        'Shallow or labored respirations and declining mental status may be more important than the rate alone.'
      ],
      document: 'RR 28/min, shallow and labored; speaks in short phrases.',
      mistake: 'Counting the number but missing increased work of breathing, shallow depth, irregular rhythm, or fatigue.',
      normalExample: ['RR 16, unlabored', 'A typical adult rate without obvious increased work of breathing.'],
      abnormalExample: ['RR 32, shallow and labored', 'Fast breathing with increased effort may indicate respiratory distress, shock, pain, fever, or fatigue.'],
      abnormalLabel: 'Not normal',
      quiz: ['Which respiratory finding is abnormal for a typical adult?', ['16/min, unlabored', '12/min, unlabored', '28/min with increased effort'], 2, 'The rate is elevated and the increased effort adds concern.'],
      links: [['Breath sounds', '/vitals/breath-sound-simulator.html'], ['SpO₂', '/vitals/pulse-ox.html'], ['Full vitals set', '/vitals/full-vitals-set.html']]
    },
    skin: {
      title: 'Skin Signs',
      subtitle: 'Describe color, temperature, and moisture together.',
      what: 'Skin signs provide a rapid picture of perfusion and physiologic stress. Compare the finding with the patient’s baseline, environment, mental status, pulse, and blood pressure.',
      range: 'Typical adult description used in the app: warm, pink, and dry, while recognizing normal appearance varies by baseline and skin tone.',
      abnormal: [
        'Cool or clammy skin may occur with shock or a sympathetic stress response.',
        'Hot or flushed skin may occur with fever, sepsis, or heat illness.',
        'Cyanosis suggests severe oxygenation concern; pale or mottled skin may suggest poor perfusion.'
      ],
      document: 'Skin pale, cool, and diaphoretic.',
      mistake: 'Writing “skin normal” instead of documenting color, temperature, and moisture.',
      normalExample: ['Warm, pink, dry', 'A reassuring basic perfusion picture when the patient’s other findings agree.'],
      abnormalExample: ['Pale, cool, clammy', 'A poor-perfusion or stress pattern, especially with a rapid weak pulse or low BP.'],
      abnormalLabel: 'Not normal',
      quiz: ['Cool, pale, diaphoretic skin most strongly suggests:', ['Good perfusion', 'Possible shock or poor perfusion', 'A normal baseline'], 1, 'This combination is a classic poor-perfusion or sympathetic stress pattern.'],
      links: [['Blood pressure', '/vitals/bp.html'], ['Pulse', '/vitals/pulse.html'], ['Full vitals set', '/vitals/full-vitals-set.html']]
    },
    pupils: {
      title: 'Pupil Assessment',
      subtitle: 'Document size, equality, shape, reactivity, and the patient’s left and right sides.',
      what: 'Pupils can provide clues about neurologic status, drug or toxin effects, hypoxia, and head injury. Always name the patient’s left and patient’s right when findings differ.',
      range: 'App reference: PERRL — pupils equal, round, and reactive to light.',
      abnormal: [
        'Pinpoint pupils may occur with opioid effects or selected neurologic/toxicologic conditions.',
        'Dilated pupils may occur with stimulants, hypoxia, or other neurologic conditions.',
        'Unequal, sluggish, or nonreactive pupils may be a neurologic red flag and require context.'
      ],
      document: 'Patient-right pupil 6 mm and sluggish; patient-left pupil 3 mm and brisk.',
      mistake: 'Saying “right pupil” without clarifying whether it is the patient’s right or the provider’s right.',
      normalExample: ['PERRL', 'Equal, round pupils that react to light are a typical finding, but still compare with mental status and complaint.'],
      abnormalExample: ['Unequal or sluggish pupils', 'May indicate head injury, stroke, drug effect, or another neurologic problem.'],
      abnormalLabel: 'Not normal',
      quiz: ['Which documentation is most objective?', ['Right pupil bigger', 'Patient-right 6 mm sluggish; patient-left 3 mm brisk', 'Pupils abnormal'], 1, 'The second option identifies patient side, size, and reactivity.'],
      links: [['AVPU', '/vitals/avpu.html'], ['A&O×4', '/vitals/aao.html'], ['Stroke trainer', '/vitals/stroke.html']]
    },
    spo2: {
      title: 'Pulse Oximetry (SpO₂)',
      subtitle: 'Confirm signal quality and compare the number with the patient.',
      what: 'SpO₂ is a noninvasive estimate of oxygen saturation. It supports—but does not replace—assessment of respiratory rate, effort, lung sounds, skin signs, mental status, pulse quality, and overall appearance.',
      range: 'Typical healthy-adult reference used in the app: about 95–100%.',
      abnormal: [
        'The app treats 90–94% as a low range that requires evaluation and patient-context review.',
        'A reading below 90% is a significant oxygenation concern in the app scenarios.',
        'Cold fingers, movement, weak pulse, poor perfusion, nail coverings, dirt, or loose placement can produce an unreliable value.'
      ],
      document: 'SpO₂ 88% on room air, pulse 112; RR 30 labored, pale/diaphoretic; oxygen applied and reassessed.',
      mistake: 'Ignoring work of breathing because the SpO₂ value still looks acceptable.',
      normalExample: ['SpO₂ 97% on room air', 'Reassuring only when the waveform or signal is stable and the patient’s breathing and mental status also look appropriate.'],
      abnormalExample: ['SpO₂ 86% with cyanosis', 'A significant oxygenation concern. Treat the patient, verify the signal, and reassess per protocol.'],
      abnormalLabel: 'Not normal',
      quiz: ['Which SpO₂ reading is most urgent to address?', ['97%', '93%', '84%'], 2, 'The lowest value is the most urgent, especially when it matches a concerning patient presentation.'],
      links: [['Respiratory rate', '/vitals/respiratory-rate.html'], ['Breath sounds', '/vitals/breath-sound-simulator.html'], ['Full vitals set', '/vitals/full-vitals-set.html']]
    },
    bgl: {
      title: 'Blood Glucose (BGL)',
      subtitle: 'Interpret the number with mental status, symptoms, history, and ability to swallow.',
      what: 'The app prompts BGL checks for altered mental status, weakness, seizure, stroke-like symptoms, diabetic history, overdose, or unexplained behavior changes. A normal value does not end the assessment.',
      range: 'App practice bands: low <70 mg/dL; reference band 70–180; high 181–350; critical or concerning >350.',
      abnormal: [
        'Low glucose may cause confusion, weakness, diaphoresis, shakiness, combativeness, seizure, or unconsciousness.',
        'High glucose may be associated with thirst, frequent urination, dehydration, nausea, vomiting, deep or rapid breathing, weakness, or altered mental status.',
        'Never give anything by mouth when the patient cannot protect the airway or swallow safely.'
      ],
      document: 'BGL 48 mg/dL at 14:20; confused, pale, cool, diaphoretic; able to swallow; treated per protocol and reassessed.',
      mistake: 'Treating the number alone instead of comparing it with the patient’s mental status and whole presentation.',
      normalExample: ['BGL 104 mg/dL', 'The glucose may not explain altered mental status; continue evaluating stroke, overdose, hypoxia, infection, trauma, seizure, and other causes.'],
      abnormalExample: ['BGL 48 mg/dL with confusion and diaphoresis', 'Low glucose fits the presentation and requires rapid recognition and protocol-based care.'],
      abnormalLabel: 'Concerning',
      quiz: ['A patient has BGL 39 mg/dL and is unresponsive. What is the key safety point?', ['Give oral glucose immediately', 'Do not give anything by mouth; support ABCs and follow protocol', 'Ignore the reading'], 1, 'An unresponsive patient cannot safely protect the airway or swallow.'],
      links: [['Stroke trainer', '/vitals/stroke.html'], ['AVPU', '/vitals/avpu.html'], ['Full vitals set', '/vitals/full-vitals-set.html']]
    },
    avpu: {
      title: 'Level of Consciousness (AVPU)',
      subtitle: 'Use the least stimulus needed and describe what produced the response.',
      what: 'AVPU is a rapid level-of-consciousness check: Alert, responds to Verbal stimulus, responds to Painful stimulus, or Unresponsive.',
      range: 'Typical awake adult finding: Alert (A).',
      abnormal: [
        'V, P, or U may occur with hypoxia, shock, head injury, stroke, intoxication, overdose, seizure, sepsis, or hypoglycemia.',
        'A change from the patient’s baseline is important even when the patient still responds.',
        'AVPU is a rapid screen and does not replace a complete neurologic assessment.'
      ],
      document: 'AVPU: P — opens eyes and withdraws only after painful stimulus.',
      mistake: 'Calling a patient “alert” when the patient responds only after voice or physical stimulation.',
      normalExample: ['Alert', 'The patient responds normally without additional stimulation.'],
      abnormalExample: ['Responds to pain only', 'A decreased level of consciousness requiring investigation of oxygenation, perfusion, neurologic, metabolic, toxicologic, and trauma causes.'],
      abnormalLabel: 'Not normal',
      quiz: ['A patient opens the eyes only after a painful stimulus. AVPU is:', ['A', 'V', 'P', 'U'], 2, 'A response only after painful stimulus is P.'],
      links: [['A&O×4', '/vitals/aao.html'], ['Blood glucose', '/vitals/bgl.html'], ['Pupils', '/vitals/pupil.html']]
    },
    aao: {
      title: 'Orientation (A&O×4 / AAOx4)',
      subtitle: 'Identify exactly which orientation domains the patient knows.',
      what: 'A&O or AAOx describes orientation to person, place, time, and event. It communicates more than simply writing “alert” or “confused.”',
      range: 'AAOx4: oriented to person, place, time, and event.',
      abnormal: [
        'Confusion may occur with hypoxia, shock, stroke, head injury, sepsis, intoxication, overdose, seizure, or hypoglycemia.',
        'Baseline cognition and communication barriers must be considered.',
        'Document the specific domains the patient knows and misses.'
      ],
      document: 'AAOx2 to person and place; unable to identify date or events leading to EMS activation.',
      mistake: 'Writing “confused” without stating which orientation questions the patient missed.',
      normalExample: ['AAOx4', 'Oriented to person, place, time, and event.'],
      abnormalExample: ['AAOx2', 'The patient knows only two of the four domains; identify which two in the report.'],
      abnormalLabel: 'Not normal',
      quiz: ['The patient knows name and location but not the date or what happened. This is:', ['AAOx4', 'AAOx3', 'AAOx2', 'AAOx1'], 2, 'The patient is oriented to two domains: person and place.'],
      links: [['AVPU', '/vitals/avpu.html'], ['Pupils', '/vitals/pupil.html'], ['Blood glucose', '/vitals/bgl.html']]
    }
  };

  function esc(value) {
    return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function topicFromPath() {
    const page = location.pathname.split('/').pop() || '';
    const map = {
      'bp.html':'bp', 'pulse.html':'pulse', 'respiratory-rate.html':'respirations',
      'skin.html':'skin', 'pupil.html':'pupils', 'pulse-ox.html':'spo2',
      'bgl.html':'bgl', 'avpu.html':'avpu', 'aao.html':'aao'
    };
    return document.body.dataset.vitalTopic || map[page];
  }

  function buildPanel(topic) {
    const image = topic.image ? `<img src="${esc(topic.image)}" alt="${esc(topic.title)} visual guide" loading="lazy">` : '';
    const heroClass = topic.image ? 'avl-hero' : 'avl-hero no-image';
    const abnormal = topic.abnormal.map(x => `<li>${esc(x)}</li>`).join('');
    const choices = topic.quiz[1].map((x, i) => `<button class="avl-choice" type="button" data-choice="${i}">${esc(x)}</button>`).join('');
    const links = topic.links.map(([label, href]) => `<a href="${esc(href)}">${esc(label)} →</a>`).join('');
    return `
      <div class="app-vitals-learning-shell">
        <section class="app-vitals-learning" aria-labelledby="avl-title">
          <header class="avl-head">
            <div><p class="avl-kicker">EMSCodeSim app learning content</p><h2 id="avl-title">Learn ${esc(topic.title)}</h2><p>${esc(topic.subtitle)}</p></div>
            <span class="avl-badge">Learn → Practice → Document</span>
          </header>
          <div class="avl-body">
            <section class="${heroClass}"><div><span class="avl-label">What it means</span><h3>${esc(topic.title)}</h3><p>${esc(topic.what)}</p><div class="avl-range">Quick reference: ${esc(topic.range)}</div></div>${image}</section>
            <div class="avl-grid">
              <section class="avl-card"><span class="avl-label">Abnormal findings may suggest</span><h3>Connect the finding to the patient</h3><ul>${abnormal}</ul></section>
              <section class="avl-card"><span class="avl-label">What to document</span><h3>Use objective language</h3><div class="avl-document">${esc(topic.document)}</div></section>
            </div>
            <section class="avl-card avl-mistake"><span class="avl-label">Common student mistake</span><h3>Avoid this shortcut</h3><p>${esc(topic.mistake)}</p></section>
            <div class="avl-examples">
              <section class="avl-example normal"><strong>Normal example: ${esc(topic.normalExample[0])}</strong>${esc(topic.normalExample[1])}</section>
              <section class="avl-example abnormal"><strong>${esc(topic.abnormalLabel || 'Not normal')} example: ${esc(topic.abnormalExample[0])}</strong>${esc(topic.abnormalExample[1])}</section>
            </div>
            <section class="avl-quiz" data-answer="${topic.quiz[2]}"><h3>Quick knowledge check</h3><p>${esc(topic.quiz[0])}</p><div class="avl-choices">${choices}</div><div class="avl-feedback" role="status" aria-live="polite"></div></section>
            <section class="avl-related"><h3>Continue the assessment</h3><div class="avl-links">${links}<a href="/vitals/">Learn Vitals hub →</a></div></section>
            <p class="avl-disclaimer">Educational practice only. Typical ranges and training bands are copied from the uploaded EMSCodeSim Vitals & Assessment app. Follow approved course instruction, local protocols, device guidance, and medical direction.</p>
          </div>
        </section>
      </div>`;
  }

  function wireQuiz(panel, topic) {
    const quiz = panel.querySelector('.avl-quiz');
    const feedback = panel.querySelector('.avl-feedback');
    quiz.querySelectorAll('.avl-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        const picked = Number(btn.dataset.choice);
        const correct = topic.quiz[2];
        quiz.querySelectorAll('.avl-choice').forEach((choice, i) => {
          choice.disabled = true;
          if (i === correct) choice.classList.add('correct');
          else if (i === picked) choice.classList.add('incorrect');
        });
        feedback.textContent = `${picked === correct ? 'Correct. ' : 'Review this. '}${topic.quiz[3]}`;
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('[data-app-vitals-learning]')) return;
    const key = topicFromPath();
    const topic = topics[key];
    if (!topic) return;
    const holder = document.createElement('div');
    holder.dataset.appVitalsLearning = '';
    holder.innerHTML = buildPanel(topic);
    const scripts = [...document.body.children].filter(el => el.tagName === 'SCRIPT');
    const firstScript = scripts[0];
    if (firstScript) document.body.insertBefore(holder, firstScript);
    else document.body.appendChild(holder);
    wireQuiz(holder, topic);
  });
})();
