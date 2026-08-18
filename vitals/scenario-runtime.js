(() => {
  'use strict';

  const PROFILES = window.EMSCodeSimScenarioDefinitions?.PROFILES || {};

  const LEGACY_VITAL_ALIASES = {
    bp: 'blood_pressure', bloodPressure: 'blood_pressure', bgl: 'blood_glucose', bloodGlucose: 'blood_glucose',
    breathSounds: 'breath_sounds', lung_sounds: 'breath_sounds', breathSoundType: 'breath_sound_type',
    orientation: 'mental_status', respiratory_rate: 'respirations', rr: 'respirations'
  };

  function normalizeVitalKey(name) {
    return LEGACY_VITAL_ALIASES[name] || window.EMSCodeSimPatientRecord?.normalizeKey?.(name) || name;
  }

  function record() {
    try { return window.EMSCodeSimScenarioSession?.sync?.() || window.EMSCodeSimPatientRecord?.active?.() || null; }
    catch { return null; }
  }

  function active() { return Boolean(record()); }

  function profile() {
    const current = record();
    if (!current) return null;
    return PROFILES[current.scenarioId] || PROFILES[current.id] || null;
  }


  const HORSE_STABILIZATION_IDS = new Set([
    'manual_leg_support','position_comfort','blanket_support','splint',
    'scoop_position_comfort','vacuum_mattress','board_transfer','horse_crush_movement_plan'
  ]);
  const HORSE_UNSAFE_MOVEMENT_IDS = new Set(['traction_splint','stand_pivot','force_straight']);

  function eventTime(value) {
    const time = new Date(value || 0).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function horseClinicalState(current = record()) {
    const scenarioId = current?.scenarioId || current?.id || '';
    if (scenarioId !== 'horse_crush') return null;
    const treatments = Array.isArray(current?.treatments) ? current.treatments : [];
    const effective = treatments.filter(item => item?.classification === 'appropriate-effective' || (!item?.classification && item?.actionId));
    const stabilization = effective
      .filter(item => HORSE_STABILIZATION_IDS.has(item.actionId))
      .sort((a,b) => eventTime(b.recordedAt || b.time) - eventTime(a.recordedAt || a.time))[0] || null;
    const painControl = effective
      .filter(item => item.actionId === 'pain_control')
      .sort((a,b) => eventTime(b.recordedAt || b.time) - eventTime(a.recordedAt || a.time))[0] || null;
    const unsafe = treatments
      .filter(item => HORSE_UNSAFE_MOVEMENT_IDS.has(item.actionId) || item?.classification === 'contraindicated')
      .sort((a,b) => eventTime(b.recordedAt || b.time) - eventTime(a.recordedAt || a.time))[0] || null;

    const lastReliefAt = Math.max(eventTime(stabilization?.recordedAt || stabilization?.time), eventTime(painControl?.recordedAt || painControl?.time));
    const lastUnsafeAt = eventTime(unsafe?.recordedAt || unsafe?.time);

    const startedAt = eventTime(current?.startedAt);
    const elapsedSeconds = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0;
    let stage = 'baseline';
    let painScore = 8;
    let patientText = '“Can you do something for my pain?” The patient continues to guard the left hip and keeps the knee flexed.';
    let dynamicVitals = {
      blood_pressure:'130/90', systolic:130, diastolic:90,
      pulse:75, respirations:16, spo2:98,
      blood_glucose:104, temperature:'98.6°F', avpu:'A', mental_status:'A&O x4',
      skin:'Warm, pink, and dry',
      pupils:'Pupils equal, round, and reactive to light at 3 mm bilaterally; gaze midline; tracking smooth',
      pupil_equal:true, pupil_left_reactive:true, pupil_right_reactive:true, pupil_gaze:'midline', pupil_tracking:'smooth',
      breath_sounds:'Clear and equal bilaterally', breath_sound_type:'normal'
    };

    if (lastUnsafeAt > lastReliefAt) {
      stage = 'worse';
      painScore = 10;
      patientText = '“Please stop — that really hurts.” Movement has sharply increased the left-hip pain. Return the leg to the tolerated position and reassess.';
      dynamicVitals = { ...dynamicVitals, blood_pressure:'146/94', systolic:146, diastolic:94, pulse:92, respirations:22 };
    } else if (!stabilization && !painControl && elapsedSeconds >= 480) {
      stage = 'delayed-care';
      painScore = 9;
      patientText = '“Can you please do something for this pain?” The patient is increasingly tense and restless after a prolonged delay without meaningful stabilization or pain relief.';
      dynamicVitals = { ...dynamicVitals, blood_pressure:'138/92', systolic:138, diastolic:92, pulse:84, respirations:18 };
    } else if (!stabilization && !painControl && elapsedSeconds >= 240) {
      stage = 'pain-escalating';
      painScore = 9;
      patientText = '“This is really starting to hurt. Can you help me?” The patient is more tense while the painful leg remains untreated.';
      dynamicVitals = { ...dynamicVitals, blood_pressure:'134/90', systolic:134, diastolic:90, pulse:80, respirations:18 };
    } else if (stabilization && painControl) {
      stage = 'relieved';
      painScore = 3;
      patientText = '“Thank you, that feels better.” With pain control and the leg supported, the patient reports much less pain at rest. Movement of the hip is still uncomfortable.';
      dynamicVitals = { ...dynamicVitals, blood_pressure:'122/82', systolic:122, diastolic:82, pulse:68, respirations:14 };
    } else if (painControl) {
      stage = 'pain-improved';
      painScore = 5;
      patientText = '“That is helping. It still hurts when my hip moves, but it is better.”';
      dynamicVitals = { ...dynamicVitals, blood_pressure:'124/84', systolic:124, diastolic:84, pulse:70, respirations:14 };
    } else if (stabilization) {
      stage = 'supported';
      painScore = 6;
      patientText = '“That helps as long as you keep my leg still.” The supported position reduces the sharp movement-related pain.';
      dynamicVitals = { ...dynamicVitals, blood_pressure:'128/86', systolic:128, diastolic:86, pulse:72, respirations:16 };
    }

    return {
      stage,
      painScore,
      patientText,
      stabilization: Boolean(stabilization),
      painControl: Boolean(painControl),
      unsafeMovement: lastUnsafeAt > lastReliefAt,
      elapsedSeconds,
      clockLevel: stage === 'worse' || stage === 'delayed-care' ? 'alert' : stage === 'pain-escalating' ? 'watch' : 'stable',
      clockLabel: stage === 'relieved' ? `Improving • pain ${painScore}/10`
        : stage === 'pain-improved' ? `Pain improving • ${painScore}/10`
        : stage === 'supported' ? `Leg supported • pain ${painScore}/10`
        : stage === 'worse' ? `Worsened after unsafe movement • pain ${painScore}/10`
        : stage === 'delayed-care' ? `Prolonged delay • pain ${painScore}/10`
        : stage === 'pain-escalating' ? `Pain increasing • ${painScore}/10`
        : `Severe pain untreated • ${painScore}/10`,
      vitals: dynamicVitals
    };
  }

  function horseAssessmentOverride(key, currentRecord) {
    if ((currentRecord?.scenarioId || currentRecord?.id) !== 'horse_crush') return null;
    const state = horseClinicalState(currentRecord);
    const v = state?.vitals || {};
    const common = {
      title: currentRecord.title || 'Horse-Crush Hip Injury',
      description: currentRecord.dispatch || 'Medic 181 Engine 182 respond emergent to 5541 E Snow Bird Road in reports of a 64 year old female smashed by a horse.',
      context: currentRecord.dispatch || '',
      age: currentRecord.patient || '64-year-old adult',
      complaint: currentRecord.title || 'Horse-Crush Hip Injury'
    };
    const overrides = {
      airway: {
        finding:'Clear voice with unobstructed airflow',
        detail:'The patient answers in full sentences. No snoring, gurgling, stridor, blood, vomit, swelling, or visible obstruction is present.',
        normality:'normal', problem:'patent', action:'monitor',
        example:'Airway patent. Patient alert and speaking in full sentences with clear voice and no visible obstruction or abnormal upper-airway sounds.'
      },
      breathing: {
        finding:`Respirations ${v.respirations}/min, regular and unlabored`,
        detail:`Normal depth with symmetric chest rise. The patient denies shortness of breath, speaks without pausing, has clear equal breath sounds, and SpO₂ is ${v.spo2}% on room air.`,
        normality: v.respirations > 20 ? 'not-normal' : 'normal', problem:'adequate', action:'monitor',
        example:`Respirations ${v.respirations}/min, regular and unlabored with normal depth and equal chest rise. SpO₂ ${v.spo2}% on room air.`
      },
      perfusion: {
        finding:`Pulse ${v.pulse}, regular and strong. Skin warm, pink, and dry. BP ${v.blood_pressure}. No major external bleeding.`,
        detail:'Radial pulses are readily palpable and equal. The patient remains alert and oriented with reassuring peripheral perfusion.',
        normality:'normal', priority:'normal-perfusion', action:'monitor',
        example:`Patient alert and oriented with radial pulse ${v.pulse}, regular and strong. Skin warm, pink, and dry. BP ${v.blood_pressure} mmHg. No external bleeding noted.`
      },
      chest: {
        finding:'No focal chest abnormality identified',
        detail:'Chest rise is symmetric. No wounds, bruising, deformity, tenderness, instability, crepitus, or subcutaneous emphysema. Breath sounds are clear and equal.',
        normality:'normal', priority:'normal-chest', action:'monitor',
        example:'Chest rise symmetric with no visible injury or tenderness. Breath sounds clear and equal bilaterally.'
      },
      abdominal: {
        finding:'Abdomen soft and non-tender in all four quadrants',
        detail:'No guarding, rigidity, distention, bruising, or palpable abnormality is found. The patient denies abdominal pain.',
        normality:'normal', priority:'normal-abdomen', action:'monitor',
        example:'Abdomen soft and non-tender in all four quadrants without guarding, rigidity, distention, or bruising.'
      },
      motor_sensory: {
        finding:'Distal circulation, sensation, and movement remain intact; left-leg movement is pain limited',
        detail:'Left pedal pulse is present, the foot is warm, sensation is intact, and the patient moves the ankle and toes. Hip and knee movement is limited by severe left-hip pain rather than a distal neurologic deficit.',
        normality:'not-normal', priority:'pain-limited', problem:'pain-limited', action:'splint-reassess',
        example:'Left pedal pulse present with intact distal sensation and ankle/toe movement. Proximal left-leg movement limited by hip pain. Distal CSM documented before and after movement.'
      },
      trauma: {
        finding:'Isolated severe left-hip injury pattern without another major traumatic finding',
        detail:'No head, spinal, chest, or abdominal injury is identified. Pelvis is stable on one gentle check with marked left-hip tenderness. The left knee remains flexed in position of comfort; no obvious deformity, shortening, rotation, or open injury is seen. Distal CSM is intact.',
        normality:'not-normal', problem:'extremity-injury', action:'splint-reassess',
        example:'Systematic trauma exam completed. Marked left-hip tenderness with pain-limited movement and flexed position of comfort. No other major traumatic finding identified. Distal CSM intact.'
      },
      sample: {
        finding:'Significant horse-crush mechanism with isolated left-hip pain',
        detail:`S: Left-hip pain is currently ${state?.painScore ?? 8}/10; it began at the time of the horse-crush event, radiates down the left leg, and remains worse with hip movement. The patient denies head strike, loss of consciousness, neck or back pain, chest pain, shortness of breath, or abdominal pain. A: No medication allergy reported. M: Wellbutrin. P: No additional significant history reported and no blood thinner. L: Ate earlier today. E: Compressed between two horses and knocked to the ground from standing; not stepped on.`,
        normality:'not-normal', priority:'events', action:'rapid-transport',
        example:`SAMPLE obtained: patient reports left-hip pain currently ${state?.painScore ?? 8}/10 after being compressed between two horses and falling from standing. Denies head strike, loss of consciousness, neck/back pain, chest pain, dyspnea, and abdominal pain. No medication allergy reported. Wellbutrin is the only reported medication and no blood thinner is reported. Last oral intake was earlier today. The injured leg remains supported in the tolerated flexed position with pain management and serial distal CSM reassessment.`
      },
      pain: {
        finding:'Traumatic left-hip pain',
        detail:`O: Immediate onset when compressed between two horses and knocked to the ground. P: Markedly worse with movement and improved when the leg is supported and kept still. Q: Deep aching pain with sharp pain on movement. R: Left hip radiating down the left leg. S: ${state?.painScore ?? 8}/10 currently. T: Constant since the incident.`,
        normality:'not-normal', priority:'trauma', action:'trauma-care',
        example:`Patient reports ${state?.painScore ?? 8}/10 left-hip pain after being compressed between two horses and falling. Pain worsens sharply with movement and improves with support/immobilization. Distal CSM remains intact.`
      }
    };
    return overrides[key] ? { ...common, ...overrides[key] } : null;
  }

  function chooseCase(key, cases, current) {
    const currentRecord = record();
    if (!currentRecord || !cases?.length) {
      let next;
      do { next = cases[Math.floor(Math.random() * cases.length)]; }
      while (cases.length > 1 && next === current);
      return next;
    }
    const selectedProfile = profile();
    const horseOverride = horseAssessmentOverride(key, currentRecord);
    if (horseOverride) return horseOverride;
    if (key === 'sample' && selectedProfile?.sample) {
      return {
        ...selectedProfile.sample,
        title: currentRecord.title || selectedProfile.sample.title,
        description: selectedProfile.sample.description || currentRecord.dispatch,
        context: selectedProfile.sample.description || currentRecord.dispatch,
        age: currentRecord.patient || '',
        complaint: currentRecord.title || selectedProfile.sample.title
      };
    }
    const index = selectedProfile?.caseIndex?.[key] ?? 0;
    const base = cases[Math.max(0, Math.min(index, cases.length - 1))];
    const clone = { ...base };
    clone.title = currentRecord.title || base.title;
    clone.description = currentRecord.dispatch || base.description;
    clone.context = currentRecord.dispatch || base.context;
    clone.age = currentRecord.patient || base.age;
    clone.complaint = currentRecord.title || base.complaint;
    return clone;
  }

  function vital(name, fallback) {
    const normalized = normalizeVitalKey(name);
    const current = record();
    const horseState = horseClinicalState(current);
    const values = horseState?.vitals || profile()?.vitals || {};
    return values[normalized] ?? values[LEGACY_VITAL_ALIASES[name]] ?? values[name] ?? fallback;
  }

  function formatVital(name) {
    const key = normalizeVitalKey(name);
    const value = vital(key, 'Obtained');
    if (key === 'pulse' || key === 'respirations') return `${value}/min`;
    if (key === 'spo2') return `${value}%`;
    if (key === 'blood_glucose') return `${value} mg/dL`;
    return String(value);
  }

  function classifyFinding(name, value) {
    const key = normalizeVitalKey(name);
    const current = record();
    const horseState = horseClinicalState(current);
    const values = horseState?.vitals || profile()?.vitals || {};
    switch (key) {
      case 'blood_pressure': return Number(values.systolic) < 90 || Number(values.systolic) >= 180 || Number(values.diastolic) >= 120 ? 'not-normal' : 'normal';
      case 'pulse': return Number(values.pulse) < 60 || Number(values.pulse) > 100 ? 'not-normal' : 'normal';
      case 'respirations': return Number(values.respirations) < 12 || Number(values.respirations) > 20 ? 'not-normal' : 'normal';
      case 'spo2': return Number(values.spo2) < 94 ? 'not-normal' : 'normal';
      case 'blood_glucose': return Number(values.blood_glucose) < 70 || Number(values.blood_glucose) > 200 ? 'not-normal' : 'normal';
      case 'temperature': {
        const numeric = parseFloat(String(values.temperature));
        return numeric < 96.8 || numeric >= 100.4 ? 'not-normal' : 'normal';
      }
      case 'breath_sounds': return values.breath_sound_type === 'normal' ? 'normal' : 'not-normal';
      case 'pupils': {
        const perl = values.pupil_equal !== false && values.pupil_left_reactive !== false && values.pupil_right_reactive !== false;
        const gazeNormal = (values.pupil_gaze || 'midline') === 'midline';
        const trackingNormal = (values.pupil_tracking || 'smooth') === 'smooth';
        return perl && gazeNormal && trackingNormal ? 'normal' : 'not-normal';
      }
      default:
        return /pale|cool|clammy|diaphoretic|mottled|confused|poor interaction|weakness|asymmetry|labored|retraction|diminished|wheez|crackle|deviation|impaired/i.test(String(value)) ? 'not-normal' : 'normal';
    }
  }

  function applyMode() {
    const current = record();
    if (!current) return;
    document.documentElement.classList.add('scenario-mode');
    document.body?.classList.add('scenario-mode');
    const practice = document.getElementById('practicePanel');
    if (practice) {
      document.querySelectorAll('.lesson-panel').forEach(panel => {
        panel.hidden = panel !== practice;
        panel.classList.toggle('is-active', panel === practice);
      });
      document.querySelectorAll('.lesson-tab').forEach(tab => tab.classList.toggle('is-active', tab.dataset.panel === 'practicePanel'));
    }
    document.querySelectorAll('#newScenario,#newCase,#nextBtn,#tryAnother,[data-action="new-patient"]').forEach(button => {
      button.disabled = true;
      button.hidden = true;
      button.setAttribute('aria-hidden', 'true');
    });
    document.querySelectorAll('.patient-card__top .eyebrow').forEach(element => { element.textContent = 'Active scenario patient'; });
    const title = document.querySelector('#scenarioTitle,#caseTitle');
    if (title) title.textContent = current.title || title.textContent;
    const description = document.querySelector('#scenarioText,#caseDescription');
    if (description && current.dispatch) description.textContent = current.dispatch;
  }

  document.addEventListener('DOMContentLoaded', () => setTimeout(applyMode, 0));
  window.addEventListener('emscodesim:patient-record-updated', applyMode);
  window.addEventListener('pageshow', applyMode);

  window.EMSCodeSimScenarioRuntime = {
    PROFILES, active, record, profile, chooseCase, vital, formatVital, classifyFinding, applyMode,
    horseClinicalState, syncProfileFindings() {}, normalizeVitalKey
  };
})();
