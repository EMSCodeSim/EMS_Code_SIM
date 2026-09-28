(function (root) {
  'use strict';
  root.EMSCodeSimV2Asthma = {
    id: 'asthma-v2',
    title: 'Respiratory Distress',
    patient: { age: 24, sex: 'Female', name: 'Maya', chiefComplaint: 'Difficulty breathing' },
    dispatch: {
      summary: '24-year-old female with worsening shortness of breath at a public park.',
      notes: 'Caller reports history of asthma. Patient is seated upright on a bench.'
    },
    phases: ['dispatch','scene','patient-contact','assessment','treatment','reassessment','transport','handoff','documentation','debrief'],
    videos: {
      arrival: '/vitals/assets/asthma-arrival.mp4',
      worsening: '/vitals/assets/asthma-worsening.mp4',
      improved: '/vitals/assets/asthma-improved.mp4'
    },
    initialState: {
      hr: 126, rr: 32, spo2: 88, bp: '148/92', etco2: 31,
      airway: 'Patent',
      workOfBreathing: 'moderate-severe',
      speech: '3-4 word phrases',
      lungSounds: 'Diffuse bilateral expiratory wheeze',
      mentalStatus: 'alert, anxious',
      skin: 'pale, mildly diaphoretic',
      videoState: 'arrival'
    },
    progression: { worsenAtSec: 90, criticalAtSec: 240 },
    treatmentEffects: { albuterol: { onsetSec: 25 } },
    assessments: {
      general: { label: 'General appearance', value: 'Young adult seated upright, anxious, visibly increased work of breathing.' },
      airway: { label: 'Airway', value: 'Patent. Patient can phonate but only in short phrases.' },
      breathing: { label: 'Breathing', value: 'Tachypneic with accessory muscle use and prolonged expiration.' },
      circulation: { label: 'Circulation', value: 'Rapid radial pulse. Skin pale and mildly diaphoretic.' },
      mental: { label: 'Mental status', value: 'Alert and oriented, anxious.' },
      lungSounds: { label: 'Lung sounds', value: 'Diffuse bilateral expiratory wheeze with reduced air movement.' },
      skin: { label: 'Skin', value: 'Pale, mildly diaphoretic.' },
      history: { label: 'Focused history', value: 'Known asthma. Rescue inhaler used three times today with little relief. No known drug allergies.' }
    },
    interview: [
      { keys: ['name'], answer: 'My name is Maya.' },
      { keys: ['start','onset','when'], answer: 'It started about twenty minutes ago while I was walking.' },
      { keys: ['history','medical','asthma'], answer: 'I have asthma. I have had to go to the hospital for it before, but I have never been intubated.' },
      { keys: ['medicine','medication','inhaler','albuterol'], answer: 'I used my rescue inhaler three times. It is not helping much.' },
      { keys: ['allerg'], answer: 'No known drug allergies.' },
      { keys: ['pain','chest'], answer: 'No chest pain. My chest just feels really tight.' },
      { keys: ['trigger'], answer: 'I was walking near the grass when it got bad. Pollen sometimes triggers me.' }
    ],
    treatments: {
      oxygen: { label: 'Apply oxygen and titrate to patient condition', patientResponse: 'Oxygen is applied. Continue to reassess ventilation and oxygenation.' },
      albuterol: { label: 'Albuterol 2.5 mg nebulized', patientResponse: 'Nebulized albuterol is started. The patient remains anxious; improvement should be judged by reassessment.' },
      ipratropium: { label: 'Ipratropium 0.5 mg nebulized', patientResponse: 'Ipratropium is administered with the nebulized treatment.' },
      cpap: { label: 'Apply CPAP', patientResponse: 'CPAP is applied. Monitor tolerance, ventilation, blood pressure, and clinical response.' },
      bvm: { label: 'Assist ventilations with BVM', patientResponse: 'Ventilatory assistance begins. Reassess chest rise, rate, oxygenation, and mental status.' }
    },
    grading: [
      { id:'airway', label:'Airway assessed', points:10, check:s=>!!s.scoreFlags.airway, pass:'Airway was assessed.', fail:'Airway was never specifically assessed.' },
      { id:'breathing', label:'Breathing assessed', points:15, check:s=>!!s.scoreFlags.breathing, pass:'Breathing assessment was documented.', fail:'A focused breathing assessment was missed.' },
      { id:'spo2', label:'Oxygenation measured', points:10, check:s=>!!s.scoreFlags.spo2, pass:'SpO₂ was obtained.', fail:'SpO₂ was not obtained.' },
      { id:'lungs', label:'Lung sounds obtained', points:15, check:s=>!!s.scoreFlags.lungSounds, pass:'Lung sounds were assessed.', fail:'Lung sounds were not assessed.' },
      { id:'albuterol', label:'Bronchodilator administered', points:20, check:s=>!!s.scoreFlags.albuterol, pass:'Bronchodilator therapy was given.', fail:'No bronchodilator was administered.' },
      { id:'reassess', label:'Reassessment after treatment', points:15, check:s=>!!s.scoreFlags.reassessmentAfterTreatment, pass:'The patient was reassessed after treatment.', fail:'Treatment was not followed by a documented reassessment.' },
      { id:'transport', label:'Transport decision', points:5, check:s=>!!s.scoreFlags.transport, pass:'Transport decision was recorded.', fail:'No transport decision was recorded.' },
      { id:'handoff', label:'Hospital handoff', points:5, check:s=>!!s.scoreFlags.handoff, pass:'A meaningful handoff was completed.', fail:'Hospital handoff was absent or too brief.' },
      { id:'pcr', label:'PCR documentation', points:5, check:s=>!!s.scoreFlags.pcr, pass:'PCR narrative was completed.', fail:'PCR narrative was absent or too brief.' }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
