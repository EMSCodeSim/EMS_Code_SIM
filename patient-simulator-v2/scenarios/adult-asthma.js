/**
 * Adult Asthma / Respiratory Distress — first complete V2 scenario definition.
 * Structured data is the source of truth for clinical facts.
 */
(function (global) {
  'use strict';

  const adultAsthma = Object.freeze({
    scenarioMetadata: {
      id: 'adult-asthma',
      title: 'Adult Asthma / Respiratory Distress',
      version: '2.0.0',
      level: 'EMT',
      estimatedMinutes: 25,
      educationalDisclaimer: 'Educational simulation only. Does not replace local protocols, medical direction, clinical judgment, or certification requirements. Not affiliated with NREMT exam content.',
      patientAge: 28,
      patientSex: 'female',
      setting: 'Public park'
    },

    dispatch: {
      nature: 'Respiratory distress',
      text: 'Medic 2, respond to Riverside Park near the south pavilion for a 28-year-old female with difficulty breathing and wheezing. Bystanders report she is upright and speaking in short sentences. Time out 14:02.',
      priority: 'emergent',
      location: 'Riverside Park — south pavilion',
      notes: ['Scene reported safe', 'Bystanders on scene', 'No hazards reported']
    },

    patientProfile: {
      name: 'Jordan Hale',
      age: 28,
      sex: 'female',
      chiefComplaint: 'difficulty breathing',
      onset: 'approximately 20 minutes ago',
      history: ['asthma'],
      medications: ['albuterol inhaler'],
      allergies: 'NKDA',
      inhalerAttempts: 3,
      previousHospitalizations: 2,
      previousIntubation: false,
      anaphylaxis: false
    },

    conversationFacts: {
      chiefComplaint: 'difficulty breathing',
      onset: 'approximately 20 minutes ago',
      history: ['asthma'],
      medications: ['albuterol inhaler'],
      allergies: 'NKDA',
      inhalerAttempts: 3,
      previousHospitalizations: 2,
      previousIntubation: false,
      trigger: 'I was walking in the park and suddenly couldn\'t catch my breath. It\'s dusty and windy today.',
      severityDescription: 'It\'s hard to breathe. I can only get a few words out at a time.',
      severePhrase: 'Worse... can\'t... get air...',
      improvingPhrase: 'A little better — still tight, but I can talk more.',
      chestPain: 'No chest pain — just tightness from not getting air.',
      fever: 'No fever. This came on pretty fast.',
      lastOralIntake: 'I had a sandwich about three hours ago.',
      defaultReply: 'I\'m having a hard time talking. What do you need to know?'
    },

    sceneExperience: {
      targets: {
        patient: { label: 'Patient', kind: 'dynamic-video' },
        environment: { label: 'Scene', kind: 'still', src: '', alt: 'Riverside Park scene surrounding the patient' },
        fire: { label: 'Fire Crew', kind: 'still', src: '', alt: 'Fire crew already on scene' },
        bystander: { label: 'Friend', kind: 'still', src: '', alt: 'Friend who was with the patient' },
        partner: { label: 'Partner', kind: 'still', src: '', alt: 'EMS partner' }
      },
      clues: [
        { id: 'position', target: 'patient', label: 'Observe patient position', finding: 'Patient is seated upright, leaning forward, with visible increased work of breathing.' },
        { id: 'inhaler', target: 'environment', label: 'Inspect the bench', finding: 'A rescue inhaler is visible beside the patient on the bench.' },
        { id: 'environment', target: 'environment', label: 'Look around the scene', finding: 'The patient is outdoors near a grassy field. Conditions are dusty and windy.' }
      ],
      contacts: {
        fire: {
          fallback: 'Fire crew: That is all we have so far.',
          facts: [
            { keys: ['find','found','arrival','before'], answer: 'Fire crew: We found her seated upright and very short of breath. She has worsened since we arrived.' },
            { keys: ['vital','spo2','sat','oxygen'], answer: 'Fire crew: Our initial oxygen saturation was 89% on room air.' },
            { keys: ['treatment','give','done'], answer: 'Fire crew: We have not administered medication.' },
            { keys: ['history','asthma','inhaler'], answer: 'Fire crew: She told us she has asthma and had already tried her inhaler.' }
          ]
        },
        bystander: {
          fallback: 'Friend: I do not know anything else.',
          facts: [
            { keys: ['happen','start','before','onset'], answer: 'Friend: We were walking near the field when she suddenly said her chest felt tight and stopped.' },
            { keys: ['inhaler','medicine','medication'], answer: 'Friend: I saw her use the inhaler several times, but her breathing kept getting worse.' },
            { keys: ['normal','sick','baseline'], answer: 'Friend: She seemed completely normal before this started.' }
          ]
        },
        partner: {
          fallback: 'Partner: Nothing else to report yet.',
          facts: [
            { keys: ['think','impression','see'], answer: 'Partner: Her work of breathing concerns me most right now.' },
            { keys: ['equipment','ready'], answer: 'Partner: Monitor, oxygen, nebulizer setup, and airway bag are ready.' },
            { keys: ['transport','stretcher'], answer: 'Partner: I can get the stretcher and start preparing for transport.' }
          ]
        }
      }
    },

    initialState: {
      airway: 'patent',
      bronchospasmSeverity: 0.62,
      respiratoryFatigue: 0.18,
      anxiety: 0.55,
      temperature: 98.6,
      clinicalState: 'moderate',
      lungSounds: 'expiratory_wheezes_bilateral',
      workOfBreathing: 'accessory_muscles',
      speech: 'short_sentences',
      skin: 'pink_diaphoretic',
      mentalStatus: 'anxious_alert'
    },

    hiddenClinicalState: {
      // Seed physiology used by the engine; not shown until assessed/monitored.
      bronchospasmSeverity: 0.62,
      respiratoryFatigue: 0.18,
      anxiety: 0.55
    },

    assessmentFindings: {
      scene_sizeup: {
        label: 'Scene size-up',
        category: 'scene',
        default: 'Public park, daytime, scene safe. Adult female seated upright on a bench, leaning forward. Bystanders present. No obvious hazards.'
      },
      general_appearance: {
        label: 'General appearance',
        category: 'primary',
        byClinicalState: {
          moderate: 'Anxious, upright / mild tripod, diaphoretic, speaking in short sentences, audible wheeze.',
          severe: 'Severe distress, marked accessory muscle use, single-word answers, tiring.',
          impending_failure: 'Drowsy, poor air movement, quieting wheeze — ominous.',
          improving: 'Less anxious, improved posture, longer phrases, still mildly tachypneic.'
        }
      },
      airway: {
        label: 'Airway',
        category: 'primary',
        default: 'Airway patent. Patient is speaking. No stridor. No foreign body. No angioedema.'
      },
      breathing: {
        label: 'Breathing inspection',
        category: 'primary',
        byClinicalState: {
          moderate: 'Increased work of breathing with intercostal and neck accessory muscle use. Prolonged expiratory phase. Audible wheeze.',
          severe: 'Severe accessory muscle use, tripoding, speaking in single words.',
          impending_failure: 'Fatiguing effort, shallow breaths, decreasing air movement.',
          improving: 'Work of breathing improved; mild residual accessory use.'
        }
      },
      work_of_breathing: {
        label: 'Work of breathing',
        category: 'primary',
        byClinicalState: {
          moderate: 'Moderate accessory muscle use; prolonged expiration.',
          severe: 'Severe accessory muscle use.',
          impending_failure: 'Tiring — effort decreasing, not reassuring.',
          improving: 'Mild increased work of breathing.'
        }
      },
      circulation: {
        label: 'Circulation',
        category: 'primary',
        default: 'Radial pulses present and strong. Skin pink and diaphoretic. Capillary refill < 2 seconds. No major bleeding.'
      },
      mental_status: {
        label: 'Mental status',
        category: 'primary',
        byClinicalState: {
          moderate: 'Alert and oriented ×4; anxious.',
          severe: 'Alert but highly anxious and fatigued.',
          impending_failure: 'Becoming drowsy / less interactive — concerning.',
          improving: 'Alert and oriented ×4; calmer.'
        }
      },
      skin: {
        label: 'Skin',
        category: 'exam',
        byClinicalState: {
          moderate: 'Pink, warm, diaphoretic.',
          severe: 'Pale, diaphoretic.',
          impending_failure: 'Pale, cool, diaphoretic.',
          improving: 'Pink, warm, less diaphoretic.'
        }
      },
      lung_sounds: {
        label: 'Lung sounds',
        category: 'exam',
        requiresLocation: true,
        audio: '/vitals/Lung-Wheezing.mp3',
        byClinicalState: {
          moderate: 'Diffuse expiratory wheezes bilaterally with fair air movement.',
          severe: 'Loud wheezes with diminished air movement bilaterally.',
          impending_failure: 'Quiet chest — markedly diminished breath sounds bilaterally.',
          improving: 'Wheezes improving with better air movement bilaterally.'
        }
      },
      pulse: { label: 'Pulse', category: 'vitals', fromVitals: 'pulse' },
      respiratory_rate: { label: 'Respiratory rate', category: 'vitals', fromVitals: 'respiratory_rate' },
      spo2: { label: 'SpO₂', category: 'vitals', fromVitals: 'spo2' },
      blood_pressure: { label: 'Blood pressure', category: 'vitals', fromVitals: 'blood_pressure' },
      etco2: { label: 'EtCO₂', category: 'vitals', fromVitals: 'etco2' },
      temperature: { label: 'Temperature', category: 'vitals', fromVitals: 'temperature' },
      blood_glucose: {
        label: 'Blood glucose',
        category: 'vitals',
        default: '104 mg/dL'
      },
      gcs: { label: 'GCS', category: 'vitals', fromVitals: 'gcs' },
      ecg_12lead: {
        label: '12-lead ECG',
        category: 'exam',
        default: 'Sinus tachycardia. No STEMI criteria. No ectopy noted on this tracing.'
      },
      focused_exam: {
        label: 'Focused exam',
        category: 'exam',
        default: 'Chest: symmetric expansion, no trauma, no JVD, no peripheral edema. HEENT: no facial swelling, no rash. Abdomen soft. No focal neurologic deficit.'
      }
    },

    videoStates: {
      arrival: {
        url: '/vitals/assets/asthma-arrival.mp4',
        label: 'Moderate distress',
        eyebrow: 'ARRIVAL · RIVERSIDE PARK',
        copy: 'Patient upright in respiratory distress — observe before intervening.'
      },
      worsening: {
        url: '/vitals/assets/asthma-worsening.mp4',
        label: 'Worsening',
        eyebrow: 'PATIENT UPDATE · DETERIORATING',
        copy: 'Fatigue and work of breathing are increasing.'
      },
      improving: {
        url: '/vitals/assets/asthma-improved.mp4',
        label: 'Improving',
        eyebrow: 'PATIENT UPDATE · IMPROVING',
        copy: 'Work of breathing is improving — continue reassessment.'
      }
    },

    videoThresholds: {
      improvingMaxSeverity: 0.42,
      worseningMinSeverity: 0.78,
      fatigueWorsening: 0.55
    },

    progressionRules: {
      untreated: {
        severityRisePerMinute: 0.05,
        fatigueRisePerMinute: 0.04,
        accelerateAfterSeconds: 240
      },
      treatedImprovement: {
        severityDecayPerMinute: 0.1,
        fatigueDecayPerMinute: 0.06,
        minSeverity: 0.18
      }
    },

    availableTreatments: {
      medications: {
        label: 'Medications',
        items: [
          {
            id: 'albuterol',
            name: 'Albuterol',
            medication: 'Albuterol',
            defaultDose: '2.5 mg',
            doses: ['2.5 mg', '5 mg'],
            defaultRoute: 'nebulized',
            routes: ['nebulized', 'MDI'],
            defaultDevice: 'nebulizer',
            devices: ['nebulizer', 'MDI with spacer'],
            category: 'medications'
          },
          {
            id: 'ipratropium',
            name: 'Ipratropium',
            medication: 'Ipratropium',
            defaultDose: '0.5 mg',
            doses: ['0.5 mg'],
            defaultRoute: 'nebulized',
            routes: ['nebulized'],
            defaultDevice: 'nebulizer',
            devices: ['nebulizer'],
            category: 'medications'
          },
          {
            id: 'aspirin',
            name: 'Aspirin',
            medication: 'Aspirin',
            defaultDose: '324 mg',
            doses: ['324 mg'],
            defaultRoute: 'oral',
            routes: ['oral'],
            defaultDevice: null,
            devices: [],
            category: 'medications'
          }
        ]
      },
      oxygen_airway: {
        label: 'Oxygen / Airway',
        items: [
          { id: 'nasal_cannula', name: 'Nasal cannula', medication: 'Oxygen', defaultDose: '2–6 L/min', defaultRoute: 'inhalation', defaultDevice: 'nc', category: 'oxygen', devices: ['nc'] },
          { id: 'nrb', name: 'Non-rebreather', medication: 'Oxygen', defaultDose: '10–15 L/min', defaultRoute: 'inhalation', defaultDevice: 'nrb', category: 'oxygen', devices: ['nrb'] },
          { id: 'nebulizer_o2', name: 'Oxygen via nebulizer', medication: 'Oxygen', defaultDose: '6–8 L/min', defaultRoute: 'inhalation', defaultDevice: 'nebulizer', category: 'oxygen', devices: ['nebulizer'] },
          { id: 'cpap', name: 'CPAP', medication: 'CPAP', defaultDose: 'per protocol', defaultRoute: 'inhalation', defaultDevice: 'cpap', category: 'oxygen', devices: ['cpap'] },
          { id: 'bvm', name: 'BVM ventilation', medication: 'BVM', defaultDose: 'as needed', defaultRoute: 'inhalation', defaultDevice: 'bvm', category: 'oxygen', devices: ['bvm'] },
          { id: 'suction', name: 'Suction', medication: 'Suction', defaultDose: 'as needed', defaultRoute: 'procedure', defaultDevice: 'suction', category: 'procedure', devices: ['suction'] }
        ]
      },
      procedures: {
        label: 'Procedures',
        items: [
          { id: 'position_upright', name: 'Position patient upright', medication: 'Positioning', category: 'procedures', defaultDose: null, defaultRoute: 'positioning', defaultDevice: null },
          { id: 'coach_breathing', name: 'Coach pursed-lip breathing', medication: 'Coaching', category: 'procedures', defaultDose: null, defaultRoute: 'supportive', defaultDevice: null }
        ]
      }
    },

    treatmentEffects: {
      albuterol: {
        immediateSeverityDelta: -0.04,
        immediateFatigueDelta: -0.02,
        setsTrend: 'stabilizing'
      },
      ipratropium: {
        immediateSeverityDelta: -0.02,
        setsTrend: 'stabilizing'
      },
      nrb: {
        immediateSeverityDelta: -0.01,
        setsTrend: 'stabilizing'
      },
      nebulizer_o2: {
        immediateSeverityDelta: -0.01,
        setsTrend: 'stabilizing'
      },
      cpap: {
        immediateSeverityDelta: -0.03,
        immediateFatigueDelta: -0.02,
        setsTrend: 'stabilizing'
      },
      nasal_cannula: {
        immediateSeverityDelta: 0,
        setsTrend: 'stable'
      },
      aspirin: {
        immediateSeverityDelta: 0,
        setsTrend: 'stable'
      },
      position_upright: {
        immediateSeverityDelta: -0.01,
        setsTrend: 'stable'
      }
    },

    criticalActions: [
      { id: 'scene', label: 'Arrive and size up scene', actionIncludes: 'Arrived', why: 'Establishes scene safety and contact time.' },
      { id: 'airway', label: 'Assess airway', assessmentId: 'airway', why: 'Airway patency is the first life-threat check.' },
      { id: 'breathing', label: 'Assess breathing', assessmentId: 'breathing', why: 'Respiratory distress requires early breathing evaluation.' },
      { id: 'lung_sounds', label: 'Auscultate lung sounds', assessmentId: 'lung_sounds', why: 'Confirms bronchospasm and air movement.' },
      { id: 'spo2', label: 'Obtain SpO₂', assessmentId: 'spo2', why: 'Identifies hypoxia and guides oxygen therapy.' },
      { id: 'oxygen', label: 'Initiate oxygen / nebulizer support', actionIncludes: 'oxygen', eventType: 'treatment', why: 'Supports oxygenation during bronchospasm.' },
      { id: 'albuterol', label: 'Administer bronchodilator', actionIncludes: 'albuterol', why: 'First-line pharmacologic therapy for asthma exacerbation.' },
      { id: 'reassess', label: 'Reassess after treatment', actionIncludes: 'Reassess', why: 'Confirms response or detects deterioration.' },
      { id: 'transport', label: 'Transport decision', eventType: 'transport', actionIncludes: 'transport', why: 'Respiratory distress requires timely destination decision.' },
      { id: 'handoff', label: 'Hospital notification / handoff', eventType: 'handoff', actionIncludes: 'Hospital', why: 'Receiving facility needs a clear radio report.' }
    ],

    gradingRules: {
      weightProfile: 'respiratory_distress_emt'
    },

    transportRules: {
      allowContinueOnScene: true,
      allowAlsIntercept: true,
      allowRefusal: false,
      destinations: [
        { id: 'nearest_ed', label: 'Nearest emergency department', minutes: 12 },
        { id: 'regional_ed', label: 'Regional medical center', minutes: 22 }
      ],
      defaultPriority: 'emergent',
      priorities: ['emergent', 'non-emergent']
    },

    handoffExpectations: {
      requiredElements: ['age', 'sex', 'chief', 'history', 'vitals', 'treatment', 'response', 'eta']
    },

    documentationExpectations: {
      requireNarrative: true,
      requireTreatments: true,
      requireVitals: true,
      requireResponse: true
    },

    debriefTopics: [
      {
        id: 'quiet_chest',
        prompt: 'Why can quieter wheezing be worse than loud wheezing in asthma?',
        expectedThemes: ['air movement', 'quiet chest', 'fatigue', 'failure'],
        teach: 'Wheeze requires airflow. A quieting chest with fatigue can mean impending respiratory failure.'
      },
      {
        id: 'reassessment_loop',
        prompt: 'After albuterol, which findings would you reassess first and why?',
        expectedThemes: ['lung', 'spo2', 'work of breathing', 'speech', 'mental'],
        teach: 'Reassess air movement, SpO₂, work of breathing, speech, and mentation to judge response.'
      },
      {
        id: 'oxygen_choice',
        prompt: 'How did you decide among nasal cannula, NRB, and nebulizer oxygen for this patient?',
        expectedThemes: ['spo2', 'distress', 'nebulizer', 'titrate'],
        teach: 'Match oxygen delivery to severity and treatment plan; nebulized bronchodilator often pairs with oxygen flow.'
      }
    ],

    workflowStages: [
      'Dispatch', 'Enroute', 'Scene', 'Patient Contact', 'Assessment', 'Treatment',
      'Reassessment', 'Transport', 'Handoff', 'Documentation', 'Debrief'
    ],

    monitorChannels: ['hr', 'ecg', 'spo2', 'pleth', 'rr', 'bp', 'etco2', 'capno', 'temp', 'gcs']
  });

  const api = { adultAsthma, scenarios: { 'adult-asthma': adultAsthma } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.PSV2 = global.PSV2 || {};
  global.PSV2.Scenarios = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
