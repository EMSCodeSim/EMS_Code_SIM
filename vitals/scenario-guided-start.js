(() => {
  'use strict';

  const api = window.EMSCodeSimPatientRecord;
  const session = window.EMSCodeSimScenarioSession;
  const params = new URLSearchParams(location.search);
  const caseId = params.get('case') || session?.requestedCaseId?.() || api?.active?.()?.scenarioId || 'asthma';
  const $ = id => document.getElementById(id);
  const trainingMode = () => params.get('training') || api?.active?.()?.documentation?.trainingMode || 'learning';
  const assessmentMode = () => trainingMode() === 'assessment';
  const UNCERTAIN_OPTION = 'Not enough information at this time';
  const BASE_OBSERVATIONS = {
    ppe: 'You are preparing to make patient contact. No exposure has occurred yet; choose protection based on the environment and anticipated contact.',
    safeMedical: 'From the entryway, access appears clear. No immediate hazard is obvious, but the entire scene has not yet been checked.',
    safeRoadway: 'Traffic is moving near the incident. Vehicle stability, leaking fluids, broken glass, and fire hazards have not yet been fully controlled.',
    patients: 'One patient is visible from your current position. Continue scanning the surrounding area as you approach.',
    resources: 'Your crew is present. Consider what could delay care, movement, treatment, or transport if the patient worsens.',
    spineMedical: 'No traumatic event is apparent in the dispatch or first view. Continue watching for a fall, pain, neurologic deficit, or unreliable history.',
    spineTrauma: 'A significant collision is visible. The patient remains in the vehicle and the full mechanism has not yet been clarified.'
  };

  function showApproachObservation(question) {
    window.EMSCodeSimPatientInfo?.showSceneObservation?.({
      id: `scene-observation-${question.key}`,
      type: 'APPROACH OBSERVATION',
      title: 'What you notice as you approach',
      text: question.observation || 'Continue observing the patient and scene before making this decision.',
      kind: 'observation',
      sticky: true
    });
  }

  function clearApproachObservation() {
    window.EMSCodeSimPatientInfo?.clearSceneObservation?.();
  }

  const COMMON = {
    ppeMedical: ['Gloves and eye protection as indicated', 'No PPE is needed', 'Only an N95 respirator', 'Structural firefighting PPE'],
    ppeRoadway: ['High-visibility roadway PPE plus gloves and eye protection', 'Gloves only while standing in traffic', 'No PPE until patient contact', 'Only an N95 respirator'],
    sceneMedical: ['Safe after an initial hazard scan', 'Unsafe—stage and wait for law enforcement', 'Enter immediately without checking', 'Safe only after vehicle stabilization and traffic control'],
    sceneRoadway: ['Safe only after traffic, vehicle, fuel, and fire hazards are controlled', 'Safe because the patient is visible', 'Enter immediately before traffic control', 'Unsafe—leave without requesting resources'],
    patients: ['One patient', 'Two patients', 'Three or more patients', 'Patient count cannot be considered'],
    spine: ['Manual stabilization / spinal motion restriction is indicated now', 'Not indicated from the information currently available', 'Apply a cervical collar to every medical patient', 'Delay all assessment until a backboard arrives'],
    avpu: ['Alert', 'Responds to verbal stimuli', 'Responds only to painful stimuli', 'Unresponsive'],
    priority: ['Immediate / rapid transport', 'High-priority, time-sensitive transport', 'Lower-priority transport after a complete on-scene workup', 'No transport is necessary']
  };

  const CASES = {
    asthma: {
      ppe: 'medical', safe: 'medical', patients: 0, noi: 0, resources: 0, spine: 1, impression: 0, avpu: 0, priority: 1,
      noiOptions: ['Respiratory illness / breathing complaint', 'Acute neurologic emergency', 'Blunt trauma', 'Behavioral complaint only'],
      resourceOptions: ['Request ALS/transport support early if not already responding', 'No additional resources can ever be needed', 'Request extrication before assessing the patient', 'Request law enforcement only'],
      impressionOptions: ['Adult in visible respiratory distress', 'Stable adult with no breathing problem', 'Patient with isolated extremity trauma', 'Unresponsive cardiac arrest patient'],
      observations: {
        noi: 'The patient sits upright, uses visible effort to breathe, and answers in short phrases. A rescue inhaler is nearby.',
        resources: 'Only the current crew is visible. The patient continues to pause between words to breathe.',
        impression: 'The patient is upright, focused on breathing, and appears uncomfortable while watching the crew enter.',
        avpu: 'The patient watches you approach, makes eye contact, and answers when spoken to.',
        priority: 'The patient can speak, but must pause for breath and appears increasingly fatigued.'
      },
      rationales: {
        ppe: 'Standard precautions begin before contact. Add respiratory protection when exposure risk or local policy indicates it.',
        safe: 'An apartment scene still requires a quick scan for hazards, access, bystanders, pets, weapons, medications, and environmental clues.',
        patients: 'Dispatch and the first view identify one visible patient; continue looking for additional patients or bystanders who need care.',
        noi: 'The dispatch complaint, posture, wheezing history, and short sentences point to a respiratory nature of illness.',
        resources: 'Respiratory distress can worsen quickly. Early ALS and transport planning prevents delay.',
        spine: 'There is no trauma mechanism or neurologic clue requiring spinal motion restriction at this point.',
        impression: 'The first impression should identify distress before a detailed vital-sign set is obtained.',
        avpu: 'The patient is awake, interacting, and speaking, so the initial AVPU level is Alert.',
        priority: 'This patient is time-sensitive because breathing can deteriorate, but the current information does not describe arrest or immediate exsanguination.'
      }
    },
    stroke: {
      ppe: 'medical', safe: 'medical', patients: 0, noi: 1, resources: 0, spine: 1, impression: 1, avpu: 0, priority: 1,
      noiOptions: ['Respiratory illness', 'Acute neurologic emergency', 'Blunt trauma', 'Minor musculoskeletal complaint'],
      resourceOptions: ['Request ALS and begin stroke-center transport planning', 'Delay transport until every history detail is known', 'Request extrication before patient contact', 'No additional resources or destination planning'],
      impressionOptions: ['Stable patient with no focal deficit', 'Time-sensitive patient with focal neurologic findings', 'Patient with isolated respiratory distress', 'Patient with obvious multisystem trauma'],
      observations: {
        noi: 'The patient attempts to answer, but speech sounds abnormal. One arm does not remain raised as well as the other.',
        resources: 'Family is present, but no additional EMS unit is visible. The exact last-known-well time has not yet been confirmed.',
        impression: 'The patient is seated, awake, and has an obvious difference in speech and arm movement.',
        avpu: 'The patient looks toward you, follows simple directions, and tries to answer questions.',
        priority: 'The patient is awake and breathing, but the neurologic change appears sudden and time-sensitive.'
      },
      rationales: {
        ppe: 'Standard precautions are selected before contact and adjusted for anticipated exposure.', safe: 'A private residence still needs a quick safety scan and control of pets, bystanders, access, and environmental hazards.', patients: 'One patient is described and visible, while the crew continues to confirm the count.', noi: 'Sudden speech difficulty and unilateral weakness are neurologic findings rather than trauma or a primary respiratory complaint.', resources: 'Stroke care is time dependent. ALS support and early destination planning help avoid preventable delay.', spine: 'No fall, collision, neck pain, or trauma mechanism has been provided at this time.', impression: 'The general impression should recognize a time-sensitive focal neurologic presentation.', avpu: 'The patient is awake and engaging despite abnormal speech, which is consistent with Alert on AVPU.', priority: 'Rapid evaluation and transport are appropriate because treatment eligibility depends on time and destination.'
      }
    },
    hypoglycemia: {
      ppe: 'medical', safe: 'medical', patients: 0, noi: 2, resources: 0, spine: 1, impression: 2, avpu: 1, priority: 0,
      noiOptions: ['Respiratory illness', 'Acute neurologic emergency only', 'Altered mental status / possible metabolic problem', 'Blunt trauma'],
      resourceOptions: ['Request ALS/transport support and prepare for airway or glucose intervention', 'No additional resources are useful', 'Request extrication before assessment', 'Wait for family to correct the problem'],
      impressionOptions: ['Stable alert adult', 'Patient with isolated extremity injury', 'Altered, diaphoretic patient with possible airway risk', 'Patient in obvious cardiac arrest'],
      observations: {
        noi: 'The patient is sweaty, confused, and slow to complete a simple request. Diabetic supplies are visible nearby.',
        resources: 'Only the current crew is present. The patient is not reliably answering questions and may need rapid treatment or airway support.',
        impression: 'The patient appears pale and diaphoretic, with delayed responses and poor awareness of the surroundings.',
        avpu: 'The patient does not initially track you, but looks up and attempts to follow a command after you speak loudly.',
        priority: 'The patient is breathing but remains altered and cannot provide a reliable history.'
      },
      rationales: {
        ppe: 'Standard precautions are chosen before contact and escalated when blood, secretions, or other exposure is likely.', safe: 'A medical residence scene still requires confirmation of hazards and safe access.', patients: 'The first information supports one patient, but crews should verify the count.', noi: 'Confusion and diaphoresis suggest altered mental status with a possible metabolic cause, which must be assessed rather than assumed.', resources: 'An altered patient may lose airway protection and may need ALS treatment or rapid transport.', spine: 'There is no trauma mechanism in the initial information.', impression: 'The first impression should recognize altered mentation, diaphoresis, and potential airway compromise.', avpu: 'The patient is slow to follow commands and best described as responding to verbal stimuli in this guided case.', priority: 'Altered mental status with possible airway risk is an immediate priority until rapidly reversible causes are identified and treated.'
      }
    },
    trauma: {
      ppe: 'roadway', safe: 'roadway', patients: 0, noi: 2, resources: 2, spine: 0, impression: 3, avpu: 1, priority: 0,
      noiOptions: ['Respiratory illness', 'Acute neurologic illness', 'Blunt-trauma mechanism from a collision', 'Behavioral complaint'],
      resourceOptions: ['No additional resources', 'Request law enforcement only after transport', 'Request fire/rescue, traffic control, extrication capability as needed, and ALS', 'Wait to request help until the secondary assessment is complete'],
      impressionOptions: ['Stable patient with a minor complaint', 'Medical patient with isolated wheezing', 'Alert child with fever', 'Potentially unstable multisystem-trauma patient'],
      observations: {
        patients: 'One patient is visible in the vehicle. The far side of the vehicle and surrounding roadway have not yet been completely searched.',
        noi: 'Vehicle damage and the patient position suggest a significant impact. The patient guards the chest and appears pale.',
        resources: 'Traffic control is incomplete. The vehicle condition and patient access may complicate removal and transport.',
        impression: 'The patient is pale, guarded, and not fully engaging with the crew after a significant collision.',
        avpu: 'The patient does not spontaneously track you, but turns and responds after you call out.',
        priority: 'The patient has a significant mechanism, guarded breathing, pallor, and delayed interaction.'
      },
      rationales: {
        ppe: 'A roadway collision adds traffic and visibility hazards to standard exposure precautions.', safe: 'Traffic, unstable vehicles, fuel, glass, fire, electrical, and extrication hazards must be controlled before the scene is considered safe.', patients: 'One visible patient is described, but a collision requires an active search for drivers, passengers, pedestrians, and ejected occupants.', noi: 'The collision is a blunt-trauma mechanism of injury.', resources: 'Traffic control, rescue/extrication, fire suppression, additional ambulances, and ALS may all be needed based on the scene.', spine: 'A significant collision with abnormal responsiveness and guarded breathing supports immediate manual stabilization while the assessment continues.', impression: 'Pallor, guarded breathing, and a significant mechanism create a potentially unstable multisystem-trauma impression.', avpu: 'The guided case describes a patient who responds to voice but is not fully alert.', priority: 'Potential airway, breathing, hemorrhage, or shock threats after significant trauma require immediate action and rapid transport.'
      }
    },
    pediatric: {
      ppe: 'medical', safe: 'medical', patients: 0, noi: 0, resources: 0, spine: 1, impression: 0, avpu: 1, priority: 1,
      noiOptions: ['Pediatric respiratory / febrile illness', 'Acute stroke', 'Blunt trauma', 'Isolated adult cardiac complaint'],
      resourceOptions: ['Request ALS/transport support and keep pediatric equipment ready', 'No additional help can be needed', 'Request extrication before looking at the child', 'Delay transport until the child becomes unresponsive'],
      impressionOptions: ['Sick child with poor interaction and increased work of breathing', 'Well child with no distress', 'Adult patient with focal weakness', 'Patient with isolated long-bone injury'],
      observations: {
        noi: 'The child stays close to the caregiver, interacts poorly, and has visible pulling between the ribs while breathing.',
        resources: 'The caregiver is present. No pediatric specialty or additional ALS resource is visible yet.',
        impression: 'The child appears tired, interacts less than expected, and is working harder to breathe.',
        avpu: 'The child does not engage with you at first, but reacts when the caregiver speaks and when you call the child’s name.',
        priority: 'The child continues to breathe with visible effort and has limited interaction with the surroundings.'
      },
      rationales: {
        ppe: 'Standard precautions are chosen before contact, with respiratory protection based on symptoms and exposure risk.', safe: 'The scene must be checked for hazards while preserving a calm approach to the child and caregiver.', patients: 'One pediatric patient is described; verify that no sibling, caregiver, or other person also needs assessment.', noi: 'Poor interaction, increased work of breathing, and fever point to a pediatric respiratory or infectious illness.', resources: 'Children can compensate and then deteriorate rapidly. Early ALS and transport planning are appropriate.', spine: 'No trauma mechanism or spinal complaint is present in the initial information.', impression: 'The first look should recognize a sick child before upsetting the child with hands-on assessment.', avpu: 'Poor interaction with response to the caregiver or crew is represented as Verbal in this guided case.', priority: 'A sick child with increased work of breathing is high priority and needs efficient assessment and transport.'
      }
    }
  };

  function withUncertainty(options) {
    return [...options, UNCERTAIN_OPTION];
  }

  function questionsFor(config) {
    const observations = config.observations || {};
    return [
      { key: 'ppe', title: 'What PPE should you use?', prompt: 'Choose the best initial protection before patient contact.', observation: observations.ppe || BASE_OBSERVATIONS.ppe, options: withUncertainty(config.ppe === 'roadway' ? COMMON.ppeRoadway : COMMON.ppeMedical), correct: 0 },
      { key: 'safe', title: 'Is the scene safe?', prompt: 'Use the dispatch, photo, and current approach observation.', observation: observations.safe || (config.safe === 'roadway' ? BASE_OBSERVATIONS.safeRoadway : BASE_OBSERVATIONS.safeMedical), options: withUncertainty(config.safe === 'roadway' ? COMMON.sceneRoadway : COMMON.sceneMedical), correct: 0 },
      { key: 'patients', title: 'How many patients are present?', prompt: 'State the current count while continuing to search for others.', observation: observations.patients || BASE_OBSERVATIONS.patients, options: withUncertainty(COMMON.patients), correct: config.patients },
      { key: 'noi', title: 'What is the NOI or MOI?', prompt: 'Choose the best working description from what is currently available.', observation: observations.noi, options: withUncertainty(config.noiOptions), correct: config.noi },
      { key: 'resources', title: 'What additional resources may be needed?', prompt: 'Consider needs that should be requested before they delay care.', observation: observations.resources || BASE_OBSERVATIONS.resources, options: withUncertainty(config.resourceOptions), correct: config.resources },
      { key: 'spine', title: 'Is cervical-spine stabilization needed now?', prompt: 'Base the decision on the mechanism and current patient presentation.', observation: observations.spine || (config.safe === 'roadway' ? BASE_OBSERVATIONS.spineTrauma : BASE_OBSERVATIONS.spineMedical), options: withUncertainty(COMMON.spine), correct: config.spine },
      { key: 'impression', title: 'What is your general impression?', prompt: 'Describe the patient from the first look, before detailed assessment.', observation: observations.impression, options: withUncertainty(config.impressionOptions), correct: config.impression },
      { key: 'avpu', title: 'What is the initial AVPU level?', prompt: 'Classify responsiveness from behavior, eye contact, and response to your approach.', observation: observations.avpu, options: withUncertainty(COMMON.avpu), correct: config.avpu },
      { key: 'priority', title: 'What is the initial patient priority?', prompt: 'Choose the priority supported by the current threats and time sensitivity.', observation: observations.priority, options: withUncertainty(COMMON.priority), correct: config.priority }
    ];
  }

  const config = CASES[caseId] || CASES.asthma;
  const questions = questionsFor(config);
  let index = 0;
  let answers = [];
  let completedFinding = api?.getFinding?.('scene_size_up', api?.active?.());
  let reviewMode = false;
  let initialized = false;

  function setLocked(locked) {
    const nav = document.querySelector('.bottom-nav');
    nav?.classList.toggle('guide-locked', locked);
    document.body.classList.toggle('scene-guide-active', locked);
  }

  function render() {
    const question = questions[index];
    const savedAnswer = answers[index] || null;
    $('sceneGuideProgress').textContent = `Scene size-up ${index + 1} of ${questions.length}`;
    $('sceneGuideBar').style.width = `${((index + 1) / questions.length) * 100}%`;
    $('sceneGuideQuestion').innerHTML = `
      <h3>${question.title}</h3>
      <p>${question.prompt}</p>
      <label class="scene-guide-select" for="sceneGuideAnswer">
        <span>Your decision</span>
        <select id="sceneGuideAnswer" ${reviewMode ? 'disabled' : ''}>
          <option value="">Choose an option</option>
          ${question.options.map((option, optionIndex) => `<option value="${optionIndex}" ${savedAnswer?.selected === option ? 'selected' : ''}>${option}</option>`).join('')}
        </select>
      </label>`;
    $('sceneGuideFeedback').hidden = !reviewMode;
    $('sceneGuideFeedback').className = 'scene-guide-feedback';
    $('sceneGuideFeedback').innerHTML = reviewMode && savedAnswer
      ? `<strong>Your recorded decision</strong>${savedAnswer.selected}`
      : '';
    $('sceneGuideNext').textContent = reviewMode
      ? (index === questions.length - 1 ? 'Close review' : 'Next decision')
      : (index === questions.length - 1 ? 'Save scene size-up' : 'Record and continue');
    $('sceneGuideNext').disabled = reviewMode ? false : !savedAnswer;
    $('sceneGuideAnswer')?.addEventListener('change', event => {
      $('sceneGuideNext').disabled = !event.target.value;
    });
    showApproachObservation(question);
  }

  function recordAnswer() {
    const selected = $('sceneGuideAnswer');
    if (!selected?.value) return false;
    const question = questions[index];
    const selectedIndex = Number(selected.value);
    const selectedText = question.options[selectedIndex];
    answers[index] = {
      key: question.key,
      question: question.title,
      selected: selectedText,
      expected: question.options[question.correct],
      correct: selectedIndex === question.correct,
      uncertain: selectedText === UNCERTAIN_OPTION,
      rationale: config.rationales[question.key]
    };
    return true;
  }

  function markScenarioStep() {
    const state = session?.readState?.(caseId) || {};
    state.done = Array.isArray(state.done) ? state.done : [];
    if (!state.done.includes(0)) state.done.push(0);
    state.done.sort((a, b) => a - b);
    session?.writeState?.(caseId, state);
  }

  function saveGuide(skipped = false) {
    const score = skipped ? 0 : answers.filter(answer => answer?.correct).length;
    const value = skipped
      ? 'Scene size-up closed before completion'
      : `Scene size-up completed; ${answers.length} decisions recorded for final debrief review`;
    const meta = {
      label: 'Scene size-up and first impression',
      source: 'guided-scenario-entry',
      classification: skipped ? 'Skipped' : 'Complete',
      learnerFinding: value,
      expectedFinding: 'PPE, scene safety, patient count, NOI/MOI, resources, spinal precautions, general impression, AVPU, and transport priority addressed',
      answers: skipped ? [] : answers,
      score,
      maxScore: questions.length,
      accurate: !skipped && score === questions.length,
      correct: !skipped && score === questions.length,
      skipped,
      reviewAtDebrief: true
    };
    if (session?.saveFinding) session.saveFinding('scene_size_up', value, meta);
    else api?.setFinding?.('scene_size_up', value, meta);
    markScenarioStep();
    completedFinding = api?.getFinding?.('scene_size_up', api?.active?.()) || { value, ...meta };
    showComplete();
  }

  function showComplete() {
    reviewMode = false;
    $('sceneGuide').hidden = true;
    if ($('sceneGuideComplete')) $('sceneGuideComplete').hidden = true;
    setLocked(false);
    clearApproachObservation();
    if ($('reviewSceneGuide')) $('reviewSceneGuide').textContent = 'Review scene size-up';
    window.dispatchEvent(new CustomEvent('emscodesim:patient-record-updated'));
  }

  function pauseGuide() {
    reviewMode = false;
    $('sceneGuide').hidden = true;
    setLocked(false);
    clearApproachObservation();
  }

  function startGuide(review = false) {
    reviewMode = Boolean(review && completedFinding);
    index = 0;
    answers = reviewMode && Array.isArray(completedFinding?.answers)
      ? completedFinding.answers.map(answer => ({ ...answer }))
      : [];
    if ($('sceneGuideComplete')) $('sceneGuideComplete').hidden = true;
    $('sceneGuideSkip').textContent = reviewMode ? 'Close review' : 'Close for now';
    $('sceneGuideSkip').hidden = !reviewMode && assessmentMode();
    const note = document.querySelector('.guide-note');
    if (note) note.textContent = reviewMode
      ? 'Review shows your recorded choices without revealing the expected answers. Full feedback remains in the final debrief.'
      : 'Use the photo, dispatch, and approach observations. “Not enough information at this time” is always available. Answers are reviewed during the final debrief.';
    $('sceneGuide').hidden = false;
    setLocked(!reviewMode);
    render();
    document.querySelector('.patient-stage')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function openAssessment() {
    const button = document.querySelector('.bottom-nav button[data-panel="assessmentPanel"]');
    button?.click();
  }

  function showReady() {
    reviewMode = false;
    $('sceneGuide').hidden = true;
    if ($('sceneGuideComplete')) $('sceneGuideComplete').hidden = true;
    setLocked(false);
    clearApproachObservation();
    if ($('reviewSceneGuide')) $('reviewSceneGuide').textContent = completedFinding ? 'Review scene size-up' : 'Scene size-up';
  }

  function init() {
    if (initialized || !$('sceneGuide')) return;
    initialized = true;
    $('sceneGuideNext').addEventListener('click', () => {
      if (reviewMode) {
        if (index < questions.length - 1) {
          index += 1;
          render();
        } else {
          pauseGuide();
        }
        return;
      }
      if (!recordAnswer()) return;
      if (index < questions.length - 1) {
        index += 1;
        render();
      } else {
        saveGuide(false);
      }
    });
    $('sceneGuideSkip').addEventListener('click', pauseGuide);
    $('reviewSceneGuide')?.addEventListener('click', () => startGuide(Boolean(completedFinding)));
    $('beginPrimaryAssessment')?.addEventListener('click', openAssessment);
    $('reviewCompletedSceneGuide')?.addEventListener('click', () => startGuide(true));
    if (completedFinding) showReady();
    else startGuide(false);
  }

  window.EMSCodeSimSceneGuide = {
    start(review = false) {
      init();
      if (!$('sceneGuide')) return null;
      startGuide(Boolean(review && completedFinding));
      return true;
    },
    isComplete() {
      return Boolean(completedFinding);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
