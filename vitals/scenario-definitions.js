(() => {
  'use strict';

  // Single source of truth for patient scenario content.
  // Add or revise patient facts here instead of editing each simulator screen.

  const CATALOG = Object.freeze({
    asthma: {
      id: 'asthma', title: 'Respiratory Distress', patient: '24-year-old adult',
      dispatch: 'Worsening shortness of breath and wheezing.', scene: 'Apartment; rescue inhaler nearby',
      goal: 'Assess respiratory adequacy, treat, reassess, and report.'
    },
    stroke: {
      id: 'stroke', title: 'Possible Acute Stroke', patient: '68-year-old adult',
      dispatch: 'Sudden speech difficulty and right-sided weakness.', scene: 'Private residence; family present',
      goal: 'Identify time-sensitive neurologic findings and prepare rapid stroke-center transport.'
    },
    hypoglycemia: {
      id: 'hypoglycemia', title: 'Altered Mental Status', patient: '57-year-old adult',
      dispatch: 'Confused, sweaty, and behaving abnormally.', scene: 'Workplace break room',
      goal: 'Find a reversible cause, protect the airway, treat, and reassess.'
    },
    trauma: {
      id: 'trauma', title: 'Blunt Trauma', patient: '36-year-old adult',
      dispatch: 'Two-vehicle collision with chest and abdominal pain.', scene: 'Roadway collision; moderate vehicle damage',
      goal: 'Find immediate threats, support ABCs, and expedite trauma transport.'
    },
    pediatric: {
      id: 'pediatric', title: 'Sick Pediatric Patient', patient: '3-year-old child',
      dispatch: 'Fever, poor interaction, and increased work of breathing.', scene: 'Home; caregiver present',
      goal: 'Use the pediatric first look, support ABCs, and reassess response.'
    },
    horse_crush: {
      id: 'horse_crush', title: 'Horse-Crush Hip Injury', patient: '64-year-old adult',
      dispatch: 'Reported fall at a horse facility; a BLS engine crew is already on scene.',
      scene: 'Outside the south barn; scene reported safe; patient remains on the ground',
      goal: 'Perform a deliberate trauma assessment, protect the injured leg, plan movement, treat pain, and reassess.'
    }
  });

  const PROFILES = {
    asthma: {
      patient: '24-year-old adult',
      dispatch: 'Worsening shortness of breath and wheezing.',
      scene: 'Apartment; rescue inhaler nearby',
      vitals: {
        blood_pressure: '138/84', systolic: 138, diastolic: 84, pulse: 118, respirations: 28, spo2: 92,
        blood_glucose: 104, temperature: '98.7°F', avpu: 'A', mental_status: 'A&O x4',
        skin: 'Warm, pink, mildly diaphoretic',
        pupils: 'Pupils equal; left and right reactive to light; gaze midline; tracking smooth',
        pupil_equal: true, pupil_left_reactive: true, pupil_right_reactive: true, pupil_gaze: 'midline', pupil_tracking: 'smooth',
        breath_sounds: 'Expiratory wheezes bilaterally', breath_sound_type: 'wheeze'
      },
      sample: {
        title: 'Respiratory Distress',
        description: 'A 24-year-old with worsening shortness of breath and wheezing is seated upright in an apartment with a rescue inhaler nearby.',
        finding: 'History supports an acute asthma exacerbation',
        detail: 'S: Worsening shortness of breath, chest tightness, cough, and wheezing; denies fever, chest pain, hives, facial swelling, or choking. A: No known medication allergies. M: Albuterol rescue inhaler; used two doses today with only brief improvement. P: Asthma since childhood; one prior emergency visit, no prior intubation. L: Ate a sandwich approximately 3 hours ago. E: Symptoms began after cleaning a dusty room and worsened over about 2 hours despite the inhaler.',
        normality: 'not-normal', priority: 'events', action: 'rapid-transport',
        example: 'SAMPLE obtained: patient reports worsening shortness of breath, chest tightness, cough, and wheezing after cleaning a dusty room. NKDA. Uses an albuterol rescue inhaler and took two doses today with only brief relief. History of asthma with one prior emergency visit and no prior intubation. Last oral intake approximately 3 hours ago. Airway and breathing monitored, indicated respiratory treatment provided, and response reassessed.'
      },
      caseIndex: { airway: 0, breathing: 1, sample: 0, chest: 0, perfusion: 0, trauma: 0, abdominal: 0, motor_sensory: 0, pat: 0 }
    },
    stroke: {
      patient: '68-year-old adult',
      dispatch: 'Sudden speech difficulty and right-sided weakness.',
      scene: 'Private residence; family present',
      vitals: {
        blood_pressure: '188/102', systolic: 188, diastolic: 102, pulse: 88, respirations: 18, spo2: 96,
        blood_glucose: 118, temperature: '98.4°F', avpu: 'A', mental_status: 'A&O x2 with acute speech difficulty',
        skin: 'Warm, pink, dry',
        pupils: 'Pupils equal; left and right reactive to light; left gaze deviation; tracking impaired to the right',
        pupil_equal: true, pupil_left_reactive: true, pupil_right_reactive: true, pupil_gaze: 'left-deviation', pupil_tracking: 'impaired',
        breath_sounds: 'Clear and equal bilaterally', breath_sound_type: 'normal'
      },
      sample: {
        title: 'Possible Acute Stroke',
        description: 'A 68-year-old has sudden speech difficulty and right-sided weakness at home with family present.',
        finding: 'Sudden focal neurologic symptoms with a known last-known-well time',
        detail: 'S: Sudden slurred speech, right facial droop, and right arm weakness; denies trauma, seizure, headache, or chest pain. A: Penicillin causes a rash. M: Lisinopril and atorvastatin; no anticoagulant reported. P: Hypertension and high cholesterol; no prior stroke. L: Breakfast approximately 2 hours ago. E: Family saw the patient normal at 09:10; symptoms began suddenly at 09:25 while drinking coffee.',
        normality: 'not-normal', priority: 'events', action: 'rapid-transport',
        example: 'SAMPLE obtained from patient and family: sudden slurred speech, right facial droop, and right arm weakness began at approximately 09:25; last known well was 09:10. Penicillin allergy causes rash. Medications include lisinopril and atorvastatin. History of hypertension and hyperlipidemia without prior stroke. Last oral intake was breakfast approximately 2 hours ago. Glucose checked, stroke findings documented, and rapid stroke-center transport prioritized.'
      },
      caseIndex: { airway: 0, breathing: 0, sample: 0, chest: 0, perfusion: 0, trauma: 0, abdominal: 0, motor_sensory: 1, pat: 0 }
    },
    hypoglycemia: {
      patient: '57-year-old adult',
      dispatch: 'Confused, sweaty, and behaving abnormally.',
      scene: 'Workplace break room',
      vitals: {
        blood_pressure: '126/76', systolic: 126, diastolic: 76, pulse: 110, respirations: 20, spo2: 97,
        blood_glucose: 48, temperature: '98.1°F', avpu: 'V', mental_status: 'Confused; responds to verbal stimuli',
        skin: 'Pale, cool, diaphoretic',
        pupils: 'Pupils equal; left and right reactive to light; gaze midline; tracking slow but intact',
        pupil_equal: true, pupil_left_reactive: true, pupil_right_reactive: true, pupil_gaze: 'midline', pupil_tracking: 'smooth',
        breath_sounds: 'Clear and equal bilaterally', breath_sound_type: 'normal'
      },
      sample: {
        title: 'Altered Mental Status',
        description: 'A 57-year-old with diabetes is confused, pale, cool, and diaphoretic in a workplace break room.',
        finding: 'Insulin use and missed food strongly support hypoglycemia',
        detail: 'S: Confusion, weakness, shakiness, and diaphoresis; coworker denies witnessed seizure or trauma. A: No known allergies. M: Rapid-acting and long-acting insulin; usual morning insulin was taken. P: Type 1 diabetes. L: No food since dinner the previous evening; skipped breakfast because of an early shift. E: Became progressively confused and sweaty at work about 20 minutes before EMS arrival.',
        normality: 'not-normal', priority: 'intake', action: 'glucose',
        example: 'SAMPLE obtained from the patient and coworker: progressive confusion, weakness, shakiness, and diaphoresis developed after the patient took usual morning insulin but skipped breakfast. NKDA. History of type 1 diabetes treated with rapid- and long-acting insulin. No food since the previous evening. Blood glucose was assessed, hypoglycemia treated as appropriate, and mental status and glucose reassessed.'
      },
      caseIndex: { airway: 0, breathing: 0, sample: 0, chest: 0, perfusion: 0, trauma: 0, abdominal: 0, motor_sensory: 2, pat: 0 }
    },
    trauma: {
      patient: '36-year-old adult',
      dispatch: 'Two-vehicle collision with chest and abdominal pain.',
      scene: 'Roadway collision; moderate vehicle damage',
      vitals: {
        blood_pressure: '94/62', systolic: 94, diastolic: 62, pulse: 124, respirations: 30, spo2: 90,
        blood_glucose: 132, temperature: '97.5°F', avpu: 'V', mental_status: 'Confused; responds to verbal stimuli',
        skin: 'Pale, cool, clammy',
        pupils: 'Pupils equal; left and right reactive to light; gaze midline; tracking smooth',
        pupil_equal: true, pupil_left_reactive: true, pupil_right_reactive: true, pupil_gaze: 'midline', pupil_tracking: 'smooth',
        breath_sounds: 'Diminished on the left; present on the right', breath_sound_type: 'diminished'
      },
      sample: {
        title: 'Blunt Trauma',
        description: 'A 36-year-old involved in a two-vehicle collision has chest and abdominal pain with signs of poor perfusion.',
        finding: 'Mechanism and symptoms raise concern for serious chest and internal abdominal injury',
        detail: 'S: Severe left chest pain, diffuse abdominal pain, shortness of breath, and dizziness; denies loss of consciousness. A: No known allergies. M: No daily medications and no anticoagulants. P: No significant medical history. L: Ate lunch approximately 1 hour before the collision. E: Restrained driver in a frontal collision at roadway speed; airbags deployed, steering wheel was deformed, and the patient required assistance out of the vehicle.',
        normality: 'not-normal', priority: 'events', action: 'rapid-transport',
        example: 'SAMPLE obtained: patient reports severe left chest pain, diffuse abdominal pain, dyspnea, and dizziness following a frontal motor-vehicle collision. Denies loss of consciousness. NKDA. Takes no daily medications or anticoagulants and reports no significant medical history. Last oral intake approximately 1 hour before the crash. Significant mechanism with steering-wheel deformity identified; chest and abdominal injury supported, shock care initiated, and rapid trauma transport prioritized.'
      },
      caseIndex: { airway: 5, breathing: 4, sample: 0, chest: 2, perfusion: 2, trauma: 3, abdominal: 2, motor_sensory: 4, pat: 0 }
    },
    pediatric: {
      patient: '3-year-old child',
      dispatch: 'Fever, poor interaction, and increased work of breathing.',
      scene: 'Home; caregiver present',
      vitals: {
        blood_pressure: '82/48', systolic: 82, diastolic: 48, pulse: 148, respirations: 38, spo2: 89,
        blood_glucose: 92, temperature: '103.1°F', avpu: 'V', mental_status: 'Poor interaction; responds to caregiver voice',
        skin: 'Flushed, hot, mildly mottled',
        pupils: 'Pupils equal; left and right reactive to light; gaze midline; tracks caregiver',
        pupil_equal: true, pupil_left_reactive: true, pupil_right_reactive: true, pupil_gaze: 'midline', pupil_tracking: 'smooth',
        breath_sounds: 'Coarse crackles bilaterally', breath_sound_type: 'crackles'
      },
      sample: {
        title: 'Sick Pediatric Patient',
        description: 'A 3-year-old has fever, poor interaction, and increased work of breathing at home with a caregiver present.',
        finding: 'Several days of respiratory illness with fever and worsening breathing',
        detail: 'S: Fever, cough, decreased activity, poor fluid intake, and increasing work of breathing; no vomiting, diarrhea, rash, choking episode, or known trauma. A: No known allergies. M: Children’s acetaminophen given 4 hours ago; no daily medications. P: Born at term; immunizations current; no chronic lung or heart disease. L: Small amount of juice approximately 3 hours ago and little solid food today. E: Cough and fever began 2 days ago; breathing became faster overnight and the child became difficult to engage this morning.',
        normality: 'not-normal', priority: 'events', action: 'rapid-transport',
        example: 'SAMPLE obtained from caregiver: child has had cough and fever for 2 days with decreased activity and intake; breathing worsened overnight and interaction declined this morning. NKDA. Acetaminophen was given approximately 4 hours ago; no daily medications. Born at term, immunizations current, and no chronic cardiopulmonary history. Last intake was a small amount of juice about 3 hours ago. Airway, breathing, hydration, temperature, and perfusion assessed with supportive care and prompt transport.'
      },
      caseIndex: { airway: 3, breathing: 3, sample: 0, chest: 0, perfusion: 5, trauma: 0, abdominal: 5, motor_sensory: 2, pat: 2 }
    },
    horse_crush: {
      patient: '64-year-old adult',
      dispatch: 'Reported fall at a horse facility; a BLS engine crew is already on scene.',
      scene: 'Outside the south barn; scene reported safe; patient remains on the ground',
      vitals: {
        blood_pressure: '130/90', systolic: 130, diastolic: 90, pulse: 75, respirations: 16, spo2: 98,
        blood_glucose: 104, temperature: '98.6°F', avpu: 'A', mental_status: 'A&O x4',
        skin: 'Warm, pink, and dry',
        pupils: 'Pupils equal, round, and reactive to light at 3 mm bilaterally; gaze midline; tracking smooth',
        pupil_equal: true, pupil_left_reactive: true, pupil_right_reactive: true, pupil_gaze: 'midline', pupil_tracking: 'smooth',
        breath_sounds: 'Clear and equal bilaterally', breath_sound_type: 'normal'
      },
      sample: {
        title: 'Horse-Crush Hip Injury',
        description: 'A 64-year-old was compressed between two horses, fell from standing, and remains on the dirt outside the south barn with severe left-hip pain.',
        finding: 'Significant blunt mechanism with isolated severe left-hip pain and inability to lower the leg',
        detail: 'S: Left-hip pain rated 8/10, radiating down the left leg, and sharply worse with movement; unable to straighten or lower the left leg. Denies head strike, loss of consciousness, neck pain, back pain, chest pain, shortness of breath, or abdominal pain. A: No medication allergy is reported during the scenario interview. M: Wellbutrin. P: No additional significant history is initially reported. L: Ate earlier today. E: A second horse became spooked and compressed the patient between two horses, knocking her to the ground; she denies being stepped on.',
        normality: 'not-normal', priority: 'events', action: 'supportive',
        example: 'SAMPLE obtained: patient reports severe left-hip pain after being compressed between two horses and falling from standing. Denies head strike, loss of consciousness, neck or back pain, chest pain, dyspnea, and abdominal pain. Wellbutrin is the only reported medication. The affected leg remains in a flexed position of comfort. A coordinated low-movement transfer plan, pain management, and serial distal neurovascular checks are indicated.'
      },
      caseIndex: { airway: 0, breathing: 0, sample: 0, chest: 0, perfusion: 0, trauma: 5, abdominal: 0, motor_sensory: 5, pat: 0 }
    }
  };

  const PHASE_PLANS = Object.freeze({
    asthma: {
      requiredFindings: ['scene_size_up','airway','breathing','perfusion','respirations','breath_sounds','spo2'],
      appropriateFindings: ['pulse','blood_pressure','skin','sample'],
      optionalFindings: ['mental_status','pupils','temperature','blood_glucose','pain'],
      notIndicatedFindings: ['motor_sensory','chest_assessment','abdominal_assessment','trauma_assessment','pediatric_assessment_triangle','rule_of_nines']
    },
    stroke: {
      requiredFindings: ['scene_size_up','airway','breathing','perfusion','mental_status','motor_sensory','blood_glucose','blood_pressure','pulse','respirations','spo2','sample'],
      appropriateFindings: ['pupils','skin','breath_sounds'],
      optionalFindings: ['temperature','pain'],
      notIndicatedFindings: ['chest_assessment','abdominal_assessment','trauma_assessment','pediatric_assessment_triangle','rule_of_nines']
    },
    hypoglycemia: {
      requiredFindings: ['scene_size_up','airway','breathing','perfusion','mental_status','blood_glucose','pulse','blood_pressure','respirations','spo2'],
      appropriateFindings: ['skin','pupils','motor_sensory','sample'],
      optionalFindings: ['temperature','breath_sounds','pain'],
      notIndicatedFindings: ['chest_assessment','abdominal_assessment','trauma_assessment','pediatric_assessment_triangle','rule_of_nines']
    },
    trauma: {
      requiredFindings: ['scene_size_up','airway','breathing','perfusion','respirations','breath_sounds','spo2','pulse','blood_pressure','skin','chest_assessment','trauma_assessment','abdominal_assessment'],
      appropriateFindings: ['mental_status','pupils','pain','sample'],
      optionalFindings: ['blood_glucose','temperature','motor_sensory'],
      notIndicatedFindings: ['pediatric_assessment_triangle','rule_of_nines']
    },
    pediatric: {
      requiredFindings: ['scene_size_up','pediatric_assessment_triangle','airway','breathing','perfusion','respirations','breath_sounds','spo2','pulse','skin'],
      appropriateFindings: ['temperature','blood_pressure','mental_status','sample'],
      optionalFindings: ['pupils','blood_glucose','pain'],
      notIndicatedFindings: ['motor_sensory','chest_assessment','abdominal_assessment','trauma_assessment','rule_of_nines']
    },
    horse_crush: {
      requiredFindings: ['arrival_parking'],
      appropriateFindings: ['airway','breathing','perfusion','mental_status','blood_pressure','pulse','respirations','spo2','neck_back','chest_assessment','abdominal_assessment','pelvis_hip','left_leg','distal_csm','pain','pupils','skin','sample','trauma_assessment'],
      optionalFindings: ['blood_glucose','temperature','breath_sounds','motor_sensory'],
      notIndicatedFindings: ['pediatric_assessment_triangle','rule_of_nines']
    }
  });

  const PATIENT_CASES = {
    asthma: {
      title: 'Respiratory Distress',
      visible: 'Sitting upright, anxious, speaking in short sentences',
      image: '/vitals/assets/scenario-patient-adult-v3.png',
      imageMode: 'respiratory',
      sceneClues: ['Upright position', 'Short sentences', 'Rescue inhaler nearby'],
      recommended: ['airway','breathing','perfusion','respirations','breath_sounds','spo2','skin','pulse','blood_pressure','sample'],
      primary: {
        airway: { initial: 'Unknown — speech suggests airflow', action: 'Assess', urgent: false },
        breathing: { initial: 'Visibly labored', action: 'Assess now', urgent: true },
        perfusion: { initial: 'Pulse appears present', action: 'Assess', urgent: false }
      },
      treatments: ['Position of comfort','Oxygen based on assessment','Assist prescribed inhaler / bronchodilator per protocol']
    },
    stroke: {
      title: 'Possible Acute Stroke',
      visible: 'Awake with abnormal speech and right-sided weakness',
      image: '/vitals/assets/scenario-patient-adult-v3.png',
      imageMode: 'stroke',
      sceneClues: ['Abnormal speech', 'Right arm weakness', 'Family reports sudden onset'],
      recommended: ['airway','breathing','perfusion','mental_status','pupils','motor_sensory','blood_glucose','blood_pressure','pulse','respirations','spo2','sample'],
      primary: {
        airway: { initial: 'Air moving; protection uncertain', action: 'Assess now', urgent: true },
        breathing: { initial: 'Breathing present; adequacy unknown', action: 'Assess', urgent: false },
        perfusion: { initial: 'Pulse appears present', action: 'Assess', urgent: false }
      },
      treatments: ['Airway protection and safe positioning','Establish last known well','Rapid stroke-center transport']
    },
    hypoglycemia: {
      title: 'Altered Mental Status',
      visible: 'Confused, sweaty, and slow to follow commands',
      image: '/vitals/assets/scenario-patient-adult-v3.png',
      imageMode: 'hypoglycemia',
      sceneClues: ['Diaphoretic', 'Confused behavior', 'Diabetic supplies nearby'],
      recommended: ['airway','breathing','perfusion','mental_status','pupils','motor_sensory','blood_glucose','skin','pulse','blood_pressure','respirations','spo2','sample'],
      primary: {
        airway: { initial: 'Open; protection uncertain', action: 'Assess now', urgent: true },
        breathing: { initial: 'Breathing present; adequacy unknown', action: 'Assess', urgent: false },
        perfusion: { initial: 'Pulse present; skin appears abnormal', action: 'Assess', urgent: false }
      },
      treatments: ['Protect the airway','Oral glucose only if swallowing is safe','Ventilation support / naloxone when indicated by findings']
    },
    trauma: {
      title: 'Blunt Trauma',
      visible: 'Pale patient with guarded breathing after a collision',
      image: '/vitals/assets/scenario-patient-adult-v3.png',
      imageMode: 'trauma',
      sceneClues: ['Collision mechanism', 'Guarded chest', 'Pale appearance'],
      recommended: ['airway','breathing','perfusion','respirations','breath_sounds','spo2','chest_assessment','trauma_assessment','abdominal_assessment','skin','blood_pressure','pulse'],
      primary: {
        airway: { initial: 'Unknown after trauma', action: 'Assess now', urgent: true },
        breathing: { initial: 'Guarded and potentially inadequate', action: 'Assess now', urgent: true },
        perfusion: { initial: 'Pulse present; shock possible', action: 'Assess now', urgent: true }
      },
      treatments: ['Airway and ventilation support','Control hemorrhage and prevent heat loss','Rapid trauma transport']
    },
    pediatric: {
      title: 'Sick Pediatric Patient',
      visible: 'Poor interaction with increased work of breathing',
      image: '/vitals/assets/scenario-patient-pediatric-v3.png',
      imageMode: 'pediatric',
      sceneClues: ['Poor interaction', 'Visible retractions', 'Caregiver present'],
      recommended: ['pediatric_assessment_triangle','airway','breathing','perfusion','respirations','breath_sounds','spo2','skin','temperature','pulse'],
      primary: {
        airway: { initial: 'Air moving; patency uncertain', action: 'Assess now', urgent: true },
        breathing: { initial: 'Increased work of breathing', action: 'Assess now', urgent: true },
        perfusion: { initial: 'Circulation present; status unknown', action: 'Assess', urgent: false }
      },
      treatments: ['Position with caregiver when possible','Oxygen or ventilation support based on adequacy','Supportive fever and perfusion care']
    },
    horse_crush: {
      title: 'Horse-Crush Hip Injury',
      visible: 'Alert patient supine on dirt outside the south barn with the left knee flexed',
      image: '/vitals/assets/horse-crush/patient-initial.webp',
      imageMode: 'horse-crush',
      sceneClues: ['BLS engine crew already on scene', 'Patient remains on the ground', 'Left leg held in a flexed position of comfort'],
      recommended: ['airway','breathing','perfusion','mental_status','neck_back','chest_assessment','abdominal_assessment','pelvis_hip','left_leg','distal_csm','blood_pressure','pulse','respirations','spo2','pain','sample'],
      primary: {
        airway: { initial: 'Patient is speaking; patency still must be confirmed', action: 'Assess', urgent: false },
        breathing: { initial: 'Breathing is visible; adequacy still must be confirmed', action: 'Assess', urgent: false },
        perfusion: { initial: 'No major bleeding is visible', action: 'Assess', urgent: false }
      },
      treatments: ['Manual support of the injured leg','Protocol-directed pain management','Coordinated scoop transfer in position of comfort','Padding and serial distal CSM reassessment']
    }
  };

  const CONDITION_STAGES = {
    asthma: [
      { id:'fatigue', after:180, title:'Respiratory fatigue developing', text:'The patient is speaking fewer words per breath. Wheezing is quieter and air movement is decreasing.', targets:['breathing','breath_sounds','respirations','spo2'], blockedBy:['bronchodilator','oxygen'], imageMode:'respiratory-worse' },
      { id:'failure', after:360, title:'Impending respiratory failure', text:'The patient is becoming less responsive. Respiratory effort is weaker and air movement is now poor.', targets:['airway','breathing','mental_status','respirations','spo2'], blockedBy:['bvm','bronchodilator'], imageMode:'critical' }
    ],
    stroke: [
      { id:'neuro_worse', after:240, title:'Neurologic condition worsening', text:'Speech is more difficult to understand and the right-sided weakness is more pronounced.', targets:['mental_status','motor_sensory','airway'], blockedBy:['rapid_transport'], imageMode:'stroke-worse' },
      { id:'airway_risk', after:420, title:'Airway protection is declining', text:'The patient is increasingly drowsy and is no longer managing oral secretions reliably.', targets:['airway','breathing','mental_status','spo2'], blockedBy:['airway_position','rapid_transport'], imageMode:'critical' }
    ],
    hypoglycemia: [
      { id:'ams_worse', after:180, title:'Mental status declining', text:'The patient is harder to arouse and can no longer follow commands consistently.', targets:['mental_status','airway','blood_glucose'], blockedBy:['oral_glucose','airway_support'], imageMode:'hypoglycemia-worse' },
      { id:'unresponsive', after:360, title:'Patient becomes unresponsive', text:'The patient no longer responds to verbal stimuli and airway protection is now uncertain.', targets:['airway','breathing','mental_status','spo2'], blockedBy:['oral_glucose','airway_support'], imageMode:'critical' }
    ],
    trauma: [
      { id:'shock_worse', after:180, title:'Shock is progressing', text:'The patient is more pale and restless. The radial pulse is weaker and faster.', targets:['perfusion','pulse','blood_pressure','skin'], blockedBy:['hemorrhage_shock','rapid_transport'], imageMode:'trauma-worse' },
      { id:'decompensated', after:360, title:'Decompensated shock', text:'The patient is becoming confused with worsening perfusion and increasingly shallow breathing.', targets:['breathing','perfusion','mental_status','pulse','blood_pressure'], blockedBy:['hemorrhage_shock','rapid_transport'], imageMode:'critical' }
    ],
    pediatric: [
      { id:'fatigue', after:180, title:'Pediatric respiratory fatigue', text:'Retractions continue, interaction is poorer, and the child is becoming less active.', targets:['pediatric_assessment_triangle','breathing','respirations','spo2'], blockedBy:['oxygen','caregiver_position'], imageMode:'pediatric-worse' },
      { id:'failure', after:360, title:'Respiratory effort is failing', text:'The child is now minimally responsive with weak respiratory effort and poor air movement.', targets:['airway','breathing','mental_status','respirations','spo2'], blockedBy:['bvm','oxygen'], imageMode:'critical' }
    ],
    horse_crush: []
  };

  const TREATMENT_PLANS = {
    asthma: [
      { id:'position_comfort', label:'Position of comfort', summary:'Allow the patient to remain upright and reduce respiratory effort.', evidence:['breathing'], targets:['breathing','respirations'], response:'The patient tolerates the upright position and can speak with slightly less effort.', effective:'appropriate-effective' },
      { id:'oxygen', label:'Administer oxygen', summary:'Select oxygen based on respiratory effort and measured oxygen saturation.', evidence:['breathing','spo2'], targets:['breathing','spo2','respirations'], response:'Oxygen is applied. The patient remains anxious but oxygenation begins to improve.', effective:'appropriate-effective', documentation:[{name:'device',label:'Device',type:'select',required:true,options:['Nasal cannula','Non-rebreather mask','Other protocol-approved device']},{name:'flow',label:'Flow / setting',required:true,placeholder:'L/min or device setting'}] },
      { id:'bronchodilator', label:'Assist prescribed inhaler / bronchodilator', summary:'Verify indication, medication rights, dose, and local protocol.', evidence:['breathing','breath_sounds'], targets:['breathing','breath_sounds','respirations','spo2'], response:'After bronchodilator treatment, air movement improves and wheezing is less prominent, but reassessment is required.', effective:'appropriate-effective', documentation:[{name:'medication',label:'Medication',required:true,placeholder:'Protocol-approved medication'},{name:'dose',label:'Dose',required:true,placeholder:'Dose or number of puffs'},{name:'route',label:'Route',type:'select',required:true,options:['Nebulized inhalation','Metered-dose inhaler','Other protocol-approved route']}] },
      { id:'bvm', label:'Begin assisted ventilation', summary:'Use only when breathing becomes inadequate.', evidence:['breathing'], targets:['airway','breathing','respirations','spo2'], response:'Assisted ventilation is initiated. Chest rise improves with each ventilation.', requireText:/inadequate|apne|absent|poor air movement/i }
    ],
    stroke: [
      { id:'airway_position', label:'Protect airway and position safely', summary:'Maintain airway protection and prepare for vomiting or deterioration.', evidence:['airway','mental_status'], targets:['airway','breathing','mental_status'], response:'The patient remains positioned safely with the airway monitored continuously.', effective:'appropriate-effective' },
      { id:'glucose_check', label:'Check blood glucose', summary:'Exclude hypoglycemia as a stroke mimic before final destination decisions.', evidence:['mental_status','motor_sensory'], targets:['blood_glucose','mental_status'], response:'Blood glucose is obtained so a reversible stroke mimic can be evaluated.', effective:'appropriate-effective' },
      { id:'rapid_transport', label:'Initiate rapid stroke-center transport', summary:'Use last-known-well time and local destination protocol.', evidence:['motor_sensory','mental_status'], targets:['mental_status','motor_sensory'], response:'Rapid transport is initiated with stroke-center notification and last-known-well information.', effective:'appropriate-effective' }
    ],
    hypoglycemia: [
      { id:'oral_glucose', label:'Administer oral glucose', summary:'Give only when the patient can follow commands and swallow safely.', evidence:['blood_glucose','mental_status','airway'], targets:['blood_glucose','mental_status','airway'], response:'Oral glucose is administered. The patient becomes more alert and follows commands more consistently.', contraindication: rec => {
          const airway=rec?.findings?.airway; const mental=rec?.findings?.mental_status;
          const text=`${airway?.value||''} ${mental?.value||''}`;
          return airway?.status==='abnormal' || /unresponsive|cannot swallow|unable to protect|gurgling|snoring/i.test(text);
        }
      },
      { id:'airway_support', label:'Provide airway support', summary:'Position, suction, or ventilate when airway protection or breathing is inadequate.', evidence:['airway','breathing','mental_status'], targets:['airway','breathing','mental_status','spo2'], response:'Airway support is provided and ventilation is maintained while the reversible cause is treated.', effective:'appropriate-effective' },
      { id:'rapid_transport', label:'Begin transport and request ALS', summary:'Escalate when the patient cannot safely take oral glucose or fails to improve.', evidence:['mental_status','blood_glucose'], targets:['mental_status','blood_glucose'], response:'Transport is initiated and advanced support is requested because the patient remains high risk.', effective:'appropriate-effective' }
    ],
    trauma: [
      { id:'oxygen_ventilation', label:'Provide oxygen or ventilation support', summary:'Treat hypoxia or inadequate ventilation based on the breathing assessment.', evidence:['breathing','spo2','breath_sounds'], targets:['breathing','respirations','spo2','breath_sounds'], response:'Respiratory support is started. Chest movement and oxygenation require immediate reassessment.', effective:'appropriate-effective' },
      { id:'hemorrhage_shock', label:'Control hemorrhage and treat for shock', summary:'Control bleeding, keep the patient warm, and minimize scene delay.', evidence:['perfusion','skin','trauma_assessment','abdominal_assessment'], targets:['perfusion','pulse','blood_pressure','skin'], response:'Bleeding and heat-loss precautions are addressed. Perfusion remains concerning and must be reassessed.', effective:'appropriate-effective' },
      { id:'spinal_motion', label:'Apply spinal-motion precautions when indicated', summary:'Base the decision on mechanism, pain, tenderness, neurologic findings, and reliability.', evidence:['trauma_assessment','motor_sensory'], targets:['trauma_assessment','motor_sensory'], response:'Spinal-motion precautions are applied without delaying treatment of immediate life threats.', effective:'appropriate-effective' },
      { id:'rapid_transport', label:'Initiate rapid trauma transport', summary:'Use the mechanism, primary assessment, and signs of shock to set priority.', evidence:['breathing','perfusion','trauma_assessment'], targets:['breathing','perfusion'], response:'Rapid transport is initiated with early trauma-center notification.', effective:'appropriate-effective' }
    ],
    pediatric: [
      { id:'caregiver_position', label:'Position with caregiver when possible', summary:'Reduce distress while maintaining a position that supports breathing.', evidence:['pediatric_assessment_triangle','breathing'], targets:['breathing','pediatric_assessment_triangle'], response:'The child remains with the caregiver and appears less distressed while breathing is monitored.', effective:'appropriate-effective' },
      { id:'oxygen', label:'Provide tolerated oxygen', summary:'Choose the least upsetting method that still supports oxygenation.', evidence:['breathing','spo2'], targets:['breathing','respirations','spo2'], response:'Oxygen is introduced with caregiver assistance. The child tolerates the device and oxygenation begins to improve.', effective:'appropriate-effective' },
      { id:'bvm', label:'Begin assisted ventilation', summary:'Use when respiratory effort or air movement becomes inadequate.', evidence:['breathing'], targets:['airway','breathing','respirations','spo2'], response:'Assisted ventilation produces visible chest rise and improved air movement.', requireText:/inadequate|poor air movement|fatigue|apne|absent/i },
      { id:'supportive_fever', label:'Provide supportive fever care', summary:'Avoid aggressive cooling; prevent heat loss and continue perfusion assessment.', evidence:['temperature','skin','perfusion'], targets:['temperature','skin','perfusion'], response:'Supportive care is provided while the child is reassessed for respiratory and perfusion changes.', effective:'appropriate-effective' }
    ],
    horse_crush: [
      { id:'manual_leg_support', label:'Assign manual support to the injured leg', summary:'Have one rescuer support the injured leg in the position the patient tolerates while the team assesses and plans movement.', category:'trauma', evidence:[], targets:['left_leg','pain','distal_csm'], response:'With the leg supported and kept still, the patient says the sharp hip pain is easier to tolerate.', outcomeClass:'appropriate-effective', reassessmentRequired:true },
      { id:'position_comfort', label:'Maintain position of comfort', summary:'Allow the patient to keep the left knee flexed rather than forcing the extremity into a textbook position.', category:'trauma', evidence:[], targets:['left_leg','pain'], response:'The patient relaxes slightly when the leg is allowed to remain flexed and supported.', outcomeClass:'appropriate-effective', reassessmentRequired:true },
      { id:'blanket_support', label:'Pad and support with blankets / pillows', summary:'Use padding to prevent the leg from dropping, rotating, or shifting during packaging and transport.', category:'trauma', evidence:[], targets:['left_leg','pain','distal_csm'], response:'The padding supports the flexed leg and reduces movement-related pain.', outcomeClass:'appropriate-effective', reassessmentRequired:true },
      { id:'splint', label:'Splint / support the injured leg in position of comfort', summary:'Use a vacuum device, padded support, or other non-traction stabilization that supports the flexed leg without forcing the hip or knee straight.', category:'trauma', evidence:[], targets:['left_leg','pain','distal_csm'], response:'The supported leg moves less and the patient reports less sharp pain while it remains still.', outcomeClass:'appropriate-effective', reassessmentRequired:true, documentation:[{name:'device',label:'Support / splint method',type:'select',required:true,options:['Vacuum splint / vacuum mattress','Padded blanket or pillow support','Other non-traction support in position of comfort']}] },
      { id:'request_help', label:'Use the engine crew / request additional personnel', summary:'Assign roles for leg support, equipment, lift coordination, and patient communication before movement.', category:'operations', evidence:[], targets:['left_leg','pain'], response:'With roles assigned, the team can move deliberately without losing control of the injured leg.', outcomeClass:'appropriate-effective', reassessmentRequired:false },
      { id:'request_als_scene', label:'Request ALS to the scene', summary:'Request advanced pain management to the scene while continuing BLS assessment, stabilization, and packaging.', category:'operations', evidence:[], targets:['pain','blood_pressure','respirations'], response:'ALS is requested. Continue BLS care and decide whether waiting on scene is justified by response time and transport access.', outcomeClass:'defensible', reassessmentRequired:false },
      { id:'arrange_als_intercept', label:'Transport with an ALS intercept', summary:'Begin prompt transport and arrange an intercept for advanced pain management when this avoids an unnecessary scene delay.', category:'operations', evidence:[], targets:['pain','blood_pressure','respirations'], response:'The patient is packaged for prompt transport while dispatch coordinates an ALS intercept.', outcomeClass:'appropriate-effective', reassessmentRequired:false },
      { id:'transport_without_als_wait', label:'Transport without waiting for ALS', summary:'Continue BLS stabilization and prompt transport when waiting would create an unreasonable delay.', category:'operations', evidence:[], targets:['pain','distal_csm'], response:'BLS care continues during prompt transport without an avoidable scene delay.', outcomeClass:'defensible', reassessmentRequired:false },
      { id:'continue_bls_care', label:'Continue BLS care without requesting ALS', summary:'Use BLS positioning, stabilization, communication, and transport when advanced support is unavailable or not operationally appropriate.', category:'operations', evidence:[], targets:['pain','distal_csm'], response:'The crew continues patient-centered BLS care and reassessment while preparing for transport.', outcomeClass:'defensible', reassessmentRequired:false },
      { id:'pain_control', label:'Address pain before movement', summary:'Use positioning and support and, when allowed by local scope/protocol, coordinate analgesia or ALS pain management before a painful move.', category:'medications', evidence:[], targets:['pain','mental_status','respirations','blood_pressure'], response:'The patient reports that the pain is easing at rest, although hip movement still causes a sharp increase.', outcomeClass:'appropriate-effective', reassessmentRequired:true, documentation:[{name:'method',label:'Pain-control method',type:'select',required:true,options:['Positioning/support only','Request ALS / advanced pain management','Protocol-authorized EMT medication or intervention','Other locally authorized option']},{name:'medication',label:'Medication, if used',placeholder:'Optional medication'},{name:'dose',label:'Dose, if used',placeholder:'Dose and units'},{name:'route',label:'Route, if used',placeholder:'Route'}] },
      { id:'oxygen', label:'Administer oxygen', summary:'Oxygen is available if your assessment identifies hypoxia or another indication.', category:'breathing', evidence:[], targets:['spo2','breathing','respirations'], response:'The patient tolerates oxygen, but there is no meaningful change in the isolated hip complaint.', outcomeClass:'unnecessary', reassessmentRequired:false, documentation:[{name:'device',label:'Device',type:'select',required:true,options:['Nasal cannula','Non-rebreather mask','Other']},{name:'flow',label:'Flow / setting',required:true,placeholder:'L/min or device setting'}] },
      { id:'scoop_position_comfort', label:'Scoop stretcher with minimal movement', summary:'Separate and place the scoop around the patient while a rescuer maintains leg support and the tolerated position.', category:'trauma', evidence:[], targets:['left_leg','pain','distal_csm'], response:'The patient is transferred onto the scoop without needing to straighten the painful leg.', outcomeClass:'appropriate-effective', reassessmentRequired:true },
      { id:'vacuum_mattress', label:'Vacuum mattress / molded support', summary:'Use a coordinated lift and mold the device around the patient and flexed leg if available.', category:'trauma', evidence:[], targets:['left_leg','pain','distal_csm'], response:'The molded support holds the patient and leg securely while preserving the position of comfort.', outcomeClass:'appropriate-effective', reassessmentRequired:true },
      { id:'board_transfer', label:'Long board as a transfer device', summary:'Use only as a short transfer aid with padding and coordinated movement rather than forcing the patient flat for transport.', category:'trauma', evidence:[], targets:['left_leg','pain','distal_csm'], response:'The transfer can be completed, but extra padding and careful leg support are needed to avoid increasing pain.', outcomeClass:'defensible', reassessmentRequired:true },
      { id:'pelvic_binder', label:'Apply a pelvic binder', summary:'Choose this only if your findings support an unstable pelvic injury or local protocol indication.', category:'trauma', evidence:[], targets:['pelvis_hip','pain','distal_csm'], response:'The binder does not improve the localized hip pain and adds unnecessary manipulation in the current presentation.', outcomeClass:'unnecessary', reassessmentRequired:true },
      { id:'traction_splint', label:'Apply a traction splint', summary:'Traction splinting should be based on an appropriate femoral-shaft indication, not hip pain alone.', category:'trauma', evidence:[], targets:['left_leg','pain','distal_csm'], response:'Attempting traction produces a sharp increase in hip pain. The maneuver should be stopped and the plan revised.', outcomeClass:'contraindicated', reassessmentRequired:true },
      { id:'stand_pivot', label:'Assist patient to stand and pivot', summary:'Attempt a weight-bearing transfer if you believe it is appropriate for the findings you have obtained.', category:'movement', evidence:[], targets:['left_leg','pain','distal_csm'], response:'As weight is placed on the left side, the patient has severe hip pain and cannot safely stand. The attempt must be stopped.', outcomeClass:'contraindicated', reassessmentRequired:true },
      { id:'force_straight', label:'Straighten the leg before moving', summary:'Attempt to lower and straighten the leg to fit a conventional transport position.', category:'movement', evidence:[], targets:['left_leg','pain','distal_csm'], response:'The patient cries out with a marked increase in hip pain and resists the movement. Stop and return the leg to the tolerated position.', outcomeClass:'contraindicated', reassessmentRequired:true },
      { id:'heat_conservation', label:'Prevent heat loss', summary:'Use blankets and environmental protection while the patient remains on the ground and during transport.', category:'circulation', evidence:[], targets:['skin','perfusion'], response:'The patient remains warm and comfortable while packaging continues.', outcomeClass:'appropriate-effective', reassessmentRequired:false },
      { id:'reassess_distal_csm', label:'Repeat distal CSM after movement', summary:'Repeat circulation, sensation, and movement after each significant movement or stabilization step.', category:'reassessment', evidence:[], targets:['distal_csm'], response:'Distal pulse, sensation, and movement remain intact after the movement.', outcomeClass:'appropriate-effective', reassessmentRequired:false },
      { id:'trauma_transport', label:'Begin transport', summary:'Choose transport timing, priority, and destination based on mechanism, findings, patient age, pain, vitals, and local destination guidance.', category:'transport', evidence:[], targets:['pain','distal_csm'], response:'The patient is moved to the ambulance with the injured leg supported and ongoing reassessment planned.', outcomeClass:'appropriate-effective', reassessmentRequired:true }
    ]
  };

  function get(caseId) {
    const id = Object.prototype.hasOwnProperty.call(CATALOG, caseId) ? caseId : 'asthma';
    return {
      id,
      catalog: CATALOG[id],
      profile: PROFILES[id],
      phasePlan: PHASE_PLANS[id],
      patient: PATIENT_CASES[id],
      conditionStages: CONDITION_STAGES[id] || [],
      treatmentPlans: TREATMENT_PLANS[id] || []
    };
  }

  function validate() {
    const errors = [];
    Object.keys(CATALOG).forEach(id => {
      ['PROFILES','PHASE_PLANS','PATIENT_CASES','CONDITION_STAGES','TREATMENT_PLANS'].forEach(group => {
        const source = { PROFILES, PHASE_PLANS, PATIENT_CASES, CONDITION_STAGES, TREATMENT_PLANS }[group];
        if (!source[id]) errors.push(`${id}: missing ${group}`);
      });
      if (PROFILES[id]?.patient !== CATALOG[id]?.patient) errors.push(`${id}: patient description mismatch`);
      if (PROFILES[id]?.dispatch !== CATALOG[id]?.dispatch) errors.push(`${id}: dispatch mismatch`);
      if (PROFILES[id]?.scene !== CATALOG[id]?.scene) errors.push(`${id}: scene mismatch`);
      if (PATIENT_CASES[id]?.title !== CATALOG[id]?.title) errors.push(`${id}: title mismatch`);
    });
    return errors;
  }

  window.EMSCodeSimScenarioDefinitions = Object.freeze({
    CATALOG, PROFILES, PHASE_PLANS, PATIENT_CASES, CONDITION_STAGES, TREATMENT_PLANS, get, validate
  });
})();
