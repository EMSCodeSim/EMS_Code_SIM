(function () {
  'use strict';

  const goals = {
    rights: {
      title: 'Start with the five rights',
      copy: 'Build a repeatable safety check before you memorize individual drug facts.',
      href: '#rights',
      cta: 'Jump to five rights'
    },
    drugs: {
      title: 'Review common EMT medications',
      copy: 'Aspirin, nitroglycerin, epinephrine, naloxone, oral glucose, and inhaled bronchodilators are covered below.',
      href: '#meds',
      cta: 'Browse EMT medications'
    },
    decide: {
      title: 'Practice indication decisions',
      copy: 'Work short cases that ask whether a medication is appropriate right now.',
      href: '#decision-lab',
      cta: 'Open decision lab'
    },
    trainer: {
      title: 'Practice the five rights simulator',
      copy: 'Use the medication administration trainer for scenario-based rights checks with feedback.',
      href: '/vitals/meds.html',
      cta: 'Open meds trainer'
    }
  };

  const cases = [
    {
      badge: 'Chest pain',
      stem: 'A 58-year-old has pressure-like chest pain. He is alert, SpO₂ 97% on room air, BP 142/88, no aspirin allergy, and no recent bleeding history. Local protocol allows EMT aspirin.',
      vitals: ['Pain 7/10', 'HR 96', 'BP 142/88', 'SpO₂ 97%'],
      prompt: 'What is the best medication decision?',
      choices: [
        { text: 'Give aspirin per protocol after confirming rights and no contraindications', correct: true, why: 'Suspected ACS with no aspirin contraindication is a classic EMT aspirin indication when authorized.' },
        { text: 'Give nitroglycerin first without checking blood pressure or ED medication history', correct: false, why: 'Nitro requires BP and PDE-5 inhibitor screening; it is not an automatic first step.' },
        { text: 'Withhold all care because SpO₂ is normal', correct: false, why: 'Normal SpO₂ does not rule out ACS or remove indicated medications.' },
        { text: 'Give oral glucose for chest pressure', correct: false, why: 'Glucose treats hypoglycemia, not cardiac chest pain.' }
      ]
    },
    {
      badge: 'Anaphylaxis',
      stem: 'A patient ate a known allergen and now has hives, wheezing, and a BP of 82/50. An epinephrine auto-injector is available and authorized.',
      vitals: ['HR 128', 'BP 82/50', 'RR 28', 'SpO₂ 91%'],
      prompt: 'What should you do?',
      choices: [
        { text: 'Administer epinephrine and support airway/breathing while arranging transport', correct: true, why: 'Anaphylaxis with respiratory and circulatory involvement is treated with epinephrine first when authorized.' },
        { text: 'Give only an oral antihistamine and wait at home', correct: false, why: 'Antihistamines do not reverse airway or shock physiology in anaphylaxis.' },
        { text: 'Withhold epinephrine because the patient can still speak', correct: false, why: 'Speaking does not mean the patient is safe; hypotension and wheezing are hard indications.' },
        { text: 'Give nitroglycerin for low blood pressure', correct: false, why: 'Nitroglycerin lowers BP further and is not an anaphylaxis treatment.' }
      ]
    },
    {
      badge: 'Altered mental status',
      stem: 'A diabetic patient is confused and diaphoretic. Glucose is 44 mg/dL. The patient can follow simple commands and swallow. Protocol allows oral glucose.',
      vitals: ['Glucose 44', 'HR 110', 'BP 126/74', 'SpO₂ 98%'],
      prompt: 'Is oral glucose appropriate?',
      choices: [
        { text: 'Yes—give oral glucose because the airway is protected and the patient can swallow', correct: true, why: 'Symptomatic hypoglycemia with intact swallowing is treated with oral glucose when authorized.' },
        { text: 'No—oral glucose is only for unconscious patients', correct: false, why: 'Unconscious patients usually cannot safely take oral glucose; this patient can.' },
        { text: 'Give naloxone instead', correct: false, why: 'Naloxone reverses opioids, not low blood sugar.' },
        { text: 'Give aspirin for confusion', correct: false, why: 'Aspirin is not a hypoglycemia treatment.' }
      ]
    },
    {
      badge: 'Possible opioid OD',
      stem: 'A patient is unresponsive with pinpoint pupils and slow, shallow breathing after suspected opioid use. Bag-valve ventilation has been started.',
      vitals: ['RR 6', 'SpO₂ 84%', 'HR 58', 'GCS low'],
      prompt: 'What medication decision fits best?',
      choices: [
        { text: 'Continue airway/ventilation support and give naloxone per protocol', correct: true, why: 'Support breathing first, then reverse opioid effects with naloxone when indicated and authorized.' },
        { text: 'Give oral glucose before supporting the airway', correct: false, why: 'Inadequate breathing is the immediate threat; do not delay ventilation.' },
        { text: 'Give epinephrine auto-injector for all overdoses', correct: false, why: 'Epinephrine is not the first-line opioid overdose medication.' },
        { text: 'No medication is ever indicated if family is present', correct: false, why: 'Family presence does not change clinical indications.' }
      ]
    }
  ];

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  document.addEventListener('DOMContentLoaded', () => {
    const result = document.getElementById('goalResult');
    document.querySelectorAll('[data-med-goal]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-med-goal]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const goal = goals[btn.getAttribute('data-med-goal')];
        if (!goal || !result) return;
        result.innerHTML = `<h3>${esc(goal.title)}</h3><p>${esc(goal.copy)}</p><div class="med-actions"><a class="med-btn accent" href="${goal.href}">${esc(goal.cta)} →</a></div>`;
      });
    });

    const lab = document.getElementById('decisionLab');
    if (!lab) return;
    let caseIndex = 0;

    function renderCase() {
      const item = cases[caseIndex];
      lab.innerHTML = `
        <article class="case-card">
          <span class="case-badge">${esc(item.badge)} · Case ${caseIndex + 1} of ${cases.length}</span>
          <h3 style="margin:12px 0 8px">Is a medication indicated?</h3>
          <p>${esc(item.stem)}</p>
          <div class="case-vitals">${item.vitals.map(v => `<span>${esc(v)}</span>`).join('')}</div>
          <p><strong>${esc(item.prompt)}</strong></p>
          <div class="answer-grid" id="answerGrid"></div>
          <p class="case-feedback" id="caseFeedback" hidden></p>
          <div class="med-actions">
            <button class="med-btn ghost" type="button" id="nextCase">Next case</button>
            <a class="med-btn accent" href="/vitals/meds.html">Open 5-rights trainer</a>
          </div>
        </article>
        <aside class="case-result">
          <h3>Decision checklist</h3>
          <ol>
            <li>What is the immediate life threat?</li>
            <li>Is this medication indicated for the findings?</li>
            <li>Are there contraindications?</li>
            <li>Do I have authorization / protocol?</li>
            <li>Can I complete the five rights and reassess?</li>
          </ol>
          <p>Medications support priorities—they never replace airway, breathing, and circulation care.</p>
        </aside>`;

      const grid = document.getElementById('answerGrid');
      const feedback = document.getElementById('caseFeedback');
      item.choices.forEach((choice, idx) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = choice.text;
        button.addEventListener('click', () => {
          grid.querySelectorAll('button').forEach(b => { b.disabled = true; b.classList.remove('correct', 'wrong'); });
          button.classList.add(choice.correct ? 'correct' : 'wrong');
          if (!choice.correct) {
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
