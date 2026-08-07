(() => {
  'use strict';
  const ID = 'horse_crush';
  const defs = window.EMSCodeSimScenarioDefinitions;
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
      temperature: '98.4°F', avpu: 'A', mental_status: 'A&O x4',
      skin: 'Warm, pink, dry', pupils: 'Pupils equal and reactive',
      breath_sounds: 'Clear and equal bilaterally', breath_sound_type: 'normal'
    },
    sample: {
      title: 'Horse-Crush Hip Injury',
      description: 'A 64-year-old was compressed between two horses and fell to the dirt.',
      finding: 'Significant blunt mechanism with isolated severe left-hip pain',
      detail: 'S: Severe left-hip pain, worse with movement; denies head, neck, back, chest, or abdominal pain. A: Obtain from patient. M: Obtain from patient, including anticoagulants. P: Obtain from patient. L: Obtain from patient. E: Compressed between two horses and fell from standing; no loss of consciousness.',
      normality: 'not-normal', priority: 'events', action: 'trauma-assessment'
    },
    caseIndex: { airway: 0, breathing: 0, sample: 0, chest: 0, perfusion: 0, trauma: 0, abdominal: 0, motor_sensory: 0, pat: 0 }
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
  defs.CONDITION_STAGES[ID] ||= [];
  defs.TREATMENT_PLANS[ID] ||= [];
})();
