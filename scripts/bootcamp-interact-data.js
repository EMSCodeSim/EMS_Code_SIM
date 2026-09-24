/* BLS Boot Camp interactive content — clinical education only; follow local protocols. */
window.EMSCodeSimBootcampData = Object.freeze({
  'scene-quickcheck': {
    type: 'quickCheck',
    title: 'Quick Check',
    prompt: 'You arrive to a busy roadway. The patient is visible from the sidewalk, but cars are still moving past the scene. What should you address first?',
    choices: [
      { text: 'Begin a full SAMPLE history', correct: false, why: 'History can wait. Moving traffic can injure you, your partner, and the patient.' },
      { text: 'Scene safety and PPE before patient contact', correct: true, why: 'An unsafe approach turns one patient into a multi-casualty event. Control hazards, protect yourself, then move to the patient.' },
      { text: 'Start oxygen immediately', correct: false, why: 'Oxygen may be needed later, but not before you can safely reach the patient.' },
      { text: 'Document dispatch information first', correct: false, why: 'Documentation is important, but not before scene safety and patient access.' }
    ]
  },
  'scene-fieldtip': {
    type: 'fieldTip',
    title: 'EMT Field Tip',
    body: 'Stand where you can see the whole scene before committing to patient side. Arrive with an exit plan: where is your ambulance, where is traffic, and who else is already helping?'
  },
  'impression-decision': {
    type: 'clinicalDecision',
    title: 'What Would You Do?',
    stem: 'A 67-year-old is sitting upright, pale and diaphoretic, complaining of chest pressure. He answers questions in short phrases.',
    vitals: ['HR 104', 'BP 168/94', 'RR 22', 'SpO₂ 94% on room air'],
    prompt: 'What is your next priority?',
    choices: [
      { text: 'Reassure him that chest pain is usually anxiety and continue a long interview', correct: false, why: 'Pale, diaphoretic chest pressure with tachypnea is a high-risk presentation. Do not minimize it.' },
      { text: 'Form a sick/not-sick impression, begin primary assessment, and prepare for oxygen/priority transport while gathering a focused history', correct: true, why: 'Your first look already shows a potentially unstable cardiac-sounding patient. Move into ABCs and early decision-making without skipping primary assessment.' },
      { text: 'Complete a full head-to-toe trauma exam before any treatment', correct: false, why: 'This is a medical presentation. A long trauma survey delays care that may matter now.' },
      { text: 'Ask him to walk to the ambulance to “test” his condition', correct: false, why: 'Never make a potentially ischemic patient exert themselves to prove stability.' }
    ]
  },
  'primary-life-threat': {
    type: 'assessmentChallenge',
    title: 'Find the life threat',
    patient: 'Unresponsive adult found slumped in a chair. Family says he “just passed out.”',
    findings: [
      { label: 'Mental status', value: 'Unresponsive to voice; withdraws to pain' },
      { label: 'Airway', value: 'Snoring respirations; secretions visible' },
      { label: 'Breathing', value: 'Slow and shallow; SpO₂ 88%' },
      { label: 'Circulation', value: 'Radial pulse present; skin pale and clammy' },
      { label: 'Vitals', value: 'HR 54 · BP 96/58 · RR 8 · SpO₂ 88%' }
    ],
    prompt: 'What is the immediate priority?',
    choices: [
      { text: 'Obtain a complete SAMPLE history from family first', correct: false, why: 'History supports care, but a snoring airway and inadequate breathing come first.' },
      { text: 'Open/clear the airway and support ventilation', correct: true, why: 'Snoring, secretions, RR 8, and SpO₂ 88% point to an immediate airway/breathing threat. Correct that now, then continue assessment.' },
      { text: 'Apply a tourniquet to the nearest extremity', correct: false, why: 'There is no external hemorrhage described.' },
      { text: 'Start a detailed neurological exam before any intervention', correct: false, why: 'Neuro findings matter, but not before an unprotected airway and inadequate breathing.' }
    ]
  },
  'primary-mistake': {
    type: 'commonMistake',
    title: 'Common EMT Mistake',
    mistake: 'Recognizing inadequate breathing, then finishing the rest of the checklist before intervening.',
    better: 'Treat immediate ABC threats when found. Say the finding, start the intervention, then return to the remainder of the assessment and priority decision.'
  },
  'history-trainer': {
    type: 'historyTrainer',
    title: 'OPQRST Trainer · Chest pressure',
    intro: 'Select the questions you would ask. The patient answers as you ask. At the end, review what you collected and what you missed.',
    complaint: '67-year-old with chest pressure while watching TV.',
    bank: [
      { id: 'onset', label: 'Onset — When did this start?', answer: 'About 20 minutes ago while sitting.', required: true },
      { id: 'provoke', label: 'Provocation/Palliation — What makes it better or worse?', answer: 'Worse when I walk to the kitchen. Sitting still helps a little.', required: true },
      { id: 'quality', label: 'Quality — What does it feel like?', answer: 'Pressure, like someone sitting on my chest.', required: true },
      { id: 'region', label: 'Region/Radiation — Where is it, and does it move?', answer: 'Center of the chest; radiates into my left arm.', required: true },
      { id: 'severity', label: 'Severity — Scale of 0–10?', answer: '7 out of 10.', required: true },
      { id: 'time', label: 'Time — Constant or coming and going? Ever had this before?', answer: 'Constant since it started. Similar once last year but milder.', required: true },
      { id: 'diet', label: 'What did you eat for breakfast?', answer: 'Toast and coffee.', required: false },
      { id: 'hobby', label: 'Do you like watching sports?', answer: 'Yes, usually.', required: false }
    ],
    missedAdvice: 'For chest pressure, OPQRST plus key SAMPLE items (allergies, meds, cardiac history, last oral intake, events) drive treatment and destination decisions.'
  },
  'history-why': {
    type: 'whyItMatters',
    title: 'Why does this matter?',
    question: 'Why record pertinent negatives during history?',
    answer: 'Pertinent negatives show you asked the important questions and help the next clinician. “Denies shortness of breath” or “denies allergic reaction after epinephrine” can change risk and treatment as much as a positive finding.'
  },
  'secondary-spot': {
    type: 'spotProblem',
    title: 'Spot the Problem',
    scenario: 'A critical multi-system trauma patient is packaged and ready for transport, but the provider keeps searching for a tiny abrasion on the forearm while ALS intercept is two minutes out and the patient is hypotensive.',
    prompt: 'What is the problem?',
    choices: [
      { text: 'Focused exams are never useful in trauma', correct: false, why: 'Focused exams are useful—timing and priority decide when.' },
      { text: 'Low-value findings are delaying transport for a time-sensitive patient', correct: true, why: 'Do not let a detailed hunt for minor findings delay care and transport when the patient is unstable.' },
      { text: 'ALS intercept should always be cancelled', correct: false, why: 'ALS intercept may still help; the issue is delay, not the intercept itself.' },
      { text: 'Forearm abrasions are the top trauma priority', correct: false, why: 'Hypotension and major injuries drive priority, not minor soft-tissue findings.' }
    ]
  },
  'vitals-trainer': {
    type: 'vitalsTrainer',
    title: 'Vitals Trainer · Trend recognition',
    intro: 'Compare two sets. Do not memorize only “normal.” Ask what changed.',
    first: { label: 'First set', values: ['BP 118/76', 'HR 96', 'RR 20', 'SpO₂ 95%'] },
    second: { label: 'Second set (after 8 minutes)', values: ['BP 92/58', 'HR 124', 'RR 28', 'SpO₂ 91%'] },
    prompt: 'What is happening to this patient?',
    choices: [
      { text: 'Improving — heart rate rising means better output', correct: false, why: 'Rising HR with falling BP and rising RR usually signals deterioration, not improvement.' },
      { text: 'Deteriorating — hypotension, tachycardia, tachypnea, and falling SpO₂ suggest worsening perfusion/respiratory status', correct: true, why: 'Trending vitals show the direction of the call. Reassess, support ABCs, reconsider treatment, and escalate priority/resources as indicated by protocol and medical direction.' },
      { text: 'Unchanged — all values are still compatible with life', correct: false, why: '“Compatible with life” is not the same as stable. The trend is clearly worse.' },
      { text: 'Only SpO₂ matters; ignore the blood pressure change', correct: false, why: 'BP, HR, RR, and SpO₂ together tell the story. Do not isolate one number.' }
    ]
  },
  'vitals-why': {
    type: 'whyItMatters',
    title: 'Why does this matter?',
    question: 'Why is one “normal” vital set not enough?',
    answer: 'A single snapshot can miss shock or respiratory failure that is developing. Trends after treatment, movement, or time tell you whether your plan is working.'
  },
  'treatment-skill': {
    type: 'skillWalkthrough',
    title: 'Skill Walkthrough · High-flow oxygen decision points',
    intro: 'Work the decision sequence. Follow your local protocol and medical direction for exact devices and targets.',
    steps: [
      { prompt: 'First step before applying oxygen?', choices: [
        { text: 'Confirm indication from assessment (distress, hypoxia, altered perfusion signs) and explain to the patient', correct: true, why: 'Oxygen is a treatment with an indication, not a reflex for every call.' },
        { text: 'Always start at the highest liter flow on every patient before assessing', correct: false, why: 'Assess first. Device and flow should match the clinical picture and protocol.' }
      ]},
      { prompt: 'Next?', choices: [
        { text: 'Choose an appropriate delivery device and flow, then reassess work of breathing, SpO₂, color, and mental status', correct: true, why: 'Reassessment proves whether the intervention helped.' },
        { text: 'Apply oxygen and stop assessing because treatment is complete', correct: false, why: 'Treatment without reassessment is incomplete care.' }
      ]},
      { prompt: 'If the patient worsens?', choices: [
        { text: 'Reassess ABCs, consider ventilation support if breathing becomes inadequate, and escalate resources/transport priority per protocol', correct: true, why: 'Failure to improve should change the plan.' },
        { text: 'Assume the first device setting is permanent for the entire call', correct: false, why: 'Oxygen therapy is dynamic. Recheck and adjust based on response and protocol.' }
      ]}
    ],
    sheetHref: '/nremt-skill-sheets.html',
    sheetLabel: 'View skill sheet library'
  },
  'treatment-tip': {
    type: 'fieldTip',
    title: 'EMT Field Tip',
    body: 'Say the indication out loud before you treat: “Because SpO₂ is 88% with distress, I am applying oxygen.” That habit protects indication/contraindication checks and improves your handoff later.'
  },
  'handoff-radio': {
    type: 'radioReport',
    title: 'Radio Report Practice',
    intro: 'Drag the report pieces into a concise order, then compare with a field-ready example. Keep it fictional.',
    pieces: [
      { id: 'id', label: 'Unit ID / ETA' },
      { id: 'age', label: 'Age / sex' },
      { id: 'cc', label: 'Chief complaint / dispatch' },
      { id: 'find', label: 'Key findings' },
      { id: 'rx', label: 'Treatment + response' },
      { id: 'vitals', label: 'Vital trend' }
    ],
    correctOrder: ['id', 'age', 'cc', 'find', 'vitals', 'rx'],
    example: 'Medic 2, ETA 6 minutes. 67-year-old male with chest pressure for 20 minutes. Pale, diaphoretic, short phrases. Vitals from 118/76, HR 96, RR 20, SpO₂ 95% to 92/58, HR 124, RR 28, SpO₂ 91%. Oxygen applied with improved work of breathing still limited; requesting priority room.',
    tip: 'Lead with identity and time, then the problem, the dangerous findings, the trend, and what you did. Cut filler.'
  },
  'handoff-mistake': {
    type: 'commonMistake',
    title: 'Common EMT Mistake',
    mistake: 'Giving a long story that skips vital trends and treatment response.',
    better: 'Receiving clinicians need the short clinical arc: why you were called, what you found, what changed, what you did, and how the patient responded.'
  },
  'mini-respiratory': {
    type: 'miniScenario',
    title: 'Mini-Scenario · Progressive reveal',
    intro: 'Investigate one step at a time. Do not jump ahead.',
    stages: [
      { id: 'dispatch', title: 'Dispatch', body: '“52-year-old male — difficulty breathing at a park.”', action: 'Begin scene size-up', reveal: 'Park bench scene. One patient. No hazards. Family present. Patient seated upright, speaking in short sentences.' },
      { id: 'primary', title: 'Primary assessment', body: 'Choose your first assessment focus.', choices: [
        { text: 'Airway and breathing adequacy first', correct: true, reveal: 'Airway open. Breathing rapid with audible wheezes and accessory-muscle use. SpO₂ 90% on room air.' },
        { text: 'Full medical history before looking at breathing', correct: false, reveal: 'You delayed primary assessment. The patient is working hard to breathe—return to ABCs now.' }
      ]},
      { id: 'history', title: 'Focused history', body: 'What history matters most right now?', choices: [
        { text: 'Asthma/COPD history, meds, recent inhaler use, allergies, what started the episode', correct: true, reveal: 'Known asthma. Used albuterol once with little relief. Allergic to penicillin only. Started after mowing near the park.' },
        { text: 'Detailed surgical history from childhood first', correct: false, reveal: 'Useful someday, not first. Return to respiratory-focused SAMPLE.' }
      ]},
      { id: 'plan', title: 'Plan', body: 'Based on findings so far, what is the best next educational priority?', choices: [
        { text: 'Support oxygenation/ventilation needs per protocol, position for comfort, reassess frequently, consider ALS, and prepare transport', correct: true, reveal: 'Good. Connect assessment → treatment → reassessment. Continue into the full visual-patient medical call for practice.' },
        { text: 'Leave the patient seated and start unrelated trauma packaging', correct: false, reveal: 'Wrong path for this medical respiratory call.' }
      ]}
    ],
    continueHref: '/vitals/visual-patient.html?case=asthma&training=learning&reset=1',
    continueLabel: 'Continue in Patient Assessment Simulator'
  },
  'lesson-challenge-assessment': {
    type: 'lessonChallenge',
    title: 'Section Challenge · Assessment foundations',
    intro: 'Three quick decisions. Learning first—not a pass/fail exam.',
    items: [
      { prompt: 'Immediate threats should be handled:', choices: [
        { text: 'After the entire memorized checklist is finished', correct: false, why: 'Threats interrupt the checklist.' },
        { text: 'When found, then you return to the assessment', correct: true, why: 'Treat life threats when identified.' }
      ]},
      { prompt: 'General impression is mainly used to:', choices: [
        { text: 'Replace vital signs forever', correct: false, why: 'Impression guides urgency; vitals still matter.' },
        { text: 'Form an early sick/not-sick picture that can change', correct: true, why: 'First look starts the working plan.' }
      ]},
      { prompt: 'A long interview during an open airway threat is:', choices: [
        { text: 'Required for SAMPLE completeness', correct: false, why: 'ABC threats come first.' },
        { text: 'A critical sequencing error', correct: true, why: 'Fix the threat, then gather history.' }
      ]}
    ]
  },
  'final-challenge': {
    type: 'finalChallenge',
    title: 'Final Boot Camp Challenge',
    intro: 'Manage one integrated call from dispatch through documentation. Educational feedback only—not official scoring. Follow local protocols and medical direction in real practice.',
    stages: [
      { id: 'dispatch', title: '1 · Dispatch', body: 'Afternoon call: 58-year-old female, “trouble breathing,” at home.', prompt: 'What do you prepare mentally before arrival?', choices: [
        { text: 'PPE, possible respiratory distress equipment readiness, exit plan, and an open mind for medical vs other causes', correct: true, why: 'Arrive ready without locking onto one diagnosis.' },
        { text: 'Assume anxiety and bring no oxygen equipment', correct: false, why: 'Do not prejudge. Be ready for true respiratory compromise.' }
      ]},
      { id: 'scene', title: '2 · Scene size-up', body: 'Apartment hallway clear. One patient. Husband present. No weapons noted. Patient seated on couch, leaning forward.', prompt: 'Best next move?', choices: [
        { text: 'Scene appears workable—don PPE, approach, begin general impression/primary assessment', correct: true, why: 'Safe scene → patient contact and ABCs.' },
        { text: 'Stay outside and wait for the patient to walk out', correct: false, why: 'A distressed patient should not be asked to walk out to prove severity.' }
      ]},
      { id: 'primary', title: '3 · Primary assessment', body: 'Alert, 2–3 word sentences, audible wheezes, accessory muscles, skin pale/diaphoretic, radial pulse fast.', prompt: 'Priority action?', choices: [
        { text: 'Support oxygenation needs and treat this as a potentially unstable respiratory patient while continuing focused assessment', correct: true, why: 'Inadequate/distressed breathing drives priority.' },
        { text: 'Ignore breathing and begin a 20-minute social history', correct: false, why: 'Wrong sequence.' }
      ]},
      { id: 'history', title: '4 · History', body: 'You can ask two high-yield questions now while treating.', prompt: 'Best pair?', choices: [
        { text: 'Asthma/COPD history + what treatments already used today', correct: true, why: 'Those answers change therapy and urgency most right now.' },
        { text: 'Favorite foods + childhood surgeries', correct: false, why: 'Low yield during distress.' }
      ]},
      { id: 'vitals', title: '5 · Vitals', body: 'Initial: BP 148/90, HR 118, RR 28, SpO₂ 89% RA. After oxygen/support per your training pathway: SpO₂ 94%, RR 24, still accessory-muscle use.', prompt: 'Interpretation?', choices: [
        { text: 'Some improvement but still abnormal—continue support, reassess, and maintain elevated priority', correct: true, why: 'Partial improvement is not full recovery.' },
        { text: 'Fully resolved—cancel transport', correct: false, why: 'Still abnormal work of breathing and recent hypoxia.' }
      ]},
      { id: 'reassess', title: '6 · Reassessment', body: 'During transport the patient becomes quieter and RR falls to 10 with decreasing chest rise.', prompt: 'What changed?', choices: [
        { text: 'Possible fatigue/decline—reassess ABCs and be ready to support ventilation', correct: true, why: 'Quieter is not always better in respiratory patients.' },
        { text: 'Definitely sleeping comfortably—no action needed', correct: false, why: 'Decreased RR and chest rise after distress is a red flag.' }
      ]},
      { id: 'radio', title: '7 · Radio report', body: 'Build the key content you must include.', prompt: 'Which set belongs in a concise report?', choices: [
        { text: 'Age/sex, respiratory complaint, key exam, vital trend, treatment/response, ETA', correct: true, why: 'That is the clinical arc the ED needs.' },
        { text: 'Only the apartment number and husband’s occupation', correct: false, why: 'Missing the clinical story.' }
      ]},
      { id: 'pcr', title: '8 · Documentation', body: 'Close the learning loop by documenting the same fictional call.', prompt: 'Best next step in EMSCodeSim?', choices: [
        { text: 'Open PCR Narrative Coach or AI Narrative Lab with the asthma/respiratory practice case', correct: true, why: 'Assessment → treatment → reassessment → documentation.' },
        { text: 'Paste a real patient PCR into the tool', correct: false, why: 'Never enter real protected health information into practice tools.' }
      ]}
    ],
    docLinks: [
      { href: '/pcr-narrative-coach.html?template=sob&case=asthma', label: 'Document in PCR Narrative Coach' },
      { href: '/narrative-writing-lab.html?scenario=shortness-of-breath&case=asthma', label: 'Document in AI Narrative Lab' },
      { href: '/vitals/visual-patient.html?case=asthma&training=assessment&reset=1', label: 'Replay full call in Assessment mode' }
    ]
  }
});
