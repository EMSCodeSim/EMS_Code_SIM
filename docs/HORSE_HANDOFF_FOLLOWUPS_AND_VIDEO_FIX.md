# Updates: BLS handoff follow-up questions + starting video play

Edit `vitals/horse-crush-scenario.js`.

---

## A) Make the starting video play more reliably

### Problem
Browsers block autoplay until a user gesture. Your code already retries `video.play()`, but if the first attempt fails, the Play button can stay hidden or the phase can stall.

### 1. Bump cache so clients load the new script + video

Near the top of `horse-crush-scenario.js`:

```js
const INTRO_BUILD = '2026.08.18.20'; // bump this
const INTRO_VIDEO = `${ASSET}incident-calm-walk.mp4?v=${INTRO_BUILD}`;
```

### 2. Replace `playIntroVideoWhenReady` with a stronger version

```js
function playIntroVideoWhenReady(video) {
  if (!video) return;
  clearIntroPlayTimers();
  configureIntroVideo(video);

  const attemptPlay = (reason = 'auto') => {
    if (!introVideoStillActive(video)) return;
    configureIntroVideo(video);
    // Force a fresh load if the element never advanced
    if (video.readyState < 2 && reason === 'retry') {
      try { video.load(); } catch { /* ignore */ }
    }
    const play = video.play();
    if (play && typeof play.then === 'function') {
      play
        .then(() => {
          markIntroPlaybackStarted(video);
          syncIntroPlayButton(video);
        })
        .catch((err) => {
          console.warn('[horse-intro] play blocked', reason, err?.name || err);
          // Always surface the manual play control when autoplay fails
          const playButton = document.getElementById('horseIntroPlay');
          if (playButton) playButton.hidden = false;
          syncIntroPlayButton(video);
        });
    } else {
      markIntroPlaybackStarted(video);
    }
  };

  // Event-driven starts
  video.addEventListener('playing', () => markIntroPlaybackStarted(video));
  video.addEventListener('timeupdate', () => {
    markIntroPlaybackStarted(video);
    syncIntroProgress(video);
  });
  video.addEventListener('pause', () => syncIntroPlayButton(video));
  video.addEventListener('error', () => {
    const playButton = document.getElementById('horseIntroPlay');
    if (playButton) {
      playButton.hidden = false;
      playButton.textContent = 'Video failed — tap to retry';
    }
  });

  if (video.readyState >= 2) {
    attemptPlay('ready');
  } else {
    video.addEventListener('canplay', () => attemptPlay('canplay'), { once: true });
    video.addEventListener('loadeddata', () => attemptPlay('loadeddata'), { once: true });
    introPlayTimers.push(window.setTimeout(() => attemptPlay('wait-250'), INTRO_PLAY_WAIT_MS));
  }

  // Retries while still in video phase
  introPlayTimers.push(window.setTimeout(() => {
    if (introVideoStillActive(video) && video.paused) attemptPlay('retry-800');
  }, INTRO_PLAY_RETRY_MS));
  introPlayTimers.push(window.setTimeout(() => {
    if (introVideoStillActive(video) && video.paused) attemptPlay('retry-2000');
  }, 2000));
  introPlayTimers.push(window.setTimeout(() => syncIntroPlayButton(video), 400));
}
```

### 3. Make the Play button always usable after a failed autoplay

In `ensureIntroOverlay`, keep:

```js
overlay.querySelector('#horseIntroPlay')?.addEventListener('click', event => {
  event.preventDefault();
  const v = overlay.querySelector('#horseIntroVideo');
  introSkipRequested = false;
  playIntroVideoWhenReady(v);
});
```

And ensure the button is **not** permanently `hidden` on first autoplay failure (the updated `playIntroVideoWhenReady` handles that).

### 4. Unlock on first user gesture (keep, but tighten)

Your `init()` already does:

```js
const unlockIntro = () => {
  if (document.body.dataset.horseIntro === 'video') playIncidentIntro();
};
['pointerdown', 'keydown', 'touchstart'].forEach(type => {
  document.addEventListener(type, unlockIntro, { capture: true });
});
```

