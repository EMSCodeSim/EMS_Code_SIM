(() => {
  'use strict';

  const api = window.EMSCodeSimPatientRecord;
  const session = window.EMSCodeSimScenarioSession;
  const registry = window.EMSCodeSimToolRegistry;
  const $ = id => document.getElementById(id);
  let record = session?.sync?.() || api?.active?.();

  if (!record || !registry) {
    $('noPatient').hidden = false;
    $('workspace').hidden = true;
    return;
  }

  $('noPatient').hidden = true;
  $('workspace').hidden = false;
  const caseId = record.scenarioId || record.id;
  const scenarioPictures = {
    asthma: '/vitals/assets/scenario-patient-adult-v3.png', stroke: '/vitals/assets/scenario-patient-adult-v3.png',
    hypoglycemia: '/vitals/assets/scenario-patient-adult-v3.png', trauma: '/vitals/assets/scenario-patient-adult-v3.png',
    pediatric: '/vitals/assets/scenario-patient-pediatric-v3.png'
  };
  const scenarioConditions = {
    asthma: 'Sitting upright, anxious, and speaking in short sentences.', stroke: 'Awake with abnormal speech and right-sided weakness.',
    hypoglycemia: 'Confused, sweaty, and slow to follow commands.', trauma: 'Pale with guarded breathing after a motor-vehicle collision.',
    pediatric: 'Poor interaction with increased work of breathing.'
  };

  function loadPicture(image, path) {
    image.onerror = () => { image.onerror = null; image.src = '/vitals/assets/scenario-patient-adult-v3.png'; image.classList.add('image-fallback'); };
    image.src = path || '/vitals/assets/scenario-patient-adult-v3.png';
  }

  loadPicture($('workspacePatientImage'), scenarioPictures[caseId]);
  $('workspacePatientLabel').textContent = record.patient || record.title || 'Scenario patient';
  $('workspacePatientCondition').textContent = scenarioConditions[caseId] || record.scene || 'Observe the patient before beginning the assessment.';
  $('workspaceDispatch').textContent = record.dispatch || record.title || 'Active patient scenario';
  document.querySelector('.workspace-hero-actions a:last-child').href = session?.scenarioHome?.(caseId) || `/vitals/visual-patient.html?case=${encodeURIComponent(caseId)}`;
  document.querySelector('.workspace-hero-actions a:last-child').textContent = 'Patient home';

  const vitalKeys = new Set((registry.vitalTools || []).map(tool => tool.key));
  const primaryKeys = new Set(['airway', 'breathing', 'perfusion']);
  const historyKeys = new Set(['sample', 'pain']);

  const primary = registry.assessmentTools.filter(tool => primaryKeys.has(tool.key));
  const vitals = registry.vitalTools.map(tool => ({ ...tool, category: 'Vital signs' }));
  const history = registry.assessmentTools.filter(tool => historyKeys.has(tool.key));
  const focused = registry.assessmentTools.filter(tool => !primaryKeys.has(tool.key) && !historyKeys.has(tool.key) && !vitalKeys.has(tool.key));
  const care = [
    { key: 'treatment_reassessment', label: 'Treatment and reassessment', description: 'Select care, repeat relevant findings, and document response.', url: '/vitals/treatment-reassessment.html' },
    { key: 'clinical_impression', label: 'Clinical impression', description: 'Choose a working impression supported by collected findings.', url: '/vitals/clinical-impression.html' },
    { key: 'pcr_handoff', label: 'PCR and handoff', description: 'Create a concise patient-care report and verbal handoff.', url: '/vitals/pcr-handoff.html' }
  ];

  const phases = [
    { id: 'primary', title: 'Primary assessment', steps: primary },
    { id: 'vitals', title: 'All vital and bedside tools', steps: vitals },
    { id: 'focused', title: 'All focused assessment tools', steps: focused },
    { id: 'history', title: 'History and symptom assessment', steps: history },
    { id: 'report', title: 'Treatment, impression, and report', steps: care }
  ].filter(phase => phase.steps.length);

  function findingFor(step) {
    record = session?.sync?.(caseId) || api?.active?.() || record;
    const finding = api?.getFinding?.(step.key, record);
    if (finding) return finding;
    if (step.key === 'sample' && Object.keys(record.history || {}).length) return { value: 'History recorded' };
    if (step.key === 'clinical_impression' && record.impressions?.primary) return { value: record.impressions.primary };
    if (step.key === 'treatment_reassessment' && ((record.treatments || []).length || (record.reassessments || []).length)) return { value: 'Care and reassessment recorded' };
    if (step.key === 'pcr_handoff' && (record.documentation?.narrative || record.documentation?.handoff)) return { value: 'Report prepared' };
    return null;
  }

  function workspaceReturn() {
    return `/vitals/assessment-workspace.html?mode=scenario&resume=1&case=${encodeURIComponent(caseId)}`;
  }

  function stepUrl(step) {
    return registry.buildUrl(step.url, { caseId, returnTo: workspaceReturn(), returnLabel: 'guided assessment', context: step.key === 'airway' ? 'airway' : step.key === 'breathing' ? 'breathing' : '' });
  }

  function referenceQuery(step) {
    return `${step.label} EMT assessment`;
  }

  function referenceUrl(step) {
    return `/ems-encyclopedia.html?q=${encodeURIComponent(referenceQuery(step))}&level=EMT&view=field&return=${encodeURIComponent(workspaceReturn())}`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }

  function render(filter = 'all') {
    const host = $('phaseSections');
    host.innerHTML = '';
    let total = 0;
    let done = 0;
    let firstIncomplete = null;

    phases.forEach(phase => {
      const phaseDone = phase.steps.filter(findingFor).length;
      total += phase.steps.length;
      done += phaseDone;
      if (filter !== 'all' && filter !== phase.id) return;

      const section = document.createElement('section');
      section.className = 'phase-card';
      section.dataset.phase = phase.id;
      section.innerHTML = `<div class="phase-heading"><h2>${phase.title}</h2><span>${phaseDone} of ${phase.steps.length}</span></div><div class="step-list"></div>`;
      const list = section.querySelector('.step-list');

      phase.steps.forEach((step, index) => {
        const finding = findingFor(step);
        const complete = Boolean(finding);
        if (!complete && !firstIncomplete) firstIncomplete = step;
        const value = finding?.finding || finding?.value || finding?.details || '';
        const article = document.createElement('article');
        article.className = `assessment-step${complete ? ' complete' : ''}`;
        article.innerHTML = `<div class="step-marker">${complete ? '✓' : index + 1}</div><div><h3>${step.label}</h3><p>${step.description}</p>${complete ? `<p class="finding-preview">Reported: ${escapeHtml(value || 'Complete')}</p>` : ''}<div class="step-tools"><a class="reference-link" href="${referenceUrl(step)}">Quick reference</a></div></div><a class="step-open-link" href="${stepUrl(step)}">${complete ? 'Review' : 'Open'}</a>`;
        list.appendChild(article);
      });
      host.appendChild(section);
    });

    const percent = total ? Math.round((done / total) * 100) : 0;
    $('progressText').textContent = `${done} of ${total} tools completed`;
    $('progressPercent').textContent = `${percent}%`;
    $('progressRing').style.setProperty('--progress', `${percent}%`);
    $('nextText').textContent = done === total ? 'All connected tools are complete. Review findings and prepare the handoff.' : `${total - done} tool${total - done === 1 ? '' : 's'} remaining.`;

    const next = firstIncomplete || { label: 'Patient findings', description: 'Review the complete patient record before handoff.', url: '/vitals/patient-record.html' };
    $('nextActionTitle').textContent = done === total ? 'Review and report' : next.label;
    $('nextActionDescription').textContent = next.description;
    $('nextActionLink').href = done === total ? '/vitals/patient-record.html?mode=scenario&resume=1' : stepUrl(next);
    $('nextActionLink').textContent = done === total ? 'Open patient record' : 'Open next tool';
  }

  let activeFilter = 'all';
  document.querySelectorAll('[data-phase]').forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.phase;
    document.querySelectorAll('[data-phase]').forEach(item => item.classList.toggle('active', item === button));
    render(activeFilter);
  }));

  function refresh() {
    record = session?.sync?.(caseId) || api?.active?.() || record;
    render(activeFilter);
  }

  window.addEventListener('emscodesim:patient-record-updated', refresh);
  window.addEventListener('emscodesim:scenario-finding-saved', refresh);
  window.addEventListener('pageshow', refresh);
  render();
})();
