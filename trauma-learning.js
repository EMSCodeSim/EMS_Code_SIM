(function () {
  'use strict';

  const goals = {
    new: {
      title: 'Start with the trauma survey order',
      copy: 'Learn XABC priorities, then practice bleeding control and a full trauma scenario.',
      href: '#survey',
      cta: 'Jump to primary survey'
    },
    bleed: {
      title: 'Practice hemorrhage and shock thinking',
      copy: 'Review bleeding control, shock signs, and pelvic/femur considerations before opening a scenario.',
      href: '#hemorrhage',
      cta: 'Open hemorrhage section'
    },
    regions: {
      title: 'Review injury patterns by body region',
      copy: 'Chest, abdomen, musculoskeletal, burns, and packaging decisions are organized below.',
      href: '#regions',
      cta: 'Browse injury regions'
    },
    scenario: {
      title: 'Apply trauma care in a patient scenario',
      copy: 'Use the horse-crush immersive case or the blunt-trauma visual patient for full-call practice.',
      href: '/vitals/scenario-launcher.html',
      cta: 'Open scenario launcher'
    }
  };

  const cases = [
    {
      id: 'bleed',
      badge: 'Extremity trauma',
      stem: 'A motorcycle rider has bright spurting bleeding from a mid-thigh laceration. He is pale and anxious. Breathing is present.',
      vitals: ['HR 128', 'BP 88/54', 'RR 24', 'SpO₂ 96%'],
      prompt: 'What is the immediate priority?',
      choices: [
        { text: 'Full secondary survey before any treatment', correct: false, why: 'Life-threatening hemorrhage cannot wait for a complete secondary survey.' },
        { text: 'Direct pressure / tourniquet for massive extremity bleeding, then continue the survey', correct: true, why: 'Exsanguinating extremity bleeding is controlled immediately—often before or while completing A and B.' },
        { text: 'Long-board packaging first', correct: false, why: 'Packaging does not stop arterial bleeding and delays hemorrhage control.' },
        { text: 'Oral glucose for anxiety', correct: false, why: 'Anxiety here is a perfusion warning, not a glucose problem.' }
      ]
    },
    {
      id: 'chest',
      badge: 'Chest trauma',
      stem: 'A restrained driver has chest pain after a frontal collision. Breath sounds are diminished on the left, SpO₂ is falling, and neck veins appear distended.',
      vitals: ['HR 126', 'BP 92/68', 'RR 30', 'SpO₂ 88%'],
      prompt: 'Which concern should drive your next actions?',
      choices: [
        { text: 'Possible serious chest injury with respiratory compromise—support breathing and rapid trauma transport', correct: true, why: 'Unilateral breath sounds with hypoxia after blunt trauma raise concern for pneumothorax or other critical chest injury.' },
        { text: 'Isolated anxiety; no oxygen needed', correct: false, why: 'Falling SpO₂ and respiratory distress are not anxiety alone.' },
        { text: 'Delay transport for a complete SAMPLE only', correct: false, why: 'History helps, but life threats and transport priority come first.' },
        { text: 'Walk the patient to the ambulance for exercise', correct: false, why: 'This patient needs careful handling and respiratory support, not exertion.' }
      ]
    },
    {
      id: 'burn',
      badge: 'Burns',
      stem: 'A patient from a house fire has facial burns, singed nasal hairs, and a hoarse voice. Extremity burns are partial-thickness.',
      vitals: ['HR 110', 'BP 128/78', 'RR 22', 'SpO₂ 93%'],
      prompt: 'What is the highest-priority concern?',
      choices: [
        { text: 'Airway swelling from inhalation injury', correct: true, why: 'Facial burns, soot/singed hairs, and voice change warn that the airway may worsen rapidly.' },
        { text: 'Cosmetic appearance of extremity burns', correct: false, why: 'Airway threat outranks cosmetic burn concerns.' },
        { text: 'Immediate ice immersion of the face', correct: false, why: 'Aggressive cooling can worsen injury; prioritize airway and protocol burn care.' },
        { text: 'No monitoring is needed if the patient can talk', correct: false, why: 'Talking now does not guarantee a stable airway later.' }
      ]
    }
  ];

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  document.addEventListener('DOMContentLoaded', () => {
    const result = document.getElementById('goalResult');
    document.querySelectorAll('[data-trauma-goal]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-trauma-goal]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const goal = goals[btn.getAttribute('data-trauma-goal')];
        if (!goal || !result) return;
        result.innerHTML = `<h3>${esc(goal.title)}</h3><p>${esc(goal.copy)}</p><div class="trauma-actions"><a class="trauma-btn accent" href="${goal.href}">${esc(goal.cta)} →</a></div>`;
      });
    });

    const lab = document.getElementById('priorityLab');
    if (!lab) return;
    let caseIndex = 0;

    function renderCase() {
      const item = cases[caseIndex];
      lab.innerHTML = `
        <article class="case-card">
          <span class="case-badge">${esc(item.badge)} · Case ${caseIndex + 1} of ${cases.length}</span>
          <h3 style="margin:12px 0 8px">Find the immediate priority</h3>
          <p>${esc(item.stem)}</p>
          <div class="case-vitals">${item.vitals.map(v => `<span>${esc(v)}</span>`).join('')}</div>
          <p><strong>${esc(item.prompt)}</strong></p>
          <div class="answer-grid" id="answerGrid"></div>
          <p class="case-feedback" id="caseFeedback" hidden></p>
          <div class="trauma-actions">
            <button class="trauma-btn ghost" type="button" id="nextCase">Next case</button>
            <a class="trauma-btn accent" href="/vitals/scenario-launcher.html">Open trauma scenarios</a>
          </div>
        </article>
        <aside class="case-result">
          <h3>How to think it through</h3>
          <ol>
            <li>Scene and obvious life threats first</li>
            <li>Stop major bleeding when it will kill the patient quickly</li>
            <li>Airway and breathing adequacy next</li>
            <li>Perfusion, disability, and exposure</li>
            <li>Package and transport with serial reassessment</li>
          </ol>
          <p>Use this order as a habit, then adapt to the findings in front of you and your local protocol.</p>
        </aside>`;

      const grid = document.getElementById('answerGrid');
      const feedback = document.getElementById('caseFeedback');
      item.choices.forEach(choice => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = choice.text;
        button.addEventListener('click', () => {
          grid.querySelectorAll('button').forEach(b => { b.disabled = true; b.classList.remove('correct', 'wrong'); });
          button.classList.add(choice.correct ? 'correct' : 'wrong');
          if (!choice.correct) {
            const right = item.choices.find(c => c.correct);
            [...grid.children].forEach((b, i) => { if (item.choices[i].correct) b.classList.add('correct'); });
          }
          feedback.hidden = false;
          feedback.textContent = choice.why;
        });
        grid.appendChild(button);
      });

      document.getElementById('nextCase')?.addEventListener('click', () => {
        caseIndex = (caseIndex + 1) % cases.length;
        renderCase();
      });
    }

    renderCase();

    document.getElementById('mobileMenu')?.addEventListener('change', e => {
      if (e.target.value) location.href = e.target.value;
    });
  });
})();
