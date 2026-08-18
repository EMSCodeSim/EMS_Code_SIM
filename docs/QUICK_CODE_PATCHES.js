// ============================================================
// PASTE HELPERS for vitals/horse-crush-scenario.js
// Full instructions: HORSE_HANDOFF_FOLLOWUPS_AND_VIDEO_FIX.md
// ============================================================

// --- 1) Bump intro cache ---
// const INTRO_BUILD = '2026.08.18.20';

// --- 2) BLS follow-up questions (place after BLS_HANDOFF_TEXT) ---
const BLS_FOLLOWUPS = [
  {
    id: 'bls_q_loc',
    question: 'Was there any loss of consciousness?',
    answer: 'No. She was awake the whole time and remembers being pressed between the horses and falling.',
    findingKey: 'bls_followup_loc',
    label: 'BLS follow-up: LOC'
  },
  {
    id: 'bls_q_moved',
    question: 'Has she been moved at all?',
    answer: 'No. We found her in this position and have not moved her. Left knee is still flexed.',
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
    answer: 'Nothing obvious. She is guarding the left hip and will not straighten that leg. Distal pulse was present.',
    findingKey: 'bls_followup_injuries',
    label: 'BLS follow-up: other injuries'
  },
  {
    id: 'bls_q_vitals',
    question: 'Did you get a set of vitals?',
    answer: 'Only a quick check — alert, talking, not in respiratory distress. We deferred a full set so we would not move the leg.',
    findingKey: 'bls_followup_vitals',
    label: 'BLS follow-up: vitals'
  }
];

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
  if (answerEl) { answerEl.hidden = true; answerEl.textContent = ''; }
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
    source: 'bls-followup'
  });
  const type = document.getElementById('infoUpdateType');
  const title = document.getElementById('infoUpdateTitle');
  const text = document.getElementById('infoUpdateText');
  const time = document.getElementById('infoUpdateTime');
  if (type) type.textContent = 'BLS ENGINE CREW';
  if (title) title.textContent = item.question;
  if (text) text.textContent = item.answer;
  if (time) time.textContent = 'FOLLOW-UP';
  const answerEl = document.getElementById('horseBlsFollowupAnswer');
  if (answerEl) { answerEl.hidden = false; answerEl.textContent = item.answer; }
  renderBlsFollowups();
}

// In renderArrivalCard(), after showHandoff():
//   showHandoff();
//   renderBlsFollowups();
