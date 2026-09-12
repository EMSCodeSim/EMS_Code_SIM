(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const requestedCase = String(params.get('case') || '').replace(/-/g, '_').toLowerCase();
  const trainingMode = String(params.get('training') || 'learning').toLowerCase();
  if (requestedCase !== 'asthma' || trainingMode !== 'learning') return;

  const CASE = Object.freeze({
    id: 'asthma',
    title: 'Breathing Problem',
    patient: 'Adult with known asthma',
    chiefComplaint: "I can’t get air",
    impressionTag: 'severe dyspnea',
    clockLabel: 'Patient clock • severe dyspnea',
    setting: Object.freeze({
      place: 'public park',
      time: 'late afternoon',
      weather: 'dry',
      bystanders: 'present',
      access: 'easy'
    }),
    sceneSafety: Object.freeze({ safe: true, hazard: 'none', traumaMechanism: 'none' }),
    scene: 'Public park. Adult sitting forward on a bench. Audible wheeze. Speaking in short phrases. No obvious trauma.',
    generalImpression: Object.freeze({
      appearance: 'Anxious, tripod / forward lean, diaphoretic',
      workOfBreathing: 'Accessory muscles, prolonged expiratory phase',
      circulationToSkin: 'Pink but sweaty'
    }),
    firstAction: Object.freeze({
      label: 'Look / listen / feel — work of breathing',
      findings: Object.freeze([
        'Tripod position',
        'Speaks 3–4 word sentences',
        'Audible expiratory wheeze',
        'Retractions / accessory muscle use',
        'No stridor',
        'No external trauma'
      ])
    }),
    unlocks: Object.freeze(['lung sounds', 'SpO₂', 'RR', 'pulse', 'mental status', 'SAMPLE / OPQRST']),
    coaching: Object.freeze({
      lungSounds: 'Wheeze means air is still moving. A silent chest is worse than a noisy one.'
    }),
    reassess: Object.freeze({
      delayMs: 120000,
      required: Object.freeze(['Speaking', 'Work of breathing', 'Lung sounds', 'SpO₂', 'Mental status'])
    }),
    debriefCriteria: Object.freeze([
      'Recognized respiratory distress from general impression',
      'Distinguished airway vs breathing',
      'Got lung sounds and air movement, not just “wheeze present”',
      'Gave O₂ + bronchodilator early',
      'Asked prior intubation / ICU / steroid history',
      'Reassessed after first treatment',
      'Transport decision matches response'
    ])
  });

  window.EMSCodeSimAsthmaLearningCase = CASE;

  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => [...r.querySelectorAll(s)];
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const api = () => window.EMSCodeSimPatientRecord;
  const record = () => window.EMSCodeSimScenarioSession?.sync?.() || api()?.active?.() || {};
  const stateKey = () => `emscodesim_asthma_learning_${record()?.id || 'active'}`;
  const now = () => Date.now();
  let state = { firstLookAt: 0, bronchodilatorAt: 0, lungCoachShown: false };
  let timer = 0;
  let rendering = false;

  function loadState() {
    try { state = { ...state, ...JSON.parse(sessionStorage.getItem(stateKey()) || '{}') }; } catch (_) {}
  }
  function saveState() {
    try { sessionStorage.setItem(stateKey(), JSON.stringify(state)); } catch (_) {}
  }

  function bindCaseObjects() {
    const defs = window.EMSCodeSimScenarioDefinitions;
    if (defs?.CATALOG?.asthma) {
      Object.assign(defs.CATALOG.asthma, {
        id: CASE.id,
        title: CASE.title,
        patient: CASE.patient,
        chiefComplaint: CASE.chiefComplaint,
        impressionTag: CASE.impressionTag,
        clockLabel: CASE.clockLabel,
        setting: CASE.setting,
        sceneSafety: CASE.sceneSafety,
        scene: CASE.scene,
        generalImpression: CASE.generalImpression,
        firstAction: CASE.firstAction,
        coaching: CASE.coaching,
        debriefCriteria: CASE.debriefCriteria,
        dispatch: 'Adult with a breathing problem in a public park.',
        goal: 'Recognize respiratory distress, assess air movement, treat early, reassess response, and make an appropriate transport decision.'
      });
    }
    if (defs?.PROFILES?.asthma) {
      const profile = defs.PROFILES.asthma;
      profile.patient = CASE.patient;
      profile.dispatch = 'Adult with a breathing problem in a public park.';
      profile.scene = CASE.scene;
      profile.chiefComplaint = CASE.chiefComplaint;
      profile.impressionTag = CASE.impressionTag;
      profile.clockLabel = CASE.clockLabel;
      profile.generalImpression = CASE.generalImpression;
      if (profile.sample) {
        profile.sample.title = CASE.title;
        profile.sample.description = CASE.scene;
        profile.sample.detail = 'S: Severe shortness of breath, chest tightness, cough, and wheezing; denies fever, chest pain, hives, facial swelling, choking, or trauma. A: No known medication allergies. M: Albuterol rescue inhaler; used two doses with only brief improvement. P: Asthma since childhood; one prior ED visit; no prior intubation or ICU admission; one prior oral-steroid course, not recent. L: Ate a sandwich about 3 hours ago. E: Symptoms began while jogging through freshly mowed grass and worsened despite the inhaler.';
      }
    }
    if (defs?.PATIENT_CASES?.asthma) {
      defs.PATIENT_CASES.asthma.visible = 'Sitting forward on a park bench, anxious, diaphoretic, speaking in 3–4 word sentences with audible expiratory wheeze';
      defs.PATIENT_CASES.asthma.sceneClues = ['Public park', 'Tripod / forward lean', 'Short phrases', 'Audible wheeze', 'No obvious trauma'];
    }

    const interview = window.EMSCodeSimScenarioInterviews?.PROFILES?.asthma;
    if (interview && Array.isArray(interview.questions) && !interview.questions.some(item => item.id === 'prior_severity')) {
      interview.questions.push({
        id: 'prior_severity',
        category: 'Medical background',
        label: 'Have you ever been intubated, admitted to an ICU, or needed steroids for your asthma?',
        response: '“I’ve never been intubated or admitted to an ICU. I had one ER visit before and needed oral steroids once, but not recently.”',
        keywords: ['intubated', 'intubation', 'icu', 'steroid', 'severe asthma', 'hospitalized']
      });
    }
  }

  function bindVisibleIdentity() {
    const dispatch = q('#dispatch');
    const title = q('#caseTitle');
    const scene = q('#scene');
    const clock = q('#patientClockStatus');
    if (dispatch) dispatch.textContent = 'BREATHING PROBLEM • PUBLIC PARK';
    if (title) title.textContent = `“${CASE.chiefComplaint}”`;
    if (scene) scene.textContent = CASE.scene;
    if (clock && !state.bronchodilatorAt) clock.textContent = CASE.clockLabel;
    document.body.dataset.caseIdentity = CASE.id;
    document.body.dataset.caseChiefComplaint = CASE.chiefComplaint;
  }

  function ensureStyles() {
    if (q('#asthmaLearningContractStyles')) return;
    const style = document.createElement('style');
    style.id = 'asthmaLearningContractStyles';
    style.textContent = `
      .asthma-learning-start{margin:10px 0;padding:14px;border:1px solid #31586b;border-radius:14px;background:#0d2534;color:#ecf8fc}
      .asthma-learning-start header{display:flex;justify-content:space-between;gap:12px;align-items:start}.asthma-learning-start small{font-size:.64rem;letter-spacing:.09em;font-weight:900;color:#7ec8e5}.asthma-learning-start h2{margin:3px 0 0;font-size:1rem}.asthma-learning-impression{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:11px 0}.asthma-learning-impression article{padding:9px;border:1px solid #2e5265;border-radius:10px;background:#102c3c}.asthma-learning-impression strong{display:block;margin-top:3px;font-size:.8rem}.asthma-first-action{width:100%;min-height:50px;border:1px solid #49a9cf;border-radius:11px;background:#0d78ae;color:#fff;font:inherit;font-weight:900;cursor:pointer}.asthma-first-action.done{background:#123b31;border-color:#59b68c}.asthma-unlock-note{margin:8px 0 0;color:#abc4d0;font-size:.74rem;line-height:1.4}.asthma-learning-findings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:10px}.asthma-learning-findings span{padding:7px 8px;border-radius:8px;background:#102f3f;border:1px solid #31586b;font-size:.75rem}.asthma-learning-coach{margin:10px 0;padding:10px 12px;border-left:4px solid #6fc6e8;border-radius:8px;background:#102d3d;color:#edfaff;font-size:.82rem;font-weight:750}.asthma-reassess-gate{margin:10px 0;padding:11px 12px;border:1px solid #866f31;border-radius:12px;background:#332b12;color:#fff2c7}.asthma-reassess-gate strong{display:block}.asthma-reassess-gate p{margin:4px 0 0;font-size:.76rem;line-height:1.4}.asthma-debrief-contract{margin:12px 0;padding:14px;border:1px solid #31586b;border-radius:14px;background:#0e2735;color:#eef9fc}.asthma-debrief-contract h3{margin:0 0 8px}.asthma-debrief-contract ul{margin:0;padding-left:20px;display:grid;gap:6px}.asthma-debrief-contract li{font-size:.82rem;line-height:1.35}.asthma-debrief-contract li.pass::marker{content:'✓  ';color:#66d09a}.asthma-debrief-contract li.miss::marker{content:'•  ';color:#e7bd5a}
      body.asthma-first-look-pending [data-mobile-domain="vitalsPanel"],body.asthma-first-look-pending [data-mobile-domain="historyPanel"],body.asthma-first-look-pending [data-mobile-domain="treatmentPanel"],body.asthma-first-look-pending #desktopPatientActions [data-panel="vitalsPanel"],body.asthma-first-look-pending #desktopPatientActions [data-panel="historyPanel"],body.asthma-first-look-pending #desktopPatientActions [data-panel="treatmentPanel"]{opacity:.42!important;filter:saturate(.45)}
      @media(max-width:979px){.asthma-learning-start{margin:8px 12px}.asthma-learning-impression{grid-template-columns:1fr}.asthma-learning-findings{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function host() {
    return q('#clinicalInteractionColumn') || q('#patientFirstMobileFeed') || q('.patient-control-column') || q('.scenario-hero-layout');
  }

  function ensureStartCard() {
    const parent = host();
    if (!parent) return;
    let card = q('#asthmaLearningStart');
    if (!card) {
      card = document.createElement('section');
      card.id = 'asthmaLearningStart';
      card.className = 'asthma-learning-start';
      card.innerHTML = `
        <header><div><small>GENERAL IMPRESSION</small><h2>What you can see before touching the patient</h2></div><span>Learning mode</span></header>
        <div class="asthma-learning-impression">
          <article><small>APPEARANCE</small><strong></strong></article>
          <article><small>WORK OF BREATHING</small><strong></strong></article>
          <article><small>CIRCULATION TO SKIN</small><strong></strong></article>
        </div>
        <button id="asthmaFirstLookAction" class="asthma-first-action" type="button"></button>
        <p class="asthma-unlock-note"></p>
        <div id="asthmaFirstLookFindings" class="asthma-learning-findings" hidden></div>`;
      const strongs = qa('.asthma-learning-impression strong', card);
      strongs[0].textContent = CASE.generalImpression.appearance;
      strongs[1].textContent = CASE.generalImpression.workOfBreathing;
      strongs[2].textContent = CASE.generalImpression.circulationToSkin;
      parent.prepend(card);
      q('#asthmaFirstLookAction', card).addEventListener('click', completeFirstLook);
    }
    const button = q('#asthmaFirstLookAction', card);
    const note = q('.asthma-unlock-note', card);
    if (state.firstLookAt) {
      button.textContent = 'Completed — work of breathing observed';
      button.classList.add('done');
      button.disabled = true;
      note.textContent = 'Unlocked: lung sounds, SpO₂, RR, pulse, mental status, SAMPLE / OPQRST.';
      const findings = q('#asthmaFirstLookFindings', card);
      findings.hidden = false;
      findings.replaceChildren(...CASE.firstAction.findings.map(value => {
        const span = document.createElement('span'); span.textContent = value; return span;
      }));
    } else {
      button.textContent = CASE.firstAction.label;
      note.textContent = 'Required first action. Other quick assessments are dimmed until you complete this look / listen / feel check.';
    }
  }

  function setInitialLock() {
    const pending = !state.firstLookAt;
    document.body.classList.toggle('asthma-first-look-pending', pending);
    const selectors = [
      '#patientFirstMobileNav [data-mobile-domain="vitalsPanel"]',
      '#patientFirstMobileNav [data-mobile-domain="historyPanel"]',
      '#patientFirstMobileNav [data-mobile-domain="treatmentPanel"]',
      '#desktopPatientActions [data-panel="vitalsPanel"]',
      '#desktopPatientActions [data-panel="historyPanel"]',
      '#desktopPatientActions [data-panel="treatmentPanel"]'
    ];
    selectors.forEach(selector => qa(selector).forEach(button => {
      button.disabled = pending;
      button.setAttribute('aria-disabled', pending ? 'true' : 'false');
      if (pending) button.title = `Complete “${CASE.firstAction.label}” first`;
      else if (/Complete “/.test(button.title || '')) button.removeAttribute('title');
    }));
  }

  function completeFirstLook() {
    if (state.firstLookAt) return;
    state.firstLookAt = now();
    saveState();
    const patientApi = api();
    try {
      patientApi?.setFinding?.('scene_size_up', 'Scene safe in a public park; bystanders present; easy access; no hazard and no trauma mechanism.', { source: 'asthma-first-look', normality: 'normal' });
      patientApi?.setFinding?.('airway', 'Speaking in 3–4 word sentences; no stridor heard.', { source: 'asthma-first-look', normality: 'not-normal' });
      patientApi?.setFinding?.('breathing', 'Tripod / forward lean; accessory muscle use and retractions; prolonged expiratory phase; audible expiratory wheeze; no external trauma.', { source: 'asthma-first-look', normality: 'not-normal' });
      patientApi?.setFinding?.('skin', 'Pink but sweaty / diaphoretic on general impression.', { source: 'asthma-first-look', normality: 'not-normal' });
    } catch (_) {}
    ensureStartCard();
    setInitialLock();
    window.dispatchEvent(new CustomEvent('emscodesim:scenario-updated', { detail: { source: 'asthma-first-look' } }));
  }

  function treatments() { return Array.isArray(record()?.treatments) ? record().treatments : []; }
  function careLog() { return Array.isArray(record()?.careLog) ? record().careLog : []; }
  function isBronchodilator(item) {
    const text = clean([item?.name, item?.label, item?.description, item?.treatment, item?.value].filter(Boolean).join(' ')).toLowerCase();
    return /bronchodilator|albuterol|duoneb|neb|nebuliz|ipratropium/.test(text);
  }
  function isOxygen(item) {
    const text = clean([item?.name, item?.label, item?.description, item?.treatment, item?.value].filter(Boolean).join(' ')).toLowerCase();
    return /oxygen|o2|nasal cannula|nonrebreather|nrb/.test(text);
  }

  function treatmentTime(item) {
    const parsed = new Date(item?.recordedAt || item?.time || 0).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function detectFirstBronchodilator() {
    if (state.bronchodilatorAt) return;
    const first = treatments().find(isBronchodilator);
    if (!first) return;
    state.bronchodilatorAt = treatmentTime(first) || now();
    saveState();
  }

  function findingAfter(key, since) {
    const finding = record()?.findings?.[key];
    if (!finding) return false;
    const at = new Date(finding.recordedAt || 0).getTime();
    return at > since;
  }

  function reassessStatus() {
    const since = state.bronchodilatorAt || 0;
    if (!since) return { active: false, complete: true, missing: [] };
    const postReassess = (record()?.reassessments || []).filter(item => treatmentTime(item) > since);
    const reassessText = postReassess.map(item => clean([item.description, item.documentation, item.response, item.value].join(' ')).toLowerCase()).join(' ');
    const breathing = findingAfter('breathing', since);
    const checks = {
      Speaking: breathing || /speak|speech|sentence|phrase/.test(reassessText),
      'Work of breathing': breathing || /work of breathing|retraction|accessory|respiratory effort/.test(reassessText),
      'Lung sounds': findingAfter('breath_sounds', since) || /lung|breath sound|wheeze|air movement/.test(reassessText),
      'SpO₂': findingAfter('spo2', since) || /spo2|oxygen saturation|sat /.test(reassessText),
      'Mental status': findingAfter('mental_status', since) || /mental|alert|avpu|oriented/.test(reassessText)
    };
    const missing = Object.entries(checks).filter(([, done]) => !done).map(([label]) => label);
    return { active: true, complete: missing.length === 0, missing };
  }

  function renderReassessGate() {
    const parent = host();
    if (!parent) return;
    detectFirstBronchodilator();
    let gate = q('#asthmaReassessGate');
    const status = reassessStatus();
    if (!status.active) { gate?.remove(); return; }
    if (!gate) {
      gate = document.createElement('section');
      gate.id = 'asthmaReassessGate';
      gate.className = 'asthma-reassess-gate';
      gate.innerHTML = '<strong></strong><p></p>';
      parent.prepend(gate);
    }
    const elapsed = Math.max(0, now() - state.bronchodilatorAt);
    const remaining = Math.max(0, CASE.reassess.delayMs - elapsed);
    const seconds = Math.ceil(remaining / 1000);
    const clock = q('#patientClockStatus');
    const label = remaining > 0 ? `Reassess in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : 'Reassessment due now';
    if (clock) clock.textContent = status.complete ? 'Patient clock • reassessment complete' : `Patient clock • ${label.toLowerCase()}`;
    q('strong', gate).textContent = status.complete ? 'Required post-treatment reassessment complete' : label;
    q('p', gate).textContent = status.complete ? 'Speaking, work of breathing, lung sounds, SpO₂, and mental status were reassessed.' : `Still required: ${status.missing.join(' • ')}`;
    gate.hidden = status.complete;
  }

  function maybeShowLungCoach() {
    if (state.lungCoachShown) return;
    const finding = record()?.findings?.breath_sounds;
    if (!finding) return;
    state.lungCoachShown = true;
    saveState();
    const parent = host();
    if (!parent || q('#asthmaLungCoach')) return;
    const coach = document.createElement('div');
    coach.id = 'asthmaLungCoach';
    coach.className = 'asthma-learning-coach';
    coach.textContent = CASE.coaching.lungSounds;
    parent.prepend(coach);
  }

  function specificAssessmentAfterFirstLook(key) {
    if (!state.firstLookAt) return false;
    return careLog().some(event => {
      const at = new Date(event.recordedAt || 0).getTime();
      return event.key === key && at >= state.firstLookAt && event.source !== 'asthma-first-look';
    });
  }

  function historySeverityAsked() {
    const text = clean(JSON.stringify(record()?.history || {}) + ' ' + careLog().map(item => `${item.label || ''} ${item.value || ''} ${item.details || ''}`).join(' ')).toLowerCase();
    return /intubat|icu|steroid/.test(text);
  }

  function transportMatchesResponse() {
    const text = clean(JSON.stringify(record()?.treatments || {}) + ' ' + JSON.stringify(record()?.documentation || {})).toLowerCase();
    return /transport|hospital|ed|emergency department/.test(text);
  }

  function debriefItems() {
    const tx = treatments();
    const firstBronch = tx.find(isBronchodilator);
    const firstO2 = tx.find(isOxygen);
    const earlyLimit = (record()?.startedAt ? new Date(record().startedAt).getTime() : 0) + 5 * 60 * 1000;
    const lung = record()?.findings?.breath_sounds;
    const lungText = clean([lung?.value, lung?.details, lung?.finding].join(' ')).toLowerCase();
    const airMovement = /air movement|bilateral|all lung|fields|present/.test(lungText);
    return [
      [Boolean(state.firstLookAt), CASE.debriefCriteria[0]],
      [specificAssessmentAfterFirstLook('airway') && specificAssessmentAfterFirstLook('breathing'), CASE.debriefCriteria[1]],
      [Boolean(lung) && (airMovement || state.lungCoachShown), CASE.debriefCriteria[2]],
      [Boolean(firstBronch && firstO2) && (!earlyLimit || (treatmentTime(firstBronch) <= earlyLimit && treatmentTime(firstO2) <= earlyLimit)), CASE.debriefCriteria[3]],
      [historySeverityAsked(), CASE.debriefCriteria[4]],
      [reassessStatus().complete && Boolean(state.bronchodilatorAt), CASE.debriefCriteria[5]],
      [transportMatchesResponse(), CASE.debriefCriteria[6]]
    ];
  }

  function renderDebrief() {
    const grade = q('#horseGradeWorkspace:not([hidden]), #fullCallDebrief:not([hidden]), #scenarioDebrief:not([hidden]), [data-scenario-debrief]:not([hidden])');
    if (!grade) return;
    let panel = q('#asthmaLearningDebrief');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'asthmaLearningDebrief';
      panel.className = 'asthma-debrief-contract';
      panel.innerHTML = '<h3>Breathing Problem • learning review</h3><ul></ul>';
      grade.prepend(panel);
    }
    const list = q('ul', panel); list.replaceChildren();
    debriefItems().forEach(([pass, label]) => {
      const li = document.createElement('li');
      li.className = pass ? 'pass' : 'miss';
      li.textContent = `${pass ? 'Met' : 'Miss'} — ${label}`;
      list.appendChild(li);
    });
  }

  function blockCompletion(event) {
    if (!state.bronchodilatorAt || reassessStatus().complete) return;
    const target = event.target.closest?.('button,a');
    if (!target) return;
    const text = clean(target.textContent).toLowerCase();
    if (!/(end scenario|call complete|complete call|finish scenario|grade|hospital handoff)/.test(text)) return;
    if (/reset/.test(text)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    renderReassessGate();
    const gate = q('#asthmaReassessGate');
    gate?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }

  function scrubAsthmaTraumaLeftovers() {
    bindVisibleIdentity();
    const banned = /severe pain|horse|crush|pelvis|bleeding|trauma-first/i;
    qa('[data-asthma-copy], #patientClockStatus, #dispatch, #caseTitle, #scene').forEach(node => {
      if (node === q('#patientClockStatus') || node === q('#dispatch') || node === q('#caseTitle') || node === q('#scene')) return;
      if (banned.test(node.textContent || '')) node.textContent = CASE.scene;
    });
  }

  function refresh() {
    if (rendering) return;
    rendering = true;
    try {
      bindCaseObjects();
      bindVisibleIdentity();
      ensureStyles();
      ensureStartCard();
      setInitialLock();
      maybeShowLungCoach();
      renderReassessGate();
      renderDebrief();
      scrubAsthmaTraumaLeftovers();
    } finally { rendering = false; }
  }

  function start() {
    loadState();
    bindCaseObjects();
    ensureStyles();
    refresh();
    document.addEventListener('click', blockCompletion, true);
    window.addEventListener('emscodesim:patient-record-updated', refresh);
    window.addEventListener('emscodesim:scenario-updated', refresh);
    new MutationObserver(() => requestAnimationFrame(refresh)).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    clearInterval(timer);
    timer = window.setInterval(() => {
      detectFirstBronchodilator();
      renderReassessGate();
      bindVisibleIdentity();
    }, 1000);
    window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
