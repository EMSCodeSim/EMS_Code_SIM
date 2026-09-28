/**
 * Patient Simulator V2 — UI application controller
 */
(function () {
  'use strict';

  const STAGES = [
    'Dispatch', 'Enroute', 'Scene', 'Patient Contact', 'Assessment', 'Treatment',
    'Reassessment', 'Transport', 'Handoff', 'Documentation', 'Debrief'
  ];

  const MONITOR_CHANNELS = [
    { id: 'hr', label: 'HR', unit: 'bpm' },
    { id: 'spo2', label: 'SpO₂', unit: '%' },
    { id: 'rr', label: 'RR', unit: '/min' },
    { id: 'bp', label: 'BP', unit: 'mmHg' },
    { id: 'etco2', label: 'EtCO₂', unit: 'mmHg' },
    { id: 'temp', label: 'Temp', unit: '°F' },
    { id: 'gcs', label: 'GCS', unit: '' }
  ];

  const PCR_FIELDS = [
    ['patientAge', 'Age'],
    ['patientSex', 'Sex'],
    ['chiefComplaint', 'Chief complaint'],
    ['history', 'History'],
    ['allergies', 'Allergies'],
    ['medications', 'Medications'],
    ['assessmentFindings', 'Assessment findings'],
    ['vitals', 'Vital signs'],
    ['treatments', 'Treatments'],
    ['responseToTreatment', 'Response to treatment'],
    ['reassessments', 'Reassessments'],
    ['transportPriority', 'Transport priority'],
    ['destination', 'Destination'],
    ['narrative', 'Narrative']
  ];

  let session = null;
  let currentVideoUrl = '';
  let reassessMode = false;
  let activeDebrief = null;

  const $ = (id) => document.getElementById(id);

  function formatClock(seconds) {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  function openTab(name) {
    document.querySelectorAll('#psv2ToolTabs button').forEach(btn => {
      btn.setAttribute('aria-selected', String(btn.dataset.tab === name));
    });
    document.querySelectorAll('.psv2-tab-panel').forEach(panel => {
      panel.hidden = panel.dataset.panel !== name;
    });
    document.querySelectorAll('#psv2ActionBar button').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.action === name || (name === 'talk' && btn.dataset.action === 'talk')));
    });
  }

  function renderWorkflow(stage) {
    const nav = $('psv2Workflow');
    const idx = STAGES.indexOf(stage);
    nav.innerHTML = STAGES.map((label, i) => {
      const current = label === stage;
      const done = i < idx;
      return `<button type="button" data-stage="${label}" ${current ? 'aria-current="step"' : ''} class="${done ? 'done' : ''}">${i + 1}. ${label}</button>`;
    }).join('');
  }

  function renderMonitor() {
    if (!session) return;
    const channels = session.getMonitorChannels();
    const vitals = session.patient.getVitals();
    const values = {
      hr: channels.hr ? String(vitals.heartRate) : '—',
      spo2: channels.spo2 ? String(vitals.spo2) : '—',
      rr: channels.rr ? String(vitals.respiratoryRate) : '—',
      bp: channels.bp ? `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}` : '—',
      etco2: channels.etco2 ? String(vitals.etco2) : '—',
      temp: channels.temp ? String(vitals.temperature) : '—',
      gcs: channels.gcs ? String(vitals.gcs) : '—'
    };

    $('psv2Monitor').innerHTML = MONITOR_CHANNELS.map(ch => `
      <div class="psv2-vital">
        <div class="label"><span>${ch.label}</span><span>${ch.unit}</span></div>
        <div class="value ${channels[ch.id] ? '' : 'off'}">${values[ch.id]}</div>
      </div>
    `).join('');

    $('psv2MonitorActions').innerHTML = [
      ...MONITOR_CHANNELS.map(ch =>
        `<button type="button" class="psv2-chip ${channels[ch.id] ? 'on' : ''}" data-monitor="${ch.id}">${channels[ch.id] ? '✓ ' : ''}Enable ${ch.label}</button>`
      ),
      `<button type="button" class="psv2-chip" data-monitor="ecg">${channels.ecg ? '✓ ' : ''}ECG</button>`,
      `<button type="button" class="psv2-chip" data-monitor="capno">${channels.capno ? '✓ ' : ''}Capno</button>`
    ].join('');
  }

  function updateVideo() {
    if (!session) return;
    const videoCfg = session.getVideo();
    $('psv2VideoStateLabel').textContent = videoCfg.key;
    $('psv2VideoEyebrow').textContent = videoCfg.eyebrow || 'SCENE VIEW — LIVE PATIENT';
    $('psv2VideoCopy').textContent = videoCfg.copy || videoCfg.label || '';
    const el = $('psv2Video');
    if (videoCfg.url && videoCfg.url !== currentVideoUrl) {
      currentVideoUrl = videoCfg.url;
      el.src = videoCfg.url;
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      const play = el.play();
      if (play && typeof play.catch === 'function') play.catch(() => { /* autoplay blocked */ });
    }
  }

  function renderTimeline() {
    if (!session) return;
    const rows = session.timeline.toDisplayRows();
    $('psv2Timeline').innerHTML = rows.map(r => `
      <div class="psv2-timeline-row">
        <span class="t">${r.clock}</span>
        <span class="a"><strong>${escapeHtml(r.action)}</strong>${r.result ? ` — ${escapeHtml(String(r.result).slice(0, 140))}` : ''}</span>
      </div>
    `).join('') || '<p style="color:var(--psv2-muted)">No events yet.</p>';
  }

  function renderChat() {
    if (!session) return;
    const log = $('psv2ChatLog');
    const history = session.conversation.getHistory();
    log.innerHTML = history.map(h => `
      <div class="psv2-msg ${h.role === 'learner' ? 'learner' : 'patient'}">
        <span class="who">${h.role === 'learner' ? 'You' : 'Patient'}</span>
        ${escapeHtml(h.text)}
      </div>
    `).join('');
    log.scrollTop = log.scrollHeight;
  }

  function renderAssessments() {
    if (!session) return;
    const items = session.assessment.listAvailable();
    $('psv2AssessGrid').innerHTML = items.map(item =>
      `<button type="button" class="psv2-list-btn" data-assess="${item.id}">${escapeHtml(item.label)}</button>`
    ).join('');
  }

  function renderTreatments() {
    if (!session) return;
    const cats = session.treatment.listCategories();
    $('psv2TreatPanel').innerHTML = cats.map(cat => `
      <section style="margin-bottom:14px">
        <h3 style="margin:0 0 8px;font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;color:var(--psv2-cyan)">${escapeHtml(cat.label)}</h3>
        <div class="psv2-assess-grid">
          ${cat.items.map(item => `
            <button type="button" class="psv2-list-btn" data-treat="${item.id}" data-category="${cat.id}">
              ${escapeHtml(item.name)}
              <small style="display:block;color:var(--psv2-muted);font-weight:500;margin-top:4px">${escapeHtml([item.defaultDose, item.defaultRoute, item.defaultDevice].filter(Boolean).join(' · '))}</small>
            </button>
          `).join('')}
        </div>
      </section>
    `).join('');
  }

  function renderTransportDestinations() {
    const dests = session?.scenario?.transportRules?.destinations || [];
    $('psv2TransportDest').innerHTML = dests.map(d =>
      `<option value="${escapeHtml(d.label)}">${escapeHtml(d.label)} (~${d.minutes} min)</option>`
    ).join('');
  }

  function renderPcrFields() {
    const draft = session ? session.pcr.getDraft() : {};
    $('psv2PcrFields').innerHTML = PCR_FIELDS.map(([key, label]) => {
      const isLong = key === 'narrative' || key === 'assessmentFindings' || key === 'treatments' || key === 'reassessments';
      if (isLong) {
        return `<div class="psv2-field"><label for="pcr_${key}">${label}</label><textarea id="pcr_${key}" data-pcr="${key}" rows="3">${escapeHtml(draft[key] || '')}</textarea></div>`;
      }
      return `<div class="psv2-field"><label for="pcr_${key}">${label}</label><input id="pcr_${key}" data-pcr="${key}" value="${escapeHtml(draft[key] || '')}"></div>`;
    }).join('');
  }

  function renderGrade(grade) {
    if (!grade) return;
    const panel = $('psv2GradePanel');
    panel.innerHTML = `
      <div style="margin-bottom:12px">
        <div style="font-family:var(--psv2-display);font-size:2rem;color:var(--psv2-cyan)">${grade.percent}%</div>
        <div style="color:var(--psv2-muted)">Deterministic domain score · ${grade.totalScore}/${grade.totalMax}</div>
      </div>
      <div class="psv2-grade-domains">
        ${Object.values(grade.domains).map(d => `
          <div class="psv2-grade-row">
            <strong>${escapeHtml(d.label)}</strong>
            <span>${d.score}/${d.max}</span>
            <div class="bar"><span style="width:${d.percent}%"></span></div>
          </div>
        `).join('')}
      </div>
      <div class="psv2-feedback-list">
        ${(grade.timelineFeedback || []).map(f => `
          <article>
            <div class="tag ${f.type === 'opportunity' ? 'opp' : ''}">${f.type === 'strong' ? 'Strong action' : 'Opportunity'} · ${escapeHtml(f.clock || '')}</div>
            <p style="margin:6px 0 0">${escapeHtml(f.text)}</p>
          </article>
        `).join('')}
        ${(grade.strengths || []).map(s => `<article><div class="tag">Strong</div><p style="margin:6px 0 0">${escapeHtml(s)}</p></article>`).join('')}
        ${(grade.opportunities || []).map(s => `<article><div class="tag opp">Opportunity</div><p style="margin:6px 0 0">${escapeHtml(s)}</p></article>`).join('')}
        ${(grade.missedCritical || []).map(m => `<article><div class="tag opp">Missed critical</div><p style="margin:6px 0 0">${escapeHtml(m.label)}${m.why ? ` — ${escapeHtml(m.why)}` : ''}</p></article>`).join('')}
      </div>
      <button class="psv2-btn primary" type="button" id="psv2GradeBtn" style="margin-top:12px">Refresh grade</button>
    `;
    $('psv2GradeBtn')?.addEventListener('click', () => {
      const g = session.runGrading();
      renderGrade(g);
      renderTimeline();
    });
  }

  function refreshAll() {
    if (!session) return;
    const snap = session.getSnapshot();
    $('psv2Clock').textContent = formatClock(snap.elapsed);
    renderWorkflow(snap.stage);
    renderMonitor();
    updateVideo();
    renderTimeline();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function collectPcrFromForm() {
    const fields = {};
    document.querySelectorAll('[data-pcr]').forEach(el => {
      fields[el.dataset.pcr] = el.value;
    });
    return fields;
  }

  function partnerAssist() {
    if (!session) return;
    session.timeline.push({
      timestamp: session.patient.getFullState().elapsedTime,
      eventType: 'partner',
      action: 'Partner assist requested',
      result: 'Partner available for equipment, vitals, or stretcher.',
      clinicalStateBefore: session.patient.snapshotClinical(),
      clinicalStateAfter: session.patient.snapshotClinical(),
      metadata: {}
    });
    const finding = $('psv2AssessFinding');
    finding.hidden = false;
    finding.textContent = 'Partner: Ready. Tell me what you need — monitor, neb setup, or stretcher.';
    openTab('assess');
    renderTimeline();
  }

  function startSimulation() {
    if (session) {
      session.destroy();
      session = null;
    }
    currentVideoUrl = '';
    activeDebrief = null;
    reassessMode = false;
    $('psv2ReassessToggle').checked = false;

    session = window.PSV2.Session.startNewSession('adult-asthma');
    $('psv2DispatchText').textContent = session.scenario.dispatch.text;
    $('psv2StartOverlay').hidden = true;

    renderAssessments();
    renderTreatments();
    renderTransportDestinations();
    renderPcrFields();
    renderChat();
    refreshAll();

    // Natural call flow helpers on start
    session.startClock(1000, 1);
    openTab('talk');

    session.subscribe((evt) => {
      if (evt.type === 'tick' || evt.type === 'physiology' || evt.type === 'stage') {
        $('psv2Clock').textContent = formatClock(evt.session.elapsed);
        renderWorkflow(evt.session.stage);
        renderMonitor();
        updateVideo();
      }
      if (evt.type === 'assessment' || evt.type === 'treatment' || evt.type === 'conversation' || evt.type === 'transport' || evt.type === 'handoff' || evt.type === 'pcr') {
        renderTimeline();
      }
      if (evt.type === 'conversation') renderChat();
      if (evt.type === 'monitor') renderMonitor();
    });
  }

  function wireEvents() {
    $('psv2StartBtn').addEventListener('click', () => {
      startSimulation();
      // Learner advances dispatch → enroute → scene via workflow or naturally
      session.markEnroute();
      session.advanceTime(40);
      session.markArrived();
      session.advanceTime(15);
      session.markPatientContact();
      refreshAll();
    });

    $('psv2PauseBtn').addEventListener('click', () => {
      if (!session) return;
      if (session.paused) {
        session.resume();
        $('psv2PauseBtn').textContent = 'Pause';
      } else {
        session.pause();
        $('psv2PauseBtn').textContent = 'Resume';
      }
    });

    $('psv2RestartBtn').addEventListener('click', () => {
      if (!confirm('Restart scenario with a completely clean session?')) return;
      startSimulation();
      session.markEnroute();
      session.advanceTime(40);
      session.markArrived();
      session.advanceTime(15);
      session.markPatientContact();
      refreshAll();
      $('psv2ChatLog').innerHTML = '';
      $('psv2AssessFinding').hidden = true;
      $('psv2TreatNote').hidden = true;
      $('psv2PcrResult').hidden = true;
      $('psv2HandoffReply').hidden = true;
      $('psv2GradePanel').innerHTML = '<p style="color:var(--psv2-muted)">Complete the call, then generate grading.</p><button class="psv2-btn primary" type="button" id="psv2GradeBtn">Generate grade</button>';
      $('psv2GradeBtn')?.addEventListener('click', () => renderGrade(session.runGrading()));
      $('psv2DebriefActive').hidden = true;
      $('psv2DebriefStart').hidden = false;
    });

    $('psv2EndBtn').addEventListener('click', () => {
      if (!session) return;
      session.endScenario();
      renderGrade(session.gradeResult);
      openTab('grade');
      refreshAll();
    });

    $('psv2Workflow').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-stage]');
      if (!btn || !session) return;
      // Soft navigation — does not force rigid wizard, but records stage intent
      session.setStage(btn.dataset.stage);
      refreshAll();
    });

    document.querySelectorAll('#psv2ToolTabs button').forEach(btn => {
      btn.addEventListener('click', () => openTab(btn.dataset.tab));
    });

    $('psv2ActionBar').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn || !session) return;
      const action = btn.dataset.action;
      if (action === 'talk') openTab('talk');
      if (action === 'assess') openTab('assess');
      if (action === 'vitals') {
        openTab('assess');
        // Focus monitor by enabling common channels prompt
        document.querySelector('.psv2-col-monitor')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      if (action === 'treat' || action === 'procedures' || action === 'equipment') {
        openTab('treat');
      }
      if (action === 'partner') partnerAssist();
      if (action === 'transport') openTab('transport');
    });

    $('psv2ChatForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!session) return;
      const input = $('psv2ChatInput');
      const text = input.value.trim();
      if (!text) return;
      input.value = '';

      // Local fact engine first (source of truth)
      let aiPhrasing = null;
      try {
        const local = session.conversation.answerFromFacts(text);
        if (local.matchedFact) {
          const res = await fetch('/api/patient-simulator-v2-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scenarioId: 'adult-asthma',
              question: text,
              factKey: local.matchedFact,
              factValue: local.factValue,
              allowedReplyFallback: local.reply,
              clinicalSpeech: session.patient.snapshotClinical().speech
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.reply && data.source === 'ai') {
              const safe = session.conversation.sanitizeAiReply(data.reply, [local.matchedFact]);
              if (safe) aiPhrasing = { factKey: local.matchedFact, reply: safe };
            }
          }
        }
      } catch (_) {
        /* offline / no AI — local engine handles it */
      }

      session.talkToPatient(text, aiPhrasing ? { aiPhrasing } : {});
      renderChat();
      renderTimeline();
      refreshAll();
    });

    $('psv2AssessGrid').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-assess]');
      if (!btn || !session) return;
      const id = btn.dataset.assess;
      const options = {};
      if (reassessMode || $('psv2ReassessToggle').checked) {
        options.reassessment = true;
        options.isReassessment = true;
      }
      if (id === 'lung_sounds') {
        options.location = 'bilateral posterior';
      }
      const result = session.performAssessment(id, options);
      const box = $('psv2AssessFinding');
      box.hidden = false;
      box.innerHTML = `<strong>${escapeHtml(result.assessmentId)}</strong><br>${escapeHtml(result.finding)}`;
      if (result.audio) {
        try {
          const audio = new Audio(result.audio);
          audio.volume = 0.7;
          audio.play().catch(() => {});
        } catch (_) { /* ignore */ }
      }
      renderTimeline();
      refreshAll();
    });

    $('psv2ReassessBtn').addEventListener('click', () => {
      reassessMode = true;
      $('psv2ReassessToggle').checked = true;
      $('psv2AssessFinding').hidden = false;
      $('psv2AssessFinding').textContent = 'Reassessment mode on — next assessments are tagged as reassessments.';
    });

    $('psv2MonitorActions').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-monitor]');
      if (!btn || !session) return;
      session.enableMonitor(btn.dataset.monitor);
      renderMonitor();
      renderTimeline();
    });

    $('psv2TreatPanel').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-treat]');
      if (!btn || !session) return;
      const item = session.treatment.findItem(btn.dataset.treat);
      if (!item) return;
      const result = session.administerTreatment({
        id: item.id,
        medication: item.medication || item.name,
        dose: item.defaultDose,
        route: item.defaultRoute,
        device: item.defaultDevice,
        category: item.category || btn.dataset.category
      });
      const note = $('psv2TreatNote');
      note.hidden = false;
      note.textContent = `${result.record.name || result.record.medication} recorded (${[result.record.dose, result.record.route, result.record.device].filter(Boolean).join(', ')}). Continue the call — no instant score shown.`;
      renderTimeline();
      updateVideo();
      refreshAll();
    });

    $('psv2TransportSubmit').addEventListener('click', () => {
      if (!session) return;
      session.decideTransport({
        action: $('psv2TransportAction').value,
        priority: $('psv2TransportPriority').value,
        destination: $('psv2TransportDest').value,
        resources: $('psv2TransportAction').value === 'als_intercept' ? 'ALS intercept' : null
      });
      renderTimeline();
      refreshAll();
      openTab('handoff');
    });

    $('psv2HandoffSubmit').addEventListener('click', async () => {
      if (!session) return;
      const report = $('psv2HandoffReport').value.trim();
      session.submitHandoff(report);
      const reply = $('psv2HandoffReply');
      reply.hidden = false;
      reply.textContent = 'Receiving: Copy, Medic. We\'ll be ready for you. Continue care and complete your PCR after arrival.';
      try {
        const res = await fetch('/api/patient-simulator-v2-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenarioId: 'adult-asthma',
            mode: 'hospital',
            report
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.reply) reply.textContent = data.reply;
        }
      } catch (_) { /* local fallback already shown */ }
      renderTimeline();
      refreshAll();
      openTab('pcr');
    });

    $('psv2OcrIngest').addEventListener('click', () => {
      if (!session) return;
      const raw = $('psv2OcrInput').value;
      session.pcr.ingestOcrRaw(raw, { source: 'manual_paste' });
      $('psv2PcrResult').hidden = false;
      $('psv2PcrResult').textContent = 'OCR draft loaded. Confirm/correct the text before it can affect grading.';
    });

    $('psv2OcrConfirm').addEventListener('click', () => {
      if (!session) return;
      try {
        if (!session.pcr.getOcrPending()) {
          session.pcr.ingestOcrRaw($('psv2OcrInput').value, { source: 'manual_paste' });
        }
        session.pcr.confirmExtractedText($('psv2OcrInput').value, { narrative: $('psv2OcrInput').value });
        renderPcrFields();
        $('psv2PcrResult').hidden = false;
        $('psv2PcrResult').textContent = 'OCR text confirmed by learner. Documentation can now be graded against the timeline.';
      } catch (err) {
        $('psv2PcrResult').hidden = false;
        $('psv2PcrResult').textContent = err.message || 'Confirm failed.';
      }
    });

    $('psv2PcrSubmit').addEventListener('click', () => {
      if (!session) return;
      const fields = collectPcrFromForm();
      const submitted = session.submitPcr(fields);
      const box = $('psv2PcrResult');
      box.hidden = false;
      const d = submitted.comparison.discrepancies;
      box.innerHTML = d.length
        ? `<strong>PCR submitted.</strong> Discrepancies:<br>${d.map(escapeHtml).join('<br>')}`
        : '<strong>PCR submitted.</strong> No major discrepancies detected vs timeline.';
      renderTimeline();
      refreshAll();
      openTab('grade');
    });

    $('psv2GradeBtn')?.addEventListener('click', () => {
      if (!session) return;
      renderGrade(session.runGrading());
      renderTimeline();
    });

    $('psv2DebriefStart').addEventListener('click', () => {
      if (!session) return;
      if (!session.gradeResult) session.runGrading();
      activeDebrief = session.startDebrief();
      $('psv2DebriefStart').hidden = true;
      $('psv2DebriefActive').hidden = false;
      const q = activeDebrief.nextQuestion();
      if (q.done) {
        $('psv2DebriefPrompt').textContent = q.summary.message;
      } else {
        $('psv2DebriefPrompt').textContent = q.question.prompt;
      }
      refreshAll();
    });

    $('psv2DebriefForm').addEventListener('submit', (e) => {
      e.preventDefault();
      if (!activeDebrief) return;
      const answer = $('psv2DebriefAnswer').value.trim();
      const result = activeDebrief.evaluateAnswer(answer);
      $('psv2DebriefAnswer').value = '';
      const reply = $('psv2DebriefReply');
      reply.hidden = false;
      reply.innerHTML = `${escapeHtml(result.evaluation.instructorReply)}<br><small style="color:var(--psv2-muted)">Grade unchanged: ${result.evaluation.authoritativePercent}%</small>`;
      if (result.next.done) {
        $('psv2DebriefPrompt').textContent = result.next.summary.message;
        $('psv2DebriefForm').hidden = true;
      } else {
        $('psv2DebriefPrompt').textContent = result.next.question.prompt;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    wireEvents();
    renderWorkflow('Dispatch');
    // Prebuild empty monitor
    $('psv2Monitor').innerHTML = MONITOR_CHANNELS.map(ch => `
      <div class="psv2-vital">
        <div class="label"><span>${ch.label}</span><span>${ch.unit}</span></div>
        <div class="value off">—</div>
      </div>
    `).join('');
  });
})();