Change it so the **first gesture also directly plays the video element** (more reliable than only re-entering the phase):

```js
const unlockIntro = () => {
  if (document.body.dataset.horseIntro !== 'video') return;
  const video = document.getElementById('horseIntroVideo');
  if (video && video.paused) playIntroVideoWhenReady(video);
  else playIncidentIntro();
};
['pointerdown', 'keydown', 'touchstart'].forEach(type => {
  document.addEventListener(type, unlockIntro, { capture: true, once: false });
});
```

### 5. Confirm the file is actually reachable

```
/vitals/assets/horse-crush/incident-calm-walk.mp4
```

Must return `200` and `content-type: video/mp4` (it already does on production). If you replace the file, bump `INTRO_BUILD`.

---

## B) BLS handoff follow-up questions

After the engine handoff appears, show a short question set the learner can ask the BLS crew. Answers are fixed to the scenario truth and save as findings.

### 1. Add question data (near top, after `BLS_HANDOFF_TEXT`)

```js
const BLS_FOLLOWUPS = [
  {
    id: 'bls_q_loc',
    question: 'Was there any loss of consciousness?',
    answer: 'No. She says she was awake the whole time and remembers being pressed between the horses and falling.',
    findingKey: 'bls_followup_loc',
    label: 'BLS follow-up: LOC'
  },
  {
    id: 'bls_q_moved',
    question: 'Has she been moved at all?',
    answer: 'No. We found her on the ground in this position and have not moved her. Left knee is still flexed.',
    findingKey: 'bls_followup_moved',
    label: 'BLS follow-up: movement'
  },
  {
    id: 'bls_q_horses',
    question: 'Are the horses secured?',
    answer: 'Yes. Both horses are secured. Scene is safe for patient care.',
    findingKey: 'bls_followup_scene',
    label: 'BLS follow-up: scene safety'
  },
  {
    id: 'bls_q_other_injury',
    question: 'Any other injuries you noticed?',
    answer: 'Nothing obvious to us. She is guarding the left hip and will not straighten that leg. Distal pulse was present when we checked.',
    findingKey: 'bls_followup_injuries',
    label: 'BLS follow-up: other injuries'
  },
  {
    id: 'bls_q_vitals',
    question: 'Did you get a set of vitals?',
    answer: 'Only a quick check — she is alert, talking, and not in respiratory distress. We deferred a full set so we would not move the leg.',
    findingKey: 'bls_followup_vitals',
    label: 'BLS follow-up: vitals'
  }
];
```

### 2. Render follow-up UI after handoff

Add these functions (near `showHandoff` / `renderArrivalCard`):

