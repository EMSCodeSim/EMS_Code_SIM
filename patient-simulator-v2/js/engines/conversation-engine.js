/**
 * Fact-constrained patient conversation.
 * AI may phrase answers naturally but cannot invent clinical facts.
 * Local deterministic matcher is the always-available source of truth.
 */
(function (global) {
  'use strict';

  function normalize(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function includesAny(haystack, needles) {
    return needles.some(n => haystack.includes(n));
  }

  function createConversationEngine(scenario, timeline, patientEngine) {
    const facts = scenario.conversationFacts || scenario.patientProfile || {};
    const profile = scenario.patientProfile || {};
    const history = [];
    const discovered = new Set();

    const FACT_RESPONSES = [
      {
        id: 'onset',
        patterns: ['when did', 'how long', 'when this started', 'started', 'onset', 'began'],
        factKey: 'onset',
        answer: () => facts.onset || 'It started a little while ago.',
        discovery: 'onset'
      },
      {
        id: 'chief',
        patterns: ['what.s wrong', 'what happened', 'why did you call', 'chief', 'bothering', 'feeling'],
        factKey: 'chiefComplaint',
        answer: () => `I can't catch my breath. ${facts.chiefComplaint ? `It's ${facts.chiefComplaint}.` : ''}`.trim(),
        discovery: 'chiefComplaint'
      },
      {
        id: 'history_asthma',
        patterns: ['asthma', 'history', 'have this before', 'happen before', 'medical history', 'problems before'],
        factKey: 'history',
        answer: () => {
          const hx = profile.history || facts.history || [];
          if (hx.includes('asthma') || hx.some?.(h => /asthma/i.test(h))) {
            return 'I have asthma. I\'ve had it for years.';
          }
          return Array.isArray(hx) && hx.length ? `I have ${hx.join(', ')}.` : 'I don\'t think I have any major medical problems.';
        },
        discovery: 'history'
      },
      {
        id: 'medications',
        patterns: ['medication', 'meds', 'what do you take', 'prescription', 'which inhaler', 'what inhaler do'],
        factKey: 'medications',
        answer: () => {
          const meds = profile.medications || facts.medications || [];
          if (!meds.length) return 'I don\'t take any medications regularly.';
          const attempts = facts.inhalerAttempts ?? profile.inhalerAttempts;
          const base = `I use ${meds.join(' and ')}.`;
          if (attempts != null) return `${base} I already used my inhaler about ${attempts} times and it barely helped.`;
          return base;
        },
        discovery: 'medications'
      },
      {
        id: 'inhaler_use',
        patterns: ['used your inhaler', 'use your inhaler', 'inhaler today', 'inhaler help', 'did it help', 'how many puffs', 'how many times', 'rescue inhaler'],
        factKey: 'inhalerUse',
        answer: () => {
          const attempts = facts.inhalerAttempts ?? profile.inhalerAttempts;
          const medication = (profile.medications || facts.medications || []).find(m => /albuterol/i.test(m)) || 'rescue inhaler';
          if (attempts == null) return 'I tried my inhaler, but it has not helped much.';
          return `I used my ${medication} about ${attempts} times today... it barely helped.`;
        },
        discovery: 'inhaler_use'
      },
      {
        id: 'recent_steroid_use',
        patterns: ['steroid', 'prednisone', 'prednisolone', 'dexamethasone'],
        factKey: 'recentSteroidUse',
        answer: () => facts.recentSteroidUse || 'I do not remember taking steroids for this episode.',
        discovery: 'recent_steroid_use'
      },
      {
        id: 'allergies',
        patterns: ['allerg', 'nkda', 'reaction'],
        factKey: 'allergies',
        answer: () => {
          const a = profile.allergies || facts.allergies || 'NKDA';
          return a === 'NKDA' || /no known/i.test(a) ? 'No known drug allergies.' : `I'm allergic to ${a}.`;
        },
        discovery: 'allergies'
      },
      {
        id: 'hospitalizations',
        patterns: ['hospital', 'intubat', 'icu', 'admitted', 'ever been this bad'],
        factKey: 'previousHospitalizations',
        answer: () => {
          const hosp = facts.previousHospitalizations ?? profile.previousHospitalizations;
          const intub = facts.previousIntubation ?? profile.previousIntubation;
          let out = hosp != null ? `I've been hospitalized for breathing problems about ${hosp} times.` : 'I\'ve been to the hospital for this before.';
          if (intub === false) out += ' They have never had to put a tube in my throat.';
          if (intub === true) out += ' I have been intubated before.';
          return out;
        },
        discovery: 'severity_history'
      },
      {
        id: 'trigger',
        patterns: ['trigger', 'brought this on', 'cause', 'dust', 'exercise', 'walking', 'expos'],
        factKey: 'trigger',
        answer: () => facts.trigger || 'I was walking and suddenly couldn\'t catch my breath.',
        discovery: 'trigger'
      },
      {
        id: 'severity_now',
        patterns: ['how bad', 'scale', 'worse', 'better', 'compared'],
        factKey: 'severityDescription',
        answer: () => {
          const clinical = patientEngine?.snapshotClinical?.() || {};
          if (clinical.clinicalState === 'improving' || clinical.outcomeTrend === 'improving') {
            return facts.improvingPhrase || 'A little better — still tight, but I can talk more.';
          }
          if (clinical.clinicalState === 'severe' || clinical.clinicalState === 'impending_failure') {
            return facts.severePhrase || 'Worse... can\'t... get air...';
          }
          return facts.severityDescription || 'It\'s hard to breathe. I can only get a few words out.';
        },
        discovery: 'current_severity'
      },
      {
        id: 'chest_pain',
        patterns: ['chest pain', 'pressure in your chest', 'chest hurt'],
        factKey: 'chestPain',
        answer: () => facts.chestPain || 'No chest pain — just tightness from not getting air.',
        discovery: 'pertinent_negative_chest_pain'
      },
      {
        id: 'fever',
        patterns: ['fever', 'sick', 'infection', 'cold', 'recent illness', 'been ill', 'feel ill'],
        factKey: 'fever',
        answer: () => facts.fever || 'No fever. This came on pretty fast.',
        discovery: 'pertinent_negative_fever'
      },
      {
        id: 'last_oral',
        patterns: ['last eat', 'last meal', 'oral intake', 'when did you eat', 'ate'],
        factKey: 'lastOralIntake',
        answer: () => facts.lastOralIntake || 'I ate a few hours ago.',
        discovery: 'last_oral_intake'
      },
      {
        id: 'name_age',
        patterns: ['your name', 'how old', 'age'],
        factKey: 'identity',
        answer: () => {
          const name = profile.name || 'the patient';
          const age = profile.age || scenario.scenarioMetadata?.patientAge;
          const sex = profile.sex || scenario.scenarioMetadata?.patientSex;
          return `I'm ${name}${age ? `, ${age}` : ''}${sex ? ` ${sex}` : ''}.`.replace(/\s+/g, ' ');
        },
        discovery: 'identity'
      }
    ];

    function answerFromFacts(learnerText) {
      const q = normalize(learnerText);
      if (!q) {
        return {
          reply: '…',
          matchedFact: null,
          matchedFacts: [],
          discovery: null,
          discoveries: [],
          source: 'local'
        };
      }

      // Refuse to invent vitals / doses if asked directly — point learner to assess/monitor.
      if (includesAny(q, ['what is my spo2', 'what is my oxygen', 'blood pressure', 'heart rate', 'vital signs', 'what dose', 'how much albuterol'])) {
        return {
          reply: 'I don\'t know those numbers — you\'ll have to check me.',
          matchedFact: null,
          matchedFacts: [],
          discovery: null,
          discoveries: [],
          source: 'local',
          redirectedToAssessment: true
        };
      }

      const speech = patientEngine?.snapshotClinical?.()?.speech;
      if (speech === 'unable_to_speak') {
        return {
          reply: '…can\'t… talk…',
          matchedFact: null,
          matchedFacts: [],
          discovery: null,
          discoveries: [],
          source: 'local'
        };
      }

      // Match every clearly requested fact so a compound question does not silently
      // lose its second part. Limit single-word speech to one fact and keep answers short.
      const matches = FACT_RESPONSES.filter(entry => includesAny(q, entry.patterns));
      const selected = speech === 'single_words' ? matches.slice(0, 1) : matches.slice(0, 3);
      if (selected.length) {
        const replies = selected.map(entry => String(entry.answer() || '').trim()).filter(Boolean);
        const reply = replies.length > 1 ? replies.join('... ') : (replies[0] || '');
        const matchedFacts = selected.map(entry => entry.factKey);
        const discoveries = selected.map(entry => entry.discovery).filter(Boolean);
        return {
          reply,
          matchedFact: matchedFacts[0] || null,
          matchedFacts,
          discovery: discoveries[0] || null,
          discoveries,
          source: 'local',
          factValue: matchedFacts.length === 1
            ? (facts[matchedFacts[0]] ?? profile[matchedFacts[0]] ?? null)
            : Object.fromEntries(matchedFacts.map(key => [key, facts[key] ?? profile[key] ?? null]))
        };
      }

      // Vague fallback — does not dump full SAMPLE/OPQRST.
      if (speech === 'single_words') {
        return {
          reply: 'Can\'t... talk...',
          matchedFact: 'speech_limit',
          matchedFacts: ['speech_limit'],
          discovery: null,
          discoveries: [],
          source: 'local'
        };
      }

      return {
        reply: facts.defaultReply || 'I\'m having a hard time talking. What do you need to know?',
        matchedFact: null,
        matchedFacts: [],
        discovery: null,
        discoveries: [],
        source: 'local'
      };
    }

    function ask(learnerText, options = {}) {
      const elapsed = patientEngine?.getFullState?.()?.elapsedTime ?? 0;
      const result = answerFromFacts(learnerText);

      // Optional AI phrasing cannot change facts — only allowed when provided by caller
      // after server validation. Local engine remains authoritative for fact values.
      if (options.aiPhrasing && result.matchedFact && options.aiPhrasing.factKey === result.matchedFact) {
        const phrased = String(options.aiPhrasing.reply || '').trim();
        if (phrased) result.reply = phrased;
        result.source = 'ai_phrased_local_facts';
      }

      history.push({ role: 'learner', text: learnerText, at: elapsed });
      history.push({ role: 'patient', text: result.reply, at: elapsed, fact: result.matchedFact });

      const newlyDiscovered = [];
      for (const item of (result.discoveries || (result.discovery ? [result.discovery] : []))) {
        if (!discovered.has(item)) {
          discovered.add(item);
          newlyDiscovered.push(item);
        }
      }
      timeline.push({
        timestamp: elapsed,
        eventType: 'conversation',
        action: newlyDiscovered.length
          ? `History discovered: ${newlyDiscovered.join(', ')}`
          : 'Patient conversation',
        result: result.reply,
        clinicalStateBefore: patientEngine?.snapshotClinical?.() || null,
        clinicalStateAfter: patientEngine?.snapshotClinical?.() || null,
        metadata: {
          discovery: newlyDiscovered[0] || result.discovery || null,
          discoveries: newlyDiscovered,
          matchedFact: result.matchedFact,
          matchedFacts: result.matchedFacts || [],
          learnerQuestion: learnerText
        }
      });

      return { ...result, discoveries: Array.from(discovered) };
    }

    /**
     * Guard: ensure an AI-proposed reply does not introduce facts absent from profile.
     * Returns sanitized reply or null if unsafe.
     */
    function sanitizeAiReply(proposed, allowedFactKeys) {
      const text = String(proposed || '').trim();
      if (!text) return null;
      const banned = [
        /\d+\s*%/,
        /\d+\s*\/\s*\d+/,
        /\b\d+\s*mg\b/i,
        /\bspo2\b/i,
        /\bintubat(?:ed|ion)\b/i,
        /\ballergic to\b/i
      ];
      // If AI invents numeric vitals/doses, reject.
      if (banned.some(re => re.test(text))) {
        // Allow allergy line only if allergies fact is being answered
        if (/\ballergic to\b/i.test(text) && allowedFactKeys?.includes('allergies')) {
          /* ok */
        } else if (/\bintubat/i.test(text) && (allowedFactKeys?.includes('previousHospitalizations') || allowedFactKeys?.includes('previousIntubation'))) {
          /* ok */
        } else {
          return null;
        }
      }
      return text.slice(0, 400);
    }

    function getFacts() {
      return { ...facts, ...profile };
    }

    function getHistory() {
      return history.map(h => ({ ...h }));
    }

    function getDiscoveries() {
      return Array.from(discovered);
    }

    function reset() {
      history.length = 0;
      discovered.clear();
    }

    return {
      ask,
      answerFromFacts,
      sanitizeAiReply,
      getFacts,
      getHistory,
      getDiscoveries,
      reset,
      FACT_RESPONSES
    };
  }

  const api = { createConversationEngine, normalize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.PSV2 = global.PSV2 || {};
  global.PSV2.Conversation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
