(() => {
  'use strict';

  const ASSIGN_KEY = 'emscodesim_student_assignment_v1';
  const ASSIGNMENTS_KEY = 'emscodesim_instructor_assignments_v1';
  const readJSON = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
  const assignmentSession = readJSON(ASSIGN_KEY, null);
  const api = window.EMSCodeSimPatientRecord;
  const session = window.EMSCodeSimScenarioSession;
  const $ = id => document.getElementById(id);

  const cases = [
    { id:'asthma', image:'/vitals/assets/scenario-patient-adult-v3.png', title:'Respiratory Distress', patient:'24-year-old adult', scene:'Apartment • inhaler nearby', clue:'Upright, anxious, short sentences', dispatch:'You are dispatched for a 24-year-old with worsening shortness of breath and wheezing.', goal:'Recognize breathing difficulty, treat, reassess, and report' },
    { id:'stroke', image:'/vitals/assets/scenario-patient-adult-v3.png', title:'Possible Acute Stroke', patient:'68-year-old adult', scene:'Private residence • family present', clue:'Abnormal speech and right-sided weakness', dispatch:'You are dispatched for a 68-year-old with sudden speech difficulty and right-sided weakness.', goal:'Identify focal neurologic findings, establish timing, and prioritize transport' },
    { id:'hypoglycemia', image:'/vitals/assets/scenario-patient-adult-v3.png', title:'Altered Mental Status', patient:'57-year-old adult', scene:'Workplace break room', clue:'Confused, diaphoretic, slow to follow commands', dispatch:'You are dispatched for a 57-year-old who is confused, sweaty, and behaving abnormally.', goal:'Identify a reversible cause, treat appropriately, and reassess mental status' },
    { id:'trauma', image:'/vitals/assets/scenario-patient-adult-v3.png', title:'Blunt Trauma', patient:'36-year-old adult', scene:'Roadway collision', clue:'Pale with guarded breathing', dispatch:'You are dispatched to a two-vehicle collision for a patient with chest and abdominal pain.', goal:'Find immediate threats, support ABCs, and expedite trauma transport' },
    { id:'pediatric', image:'/vitals/assets/scenario-patient-pediatric-v3.png', title:'Sick Pediatric Patient', patient:'3-year-old child', scene:'Home • caregiver present', clue:'Poor interaction and increased work of breathing', dispatch:'You are dispatched for a 3-year-old with fever, poor interaction, and increased work of breathing.', goal:'Use the pediatric first look, identify respiratory or perfusion compromise, and reassess' }
  ];

  const select = $('caseSelect');
  const gallery = $('caseGallery');
  cases.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.title;
    select.appendChild(option);
  });

  function selectedMode() { return document.querySelector('input[name="trainingMode"]:checked')?.value || 'learning'; }
  function patientHome(caseId, mode = selectedMode()) { return `/vitals/visual-patient.html?case=${encodeURIComponent(caseId)}&training=${encodeURIComponent(mode)}`; }

  function renderGallery() {
    gallery.innerHTML = '';
    cases.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `case-choice${select.value === item.id ? ' is-selected' : ''}`;
      button.dataset.case = item.id;
      button.innerHTML = `<img src="${item.image}" alt="${item.title} patient scenario"><span class="case-choice-body"><strong>${item.title}</strong><span>${item.patient} • ${item.scene}</span><small>${item.clue}</small></span>`;
      button.addEventListener('click', () => {
        select.value = item.id;
        gallery.querySelectorAll('.case-choice').forEach(choice => choice.classList.toggle('is-selected', choice === button));
      });
      gallery.appendChild(button);
    });
  }

  function start(caseId) {
    const selected = cases.find(item => item.id === caseId) || cases[0];
    const current = api?.active?.();
    if (!current || current.scenarioId !== selected.id) api?.create?.(selected);
    session?.sync?.(selected.id);
    api?.setDocumentation?.({ trainingMode: selectedMode(), trainingModeSetAt: new Date().toISOString() });
    location.href = patientHome(selected.id, selectedMode());
  }

  function showActivePatient() {
    const current = api?.active?.();
    if (!current?.scenarioId) return;
    const banner = $('activePatientBanner');
    banner.hidden = false;
    $('activePatientTitle').textContent = `Resume ${current.title || 'active patient'}`;
    $('activePatientText').textContent = `${current.patient || 'Patient'} • Findings, partner tasks, and scene time remain saved.`;
    const savedMode = current.documentation?.trainingMode || 'learning';
    const modeInput = document.querySelector(`input[name="trainingMode"][value="${savedMode}"]`);
    if (modeInput) modeInput.checked = true;
    $('resumeActivePatient').href = patientHome(current.scenarioId, savedMode);
  }

  function showAssignment() {
    const params = new URLSearchParams(location.search);
    const assignmentCode = params.get('assignment');
    if (!assignmentCode && !assignmentSession) return;
    const assignments = readJSON(ASSIGNMENTS_KEY, []);
    const requestedCode = assignmentCode || assignmentSession?.assignmentCode || '';
    const match = assignments.find(item => String(item.code).toUpperCase() === String(requestedCode).toUpperCase());
    const learner = params.get('learner') || assignmentSession?.learnerName || '';
    $('assignmentBanner').hidden = false;
    $('assignmentBannerTitle').textContent = match?.name || 'Instructor-assigned scenario';
    $('assignmentBannerText').textContent = `${learner ? `Learner: ${learner}. ` : ''}${match?.due ? `Due ${match.due}. ` : ''}${match?.requireDebrief ? 'A completed debrief is required.' : 'Complete the assigned patient-care phases.'}`;
    const assignedCase = match?.scenario || assignmentSession?.scenario;
    if (assignedCase && cases.some(item => item.id === assignedCase)) select.value = assignedCase;
  }

  const params = new URLSearchParams(location.search);
  const selected = params.get('select') || params.get('case') || assignmentSession?.scenario;
  if (selected && cases.some(item => item.id === selected)) select.value = selected;
  showAssignment();
  renderGallery();
  showActivePatient();

  select.addEventListener('change', renderGallery);
  $('startCase').addEventListener('click', () => start(select.value));
  $('randomCase').addEventListener('click', () => {
    const selectedCase = cases[Math.floor(Math.random() * cases.length)];
    select.value = selectedCase.id;
    renderGallery();
  });
})();
