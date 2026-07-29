(() => {
  'use strict';

  const scenarios = [
    {
      title: 'Alert patient with ankle injury', age: '34-year-old', complaint: 'Ankle injury', context: 'Patient is seated, alert, and answers questions in complete sentences without distress.',
      finding: 'Clear voice with unobstructed airflow', detail: 'No visible material, swelling, secretions, or abnormal upper-airway sounds.', normality: 'normal', problem: 'patent', action: 'monitor',
      docs: 'Patient alert and speaking in full sentences with clear voice. No visible airway obstruction, secretions, swelling, or abnormal upper-airway sounds. Airway patent at time of assessment.'
    },
    {
      title: 'Unresponsive patient after suspected overdose', age: '26-year-old', complaint: 'Altered mental status', context: 'Patient is supine and responds only to painful stimulation. Respiratory effort is present.',
      finding: 'Loud snoring with reduced air movement', detail: 'No visible vomit or blood. No trauma is apparent from the initial assessment.', normality: 'abnormal', problem: 'soft-tissue', action: 'position',
      docs: 'Patient responsive to pain with snoring respirations and reduced air movement, consistent with soft-tissue airway obstruction. Airway opened with head-tilt/chin-lift; air movement improved on reassessment.'
    },
    {
      title: 'Post-seizure patient', age: '41-year-old', complaint: 'Seizure', context: 'Generalized seizure activity has stopped. The patient remains unresponsive with spontaneous respirations.',
      finding: 'Gurgling respirations with oral secretions', detail: 'Foamy secretions are visible in the mouth and interfere with airflow.', normality: 'abnormal', problem: 'fluid', action: 'suction',
      docs: 'Patient unresponsive following seizure with gurgling respirations and visible oral secretions. Airway positioned, oral cavity cleared and suctioned; gurgling decreased and air movement improved.'
    },
    {
      title: 'Allergic reaction', age: '19-year-old', complaint: 'Difficulty breathing', context: 'Symptoms began shortly after eating. Patient is anxious and has facial swelling.',
      finding: 'Inspiratory stridor with hoarse voice', detail: 'Visible lip swelling is present. The patient can speak only a few words at a time.', normality: 'abnormal', problem: 'upper-narrowing', action: 'rapid',
      docs: 'Patient with facial/lip swelling, hoarse voice, and inspiratory stridor, indicating upper-airway compromise. Airway continuously monitored, oxygen provided as indicated, and rapid transport/ALS support initiated per protocol.'
    },
    {
      title: 'Severe foreign-body obstruction', age: '58-year-old', complaint: 'Choking', context: 'Patient suddenly stood from a restaurant table and is clutching the throat.',
      finding: 'Unable to speak or cough; no effective air movement', detail: 'Patient is conscious, cyanotic around the lips, and rapidly becoming weak.', normality: 'abnormal', problem: 'complete', action: 'support',
      docs: 'Conscious patient with severe foreign-body airway obstruction: unable to speak or cough and without effective air movement. Immediate obstruction-relief maneuvers initiated according to training and protocol.'
    },
    {
      title: 'Facial trauma', age: '32-year-old', complaint: 'Motor vehicle collision', context: 'Patient has facial injuries and responds to verbal stimuli. Spinal injury is suspected.',
      finding: 'Blood in the mouth with gurgling airflow', detail: 'Airway contamination is visible; the patient cannot clear it effectively.', normality: 'abnormal', problem: 'fluid', action: 'suction',
      docs: 'Patient responsive to verbal stimuli with facial trauma, blood in the oral cavity, and gurgling airflow. Manual spinal precautions maintained while airway was opened, cleared, and suctioned; airflow improved on reassessment.'
    }
  ];

  const state = { current: null, revealed: false, complete: JSON.parse(localStorage.getItem('emsAirwayLessons') || '{}') };
  const $ = (id) => document.getElementById(id);

  function selectScenario() {
    let next = window.EMSCodeSimScenarioRuntime?.chooseCase('airway', scenarios, state.current) || scenarios[0];
    state.current = next; state.revealed = false;
    $('scenarioTitle').textContent = next.title;
    $('patientMeta').innerHTML = `<span>${next.age}</span><span>${next.complaint}</span>`;
    $('scenarioText').textContent = next.context;
    $('findingText').textContent = '';
    $('findingDetail').textContent = '';
    $('findingBox').hidden = true;
    $('resultsPanel').hidden = true;
    $('airwayForm').reset();
  }

  function updateProgress() {
    const count = ['how','why','practice'].filter(k => state.complete[k]).length;
    $('progressText').textContent = `${count} of 3 lessons complete`;
    $('progressBar').style.width = `${(count / 3) * 100}%`;
    document.querySelectorAll('[data-complete]').forEach(btn => {
      const done = !!state.complete[btn.dataset.complete];
      btn.classList.toggle('is-complete', done);
      btn.textContent = done ? '✓ Lesson complete' : `Mark ${btn.dataset.complete.toUpperCase()} complete`;
    });
  }

  document.querySelectorAll('.lesson-tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.lesson-tab').forEach(t => t.classList.toggle('is-active', t === tab));
    document.querySelectorAll('.lesson-panel').forEach(panel => {
      const show = panel.id === tab.dataset.panel;
      panel.hidden = !show; panel.classList.toggle('is-active', show);
    });
  }));

  document.querySelectorAll('[data-complete]').forEach(btn => btn.addEventListener('click', () => {
    state.complete[btn.dataset.complete] = true;
    localStorage.setItem('emsAirwayLessons', JSON.stringify(state.complete));
    updateProgress();
  }));

  $('checkWhy').addEventListener('click', () => {
    const answer = document.querySelector('input[name="whyCheck"]:checked');
    const feedback = $('whyFeedback');
    if (!answer) { feedback.textContent = 'Choose an answer first.'; feedback.className = 'feedback bad'; return; }
    const correct = answer.value === 'open';
    feedback.textContent = correct ? 'Correct. Open/reposition the airway first, then reassess airflow and breathing.' : 'Not quite. Correct the likely soft-tissue obstruction by opening the airway, then reassess before moving on.';
    feedback.className = `feedback ${correct ? 'good' : 'bad'}`;
  });

  $('newScenario').addEventListener('click', selectScenario);
  $('assessAirway').addEventListener('click', () => {
    state.revealed = true;
    $('findingText').textContent = state.current.finding;
    $('findingDetail').textContent = state.current.detail;
    $('findingBox').hidden = false;
    $('findingBox').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  $('airwayForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const feedback = [];
    if (!state.revealed) { alert('Perform the airway assessment before grading the case.'); return; }
    const normality = document.querySelector('input[name="normality"]:checked')?.value || '';
    const problem = $('problemSelect').value;
    const action = $('actionSelect').value;
    const pcr = $('pcrText').value.trim();
    let score = 0;

    if (normality === state.current.normality) { score++; feedback.push('Correctly classified the finding as normal or not normal.'); }
    else feedback.push(`Classification needs review: this finding is ${state.current.normality === 'normal' ? 'normal' : 'not normal'}.`);

    if (problem === state.current.problem) { score++; feedback.push('Correctly identified the airway condition.'); }
    else feedback.push('Reconsider what the sound, speech, visible material, and air movement indicate.');

    if (action === state.current.action) { score++; feedback.push('Selected the best immediate EMT action for this case.'); }
    else feedback.push('The next action should address the airway threat before lower-priority assessment steps.');

    const objectiveTerms = ['patient','airway','voice','speak','speech','snoring','gurgling','stridor','blood','secretions','air movement','suction','reassess','obstruction'];
    const termHits = objectiveTerms.filter(term => pcr.toLowerCase().includes(term)).length;
    if (pcr.length >= 55 && termHits >= 2) { score++; feedback.push('Documentation is sufficiently objective and specific.'); }
    else feedback.push('Documentation should name the observed finding, action taken, and reassessment response.');

    $('scoreValue').textContent = score;
    $('resultTitle').textContent = score === 4 ? 'Strong airway assessment' : score >= 2 ? 'Good start—review the coaching points' : 'Repeat the case and prioritize the airway threat';
    $('feedbackList').innerHTML = feedback.map(item => `<li>${item}</li>`).join('');
    $('modelDocumentation').textContent = state.current.docs;
    
    window.EMSCodeSimAssessmentIntegration?.saveAssessment({
      assessment: 'airway',
      label: 'Airway Assessment',
      scenarioTitle: state.current.title || '',
      finding: state.current.finding || '',
      details: state.current.detail || state.current.description || '',
      normality,
      expectedNormality: state.current.normality,
      interpretation: typeof problem !== 'undefined' ? problem : '',
      action: typeof action !== 'undefined' ? action : '',
      documentation: pcr,
      score,
      maxScore: 4
    });
$('resultsPanel').hidden = false;
    $('resultsPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  selectScenario();
  updateProgress();
})();
