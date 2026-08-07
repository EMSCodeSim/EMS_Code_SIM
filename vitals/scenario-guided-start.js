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
    },
    horse_crush: {
      ppe: 'medical', safe: 'medical', patients: 0, noi: 2, resources: 0, spine: 0, impression: 0, avpu: 0, priority: 1,
      noiOptions: ['Medical illness without trauma', 'Acute neurologic emergency', 'Significant blunt trauma from large-animal compression and a fall', 'Minor isolated ankle injury'],
      resourceOptions: ['Use the BLS engine crew for assessment, leg support, and a coordinated low-movement transfer; request more help if access or lifting requires it', 'Dismiss the engine before examining the patient', 'Move the patient immediately before planning', 'Wait until arrival at the hospital to decide how to move the patient'],
      impressionOptions: ['Alert trauma patient with severe isolated left-hip pain and a potentially significant occult injury', 'Unresponsive patient in respiratory arrest', 'Stable patient who can safely walk to the ambulance', 'Patient with only a superficial abrasion'],
      observations: {
        ppe: 'The patient is outside the south barn on packed dirt. The horses have been secured and the BLS engine crew reports no remaining animal hazard.',
        safe: 'The engine crew confirms the horses are secured, the patient area is clear, and the ambulance can approach without entering an animal enclosure.',
        patients: 'One patient is visible on the ground outside the south barn. The BLS crew reports no other injuries.',
        noi: 'The BLS handoff reports that the patient was compressed between two horses and knocked to the ground from standing.',
        resources: 'A staffed BLS engine is already present. The patient is on dirt and cannot lower the left leg without severe pain.',
        spine: 'The patient denies head strike, loss of consciousness, neck pain, and back pain, but the significant mechanism still requires a careful spinal and neurologic assessment before movement.',
        impression: 'The patient is alert, speaks clearly, and guards the left hip with the knee flexed. No major bleeding or respiratory distress is obvious.',
        avpu: 'The patient watches you approach, answers questions clearly, and is oriented to person, place, time, and event.',
        priority: 'The patient is currently hemodynamically stable, but the large-animal compression mechanism, age, severe pain, and inability to move the leg make the call time-sensitive.'
      },
      rationales: {
        ppe: 'Standard precautions remain appropriate. Scene control must also include confirmation that all large animals are secured.',
        safe: 'The scene is considered safe only after the horses are secured, access is controlled, and the ambulance is parked without blocking other resources or entering an unsafe enclosure.',
        patients: 'The handoff and scene scan identify one patient, while the crew continues to confirm that no handler or bystander was also injured.',
        noi: 'Compression between two horses followed by a fall is a significant blunt mechanism, not merely a routine ground-level fall.',
        resources: 'The existing engine crew is valuable for maintaining leg support, separating and placing a scoop, and coordinating the lift.',
        spine: 'A careful exam is needed before movement. Automatic long-board use is not required when the patient is reliable and the exam is reassuring, but unnecessary motion should still be minimized.',
        impression: 'The first impression should recognize a stable-appearing patient who may still have a significant pelvic, acetabular, proximal femur, or hip injury.',
        avpu: 'The patient is alert and oriented, supporting an AVPU classification of Alert.',
        priority: 'Stable vital signs do not remove the need for efficient assessment, analgesia planning, careful packaging, and transport.'
      }
    }
  };

  const PRIMARY_CASES = {
    asthma: {
      expected: { airway: 'normal', breathing: 'not-normal', perfusion: 'normal' },
      observations: {
        airway: 'As you speak with the patient, the patient answers in short phrases. No snoring, gurgling, stridor, or visible material is noted at the mouth.',
        breathing: 'The chest rises with each breath. The patient sits upright, uses the neck and shoulder muscles, and pauses between words to breathe.',
        perfusion: 'No major external bleeding is visible. The skin is warm, and a radial pulse is present and rapid.'
      },
      rationales: {
        airway: 'The patient can move air and speak without signs of an immediate obstruction, although the airway still requires continued reassessment.',
        breathing: 'Visible accessory-muscle use, limited speech, and fatigue indicate that breathing is not adequate despite continued chest rise.',
        perfusion: 'A present radial pulse, warm skin, and no major external bleeding support adequate initial circulation.'
      }
    },
    stroke: {
      expected: { airway: 'normal', breathing: 'normal', perfusion: 'normal' },
      observations: {
        airway: 'The patient attempts to answer, handles secretions, and has no audible snoring, gurgling, or stridor.',
        breathing: 'The chest rises regularly. No marked accessory-muscle use, cyanosis, or obvious respiratory distress is visible.',
        perfusion: 'No major external bleeding is present. The skin is warm and dry, and a radial pulse is readily felt.'
      },
      rationales: {
        airway: 'The patient is moving air, managing secretions, and showing no immediate obstruction.',
        breathing: 'Regular chest rise without visible distress supports adequate initial breathing.',
        perfusion: 'Warm skin, a palpable radial pulse, and no major bleeding support adequate initial circulation.'
      }
    },
    hypoglycemia: {
      expected: { airway: 'normal', breathing: 'normal', perfusion: 'not-normal' },
      observations: {
        airway: 'After you speak loudly, the patient looks toward you and swallows without coughing. No snoring, gurgling, or visible obstruction is noted.',
        breathing: 'The chest rises at a regular rate without marked retractions or accessory-muscle use.',
        perfusion: 'The patient is pale, cool, and diaphoretic. A radial pulse is present but rapid and weaker than expected.'
      },
      rationales: {
        airway: 'The patient is moving air and handling secretions, but altered mental status makes continued airway monitoring essential.',
        breathing: 'Regular chest rise without obvious distress supports adequate initial breathing.',
        perfusion: 'Pale, cool, diaphoretic skin with a rapid weaker pulse is an abnormal initial perfusion finding.'
      }
    },
    trauma: {
      expected: { airway: 'normal', breathing: 'not-normal', perfusion: 'not-normal' },
      observations: {
        airway: 'The patient responds when you speak and produces understandable words. No snoring, gurgling, or visible material is noted in the mouth.',
        breathing: 'Breaths are shallow and guarded. Chest movement is reduced on one side, and the patient appears uncomfortable with each breath.',
        perfusion: 'The skin is pale and cool. A radial pulse is rapid and weak, and blood is visible on the patient’s clothing even though the full source is not yet exposed.'
      },
      rationales: {
        airway: 'The patient can move air and speak, so no immediate obstruction is identified during the rapid check.',
        breathing: 'Shallow guarded respirations and unequal chest movement are abnormal and may represent a life threat.',
        perfusion: 'Pale cool skin, a rapid weak pulse, and visible blood indicate compromised circulation until proven otherwise.'
      }
    },
    pediatric: {
      expected: { airway: 'normal', breathing: 'not-normal', perfusion: 'normal' },
      observations: {
        airway: 'The child vocalizes when the caregiver speaks and has no drooling, stridor, snoring, or visible foreign material.',
        breathing: 'The chest rises, but retractions and nasal flaring are visible. The child pauses frequently and appears tired.',
        perfusion: 'No major bleeding is visible. Skin color remains appropriate, the extremities are warm, and a central pulse is strong.'
      },
      rationales: {
        airway: 'Vocalization and the absence of obstruction signs support a patent airway during the initial check.',
        breathing: 'Retractions, nasal flaring, and fatigue indicate inadequate breathing despite continued chest rise.',
        perfusion: 'Warm skin, appropriate color, a strong central pulse, and no major bleeding support adequate initial circulation.'
      }
    },
    horse_crush: {
      expected: { airway: 'normal', breathing: 'normal', perfusion: 'normal' },
      observations: {
        airway: 'The patient answers in full sentences. No snoring, gurgling, stridor, blood, vomit, or visible obstruction is present.',
        breathing: 'Chest rise is symmetric with normal effort. The patient denies shortness of breath and can speak without pausing.',
        perfusion: 'No major bleeding is visible. Skin is warm and dry, and a regular radial pulse is readily palpable.'
      },
      rationales: {
        airway: 'Clear speech and the absence of obstruction signs support a patent airway.',
        breathing: 'Symmetric chest rise, normal effort, and full sentences support adequate breathing during the rapid check.',
        perfusion: 'Warm dry skin, a palpable regular pulse, and no major bleeding support adequate initial circulation, while internal injury still requires consideration.'
      }
    }
  };

  const PRIMARY_OPTIONS = {
    airway: [
      { label: 'Patent without immediate intervention', value: 'Patent', normality: 'normal' },
      { label: 'Threatened or obstructed', value: 'Threatened or obstructed', normality: 'not-normal' },
      { label: UNCERTAIN_OPTION, value: UNCERTAIN_OPTION, normality: 'uncertain' }
    ],
    breathing: [
      { label: 'Breathing appears adequate', value: 'Breathing adequate', normality: 'normal' },
      { label: 'Breathing is present but inadequate', value: 'Breathing inadequate', normality: 'not-normal' },
      { label: 'No effective breathing is present', value: 'Breathing absent', normality: 'not-normal' },
      { label: UNCERTAIN_OPTION, value: UNCERTAIN_OPTION, normality: 'uncertain' }
    ],
    perfusion: [
      { label: 'Perfusion appears adequate; no major bleeding', value: 'Perfusion adequate; no major bleeding', normality: 'normal' },
      { label: 'Poor perfusion or major bleeding is present', value: 'Poor perfusion or major bleeding', normality: 'not-normal' },
      { label: UNCERTAIN_OPTION, value: UNCERTAIN_OPTION, normality: 'uncertain' }
    ]
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

  function primaryQuestionsFor(caseConfig) {
    const expected = caseConfig.expected || {};
    return [
      {
        key: 'airway', title: 'What is your initial airway finding?',
        prompt: 'Use what you can see and hear during the rapid airway check.',
        observation: caseConfig.observations?.airway,
        options: PRIMARY_OPTIONS.airway.map(option => option.label), optionMeta: PRIMARY_OPTIONS.airway,
        correct: PRIMARY_OPTIONS.airway.findIndex(option => option.normality === expected.airway),
        rationale: caseConfig.rationales?.airway
      },
      {
        key: 'breathing', title: 'What is your initial breathing finding?',
        prompt: 'Look for chest rise, effort, rate, speech, position, and signs of fatigue.',
        observation: caseConfig.observations?.breathing,
        options: PRIMARY_OPTIONS.breathing.map(option => option.label), optionMeta: PRIMARY_OPTIONS.breathing,
        correct: PRIMARY_OPTIONS.breathing.findIndex(option => option.normality === expected.breathing),
        rationale: caseConfig.rationales?.breathing
      },
      {
        key: 'perfusion', title: 'What is your initial circulation finding?',
        prompt: 'Look for major bleeding, skin signs, and the quality of a quickly checked pulse.',
        observation: caseConfig.observations?.perfusion,
        options: PRIMARY_OPTIONS.perfusion.map(option => option.label), optionMeta: PRIMARY_OPTIONS.perfusion,
        correct: PRIMARY_OPTIONS.perfusion.findIndex(option => option.normality === expected.perfusion),
        rationale: caseConfig.rationales?.perfusion
      }
    ];
  }

  const config = CASES[caseId] || CASES.asthma;
  const primaryConfig = PRIMARY_CASES[caseId] || PRIMARY_CASES.asthma;
  const sceneQuestions = questionsFor(config);
  const primaryQuestions = primaryQuestionsFor(primaryConfig);
  let activeGuide = 'scene';
  let index = 0;
  let answers = [];
  let completedFinding = api?.getFinding?.('scene_size_up', api?.active?.());
  let reviewMode = false;
  let initialized = false;
  let autoAdvanceTimer = null;

  function guideQuestions() {
    return activeGuide === 'primary' ? primaryQuestions : sceneQuestions;
  }

  function guideLabel() {
    return activeGuide === 'primary' ? 'Initial ABC assessment' : 'Scene size-up';
  }

  function guideEyebrow() {
    return activeGuide === 'primary' ? 'INITIAL PRIMARY ASSESSMENT' : 'SCENE SIZE-UP';
  }

  function guideTitle() {
    return activeGuide === 'primary'
      ? 'Assess airway, breathing, and circulation while viewing the patient'
      : 'Look at the patient and make a decision';
  }

  function primaryComplete() {
    return ['airway', 'breathing', 'perfusion'].every(key => Boolean(api?.getFinding?.(key, api?.active?.())));
  }

  function updatePhaseControls() {
    const sceneDone = Boolean(completedFinding);
    const abcDone = primaryComplete();
    const sceneButton = $('startSceneSizeupPhoto');
    const abcButton = $('startInitialABCPhoto');
    const sceneStatus = $('sceneSizeupPhotoStatus');
    const abcStatus = $('initialABCPhotoStatus');
    if (sceneButton) sceneButton.classList.toggle('complete', sceneDone);
    if (abcButton) {
      abcButton.disabled = !sceneDone;
      abcButton.classList.toggle('complete', abcDone);
    }
    if (sceneStatus) sceneStatus.textContent = sceneDone ? 'Review' : 'Begin';
    if (abcStatus) abcStatus.textContent = !sceneDone ? 'Complete scene first' : abcDone ? 'Review' : 'Begin';
  }

  function setPhaseControlsVisible(visible) {
    const controls = $('patientPhaseControls');
    if (controls) controls.hidden = !visible;
  }

  function recordedPrimaryAnswers() {
    return primaryQuestions.map(question => {
      const finding = api?.getFinding?.(question.key, api?.active?.());
      if (!finding) return null;
      const selected = finding.selected || finding.learnerFinding || finding.value || finding.finding;
      const optionIndex = question.optionMeta?.findIndex(option => option.label === selected || option.value === selected) ?? -1;
      const matched = optionIndex >= 0 ? question.optionMeta[optionIndex] : null;
      return {
        key: question.key,
        question: question.title,
        selected: matched?.label || selected,
        findingValue: matched?.value || finding.value || selected,
        normality: matched?.normality || finding.normality || 'uncertain',
        expected: question.options[question.correct],
        expectedNormality: primaryConfig.expected?.[question.key] || '',
        correct: typeof finding.correct === 'boolean' ? finding.correct : optionIndex === question.correct,
        uncertain: (matched?.normality || finding.normality) === 'uncertain',
        rationale: question.rationale
      };
    });
  }

  function showGuideObservation(question) {
    window.EMSCodeSimPatientInfo?.showSceneObservation?.({
      id: `${activeGuide}-observation-${question.key}`,
      type: activeGuide === 'primary' ? 'PRIMARY ASSESSMENT FINDING' : 'APPROACH OBSERVATION',
      title: activeGuide === 'primary' ? 'What you find during the rapid check' : 'What you notice as you approach',
      text: question.observation || 'Continue observing the patient before making this decision.',
      kind: 'observation',
      sticky: true
    });
  }

  function clearGuideObservation() {
    window.EMSCodeSimPatientInfo?.clearSceneObservation?.();
  }

  function setLocked(locked) {
    const nav = document.querySelector('.bottom-nav');
    nav?.classList.toggle('guide-locked', locked);
    document.body.classList.toggle('scene-guide-active', locked);
  }

  function render() {
    const questions = guideQuestions();
    const question = questions[index];
    const savedAnswer = answers[index] || null;
    if ($('sceneGuideEyebrow')) $('sceneGuideEyebrow').textContent = guideEyebrow();
    $('sceneGuideTitle').textContent = guideTitle();
    $('sceneGuide')?.setAttribute('data-collapsed-label', `${guideLabel()} · ${index + 1} of ${questions.length}`);
    $('sceneGuideProgress').textContent = `${guideLabel()} ${index + 1} of ${questions.length}`;
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
      : (index === questions.length - 1
          ? (activeGuide === 'scene' ? 'Save and begin ABC' : 'Save initial ABC')
          : 'Record and continue');
    $('sceneGuideNext').disabled = reviewMode ? false : !savedAnswer;
    $('sceneGuideAnswer')?.addEventListener('change', event => {
      const hasAnswer = event.target.value !== '';
      $('sceneGuideNext').disabled = !hasAnswer;
      if (!reviewMode && hasAnswer) {
        window.clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = window.setTimeout(() => $('sceneGuideNext')?.click(), 450);
      }
    });
    showGuideObservation(question);
  }

  function recordAnswer() {
    const selected = $('sceneGuideAnswer');
    if (!selected || selected.value === '') return false;
    const question = guideQuestions()[index];
    const selectedIndex = Number(selected.value);
    const selectedText = question.options[selectedIndex];
    if (activeGuide === 'primary') {
      const choice = question.optionMeta[selectedIndex];
      answers[index] = {
        key: question.key,
        question: question.title,
        selected: selectedText,
        findingValue: choice.value,
        normality: choice.normality,
        expected: question.options[question.correct],
        expectedNormality: primaryConfig.expected?.[question.key] || '',
        correct: selectedIndex === question.correct,
        uncertain: choice.normality === 'uncertain',
        rationale: question.rationale
      };
      return true;
    }
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

  function saveSceneGuide() {
    const score = answers.filter(answer => answer?.correct).length;
    const value = `Scene size-up completed; ${answers.length} decisions recorded for final debrief review`;
    const meta = {
      label: 'Scene size-up and first impression',
      source: 'guided-scenario-entry',
      classification: 'Complete',
      learnerFinding: value,
      expectedFinding: 'PPE, scene safety, patient count, NOI/MOI, resources, spinal precautions, general impression, AVPU, and transport priority addressed',
      answers,
      score,
      maxScore: sceneQuestions.length,
      accurate: score === sceneQuestions.length,
      correct: score === sceneQuestions.length,
      skipped: false,
      reviewAtDebrief: true
    };
    if (session?.saveFinding) session.saveFinding('scene_size_up', value, meta);
    else api?.setFinding?.('scene_size_up', value, meta);
    markScenarioStep();
    completedFinding = api?.getFinding?.('scene_size_up', api?.active?.()) || { value, ...meta };
    updatePhaseControls();
    window.dispatchEvent(new CustomEvent('emscodesim:patient-record-updated'));
    startPrimary(false);
  }

  function savePrimaryGuide() {
    answers.forEach(answer => {
      if (!answer) return;
      const classification = answer.normality === 'normal' ? 'Normal' : answer.normality === 'not-normal' ? 'Not Normal' : 'Uncertain';
      const value = answer.findingValue || answer.selected;
      const meta = {
        label: answer.key === 'perfusion' ? 'Circulation' : answer.key.charAt(0).toUpperCase() + answer.key.slice(1),
        source: 'guided-primary-assessment',
        classification,
        finding: value,
        normality: answer.normality,
        status: answer.normality === 'normal' ? 'normal' : answer.normality === 'not-normal' ? 'abnormal' : 'uncertain',
        learnerFinding: answer.selected,
        selected: answer.selected,
        expectedFinding: answer.expected,
        expectedNormality: answer.expectedNormality,
        accurate: answer.correct,
        correct: answer.correct,
        uncertain: answer.uncertain,
        rationale: answer.rationale,
        reviewAtDebrief: true,
        rapidAssessment: true
      };
      if (session?.saveFinding) session.saveFinding(answer.key, value, meta);
      else api?.setFinding?.(answer.key, value, meta);
    });
    showComplete();
  }

  function showComplete() {
    reviewMode = false;
    $('sceneGuide').hidden = true;
    setPhaseControlsVisible(true);
    updatePhaseControls();
    if ($('sceneGuideComplete')) $('sceneGuideComplete').hidden = true;
    setLocked(false);
    clearGuideObservation();
    if ($('reviewSceneGuide')) $('reviewSceneGuide').textContent = 'Review scene size-up';
    window.dispatchEvent(new CustomEvent('emscodesim:patient-record-updated'));
  }

  function pauseGuide() {
    window.clearTimeout(autoAdvanceTimer);
    reviewMode = false;
    $('sceneGuide').hidden = true;
    setPhaseControlsVisible(true);
    updatePhaseControls();
    setLocked(false);
    clearGuideObservation();
  }

  function startGuide(review = false) {
    activeGuide = 'scene';
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
      ? 'Review shows your recorded choices without revealing expected answers. Full feedback remains in the final debrief.'
      : 'Use the photo, dispatch, and approach observations. “Not enough information at this time” is always available. Answers are reviewed during the final debrief.';
    setPhaseControlsVisible(false);
    $('sceneGuide').classList.remove('is-collapsed');
    $('sceneGuideCollapse')?.setAttribute('aria-expanded', 'true');
    $('sceneGuide').hidden = false;
    setLocked(!reviewMode);
    render();
    document.querySelector('.patient-stage')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function startPrimary(review = false) {
    if (!completedFinding) {
      startGuide(false);
      return;
    }
    activeGuide = 'primary';
    const complete = primaryComplete();
    reviewMode = Boolean(review && complete);
    answers = reviewMode ? recordedPrimaryAnswers() : recordedPrimaryAnswers();
    index = reviewMode ? 0 : Math.max(0, answers.findIndex(answer => !answer));
    if (index < 0) index = 0;
    if ($('sceneGuideComplete')) $('sceneGuideComplete').hidden = true;
    $('sceneGuideSkip').textContent = reviewMode ? 'Close review' : 'Close for now';
    $('sceneGuideSkip').hidden = !reviewMode && assessmentMode();
    const note = document.querySelector('.guide-note');
    if (note) note.textContent = reviewMode
      ? 'Review shows your recorded ABC decisions without revealing the expected findings. Full feedback remains in the final debrief.'
      : 'Use the patient image and the neutral findings in the information window. Record an initial Airway, Breathing, and Circulation decision; “Not enough information at this time” remains available.';
    setPhaseControlsVisible(false);
    $('sceneGuide').classList.remove('is-collapsed');
    $('sceneGuideCollapse')?.setAttribute('aria-expanded', 'true');
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
    setPhaseControlsVisible(true);
    updatePhaseControls();
    if ($('sceneGuideComplete')) $('sceneGuideComplete').hidden = true;
    setLocked(false);
    clearGuideObservation();
    if ($('reviewSceneGuide')) $('reviewSceneGuide').textContent = completedFinding ? 'Review scene size-up' : 'Scene size-up';
  }

  function init() {
    if (initialized || !$('sceneGuide')) return;
    initialized = true;
    $('sceneGuideNext').addEventListener('click', () => {
      const questions = guideQuestions();
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
      } else if (activeGuide === 'scene') {
        saveSceneGuide();
      } else {
        savePrimaryGuide();
      }
    });
    $('sceneGuideSkip').addEventListener('click', pauseGuide);
    $('sceneGuideCollapse')?.addEventListener('click', () => {
      const guide = $('sceneGuide');
      if (!guide) return;
      const collapsed = guide.classList.toggle('is-collapsed');
      $('sceneGuideCollapse').setAttribute('aria-expanded', String(!collapsed));
      $('sceneGuideCollapse').setAttribute('aria-label', collapsed ? 'Expand guided assessment' : 'Minimize guided assessment');
    });
    $('reviewSceneGuide')?.addEventListener('click', () => startGuide(Boolean(completedFinding)));
    $('beginPrimaryAssessment')?.addEventListener('click', () => startPrimary(primaryComplete()));
    $('reviewCompletedSceneGuide')?.addEventListener('click', () => startGuide(true));
    $('startSceneSizeupPhoto')?.addEventListener('click', () => startGuide(Boolean(completedFinding)));
    $('startInitialABCPhoto')?.addEventListener('click', () => startPrimary(primaryComplete()));
    updatePhaseControls();
    const activeScenarioId = new URLSearchParams(location.search).get('case')
      || window.EMSCodeSimPatientRecord?.active?.()?.scenarioId
      || '';
    const arrivalDecisionPending = activeScenarioId === 'horse_crush'
      && !window.EMSCodeSimPatientRecord?.active?.()?.findings?.arrival_parking;

    // The horse-crush case begins with apparatus positioning. Do not open
    // scene size-up until the learner has completed the arrival decision.
    if (arrivalDecisionPending) showReady();
    else if (!completedFinding) startGuide(false);
    else if (!primaryComplete()) startPrimary(false);
    else showReady();
  }

  window.EMSCodeSimSceneGuide = {
    start(review = false) {
      init();
      if (!$('sceneGuide')) return null;
      startGuide(Boolean(review && completedFinding));
      return true;
    },
    startPrimary(review = false) {
      init();
      if (!$('sceneGuide')) return null;
      startPrimary(Boolean(review && primaryComplete()));
      return true;
    },
    isComplete() {
      return Boolean(completedFinding);
    },
    isPrimaryComplete() {
      return primaryComplete();
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
