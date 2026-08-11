(() => {
  'use strict';

  const CASES = {
    horse_crush: {
      image: '/vitals/assets/horse-crush/patient-initial.webp',
      label: 'Trauma reasoning',
      focus: 'Assess before movement. Protect the painful position. Reassess after every meaningful change.',
      checkpoints: [
        {
          id: 'pre_move',
          title: 'Before you move this patient',
          prompt: 'Which information matters most before committing to a movement plan?',
          needs: 'Discover the painful area, leg findings, and distal neurovascular status.',
          unlocked: r => hasAll(r, ['left_leg', 'distal_csm']) && (has(r, 'pelvis_hip') || has(r, 'trauma_assessment')),
          options: [
            ['focused_exam', 'Focused trauma exam + distal CSM before movement', true, 'This creates a baseline, identifies injuries that change packaging, and gives you something to compare after movement.'],
            ['move_first', 'Move to the stretcher first, then finish the exam', false, 'Moving first can worsen pain or an occult injury and removes your pre-movement neurovascular baseline.'],
            ['traction_first', 'Apply traction before completing the exam', false, 'Traction is not chosen from hip pain alone. The exam should establish the injury pattern before a splinting decision.']
          ]
        },
        {
          id: 'position',
          title: 'The leg will not straighten',
          prompt: 'What is the best initial movement strategy?',
          needs: 'Discover what worsens the pain and how the leg is currently tolerated.',
          unlocked: r => has(r, 'left_leg') && (has(r, 'pain') || recordText(r).match(/straighten|lower the leg|position of comfort/i)),
          options: [
            ['comfort', 'Support the leg in its position of comfort and plan a coordinated lift', true, 'The scenario supports protected movement with the leg flexed. Do not force an injured extremity into a textbook transport position.'],
            ['straighten', 'Slowly force the leg straight before packaging', false, 'Severe movement-provoked hip pain is a reason to minimize manipulation, not force the extremity straight.'],
            ['stand', 'Try a stand-and-pivot transfer', false, 'The patient cannot safely bear weight and has severe hip pain. A coordinated non-weight-bearing movement is safer.']
          ]
        },
        {
          id: 'recheck',
          title: 'After stabilization or movement',
          prompt: 'What proves that your plan did not create a new problem?',
          needs: 'Perform a treatment or movement step first.',
          unlocked: r => treatmentCount(r) > 0 || reassessmentCount(r) > 0,
          options: [
            ['serial', 'Repeat distal CSM, pain, and key vital signs', true, 'Serial reassessment connects your intervention to patient response and catches a new neurovascular or perfusion problem early.'],
            ['pain_only', 'Ask only whether the pain is better', false, 'Pain matters, but reassessment also needs objective neurovascular and physiologic findings.'],
            ['none', 'No reassessment is needed if the first exam was normal', false, 'Movement and treatment can change the patient. A normal baseline is useful only if you compare it with a later exam.']
          ]
        }
      ]
    },
    asthma: {
      image: '/vitals/assets/scenario-asthma-learning.svg',
      label: 'Respiratory reasoning',
      focus: 'Decide how sick the patient is, treat the physiology you discovered, then prove the response.',
      checkpoints: [
        {
          id: 'severity',
          title: 'How sick is this patient?',
          prompt: 'Which finding combination should drive your urgency?',
          needs: 'Obtain breathing quality, respiratory rate, and SpO₂.',
          unlocked: r => hasAll(r, ['breathing', 'respirations', 'spo2']),
          options: [
            ['work', 'Work of breathing + ability to speak + oxygenation trend', true, 'Respiratory severity is a pattern, not a single number. Speech, air movement, respiratory effort, and oxygenation together define risk.'],
            ['spo2_only', 'SpO₂ alone', false, 'Pulse oximetry is important but can lag behind deterioration and does not describe air movement or fatigue.'],
            ['wheeze_only', 'How loud the wheeze sounds', false, 'A quieter wheeze can mean improvement—or dangerously reduced air movement. Interpret it with the rest of the exam.']
          ]
        },
        {
          id: 'treatment',
          title: 'Choose care from discovered evidence',
          prompt: 'What is the best next strategy for this presentation?',
          needs: 'Discover breath sounds and the patient’s medication/trigger history.',
          unlocked: r => has(r, 'breath_sounds') && (has(r, 'sample') || /albuterol|inhaler|dust|asthma/i.test(recordText(r))),
          options: [
            ['bronchodilator', 'Position, protocol-directed bronchodilator care, oxygen as indicated, then reassess', true, 'This addresses bronchospasm while supporting oxygenation and preserving a clear reassessment target.'],
            ['oxygen_only', 'Oxygen only and wait for the wheeze to resolve', false, 'Oxygen may treat hypoxemia but does not directly reverse bronchospasm.'],
            ['lay_flat', 'Lay the patient flat to reduce energy use', false, 'Patients in respiratory distress often tolerate an upright position better. Forcing a flat position can worsen dyspnea.']
          ]
        },
        {
          id: 'response',
          title: 'Is the patient actually improving?',
          prompt: 'What reassessment best separates improvement from fatigue?',
          needs: 'Perform a respiratory treatment first.',
          unlocked: r => hasTreatment(r, ['bronchodilator', 'oxygen', 'position_comfort', 'bvm']),
          options: [
            ['trend', 'Recheck speech, work of breathing, air movement, RR, SpO₂, and mental status', true, 'Real improvement is a trend across patient appearance, ventilation, oxygenation, and mental status.'],
            ['wheeze', 'If wheezing is quieter, assume treatment worked', false, 'A quiet chest with worsening effort or mental status is a dangerous sign, not reassurance.'],
            ['one_vital', 'Repeat only SpO₂', false, 'One number cannot distinguish improved ventilation from respiratory fatigue.']
          ]
        }
      ]
    },
    stroke: {
      image: '/vitals/assets/scenario-stroke-learning.svg',
      label: 'Neurologic reasoning',
      focus: 'Protect time: establish onset, exclude a reversible mimic, document deficits, and move toward definitive stroke care.',
      checkpoints: [
        {
          id: 'time',
          title: 'The clock starts with history',
          prompt: 'Which time matters most for hospital stroke decisions?',
          needs: 'Ask the patient/family about onset and when the patient was last normal.',
          unlocked: r => has(r, 'sample') || /last known well|last normal|09:10|9:10/i.test(recordText(r)),
          options: [
            ['lkw', 'Last known well / last known normal time', true, 'Last-known-well anchors time-sensitive stroke pathways and should travel with the patient to the receiving team.'],
            ['dispatch', 'The time the 911 call was placed', false, 'Dispatch time is operationally useful but does not establish when the neurologic event began.'],
            ['arrival', 'The time EMS arrived on scene', false, 'Arrival time does not replace the clinical onset or last-known-well history.']
          ]
        },
        {
          id: 'mimic',
          title: 'Do not miss a reversible mimic',
          prompt: 'Which mini-sim should be prioritized early in this neurologic presentation?',
          needs: 'Complete mental-status or neurologic assessment first.',
          unlocked: r => has(r, 'mental_status') || has(r, 'motor_sensory'),
          options: [
            ['glucose', 'Blood glucose', true, 'Hypoglycemia can mimic focal neurologic disease and is rapidly testable in the field.'],
            ['temperature', 'Temperature before glucose', false, 'Temperature can matter, but glucose is the high-yield reversible mimic check in acute focal neurologic symptoms.'],
            ['pain', 'Pain scale before glucose', false, 'Pain assessment does not rule out a reversible cause of the focal deficits.']
          ]
        },
        {
          id: 'destination',
          title: 'Scene work versus definitive care',
          prompt: 'Once stroke findings and timing are established, what should dominate the plan?',
          needs: 'Document neurologic findings and obtain glucose.',
          unlocked: r => has(r, 'blood_glucose') && (has(r, 'motor_sensory') || has(r, 'mental_status')),
          options: [
            ['rapid', 'Rapid stroke-system transport with early notification and timing report', true, 'The field goal is recognition, mimic screening, supportive care, and efficient access to definitive stroke evaluation.'],
            ['complete_everything', 'Stay on scene until every optional assessment is complete', false, 'Low-value scene tasks should not delay definitive stroke care once immediate threats and key data are addressed.'],
            ['bp_treat', 'Normalize the blood pressure before transport', false, 'Prehospital blood-pressure management in suspected stroke is protocol-specific; do not delay transport chasing a normal number.']
          ]
        }
      ]
    },
    hypoglycemia: {
      image: '/vitals/assets/scenario-hypoglycemia-learning.svg',
      label: 'Altered mental status reasoning',
      focus: 'Find reversible causes early, match treatment to airway/swallow safety, and prove recovery with reassessment.',
      checkpoints: [
        {
          id: 'cause',
          title: 'Altered mental status: find reversibles',
          prompt: 'Which finding can immediately change both diagnosis and treatment?',
          needs: 'Assess mental status, then use a mini-sim to check a reversible cause.',
          unlocked: r => has(r, 'mental_status'),
          options: [
            ['glucose', 'Blood glucose', true, 'A rapid glucose check can reveal a common, reversible cause of altered mental status and directly changes treatment.'],
            ['temperature', 'Temperature alone', false, 'Temperature may add context but is less likely to provide an immediate field reversal in this presentation.'],
            ['pain', 'Pain score', false, 'Pain assessment does not address the high-priority reversible cause suggested by this presentation.']
          ]
        },
        {
          id: 'route',
          title: 'The glucose is low—can the patient swallow?',
          prompt: 'What determines whether oral glucose is an appropriate route?',
          needs: 'Discover glucose, airway status, and mental status.',
          unlocked: r => hasAll(r, ['blood_glucose', 'airway', 'mental_status']),
          options: [
            ['swallow', 'Ability to follow commands, protect the airway, and swallow safely', true, 'The route must match airway safety. If swallowing is unsafe, use locally authorized non-oral treatment and transport/ALS support.'],
            ['number', 'The glucose number alone', false, 'A low number establishes the problem but does not prove that oral administration is safe.'],
            ['age', 'Patient age', false, 'Age does not replace an airway and swallowing assessment when choosing an oral route.']
          ]
        },
        {
          id: 'proof',
          title: 'Treatment is not the endpoint',
          prompt: 'What demonstrates meaningful response to therapy?',
          needs: 'Treat the hypoglycemia first.',
          unlocked: r => hasTreatment(r, ['oral_glucose', 'airway_support', 'rapid_transport']) || treatmentCount(r) > 0,
          options: [
            ['repeat', 'Repeat glucose plus mental status and airway reassessment', true, 'A rising glucose with improving mentation—and maintained airway safety—shows whether treatment is working.'],
            ['awake', 'If the patient opens their eyes, treatment is complete', false, 'Improvement should be documented objectively and followed for recurrence or incomplete recovery.'],
            ['single', 'Repeat glucose only', false, 'The number matters, but clinical recovery and airway safety matter too.']
          ]
        }
      ]
    }
  };

  const $ = id => document.getElementById(id);
  const activeCase = () => new URLSearchParams(location.search).get('case') || window.EMSCodeSimPatientRecord?.active?.()?.scenarioId || '';
  const record = () => window.EMSCodeSimScenarioSession?.active?.(activeCase()) || window.EMSCodeSimPatientRecord?.active?.() || {};
  const trainingMode = () => new URLSearchParams(location.search).get('training') || record()?.documentation?.trainingMode || 'learning';
  const has = (r, key) => Boolean(r?.findings?.[key]);
  const hasAll = (r, keys) => keys.every(key => has(r, key));
  const treatmentCount = r => Array.isArray(r?.treatments) ? r.treatments.length : 0;
  const reassessmentCount = r => Array.isArray(r?.reassessments) ? r.reassessments.length : 0;
  const recordText = r => {
    try { return JSON.stringify({ findings:r?.findings||{}, history:r?.history||{}, careLog:r?.careLog||[], treatments:r?.treatments||[] }); }
    catch { return ''; }
  };
  const hasTreatment = (r, ids) => {
    const text = recordText({ treatments:r?.treatments||[], careLog:(r?.careLog||[]).filter(item => item?.type === 'treatment' || item?.category === 'treatment') }).toLowerCase();
    return ids.some(id => text.includes(String(id).toLowerCase().replace(/_/g, ' ')) || text.includes(String(id).toLowerCase()));
  };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));

  function injectStyles() {
    if (document.querySelector('link[data-learning-reasoning-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/vitals/scenario-learning-upgrade.css?v=2401';
    link.dataset.learningReasoningStyle = '1';
    document.head.appendChild(link);
  }

  function setScenarioArtwork(config) {
    const caseId = activeCase();
    if (caseId === 'horse_crush') return;
    const patientImage = $('patientImage');
    const focusImage = $('focusImage');
    const shouldReplace = img => img && (!img.src || /scenario-patient-adult-v3|scenario-patient-pediatric-v3/.test(img.src));
    if (shouldReplace(patientImage)) {
      patientImage.src = config.image;
      patientImage.alt = `${caseId.replace(/_/g, ' ')} EMS training patient illustration`;
    }
    if (shouldReplace(focusImage)) focusImage.src = config.image;
  }

  function saveDecision(checkpoint, option) {
    const caseId = activeCase();
    const key = `decision_${checkpoint.id}`;
    const value = option[1];
    const meta = {
      label: `Clinical decision: ${checkpoint.title}`,
      source: 'scenario-learning-upgrade',
      normality: option[2] ? 'normal' : 'not-normal',
      status: option[2] ? 'normal' : 'abnormal',
      decisionClass: option[2] ? 'appropriate' : 'needs-review',
      selected: option[0],
      details: option[3]
    };
    return window.EMSCodeSimScenarioSession?.saveFinding?.(key, value, meta, caseId)
      || window.EMSCodeSimPatientRecord?.setFinding?.(key, value, meta);
  }

  function currentChoice(r, checkpoint) {
    const finding = r?.findings?.[`decision_${checkpoint.id}`];
    if (!finding) return null;
    const selected = finding.selected || finding?.meta?.selected || '';
    return checkpoint.options.find(option => option[0] === selected) || checkpoint.options.find(option => option[1] === finding.value) || null;
  }

  function boardMarkup(config, r) {
    const mode = trainingMode();
    const complete = config.checkpoints.filter(item => currentChoice(r, item)).length;
    return `
      <header class="reasoning-board-head">
        <div><small>CLINICAL REASONING</small><strong>${escapeHtml(config.label)}</strong></div>
        <span>${complete}/${config.checkpoints.length}</span>
      </header>
      <p class="reasoning-board-focus">${escapeHtml(config.focus)}</p>
      <div class="reasoning-checkpoints">
        ${config.checkpoints.map((checkpoint, index) => {
          const unlocked = checkpoint.unlocked(r);
          const chosen = currentChoice(r, checkpoint);
          const correct = Boolean(chosen?.[2]);
          const state = chosen ? (correct ? 'complete' : 'review') : unlocked ? 'ready' : 'locked';
          return `<article class="reasoning-card ${state}" data-reasoning-card="${escapeHtml(checkpoint.id)}">
            <div class="reasoning-card-top"><span>${index + 1}</span><div><small>${chosen ? (correct ? 'DECISION RECORDED' : 'DECISION TO REVIEW') : unlocked ? 'READY TO DECIDE' : 'DISCOVER FIRST'}</small><strong>${escapeHtml(checkpoint.title)}</strong></div></div>
            <p>${escapeHtml(checkpoint.prompt)}</p>
            ${!unlocked && !chosen ? `<div class="reasoning-lock"><b>🔒</b><span>${escapeHtml(checkpoint.needs)}</span></div>` : ''}
            ${(unlocked || chosen) ? `<div class="reasoning-options">${checkpoint.options.map(option => `<button type="button" data-checkpoint="${escapeHtml(checkpoint.id)}" data-option="${escapeHtml(option[0])}" class="${chosen?.[0] === option[0] ? 'selected' : ''}" ${mode === 'assessment' && chosen ? 'disabled' : ''}>${escapeHtml(option[1])}</button>`).join('')}</div>` : ''}
            ${chosen ? `<div class="reasoning-feedback ${correct ? 'good' : 'caution'}"><strong>${mode === 'assessment' ? 'Decision recorded' : correct ? 'Strong reasoning' : 'Reconsider this choice'}</strong><span>${mode === 'assessment' ? 'Detailed reasoning is withheld until the call review.' : escapeHtml(chosen[3])}</span>${mode === 'learning' && !correct ? '<small>You may revise this checkpoint after gathering more information.</small>' : ''}</div>` : ''}
          </article>`;
        }).join('')}
      </div>
      <footer class="reasoning-board-foot"><span>${complete === config.checkpoints.length ? 'Reasoning checkpoints complete. Continue treatment, reassessment, transport, and handoff.' : 'The simulator unlocks decisions only after you discover the information needed to make them.'}</span></footer>`;
  }

  function renderBoard() {
    const caseId = activeCase();
    const config = CASES[caseId];
    if (!config || !document.body) return;
    let board = $('clinicalReasoningBoard');
    const anchor = $('horseCurrentAssessment') || document.querySelector('.patient-entry-workflow');
    if (!board) {
      board = document.createElement('section');
      board.id = 'clinicalReasoningBoard';
      board.className = 'clinical-reasoning-board';
      board.setAttribute('aria-label', 'Clinical reasoning checkpoints');
      if (anchor?.parentNode) anchor.parentNode.insertBefore(board, anchor);
      else document.querySelector('.patient-control-column')?.prepend(board);
    }
    board.innerHTML = boardMarkup(config, record());
    board.querySelectorAll('[data-checkpoint][data-option]').forEach(button => {
      button.addEventListener('click', () => {
        const checkpoint = config.checkpoints.find(item => item.id === button.dataset.checkpoint);
        const option = checkpoint?.options.find(item => item[0] === button.dataset.option);
        if (!checkpoint || !option) return;
        if (!checkpoint.unlocked(record()) && !currentChoice(record(), checkpoint)) return;
        saveDecision(checkpoint, option);
        if (trainingMode() === 'learning') {
          window.EMSCodeSimPatientInfo?.showSceneObservation?.({
            id: `reasoning-${caseId}-${checkpoint.id}-${Date.now()}`,
            type: option[2] ? 'CLINICAL REASONING' : 'DECISION REVIEW',
            title: checkpoint.title,
            text: option[3],
            kind: option[2] ? 'assessment' : 'alert',
            sticky: false
          });
        }
        window.setTimeout(renderBoard, 80);
      });
    });
  }

  function addDiscoveryCue() {
    if ($('reasoningDiscoveryCue')) return;
    const info = $('infoUpdateWindow');
    if (!info?.parentNode) return;
    const cue = document.createElement('div');
    cue.id = 'reasoningDiscoveryCue';
    cue.className = 'reasoning-discovery-cue';
    cue.innerHTML = '<strong>Discover → Decide → Treat → Reassess</strong><span>Ask the patient, use the mini-sims, then commit to a clinical decision.</span>';
    info.insertAdjacentElement('afterend', cue);
  }

  function init() {
    const config = CASES[activeCase()];
    if (!config) return;
    injectStyles();
    document.body.classList.add('reasoning-upgrade-active', `reasoning-case-${activeCase()}`);
    setScenarioArtwork(config);
    addDiscoveryCue();
    renderBoard();

    let lastSignature = '';
    window.setInterval(() => {
      const r = record();
      const signature = `${Object.keys(r?.findings || {}).sort().join('|')}::${treatmentCount(r)}::${reassessmentCount(r)}::${trainingMode()}`;
      if (signature !== lastSignature) {
        lastSignature = signature;
        setScenarioArtwork(config);
        renderBoard();
      }
    }, 700);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
