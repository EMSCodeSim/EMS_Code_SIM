(() => {
  'use strict';
  const ID = 'horse_crush';
  const defs = window.EMSCodeSimScenarioDefinitions;

  // Load the shared decision-making layer for the four finished learning cases.
  // It is intentionally defensive and waits for DOMContentLoaded, so this bootstrap
  // can stay ahead of visual-patient.js without creating a race.
  if (!document.querySelector('script[data-scenario-learning-upgrade]')) {
    const learningScript = document.createElement('script');
    learningScript.src = '/vitals/scenario-learning-upgrade.js?v=2401';
    learningScript.async = false;
    learningScript.dataset.scenarioLearningUpgrade = '1';
    document.head.appendChild(learningScript);
  }

  // Patient deterioration must outrank routine guided-start observations in the
  // visible update window. This helper watches the shared care log for condition
  // changes and surfaces them immediately on every visual-patient scenario.
  if (!document.querySelector('script[data-condition-alert-priority]')) {
    const alertScript = document.createElement('script');
    alertScript.src = '/vitals/scenario-condition-alert-priority.js?v=100';
    alertScript.async = false;
    alertScript.dataset.conditionAlertPriority = '1';
    document.head.appendChild(alertScript);
  }

  if (!defs) return;

  // This compatibility layer makes the scenario work even when a browser or CDN
  // serves an older cached scenario-definitions.js file.
  defs.CATALOG[ID] ||= {
    id: ID,
    title: 'Horse-Crush Hip Injury',
    patient: '64-year-old adult',
    scene: 'Horse facility • outside south barn',
    dispatch: 'Reported fall at a horse facility. A BLS engine crew is already on scene.',
    goal: 'Assess before moving, protect the injured leg, plan packaging, manage pain, and reassess.'
  };
  defs.PROFILES[ID] ||= {
    patient: '64-year-old adult',
    dispatch: 'Reported fall at a horse facility. A BLS engine crew is already on scene.',
    scene: 'Outside the south barn on packed dirt',
    vitals: {
      blood_pressure: '130/90', systolic: 130, diastolic: 90,
      pulse: 75, respirations: 16, spo2: 98,
      blood_glucose: 104, temperature: '98.6°F', avpu: 'A', mental_status: 'A&O x4',
      skin: 'Warm, pink, and dry',
      pupils: 'Pupils equal, round, and reactive to light at 3 mm bilaterally; gaze midline; tracking smooth',
      pupil_equal: true, pupil_left_reactive: true, pupil_right_reactive: true, pupil_gaze: 'midline', pupil_tracking: 'smooth',
      breath_sounds: 'Clear and equal bilaterally', breath_sound_type: 'normal'
    },
    sample: {
      title: 'Horse-Crush Hip Injury',
      description: 'A 64-year-old was compressed between two horses and fell to the dirt.',
      finding: 'Significant blunt mechanism with isolated severe left-hip pain',
      detail: 'S: Severe left-hip pain, worse with movement; denies head, neck, back, chest, or abdominal pain. A: Obtain from patient. M: Obtain from patient, including anticoagulants. P: Obtain from patient. L: Obtain from patient. E: Compressed between two horses and fell from standing; no loss of consciousness.',
      normality: 'not-normal', priority: 'events', action: 'trauma-assessment'
    },
    caseIndex: { airway: 0, breathing: 0, sample: 0, chest: 0, perfusion: 0, trauma: 5, abdominal: 0, motor_sensory: 5, pat: 0 }
  };
  defs.PHASE_PLANS[ID] ||= {
    requiredFindings: ['arrival_parking'],
    appropriateFindings: ['airway','breathing','perfusion','mental_status','blood_pressure','pulse','respirations','spo2','neck_back','chest_assessment','abdominal_assessment','pelvis_hip','left_leg','distal_csm','pain','pupils','skin','sample','trauma_assessment'],
    optionalFindings: ['blood_glucose','temperature','breath_sounds','motor_sensory'],
    notIndicatedFindings: ['pediatric_assessment_triangle','rule_of_nines']
  };
  defs.PATIENT_CASES[ID] ||= {
    title: 'Horse-Crush Hip Injury',
    visible: 'Alert patient supine on dirt outside the south barn with the left knee flexed',
    image: '/vitals/assets/horse-crush/patient-initial.webp',
    imageMode: 'horse-crush',
    sceneClues: ['BLS engine crew already on scene','Patient remains on the ground','Left leg held flexed in a position of comfort'],
    recommended: ['airway','breathing','perfusion','mental_status','neck_back','chest_assessment','abdominal_assessment','pelvis_hip','left_leg','distal_csm','blood_pressure','pulse','respirations','spo2','pain','sample'],
    primary: {
      airway: { initial: 'Patient is speaking; confirm patency', action: 'Assess', urgent: false },
      breathing: { initial: 'Breathing visible; confirm adequacy', action: 'Assess', urgent: false },
      perfusion: { initial: 'No major external bleeding visible', action: 'Assess', urgent: false }
    },
    treatments: ['Manual support of injured leg','Protocol-directed pain management','Coordinated scoop transfer in position of comfort','Padding and serial distal CSM reassessment']
  };
  if (!Array.isArray(defs.CONDITION_STAGES[ID]) || !defs.CONDITION_STAGES[ID].length) {
    defs.CONDITION_STAGES[ID] = [
      {
        id:'pain_delay', after:240, title:'Pain increasing with delay',
        text:'“This is really starting to hurt. Can you help me?” The patient is becoming more tense while the injured leg remains untreated. Reassess pain and vital signs and make a stabilization plan.',
        targets:['pain','pulse','blood_pressure','respirations'],
        blockedBy:['manual_leg_support','position_comfort','blanket_support','splint','pain_control'],
        imageMode:'horse-crush-pain'
      },
      {
        id:'prolonged_delay', after:480, title:'Prolonged untreated pain',
        text:'“Can you please do something for this pain?” The patient is increasingly restless after a prolonged delay without meaningful stabilization or pain relief. Reassess the patient and move care forward.',
        targets:['pain','pulse','blood_pressure','respirations'],
        blockedBy:['manual_leg_support','position_comfort','blanket_support','splint','pain_control'],
        imageMode:'horse-crush-pain-worse'
      }
    ];
  }
  if (!Array.isArray(defs.TREATMENT_PLANS[ID]) || !defs.TREATMENT_PLANS[ID].length) {
    defs.TREATMENT_PLANS[ID] = [
      { id:'manual_leg_support', label:'Assign manual support to the injured leg', summary:'Support the injured leg in the position the patient tolerates.', category:'trauma', evidence:[], targets:['left_leg','pain','distal_csm'], response:'The patient says the sharp hip pain is easier to tolerate while the leg is kept still.', outcomeClass:'appropriate-effective', reassessmentRequired:true },
      { id:'position_comfort', label:'Maintain position of comfort', summary:'Keep the left knee flexed rather than forcing the extremity straight.', category:'trauma', evidence:[], targets:['left_leg','pain'], response:'The patient relaxes slightly when the leg remains flexed and supported.', outcomeClass:'appropriate-effective', reassessmentRequired:true },
      { id:'blanket_support', label:'Pad and support with blankets / pillows', summary:'Prevent the leg from dropping, rotating, or shifting.', category:'trauma', evidence:[], targets:['left_leg','pain','distal_csm'], response:'Padding reduces movement-related pain.', outcomeClass:'appropriate-effective', reassessmentRequired:true },
      { id:'splint', label:'Splint / support the injured leg in position of comfort', summary:'Use non-traction stabilization without forcing the hip or knee straight.', category:'trauma', evidence:[], targets:['left_leg','pain','distal_csm'], response:'The supported leg moves less and the patient reports less sharp pain.', outcomeClass:'appropriate-effective', reassessmentRequired:true, documentation:[{name:'device',label:'Support / splint method',type:'select',required:true,options:['Vacuum splint / vacuum mattress','Padded blanket or pillow support','Other non-traction support in position of comfort']}] },
      { id:'pain_control', label:'Address pain before movement', summary:'Use support and protocol-appropriate analgesia or ALS pain management.', category:'medications', evidence:[], targets:['pain','mental_status','respirations','blood_pressure'], response:'Pain eases at rest, although hip movement still causes a sharp increase.', outcomeClass:'appropriate-effective', reassessmentRequired:true, documentation:[{name:'method',label:'Pain-control method',type:'select',required:true,options:['Positioning/support only','Request ALS / advanced pain management','Protocol-authorized EMT medication or intervention','Other locally authorized option']},{name:'medication',label:'Medication, if used',placeholder:'Optional medication'},{name:'dose',label:'Dose, if used',placeholder:'Dose and units'},{name:'route',label:'Route, if used',placeholder:'Route'}] },
      { id:'oxygen', label:'Administer oxygen', summary:'Use only if an oxygenation or respiratory indication develops.', category:'breathing', evidence:[], targets:['spo2','breathing','respirations'], response:'The patient tolerates oxygen, but it does not change the isolated hip complaint.', outcomeClass:'unnecessary', reassessmentRequired:false, documentation:[{name:'device',label:'Device',type:'select',required:true,options:['Nasal cannula','Non-rebreather mask','Other']},{name:'flow',label:'Flow / setting',required:true,placeholder:'L/min or device setting'}] },
      { id:'scoop_position_comfort', label:'Scoop stretcher with minimal movement', summary:'Place the scoop around the patient while maintaining leg support.', category:'trauma', evidence:[], targets:['left_leg','pain','distal_csm'], response:'The patient is transferred without needing to straighten the painful leg.', outcomeClass:'appropriate-effective', reassessmentRequired:true },
      { id:'vacuum_mattress', label:'Vacuum mattress / molded support', summary:'Mold the device around the patient and flexed leg if available.', category:'trauma', evidence:[], targets:['left_leg','pain','distal_csm'], response:'The molded support holds the patient and leg securely in position of comfort.', outcomeClass:'appropriate-effective', reassessmentRequired:true },
      { id:'board_transfer', label:'Long board as a transfer device', summary:'Use only as a short transfer aid with padding and coordinated movement.', category:'trauma', evidence:[], targets:['left_leg','pain','distal_csm'], response:'Transfer is possible with careful padding and leg support.', outcomeClass:'defensible', reassessmentRequired:true },
      { id:'pelvic_binder', label:'Apply a pelvic binder', summary:'Use only when findings support pelvic instability or a protocol indication.', category:'trauma', evidence:[], targets:['pelvis_hip','pain','distal_csm'], response:'The binder does not improve the localized hip pain in this presentation.', outcomeClass:'unnecessary', reassessmentRequired:true },
      { id:'traction_splint', label:'Apply a traction splint', summary:'Hip pain alone is not a femoral-shaft traction-splint indication.', category:'trauma', evidence:[], targets:['left_leg','pain','distal_csm'], response:'Traction causes a sharp increase in hip pain. Stop the maneuver.', outcomeClass:'contraindicated', reassessmentRequired:true },
      { id:'stand_pivot', label:'Assist patient to stand and pivot', summary:'Attempt weight bearing only if the findings support it.', category:'movement', evidence:[], targets:['left_leg','pain','distal_csm'], response:'The patient cannot safely bear weight because of severe hip pain.', outcomeClass:'contraindicated', reassessmentRequired:true },
      { id:'force_straight', label:'Straighten the leg before moving', summary:'Do not force the painful leg into a conventional flat position.', category:'movement', evidence:[], targets:['left_leg','pain','distal_csm'], response:'The patient cries out with a marked increase in hip pain. Stop and return to the tolerated position.', outcomeClass:'contraindicated', reassessmentRequired:true },
      { id:'heat_conservation', label:'Prevent heat loss', summary:'Use blankets and environmental protection.', category:'circulation', evidence:[], targets:['skin','perfusion'], response:'The patient remains warm while packaging continues.', outcomeClass:'appropriate-effective', reassessmentRequired:false },
      { id:'reassess_distal_csm', label:'Repeat distal CSM after movement', summary:'Repeat circulation, sensation, and movement after stabilization or movement.', category:'reassessment', evidence:[], targets:['distal_csm'], response:'Distal pulse, sensation, and movement remain intact.', outcomeClass:'appropriate-effective', reassessmentRequired:false }
    ];
  }
})();
