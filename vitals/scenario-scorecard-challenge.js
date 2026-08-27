(() => {
  'use strict';

  const VERSION = '2026.08.27.1';
  const STORAGE_KEY = 'emscodesim_peer_challenge_v1';
  const params = new URLSearchParams(location.search);
  const $ = (id) => document.getElementById(id);

  const TITLES = Object.freeze([
    { min: 95, title: 'Clinical Specialist', tone: 'elite' },
    { min: 85, title: 'Field Ready', tone: 'strong' },
    { min: 70, title: 'Developing Clinician', tone: 'ok' },
    { min: 0, title: 'BLS Remediation Needed', tone: 'remediate' }
  ]);

  const SCENARIO_LABELS = Object.freeze({
    horse_crush: 'Horse Crush Trauma',
    asthma: 'Asthma / Respiratory',
    stroke: 'Stroke Assessment',
    hypoglycemia: 'Hypoglycemia',
    trauma: 'Trauma Assessment',
    pediatric: 'Pediatric Emergency'
  });

  function normalizeCaseId(raw) {
    return String(raw || '')
      .trim()
      .toLowerCase()
      .replace(/-/g, '_')
      .replace(/^horsecrush$/, 'horse_crush')
      .replace(/^horse_crush$/, 'horse_crush');
  }

  function caseIdFromPage() {
    const fromQuery = normalizeCaseId(params.get('case') || params.get('scenario') || '');
    if (fromQuery) return fromQuery;
    try {
      const active = window.EMSCodeSimScenarioSession?.sync?.() || window.EMSCodeSimPatientRecord?.active?.();
      return normalizeCaseId(active?.scenarioId || active?.id || '');
    } catch (_) {
      return '';
    }
  }

  function clinicalTitle(score) {
    const n = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
    return TITLES.find((row) => n >= row.min) || TITLES[TITLES.length - 1];
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function elapsedSeconds(record) {
    const started = record?.startedAt ? Date.parse(record.startedAt) : NaN;
    if (!Number.isFinite(started)) return 0;
    const ended = record?.documentation?.gradeViewedAt
      ? Date.parse(record.documentation.gradeViewedAt)
      : Date.now();
    return Math.max(0, Math.round((ended - started) / 1000));
  }

  function interventionStats(record) {
    const treatments = Array.isArray(record?.treatments) ? record.treatments : [];
    const critical = treatments.filter((item) => {
      const c = String(item?.classification || '').toLowerCase();
      return c === 'appropriate-effective' || c === 'appropriate' || c === 'indicated' || (!c && item?.actionId);
    });
    const contraindicated = treatments.filter((item) => {
      const c = String(item?.classification || '').toLowerCase();
      return c === 'contraindicated' || c === 'unsafe' || c === 'unnecessary';
    });
    const expected = Math.max(critical.length + contraindicated.length, treatments.length, 1);
    return {
      correct: critical.length,
      total: expected,
      label: `${critical.length}/${expected}`
    };
  }

  function outcomeText(record, caseId) {
    if (caseId === 'horse_crush') {
      const stage = window.EMSCodeSimScenarioRuntime?.horseClinicalState?.(record)?.stage || '';
      const map = {
        relieved: 'Patient comfort improved — pain relieved',
        'pain-improved': 'Patient outcome improved',
        supported: 'Patient supported and packaged',
        stabilized: 'Patient stabilized for transport',
        'pain-escalating': 'Pain escalated — outcome worsening',
        'delayed-care': 'Delayed care — outcome worsened',
        worse: 'Patient condition worsened'
      };
      return map[stage] || 'Call completed — review coaching below';
    }
    const impression = record?.impressions?.primary;
    if (impression) return `Working impression: ${impression}`;
    return 'Scenario complete — review debrief coaching';
  }

  function readChallenge() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function writeChallenge(payload) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {}
  }

  function clearChallenge() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  function challengeFromUrl() {
    const ref = String(params.get('ref') || '').toLowerCase();
    if (ref !== 'challenge') return null;
    const score = Math.max(0, Math.min(100, Math.round(Number(params.get('score')) || 0)));
    if (!Number.isFinite(score) || score <= 0) return null;
    const scenarioId = caseIdFromPage() || normalizeCaseId(params.get('case'));
    const user = String(params.get('user') || '').trim().slice(0, 40);
    return { scenarioId, score, user, createdAt: new Date().toISOString() };
  }

  function ensureStyles() {
    if (document.querySelector('style[data-scenario-scorecard-challenge]')) return;
    const style = document.createElement('style');
    style.dataset.scenarioScorecardChallenge = VERSION;
    style.textContent = `
.sc-challenge-banner{position:sticky;top:0;z-index:1200;display:flex;gap:12px;align-items:flex-start;justify-content:space-between;padding:12px 14px;background:linear-gradient(135deg,#0b3b2e,#0f2740);border-bottom:2px solid #3ecf8e;color:#e8fff4;box-shadow:0 8px 24px rgba(0,0,0,.35)}
.sc-challenge-banner[hidden]{display:none!important}
.sc-challenge-banner strong{display:block;font-size:1rem;letter-spacing:-.01em}
.sc-challenge-banner p{margin:4px 0 0;color:#b7e7cf;font-size:.86rem;line-height:1.35}
.sc-challenge-banner button{appearance:none;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:#fff;border-radius:999px;padding:8px 12px;font-weight:800;cursor:pointer;white-space:nowrap}
.sc-scorecard{margin-top:12px;padding:14px;border-radius:16px;border:1px solid #3a6f86;background:linear-gradient(160deg,#0a2230,#123248 55%,#0d2a3a);color:#edf7fb;display:grid;gap:12px}
.sc-scorecard-head{display:flex;gap:14px;align-items:center;flex-wrap:wrap}
.sc-score-ring{min-width:92px;height:92px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,#1d5f7a,#0c2a3a);border:3px solid #55c2e8;box-shadow:0 0 0 4px rgba(85,194,232,.15)}
.sc-score-ring strong{font-size:1.55rem;line-height:1;color:#fff}
.sc-score-ring span{font-size:.72rem;color:#9fd3e8;font-weight:800}
.sc-scorecard-head h3{margin:0;font-size:1.2rem;letter-spacing:-.02em}
.sc-scorecard-head .sc-title{display:inline-flex;margin-top:6px;padding:5px 10px;border-radius:999px;font-size:.78rem;font-weight:900;letter-spacing:.02em}
.sc-title.elite{background:#1f6b45;color:#c9ffe4}
.sc-title.strong{background:#1d5f7a;color:#ccefff}
.sc-title.ok{background:#6b531d;color:#ffe9b0}
.sc-title.remediate{background:#7a1d1d;color:#ffd0d0}
.sc-scorecard-head p{margin:8px 0 0;color:#b7cdd7;font-size:.84rem;line-height:1.4}
.sc-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.sc-stats article{padding:10px;border-radius:12px;background:#102836;border:1px solid #2f5568}
.sc-stats small{display:block;font-size:.66rem;font-weight:900;letter-spacing:.08em;color:#8fc7dd;text-transform:uppercase}
.sc-stats strong{display:block;margin-top:4px;font-size:1.05rem;color:#fff}
.sc-compare{padding:12px;border-radius:12px;border:1px solid #3ecf8e;background:rgba(62,207,142,.12)}
.sc-compare.lost{border-color:#f0a060;background:rgba(240,160,96,.12)}
.sc-compare strong{display:block;font-size:1rem}
.sc-compare p{margin:4px 0 0;color:#cfe6d9;font-size:.84rem}
.sc-actions{display:flex;flex-wrap:wrap;gap:8px}
.sc-actions button,.sc-actions a.sc-btn{appearance:none;border:0;border-radius:12px;padding:11px 14px;font-weight:900;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:.9rem}
.sc-btn-primary{background:#2bb673;color:#04160e}
.sc-btn-secondary{background:#1d4f66;color:#e8f7ff;border:1px solid #3a7b96!important}
.sc-btn-ghost{background:transparent;color:#d5ebf4;border:1px solid #3a6f86!important}
.sc-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:1400;padding:10px 14px;border-radius:999px;background:#0b1c28;color:#fff;border:1px solid #3a6f86;font-weight:800;font-size:.86rem;box-shadow:0 10px 30px rgba(0,0,0,.35);opacity:0;pointer-events:none;transition:opacity .18s ease}
.sc-toast.show{opacity:1}
.sc-print-card{position:fixed;left:-9999px;top:0;width:360px;padding:18px;border-radius:18px;background:#0b2230;color:#fff;border:1px solid #3a6f86;font-family:system-ui,sans-serif}
.sc-print-card h4{margin:0 0 4px;font-size:1.1rem}
.sc-print-card .big{font-size:2.2rem;margin:8px 0;font-weight:950}
@media(max-width:720px){
  .sc-stats{grid-template-columns:1fr}
  .sc-challenge-banner{align-items:stretch;flex-direction:column}
  .sc-actions button,.sc-actions a.sc-btn{width:100%}
}`;
    document.head.appendChild(style);
  }

  function toast(message) {
    let el = $('scChallengeToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'scChallengeToast';
      el.className = 'sc-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function buildShareUrl(payload) {
    const id = encodeURIComponent(payload.scenarioId || 'horse_crush');
    const score = encodeURIComponent(String(payload.score));
    const user = payload.user ? `&user=${encodeURIComponent(payload.user)}` : '';
    return `https://emscodesim.com/sim/${id}?ref=challenge&score=${score}${user}`;
  }

  function shareText(payload) {
    const label = SCENARIO_LABELS[payload.scenarioId] || payload.scenarioId;
    const title = clinicalTitle(payload.score).title;
    const name = payload.user ? `${payload.user} scored` : 'I scored';
    return `EMSCodeSim Challenge\n${name} ${payload.score}% (${title}) on ${label}.\nCan you beat me?\n${buildShareUrl(payload)}`;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (_) {
        return false;
      }
    }
  }

  async function challengeShare(payload) {
    const url = buildShareUrl(payload);
    const text = shareText(payload);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'EMSCodeSim Peer Challenge',
          text,
          url
        });
        toast('Challenge shared');
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    const ok = await copyText(url);
    toast(ok ? 'Challenge link copied' : 'Could not copy link — long-press to copy');
  }

  function buildPrintCard(payload) {
    let card = $('scPrintCard');
    if (!card) {
      card = document.createElement('aside');
      card.id = 'scPrintCard';
      card.className = 'sc-print-card';
      card.setAttribute('aria-hidden', 'true');
      document.body.appendChild(card);
    }
    const title = clinicalTitle(payload.score);
    const label = SCENARIO_LABELS[payload.scenarioId] || payload.scenarioId;
    card.innerHTML = `
      <small>EMSCodeSim Scenario Scorecard</small>
      <h4>${escapeHtml(label)}</h4>
      <div class="big">${payload.score}%</div>
      <div>${escapeHtml(title.title)}</div>
      <p style="margin:10px 0 0;color:#b7cdd7;font-size:.85rem;line-height:1.4">
        Time ${escapeHtml(payload.timeLabel || '—')}<br>
        Critical interventions ${escapeHtml(payload.interventions || '—')}<br>
        ${escapeHtml(payload.outcome || '')}
      </p>
      <p style="margin:12px 0 0;font-size:.75rem;color:#8fc7dd">Challenge a classmate → emscodesim.com/sim</p>`;
    return card;
  }

  async function copyScorecardImage(payload) {
    const card = buildPrintCard(payload);
    const htmlDoc = `<!doctype html><html><head><meta charset="utf-8"><title>EMSCodeSim Scorecard</title></head><body style="margin:0;background:#07131c;padding:24px;display:flex;justify-content:center">${card.outerHTML}</body></html>`;
    try {
      const blob = new Blob([htmlDoc], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emscodesim-scorecard-${payload.scenarioId || 'scenario'}-${payload.score}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (_) {}
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const blob = new Blob([htmlDoc], { type: 'text/html' });
        const textBlob = new Blob([shareText(payload)], { type: 'text/plain' });
        await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob })]);
        toast('Scorecard downloaded + copied');
        return;
      }
    } catch (_) {}
    const ok = await copyText(shareText(payload));
    toast(ok ? 'Score summary copied' : 'Copy failed');
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  function collectPayload(hostScore) {
    const record = (() => {
      try {
        return window.EMSCodeSimScenarioSession?.sync?.() || window.EMSCodeSimPatientRecord?.active?.() || null;
      } catch (_) {
        return null;
      }
    })();
    const scenarioId = caseIdFromPage() || normalizeCaseId(record?.scenarioId) || 'horse_crush';
    let score = Number(hostScore);
    if (!Number.isFinite(score)) {
      const satisfaction = window.EMSCodeSimPatientSatisfactionGrade?.model?.();
      if (satisfaction && Number.isFinite(satisfaction.score)) score = satisfaction.score;
      else if (Number.isFinite(record?.documentation?.scenarioGrade)) score = record.documentation.scenarioGrade;
      else {
        const debrief = window.EMSCodeSimDebriefEngine?.grade?.(record);
        score = Number(debrief?.score);
      }
    }
    score = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
    const interventions = interventionStats(record);
    const seconds = elapsedSeconds(record);
    return {
      scenarioId,
      score,
      title: clinicalTitle(score),
      timeLabel: formatTime(seconds),
      interventions: interventions.label,
      interventionCorrect: interventions.correct,
      interventionTotal: interventions.total,
      outcome: outcomeText(record, scenarioId),
      user: ''
    };
  }

  function comparisonMarkup(payload, challenge) {
    if (!challenge || !Number.isFinite(challenge.score)) return '';
    const won = payload.score > challenge.score;
    const tie = payload.score === challenge.score;
    const peerName = challenge.user ? escapeHtml(challenge.user) : 'Peer';
    const result = tie ? 'Tie — rematch?' : (won ? 'You Won!' : 'Try Again!');
    const cls = won || tie ? '' : ' lost';
    return `<div class="sc-compare${cls}" role="status">
      <strong>${result}</strong>
      <p>You scored <b>${payload.score}%</b> vs. ${peerName}'s <b>${challenge.score}%</b>.</p>
    </div>`;
  }

  function renderScorecard(host, payload) {
    if (!host) return;
    let card = host.querySelector('#scPeerScorecard');
    if (!card) {
      card = document.createElement('section');
      card.id = 'scPeerScorecard';
      card.className = 'sc-scorecard';
      card.setAttribute('aria-label', 'Scenario scorecard and peer challenge');
      host.appendChild(card);
    }
    const challenge = readChallenge();
    const sameScenario = !challenge?.scenarioId || challenge.scenarioId === payload.scenarioId;
    card.innerHTML = `
      <div class="sc-scorecard-head">
        <div class="sc-score-ring" aria-label="Overall performance score ${payload.score} percent">
          <div><strong>${payload.score}</strong><span>%</span></div>
        </div>
        <div>
          <h3>Scenario Scorecard</h3>
          <span class="sc-title ${payload.title.tone}">${escapeHtml(payload.title.title)}</span>
          <p>${escapeHtml(SCENARIO_LABELS[payload.scenarioId] || payload.scenarioId)} · Share your result and challenge a classmate.</p>
        </div>
      </div>
      <div class="sc-stats">
        <article><small>Time</small><strong>${escapeHtml(payload.timeLabel)}</strong></article>
        <article><small>Critical interventions</small><strong>${escapeHtml(payload.interventions)}</strong></article>
        <article><small>Patient outcome</small><strong>${escapeHtml(payload.outcome)}</strong></article>
      </div>
      ${sameScenario ? comparisonMarkup(payload, challenge) : ''}
      <div class="sc-actions">
        <button type="button" class="sc-btn-primary" data-sc-challenge>Challenge a Classmate / Share Score</button>
        <button type="button" class="sc-btn-secondary" data-sc-copy-card>Download / Copy Scorecard</button>
        <a class="sc-btn sc-btn-ghost" href="/vitals/scenario-launcher.html">Try another scenario</a>
      </div>`;

    card.querySelector('[data-sc-challenge]')?.addEventListener('click', async () => {
      let user = '';
      try {
        user = String(window.prompt('Optional: name to show on the challenge (or leave blank)', '') || '').trim().slice(0, 40);
      } catch (_) {}
      const sharePayload = { ...payload, user };
      await challengeShare(sharePayload);
    });
    card.querySelector('[data-sc-copy-card]')?.addEventListener('click', () => copyScorecardImage(payload));
  }

  function ensureBanner(challenge) {
    if (!challenge) return;
    let banner = $('scChallengeBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'scChallengeBanner';
      banner.className = 'sc-challenge-banner';
      banner.setAttribute('role', 'status');
      const host = document.querySelector('main') || document.body;
      host.prepend(banner);
    }
    const who = challenge.user ? escapeHtml(challenge.user) : 'A peer';
    banner.innerHTML = `
      <div>
        <strong>🏆 Challenge Mode</strong>
        <p>${who} scored <b>${challenge.score}%</b> on this scenario. Can you beat them?</p>
      </div>
      <button type="button" data-sc-dismiss>Dismiss</button>`;
    banner.hidden = false;
    banner.querySelector('[data-sc-dismiss]')?.addEventListener('click', () => {
      banner.hidden = true;
    });
  }

  function mountHorseScorecard() {
    const workspace = $('horseGradeWorkspace');
    if (!workspace || workspace.hidden) return;
    const actions = workspace.querySelector('.horse-grade-actions');
    const host = actions?.parentElement || workspace.querySelector('.horse-grade-feedback') || workspace;
    const scoreText = $('horseGradeScore')?.textContent || '';
    const parsed = Number(String(scoreText).match(/(\d+)/)?.[1]);
    const payload = collectPayload(Number.isFinite(parsed) ? parsed : undefined);
    renderScorecard(host, payload);
  }

  function mountDebriefScorecard() {
    const overall = $('overallScore');
    const report = $('reportContent');
    if (!report || report.hidden || !overall) return;
    const score = Number(String(overall.textContent || '').replace(/[^\d.]/g, ''));
    if (!Number.isFinite(score)) return;
    let host = $('scDebriefScorecardHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'scDebriefScorecardHost';
      const overallCard = report.querySelector('.overall-card');
      if (overallCard) overallCard.insertAdjacentElement('afterend', host);
      else report.prepend(host);
    }
    renderScorecard(host, collectPayload(score));
  }

  function bootChallengeLanding() {
    const fromUrl = challengeFromUrl();
    if (fromUrl) {
      writeChallenge(fromUrl);
      // Strip challenge params from the address bar without losing case/training
      try {
        const url = new URL(location.href);
        url.searchParams.delete('ref');
        url.searchParams.delete('score');
        url.searchParams.delete('user');
        if (!url.searchParams.get('case') && fromUrl.scenarioId) {
          url.searchParams.set('case', fromUrl.scenarioId);
        }
        history.replaceState({}, '', url.pathname + url.search + url.hash);
      } catch (_) {}
    }
    const challenge = readChallenge();
    const currentCase = caseIdFromPage();
    if (challenge && (!challenge.scenarioId || !currentCase || challenge.scenarioId === currentCase)) {
      ensureBanner(challenge);
    }
  }

  function start() {
    ensureStyles();
    bootChallengeLanding();

    const scheduleHorse = () => {
      clearTimeout(scheduleHorse._t);
      scheduleHorse._t = setTimeout(mountHorseScorecard, 120);
    };
    const scheduleDebrief = () => {
      clearTimeout(scheduleDebrief._t);
      scheduleDebrief._t = setTimeout(mountDebriefScorecard, 120);
    };

    if ($('horseGradeWorkspace')) {
      const observer = new MutationObserver(scheduleHorse);
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
      document.addEventListener('click', (e) => {
        if (e.target.closest?.('#openHorseCallGrade,.handoff-grade-button,[data-grade],#gradeScenarioFromPatient,#completeScenarioFromPatient,#gradeScenarioQuick,#horseGradeEndScenario')) {
          scheduleHorse();
        }
      }, true);
      window.addEventListener('emscodesim:scenario-updated', scheduleHorse);
      scheduleHorse();
    }

    if ($('reportContent') || $('overallScore')) {
      const observer = new MutationObserver(scheduleDebrief);
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
      scheduleDebrief();
    }

    window.EMSCodeSimScorecardChallenge = Object.freeze({
      version: VERSION,
      clinicalTitle,
      buildShareUrl,
      collectPayload,
      readChallenge,
      clearChallenge
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
