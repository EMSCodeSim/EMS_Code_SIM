(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const requestedCase = String(params.get('case') || '').replace(/-/g, '_').toLowerCase();
  const trainingMode = String(params.get('training') || 'learning').toLowerCase();
  if (requestedCase !== 'asthma' || trainingMode !== 'learning') return;

  const CASE = Object.freeze({
    id: 'asthma',
    title: 'Breathing Problem',
    chiefComplaint: 'I can’t get air',
    impressionTag: 'severe dyspnea',
    clockLabel: 'Patient clock • severe dyspnea',
    scene: 'Public park. Adult sitting forward on a bench. Audible wheeze. Speaking in short phrases. No obvious trauma.',
    generalImpression: Object.freeze({
      appearance: 'Anxious, tripod / forward lean, diaphoretic',
      workOfBreathing: 'Accessory muscles, prolonged expiratory phase',
      circulationToSkin: 'Pink but sweaty'
    }),
    firstAction: Object.freeze({
      label: 'Look at work of breathing',
      findings: Object.freeze([
        'Tripod position',
        'Speaks 3–4 word sentences',
        'Audible expiratory wheeze',
        'Retractions / accessory muscle use',
        'No stridor',
        'No external trauma'
      ])
    }),
    coaching: 'Wheeze means air is still moving. A silent chest is worse than a noisy one.',
    reassessRequired: Object.freeze(['Speaking', 'Work of breathing', 'Lung sounds', 'SpO₂', 'Mental status']),
    debrief: Object.freeze([
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
  const currentRecord = () => api()?.active?.() || {};
  const stateStorageKey = () => `emscodesim_asthma_learning_v2_${currentRecord()?.id || 'active'}`;
  let state = { firstLookAt: 0, bronchodilatorAt: 0, lungCoachShown: false };
  let intervalId = 0;
  let refreshing = false;

  function loadState() {
    try { state = { ...state, ...JSON.parse(sessionStorage.getItem(stateStorageKey()) || '{}') }; } catch (_) {}
  }
  function saveState() {
    try { sessionStorage.setItem(stateStorageKey(), JSON.stringify(state)); } catch (_) {}
  }
  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function bindDefinitions() {
    const defs = window.EMSCodeSimScenarioDefinitions;
    if (defs?.CATALOG?.asthma) Object.assign(defs.CATALOG.asthma, {
      title: CASE.title,
      chiefComplaint: CASE.chiefComplaint,
      impressionTag: CASE.impressionTag,
      clockLabel: CASE.clockLabel,
      scene: CASE.scene,
      dispatch: 'Adult with a breathing problem in a public park.'
    });
    if (defs?.PROFILES?.asthma) {
      const profile = defs.PROFILES.asthma;
      profile.scene = CASE.scene;
      profile.chiefComplaint = CASE.chiefComplaint;
      profile.impressionTag = CASE.impressionTag;
      profile.clockLabel = CASE.clockLabel;
      if (profile.sample) {
        profile.sample.title = CASE.title;
        profile.sample.description = CASE.scene;
        profile.sample.detail = 'S: Severe shortness of breath, chest tightness, cough, and wheezing; denies fever, chest pain, hives, facial swelling, choking, or trauma. A: No known medication allergies. M: Albuterol rescue inhaler; used repeated doses with poor relief. P: Asthma with prior severe exacerbation history. L: Ate several hours ago. E: Symptoms began while exercising in the park and worsened despite the inhaler.';
      }
    }
    const interview = window.EMSCodeSimScenarioInterviews?.PROFILES?.asthma;
    if (interview?.questions && !interview.questions.some(item => item.id === 'prior_severity')) {
      interview.questions.push({
        id: 'prior_severity',
        category: 'Medical background',
        label: 'Have you ever been intubated, admitted to an ICU, or needed steroids for your asthma?',
        response: '“I was intubated once years ago, and I recently needed a steroid burst. My inhaler barely helped today.”',
        keywords: ['intubated', 'intubation', 'icu', 'steroid', 'hospitalized', 'severe asthma']
      });
    }
  }

  function bindIdentity() {
    setText(q('#dispatch'), 'BREATHING PROBLEM • PUBLIC PARK');
    setText(q('#caseTitle'), `“${CASE.chiefComplaint}”`);
    setText(q('#scene'), CASE.scene);
    const clock = q('#patientClockStatus');
    if (clock && !state.bronchodilatorAt) setText(clock, CASE.clockLabel);
    document.body.dataset.caseIdentity = CASE.id;
  }

  function ensureStyles() {
    if (q('#asthmaLearningV2Styles')) return;
    const style = document.createElement('style');
    style.id = 'asthmaLearningV2Styles';
    style.textContent = `
      .asthma-learning-start{margin:10px 0;padding:14px;border:1px solid #31586b;border-radius:14px;background:#0d2534;color:#ecf8fc}
      .asthma-case-chip{display:inline-flex;position:sticky;top:6px;z-index:30;margin-bottom:8px;padding:6px 9px;border-radius:999px;background:#123d55;color:#dff5ff;font-size:.66rem;font-weight:900;letter-spacing:.08em}
      .asthma-learning-start h2{margin:2px 0 8px;font-size:1rem}.asthma-scene-line{margin:0 0 10px;color:#c9dde6;font-size:.82rem;line-height:1.4}
      .asthma-learning-impression{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 0}.asthma-learning-impression article{padding:9px;border:1px solid #2e5265;border-radius:10px;background:#102c3c}.asthma-learning-impression small{font-size:.61rem;letter-spacing:.08em;font-weight:900;color:#82c8e3}.asthma-learning-impression strong{display:block;margin-top:3px;font-size:.79rem;line-height:1.35}
      .asthma-primary-action{width:100%;min-height:50px;border:1px solid #49a9cf;border-radius:11px;background:#0d78ae;color:#fff;font:inherit;font-weight:900;cursor:pointer}.asthma-primary-action.done{background:#123b31;border-color:#59b68c}
      .asthma-secondary-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.asthma-secondary-actions button{min-height:44px;border:1px solid #31586b;border-radius:10px;background:#102c3c;color:#eaf7fb;font:inherit;font-weight:800;cursor:pointer}
      .asthma-learning-cue{margin:9px 0 0;color:#a9c4cf;font-size:.74rem}.asthma-learning-findings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:10px}.asthma-learning-findings span{padding:7px 8px;border-radius:8px;background:#102f3f;border:1px solid #31586b;font-size:.75rem}
      .asthma-learning-coach{margin:10px 0;padding:10px 12px;border-left:4px solid #6fc6e8;border-radius:8px;background:#102d3d;color:#edfaff;font-size:.82rem;font-weight:750}.asthma-reassess-gate{margin:10px 0;padding:11px 12px;border:1px solid #866f31;border-radius:12px;background:#332b12;color:#fff2c7}.asthma-reassess-gate strong{display:block}.asthma-reassess-gate p{margin:4px 0 0;font-size:.76rem;line-height:1.4}
      body.asthma-first-look-pending [data-mobile-domain="vitalsPanel"],body.asthma-first-look-pending [data-mobile-domain="treatmentPanel"],body.asthma-first-look-pending #desktopPatientActions [data-panel="vitalsPanel"],body.asthma-first-look-pending #desktopPatientActions [data-panel="treatmentPanel"]{opacity:.45!important;filter:saturate(.5)}
      @media(max-width:979px){.asthma-learning-start{margin:8px 12px}.asthma-learning-impression{grid-template-columns:1fr}.asthma-learning-findings{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function host() {
    return q('#clinicalInteractionColumn') || q('#patientFirstMobileFeed') || q('.patient-control-column') || q('.scenario-hero-layout');
  }

  function openPanel(panelId) {
    const button = q(`.bottom-nav button[data-panel="${panelId}"]`) || q(`#desktopPatientActions button[data-panel="${panelId}"]`);
    button?.click();
  }

  function ensureStartCard() {
    const parent = host();
    if (!parent) return false;
    let card = q('#asthmaLearningStart');
    if (!card) {
      card = document.createElement('section');
      card.id = 'asthmaLearningStart';
      card.className = 'asthma-learning-start';
      card.innerHTML = `
        <span class="asthma-case-chip">ASTHMA • PARK • LEARNING</span>
        <h2>Breathing Problem</h2>
        <p class="asthma-scene-line"></p>
        <div class="asthma-learning-impression">
          <article><small>APPEARANCE</small><strong></strong></article>
          <article><small>WORK OF BREATHING</small><strong></strong></article>
          <article><small>CIRCULATION TO SKIN</small><strong></strong></article>
        </div>
        <button id="asthmaFirstLookAction" class="asthma-primary-action" type="button"></button>
        <div class="asthma-secondary-actions"><button id="asthmaOpenMonitor" type="button">Open monitor</button><button id="asthmaAskWhatHappened" type="button">Ask what happened</button></div>
        <p class="asthma-learning-cue">Start with what you can see and hear before opening tools.</p>
        <div id="asthmaFirstLookFindings" class="asthma-learning-findings" hidden></div>`;
      setText(q('.asthma-scene-line', card), CASE.scene);
      const strongs = qa('.asthma-learning-impression strong', card);
      setText(strongs[0], CASE.generalImpression.appearance);
      setText(strongs[1], CASE.generalImpression.workOfBreathing);
      setText(strongs[2], CASE.generalImpression.circulationToSkin);
      parent.prepend(card);
      q('#asthmaFirstLookAction', card)?.addEventListener('click', completeFirstLook);
      q('#asthmaOpenMonitor', card)?.addEventListener('click', () => openPanel('vitalsPanel'));
      q('#asthmaAskWhatHappened', card)?.addEventListener('click', () => openPanel('historyPanel'));
    }
    const primary = q('#asthmaFirstLookAction', card);
    if (state.firstLookAt) {
      setText(primary, 'Completed — work of breathing observed');
      primary.classList.add('done');
      primary.disabled = true;
      const findings = q('#asthmaFirstLookFindings', card);
      findings.hidden = false;
      if (!findings.children.length) CASE.firstAction.findings.forEach(value => { const span = document.createElement('span'); span.textContent = value; findings.appendChild(span); });
    } else {
      setText(primary, CASE.firstAction.label);
      primary.disabled = false;
    }
    return true;
  }

  function setInitialLock() {
    const pending = !state.firstLookAt;
    document.body.classList.toggle('asthma-first-look-pending', pending);
    ['#patientFirstMobileNav [data-mobile-domain="vitalsPanel"]','#patientFirstMobileNav [data-mobile-domain="treatmentPanel"]','#desktopPatientActions [data-panel="vitalsPanel"]','#desktopPatientActions [data-panel="treatmentPanel"]'].forEach(selector => qa(selector).forEach(button => {
      if (button.disabled !== pending) button.disabled = pending;
      const wanted = pending ? 'true' : 'false';
      if (button.getAttribute('aria-disabled') !== wanted) button.setAttribute('aria-disabled', wanted);
    }));
  }

  function completeFirstLook() {
    if (state.firstLookAt) return;
    state.firstLookAt = Date.now();
    saveState();
    const patientApi = api();
    patientApi?.setFinding?.('scene_size_up', 'Scene safe in a public park; bystanders present; easy access; no hazard.', { source: 'asthma-first-look', normality: 'normal' });
    patientApi?.setFinding?.('airway', 'Speaking in 3–4 word sentences; no stridor heard.', { source: 'asthma-first-look', normality: 'not-normal' });
    patientApi?.setFinding?.('breathing', 'Tripod / forward lean; accessory muscle use and retractions; prolonged expiratory phase; audible expiratory wheeze.', { source: 'asthma-first-look', normality: 'not-normal' });
    patientApi?.setFinding?.('skin', 'Pink but sweaty / diaphoretic on general impression.', { source: 'asthma-first-look', normality: 'not-normal' });
    refresh();
  }

  function treatments() { const r = currentRecord(); return Array.isArray(r.treatments) ? r.treatments : []; }
  function isBronchodilator(item) { return /bronchodilator|albuterol|duoneb|neb|nebuliz|ipratropium/i.test(clean([item?.name,item?.label,item?.description,item?.treatment,item?.value].join(' '))); }
  function treatmentTime(item) { const t = new Date(item?.recordedAt || item?.time || 0).getTime(); return Number.isFinite(t) ? t : 0; }

  function detectBronchodilator() {
    if (state.bronchodilatorAt) return;
    const first = treatments().find(isBronchodilator);
    if (!first) return;
    state.bronchodilatorAt = treatmentTime(first) || Date.now();
    saveState();
  }

  function findingAfter(key, since) {
    const finding = currentRecord()?.findings?.[key];
    if (!finding) return false;
    return new Date(finding.recordedAt || 0).getTime() > since;
  }

  function reassessStatus() {
    if (!state.bronchodilatorAt) return { active:false, complete:true, missing:[] };
    const r = currentRecord();
    const text = (r.reassessments || []).filter(item => treatmentTime(item) > state.bronchodilatorAt).map(item => clean([item.description,item.documentation,item.response,item.value].join(' ')).toLowerCase()).join(' ');
    const breathing = findingAfter('breathing', state.bronchodilatorAt);
    const checks = {
      Speaking: breathing || /speak|speech|sentence|phrase/.test(text),
      'Work of breathing': breathing || /work of breathing|retraction|accessory|respiratory effort/.test(text),
      'Lung sounds': findingAfter('breath_sounds', state.bronchodilatorAt) || /lung|breath sound|wheeze|air movement/.test(text),
      'SpO₂': findingAfter('spo2', state.bronchodilatorAt) || /spo2|oxygen saturation|sat /.test(text),
      'Mental status': findingAfter('mental_status', state.bronchodilatorAt) || /mental|alert|avpu|oriented/.test(text)
    };
    const missing = Object.entries(checks).filter(([,done]) => !done).map(([label]) => label);
    return { active:true, complete:missing.length === 0, missing };
  }

  function renderGate() {
    detectBronchodilator();
    const parent = host();
    if (!parent) return;
    const status = reassessStatus();
    let gate = q('#asthmaReassessGate');
    if (!status.active) { gate?.remove(); return; }
    if (!gate) {
      gate = document.createElement('section');
      gate.id = 'asthmaReassessGate';
      gate.className = 'asthma-reassess-gate';
      gate.innerHTML = '<strong></strong><p></p>';
      parent.prepend(gate);
    }
    const remaining = Math.max(0, 120000 - (Date.now() - state.bronchodilatorAt));
    const seconds = Math.ceil(remaining / 1000);
    const label = remaining > 0 ? `Reassess in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2,'0')}` : 'Reassessment due now';
    setText(q('strong', gate), status.complete ? 'Required post-treatment reassessment complete' : label);
    setText(q('p', gate), status.complete ? 'Speaking, work of breathing, lung sounds, SpO₂, and mental status were reassessed.' : `Still required: ${status.missing.join(' • ')}`);
    gate.hidden = status.complete;
    setText(q('#patientClockStatus'), status.complete ? 'Patient clock • reassessment complete' : `Patient clock • ${label.toLowerCase()}`);
  }

  function maybeShowLungCoach() {
    if (state.lungCoachShown || !currentRecord()?.findings?.breath_sounds) return;
    state.lungCoachShown = true;
    saveState();
    const parent = host();
    if (!parent || q('#asthmaLungCoach')) return;
    const coach = document.createElement('div');
    coach.id = 'asthmaLungCoach';
    coach.className = 'asthma-learning-coach';
    coach.textContent = CASE.coaching;
    parent.prepend(coach);
  }

  function blockCompletion(event) {
    const status = reassessStatus();
    if (!state.bronchodilatorAt || status.complete) return;
    const target = event.target.closest?.('button,a');
    if (!target) return;
    const text = clean(target.textContent).toLowerCase();
    if (!/(end scenario|call complete|complete call|finish scenario|grade|hospital handoff)/.test(text) || /reset/.test(text)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    renderGate();
    q('#asthmaReassessGate')?.scrollIntoView?.({ block:'center' });
  }

  function refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
      bindDefinitions();
      bindIdentity();
      ensureStyles();
      ensureStartCard();
      setInitialLock();
      maybeShowLungCoach();
      renderGate();
    } finally { refreshing = false; }
  }

  function start() {
    loadState();
    refresh();
    document.addEventListener('click', blockCompletion, true);
    window.addEventListener('emscodesim:patient-record-updated', refresh);
    window.addEventListener('emscodesim:scenario-updated', refresh);
    [50,150,350,700,1200,2200,3500].forEach(delay => setTimeout(refresh, delay));
    intervalId = window.setInterval(() => { detectBronchodilator(); renderGate(); }, 1000);
    window.addEventListener('pagehide', () => clearInterval(intervalId), { once:true });
    window.EMSCodeSimAsthmaLearning = Object.freeze({ case:CASE, refresh, reassessStatus });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
