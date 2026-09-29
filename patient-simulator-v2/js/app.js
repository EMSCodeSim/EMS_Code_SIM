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
  let activeSceneTarget = 'environment';
  let selectedRole = 'lead_emt';
  const crewEvents = [];
  const crewTaskTimers = new Set();
  const crewAwareness = { lastEscalationAt: -999, anticipated: new Set() };
  let activeSkillTask = null;
  let bpMarks = { systolic:null, diastolic:null, lastPressure:0 };
  let pulseCount = 0;
  let pulseTimer = null;
  let pulseRemaining = 0;
  let genericSkillStep = 0;
  const roleKnowledge = {};
  const closedLoopTasks = [];

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

  function renderMonitorValues() {
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

    const root = $('psv2Monitor');
    const needsRebuild = !root.querySelector('[data-vital]');
    if (needsRebuild) {
      root.innerHTML = MONITOR_CHANNELS.map(ch => `
        <div class="psv2-vital" data-vital="${ch.id}">
          <div class="label"><span>${ch.label}</span><span>${ch.unit}</span></div>
          <div class="value ${channels[ch.id] ? '' : 'off'}">${values[ch.id]}</div>
        </div>
      `).join('');
      return;
    }

    MONITOR_CHANNELS.forEach(ch => {
      const card = root.querySelector(`[data-vital="${ch.id}"] .value`);
      if (!card) return;
      card.textContent = values[ch.id];
      card.classList.toggle('off', !channels[ch.id]);
    });
  }

  function renderMonitorActions() {
    if (!session) return;
    const channels = session.getMonitorChannels();
    const signature = JSON.stringify(channels);
    const host = $('psv2MonitorActions');
    if (host.dataset.signature === signature) return;
    host.dataset.signature = signature;
    host.innerHTML = [
      ...MONITOR_CHANNELS.map(ch =>
        `<button type="button" class="psv2-chip ${channels[ch.id] ? 'on' : ''}" data-monitor="${ch.id}">${channels[ch.id] ? '✓ ' : ''}Enable ${ch.label}</button>`
      ),
      `<button type="button" class="psv2-chip ${channels.ecg ? 'on' : ''}" data-monitor="ecg">${channels.ecg ? '✓ ' : ''}ECG</button>`,
      `<button type="button" class="psv2-chip ${channels.capno ? 'on' : ''}" data-monitor="capno">${channels.capno ? '✓ ' : ''}Capno</button>`
    ].join('');
  }

  function renderMonitor() {
    renderMonitorValues();
    renderMonitorActions();
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



  function renderRoleSelector() {
    const roles = window.PSV2.Scenarios.adultAsthma.crewRoles || {};
    $('psv2RoleCards').innerHTML = Object.entries(roles).map(([id, role]) =>
      '<button type="button" class="psv2-role-card" data-role="' + escapeHtml(id) + '"><strong>' + escapeHtml(role.label) + '</strong><span>' + escapeHtml(role.summary) + '</span></button>'
    ).join('');
    selectRole(selectedRole);
  }

  function selectRole(roleId) {
    const role = window.PSV2.Scenarios.adultAsthma.crewRoles?.[roleId];
    if (!role) return;
    selectedRole = roleId;
    document.querySelectorAll('[data-role]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.role === roleId)));
    $('psv2RoleBrief').hidden = false;
    $('psv2RoleBrief').innerHTML = '<strong>' + escapeHtml(role.label) + '</strong><br>' + escapeHtml(role.summary) + '<br><small>Starting information: ' + escapeHtml(role.startingInformation.join(' ')) + '</small>';
    $('psv2StartBtn').disabled = false;
    $('psv2StartBtn').textContent = 'Start as ' + role.label;
  }


  function appendCrewMessage(roleId, message, kind = 'patient') {
    const role = session?.scenario?.crewRoles?.[roleId];
    if (!role || !$('psv2CrewLog')) return;
    $('psv2CrewLog').insertAdjacentHTML('beforeend','<div class="psv2-msg ' + kind + '"><span class="who">' + escapeHtml(role.label) + '</span>' + escapeHtml(message) + '</div>');
    $('psv2CrewLog').scrollTop = $('psv2CrewLog').scrollHeight;
  }

  function pushCrewEvent(roleId, action, result, metadata = {}) {
    if (!session) return;
    const clinical = session.patient.snapshotClinical();
    session.timeline.push({timestamp:session.patient.getFullState().elapsedTime,eventType:'crew',action,result,clinicalStateBefore:clinical,clinicalStateAfter:clinical,metadata:{roleId,...metadata}});
    renderTimeline();
  }

  function evaluateCrewAwareness() {
    if (!session || selectedRole === 'dispatcher') return;
    const behavior = session.scenario.simulatedCrew?.behavior;
    if (!behavior) return;
    const state = session.patient.getFullState();
    const vitals = session.patient.getVitals();
    const now = state.elapsedTime;
    const severe = vitals.spo2 <= behavior.deterioration.severeSpo2 || vitals.respiratoryRate >= behavior.deterioration.severeRespiratoryRate || Number(state.fatigue || 0) >= behavior.deterioration.severeFatigue;
    if (severe && now - crewAwareness.lastEscalationAt >= behavior.escalationCooldownSec) {
      const roleId = selectedRole === 'emt_partner' ? 'firefighter' : 'emt_partner';
      const template = roleId === 'emt_partner' ? behavior.deterioration.partnerMessage : behavior.deterioration.firefighterMessage;
      const msg = template.replace('{spo2}', String(vitals.spo2)).replace('{rr}', String(vitals.respiratoryRate));
      appendCrewMessage(roleId, msg);
      pushCrewEvent(roleId, 'Crew concern escalated', msg, {type:'escalation'});
      crewAwareness.lastEscalationAt = now;
    }
    behavior.anticipation.forEach(item => {
      if (item.role === selectedRole || crewAwareness.anticipated.has(item.id)) return;
      const shouldSpeak = item.when === 'respiratory_distress'
        ? vitals.respiratoryRate >= 28
        : item.when === 'persistent_hypoxia' ? vitals.spo2 <= 92 && now >= 90 : false;
      if (!shouldSpeak) return;
      crewAwareness.anticipated.add(item.id);
      appendCrewMessage(item.role, item.message);
      pushCrewEvent(item.role, 'Crew anticipated need', item.message, {type:'anticipation',anticipationId:item.id});
    });
  }

  function maybeClarifyCrewMessage(targetId, message) {
    const clarification = session?.scenario?.simulatedCrew?.behavior?.clarification;
    if (!clarification) return false;
    const normalized = message.toLowerCase();
    const vague = clarification.vagueTerms.some(term => normalized.includes(term));
    if (!vague) return false;
    appendCrewMessage(targetId, clarification.response);
    pushCrewEvent(targetId, 'Crew requested clarification', clarification.response, {type:'clarification',original:message});
    return true;
  }



  function resetRoleKnowledge() {
    Object.keys(roleKnowledge).forEach(k=>delete roleKnowledge[k]);
    const roles = session.scenario.crewRoles || {};
    Object.keys(roles).forEach(id=>roleKnowledge[id]=new Map());
    Object.entries(session.scenario.roleKnowledge?.facts || {}).forEach(([factId,fact])=>{
      (fact.initial || []).forEach(roleId=>roleKnowledge[roleId]?.set(factId,{value:fact.label,source:fact.source||'initial',at:0}));
    });
  }

  function learnFact(roleId, factId, value, source='discovered') {
    if (!roleKnowledge[roleId]) roleKnowledge[roleId]=new Map();
    roleKnowledge[roleId].set(factId,{value,source,at:session.patient.getFullState().elapsedTime});
    renderRoleKnowledge();
  }

  function transferFact(fromRole,toRole,factId) {
    const known=roleKnowledge[fromRole]?.get(factId);
    if (!known) return false;
    learnFact(toRole,factId,known.value,'communicated by '+fromRole);
    pushCrewEvent(fromRole,'Information transferred',known.value,{type:'information_transfer',toRole,factId});
    return true;
  }

  function renderRoleKnowledge() {
    if (!session || !$('psv2RoleKnowledge')) return;
    const facts=[...(roleKnowledge[selectedRole]?.entries() || [])];
    $('psv2RoleKnowledge').innerHTML=facts.length?facts.map(([id,f])=>'<div class="psv2-objective" data-fact="'+escapeHtml(id)+'">✓ '+escapeHtml(f.value)+'</div>').join(''):'<div class="psv2-objective">No additional facts have been communicated to this role yet.</div>';
    $('psv2ClosedLoopTasks').innerHTML=closedLoopTasks.length?closedLoopTasks.map(t=>'<div class="psv2-objective"><strong>'+escapeHtml(t.label)+'</strong> · '+escapeHtml(t.status.replaceAll('_',' '))+'</div>').join(''):'<div class="psv2-objective">No delegated tasks yet.</div>';
  }

  function updateClosedLoop(taskId,status,result='') {
    const task=closedLoopTasks.find(t=>t.id===taskId);
    if (!task) return;
    task.status=status; if(result) task.result=result;
    renderRoleKnowledge();
  }

  function renderFireCommand() {
    if (!session) return;
    const panel = $('psv2FireCommand');
    if (!panel) return;
    panel.hidden = selectedRole !== 'firefighter';
    if (panel.hidden) return;
    const cfg = session.scenario.fireSceneManagement;
    $('psv2FirePriorities').innerHTML = cfg.hazards.map(h=>'<div class="psv2-objective">⚠ '+escapeHtml(h.label)+'</div>').join('');
    $('psv2FireActions').innerHTML = cfg.fireActions.map(a=>'<button type="button" class="psv2-list-btn" data-fire-action="'+escapeHtml(a.id)+'">'+escapeHtml(a.label)+'</button>').join('');
    $('psv2FireResources').innerHTML = cfg.resources.map(r=>'<div class="psv2-objective"><strong>'+escapeHtml(r.label)+'</strong> · '+escapeHtml(r.status)+(r.etaMin ? ' · ETA '+r.etaMin+' min' : '')+'</div>').join('');
    $('psv2HospitalStatus').innerHTML = cfg.hospitalStatus.map(h=>'<div class="psv2-objective"><strong>'+escapeHtml(h.label)+'</strong> · '+escapeHtml(h.status)+' · ~'+h.minutes+' min · '+escapeHtml(h.capability)+'</div>').join('');
  }

  function performFireAction(actionId) {
    if (!session || selectedRole !== 'firefighter') return;
    const cfg = session.scenario.fireSceneManagement;
    const action = cfg.fireActions.find(a=>a.id===actionId);
    if (!action) return;
    $('psv2FireSceneStatus').textContent = action.result;
    const button = document.querySelector('[data-fire-action="'+actionId+'"]');
    if (button) { button.disabled=true; button.textContent='✓ '+action.label; }
    pushCrewEvent('firefighter','Scene management: '+action.label,action.result,{type:'scene_management',actionId});
  }

  function renderCrewWorkspace() {
    if (!session || !selectedRole) return;
    const roles = session.scenario.crewRoles;
    const role = roles[selectedRole];
    $('psv2RoleBadge').textContent = role.label;
    $('psv2CrewRoleSummary').innerHTML = '<strong>' + escapeHtml(role.label) + '</strong><br>' + escapeHtml(role.summary);
    $('psv2CrewObjectives').innerHTML = role.objectives.map(item => '<div class="psv2-objective">○ ' + escapeHtml(item) + '</div>').join('');
    $('psv2CrewTarget').innerHTML = Object.entries(roles).filter(([id]) => id !== selectedRole).map(([id, r]) => '<option value="' + escapeHtml(id) + '">' + escapeHtml(r.label) + '</option>').join('');
    const tasks = session.scenario.simulatedCrew?.tasks || {};
    $('psv2CrewTask').innerHTML = Object.entries(tasks)
      .filter(([,task]) => task.assignedTo.some(id => id !== selectedRole))
      .map(([id,task]) => '<option value="' + escapeHtml(id) + '">' + escapeHtml(task.label) + '</option>').join('');
    $('psv2CrewEventType').innerHTML = session.scenario.teamPerformance.communicationEvents.map(item => '<option value="' + escapeHtml(item.id) + '">' + escapeHtml(item.label) + '</option>').join('');
    $('psv2CrewLog').innerHTML = '';
    renderFireCommand();
  }




  const GENERIC_SKILLS = {
    respiratory_rate: { prompt:'Observe chest rise without announcing that you are counting.', steps:[['Start observation','start'],['Count for 30 seconds','count'],['Report respirations ×2','report']], result:()=>{const rr=session.patient.getVitals().respiratoryRate; return {text:'Respiratory rate reported as '+rr+' /min.', measured:{respiratoryRate:rr}};} },
    spo2: { prompt:'Choose the sequence for a reliable pulse-ox reading.', steps:[['Check finger/perfusion and remove obstruction','site'],['Apply probe correctly','probe'],['Wait for a stable signal','stable']], result:()=>{const v=session.patient.getVitals(); return {text:'Stable pulse oximetry reading: '+v.spo2+'% with pulse '+v.heartRate+'.', measured:{spo2:v.spo2,heartRate:v.heartRate}};} },
    lung_sounds: { prompt:'Perform a structured bilateral lung assessment.', steps:[['Expose chest appropriately','expose'],['Compare upper fields bilaterally','upper'],['Compare lower fields bilaterally','lower']], result:()=>({text:'Lung sounds: diffuse bilateral expiratory wheezing with diminished air movement at the bases.',measured:{lungSounds:'diffuse bilateral expiratory wheezing; diminished bases'}}) },
    glucose: { prompt:'Perform a point-of-care glucose check.', steps:[['Prepare meter and strip','meter'],['Clean/dry site and obtain sample','sample'],['Apply sample and wait for result','read']], result:()=>({text:'Blood glucose: 104 mg/dL.',measured:{glucose:104}}) },
    ecg: { prompt:'Place monitoring electrodes before reading the rhythm.', steps:[['Prepare/dry electrode sites','prep'],['Place RA/LA/RL/LL electrodes correctly','leads'],['Confirm signal quality','signal']], result:()=>{const hr=session.patient.getVitals().heartRate; return {text:'ECG monitoring established: regular narrow-complex tachycardia at '+hr+' bpm.',measured:{heartRate:hr,rhythm:'sinus tachycardia'}};} },
    oxygen_setup: { prompt:'Prepare oxygen equipment safely before applying it.', steps:[['Open cylinder/source and verify pressure','source'],['Select delivery device','device'],['Set flow and confirm oxygen delivery','flow']], result:()=>({text:'Oxygen delivery system is assembled, flowing, and ready to apply.',measured:{ready:true}}) },
    nebulizer_setup: { prompt:'Assemble the nebulizer before medication administration.', steps:[['Select nebulizer kit and oxygen tubing','kit'],['Connect cup, mouthpiece/mask and tubing','assemble'],['Connect gas source and verify mist','mist']], result:()=>({text:'Nebulizer is assembled and producing visible mist; ready for ordered medication.',measured:{ready:true}}) }
  };

  function renderGenericSkill(simulator) {
    const def = GENERIC_SKILLS[simulator];
    if (!def) return;
    genericSkillStep = 0;
    $('psv2GenericSkillPrompt').textContent = def.prompt;
    $('psv2GenericSkillStatus').textContent = 'Complete the skill steps in order.';
    $('psv2GenericSkillChoices').innerHTML = def.steps.map((step,i)=>'<button type="button" class="psv2-list-btn" data-generic-step="'+i+'">'+escapeHtml(step[0])+'</button>').join('');
  }

  function doGenericSkillStep(index) {
    if (!activeSkillTask) return;
    const def = GENERIC_SKILLS[activeSkillTask.task.simulator];
    if (!def) return;
    if (index !== genericSkillStep) {
      $('psv2GenericSkillStatus').textContent = 'That step is out of sequence. Reconsider the skill workflow.';
      return;
    }
    genericSkillStep += 1;
    document.querySelector('[data-generic-step="'+index+'"]')?.setAttribute('disabled','');
    if (genericSkillStep < def.steps.length) {
      $('psv2GenericSkillStatus').textContent = 'Step complete. Continue the skill.';
      return;
    }
    const result = def.result();
    $('psv2GenericSkillStatus').textContent = 'Skill complete.';
    setTimeout(()=>completeSkillTask(result.text,result.measured),250);
  }

  function closeSkillSimulator() {
    $('psv2SkillSimulator').hidden = true;
    $('psv2BpSim').hidden = true;
    $('psv2PulseSim').hidden = true;
    $('psv2GenericSkillSim').hidden = true;
    activeSkillTask = null;
    if (pulseTimer) { clearInterval(pulseTimer); pulseTimer = null; }
  }

  function launchSkillSimulator(taskId, assignee, task) {
    activeSkillTask = { taskId, assignee, task };
    $('psv2SkillSimulator').hidden = false;
    $('psv2SkillTitle').textContent = task.label;
    $('psv2BpSim').hidden = task.simulator !== 'blood_pressure';
    $('psv2PulseSim').hidden = task.simulator !== 'pulse';
    const isGeneric = Boolean(GENERIC_SKILLS[task.simulator]);
    $('psv2GenericSkillSim').hidden = !isGeneric;
    if (isGeneric) renderGenericSkill(task.simulator);
    if (task.simulator === 'blood_pressure') {
      bpMarks = { systolic:null, diastolic:null, lastPressure:0 };
      $('psv2CuffPressure').value = '0'; $('psv2CuffReadout').textContent = '0';
      $('psv2BpMarks').textContent = 'Systolic: — · Diastolic: —';
      $('psv2BpAudioCue').textContent = 'Cuff deflated. Inflate to begin.';
    }
    if (task.simulator === 'pulse') {
      pulseCount = 0; pulseRemaining = 0;
      $('psv2PulseTap').disabled = true; $('psv2PulseSubmit').disabled = true;
      $('psv2PulseStatus').textContent = 'Count not started.';
    }
  }

  function completeSkillTask(resultText, measured) {
    if (!session || !activeSkillTask) return;
    const { taskId, assignee, loopId } = activeSkillTask;
    const roles = session.scenario.crewRoles;
    $('psv2CrewTaskStatus').innerHTML = '<strong>' + escapeHtml(roles[assignee].label) + ':</strong> ' + escapeHtml(resultText);
    appendCrewMessage(assignee, resultText);
    pushCrewEvent(assignee, 'Crew skill completed', resultText, {type:'skill',taskId,measured,loopId});
    const factId = taskId === 'blood_pressure' ? 'manual_bp' : taskId === 'pulse' ? 'manual_pulse' : taskId;
    learnFact(assignee,factId,resultText,'skill');
    if (assignee !== selectedRole) transferFact(assignee,selectedRole,factId);
    updateClosedLoop(loopId,'reported',resultText);
    closeSkillSimulator();
  }

  function updateBpCue() {
    if (!session) return;
    const pressure = Number($('psv2CuffPressure').value);
    const actual = session.patient.getVitals().bloodPressure;
    $('psv2CuffReadout').textContent = String(pressure);
    const deflating = pressure < bpMarks.lastPressure;
    if (!deflating) {
      $('psv2BpAudioCue').textContent = pressure > actual.systolic + 20 ? 'No sounds. Cuff is above systolic pressure.' : 'Inflating…';
    } else if (pressure <= actual.systolic && pressure >= actual.diastolic) {
      $('psv2BpAudioCue').textContent = 'Korotkoff sounds audible: tap… tap… tap…';
    } else {
      $('psv2BpAudioCue').textContent = pressure < actual.diastolic ? 'Sounds have disappeared.' : 'No sounds yet.';
    }
    bpMarks.lastPressure = pressure;
  }

  function markBp(kind) {
    const pressure = Number($('psv2CuffPressure').value);
    bpMarks[kind] = pressure;
    $('psv2BpMarks').textContent = 'Systolic: ' + (bpMarks.systolic ?? '—') + ' · Diastolic: ' + (bpMarks.diastolic ?? '—');
  }

  function submitBp() {
    if (!session || bpMarks.systolic == null || bpMarks.diastolic == null) {
      $('psv2BpMarks').textContent = 'Mark both the first and last sounds before reporting.';
      return;
    }
    completeSkillTask('Manual BP reported as ' + bpMarks.systolic + '/' + bpMarks.diastolic + ' mmHg.', {systolic:bpMarks.systolic,diastolic:bpMarks.diastolic});
  }

  function startPulseCount() {
    if (!session || pulseTimer) return;
    pulseCount = 0; pulseRemaining = 15;
    $('psv2PulseTap').disabled = false; $('psv2PulseSubmit').disabled = true;
    $('psv2PulseStatus').textContent = '15 seconds remaining · 0 beats counted';
    pulseTimer = setInterval(() => {
      pulseRemaining -= 1;
      $('psv2PulseStatus').textContent = pulseRemaining + ' seconds remaining · ' + pulseCount + ' beats counted';
      if (pulseRemaining <= 0) {
        clearInterval(pulseTimer); pulseTimer = null;
        $('psv2PulseTap').disabled = true; $('psv2PulseSubmit').disabled = false;
        $('psv2PulseStatus').textContent = 'Count complete: ' + pulseCount + ' beats in 15 sec = ' + (pulseCount * 4) + ' bpm.';
      }
    },1000);
  }

  function submitPulse() {
    if (pulseRemaining > 0 || pulseCount <= 0) return;
    completeSkillTask('Manual pulse reported as ' + (pulseCount * 4) + ' bpm.', {heartRate:pulseCount * 4,count:pulseCount,seconds:15});
  }

  function assignSimulatedCrewTask() {
    if (!session || !selectedRole) return;
    const taskId = $('psv2CrewTask').value;
    const task = session.scenario.simulatedCrew?.tasks?.[taskId];
    if (!task) return;
    const assignee = task.assignedTo.find(id => id !== selectedRole);
    if (!assignee) return;
    const roles = session.scenario.crewRoles;
    const status = $('psv2CrewTaskStatus');
    const startAt = session.patient.getFullState().elapsedTime;
    const loopId = taskId+'-'+startAt+'-'+assignee;
    closedLoopTasks.push({id:loopId,taskId,label:task.label,from:selectedRole,to:assignee,status:'acknowledged',assignedAt:startAt});
    status.innerHTML = '<strong>' + escapeHtml(roles[assignee].label) + ':</strong> Copy. ' + escapeHtml(task.label) + '.';
    const clinical = session.patient.snapshotClinical();
    session.timeline.push({timestamp:startAt,eventType:'crew',action:'Assignment acknowledged',result:roles[assignee].label + ' accepted: ' + task.label,clinicalStateBefore:clinical,clinicalStateAfter:clinical,metadata:{taskId,assignee,status:'acknowledged',loopId}});
    renderTimeline();
    if (task.simulator) {
      activeSkillTask = { ...(activeSkillTask||{}), loopId };
      launchSkillSimulator(taskId, assignee, task);
      if (activeSkillTask) activeSkillTask.loopId=loopId;
      return;
    }
    const timer = setTimeout(() => {
      crewTaskTimers.delete(timer);
      if (!session) return;
      const nowClinical = session.patient.snapshotClinical();
      status.innerHTML = '<strong>' + escapeHtml(roles[assignee].label) + ':</strong> ' + escapeHtml(task.result);
      session.timeline.push({timestamp:session.patient.getFullState().elapsedTime,eventType:'crew',action:'Crew task completed',result:task.result,clinicalStateBefore:nowClinical,clinicalStateAfter:nowClinical,metadata:{taskId,assignee,status:'reported',reveals:task.reveals,loopId}});
      updateClosedLoop(loopId,'reported',task.result);
      renderTimeline();
    }, Math.max(1000, task.durationSec * 1000));
    crewTaskTimers.add(timer);
  }

  function recordCrewCommunication() {
    if (!session || !selectedRole) return;
    const message = $('psv2CrewMessage').value.trim();
    if (!message) return;
    const targetId = $('psv2CrewTarget').value;
    const type = $('psv2CrewEventType').value;
    const roles = session.scenario.crewRoles;
    const event = { from: selectedRole, to: targetId, type, message, timestamp: session.patient.getFullState().elapsedTime };
    crewEvents.push(event);
    if (type === 'finding_report') {
      const sourceFacts=[...(roleKnowledge[selectedRole]?.keys() || [])];
      if (sourceFacts.length) transferFact(selectedRole,targetId,sourceFacts[sourceFacts.length-1]);
    }
    if (type === 'acknowledgement') {
      const pending=[...closedLoopTasks].reverse().find(t=>t.to===selectedRole && t.status==='reported');
      if (pending) updateClosedLoop(pending.id,'closed_loop_complete');
    }
    const needsClarification = maybeClarifyCrewMessage(targetId, message);
    const clinical = session.patient.snapshotClinical();
    session.timeline.push({ timestamp:event.timestamp,eventType:'crew',action:roles[selectedRole].label + ' → ' + roles[targetId].label,result:message,clinicalStateBefore:clinical,clinicalStateAfter:clinical,metadata:{crew:event} });
    $('psv2CrewLog').insertAdjacentHTML('beforeend','<div class="psv2-msg learner"><span class="who">' + escapeHtml(roles[selectedRole].label + ' → ' + roles[targetId].label) + '</span>' + escapeHtml(message) + '</div>');
    $('psv2CrewMessage').value='';
    if (!needsClarification && type === 'specific_assignment') appendCrewMessage(targetId, 'Copy. I have that assignment.');
    renderTimeline();
  }

  function renderScene(targetId = 'environment') {
    if (!session || !session.scenario.sceneExperience) return;
    activeSceneTarget = targetId;
    const scene = session.scenario.sceneExperience;
    const target = scene.targets[targetId];
    if (!target) return;
    $('psv2SceneTitle').textContent = target.label;
    const media = $('psv2SceneMedia');
    media.innerHTML = '';
    if (target.kind === 'dynamic-video') {
      const videoCfg = session.getVideo();
      const video = document.createElement('video');
      video.src = videoCfg.url; video.autoplay = true; video.muted = true; video.loop = true; video.playsInline = true;
      media.appendChild(video);
    } else if (target.src) {
      if (target.kind === 'video') {
        const video = document.createElement('video');
        video.src = target.src; video.autoplay = true; video.muted = true; video.loop = true; video.playsInline = true;
        media.appendChild(video);
      } else {
        const img = document.createElement('img'); img.src = target.src; img.alt = target.alt || target.label; media.appendChild(img);
      }
    } else {
      media.innerHTML = '<div class="psv2-scene-placeholder">' + escapeHtml(target.label) + '<small>Visual media slot</small></div>';
    }
    $('psv2SceneTargets').querySelectorAll('[data-scene-target]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.sceneTarget === targetId)));
    const clues = scene.clues.filter(clue => clue.target === targetId);
    $('psv2SceneClues').innerHTML = clues.map(clue => '<button type="button" class="psv2-btn" data-scene-clue="' + escapeHtml(clue.id) + '">' + escapeHtml(clue.label) + '</button>').join('');
    const contact = scene.contacts[targetId];
    $('psv2ContactForm').hidden = !contact;
    $('psv2ContactLog').innerHTML = '';
    $('psv2SceneFinding').textContent = clues.length ? 'Inspect the visual scene for useful information.' : (contact ? 'Ask this person what they know.' : 'Observe the patient.');
  }

  function buildScene() {
    if (!session || !session.scenario.sceneExperience) return;
    const targets = session.scenario.sceneExperience.targets;
    $('psv2SceneTargets').innerHTML = Object.entries(targets).map(([id, target]) =>
      '<button type="button" class="psv2-chip" data-scene-target="' + escapeHtml(id) + '">' + escapeHtml(target.label) + '</button>'
    ).join('');
    renderScene('environment');
  }

  function recordSceneEvent(action, result, metadata = {}) {
    const clinical = session.patient.snapshotClinical();
    session.timeline.push({
      timestamp: session.patient.getFullState().elapsedTime,
      eventType: 'scene',
      action,
      result,
      clinicalStateBefore: clinical,
      clinicalStateAfter: clinical,
      metadata
    });
    renderTimeline();
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

  function wantsAutostart() {
    const params = new URLSearchParams(location.search);
    return params.get('autostart') === '1' || params.get('start') === '1';
  }

  function beginCallFlow() {
    if (!selectedRole) return;
    startSimulation();
    // Learner arrives through a natural call timeline without a rigid wizard.
    if (selectedRole === 'dispatcher') {
      session.setStage('Dispatch');
    } else {
      session.markEnroute();
      session.advanceTime(selectedRole === 'firefighter' ? 25 : 40);
      session.markArrived();
      if (selectedRole !== 'emt_partner') {
        session.advanceTime(15);
        session.markPatientContact();
      }
    }
    refreshAll();
  }

  function startSimulation() {
    if (session) {
      crewTaskTimers.forEach(timer => clearTimeout(timer)); crewTaskTimers.clear();
      closeSkillSimulator();
      session.destroy();
      session = null;
    }
    currentVideoUrl = '';
    crewAwareness.lastEscalationAt = -999; crewAwareness.anticipated.clear();
    activeDebrief = null;
    reassessMode = false;
    $('psv2ReassessToggle').checked = false;
    if ($('psv2AiCoach')) {
      $('psv2AiCoach').hidden = true;
      $('psv2AiCoach').innerHTML = '';
    }
    if ($('psv2DebriefForm')) $('psv2DebriefForm').hidden = false;

    session = window.PSV2.Session.startNewSession('adult-asthma');
    closedLoopTasks.length=0;
    resetRoleKnowledge();
    $('psv2DispatchText').textContent = session.scenario.dispatch.text;
    $('psv2StartOverlay').hidden = true;

    renderAssessments();
    renderTreatments();
    renderTransportDestinations();
    renderPcrFields();
    renderChat();
    buildScene();
    renderCrewWorkspace();
    renderRoleKnowledge();
    refreshAll();

    // Natural call flow helpers on start
    session.startClock(1000, 1);
    openTab('scene');

    session.subscribe((evt) => {
      if (evt.type === 'tick' || evt.type === 'physiology') {
        $('psv2Clock').textContent = formatClock(evt.session.elapsed);
        renderMonitorValues();
        updateVideo();
        evaluateCrewAwareness();
      }
      if (evt.type === 'stage') {
        renderWorkflow(evt.session.stage);
      }
      if (evt.type === 'assessment' || evt.type === 'treatment' || evt.type === 'conversation' || evt.type === 'transport' || evt.type === 'handoff' || evt.type === 'pcr') {
        renderTimeline();
      }
      if (evt.type === 'conversation') renderChat();
      if (evt.type === 'monitor') renderMonitor();
    });
  }

  async function fetchAiCoachSummary(grade) {
    const box = $('psv2AiCoach');
    if (!box || !grade) return;
    box.hidden = false;
    box.innerHTML = '<em>Requesting AI instructor summary…</em>';
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 4000) : null;
    try {
      const res = await fetch('/api/scenario-debrief-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Existing coach endpoint recognizes asthma; V2 grade remains authoritative.
          scenarioId: 'asthma',
          score: grade.percent,
          label: grade.percent >= 80 ? 'Strong' : grade.percent >= 60 ? 'Developing' : 'Needs work',
          categoryScores: {
            clinical: Math.round(((grade.domains.primary?.percent || 0) + (grade.domains.exam?.percent || 0)) / 2),
            treatment: grade.domains.treatment?.percent || 0,
            communication: grade.domains.communication?.percent || 0
          },
          phaseRatings: Object.entries(grade.domains).slice(0, 8).map(([id, d]) => ({
            id: id === 'primary' ? 'primary' : id === 'treatment' ? 'treatment' : id === 'reassessment' ? 'reassessment' : id === 'transport' ? 'impression' : id === 'documentation' ? 'handoff' : 'focused',
            label: d.label,
            score: d.percent,
            rating: d.percent >= 80 ? 'strong' : d.percent >= 50 ? 'partial' : 'weak',
            detail: (d.notes || []).slice(0, 2).join('; ')
          })),
          strengths: grade.strengths || [],
          opportunities: grade.opportunities || [],
          criticalErrors: (grade.missedCritical || []).map(m => m.label),
          priorities: (grade.missedCritical || []).slice(0, 3).map(m => ({
            level: 'high',
            title: m.label,
            detail: m.why || ''
          }))
        }),
        signal: controller?.signal
      });
      if (!res.ok) throw new Error('coach unavailable');
      const data = await res.json();
      const coaching = data?.coaching;
      if (!coaching) {
        box.innerHTML = '<strong>AI coach</strong><br>Local debrief questions are ready. Deterministic grade is unchanged.';
        return;
      }
      box.innerHTML = `
        <strong>${escapeHtml(coaching.headline || 'Instructor summary')}</strong>
        <p style="margin:6px 0 0">${escapeHtml(coaching.summary || '')}</p>
        <p style="margin:8px 0 0"><em>Priority:</em> ${escapeHtml(coaching.priorityAction || '')}</p>
        <p style="margin:6px 0 0;color:var(--psv2-muted)">Grade unchanged at ${grade.percent}%.</p>
      `;
    } catch (_) {
      box.innerHTML = '<strong>AI coach</strong><br>Continuing with local instructor questions. Deterministic grade is unchanged.';
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function wireEvents() {
    $('psv2RoleCards').addEventListener('click', (e) => {
      const btn=e.target.closest('[data-role]'); if(btn) selectRole(btn.dataset.role);
    });
    $('psv2CrewSend').addEventListener('click', recordCrewCommunication);
    $('psv2AssignTask').addEventListener('click', assignSimulatedCrewTask);
    $('psv2SkillCancel').addEventListener('click', closeSkillSimulator);
    $('psv2CuffPressure').addEventListener('input', updateBpCue);
    $('psv2BpMarkSystolic').addEventListener('click', () => markBp('systolic'));
    $('psv2BpMarkDiastolic').addEventListener('click', () => markBp('diastolic'));
    $('psv2BpSubmit').addEventListener('click', submitBp);
    $('psv2PulseStart').addEventListener('click', startPulseCount);
    $('psv2PulseTap').addEventListener('click', () => { pulseCount += 1; $('psv2PulseStatus').textContent = pulseRemaining + ' seconds remaining · ' + pulseCount + ' beats counted'; });
    $('psv2PulseSubmit').addEventListener('click', submitPulse);
    $('psv2FireActions').addEventListener('click', (e) => {
      const btn=e.target.closest('[data-fire-action]'); if(btn) performFireAction(btn.dataset.fireAction);
    });
    $('psv2GenericSkillChoices').addEventListener('click', (e) => {
      const btn=e.target.closest('[data-generic-step]'); if(btn) doGenericSkillStep(Number(btn.dataset.genericStep));
    });
    $('psv2StartBtn').addEventListener('click', () => {
      beginCallFlow();
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
      beginCallFlow();
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
      if (action === 'scene') openTab('scene');
      if (action === 'crew') openTab('crew');
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

    async function maybeAiPatientPhrasing(text, local) {
      if (!local?.matchedFact) return null;
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 1800) : null;
      try {
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
          }),
          signal: controller?.signal
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data?.reply && data.source === 'ai') {
          const safe = session.conversation.sanitizeAiReply(data.reply, [local.matchedFact]);
          if (safe) return { factKey: local.matchedFact, reply: safe };
        }
      } catch (_) {
        /* offline / timeout / no AI — local engine is authoritative */
      } finally {
        if (timer) clearTimeout(timer);
      }
      return null;
    }

    $('psv2SceneTargets').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-scene-target]');
      if (!btn || !session) return;
      renderScene(btn.dataset.sceneTarget);
    });

    $('psv2SceneClues').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-scene-clue]');
      if (!btn || !session) return;
      const clue = session.scenario.sceneExperience.clues.find(item => item.id === btn.dataset.sceneClue);
      if (!clue) return;
      $('psv2SceneFinding').textContent = clue.finding;
      recordSceneEvent('Scene observation: ' + clue.label, clue.finding, { clueId: clue.id, target: clue.target });
    });

    $('psv2ContactForm').addEventListener('submit', (e) => {
      e.preventDefault();
      if (!session) return;
      const input = $('psv2ContactInput');
      const question = input.value.trim();
      if (!question) return;
      const contact = session.scenario.sceneExperience.contacts[activeSceneTarget];
      if (!contact) return;
      const lower = question.toLowerCase();
      const fact = contact.facts.find(row => row.keys.some(key => lower.includes(key)));
      const answer = fact ? fact.answer : contact.fallback;
      const log = $('psv2ContactLog');
      log.insertAdjacentHTML('beforeend', '<div class="psv2-msg learner"><span class="who">You</span>' + escapeHtml(question) + '</div><div class="psv2-msg patient"><span class="who">' + escapeHtml(session.scenario.sceneExperience.targets[activeSceneTarget].label) + '</span>' + escapeHtml(answer) + '</div>');
      input.value = '';
      recordSceneEvent('Questioned ' + session.scenario.sceneExperience.targets[activeSceneTarget].label, answer, { target: activeSceneTarget, matched: Boolean(fact) });
    });

    $('psv2ChatForm').addEventListener('submit', (e) => {
      e.preventDefault();
      if (!session) return;
      const input = $('psv2ChatInput');
      const text = input.value.trim();
      if (!text) return;
      input.value = '';

      // Local fact engine answers immediately (never blocked by AI availability).
      session.talkToPatient(text);
      renderChat();
      renderTimeline();
      refreshAll();

      // Optional AI rephrase in background — does not delay or replace the recorded facts.
      const local = session.conversation.answerFromFacts(text);
      maybeAiPatientPhrasing(text, local).then((aiPhrasing) => {
        if (!aiPhrasing || !session) return;
        // Surface phrasing hint only in UI chat bubble without inventing new facts.
        const log = $('psv2ChatLog');
        const last = log?.querySelector('.psv2-msg.patient:last-child');
        if (last && aiPhrasing.reply) {
          last.innerHTML = `<span class="who">Patient</span>${escapeHtml(aiPhrasing.reply)}`;
        }
      });
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
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 1800) : null;
      try {
        const res = await fetch('/api/patient-simulator-v2-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenarioId: 'adult-asthma',
            mode: 'hospital',
            report
          }),
          signal: controller?.signal
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.reply) reply.textContent = data.reply;
        }
      } catch (_) { /* local fallback already shown */ }
      finally { if (timer) clearTimeout(timer); }
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
      renderGrade(session.gradeResult);
      activeDebrief = session.startDebrief();
      $('psv2DebriefStart').hidden = true;
      $('psv2DebriefActive').hidden = false;
      const q = activeDebrief.nextQuestion();
      if (q.done) {
        $('psv2DebriefPrompt').textContent = q.summary.message;
      } else {
        $('psv2DebriefPrompt').textContent = q.question.prompt;
      }
      fetchAiCoachSummary(session.gradeResult);
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
    renderRoleSelector();
    wireEvents();
    renderWorkflow('Dispatch');
    // Prebuild empty monitor
    $('psv2Monitor').innerHTML = MONITOR_CHANNELS.map(ch => `
      <div class="psv2-vital">
        <div class="label"><span>${ch.label}</span><span>${ch.unit}</span></div>
        <div class="value off">—</div>
      </div>
    `).join('');

    if (wantsAutostart()) {
      beginCallFlow();
      // Clean the autostart flag so refresh/restart does not loop unexpectedly.
      try {
        const url = new URL(location.href);
        url.searchParams.delete('autostart');
        url.searchParams.delete('start');
        history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
      } catch (_) { /* ignore */ }
    }
  });
})();
