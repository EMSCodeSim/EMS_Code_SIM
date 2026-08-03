(() => {
  'use strict';

  const sharedCategories = [
    { id:'current', label:'Current problem', description:'Chief complaint and what is bothering the patient now.', icon:'●' },
    { id:'opqrst', label:'Symptoms / OPQRST', description:'Onset, triggers, quality, location, severity, and timing.', icon:'◷' },
    { id:'background', label:'Medical background', description:'Allergies, medications, and relevant medical history.', icon:'✚' },
    { id:'events', label:'What happened', description:'Last intake, events, prior episodes, and witnesses.', icon:'↗' }
  ];

  const PROFILES = {
    asthma: {
      responder:'Patient',
      communication:'Alert and anxious. The patient answers in short sentences because of dyspnea.',
      opening:'The patient looks at you and says, “I can’t catch my breath.”',
      fallback:'“I’m sorry—I’m having trouble talking. Ask me one thing at a time.”',
      repeatPrefix:'“I already told you—',
      sampleRequired:['symptoms','allergies','medications','medical_history','last_intake','events'],
      opqrstRequired:['onset','provocation','quality','radiation','severity','time'],
      opqrstSummary:'OPQRST obtained: breathing difficulty and chest tightness began about 2 hours ago after cleaning a dusty room, worsens with movement and talking, feels tight with no radiation, is rated 7/10, and has steadily worsened despite two inhaler doses.',
      questions:[
        {id:'chief_complaint',category:'current',label:'What is bothering you most?',prompt:'What is bothering you most right now?',response:'“I can’t catch my breath, and my chest feels tight.”',keywords:['bothering','chief complaint','wrong','problem']},
        {id:'symptoms',category:'current',label:'What symptoms are you having?',prompt:'What symptoms are you having?',response:'“Shortness of breath, tightness, coughing, and wheezing. No chest pain, fever, hives, swelling, or choking.”',keywords:['symptom','feel','shortness','breath','wheezing','cough']},
        {id:'onset',category:'opqrst',label:'When did this begin?',prompt:'When did this begin?',response:'“About two hours ago.”',keywords:['when','start','begin','onset']},
        {id:'provocation',category:'opqrst',label:'What makes it better or worse?',prompt:'What makes it better or worse?',response:'“Talking and moving make it worse. Sitting up helps a little. My inhaler only helped for a few minutes.”',keywords:['better','worse','provocation','relieve','trigger']},
        {id:'quality',category:'opqrst',label:'How would you describe it?',prompt:'How would you describe the feeling?',response:'“It feels tight, like I can’t get the air out.”',keywords:['describe','quality','feel like','tight']},
        {id:'radiation',category:'opqrst',label:'Does it go anywhere?',prompt:'Does the discomfort move or go anywhere?',response:'“No. The tightness stays across my chest.”',keywords:['radiate','radiation','go anywhere','move']},
        {id:'severity',category:'opqrst',label:'How severe is it?',prompt:'How severe is it from 0 to 10?',response:'“About a seven.”',keywords:['severe','severity','scale','0 to 10','pain number']},
        {id:'time',category:'opqrst',label:'Has it changed over time?',prompt:'Has it changed since it began?',response:'“It has steadily gotten worse. The inhaler helped briefly, then it came right back.”',keywords:['time','changed','constant','intermittent','progress']},
        {id:'allergies',category:'background',label:'Do you have allergies?',prompt:'Do you have any medication or other allergies?',response:'“No known allergies.”',keywords:['allergy','allergies','allergic']},
        {id:'medications',category:'background',label:'What medications do you take?',prompt:'What medications do you take?',response:'“Just my albuterol rescue inhaler. I used it twice today.”',keywords:['medication','medicine','meds','take','inhaler']},
        {id:'medical_history',category:'background',label:'What medical problems do you have?',prompt:'What medical problems have you been diagnosed with?',response:'“Asthma since I was a kid. I went to the ER once, but I’ve never been intubated.”',keywords:['history','medical problem','diagnosed','past medical','asthma']},
        {id:'last_intake',category:'events',label:'When did you last eat or drink?',prompt:'When did you last eat or drink?',response:'“I ate a sandwich about three hours ago.”',keywords:['eat','drink','last oral','intake','meal']},
        {id:'events',category:'events',label:'What were you doing when it started?',prompt:'What were you doing when this started?',response:'“I was cleaning a really dusty room. It started after that and kept getting worse.”',keywords:['happened','doing','event','before','dust','trigger']},
        {id:'prior_episodes',category:'events',label:'Has this happened before?',prompt:'Has this happened before?',response:'“I’ve had asthma attacks before, but this one is worse than usual.”',keywords:['before','previous','prior episode','happened before']}
      ]
    },
    stroke: {
      responder:'Patient and family',
      communication:'The patient is awake but speech is slurred. Family can clarify timing and history.',
      opening:'The patient tries to answer. A family member says, “This started all of a sudden.”',
      fallback:'The patient struggles to answer. The family member asks you to repeat the question more simply.',
      repeatPrefix:'The family member says, “Like I said—',
      sampleRequired:['symptoms','allergies','medications','medical_history','last_intake','events'],
      opqrstRequired:[],
      questions:[
        {id:'chief_complaint',category:'current',label:'What changed today?',prompt:'What changed today?',response:'The patient says, “My arm…” A family member adds, “His speech changed and his right side became weak.”',keywords:['changed','chief complaint','wrong','problem']},
        {id:'symptoms',category:'current',label:'What symptoms are present?',prompt:'What symptoms are present?',response:'Family reports sudden slurred speech, right facial droop, and right arm weakness. They deny trauma, seizure, severe headache, or chest pain.',keywords:['symptom','weakness','speech','face','arm']},
        {id:'onset',category:'opqrst',label:'When were symptoms first noticed?',prompt:'When were symptoms first noticed?',response:'“We noticed it at 9:25 this morning.”',keywords:['when','onset','start','noticed']},
        {id:'last_known_well',category:'opqrst',label:'When was the patient last normal?',prompt:'When was the patient last known well?',response:'“He was completely normal at 9:10.”',keywords:['last known well','last normal','lkw','normal time']},
        {id:'progression',category:'opqrst',label:'Have the symptoms changed?',prompt:'Have the symptoms improved or worsened?',response:'“They have stayed present and seem a little worse.”',keywords:['changed','better','worse','progress']},
        {id:'allergies',category:'background',label:'Does the patient have allergies?',prompt:'Does the patient have any allergies?',response:'“Penicillin gives him a rash.”',keywords:['allergy','allergies','allergic','penicillin']},
        {id:'medications',category:'background',label:'What medications does the patient take?',prompt:'What medications does the patient take?',response:'“Lisinopril and atorvastatin. He does not take a blood thinner that we know of.”',keywords:['medication','medicine','meds','blood thinner','anticoagulant']},
        {id:'medical_history',category:'background',label:'What medical history does the patient have?',prompt:'What medical history does the patient have?',response:'“High blood pressure and high cholesterol. No previous stroke.”',keywords:['history','medical problem','diagnosed','past medical','stroke']},
        {id:'last_intake',category:'events',label:'When did the patient last eat?',prompt:'When did the patient last eat or drink?',response:'“Breakfast about two hours ago.”',keywords:['eat','drink','last oral','intake','meal']},
        {id:'events',category:'events',label:'What happened immediately before this?',prompt:'What happened immediately before the symptoms?',response:'“He was drinking coffee. At 9:10 he was normal; at 9:25 his cup slipped and his speech sounded wrong.”',keywords:['happened','event','before','coffee','timeline']},
        {id:'seizure_trauma',category:'events',label:'Was there a seizure or injury?',prompt:'Was there any seizure, fall, or head injury?',response:'“No seizure, fall, or injury.”',keywords:['seizure','fall','injury','trauma','head strike']}
      ]
    },
    hypoglycemia: {
      responder:'Patient and coworker',
      communication:'The patient is confused and gives incomplete answers. A coworker can provide collateral history.',
      opening:'The patient looks at you but answers slowly. A coworker says, “This is not normal for them.”',
      fallback:'The patient looks confused and cannot give a reliable answer. The coworker does not know that detail.',
      repeatPrefix:'The coworker says, “I already mentioned—',
      sampleRequired:['symptoms','allergies','medications','medical_history','last_intake','events'],
      opqrstRequired:[],
      questions:[
        {id:'chief_complaint',category:'current',label:'What is happening now?',prompt:'What is happening now?',response:'The patient says, “I feel… shaky.” The coworker reports confusion, weakness, and sweating.',keywords:['happening','chief complaint','wrong','problem']},
        {id:'symptoms',category:'current',label:'What symptoms have you noticed?',prompt:'What symptoms have you noticed?',response:'The coworker reports progressive confusion, weakness, shakiness, and heavy sweating. No witnessed seizure or trauma.',keywords:['symptom','confusion','shaky','sweat','weak']},
        {id:'onset',category:'opqrst',label:'When did this begin?',prompt:'When did this begin?',response:'“About twenty minutes before you arrived.”',keywords:['when','onset','start','begin']},
        {id:'progression',category:'opqrst',label:'Has the patient changed?',prompt:'Has the condition changed since it began?',response:'“They became progressively more confused and harder to redirect.”',keywords:['changed','better','worse','progress']},
        {id:'allergies',category:'background',label:'Does the patient have allergies?',prompt:'Do you have any allergies?',response:'The patient shakes their head. The coworker says no known allergies are listed.',keywords:['allergy','allergies','allergic']},
        {id:'medications',category:'background',label:'What medications are taken?',prompt:'What medications do you take?',response:'The patient says, “Insulin.” The coworker found rapid-acting and long-acting insulin in the patient’s bag.',keywords:['medication','medicine','meds','insulin','take']},
        {id:'medical_history',category:'background',label:'What medical problems are known?',prompt:'What medical problems do you have?',response:'“Type 1 diabetes.”',keywords:['history','medical problem','diagnosed','past medical','diabetes']},
        {id:'last_intake',category:'events',label:'When did the patient last eat?',prompt:'When did you last eat or drink?',response:'The patient cannot answer clearly. The coworker says the patient skipped breakfast and had not eaten since dinner last night.',keywords:['eat','drink','breakfast','last oral','intake','meal']},
        {id:'events',category:'events',label:'What happened before the confusion?',prompt:'What happened before the confusion?',response:'The coworker says the patient took the usual morning insulin, came to an early shift without breakfast, then became sweaty and confused.',keywords:['happened','event','before','shift','morning insulin']},
        {id:'substances',category:'events',label:'Could drugs or alcohol be involved?',prompt:'Could alcohol, recreational drugs, or an overdose be involved?',response:'The coworker denies known alcohol or drug use today and saw no medication containers other than insulin.',keywords:['drug','alcohol','overdose','substance']}
      ]
    },
    trauma: {
      responder:'Patient',
      communication:'The patient is anxious, in severe pain, and occasionally confused but can answer brief questions.',
      opening:'The patient says, “My chest and stomach hurt. Please get me out of here.”',
      fallback:'“I don’t know. Everything happened so fast.”',
      repeatPrefix:'“I told you—',
      sampleRequired:['symptoms','allergies','medications','medical_history','last_intake','events'],
      opqrstRequired:['onset','provocation','quality','radiation','severity','time'],
      opqrstSummary:'OPQRST obtained: severe chest and abdominal pain began immediately at impact, worsens with movement and breathing, feels sharp in the left chest and deep across the abdomen, does not clearly radiate, is rated 9/10, and has remained constant since the collision.',
      questions:[
        {id:'chief_complaint',category:'current',label:'Where do you hurt most?',prompt:'Where do you hurt most?',response:'“My left chest and my whole stomach.”',keywords:['hurt','chief complaint','pain','where']},
        {id:'symptoms',category:'current',label:'What symptoms are you having?',prompt:'What symptoms are you having?',response:'“Severe chest pain, stomach pain, shortness of breath, and dizziness. I did not black out.”',keywords:['symptom','feel','shortness','dizzy','loss consciousness']},
        {id:'onset',category:'opqrst',label:'When did the pain start?',prompt:'When did the pain start?',response:'“Right when we hit.”',keywords:['when','start','begin','onset']},
        {id:'provocation',category:'opqrst',label:'What makes it worse?',prompt:'What makes the pain better or worse?',response:'“Moving and taking a deep breath make it worse. Nothing really helps.”',keywords:['better','worse','provocation','movement','breath']},
        {id:'quality',category:'opqrst',label:'What does the pain feel like?',prompt:'What does the pain feel like?',response:'“Sharp in my chest and deep pressure across my stomach.”',keywords:['describe','quality','feel like','sharp','pressure']},
        {id:'radiation',category:'opqrst',label:'Does the pain travel?',prompt:'Does the pain move or travel anywhere?',response:'“No, it stays in my chest and stomach.”',keywords:['radiate','radiation','travel','go anywhere']},
        {id:'severity',category:'opqrst',label:'How severe is the pain?',prompt:'How severe is the pain from 0 to 10?',response:'“A nine.”',keywords:['severe','severity','scale','0 to 10','pain number']},
        {id:'time',category:'opqrst',label:'Has the pain changed?',prompt:'Has the pain changed since the crash?',response:'“It has been constant and feels worse when I move.”',keywords:['time','changed','constant','intermittent']},
        {id:'allergies',category:'background',label:'Do you have allergies?',prompt:'Do you have any allergies?',response:'“No known allergies.”',keywords:['allergy','allergies','allergic']},
        {id:'medications',category:'background',label:'What medications do you take?',prompt:'What medications do you take?',response:'“None every day. No blood thinners.”',keywords:['medication','medicine','meds','blood thinner','anticoagulant']},
        {id:'medical_history',category:'background',label:'What medical problems do you have?',prompt:'What medical problems do you have?',response:'“Nothing important.”',keywords:['history','medical problem','diagnosed','past medical']},
        {id:'last_intake',category:'events',label:'When did you last eat?',prompt:'When did you last eat or drink?',response:'“Lunch about an hour before the crash.”',keywords:['eat','drink','last oral','intake','meal']},
        {id:'events',category:'events',label:'Tell me what happened.',prompt:'Tell me what happened.',response:'“I was the restrained driver. We hit another car head-on at road speed. The airbag went off, the steering wheel bent, and someone helped me out.”',keywords:['happened','event','collision','crash','mechanism','seatbelt','restrained']},
        {id:'loss_consciousness',category:'events',label:'Did you lose consciousness?',prompt:'Did you lose consciousness?',response:'“No. I remember the whole crash.”',keywords:['loss consciousness','black out','passed out','remember']}
      ]
    },
    pediatric: {
      responder:'Caregiver',
      communication:'The child is poorly interactive. The caregiver provides most of the history while the child remains close.',
      opening:'The caregiver holds the child and says, “The breathing got much worse this morning.”',
      fallback:'The caregiver says, “I’m not sure. They’re too young to explain it.”',
      repeatPrefix:'The caregiver says, “Like I said—',
      sampleRequired:['symptoms','allergies','medications','medical_history','last_intake','events'],
      opqrstRequired:[],
      questions:[
        {id:'chief_complaint',category:'current',label:'What concerns you most?',prompt:'What concerns you most right now?',response:'“The breathing and how little they are interacting with me.”',keywords:['concern','chief complaint','wrong','problem']},
        {id:'symptoms',category:'current',label:'What symptoms have you noticed?',prompt:'What symptoms have you noticed?',response:'“Cough and fever for two days, less activity, poor drinking, and much harder breathing since overnight.”',keywords:['symptom','cough','fever','breathing','activity']},
        {id:'onset',category:'opqrst',label:'When did the illness begin?',prompt:'When did this illness begin?',response:'“The cough and fever started two days ago. The breathing worsened overnight.”',keywords:['when','onset','start','begin']},
        {id:'progression',category:'opqrst',label:'How has the child changed?',prompt:'How has the child changed since becoming sick?',response:'“They are less playful, drinking less, and much sleepier this morning.”',keywords:['changed','better','worse','progress','sleepy']},
        {id:'allergies',category:'background',label:'Does the child have allergies?',prompt:'Does the child have any allergies?',response:'“No known allergies.”',keywords:['allergy','allergies','allergic']},
        {id:'medications',category:'background',label:'What medications were given?',prompt:'What medications does the child take or what was given today?',response:'“No daily medicines. I gave acetaminophen about four hours ago.”',keywords:['medication','medicine','meds','acetaminophen','tylenol']},
        {id:'medical_history',category:'background',label:'What medical history does the child have?',prompt:'What medical history does the child have?',response:'“Born at term, shots are current, and no heart or lung problems.”',keywords:['history','medical problem','born','immunization','shots','past medical']},
        {id:'last_intake',category:'events',label:'When did the child last drink or eat?',prompt:'When did the child last eat or drink?',response:'“A small amount of juice about three hours ago. Very little since then.”',keywords:['eat','drink','last oral','intake','juice','meal']},
        {id:'events',category:'events',label:'What happened before EMS was called?',prompt:'What happened before EMS was called?',response:'“The breathing worsened overnight, and this morning the child stopped playing and barely responded to me.”',keywords:['happened','event','before','called','overnight']},
        {id:'urine_output',category:'events',label:'Has the child been urinating normally?',prompt:'Has the child had normal wet diapers or urination?',response:'“Fewer wet diapers today.”',keywords:['urine','urinating','wet diaper','pee']},
        {id:'sick_contacts',category:'events',label:'Any sick contacts?',prompt:'Has anyone around the child been sick?',response:'“A sibling had a cold last week.”',keywords:['sick contact','anyone sick','sibling','daycare']}
      ]
    }
  };

  function get(caseId) {
    const profile = PROFILES[caseId] || PROFILES.asthma;
    return { ...profile, categories: sharedCategories, questions: profile.questions.map(question => ({ ...question })) };
  }

  function findQuestion(caseId, text) {
    const value = String(text || '').trim().toLowerCase();
    if (!value) return null;
    const profile = get(caseId);
    let best = null;
    let bestScore = 0;
    profile.questions.forEach(question => {
      const terms = [...(question.keywords || []), question.label, question.prompt].map(term => String(term).toLowerCase());
      const score = terms.reduce((total, term) => total + (term && value.includes(term) ? Math.max(1, term.split(/\s+/).length) : 0), 0);
      if (score > bestScore) { best = question; bestScore = score; }
    });
    return bestScore ? best : null;
  }

  window.EMSCodeSimScenarioInterviews = Object.freeze({ PROFILES, categories:sharedCategories, get, findQuestion });
})();
