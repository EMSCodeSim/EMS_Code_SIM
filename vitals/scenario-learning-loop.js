(() => {
  'use strict';

  /**
   * Patient Assessment learning loop:
   * Learn → Assess → Identify Weakness → Targeted Practice → Retry
   *
   * Progressive coaching (Learning Mode only), weakness tracking,
   * remediation practice links via the tool registry, and session-level
   * retry improvement comparison. Assessment Mode stays silent during the call.
   */

  if (window.EMSCodeSimLearningLoop) return;

  const STORAGE_ATTEMPTS = 'emscodesim_learning_loop_attempts_v1';
  const STORAGE_CONTEXT = 'emscodesim_learning_loop_context_v1';
  const STORAGE_LIVE = 'emscodesim_learning_loop_live_v1';
  const COACH_IDLE_MS = Object.freeze({ level1: 55000, level2: 95000, level3: 140000 });
  const MAX_HINT_LEVEL = 3;

  const WEAKNESS_CATALOG = Object.freeze({
    scene_size_up: {
      id: 'scene_size_up', label: 'Scene size-up', findingKey: 'scene_size_up',
      practiceKey: 'scene_size_up', practiceHref: '/vitals/visual-patient.html', practiceLabel: 'Practice Scene Size-up',
      why: 'Scene safety, PPE, patient count, and MOI/NOI shape every later decision on the call.'
    },
    general_impression: {
      id: 'general_impression', label: 'General impression', findingKey: 'scene_size_up',
      practiceKey: 'scene_size_up', practiceHref: '/vitals/visual-patient.html', practiceLabel: 'Practice First Impression',
      why: 'A rapid general impression identifies life threats before detailed history gathering.'
    },
    airway_assessment: {
      id: 'airway_assessment', label: 'Airway assessment', findingKey: 'airway',
      practiceKey: 'airway', practiceHref: '/vitals/visual-airway-assessment.html', practiceLabel: 'Practice Airway Assessment',
      why: 'An unsecured airway overrides almost every other assessment priority.'
    },
    breathing_assessment: {
      id: 'breathing_assessment', label: 'Breathing assessment', findingKey: 'breathing',
      practiceKey: 'breathing', practiceHref: '/vitals/respiratory-assessment-visual.html', practiceLabel: 'Practice Respiratory Assessment',
      why: 'Identifying inadequate breathing early changes treatment priority and whether ventilatory support is needed.'
    },
    breath_sounds: {
      id: 'breath_sounds', label: 'Breath sounds', findingKey: 'breath_sounds',
      practiceKey: 'breath_sounds', practiceHref: '/vitals/breath-sounds-scenario.html', practiceLabel: 'Practice Breath Sounds',
      why: 'Air movement and breath-sound pattern guide oxygen and bronchodilator decisions.'
    },
    circulation_perfusion: {
      id: 'circulation_perfusion', label: 'Circulation / perfusion', findingKey: 'perfusion',
      practiceKey: 'perfusion', practiceHref: '/vitals/distal-csm-assessment.html', practiceLabel: 'Practice Circulation Assessment',
      why: 'Pulse quality, bleeding, and skin signs reveal shock risk before blood pressure alone does.'
    },
    life_threats: {
      id: 'life_threats', label: 'Recognizing life threats', findingKey: null,
      practiceKey: 'airway', practiceHref: '/vitals/visual-airway-assessment.html', practiceLabel: 'Practice Primary Assessment',
      why: 'Threats to airway, breathing, and circulation must be found and managed before secondary survey work.'
    },
    transport_priority: {
      id: 'transport_priority', label: 'Transport priority', findingKey: null,
      practiceKey: null, practiceHref: '/vitals/treatment-reassessment.html', practiceLabel: 'Practice Transport Decision',
      why: 'Priority and destination decisions depend on life threats and how the patient responds to care.'
    },
    sample: {
      id: 'sample', label: 'SAMPLE history', findingKey: 'sample',
      practiceKey: 'sample', practiceHref: '/vitals/sample-history.html', practiceLabel: 'Practice SAMPLE Interview',
      why: 'SAMPLE reveals allergies, medications, and events that change risk and treatment choices.'
    },
    opqrst: {
      id: 'opqrst', label: 'OPQRST', findingKey: 'pain',
      practiceKey: 'pain', practiceHref: '/vitals/pain-opqrst.html', practiceLabel: 'Practice OPQRST Interview',
      why: 'OPQRST clarifies onset, severity, and symptom pattern that focus the exam and treatment.'
    },
    vital_signs: {
      id: 'vital_signs', label: 'Vital signs', findingKey: null,
      practiceKey: 'respirations', practiceHref: '/vitals/respiratory-rate-scenario.html', practiceLabel: 'Practice Vital Signs',
      why: 'Baseline vitals quantify severity and give a comparison point after treatment.'
    },
    spo2: {
      id: 'spo2', label: 'SpO₂', findingKey: 'spo2',
      practiceKey: 'spo2', practiceHref: '/vitals/pulse-ox-scenario.html', practiceLabel: 'Practice SpO₂',
      why: 'Oxygen saturation helps judge hypoxemia but must be interpreted with work of breathing.'
    },
    focused_exam: {
      id: 'focused_exam', label: 'Focused physical examination', findingKey: null,
      practiceKey: 'trauma_assessment', practiceHref: '/vitals/visual-trauma-body-exam.html', practiceLabel: 'Practice Focused Exam',
      why: 'Complaint-focused exam finds injuries or findings that change packaging and destination.'
    },
    trauma_assessment: {
      id: 'trauma_assessment', label: 'Trauma assessment', findingKey: 'trauma_assessment',
      practiceKey: 'trauma_assessment', practiceHref: '/vitals/visual-trauma-body-exam.html', practiceLabel: 'Practice Trauma Assessment',
      why: 'A systematic trauma exam reduces missed injuries after significant mechanism.'
    },
    distal_csm: {
      id: 'distal_csm', label: 'Distal CSM', findingKey: 'distal_csm',
      practiceKey: 'distal_csm', practiceHref: '/vitals/distal-csm-assessment.html', practiceLabel: 'Practice Distal CSM',
      why: 'Distal CSM before and after movement detects vascular or nerve compromise from injury or packaging.'
    },
    neurological: {
      id: 'neurological', label: 'Neurological assessment', findingKey: 'mental_status',
      practiceKey: 'mental_status', practiceHref: '/vitals/avpu-scenario.html', practiceLabel: 'Practice Mental Status / AVPU',
      why: 'Mental status changes can signal hypoxia, shock, stroke, or hypoglycemia.'
    },
    stroke: {
      id: 'stroke', label: 'Stroke assessment', findingKey: 'motor_sensory',
      practiceKey: 'motor_sensory', practiceHref: '/vitals/visual-neuro-stroke-assessment.html', practiceLabel: 'Practice Stroke Assessment',
      why: 'Focal neurologic findings and last-known-well time drive destination and urgency.'
    },
    treatment_selection: {
      id: 'treatment_selection', label: 'Treatment selection', findingKey: null,
      practiceKey: null, practiceHref: '/vitals/treatment-reassessment.html', practiceLabel: 'Practice Treatment Decisions',
      why: 'Treatment should match assessed threats—not protocol memorization alone.'
    },
    treatment_sequencing: {
      id: 'treatment_sequencing', label: 'Treatment sequencing', findingKey: null,
      practiceKey: null, practiceHref: '/vitals/treatment-reassessment.html', practiceLabel: 'Practice Treatment Sequence',
      why: 'Correct order (threats first, then supportive care) prevents delay of life-saving actions.'
    },
    reassessment: {
      id: 'reassessment', label: 'Reassessment', findingKey: null,
      practiceKey: null, practiceHref: '/vitals/treatment-reassessment.html', practiceLabel: 'Practice Reassessment',
      why: 'Reassessment shows whether the patient improved, stayed the same, or deteriorated after care.'
    },
    deterioration: {
      id: 'deterioration', label: 'Recognizing deterioration', findingKey: null,
      practiceKey: 'breathing', practiceHref: '/vitals/respiratory-assessment-visual.html', practiceLabel: 'Practice Respiratory Assessment',
      why: 'Worsening effort, mentation, or perfusion requires an immediate change in priority.'
    },
    transport_decision: {
      id: 'transport_decision', label: 'Transport decision', findingKey: null,
      practiceKey: null, practiceHref: '/vitals/treatment-reassessment.html', practiceLabel: 'Practice Transport Decision',
      why: 'Emergent vs non-emergent and destination choice should match the clinical picture.'
    },
    handoff: {
      id: 'handoff', label: 'Radio report / handoff', findingKey: null,
      practiceKey: null, practiceHref: '/vitals/pcr-handoff.html', practiceLabel: 'Practice Handoff',
      why: 'A clear handoff transfers findings, treatments, response, and urgency to the next caregiver.'
    },
    documentation: {
      id: 'documentation', label: 'Documentation / PCR', findingKey: null,
      practiceKey: null, practiceHref: '/vitals/pcr-handoff.html', practiceLabel: 'Practice PCR Narrative',
      why: 'Documentation preserves the clinical story for continuity of care and review.'
    }
  });

  const FINDING_TO_WEAKNESS = Object.freeze({
    scene_size_up: 'scene_size_up',
    airway: 'airway_assessment',
    breathing: 'breathing_assessment',
    perfusion: 'circulation_perfusion',
    breath_sounds: 'breath_sounds',
    respirations: 'vital_signs',
    spo2: 'spo2',
    pulse: 'vital_signs',
    blood_pressure: 'vital_signs',
    sample: 'sample',
    pain: 'opqrst',
    mental_status: 'neurological',
    motor_sensory: 'stroke',
    trauma_assessment: 'trauma_assessment',
    distal_csm: 'distal_csm',
    chest_assessment: 'breathing_assessment',
    abdominal_assessment: 'focused_exam',
    pelvis_hip: 'trauma_assessment',
    left_leg: 'trauma_assessment',
    neck_back: 'trauma_assessment',
    skin: 'circulation_perfusion',
    pupils: 'neurological',
    blood_glucose: 'vital_signs',
    gcs: 'neurological',
    pediatric_assessment_triangle: 'general_impression'
  });

  /** Scenario-aware progressive coaching prompts. Levels escalate reasoning → direction → action. */
  const COACHING_BY_CASE = Object.freeze({
    asthma: Object.freeze([
      {
        id: 'primary_abc',
        weaknessIds: ['life_threats', 'airway_assessment', 'breathing_assessment', 'circulation_perfusion'],
        requiredAny: ['airway', 'breathing', 'perfusion'],
        stallAfterMs: COACH_IDLE_MS.level1,
        hints: {
          1: {
            prompt: 'The patient is having difficulty breathing. What immediate life threats should you evaluate first?',
            why: 'Airway, breathing, and circulation threats change priority before detailed history.'
          },
          2: {
            prompt: 'Focus on airway, breathing, and circulation before gathering a detailed history.',
            why: 'History helps once immediate threats are identified and managed.'
          },
          3: {
            prompt: 'Open Breathing Assessment and determine whether ventilation is adequate.',
            why: 'Respiratory rate alone does not determine breathing adequacy. Consider effort, depth, chest rise, speech, skin signs, and mental status.'
          }
        }
      },
      {
        id: 'respiratory_detail',
        weaknessIds: ['breath_sounds', 'spo2', 'vital_signs'],
        requiredAny: ['breath_sounds', 'spo2', 'respirations'],
        requiresFindings: ['breathing'],
        stallAfterMs: COACH_IDLE_MS.level1,
        hints: {
          1: {
            prompt: 'You know the patient is dyspneic. What objective respiratory data would change your treatment?',
            why: 'Breath sounds, SpO₂, and rate/effort refine severity and response tracking.'
          },
          2: {
            prompt: 'Obtain breath sounds and SpO₂ to judge air movement and oxygenation.',
            why: 'Wheeze with air movement differs clinically from a quiet, tiring chest.'
          },
          3: {
            prompt: 'Open Breath Sounds and SpO₂ tools to complete the respiratory picture.',
            why: 'These findings guide oxygen, bronchodilator timing, and reassessment targets.'
          }
        }
      },
      {
        id: 'history',
        weaknessIds: ['sample', 'opqrst'],
        requiredAny: ['sample'],
        requiresFindings: ['airway', 'breathing'],
        stallAfterMs: COACH_IDLE_MS.level2,
        hints: {
          1: {
            prompt: 'What history would change risk or treatment for this breathing complaint?',
            why: 'Prior intubation, medications, and trigger events alter severity judgment.'
          },
          2: {
            prompt: 'Gather SAMPLE after initial respiratory threats are addressed.',
            why: 'SAMPLE fills gaps that vitals alone cannot explain.'
          },
          3: {
            prompt: 'Open SAMPLE History and ask about prior severe asthma episodes and inhaler use.',
            why: 'Prior ICU/intubation history and recent inhaler doses change urgency.'
          }
        }
      },
      {
        id: 'treatment_reassess',
        weaknessIds: ['treatment_selection', 'reassessment'],
        requiredTreatments: true,
        stallAfterMs: COACH_IDLE_MS.level2,
        hints: {
          1: {
            prompt: 'Based on your findings, what supportive care addresses the breathing threat?',
            why: 'Treatment should match assessed adequacy of breathing and oxygenation.'
          },
          2: {
            prompt: 'After indicated respiratory care, plan what you will reassess and when.',
            why: 'Reassessment proves whether the intervention helped or the patient is tiring.'
          },
          3: {
            prompt: 'Record indicated treatment, then reassess speaking ability, work of breathing, breath sounds, and SpO₂.',
            why: 'Those markers show clinical response more clearly than a single vital alone.'
          }
        }
      }
    ]),
    horse_crush: Object.freeze([
      {
        id: 'scene_abc',
        weaknessIds: ['scene_size_up', 'life_threats', 'airway_assessment', 'breathing_assessment', 'circulation_perfusion'],
        requiredAny: ['arrival_parking', 'airway', 'breathing', 'perfusion'],
        stallAfterMs: COACH_IDLE_MS.level1,
        hints: {
          1: {
            prompt: 'This is a trauma mechanism. What life threats should you rule out before focusing on the hip?',
            why: 'Scene safety and ABC threats come before detailed extremity exam.'
          },
          2: {
            prompt: 'Confirm scene control, then assess airway, breathing, and circulation/bleeding before the focused trauma exam.',
            why: 'A painful hip injury can distract from higher-priority threats.'
          },
          3: {
            prompt: 'Complete scene arrival decisions and the primary ABC assessment before detailed limb exam.',
            why: 'Major bleeding and airway/breathing threats change transport and packaging priorities.'
          }
        }
      },
      {
        id: 'trauma_focus',
        weaknessIds: ['trauma_assessment', 'distal_csm', 'focused_exam'],
        requiredAny: ['pelvis_hip', 'left_leg', 'distal_csm'],
        requiresFindings: ['airway', 'breathing', 'perfusion'],
        stallAfterMs: COACH_IDLE_MS.level1,
        hints: {
          1: {
            prompt: 'Which focused trauma findings must be known before you move this patient?',
            why: 'Hip/pelvis injury and distal CSM guide packaging and detect limb compromise.'
          },
          2: {
            prompt: 'Examine the pelvis/hip and injured leg, and document distal CSM before movement.',
            why: 'Movement without a CSM baseline can hide new neurovascular injury.'
          },
          3: {
            prompt: 'Open the hip/leg exam and Distal CSM tools before packaging or transfer.',
            why: 'Baseline CSM is a critical reassessment anchor after every major move.'
          }
        }
      },
      {
        id: 'history_pain',
        weaknessIds: ['sample', 'opqrst'],
        requiredAny: ['sample', 'pain'],
        requiresFindings: ['perfusion'],
        stallAfterMs: COACH_IDLE_MS.level2,
        hints: {
          1: {
            prompt: 'What history and pain details would change packaging or pain-control decisions?',
            why: 'Medications, allergies, and pain severity affect safe treatment choices.'
          },
          2: {
            prompt: 'Obtain SAMPLE and OPQRST once immediate threats are controlled.',
            why: 'History supports risk assessment without delaying ABC care.'
          },
          3: {
            prompt: 'Open SAMPLE and OPQRST to document mechanism details and pain pattern.',
            why: 'These findings support pain management and a clear hospital handoff.'
          }
        }
      },
      {
        id: 'move_reassess',
        weaknessIds: ['treatment_sequencing', 'reassessment', 'distal_csm'],
        requiredTreatments: true,
        stallAfterMs: COACH_IDLE_MS.level2,
        hints: {
          1: {
            prompt: 'Before moving the patient, what should already be stabilized and rechecked?',
            why: 'Support the injured limb and recheck distal CSM after every major movement.'
          },
          2: {
            prompt: 'Stabilize in the position of comfort, address pain when feasible, then reassess distal CSM after movement.',
            why: 'Trauma packaging without reassessment can miss new compromise.'
          },
          3: {
            prompt: 'Document limb support/pain control, then repeat Distal CSM after packaging or transfer.',
            why: 'Post-movement CSM is a critical trauma reassessment step.'
          }
        }
      }
    ]),
    stroke: Object.freeze([
      {
        id: 'neuro_priority',
        weaknessIds: ['life_threats', 'neurological', 'stroke'],
        requiredAny: ['airway', 'breathing', 'perfusion', 'mental_status', 'motor_sensory'],
        stallAfterMs: COACH_IDLE_MS.level1,
        hints: {
          1: {
            prompt: 'Sudden neurologic change—what must you protect first, and what time-sensitive findings matter next?',
            why: 'ABCs come first; then last-known-well and focal deficits drive destination.'
          },
          2: {
            prompt: 'Secure ABCs, then complete mental status and stroke/motor-sensory assessment.',
            why: 'Focal findings plus last-known-well determine stroke-center urgency.'
          },
          3: {
            prompt: 'Open Mental Status and Stroke Assessment after primary ABC checks.',
            why: 'These findings support emergent transport to a stroke-capable center.'
          }
        }
      }
    ]),
    hypoglycemia: Object.freeze([
      {
        id: 'ams_priority',
        weaknessIds: ['life_threats', 'neurological', 'vital_signs'],
        requiredAny: ['airway', 'breathing', 'perfusion', 'mental_status', 'blood_glucose'],
        stallAfterMs: COACH_IDLE_MS.level1,
        hints: {
          1: {
            prompt: 'Altered mental status—what reversible causes should you evaluate after ABCs?',
            why: 'Airway protection and glucose check can rapidly change the care plan.'
          },
          2: {
            prompt: 'Protect the airway, then obtain mental status and blood glucose.',
            why: 'Hypoglycemia is a treatable cause of altered mentation.'
          },
          3: {
            prompt: 'Complete ABC assessment, then open Blood Glucose and Mental Status tools.',
            why: 'Glucose result guides treatment and reassessment of mentation.'
          }
        }
      }
    ]),
    trauma: Object.freeze([
      {
        id: 'trauma_abc',
        weaknessIds: ['life_threats', 'trauma_assessment', 'transport_priority'],
        requiredAny: ['airway', 'breathing', 'perfusion', 'trauma_assessment'],
        stallAfterMs: COACH_IDLE_MS.level1,
        hints: {
          1: {
            prompt: 'Significant mechanism—what threats must be found before a detailed secondary survey?',
            why: 'Major bleeding and ABC threats drive rapid trauma care and transport.'
          },
          2: {
            prompt: 'Complete ABCs and a rapid trauma assessment before prolonged on-scene history.',
            why: 'Load-and-go decisions depend on early threat recognition.'
          },
          3: {
            prompt: 'Open Primary Assessment and Rapid Trauma Assessment to identify immediate threats.',
            why: 'Systematic trauma exam reduces missed injuries after blunt mechanism.'
          }
        }
      }
    ]),
    pediatric: Object.freeze([
      {
        id: 'pat_priority',
        weaknessIds: ['general_impression', 'life_threats', 'breathing_assessment'],
        requiredAny: ['pediatric_assessment_triangle', 'airway', 'breathing', 'perfusion'],
        stallAfterMs: COACH_IDLE_MS.level1,
        hints: {
          1: {
            prompt: 'From the doorway, what pediatric first-look findings should shape your next actions?',
            why: 'Appearance, work of breathing, and circulation to skin quickly sort sick from not-sick.'
          },
          2: {
            prompt: 'Use the Pediatric Assessment Triangle, then confirm airway, breathing, and perfusion.',
            why: 'PAT findings prioritize whether you intervene immediately or gather more history.'
          },
          3: {
            prompt: 'Open the Pediatric Assessment Triangle, then complete ABC assessment.',
            why: 'Pediatric patients can decompensate quickly when work of breathing is high.'
          }
        }
      }
    ])
  });

  const api = () => window.EMSCodeSimPatientRecord;
  const phases = () => window.EMSCodeSimScenarioPhases;
  const registry = () => window.EMSCodeSimToolRegistry;
  const text = value => String(value ?? '').trim();
  const arr = value => Array.isArray(value) ? value : [];
  const esc = value => text(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function params() { return new URLSearchParams(location.search); }
  function record() { return api()?.active?.() || null; }
  function caseId(rec = record()) {
    return text(params().get('case') || rec?.scenarioId || rec?.id || '').replace(/-/g, '_') || 'asthma';
  }
  function trainingMode(rec = record()) {
    const mode = text(params().get('training') || rec?.documentation?.trainingMode || 'learning').toLowerCase();
    return mode === 'assessment' ? 'assessment' : 'learning';
  }
  function assessmentMode(rec = record()) { return trainingMode(rec) === 'assessment'; }
  function learningMode(rec = record()) { return !assessmentMode(rec); }

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(sessionStorage.getItem(key) || 'null');
      return value == null ? fallback : value;
    } catch (_) { return fallback; }
  }
  function writeJson(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function emptyAssistance() {
    return {
      hints: {},
      highestHintLevel: {},
      repeatedErrors: {},
      skippedCritical: [],
      independentCompletions: [],
      assistedCompletions: [],
      lastHintAt: null,
      lastHintId: null,
      lastHintLevel: 0,
      dismissedHints: 0,
      updatedAt: null
    };
  }

  function liveKey(rec = record()) {
    return `${STORAGE_LIVE}:${caseId(rec)}:${rec?.id || 'active'}`;
  }

  function assistanceState(rec = record()) {
    const fromRecord = rec?.documentation?.learningLoop || {};
    const fromLive = readJson(liveKey(rec), {});
    const stored = { ...fromRecord, ...fromLive };
    // Merge nested maps so live session progress wins per key.
    stored.hints = { ...(fromRecord.hints || {}), ...(fromLive.hints || {}) };
    stored.highestHintLevel = { ...(fromRecord.highestHintLevel || {}), ...(fromLive.highestHintLevel || {}) };
    stored.repeatedErrors = { ...(fromRecord.repeatedErrors || {}), ...(fromLive.repeatedErrors || {}) };
    const mergeUnique = (a, b) => [...new Set([...arr(a), ...arr(b)])];
    return {
      ...emptyAssistance(),
      ...stored,
      hints: { ...(stored.hints || {}) },
      highestHintLevel: { ...(stored.highestHintLevel || {}) },
      repeatedErrors: { ...(stored.repeatedErrors || {}) },
      skippedCritical: mergeUnique(fromRecord.skippedCritical, fromLive.skippedCritical),
      independentCompletions: mergeUnique(fromRecord.independentCompletions, fromLive.independentCompletions),
      assistedCompletions: mergeUnique(fromRecord.assistedCompletions, fromLive.assistedCompletions)
    };
  }

  function persistAssistance(next) {
    const payload = { ...next, updatedAt: new Date().toISOString() };
    // Keep hot coaching state in sessionStorage during the call to avoid
    // synchronous patient-record writes that can stall the patient workspace.
    writeJson(liveKey(), payload);
    return payload;
  }

  function flushAssistanceToRecord(rec = record()) {
    const payload = assistanceState(rec);
    if (!payload.updatedAt && !Object.keys(payload.highestHintLevel || {}).length) return payload;
    try {
      api()?.setDocumentation?.({ learningLoop: payload, updatedAt: new Date().toISOString() });
    } catch (_) {}
    return payload;
  }

  function hasFinding(rec, key) { return Boolean(rec?.findings?.[key]); }
  function treatmentCount(rec) { return arr(rec?.treatments).length; }
  function elapsedMs(rec = record()) {
    const started = new Date(rec?.startedAt || 0).getTime();
    if (!Number.isFinite(started) || started <= 0) return 0;
    return Math.max(0, Date.now() - started);
  }
  function lastActionMs(rec = record()) {
    const times = [];
    Object.values(rec?.findings || {}).forEach(item => {
      const t = new Date(item?.recordedAt || 0).getTime();
      if (Number.isFinite(t) && t > 0) times.push(t);
    });
    arr(rec?.treatments).forEach(item => {
      const t = new Date(item?.recordedAt || item?.time || 0).getTime();
      if (Number.isFinite(t) && t > 0) times.push(t);
    });
    arr(rec?.reassessments).forEach(item => {
      const t = new Date(item?.recordedAt || item?.time || 0).getTime();
      if (Number.isFinite(t) && t > 0) times.push(t);
    });
    arr(rec?.careLog).forEach(item => {
      const t = new Date(item?.recordedAt || 0).getTime();
      if (Number.isFinite(t) && t > 0) times.push(t);
    });
    if (!times.length) return elapsedMs(rec);
    return Math.max(0, Date.now() - Math.max(...times));
  }

  function coachingTracks(id = caseId()) {
    return COACHING_BY_CASE[id] || COACHING_BY_CASE.asthma;
  }

  function trackSatisfied(track, rec) {
    if (track.requiredTreatments) {
      if (!treatmentCount(rec)) return false;
      const reassessOk = phases()?.hasReassessmentAfterTreatment?.(rec);
      return Boolean(reassessOk);
    }
    const keys = arr(track.requiredAny);
    if (!keys.length) return true;
    // For multi-key primary blocks, require all listed keys once any coaching started,
    // but "satisfied" means every requiredAny key is present.
    return keys.every(key => hasFinding(rec, key));
  }

  function trackEligible(track, rec) {
    if (trackSatisfied(track, rec)) return false;
    const requires = arr(track.requiresFindings);
    if (requires.length && !requires.every(key => hasFinding(rec, key))) return false;
    if (track.requiredTreatments) {
      // Offer treatment coaching once primary threats for the case are at least started.
      const primary = ['airway', 'breathing', 'perfusion'];
      const started = primary.some(key => hasFinding(rec, key));
      return (started && !treatmentCount(rec)) || (treatmentCount(rec) > 0 && !phases()?.hasReassessmentAfterTreatment?.(rec));
    }
    return true;
  }

  function activeTrack(rec = record()) {
    return coachingTracks(caseId(rec)).find(track => trackEligible(track, rec)) || null;
  }

  function desiredHintLevel(track, idleMs, assistance) {
    const current = Number(assistance.highestHintLevel[track.id] || 0);
    let level = 0;
    if (idleMs >= (track.stallAfterMs || COACH_IDLE_MS.level1)) level = 1;
    if (idleMs >= COACH_IDLE_MS.level2) level = 2;
    if (idleMs >= COACH_IDLE_MS.level3) level = 3;
    // Escalate at most one level beyond what the learner has already seen.
    if (current > 0 && idleMs >= COACH_IDLE_MS.level1) {
      level = Math.max(level, Math.min(MAX_HINT_LEVEL, current + 1));
    }
    return Math.max(0, Math.min(MAX_HINT_LEVEL, level));
  }

  function markHint(trackId, level, weaknessIds = []) {
    const state = assistanceState();
    const prev = Number(state.highestHintLevel[trackId] || 0);
    const nextLevel = Math.max(prev, level);
    state.hints[trackId] = arr(state.hints[trackId]);
    if (!state.hints[trackId].includes(level)) state.hints[trackId].push(level);
    state.highestHintLevel[trackId] = nextLevel;
    state.lastHintAt = new Date().toISOString();
    state.lastHintId = trackId;
    state.lastHintLevel = nextLevel;
    weaknessIds.forEach(id => {
      if (!state.skippedCritical.includes(id) && level >= 2) state.skippedCritical.push(id);
    });
    return persistAssistance(state);
  }

  function markDismissed() {
    const state = assistanceState();
    state.dismissedHints = Number(state.dismissedHints || 0) + 1;
    return persistAssistance(state);
  }

  function markFindingProgress(rec = record()) {
    if (!rec) return;
    const state = assistanceState(rec);
    let changed = false;
    Object.keys(rec.findings || {}).forEach(key => {
      const weakness = FINDING_TO_WEAKNESS[key];
      if (!weakness) return;
      const assisted = Object.entries(state.highestHintLevel).some(([trackId, level]) => {
        if (Number(level || 0) < 1) return false;
        const track = coachingTracks(caseId(rec)).find(item => item.id === trackId);
        return track && arr(track.weaknessIds).includes(weakness);
      });
      if (assisted) {
        if (!state.assistedCompletions.includes(weakness)) {
          state.assistedCompletions.push(weakness);
          changed = true;
        }
      } else if (!state.independentCompletions.includes(weakness) && !state.assistedCompletions.includes(weakness)) {
        state.independentCompletions.push(weakness);
        changed = true;
      }
    });
    if (changed) persistAssistance(state);
  }

  function toolForWeakness(weaknessId, options = {}) {
    const meta = WEAKNESS_CATALOG[weaknessId];
    if (!meta) return null;
    const reg = registry();
    const tools = [...(reg?.assessmentTools || []), ...(reg?.vitalTools || [])];
    let href = meta.practiceHref || '';
    let key = meta.practiceKey || '';
    if (key) {
      const tool = tools.find(item => item.key === key);
      if (tool?.url) href = tool.url;
    }
    if (!href) return null;
    const rec = options.record || record();
    const id = caseId(rec);
    const mode = trainingMode(rec);
    const returnTo = options.returnTo || `/vitals/visual-patient.html?case=${encodeURIComponent(id)}&training=${encodeURIComponent(mode)}`;
    const built = reg?.buildUrl?.(href, {
      caseId: id,
      returnTo,
      returnLabel: options.returnLabel || 'Return to Patient',
      context: 'learning-loop',
      key: key || weaknessId,
      training: mode,
      practiceFrom: 'debrief'
    }) || `${href}?case=${encodeURIComponent(id)}&return=${encodeURIComponent(returnTo)}`;
    return {
      weaknessId,
      label: meta.practiceLabel || `Practice ${meta.label}`,
      href: built,
      meta
    };
  }

  function criticalKeysFor(rec = record()) {
    const id = caseId(rec);
    const plan = window.EMSCodeSimScenarioDefinitions?.PHASE_PLANS?.[id];
    if (id === 'horse_crush') {
      return ['airway', 'breathing', 'perfusion', 'pelvis_hip', 'left_leg', 'distal_csm', 'sample', 'pain'];
    }
    return arr(plan?.requiredFindings).filter(key => key !== 'arrival_parking');
  }

  function buildStrengths(rec, evaluation) {
    const strengths = [];
    const findings = rec?.findings || {};
    const assistance = assistanceState(rec);
    const independent = new Set(assistance.independentCompletions);
    if (hasFinding(rec, 'scene_size_up') || hasFinding(rec, 'arrival_parking')) {
      strengths.push({ id: 'scene_size_up', text: 'Scene safety and initial impression' });
    }
    if (hasFinding(rec, 'airway')) strengths.push({ id: 'airway_assessment', text: 'Early airway assessment' });
    if (hasFinding(rec, 'breathing')) strengths.push({ id: 'breathing_assessment', text: 'Breathing assessment completed' });
    if (hasFinding(rec, 'perfusion')) strengths.push({ id: 'circulation_perfusion', text: 'Circulation / perfusion assessed' });
    if (hasFinding(rec, 'breath_sounds')) strengths.push({ id: 'breath_sounds', text: 'Breath sounds obtained' });
    if (hasFinding(rec, 'sample')) strengths.push({ id: 'sample', text: 'SAMPLE history gathered' });
    if (hasFinding(rec, 'pain')) strengths.push({ id: 'opqrst', text: 'OPQRST / pain assessment completed' });
    if (hasFinding(rec, 'distal_csm')) strengths.push({ id: 'distal_csm', text: 'Distal CSM documented' });
    if (treatmentCount(rec)) {
      const oxygenish = arr(rec.treatments).some(item => /oxygen|o2|bronchodilator|albuterol|splint|stabil|support|pain/i.test(text(item.name || item.treatment || item.description)));
      if (oxygenish) strengths.push({ id: 'treatment_selection', text: 'Appropriate supportive intervention recorded' });
      else strengths.push({ id: 'treatment_selection', text: 'Treatment decision recorded' });
    }
    if (phases()?.hasReassessmentAfterTreatment?.(rec)) {
      strengths.push({ id: 'reassessment', text: 'Reassessment after treatment' });
    }
    if (rec?.documentation?.handoff) strengths.push({ id: 'handoff', text: 'Hospital handoff documented' });
    // Prefer independently completed items in the "did well" list.
    const ranked = strengths.sort((a, b) => Number(independent.has(b.id)) - Number(independent.has(a.id)));
    if (!ranked.length && evaluation?.essentialComplete) {
      ranked.push({ id: 'life_threats', text: 'Essential call phases were completed' });
    }
    return ranked.slice(0, 6);
  }

  function buildNeedsPractice(rec, gradeOpportunities = [], critical = []) {
    const assistance = assistanceState(rec);
    const needs = [];
    const seen = new Set();
    const push = (weaknessId, detail, level = 0) => {
      const meta = WEAKNESS_CATALOG[weaknessId];
      if (!meta || seen.has(weaknessId)) return;
      seen.add(weaknessId);
      const practice = toolForWeakness(weaknessId, { record: rec });
      needs.push({
        id: weaknessId,
        label: meta.label,
        detail: detail || `Review ${meta.label.toLowerCase()} for this patient presentation.`,
        why: meta.why,
        hintLevel: level,
        practice
      });
    };

    Object.entries(assistance.highestHintLevel).forEach(([trackId, level]) => {
      if (Number(level || 0) < 1) return;
      const track = coachingTracks(caseId(rec)).find(item => item.id === trackId);
      arr(track?.weaknessIds).slice(0, 2).forEach(id => {
        const stillMissing = WEAKNESS_CATALOG[id]?.findingKey && !hasFinding(rec, WEAKNESS_CATALOG[id].findingKey);
        const detail = stillMissing
          ? `Needed Level ${level} coaching and the related finding was still incomplete at end of call.`
          : `Needed Level ${level} coaching before completing this skill.`;
        push(id, detail, Number(level));
      });
    });

    criticalKeysFor(rec).forEach(key => {
      if (hasFinding(rec, key)) return;
      const weakness = FINDING_TO_WEAKNESS[key];
      if (weakness) push(weakness, `This important assessment was not completed before the call ended.`, assistance.highestHintLevel[weakness] || 0);
    });

    if (!treatmentCount(rec)) push('treatment_selection', 'No treatment decision was recorded for this patient.');
    else if (!phases()?.hasReassessmentAfterTreatment?.(rec)) {
      push('reassessment', 'Treatment was recorded without a formal reassessment of response.');
    }
    if (!text(rec?.documentation?.transportPriority || rec?.impressions?.action)) {
      push('transport_decision', 'Transport urgency was not documented.');
    }
    if (!text(rec?.documentation?.handoff || rec?.documentation?.narrative)) {
      push('handoff', 'A verbal handoff / PCR narrative was not saved.');
    }

    // Scenario emphasis ordering
    const id = caseId(rec);
    const priorityOrder = id === 'horse_crush'
      ? ['scene_size_up', 'life_threats', 'circulation_perfusion', 'trauma_assessment', 'distal_csm', 'treatment_sequencing', 'reassessment', 'transport_decision', 'handoff']
      : id === 'asthma'
        ? ['life_threats', 'breathing_assessment', 'breath_sounds', 'spo2', 'treatment_selection', 'reassessment', 'sample', 'transport_decision', 'handoff']
        : ['life_threats', 'airway_assessment', 'breathing_assessment', 'circulation_perfusion', 'vital_signs', 'sample', 'treatment_selection', 'reassessment', 'handoff'];

    needs.sort((a, b) => {
      const ai = priorityOrder.indexOf(a.id); const bi = priorityOrder.indexOf(b.id);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || b.hintLevel - a.hintLevel;
    });

    // Keep opportunities text available as fallback details
    gradeOpportunities.slice(0, 2).forEach(textItem => {
      if (needs.length >= 5) return;
      if (/reassess/i.test(textItem) && !seen.has('reassessment')) push('reassessment', textItem);
      else if (/treatment/i.test(textItem) && !seen.has('treatment_selection')) push('treatment_selection', textItem);
      else if (/breath/i.test(textItem) && !seen.has('breathing_assessment')) push('breathing_assessment', textItem);
    });
    critical.slice(0, 2).forEach(textItem => {
      if (needs.length >= 5) return;
      if (/csm/i.test(textItem)) push('distal_csm', textItem, 3);
      else if (/breath/i.test(textItem)) push('breathing_assessment', textItem, 3);
      else push('life_threats', textItem, 3);
    });

    return needs.slice(0, 5);
  }

  function snapshotAttempt(rec = record(), grade = null) {
    if (!rec) return null;
    const id = caseId(rec);
    const assistance = assistanceState(rec);
    const needs = buildNeedsPractice(rec, grade?.opportunities || [], grade?.critical || []);
    const snapshot = {
      caseId: id,
      trainingMode: trainingMode(rec),
      savedAt: new Date().toISOString(),
      startedAt: rec.startedAt || null,
      score: grade?.score ?? rec?.documentation?.scenarioGrade ?? rec?.documentation?.debrief?.score ?? null,
      highestHintLevel: { ...assistance.highestHintLevel },
      assistedCompletions: [...assistance.assistedCompletions],
      independentCompletions: [...assistance.independentCompletions],
      skippedCritical: [...assistance.skippedCritical],
      needsPractice: needs.map(item => ({ id: item.id, label: item.label, hintLevel: item.hintLevel }))
    };
    const all = readJson(STORAGE_ATTEMPTS, {});
    const list = arr(all[id]);
    const startedAt = snapshot.startedAt;
    const existingIndex = list.findIndex(item => item.startedAt && startedAt && item.startedAt === startedAt);
    if (existingIndex >= 0) list[existingIndex] = snapshot;
    else list.push(snapshot);
    all[id] = list.slice(-6);
    writeJson(STORAGE_ATTEMPTS, all);
    return snapshot;
  }

  function previousAttempt(id = caseId()) {
    const list = arr(readJson(STORAGE_ATTEMPTS, {})[id]);
    return list.length >= 2 ? list[list.length - 2] : (list[0] || null);
  }

  function latestAttempt(id = caseId()) {
    const list = arr(readJson(STORAGE_ATTEMPTS, {})[id]);
    return list[list.length - 1] || null;
  }

  function compareImprovement(rec = record(), currentNeeds = null) {
    const id = caseId(rec);
    const prev = previousAttempt(id);
    const currentAssistance = assistanceState(rec);
    const needs = currentNeeds || buildNeedsPractice(rec);
    if (!prev) return [];

    const improvements = [];
    const prevHints = prev.highestHintLevel || {};
    const prevNeeds = new Set(arr(prev.needsPractice).map(item => item.id));

    Object.keys(WEAKNESS_CATALOG).forEach(weaknessId => {
      const findingKey = WEAKNESS_CATALOG[weaknessId].findingKey;
      const nowIndependent = currentAssistance.independentCompletions.includes(weaknessId)
        || (findingKey && hasFinding(rec, findingKey) && !currentAssistance.assistedCompletions.includes(weaknessId));
      const prevLevel = Number(prevHints[weaknessId] || 0);
      // Map track-level hints onto weaknesses from previous needsPractice
      const prevNeed = arr(prev.needsPractice).find(item => item.id === weaknessId);
      const prevHintLevel = Number(prevNeed?.hintLevel || prevLevel || 0);
      const stillNeeded = needs.some(item => item.id === weaknessId);
      if (prevNeeds.has(weaknessId) && nowIndependent && !stillNeeded) {
        improvements.push({
          id: weaknessId,
          label: WEAKNESS_CATALOG[weaknessId].label,
          previous: prevHintLevel ? `Needed Level ${prevHintLevel} coaching` : 'Needed practice',
          current: 'Completed independently',
          improved: true
        });
      } else if (prevHintLevel >= 2 && nowIndependent) {
        improvements.push({
          id: weaknessId,
          label: WEAKNESS_CATALOG[weaknessId].label,
          previous: `Needed Level ${prevHintLevel} coaching`,
          current: 'Completed independently',
          improved: true
        });
      }
    });

    // Also compare track hint levels directly
    Object.entries(prev.highestHintLevel || {}).forEach(([trackId, level]) => {
      const nowLevel = Number(currentAssistance.highestHintLevel[trackId] || 0);
      const track = coachingTracks(id).find(item => item.id === trackId);
      if (!track || Number(level) < 1) return;
      if (nowLevel === 0 && trackSatisfied(track, rec)) {
        const weaknessId = track.weaknessIds[0];
        if (improvements.some(item => item.id === weaknessId)) return;
        improvements.push({
          id: weaknessId || trackId,
          label: WEAKNESS_CATALOG[weaknessId]?.label || track.id,
          previous: `Needed Level ${level} coaching`,
          current: 'Completed independently',
          improved: true
        });
      }
    });

    return improvements.slice(0, 6);
  }

  function patientReturnUrl(rec = record()) {
    const id = caseId(rec);
    const mode = trainingMode(rec);
    return `/vitals/visual-patient.html?case=${encodeURIComponent(id)}&training=${encodeURIComponent(mode)}`;
  }

  function retryUrl(rec = record()) {
    const id = caseId(rec);
    const mode = trainingMode(rec);
    // Preserve attempt history in sessionStorage; reset clears patient record only.
    return `/vitals/visual-patient.html?case=${encodeURIComponent(id)}&training=${encodeURIComponent(mode)}&reset=1&retry=1`;
  }

  function rememberPracticeContext(weaknessId, rec = record()) {
    writeJson(STORAGE_CONTEXT, {
      caseId: caseId(rec),
      trainingMode: trainingMode(rec),
      weaknessId,
      returnTo: patientReturnUrl(rec),
      savedAt: new Date().toISOString()
    });
  }

  function practiceContext() { return readJson(STORAGE_CONTEXT, null); }

  function buildDebriefModel(rec = record(), grade = null) {
    if (!rec) return null;
    markFindingProgress(rec);
    const evaluation = grade?.evaluation || phases()?.evaluate?.(rec);
    const strengths = buildStrengths(rec, evaluation);
    const needsPractice = buildNeedsPractice(rec, grade?.opportunities || [], grade?.critical || []);
    const improvements = compareImprovement(rec, needsPractice);
    const assistance = assistanceState(rec);
    return {
      caseId: caseId(rec),
      trainingMode: trainingMode(rec),
      strengths,
      needsPractice,
      improvements,
      assistance,
      returnToPatient: patientReturnUrl(rec),
      retryScenario: retryUrl(rec)
    };
  }

  function debriefMarkup(model) {
    if (!model) return '';
    const strengthItems = model.strengths.length
      ? model.strengths.map(item => `<li><span class="ll-check" aria-hidden="true">✓</span><span>${esc(item.text)}</span></li>`).join('')
      : '<li><span>Keep building a complete primary assessment on the next attempt.</span></li>';
    const needCards = model.needsPractice.length
      ? model.needsPractice.map(item => `
        <article class="ll-need-card" data-weakness="${esc(item.id)}">
          <header><strong>${esc(item.label)}</strong>${item.hintLevel ? `<em>Hint L${item.hintLevel}</em>` : ''}</header>
          <p>${esc(item.detail)}</p>
          <p class="ll-why"><small>Why it matters</small>${esc(item.why)}</p>
          ${item.practice ? `<a class="ll-practice-btn" data-practice="${esc(item.id)}" href="${esc(item.practice.href)}">${esc(item.practice.label)}</a>` : ''}
        </article>`).join('')
      : '<article class="ll-need-card ok"><p>No major skill gaps were flagged for this attempt. Retry in Assessment Mode to confirm independent performance.</p></article>';
    const improveItems = model.improvements.length
      ? model.improvements.map(item => `
        <article class="ll-improve-card">
          <header><strong>${esc(item.label)}</strong><span class="ll-improved">Improved ✓</span></header>
          <p><small>Previous attempt</small>${esc(item.previous)}</p>
          <p><small>Current attempt</small>${esc(item.current)}</p>
        </article>`).join('')
      : '';
    return `
      <section class="ll-debrief" aria-label="Learning loop debrief">
        <div class="ll-debrief-head">
          <p class="eyebrow">Learning loop</p>
          <h2>Actionable debrief</h2>
          <p>Review strengths, practice weak skills, then return and retry this patient.</p>
        </div>
        <div class="ll-debrief-grid">
          <article class="ll-panel strengths">
            <small>What you did well</small>
            <ul>${strengthItems}</ul>
          </article>
          <article class="ll-panel needs">
            <small>Needs practice</small>
            <div class="ll-need-list">${needCards}</div>
          </article>
        </div>
        ${improveItems ? `<section class="ll-improve-block"><small>Improvement</small><div class="ll-improve-list">${improveItems}</div></section>` : ''}
        <div class="ll-debrief-actions">
          <a class="ll-btn secondary" href="${esc(model.returnToPatient)}">Return to Patient</a>
          <a class="ll-btn primary" href="${esc(model.retryScenario)}" data-retry-scenario="1">Retry This Patient</a>
        </div>
      </section>`;
  }

  function ensureCoachDock() {
    if (document.getElementById('learningLoopCoach')) return document.getElementById('learningLoopCoach');
    if (!/\/vitals\/visual-patient(?:\.html)?$/.test(location.pathname)) return null;
    const dock = document.createElement('aside');
    dock.id = 'learningLoopCoach';
    dock.className = 'll-coach-dock';
    dock.hidden = true;
    dock.setAttribute('aria-live', 'polite');
    dock.innerHTML = `
      <div class="ll-coach-card">
        <header>
          <small id="llCoachEyebrow">Learning coach</small>
          <button type="button" id="llCoachDismiss" aria-label="Dismiss coaching tip">×</button>
        </header>
        <p id="llCoachPrompt" class="ll-coach-prompt"></p>
        <p id="llCoachWhy" class="ll-coach-why"></p>
        <div class="ll-coach-actions">
          <button type="button" id="llCoachContinue" class="ll-btn secondary">Continue thinking</button>
          <button type="button" id="llCoachStronger" class="ll-btn primary">Need a stronger hint</button>
        </div>
        <div class="ll-coach-levels" aria-hidden="true">
          <span data-level="1">1</span><span data-level="2">2</span><span data-level="3">3</span>
        </div>
      </div>`;
    document.body.appendChild(dock);
    dock.querySelector('#llCoachDismiss')?.addEventListener('click', () => {
      markDismissed();
      dock.hidden = true;
      dock.dataset.suppressedUntil = String(Date.now() + 45000);
    });
    dock.querySelector('#llCoachContinue')?.addEventListener('click', () => {
      dock.hidden = true;
      dock.dataset.suppressedUntil = String(Date.now() + 35000);
    });
    dock.querySelector('#llCoachStronger')?.addEventListener('click', () => {
      const trackId = dock.dataset.trackId;
      const level = Math.min(MAX_HINT_LEVEL, Number(dock.dataset.level || 1) + 1);
      const track = coachingTracks().find(item => item.id === trackId);
      if (!track) return;
      showCoach(track, level, true);
    });
    return dock;
  }

  function showCoach(track, level, force = false) {
    if (!learningMode()) return;
    const dock = ensureCoachDock();
    if (!dock || !track) return;
    const suppressedUntil = Number(dock.dataset.suppressedUntil || 0);
    if (!force && suppressedUntil > Date.now() && Number(dock.dataset.level || 0) >= level) return;
    const hint = track.hints[level];
    if (!hint) return;
    const alreadyShowing = !dock.hidden && dock.dataset.trackId === track.id && Number(dock.dataset.level || 0) === level;
    if (alreadyShowing && !force) return;
    markHint(track.id, level, track.weaknessIds);
    dock.hidden = false;
    dock.dataset.trackId = track.id;
    dock.dataset.level = String(level);
    dock.dataset.suppressedUntil = '0';
    const eyebrow = dock.querySelector('#llCoachEyebrow');
    const prompt = dock.querySelector('#llCoachPrompt');
    const why = dock.querySelector('#llCoachWhy');
    const stronger = dock.querySelector('#llCoachStronger');
    if (eyebrow) eyebrow.textContent = level === 1 ? 'Clinical thinking' : level === 2 ? 'Assessment direction' : 'Action guidance';
    if (prompt) prompt.textContent = hint.prompt;
    if (why) why.textContent = hint.why ? `Why it matters: ${hint.why}` : '';
    if (stronger) stronger.hidden = level >= MAX_HINT_LEVEL;
    dock.querySelectorAll('.ll-coach-levels span').forEach(span => {
      span.classList.toggle('active', Number(span.dataset.level) <= level);
    });
  }

  function evaluateCoaching() {
    if (!learningMode()) {
      const dock = document.getElementById('learningLoopCoach');
      if (dock) dock.hidden = true;
      return null;
    }
    // Do not coach over hospital handoff / grade overlays.
    if (document.body.classList.contains('horse-grade-open') || document.body.classList.contains('hospital-handoff-open')) return null;
    const rec = record();
    if (!rec) return null;
    markFindingProgress(rec);
    const track = activeTrack(rec);
    if (!track) {
      const dock = document.getElementById('learningLoopCoach');
      if (dock) dock.hidden = true;
      return null;
    }
    const idle = lastActionMs(rec);
    const assistance = assistanceState(rec);
    const level = desiredHintLevel(track, idle, assistance);
    if (level < 1) return null;
    // Only auto-show when idle long enough for this level, or escalate from an existing tip.
    const existingLevel = Number(assistance.highestHintLevel[track.id] || 0);
    const dock = document.getElementById('learningLoopCoach');
    const showingLevel = dock && !dock.hidden ? Number(dock.dataset.level || 0) : 0;
    if (existingLevel && level > existingLevel && level > showingLevel) showCoach(track, level, true);
    else if (!existingLevel && idle >= (track.stallAfterMs || COACH_IDLE_MS.level1)) showCoach(track, 1, false);
    else if (existingLevel && idle >= COACH_IDLE_MS.level2 && existingLevel < MAX_HINT_LEVEL && (existingLevel + 1) > showingLevel) {
      showCoach(track, Math.min(MAX_HINT_LEVEL, existingLevel + 1), false);
    }
    return { track, level };
  }

  function mountDebrief(host, grade = null) {
    const rec = record();
    if (!host || !rec) return null;
    flushAssistanceToRecord(rec);
    const model = buildDebriefModel(rec, grade);
    snapshotAttempt(rec, grade);
    host.innerHTML = debriefMarkup(model);
    host.querySelectorAll('[data-practice]').forEach(link => {
      link.addEventListener('click', () => rememberPracticeContext(link.getAttribute('data-practice'), rec));
    });
    host.querySelectorAll('[data-retry-scenario]').forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault();
        prepareRetry(rec);
        location.href = model.retryScenario;
      });
    });
    return model;
  }

  function prepareRetry(rec = record()) {
    // Snapshot current attempt before clearing so improvement comparison works.
    flushAssistanceToRecord(rec);
    snapshotAttempt(rec);
    const id = caseId(rec);
    const mode = trainingMode(rec);
    try {
      sessionStorage.removeItem(liveKey(rec));
      api()?.clear?.();
      const partnerKey = window.EMSCodeSimScenarioSession?.partnerTaskKey?.(id);
      [partnerKey, partnerKey && `${partnerKey}_backup`, partnerKey && `${partnerKey}_shadow`,
        `emscodesim_scenario_${id}`, `emscodesim_scenario_${id}_backup`, `emscodesim_scenario_${id}_shadow`]
        .filter(Boolean).forEach(key => localStorage.removeItem(key));
    } catch (_) {}
    writeJson(STORAGE_CONTEXT, { caseId: id, trainingMode: mode, retrying: true, savedAt: new Date().toISOString() });
  }

  function enhanceHorseGrade() {
    if (caseId() !== 'horse_crush') return;
    const host = document.getElementById('horseGradeWorkspace');
    if (!host) return;
    let panel = document.getElementById('learningLoopHorsePanel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'learningLoopHorsePanel';
      panel.className = 'll-horse-panel';
      const actions = host.querySelector('.horse-grade-actions');
      if (actions?.parentElement) actions.parentElement.insertBefore(panel, actions);
      else host.appendChild(panel);
    }
    const grade = window.EMSCodeSimVisualPatient?.buildHorseCallGrade?.() || null;
    // Prefer live grade from visual-patient if exposed; otherwise build from record.
    mountDebrief(panel, grade ? { opportunities: grade.improvements || [], critical: grade.critical || [], score: grade.score } : null);
  }

  function enhanceFullDebrief(grade) {
    const report = document.getElementById('reportContent');
    if (!report) return null;
    let host = document.getElementById('learningLoopDebriefHost');
    if (!host) {
      host = document.createElement('section');
      host.id = 'learningLoopDebriefHost';
      host.className = 'report-section ll-debrief-host';
      const priorities = report.querySelector('#priorityList')?.closest('.report-section');
      if (priorities?.nextSibling) report.insertBefore(host, priorities.nextSibling);
      else report.insertBefore(host, report.querySelector('.ai-debrief-section') || null);
    }
    return mountDebrief(host, grade);
  }

  function injectReturnChip() {
    const context = practiceContext();
    if (!context?.returnTo || !context.caseId) return;
    if (/\/vitals\/visual-patient(?:\.html)?$/.test(location.pathname)) return;
    if (document.getElementById('learningLoopReturnChip')) return;
    const inScenario = params().get('mode') === 'scenario' || params().get('resume') === '1' || params().get('case');
    if (!inScenario && !context.weaknessId) return;
    const chip = document.createElement('div');
    chip.id = 'learningLoopReturnChip';
    chip.className = 'll-return-chip';
    chip.innerHTML = `
      <div>
        <small>Learning loop</small>
        <strong>Return to your patient when finished</strong>
      </div>
      <a class="ll-btn primary" href="${esc(context.returnTo)}">Return to Patient</a>`;
    document.body.appendChild(chip);
  }

  function onPatientPage() { return /\/vitals\/visual-patient(?:\.html)?$/.test(location.pathname); }
  function onDebriefPage() { return /\/vitals\/scenario-debrief(?:\.html)?$/.test(location.pathname); }

  let coachTimer = 0;
  function startCoachLoop() {
    if (!onPatientPage() || assessmentMode()) return;
    ensureCoachDock();
    evaluateCoaching();
    window.clearInterval(coachTimer);
    coachTimer = window.setInterval(evaluateCoaching, 8000);
  }

  function bindPatientEvents() {
    if (!onPatientPage()) return;
    window.addEventListener('emscodesim:scenario-updated', () => {
      markFindingProgress();
      evaluateCoaching();
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) evaluateCoaching(); });
    // When horse grade opens, attach remediation panel.
    try {
      const Observer = window.MutationObserver;
      if (typeof Observer === 'function' && document.body) {
        const observer = new Observer(() => {
          if (document.body.classList.contains('horse-grade-open')) enhanceHorseGrade();
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      }
    } catch (_) {}
    // Retry query handling: if reset+retry, ensure training mode persists after create.
    if (params().get('retry') === '1') {
      api()?.setDocumentation?.({ trainingMode: trainingMode(), learningLoop: emptyAssistance(), retryFromLearningLoop: true });
    }
  }

  function init() {
    injectReturnChip();
    if (onPatientPage()) {
      bindPatientEvents();
      startCoachLoop();
    }
    // Full-call debrief mounts the remediation panel from scenario-debrief.js.
  }

  window.EMSCodeSimLearningLoop = Object.freeze({
    WEAKNESS_CATALOG,
    FINDING_TO_WEAKNESS,
    COACHING_BY_CASE,
    trainingMode,
    assessmentMode,
    learningMode,
    assistanceState,
    evaluateCoaching,
    showCoach,
    buildDebriefModel,
    mountDebrief,
    enhanceFullDebrief,
    enhanceHorseGrade,
    toolForWeakness,
    compareImprovement,
    snapshotAttempt,
    flushAssistanceToRecord,
    prepareRetry,
    patientReturnUrl,
    retryUrl,
    rememberPracticeContext,
    practiceContext,
    markFindingProgress,
    activeTrack,
    criticalKeysFor
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
