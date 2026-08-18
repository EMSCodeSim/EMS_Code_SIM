(() => {
  'use strict';

  const CASE_ID = 'horse_crush';
  const ASSET = '/vitals/assets/horse-crush/';
  const DISPATCH_TEXT = window.EMSCodeSimScenarioDefinitions?.CATALOG?.horse_crush?.dispatch
    || 'Medic 181 Engine 182 respond emergent to 5541 E Snow Bird Road in reports of a 64 year old female smashed by a horse.';
  const INTRO_BUILD = '2026.08.18.15';
  const INTRO_VIDEO = `${ASSET}incident-calm-walk.mp4?v=${INTRO_BUILD}`;
  const INTRO_PLAY_WAIT_MS = 250;
  const INTRO_PLAY_RETRY_MS = 800;
  const PARKING_PHOTO = `${ASSET}map-arrival.webp`;
  const PARKING_TEXT = 'The ambulance is positioned near the south barn apron, facing out, with the driveway and exit path open.';
  const HANDOFF_PHOTO = `${ASSET}handoff.webp`;
  const BLS_HANDOFF_TEXT = '“She was smashed between two horses and fell to the ground. No loss of consciousness. She is alert and oriented ×4 and complains of left-hip pain. We have not moved her.”';
  let introTimer = 0;
  let introPlayTimers = [];
  let introFinished = false;
  let introSkipRequested = false;
  let introPlaybackStarted = false;
  const EXAMS = [
    {
      key: 'head_exam',
      label: 'Head exam',
      image: `${ASSET}patient-initial.webp`,
      finding: 'No visible head trauma, bleeding, swelling, or facial injury is identified. The patient denies head pain and remembers the entire event.',
      details: 'No loss of consciousness is reported. Continue neurologic observation and reassess if mental status, headache, nausea, or other symptoms change.',
      normality: 'normal'
    },
    {
      key: 'neck_back',
      label: 'Neck and back exam',
      image: `${ASSET}exam-neck-back.webp`,
      finding: 'No midline cervical, thoracic, or lumbar tenderness, step-off, deformity, or neurologic complaint. The patient denies neck and back pain.',
      details: 'The patient is reliable, remembers the event, denies head strike or loss of consciousness, and has no focal neurologic deficit. Continue to minimize unnecessary movement.',
      normality: 'normal'
    },
    {
      key: 'chest_assessment',
      label: 'Chest exam',
      image: `${ASSET}exam-chest.webp`,
      finding: 'Chest wall movement is symmetric. No tenderness, crepitus, instability, bruising, or visible injury is found.',
      details: 'The patient denies chest pain and shortness of breath. Breath sounds are clear and equal bilaterally.',
      normality: 'normal'
    },
    {
      key: 'abdominal_assessment',
      label: 'Abdominal exam',
      image: `${ASSET}exam-abdomen.webp`,
      finding: 'Abdomen is soft and non-tender in all four quadrants without guarding, rigidity, distention, bruising, or palpable abnormality.',
      details: 'No abdominal pain is reported. Reassess if pain, vital signs, or mental status change.',
      normality: 'normal'
    },
    {
      key: 'pelvis_hip',
      label: 'Pelvis and hip exam',
      image: `${ASSET}exam-pelvis.webp`,
      finding: 'Pelvis is stable on a single gentle assessment. Marked tenderness is localized to the left hip.',
      details: 'There is no gross instability. Do not repeatedly compress the pelvis. The stable exam does not exclude an acetabular, proximal femur, or occult pelvic-region injury.',
      normality: 'not-normal'
    },
    {
      key: 'upper_extremities',
      label: 'Upper-extremity exam',
      image: `${ASSET}patient-initial.webp`,
      finding: 'Both upper extremities are without tenderness, deformity, swelling, or visible injury. The patient moves both arms normally.',
      details: 'Radial pulses are present bilaterally with intact sensation and movement. No upper-extremity injury is identified on this exam.',
      normality: 'normal'
    },
    {
      key: 'left_leg',
      label: 'Lower-extremity exam',
      image: `${ASSET}exam-leg.webp`,
      finding: 'The right lower extremity is unremarkable. The left knee remains flexed in a position of comfort, and the patient cannot lower or straighten the left leg because movement causes severe left-hip pain.',
      details: 'No obvious deformity, dislocation, shortening, rotation, open injury, or significant swelling is seen. Pain radiates from the left hip down the leg.',
      normality: 'not-normal'
    },
    {
      key: 'distal_csm',
      label: 'Distal circulation, sensation, and movement',
      image: `${ASSET}exam-leg.webp`,
      finding: 'Left pedal pulse is present. The foot is warm, sensation is intact, and the patient can move the ankle and toes.',
      details: 'Document this baseline and repeat it after every movement, packaging step, or splinting decision.',
      normality: 'normal'
    }
  ];

  function activeCase() {
    const params = new URLSearchParams(location.search);
    return params.get('case') || window.EMSCodeSimPatientRecord?.active?.()?.scenarioId || '';
  }

  function isActive() { return activeCase() === CASE_ID; }
  function record() { return window.EMSCodeSimScenarioSession?.active?.(CASE_ID) || window.EMSCodeSimPatientRecord?.active?.() || {}; }
  function has(key) { return Boolean(record()?.findings?.[key]); }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }
  function trainingMode() {
    const params = new URLSearchParams(location.search);
    return params.get('training') || record()?.documentation?.trainingMode || 'learning';
  }
  function assessmentMode() { return trainingMode() === 'assessment'; }

  function saveFinding(key, value, meta = {}) {
    const normality = meta.normality || '';
    const payload = {
      source: meta.source || 'horse-crush-scenario',
      label: meta.label || key.replace(/_/g, ' '),
      details: meta.details || '',
      normality,
      status: normality === 'normal' ? 'normal' : normality === 'not-normal' ? 'abnormal' : '',
      ...meta
    };
    return window.EMSCodeSimScenarioSession?.saveFinding?.(key, value, payload, CASE_ID)
      || window.EMSCodeSimPatientRecord?.setFinding?.(key, value, payload);
  }

  function setMainPatientImage(src, alt) {
    const image = document.getElementById('patientImage');
    if (image && src) {
      image.src = src;
      if (alt) image.alt = alt;
    }
    const focus = document.getElementById('focusImage');
    if (focus && src) {
      focus.src = src;
      if (alt) focus.alt = alt;
    }
  }

  function introStorageKey() {
    return `emscodesim:horse-intro:${record()?.startedAt || record()?.id || 'pending'}`;
  }

  function resetRequested() {
    return new URLSearchParams(location.search).get('reset') === '1';
  }

  function clearIntroCompletion() {
    introFinished = false;
    try {
      Object.keys(sessionStorage)
        .filter(key => key.startsWith('emscodesim:horse-intro:'))
        .forEach(key => sessionStorage.removeItem(key));
    } catch { /* ignore quota */ }
  }

  function hasCompletedIntro() {
    if (introFinished) return true;
    if (resetRequested()) return false;
    try { return sessionStorage.getItem(introStorageKey()) === '1'; } catch { return false; }
  }

  function introLocked() {
    const phase = document.body.dataset.horseIntro;
    return phase === 'video' || phase === 'dispatch' || phase === 'parking';
  }

  function setIntroPhase(phase) {
    document.body.dataset.horseIntro = phase;
    document.body.classList.toggle('horse-intro-playing', phase === 'video');
    document.body.classList.toggle('horse-intro-locked', introLocked());
    window.dispatchEvent(new CustomEvent('emscodesim:patient-record-updated'));
  }

  function markIntroComplete() {
    introFinished = true;
    try { sessionStorage.setItem(introStorageKey(), '1'); } catch { /* ignore quota */ }
  }

  function showDispatch() {
    const type = document.getElementById('infoUpdateType');
    const title = document.getElementById('infoUpdateTitle');
    const text = document.getElementById('infoUpdateText');
    const time = document.getElementById('infoUpdateTime');
    if (type) type.textContent = 'DISPATCH';
    if (title) title.textContent = 'Dispatch information';
    if (text) text.textContent = DISPATCH_TEXT;
    if (time) time.textContent = '00:00';
    setIntroPhase('dispatch');
  }

  function showParking() {
    const type = document.getElementById('infoUpdateType');
    const title = document.getElementById('infoUpdateTitle');
    const text = document.getElementById('infoUpdateText');
    const time = document.getElementById('infoUpdateTime');
    if (type) type.textContent = 'AMBULANCE POSITION';
    if (title) title.textContent = 'Scene arrival';
    if (text) text.textContent = PARKING_TEXT;
    if (time) time.textContent = 'ARRIVAL';
    setIntroPhase('parking');
    setMainPatientImage(PARKING_PHOTO, 'Aerial view of the horse facility showing ambulance access to the south barn and patient location');
    document.querySelector('.patient-stage')?.classList.add('horse-arrival-map');
    if (!has('arrival_parking')) {
      saveFinding('arrival_parking', 'Ambulance positioned safely near the south barn', {
        label: 'Scene arrival',
        selected: 'scenario_start',
        decisionClass: 'appropriate',
        normality: 'normal',
        details: PARKING_TEXT,
        source: 'scenario-start',
        suppressInfoUpdate: true
      });
    }
  }

  function showHandoff() {
    const type = document.getElementById('infoUpdateType');
    const title = document.getElementById('infoUpdateTitle');
    const text = document.getElementById('infoUpdateText');
    const time = document.getElementById('infoUpdateTime');
    if (type) type.textContent = 'BLS ENGINE HANDOFF';
    if (title) title.textContent = 'Patient has not been moved';
    if (text) text.textContent = BLS_HANDOFF_TEXT;
    if (time) time.textContent = 'ARRIVAL';
  }

  function clearIntroPlayTimers() {
    introPlayTimers.forEach(id => window.clearTimeout(id));
    introPlayTimers = [];
  }

  function hideIntroOverlay() {
    clearIntroPlayTimers();
    const overlay = document.getElementById('horseIntroOverlay');
    const video = overlay?.querySelector('video');
    if (video) {
      video.pause();
    }
    overlay?.remove();
  }

  function configureIntroVideo(video) {
    if (!video) return video;
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.autoplay = true;
    video.playsInline = true;
    video.controls = false;
    video.preload = 'auto';
    video.loop = false;
    video.disablePictureInPicture = true;
    video.setAttribute('muted', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('preload', 'auto');
    video.removeAttribute('controls');
    video.removeAttribute('poster');
    video.poster = '';
    if ((video.getAttribute('src') || '') !== INTRO_VIDEO) video.setAttribute('src', INTRO_VIDEO);
    return video;
  }

  function introVideoStillActive(video) {
    return Boolean(video)
      && document.body.dataset.horseIntro === 'video'
      && document.getElementById('horseIntroVideo') === video;
  }

  function syncIntroPlayButton(video) {
    const playButton = document.getElementById('horseIntroPlay');
    if (!playButton) return;
    const show = introVideoStillActive(video) && (video.paused || video.ended);
    playButton.hidden = !show;
  }

  function syncIntroProgress(video) {
    const bar = document.getElementById('horseIntroProgress');
    const fill = bar?.querySelector('i');
    if (!bar || !fill || !video) return;
    const duration = Number(video.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    fill.style.width = `${Math.max(0, Math.min(100, (video.currentTime / duration) * 100))}%`;
  }

  function markIntroPlaybackStarted(video) {
    if (!introVideoStillActive(video)) return;
    if (video.currentTime > 0.05 || (video.readyState >= 2 && !video.paused)) {
      introPlaybackStarted = true;
    }
    syncIntroPlayButton(video);
    syncIntroProgress(video);
  }

  function playIntroVideoWhenReady(video) {
    if (!video) return;
    clearIntroPlayTimers();
    configureIntroVideo(video);
    const attemptPlay = () => {
      if (!introVideoStillActive(video)) return;
      configureIntroVideo(video);
      const play = video.play();
      if (play && typeof play.then === 'function') {
        play.then(() => markIntroPlaybackStarted(video)).catch(() => syncIntroPlayButton(video));
      } else {
        markIntroPlaybackStarted(video);
      }
    };
    video.addEventListener('playing', () => markIntroPlaybackStarted(video));
    video.addEventListener('timeupdate', () => markIntroPlaybackStarted(video));
    video.addEventListener('pause', () => syncIntroPlayButton(video));
    if (video.readyState >= 2) {
      attemptPlay();
    } else {
      video.addEventListener('canplay', attemptPlay, { once:true });
      video.addEventListener('loadeddata', attemptPlay, { once:true });
      introPlayTimers.push(window.setTimeout(attemptPlay, INTRO_PLAY_WAIT_MS));
    }
    introPlayTimers.push(window.setTimeout(() => {
      if (introVideoStillActive(video) && video.paused) attemptPlay();
    }, INTRO_PLAY_RETRY_MS));
    introPlayTimers.push(window.setTimeout(() => syncIntroPlayButton(video), 500));
  }

  function dispatchDwellMs() {
    const words = String(DISPATCH_TEXT).trim().split(/\s+/).filter(Boolean).length;
    return Math.max(12000, Math.round((words / 2.3) * 1000) + 4000);
  }

  function parkingDwellMs() {
    return 7000;
  }

  function continueAfterDispatch() {
    if (document.body.dataset.horseIntro !== 'dispatch') return;
    showParking();
    window.clearTimeout(introTimer);
    introTimer = window.setTimeout(() => {
      if (document.body.dataset.horseIntro !== 'parking') return;
      markIntroComplete();
      renderArrivalCard();
    }, parkingDwellMs());
  }

  function finishIntroVideo(event) {
    const phase = document.body.dataset.horseIntro;
    if (phase === 'dispatch' || phase === 'parking' || phase === 'arrived') return;
    const video = document.getElementById('horseIntroVideo');
    const endedWithoutPlay = event?.type === 'ended' && !introSkipRequested && !introPlaybackStarted;
    if (endedWithoutPlay && (Number(video?.currentTime) || 0) < 0.2) {
      syncIntroPlayButton(video);
      return;
    }
    setIntroPhase('dispatch');
    hideIntroOverlay();
    showDispatch();
    window.clearTimeout(introTimer);
    introTimer = window.setTimeout(continueAfterDispatch, dispatchDwellMs());
  }

  function skipIntroVideo() {
    introSkipRequested = true;
    finishIntroVideo({ type:'skip' });
  }

  function ensureIntroOverlay() {
    const stage = document.querySelector('.patient-stage');
    if (!stage) return null;
    let overlay = document.getElementById('horseIntroOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'horseIntroOverlay';
    overlay.innerHTML = `
      <video id="horseIntroVideo" class="intro-video" muted autoplay playsinline webkit-playsinline preload="auto" src="${INTRO_VIDEO}">
        <source src="${INTRO_VIDEO}" type="video/mp4">
      </video>
      <div id="horseIntroProgress" hidden><i></i></div>
      <button type="button" id="horseIntroPlay" hidden>Play walking scene</button>
      <button type="button" id="horseIntroSkip">Skip</button>`;
    stage.appendChild(overlay);
    overlay.querySelector('#horseIntroSkip')?.addEventListener('click', skipIntroVideo);
    overlay.querySelector('#horseIntroPlay')?.addEventListener('click', event => {
      event.preventDefault();
      playIntroVideoWhenReady(overlay.querySelector('#horseIntroVideo'));
    });
    const video = configureIntroVideo(overlay.querySelector('#horseIntroVideo'));
    try { video?.load(); } catch { /* ignore */ }
    video?.addEventListener('ended', finishIntroVideo);
    return overlay;
  }

  function playIncidentIntro() {
    if (!isActive()) return;
    if (resetRequested()) clearIntroCompletion();
    if (hasCompletedIntro()) {
      setIntroPhase('arrived');
      hideIntroOverlay();
      renderArrivalCard();
      return;
    }
    const phase = document.body.dataset.horseIntro;
    if (phase === 'dispatch' || phase === 'parking' || phase === 'arrived') return;
    introSkipRequested = false;
    introPlaybackStarted = false;
    document.body.classList.add('horse-intro-playing');
    setIntroPhase('video');
    const overlay = ensureIntroOverlay();
    if (!overlay) {
      skipIntroVideo();
      return;
    }
    overlay.hidden = false;
    overlay.removeAttribute('hidden');
    playIntroVideoWhenReady(overlay.querySelector('#horseIntroVideo'));
  }

  function revealPatientImage() {
    setMainPatientImage(HANDOFF_PHOTO, 'BLS engine crew giving handoff beside the patient outside the south barn');
    const controls = document.getElementById('patientPhaseControls');
    if (controls) controls.hidden = false;
    const layer = document.getElementById('sceneClueLayer');
    if (layer) layer.hidden = false;
    document.querySelector('.patient-stage')?.classList.remove('horse-arrival-map');
  }

  function renderArrivalCard() {
    if (!isActive()) return;

    document.getElementById('horseArrivalDecision')?.remove();
    document.body.classList.remove('horse-arrival-pending', 'horse-intro-playing');
    setIntroPhase('arrived');
    hideIntroOverlay();
    revealPatientImage();

    if (!has('arrival_parking')) {
      saveFinding('arrival_parking', 'Ambulance positioned safely near the south barn', {
        label: 'Scene arrival',
        selected: 'scenario_start',
        decisionClass: 'appropriate',
        normality: 'normal',
        details: PARKING_TEXT,
        source: 'scenario-start',
        suppressInfoUpdate: true
      });
    }

    if (!has('bls_handoff')) {
      saveFinding('bls_handoff', 'Compressed between two horses, fell to the ground, no LOC, A&O ×4, severe left-hip pain, not moved.', {
        label: 'BLS engine handoff',
        normality: 'normal',
        details: 'The engine crew confirms the horses are secured and the patient has not been moved.',
        source: 'bls-handoff',
        suppressInfoUpdate: true
      });
    }
    showHandoff();
  }

  function maybeSaveCompleteTraumaExam() {
    if (!EXAMS.every(item => has(item.key)) || has('trauma_assessment')) return;
    saveFinding('trauma_assessment', 'Systematic pre-movement trauma examination completed', {
      label: 'Rapid trauma assessment',
      normality: 'not-normal',
      details: 'No head, spinal, chest, or abdominal injury was identified. The pelvis is stable with focal left-hip tenderness. The leg has no obvious deformity, shortening, or rotation. Distal circulation, sensation, and movement are intact.',
      suppressInfoUpdate: true
    });
  }

  function examForCurrentState(item) {
    const state = window.EMSCodeSimScenarioRuntime?.horseClinicalState?.(record());
    if (!state || state.stage === 'baseline') return item;
    if (item.key === 'left_leg') {
      const finding = state.unsafeMovement
        ? 'The patient guards the left hip more intensely after painful movement. Pain is now 10/10, and she will not allow the leg to be straightened.'
        : `The left leg is supported in the flexed position of comfort. Pain is now ${state.painScore}/10 at rest; hip movement still increases pain.`;
      return {
        ...item,
        finding,
        details:'No new deformity, shortening, rotation, open injury, or significant swelling is seen. Continue to minimize movement and protect the position of comfort.'
      };
    }
    if (item.key === 'distal_csm') {
      return {
        ...item,
        finding:'Left pedal pulse remains present. The foot is warm, sensation remains intact, and the patient can move the ankle and toes after treatment / movement.',
        details:'Distal neurovascular status remains unchanged from baseline. Continue to repeat this check after every significant movement or stabilization change.'
      };
    }
    if (item.key === 'pelvis_hip' && !state.unsafeMovement) {
      return {
        ...item,
        finding:`Pelvis remains stable on a single gentle assessment. Marked tenderness is still localized to the left hip; current pain is ${state.painScore}/10 at rest.`,
        details:'Treatment has improved comfort but does not remove the underlying hip injury. Avoid repeated pelvic compression and continue protected movement.'
      };
    }
    return item;
  }

  function performExam(key) {
    if (!isActive()) return null;
    const baseItem = EXAMS.find(exam => exam.key === key);
    if (!baseItem) return null;
    const item = examForCurrentState(baseItem);
    setMainPatientImage(item.image, `${item.label} on the same patient outside the south barn`);
    const saved = record()?.findings?.[item.key];
    if (!saved) {
      saveFinding(item.key, item.finding, {
        label: item.label,
        normality: item.normality,
        details: item.details,
        image: item.image,
        source: 'horse-crush-focused-exam'
      });
      maybeSaveCompleteTraumaExam();
    } else {
      const dynamicReassessment = ['left_leg','distal_csm','pelvis_hip'].includes(item.key) && item.finding !== baseItem.finding;
      if (dynamicReassessment) {
        saveFinding(item.key, item.finding, {
          label: `${item.label} reassessment`,
          normality: item.normality,
          details: item.details,
          image: item.image,
          source: 'horse-crush-focused-exam',
          isReassessment:true
        });
      } else {
        window.EMSCodeSimPatientInfo?.showSceneObservation?.({
          id: `horse-exam-review-${item.key}-${Date.now()}`,
          type: 'ASSESSMENT REVIEW',
          title: item.label,
          text: item.finding,
          kind: item.normality === 'not-normal' ? 'alert' : 'assessment',
          sticky: true
        });
      }
    }
    return item;
  }

  function renderAssessmentSection(container) {
    if (!isActive() || !container) return;
    const desktop = window.matchMedia?.('(min-width: 980px)')?.matches === true;
    const section = document.createElement('section');
    section.className = 'horse-assessment-section assessment-level';

    if (!desktop) {
      const completed = EXAMS.filter(item => has(item.key)).length;
      section.innerHTML = `
        <div class="assessment-section-title"><div><span>Focused physical exam</span><small>Select the body area you want to examine. The finding appears in the patient update window.</small></div><em>${completed} performed</em></div>
        <div class="horse-exam-grid"></div>`;
      const grid = section.querySelector('.horse-exam-grid');
      EXAMS.forEach(item => {
        const saved = record()?.findings?.[item.key];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `horse-exam-button${saved ? ' complete' : ''}`;
        button.innerHTML = `<span>${saved ? '✓' : '○'}</span><div><strong>${escapeHtml(item.label)}</strong><small>${saved ? 'Recorded — review again' : 'Perform exam'}</small></div>`;
        button.addEventListener('click', () => performExam(item.key));
        grid.appendChild(button);
      });
    } else {
      section.classList.add('horse-assessment-selector');
      section.innerHTML = `
        <div class="assessment-section-title"><div><span>Choose current assessment</span><small>Select the exam you want in the fixed Current Assessment workspace. Only one exam block is open at a time.</small></div></div>
        <div class="horse-assessment-selector-grid">
          <button type="button" data-horse-assessment="abc"><strong>ABC assessment</strong><small>Airway · Breathing · Circulation</small></button>
          <button type="button" data-horse-assessment="head_to_toe"><strong>Head-to-toe exam</strong><small>Head · Neck/back · Chest · Abdomen · Pelvis · Extremities</small></button>
          <button type="button" data-horse-assessment="focused_leg"><strong>Focused hip / leg exam</strong><small>Pelvis/hip · Lower extremities · Distal CSM</small></button>
        </div>`;
      section.querySelectorAll('[data-horse-assessment]').forEach(button => {
        button.addEventListener('click', () => {
          window.EMSCodeSimHorseWorkspace?.selectAssessment?.(button.dataset.horseAssessment);
        });
      });
    }

    const immediate = container.querySelector('.assessment-immediate');
    if (immediate) immediate.insertAdjacentElement('afterend', section);
    else container.prepend(section);
  }

  function checkedValues(form, name) {
    return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(input => input.value);
  }

  function evaluateMovement(data) {
    const unsafePre = data.pre.includes('force_straight');
    const safePre = ['distal_csm','leg_support','pain_plan','team_brief'].filter(value => data.pre.includes(value)).length;
    const goodMethod = ['scoop','vacuum'].includes(data.method);
    const acceptableMethod = data.method === 'board_transfer';
    const unsafeMethod = ['stand_pivot','force_flat','blanket_lift'].includes(data.method);
    const goodStabilization = ['blankets_position','vacuum_support'].includes(data.stabilization);
    const unsupportedStabilization = ['traction','binder_only','straighten'].includes(data.stabilization);
    const postComplete = data.post.includes('csm') && data.post.includes('pain_vitals');
    if (unsafePre || unsafeMethod || unsupportedStabilization) {
      return { classification:'unsafe', label:'High-risk plan', feedback:'The plan adds avoidable movement or uses a device that is not supported by the examination findings. Reassess the injury and preserve the position of comfort.' };
    }
    if (goodMethod && goodStabilization && safePre >= 3 && postComplete) {
      return { classification:'appropriate-effective', label:'Strong movement plan', feedback:'The plan minimizes motion, supports the leg, uses the available crew, and includes before-and-after neurovascular and pain reassessment.' };
    }
    if ((goodMethod || acceptableMethod) && goodStabilization && postComplete) {
      return { classification:'acceptable-with-cautions', label:'Defensible plan with gaps', feedback:'The selected device can work, but the pre-movement plan should more clearly address pain control, manual leg support, team roles, and baseline distal CSM.' };
    }
    return { classification:'incomplete', label:'Plan needs more information', feedback:'Complete the assessment and specify how the leg will be supported, how the team will coordinate movement, and what will be reassessed afterward.' };
  }

  function movementImage(method, stabilization) {
    if (stabilization === 'blankets_position' || stabilization === 'vacuum_support') return `${ASSET}movement-blankets.webp`;
    if (method) return `${ASSET}movement-scoop.webp`;
    return `${ASSET}patient-initial.webp`;
  }

  function renderMovementSection(container) {
    if (!isActive() || !container) return;
    const current = record();
    const saved = current.documentation?.horseCrushMovement || {};
    const details = document.createElement('details');
    details.className = 'treatment-category horse-movement-section';
    details.dataset.treatmentCategory = 'movement';
    details.open = !current.findings?.movement_plan;
    details.innerHTML = `
      <summary><span><strong>Movement and packaging problem</strong><small>Build a plan from the findings you obtained. The plan does not have to copy the original call.</small></span><em>${current.findings?.movement_plan ? 'Recorded' : 'Decision required'}</em></summary>
      <div class="horse-movement-body">
        <img class="horse-movement-image" src="${movementImage(saved.method, saved.stabilization)}" alt="Movement and packaging planning for the horse-crush patient">
        <form class="horse-movement-form">
          <fieldset><legend>1. What should happen before movement?</legend>
            ${[
              ['distal_csm','Obtain and document baseline distal CSM'],['leg_support','Assign one rescuer to support the injured leg'],['pain_plan','Address pain before movement when feasible'],['team_brief','Brief the team and count the move'],['force_straight','Force the leg straight before planning the lift']
            ].map(([value,label]) => `<label><input type="checkbox" name="pre" value="${value}" ${saved.pre?.includes(value)?'checked':''}> <span>${label}</span></label>`).join('')}
          </fieldset>
          <fieldset><legend>2. Choose the movement method</legend>
            ${[
              ['scoop','Scoop stretcher placed with minimal patient movement'],['vacuum','Vacuum mattress with a coordinated lift while preserving position'],['board_transfer','Long board used only as a transfer device with padding'],['stand_pivot','Assist the patient to stand and pivot'],['blanket_lift','Lift with a loose blanket only'],['force_flat','Straighten the leg and move the patient flat']
            ].map(([value,label]) => `<label><input type="radio" name="method" value="${value}" ${saved.method===value?'checked':''}> <span>${label}</span></label>`).join('')}
          </fieldset>
          <fieldset><legend>3. How will you stabilize the leg?</legend>
            ${[
              ['blankets_position','Folded blankets under and around the knee; maintain position of comfort'],['vacuum_support','Mold a vacuum mattress around the body and flexed leg'],['traction','Apply a traction splint based on hip pain alone'],['binder_only','Apply a pelvic binder based only on localized hip pain'],['straighten','Straighten the leg and secure it to the cot']
            ].map(([value,label]) => `<label><input type="radio" name="stabilization" value="${value}" ${saved.stabilization===value?'checked':''}> <span>${label}</span></label>`).join('')}
          </fieldset>
          <fieldset><legend>4. What will you reassess after movement?</legend>
            ${[
              ['csm','Distal circulation, sensation, and movement'],['pain_vitals','Pain, ABCs, and vital-sign trend'],['position','Leg position and security of padding'],['nothing','No reassessment is needed if the patient tolerated the move']
            ].map(([value,label]) => `<label><input type="checkbox" name="post" value="${value}" ${saved.post?.includes(value)?'checked':''}> <span>${label}</span></label>`).join('')}
          </fieldset>
          <label class="horse-movement-note">Clinical reasoning<textarea name="reasoning" rows="3" placeholder="Explain why your movement plan fits the findings.">${escapeHtml(saved.reasoning || '')}</textarea></label>
          <button type="submit" class="primary-action">${current.findings?.movement_plan ? 'Update movement plan' : 'Record movement plan'}</button>
          <p class="horse-movement-feedback" hidden aria-live="polite"></p>
        </form>
      </div>`;

    const form = details.querySelector('form');
    const image = details.querySelector('.horse-movement-image');
    form.querySelectorAll('input[name="method"],input[name="stabilization"]').forEach(input => input.addEventListener('change', () => {
      const method = form.querySelector('input[name="method"]:checked')?.value || '';
      const stabilization = form.querySelector('input[name="stabilization"]:checked')?.value || '';
      image.src = movementImage(method, stabilization);
    }));

    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = {
        pre: checkedValues(form, 'pre'),
        method: form.querySelector('input[name="method"]:checked')?.value || '',
        stabilization: form.querySelector('input[name="stabilization"]:checked')?.value || '',
        post: checkedValues(form, 'post'),
        reasoning: String(form.elements.namedItem('reasoning')?.value || '').trim(),
        recordedAt: new Date().toISOString()
      };
      if (!data.method || !data.stabilization || !data.pre.length || !data.post.length) {
        const feedback = form.querySelector('.horse-movement-feedback');
        feedback.hidden = false;
        feedback.textContent = 'Complete all four parts of the movement plan before recording it.';
        return;
      }
      const evaluation = evaluateMovement(data);
      window.EMSCodeSimPatientRecord?.setDocumentation?.({ horseCrushMovement: data });
      const methodLabels = { scoop:'Scoop stretcher', vacuum:'Vacuum mattress', board_transfer:'Long board as transfer device', stand_pivot:'Stand and pivot', blanket_lift:'Blanket lift', force_flat:'Forced flat movement' };
      const stabilizationLabels = { blankets_position:'Blanket support in position of comfort', vacuum_support:'Vacuum-mattress support', traction:'Traction splint', binder_only:'Pelvic binder', straighten:'Leg straightened to cot' };
      const summary = `${methodLabels[data.method] || data.method} • ${stabilizationLabels[data.stabilization] || data.stabilization}`;
      saveFinding('movement_method', methodLabels[data.method] || data.method, { label:'Movement method', normality:evaluation.classification==='appropriate-effective'?'normal':'not-normal', details:data.reasoning, decisionClass:evaluation.classification });
      saveFinding('leg_stabilization', stabilizationLabels[data.stabilization] || data.stabilization, { label:'Leg stabilization plan', normality:['blankets_position','vacuum_support'].includes(data.stabilization)?'normal':'not-normal', decisionClass:evaluation.classification });
      saveFinding('movement_plan', summary, { label:'Movement and packaging plan', normality:evaluation.classification==='appropriate-effective'?'normal':'not-normal', details:data.reasoning || evaluation.feedback, decisionClass:evaluation.classification });

      if (!(record().treatments || []).some(item => item.actionId === 'horse_crush_movement_plan')) {
        window.EMSCodeSimScenarioSession?.addTreatment?.({
          actionId:'horse_crush_movement_plan',
          treatment:'Movement and packaging plan',
          name:'Movement and packaging plan',
          label:'Movement and packaging plan',
          description:summary,
          source:'horse-crush-movement',
          classification:evaluation.classification,
          indicationStatus:evaluation.classification,
          targetKeys:['left_leg','distal_csm','pain'],
          reassessmentRequired:true,
          documentation:data,
          patientResponse:evaluation.classification === 'unsafe'
            ? 'Movement causes a sharp increase in left-hip pain and the plan must be stopped and revised.'
            : 'The patient is moved with the leg supported. Pain remains controlled while the extremity stays still.'
        });
      }
      const feedback = form.querySelector('.horse-movement-feedback');
      feedback.hidden = false;
      feedback.textContent = assessmentMode()
        ? 'Movement plan recorded. Detailed scoring and rationale will be reviewed during the debrief.'
        : `${evaluation.label}: ${evaluation.feedback}`;
      image.src = movementImage(data.method, data.stabilization);
    });

    const firstCategory = container.querySelector('.treatment-category');
    if (firstCategory) container.insertBefore(details, firstCategory);
    else container.appendChild(details);
  }

  function init() {
    if (!isActive()) return;
    playIncidentIntro();
    window.setTimeout(playIncidentIntro, 400);
    const unlockIntro = () => {
      if (document.body.dataset.horseIntro === 'video') playIncidentIntro();
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach(type => {
      document.addEventListener(type, unlockIntro, { capture:true });
    });
    window.addEventListener('emscodesim:scenario-finding-saved', event => {
      if (event.detail?.caseId !== CASE_ID) return;
      if (['arrival_parking','bls_handoff'].includes(event.detail?.category) && hasCompletedIntro()) {
        window.setTimeout(renderArrivalCard, 20);
      }
      if (event.detail?.key === 'transport_decision' || event.detail?.category === 'transport') {
        setMainPatientImage(`${ASSET}transport-ambulance.webp`, 'Patient on a level stretcher with the left knee padded at about 45 degrees');
      }
    });
    window.addEventListener('pageshow', () => window.setTimeout(playIncidentIntro, 20));
    document.addEventListener('click', event => {
      const origin = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
      if (!origin?.closest?.('#resetScenarioQuick, #resetAndRestartScenario')) return;
      window.setTimeout(playIncidentIntro, 600);
    });
  }

  window.EMSCodeSimHorseCrush = Object.freeze({
    EXAMS,
    init,
    playIncidentIntro,
    renderArrivalCard,
    renderAssessmentSection,
    renderMovementSection,
    performExam,
    movementImage,
    introAllowsPatientSpeech() { return document.body.dataset.horseIntro === 'arrived'; }
  });
})();
