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

  function chooseCase(key, cases, current) {
    const currentRecord = record();
    if (!currentRecord || !cases?.length) {
      let next;
      do { next = cases[Math.floor(Math.random() * cases.length)]; }
      while (cases.length > 1 && next === current);
      return next;
    }
    const selectedProfile = profile();
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
