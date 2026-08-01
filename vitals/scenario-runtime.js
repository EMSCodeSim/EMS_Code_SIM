(() => {
  'use strict';

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
      caseIndex: { airway: 0, breathing: 1, sample: 1, chest: 0, perfusion: 0, trauma: 0, abdominal: 0, motor_sensory: 0, pat: 0 }
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
      caseIndex: { airway: 0, breathing: 0, sample: 2, chest: 0, perfusion: 0, trauma: 0, abdominal: 0, motor_sensory: 1, pat: 0 }
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
      caseIndex: { airway: 0, breathing: 0, sample: 3, chest: 0, perfusion: 0, trauma: 0, abdominal: 0, motor_sensory: 2, pat: 0 }
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
      caseIndex: { airway: 5, breathing: 4, sample: 2, chest: 2, perfusion: 2, trauma: 3, abdominal: 2, motor_sensory: 4, pat: 0 }
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
      caseIndex: { airway: 3, breathing: 3, sample: 1, chest: 0, perfusion: 5, trauma: 0, abdominal: 5, motor_sensory: 2, pat: 2 }
    }
  };

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

  function chooseCase(key, cases, current) {
    const currentRecord = record();
    if (!currentRecord || !cases?.length) {
      let next;
      do { next = cases[Math.floor(Math.random() * cases.length)]; }
      while (cases.length > 1 && next === current);
      return next;
    }
    const selectedProfile = profile();
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
    const values = profile()?.vitals || {};
    const normalized = normalizeVitalKey(name);
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
    const values = profile()?.vitals || {};
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
    syncProfileFindings() {}, normalizeVitalKey
  };
})();