```js
function blsFollowupHost() {
  let host = document.getElementById('horseBlsFollowups');
  if (host) return host;
  const panel = document.getElementById('infoUpdateWindow') || document.querySelector('.communication-workspace');
  if (!panel) return null;
  host = document.createElement('div');
  host.id = 'horseBlsFollowups';
  host.className = 'horse-bls-followups';
  host.innerHTML = `
    <div class="horse-bls-followups-head">
      <small>BLS CREW</small>
      <strong>Follow-up questions</strong>
      <span>Clarify the handoff before you start your exam</span>
    </div>
    <div id="horseBlsFollowupButtons" class="horse-bls-followup-buttons"></div>
    <p id="horseBlsFollowupAnswer" class="horse-bls-followup-answer" hidden aria-live="polite"></p>
  `;
  panel.appendChild(host);
  return host;
}

function renderBlsFollowups() {
  const host = blsFollowupHost();
  if (!host) return;
  host.hidden = false;
  const buttons = host.querySelector('#horseBlsFollowupButtons');
  const answerEl = host.querySelector('#horseBlsFollowupAnswer');
  if (!buttons) return;
  buttons.innerHTML = '';
  if (answerEl) {
    answerEl.hidden = true;
    answerEl.textContent = '';
  }

  BLS_FOLLOWUPS.forEach(item => {
    const asked = has(item.findingKey);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `horse-bls-followup-btn${asked ? ' is-asked' : ''}`;
    btn.textContent = item.question;
    btn.disabled = asked;
    btn.addEventListener('click', () => askBlsFollowup(item));
    buttons.appendChild(btn);
  });
}

function askBlsFollowup(item) {
  if (!item || has(item.findingKey)) return;

  saveFinding(item.findingKey, item.answer, {
    label: item.label,
    normality: 'normal',
    details: item.question,
    source: 'bls-followup',
    // allow this one into the communication log
    suppressInfoUpdate: false
  });

  // Show answer in the live handoff panel
  const type = document.getElementById('infoUpdateType');
  const title = document.getElementById('infoUpdateTitle');
  const text = document.getElementById('infoUpdateText');
  const time = document.getElementById('infoUpdateTime');
  if (type) type.textContent = 'BLS ENGINE CREW';
  if (title) title.textContent = item.question;
  if (text) text.textContent = item.answer;
  if (time) time.textContent = 'FOLLOW-UP';

  const answerEl = document.getElementById('horseBlsFollowupAnswer');
  if (answerEl) {
    answerEl.hidden = false;
    answerEl.textContent = item.answer;
  }

  renderBlsFollowups();
}

function hideBlsFollowups() {
  const host = document.getElementById('horseBlsFollowups');
  if (host) host.hidden = true;
}
```

### 3. Hook into arrival / handoff

Update `renderArrivalCard()` so it shows follow-ups after the handoff line:

```js
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
  renderBlsFollowups(); // <-- add this
}
```

### 4. Minimal CSS (put in your scenario CSS or a small style block in bootstrap)

```css
.horse-bls-followups {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(15, 23, 42, 0.08);
}
.horse-bls-followups-head {
  display: grid;
  gap: 2px;
  margin-bottom: 8px;
}
.horse-bls-followups-head small {
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  opacity: 0.7;
}
.horse-bls-followup-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.horse-bls-followup-btn {
  border: 1px solid rgba(15, 23, 42, 0.15);
  background: #fff;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.85rem;
  cursor: pointer;
}
.horse-bls-followup-btn:hover:not(:disabled) {
  border-color: rgba(2, 128, 125, 0.5);
}
.horse-bls-followup-btn.is-asked,
.horse-bls-followup-btn:disabled {
  opacity: 0.55;
  cursor: default;
}
.horse-bls-followup-answer {
  margin: 8px 0 0;
  font-size: 0.9rem;
  line-height: 1.35;
}
```

### 5. Optional grading credit

If you want follow-ups to count toward assessment completeness, add the finding keys to the horse_crush appropriate/optional findings list in `scenario-definitions.js`:

```js
'bls_followup_loc',
'bls_followup_moved',
'bls_followup_scene',
'bls_followup_injuries',
'bls_followup_vitals'
```

(as `optionalFindings` is usually enough so they are not required to pass).

---

## C) Quick test checklist

1. Hard refresh with `?case=horse_crush&training=assessment&reset=1`
2. Intro overlay appears; video should autoplay muted
3. If autoplay is blocked → **Play walking scene** is visible and starts playback on tap
4. Skip or end → Dispatch → Parking → Handoff photo + BLS speech
5. Follow-up question chips appear under communications
6. Each question shows crew answer once and marks as asked
7. Reset scenario clears intro session key and plays video again

---

## Cursor one-shot prompt

```text
In vitals/horse-crush-scenario.js:
1) Bump INTRO_BUILD and harden playIntroVideoWhenReady so autoplay failures always show #horseIntroPlay and retry play on user gesture.
2) Add BLS_FOLLOWUPS question/answer list and renderBlsFollowups/askBlsFollowup UI after showHandoff() inside renderArrivalCard().
3) Add minimal CSS for .horse-bls-followups chips.
Do not change exam finding keys or grading required keys except optionally adding bls_followup_* as optionalFindings.
```
