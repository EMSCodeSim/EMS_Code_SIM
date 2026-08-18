(() => {
  'use strict';

  const body = document.body;
  if (!body || body.dataset.emsMiniSimEnhanced === '1') return;
  body.dataset.emsMiniSimEnhanced = '1';
  body.classList.add('ems-embedded-mini-sim');

  if (!document.querySelector('script[data-ems-mini-sim-audio-boost]')) {
    const audioBoost = document.createElement('script');
    audioBoost.src = '/vitals/scenario-mini-sim-audio-boost.js?v=2026.08.18.26';
    audioBoost.dataset.emsMiniSimAudioBoost = '1';
    audioBoost.async = false;
    document.body.appendChild(audioBoost);
  }

  const params = new URLSearchParams(location.search);
  const caseId = params.get('case') || '';
  const pathname = location.pathname;

  const flow = document.createElement('div');
  flow.className = 'ems-mini-flow';
  flow.setAttribute('aria-label', 'Mini simulator workflow');
  flow.innerHTML = '<span data-step="1" class="active">Perform</span><span data-step="2">Observe</span><span data-step="3">Document</span>';
  body.prepend(flow);

  const flowSteps = [...flow.querySelectorAll('span')];
  function setFlow(step) {
    flowSteps.forEach((node, index) => {
      const number = index + 1;
      node.classList.toggle('active', number === step);
      node.classList.toggle('complete', number < step);
    });
  }

  const answer = document.getElementById('answerCard');
  const submit = document.getElementById('submitBtn');
  const sim = body.dataset.scenarioVital || '';
  let unlocked = false;

  function unlockDocument() {
    if (unlocked) return;
    unlocked = true;
    if (answer) answer.classList.remove('ems-discovery-locked');
    setFlow(3);
    window.setTimeout(() => answer?.querySelector('input,select,button:not([disabled])')?.focus?.({ preventScroll:true }), 30);
  }

  function markObserved() {
    if (!unlocked) setFlow(2);
  }

  function parentRuntimeVital(key, fallback = '') {
    try { return window.parent?.EMSCodeSimScenarioRuntime?.vital?.(key, fallback) ?? fallback; }
    catch (_) { return fallback; }
  }

  function saveLegacyFinding(key, label, value, meta = {}) {
    const payload = {
      label,
      finding: String(value),
      learnerFinding: String(value),
      reviewAtDebrief: true,
      source: 'embedded-mini-sim-adapter',
      ...meta
    };
    try {
      const session = window.parent?.EMSCodeSimScenarioSession;
      const api = window.parent?.EMSCodeSimPatientRecord;
      if (session?.saveFinding) session.saveFinding(key, String(value), payload, caseId || undefined);
      else if (api?.setFinding) api.setFinding(key, String(value), payload);
    } catch (_) {}
    try {
      window.parent?.postMessage?.({ type:'ems-assessment-saved', key, label, value:String(value) }, location.origin);
    } catch (_) {}
  }

  if (answer) answer.classList.add('ems-discovery-locked');

  // Numeric/device simulations already gate Save until the learner has actually
  // completed the measurement. Use that signal to reveal documentation.
  if (submit && ['pulse','respirations','spo2','bgl','temperature'].includes(sim)) {
    const watchSubmit = new MutationObserver(() => {
      if (!submit.disabled) unlockDocument();
      else if (!unlocked) markObserved();
    });
    watchSubmit.observe(submit, { attributes:true, attributeFilter:['disabled'] });
    if (!submit.disabled) unlockDocument();
  }

  // Blood pressure has its own cuff/auscultation engine. Its answer area unlocks
  // only after the cuff sequence has enabled the submit control.
  if (body.querySelector('.bp-scenario-answer') && submit) {
    body.querySelector('.bp-scenario-answer')?.classList.add('ems-discovery-locked');
    const watchBp = new MutationObserver(() => {
      if (!submit.disabled) {
        body.querySelector('.bp-scenario-answer')?.classList.remove('ems-discovery-locked');
        unlockDocument();
      } else if (!unlocked) markObserved();
    });
    watchBp.observe(submit, { attributes:true, attributeFilter:['disabled'] });
  }

  function unlockAfterClicks(selectors, required) {
    const done = new Set();
    selectors.forEach(selector => {
      document.querySelector(selector)?.addEventListener('click', () => {
        done.add(selector);
        markObserved();
        if (done.size >= required) unlockDocument();
      });
    });
  }

  if (sim === 'mental-status') {
    const done = new Set();
    ['#observeBtn','#voiceBtn','#painBtn'].forEach(selector => {
      document.querySelector(selector)?.addEventListener('click', () => {
        done.add(selector);
        markObserved();
        if (done.size >= 3) unlockDocument();
      });
    });
  }
  if (sim === 'breath-sounds') {
    document.querySelectorAll('.sv-point').forEach(point => point.addEventListener('click', () => {
      markObserved();
      const countText = document.getElementById('listenCount')?.textContent || '';
      const heard = Number((countText.match(/(\d+)\s+of\s+4/) || [])[1] || 0);
      const done = document.querySelectorAll('.sv-point.done').length;
      if (heard >= 4 || done >= 4) unlockDocument();
    }));
  }
  if (sim === 'skin') {
    const done = new Set();
    ['#inspectSkin','#touchSkin','#moistureSkin'].forEach(selector => {
      document.querySelector(selector)?.addEventListener('click', () => {
        done.add(selector);
        markObserved();
        if (done.size >= 3) unlockDocument();
      });
    });
  }

  // Visual assessment-suite pages create their own interpretation panel only
  // after the physical/visual exam is complete. Keep the flow indicator in sync.
  const result = document.getElementById('result');
  if (result && !answer) {
    const observer = new MutationObserver(() => {
      if (result.querySelector('.va-interpret')) {
        unlocked = true;
        setFlow(3);
      } else if (!result.classList.contains('saved')) {
        markObserved();
      }
    });
    observer.observe(result, { childList:true, subtree:true, attributes:true });
  }

  function installGcsAdapter() {
    if (pathname !== '/vitals/gcs.html') return;
    const eyes = document.getElementById('selE');
    const verbal = document.getElementById('selV');
    const motor = document.getElementById('selM');
    const show = document.getElementById('showResults');
    const buttons = {
      E: document.getElementById('btnEyes'),
      V: document.getElementById('btnVerbal'),
      M: document.getElementById('btnMotor')
    };
    if (!eyes || !verbal || !motor || !show) return;

    [eyes, verbal, motor].forEach(select => {
      if (!select.querySelector('option[value=""]')) {
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select after assessment';
        select.prepend(placeholder);
      }
      select.value = '';
    });
    show.disabled = true;
    show.textContent = 'Record GCS';

    const avpu = String(parentRuntimeVital('avpu', 'A')).trim().toUpperCase();
    const directE = Number(parentRuntimeVital('gcs_eye', NaN));
    const directV = Number(parentRuntimeVital('gcs_verbal', NaN));
    const directM = Number(parentRuntimeVital('gcs_motor', NaN));
    const fallback = {
      A: { E:4, V:5, M:6 },
      V: { E:3, V:4, M:6 },
      P: { E:2, V:2, M:4 },
      U: { E:1, V:1, M:1 }
    }[avpu] || { E:4, V:5, M:6 };
    const truth = {
      E: Number.isFinite(directE) && directE >= 1 && directE <= 4 ? directE : fallback.E,
      V: Number.isFinite(directV) && directV >= 1 && directV <= 5 ? directV : fallback.V,
      M: Number.isFinite(directM) && directM >= 1 && directM <= 6 ? directM : fallback.M
    };
    const responseText = {
      E: { 1:'No eye opening to voice or pain.',2:'Opens eyes only to painful stimulus.',3:'Opens eyes when spoken to.',4:'Eyes are open spontaneously and track you.' },
      V: { 1:'No verbal response.',2:'Only incomprehensible sounds or moaning.',3:'Uses inappropriate or random words.',4:'Converses but is confused or disoriented.',5:'Answers appropriately and is oriented.' },
      M: { 1:'No motor response to pain.',2:'Extends to painful stimulus.',3:'Abnormal flexion to pain.',4:'Withdraws from painful stimulus.',5:'Localizes the stimulus and pushes it away.',6:'Obeys commands and moves as requested.' }
    };
    const assessed = new Set();
    const lineFor = domain => document.querySelector(`#resp-${domain === 'E' ? 'eyes' : domain === 'V' ? 'verbal' : 'motor'} .line`);

    Object.entries(buttons).forEach(([domain, button]) => button?.addEventListener('click', () => {
      assessed.add(domain);
      markObserved();
      window.setTimeout(() => {
        const line = lineFor(domain);
        if (line) line.textContent = responseText[domain][truth[domain]];
        const wrap = document.getElementById(`resp-${domain === 'E' ? 'eyes' : domain === 'V' ? 'verbal' : 'motor'}`);
        if (wrap) wrap.hidden = false;
        if (assessed.size === 3) {
          unlocked = true;
          setFlow(3);
          show.disabled = false;
        }
      }, 0);
    }, true));

    show.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (assessed.size < 3) return;
      const e = Number(eyes.value), v = Number(verbal.value), m = Number(motor.value);
      if (![e,v,m].every(Number.isFinite) || !eyes.value || !verbal.value || !motor.value) {
        const summary = document.getElementById('summary');
        const results = document.getElementById('results');
        if (results) results.hidden = false;
        if (summary) summary.innerHTML = '<strong>Document each E / V / M score before recording.</strong>';
        return;
      }
      const total = e + v + m;
      const expected = truth.E + truth.V + truth.M;
      saveLegacyFinding('gcs', 'Glasgow Coma Scale', `GCS ${total} (E${e} V${v} M${m})`, {
        expectedFinding: `GCS ${expected} (E${truth.E} V${truth.V} M${truth.M})`,
        accurate: e === truth.E && v === truth.V && m === truth.M,
        correct: e === truth.E && v === truth.V && m === truth.M
      });
    }, true);
  }

  function installNinesAdapter() {
    if (pathname !== '/vitals/nines.html') return;
    const input = document.getElementById('answerVal');
    const button = document.getElementById('submitBtn');
    if (!input || !button) return;
    const pctAdult = {'head-front':4.5,'head-back':4.5,chest:9,abdomen:9,'upper-back':9,'lower-back':9,'armL-front':4.5,'armR-front':4.5,'armL-back':4.5,'armR-back':4.5,'legL-front':9,'legR-front':9,'legL-back':9,'legR-back':9,perineum:1};
    const pctPeds = {'head-front':9,'head-back':9,chest:9,abdomen:9,'upper-back':9,'lower-back':9,'armL-front':4.5,'armR-front':4.5,'armL-back':4.5,'armR-back':4.5,'legL-front':7,'legR-front':7,'legL-back':7,'legR-back':7,perineum:1};
    unlocked = true;
    setFlow(3);
    button.textContent = 'Record TBSA';
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const entered = Number(input.value);
      if (!Number.isFinite(entered)) return;
      const pediatric = document.getElementById('modeOut')?.textContent?.toLowerCase().includes('pediatric');
      const map = pediatric ? pctPeds : pctAdult;
      const svg = pediatric ? document.getElementById('pedsSVG') : document.getElementById('adultSVG');
      let expected = 0;
      svg?.querySelectorAll('.zone').forEach(zone => {
        const state = Number(zone.getAttribute('data-state') || 0);
        const key = zone.getAttribute('data-key') || '';
        expected += (map[key] || 0) * state;
      });
      expected = Math.round(expected * 100) / 100;
      saveLegacyFinding('rule_of_nines', 'Rule of Nines', `${entered}% TBSA`, {
        expectedFinding: `${expected}% TBSA`,
        accurate: Math.abs(entered - expected) <= 0.25,
        correct: Math.abs(entered - expected) <= 0.25,
        patientType: pediatric ? 'pediatric' : 'adult'
      });
    }, true);
  }

  function installIntegratedPracticeFlow() {
    if (!['/vitals/pain-opqrst.html','/vitals/sample-history.html','/vitals/pediatric-assessment-triangle.html'].includes(pathname)) return;
    const practice = document.getElementById('practicePanel');
    if (practice) {
      document.querySelectorAll('.lesson-panel').forEach(panel => { panel.hidden = panel !== practice; });
      practice.hidden = false;
      practice.classList.add('is-active');
    }
    const revealButtons = [...document.querySelectorAll('button')].filter(button => /ask|assess|perform|observe|examine|begin|start/i.test(button.textContent || ''));
    revealButtons.forEach(button => button.addEventListener('click', () => {
      markObserved();
      window.setTimeout(() => { unlocked = true; setFlow(3); }, 40);
    }));
    const form = practice?.querySelector('form') || document.querySelector('form');
    if (form && !revealButtons.length) {
      unlocked = true;
      setFlow(3);
    }
  }

  function installPerlAdapter() {
    if (pathname !== '/vitals/pupil.html') return;
    const lightLeft = document.getElementById('btnLightL');
    const lightRight = document.getElementById('btnLightR');
    const gaze = document.getElementById('gaze');
    const grade = document.getElementById('btnGrade');
    const perl = document.getElementById('perl');
    const sizeL = document.getElementById('sizeL');
    const sizeR = document.getElementById('sizeR');
    const reactL = document.getElementById('reactL');
    const reactR = document.getElementById('reactR');
    const trackL = document.getElementById('trackL');
    const trackR = document.getElementById('trackR');
    if (!lightLeft || !lightRight || !grade || !perl) return;

    const assessed = new Set();
    function note(part) {
      assessed.add(part);
      markObserved();
      if (assessed.size >= 3) {
        unlocked = true;
        setFlow(3);
      }
    }
    lightLeft.addEventListener('click', () => note('left'));
    lightRight.addEventListener('click', () => note('right'));
    gaze?.addEventListener('input', () => note('track'));
    gaze?.addEventListener('change', () => note('track'));

    grade.addEventListener('click', () => {
      window.setTimeout(() => {
        if (!perl.value || assessed.size < 3) return;
        const mmL = parseFloat(document.getElementById('mmL')?.textContent) || 0;
        const mmR = parseFloat(document.getElementById('mmR')?.textContent) || 0;
        const equal = Math.abs(mmL - mmR) < 1;
        const leftReactive = reactL?.value !== 'Non-reactive';
        const rightReactive = reactR?.value !== 'Non-reactive';
        const perlYes = perl.value === 'Yes';
        const learnerPerl = perlYes && equal && leftReactive && rightReactive ? 'PERL' : (perl.value === 'No' ? 'Pupils not fully PERL' : 'PERL not documented');
        const learner = `${learnerPerl}; size L ${sizeL?.value || '—'} / R ${sizeR?.value || '—'}; reaction L ${reactL?.value || '—'} / R ${reactR?.value || '—'}; tracking L ${trackL?.value || '—'} / R ${trackR?.value || '—'}`;
        const expected = String(parentRuntimeVital('pupils', 'Pupils equal, round, and reactive to light; gaze midline; tracking smooth'));
        const expectedPerl = /unequal|fixed|nonreactive|non-reactive/i.test(expected) ? 'No' : 'Yes';
        saveLegacyFinding('pupils', 'Pupils / PERL', learner, {
          expectedFinding: expected,
          accurate: perl.value === expectedPerl,
          correct: perl.value === expectedPerl,
          equal,
          leftReactive,
          rightReactive,
          perl: perl.value
        });
      }, 0);
    });
  }

  function installSkinAdapter() {
    if (pathname !== '/vitals/skin.html') return;
    const crtBtn = document.getElementById('crtBtn');
    const btnFlush = document.getElementById('btnFlush');
    const btnPale = document.getElementById('btnPale');
    const btnCyan = document.getElementById('btnCyan');
    const btnJaund = document.getElementById('btnJaund');
    const moistDry = document.getElementById('moistDry');
    const moistNorm = document.getElementById('moistNormal');
    const moistWet = document.getElementById('moistWet');
    const tempDisplay = document.getElementById('tempDisplay');
    if (!crtBtn) return;

    const assessed = new Set();
    let recordBtn = null;

    function colorLabel() {
      if (btnPale?.getAttribute('aria-pressed') === 'true') return 'pale';
      if (btnFlush?.getAttribute('aria-pressed') === 'true') return 'flushed';
      if (btnCyan?.getAttribute('aria-pressed') === 'true') return 'cyanotic';
      if (btnJaund?.getAttribute('aria-pressed') === 'true') return 'jaundiced';
      return 'pink';
    }

    function moistureLabel() {
      if (moistDry?.getAttribute('aria-pressed') === 'true') return 'dry';
      if (moistWet?.getAttribute('aria-pressed') === 'true') return 'wet';
      return 'normal moisture';
    }

    function tempLabel() {
      const value = parseFloat(String(tempDisplay?.textContent || ''));
      if (!Number.isFinite(value)) return 'warm';
      if (value <= 96) return 'cool';
      if (value >= 100.4) return 'hot';
      return 'warm';
    }

    function buildFinding() {
      return `${colorLabel()}, ${tempLabel()}, ${moistureLabel()}; cap refill assessed`;
    }

    function ensureRecordButton() {
      if (recordBtn) return recordBtn;
      recordBtn = document.createElement('button');
      recordBtn.type = 'button';
      recordBtn.className = 'btn ems-skin-record-finding';
      recordBtn.textContent = 'Record skin finding';
      recordBtn.addEventListener('click', () => {
        if (assessed.size < 3) return;
        const expected = String(parentRuntimeVital('skin', 'Warm, pink, and dry'));
        const learner = buildFinding();
        const accurate = /warm|pink|dry/i.test(learner) && /warm|pink|dry/i.test(expected);
        saveLegacyFinding('skin', 'Skin signs', learner, {
          expectedFinding: expected,
          accurate,
          correct: accurate
        });
      });
      document.querySelector('.under-skin')?.appendChild(recordBtn);
      return recordBtn;
    }

    function note(part) {
      assessed.add(part);
      markObserved();
      if (assessed.size >= 3) {
        unlocked = true;
        setFlow(3);
        ensureRecordButton();
      }
    }

    crtBtn.addEventListener('click', () => note('crt'));
    [btnFlush, btnPale, btnCyan, btnJaund].forEach(btn => btn?.addEventListener('click', () => note('color')));
    [moistDry, moistNorm, moistWet].forEach(btn => btn?.addEventListener('click', () => note('moisture')));
    document.getElementById('tempMinus')?.addEventListener('click', () => note('temp'));
    document.getElementById('tempPlus')?.addEventListener('click', () => note('temp'));
  }

  installGcsAdapter();
  installNinesAdapter();
  installPerlAdapter();
  installSkinAdapter();
  installIntegratedPracticeFlow();

  document.addEventListener('click', event => {
    if (event.target.closest('button,a,[role="button"]')) markObserved();
  }, true);

  window.EMSCodeSimEmbeddedMiniSim = Object.freeze({
    version: '2026.08.18.26',
    unlockDocument,
    markObserved,
    setFlow,
    saveLegacyFinding
  });
})();
