/**
 * Deterministic grading engine — LLMs must not generate the core score.
 */
(function (global) {
  'use strict';

  function createGradingEngine(scenario) {
    const rules = scenario.gradingRules || {};
    const critical = scenario.criticalActions || [];

    function grade(sessionSnapshot) {
      const timeline = sessionSnapshot.timeline || [];
      const actions = new Set(timeline.map(e => e.action));
      const types = timeline.reduce((acc, e) => {
        acc[e.eventType] = acc[e.eventType] || [];
        acc[e.eventType].push(e);
        return acc;
      }, {});

      const domains = {
        scene: { label: 'Scene / initial impression', score: 0, max: 10, notes: [] },
        primary: { label: 'Primary assessment', score: 0, max: 15, notes: [] },
        history: { label: 'History', score: 0, max: 10, notes: [] },
        exam: { label: 'Physical examination', score: 0, max: 10, notes: [] },
        monitoring: { label: 'Monitoring', score: 0, max: 10, notes: [] },
        treatment: { label: 'Treatment', score: 0, max: 15, notes: [] },
        reassessment: { label: 'Reassessment', score: 0, max: 10, notes: [] },
        transport: { label: 'Transport decision', score: 0, max: 8, notes: [] },
        communication: { label: 'Communication / handoff', score: 0, max: 7, notes: [] },
        documentation: { label: 'Documentation', score: 0, max: 5, notes: [] }
      };

      const strengths = [];
      const opportunities = [];
      const missedCritical = [];
      const completedCritical = [];
      const inappropriate = [];
      const timelineFeedback = [];

      function findEvent(pred) {
        return timeline.find(pred);
      }
      function findAll(pred) {
        return timeline.filter(pred);
      }
      function hasMeta(key, value) {
        return timeline.some(e => e.metadata && e.metadata[key] === value);
      }
      function hasAssessment(id) {
        return timeline.some(e => e.eventType === 'assessment' && (e.metadata?.assessmentId === id || (e.action || '').includes(id)));
      }

      // Scene
      if (findEvent(e => e.action === 'Arrived on scene' || e.action === 'Arrived')) {
        domains.scene.score += 4;
        strengths.push('Scene arrival documented.');
      }
      if (hasAssessment('general_appearance') || hasAssessment('scene_sizeup')) {
        domains.scene.score += 6;
        const ev = findEvent(e => e.metadata?.assessmentId === 'general_appearance' || e.metadata?.assessmentId === 'scene_sizeup');
        if (ev) {
          timelineFeedback.push({
            type: 'strong',
            clock: formatClock(ev.timestamp),
            text: 'Initial impression / general appearance assessed.'
          });
        }
      } else {
        opportunities.push('Obtain a rapid general appearance / initial impression on arrival.');
        domains.scene.notes.push('Missing initial impression');
      }

      // Primary
      ['airway', 'breathing', 'circulation', 'mental_status'].forEach(id => {
        if (hasAssessment(id)) {
          domains.primary.score += 3;
        } else {
          domains.primary.notes.push(`Missing ${id}`);
        }
      });
      if (hasAssessment('lung_sounds')) {
        domains.primary.score += 3;
        domains.exam.score += 4;
        const ev = findEvent(e => e.metadata?.assessmentId === 'lung_sounds');
        if (ev) {
          timelineFeedback.push({
            type: 'strong',
            clock: formatClock(ev.timestamp),
            text: 'Lung sounds assessed during the respiratory evaluation.'
          });
        }
      } else {
        opportunities.push('Auscultate lung sounds early for a respiratory complaint.');
      }

      // History
      const discoveries = findAll(e => e.eventType === 'conversation' && e.metadata?.discovery);
      const discoveryIds = new Set(discoveries.map(e => e.metadata.discovery));
      ['onset', 'history', 'medications', 'allergies'].forEach(d => {
        if (discoveryIds.has(d)) domains.history.score += 2;
      });
      if (discoveryIds.size >= 3) {
        strengths.push('Relevant history elicited through questioning.');
      } else {
        opportunities.push('Ask focused SAMPLE/OPQRST questions; the patient will not volunteer everything.');
      }

      // Monitoring
      ['spo2', 'respiratory_rate', 'pulse', 'blood_pressure'].forEach(id => {
        if (hasAssessment(id) || hasMeta('monitorChannel', id) || hasMeta('vitalsKey', id)) {
          domains.monitoring.score += 2;
        }
      });
      if (sessionSnapshot.monitorChannels) {
        const channels = sessionSnapshot.monitorChannels;
        ['hr', 'spo2', 'rr', 'bp'].forEach(ch => {
          if (channels[ch]) domains.monitoring.score = Math.min(domains.monitoring.max, domains.monitoring.score + 1);
        });
      }

      // Treatment
      const treatments = findAll(e => e.eventType === 'treatment');
      const albuterol = treatments.find(e => /albuterol|duoneb|bronchodilator/i.test(e.action + JSON.stringify(e.metadata || {})));
      const oxygen = treatments.find(e => /oxygen|nrb|nasal|cpap|neb/i.test(e.action + JSON.stringify(e.metadata || {})));
      if (oxygen) {
        domains.treatment.score += 5;
        strengths.push('Oxygen / airway support initiated.');
      } else {
        opportunities.push('Initiate appropriate oxygen or nebulizer support for hypoxic respiratory distress.');
      }
      if (albuterol) {
        domains.treatment.score += 7;
        strengths.push('Bronchodilator therapy administered.');
        const dose = albuterol.metadata?.treatment?.dose || albuterol.metadata?.exactSelection?.dose;
        if (dose && /2\.5\s*mg/i.test(String(dose))) {
          domains.treatment.score += 2;
        }
      } else {
        opportunities.push('Administer an indicated bronchodilator for acute asthma exacerbation.');
      }

      // Inappropriate
      findAll(e => e.eventType === 'treatment').forEach(e => {
        const med = String(e.metadata?.treatment?.medication || e.action || '');
        if (/epinephrine|nitro|aspirin|naloxone/i.test(med) && !/racepinephrine/i.test(med)) {
          // Not always wrong, but for pure asthma without anaphylaxis flag as review
          if (!(scenario.patientProfile?.anaphylaxis)) {
            inappropriate.push({
              action: e.action,
              at: e.timestamp,
              detail: `${med} is not first-line for isolated asthma in this scenario — review indications.`
            });
            domains.treatment.score = Math.max(0, domains.treatment.score - 2);
          }
        }
      });

      // Reassessment
      const reassessEvents = findAll(e =>
        e.eventType === 'assessment' &&
        (e.metadata?.reassessment || /reassess/i.test(e.action) || e.metadata?.isReassessment)
      );
      const postTreatmentAssess = [];
      if (albuterol) {
        const afterTx = findAll(e =>
          e.eventType === 'assessment' &&
          e.timestamp >= albuterol.timestamp &&
          (e.metadata?.assessmentId === 'lung_sounds' || e.metadata?.assessmentId === 'spo2' || e.metadata?.assessmentId === 'respiratory_rate' || e.metadata?.assessmentId === 'work_of_breathing' || e.metadata?.assessmentId === 'breathing')
        );
        postTreatmentAssess.push(...afterTx);
      }
      if (reassessEvents.length || postTreatmentAssess.length) {
        domains.reassessment.score += 6;
        const first = postTreatmentAssess[0] || reassessEvents[0];
        if (albuterol && first) {
          const gap = first.timestamp - albuterol.timestamp;
          timelineFeedback.push({
            type: gap <= 180 ? 'strong' : 'opportunity',
            clock: formatClock(first.timestamp),
            text: gap <= 180
              ? `Reassessment performed ${Math.round(gap)}s after bronchodilator.`
              : `Albuterol at ${formatClock(albuterol.timestamp)}, but key reassessment delayed until ${formatClock(first.timestamp)}.`
          });
          if (gap > 180) {
            domains.reassessment.score = Math.min(domains.reassessment.score, 4);
            opportunities.push('Reassess lung sounds, SpO₂, and work of breathing sooner after treatment.');
          } else {
            domains.reassessment.score += 4;
            strengths.push('Timely post-treatment reassessment.');
          }
        }
      } else if (albuterol) {
        opportunities.push('After interventions, reassess vitals, lung sounds, and respiratory effort.');
        timelineFeedback.push({
          type: 'opportunity',
          clock: formatClock(albuterol.timestamp),
          text: `Albuterol administered at ${formatClock(albuterol.timestamp)}, but no documented reassessment of lungs/SpO₂/effort.`
        });
      }

      // Transport
      const transport = findEvent(e => e.eventType === 'transport' || /transport/i.test(e.action));
      if (transport) {
        domains.transport.score += 5;
        const priority = transport.metadata?.priority || transport.metadata?.transportPriority;
        if (priority && /emergent|priority 1|lights/i.test(String(priority))) {
          domains.transport.score += 3;
          strengths.push('Emergent transport priority selected for respiratory distress.');
        } else {
          domains.transport.score += 1;
          opportunities.push('Consider transport priority appropriate to severity.');
        }
      } else {
        opportunities.push('Make and document a transport decision.');
      }

      // Communication / handoff
      const handoff = findEvent(e => e.eventType === 'handoff' || /hospital notification|radio report|handoff/i.test(e.action));
      if (handoff) {
        domains.communication.score += 3;
        const report = String(handoff.metadata?.report || handoff.result || '');
        const expected = scenario.handoffExpectations?.requiredElements || ['age', 'chief', 'vitals', 'treatment', 'response', 'eta'];
        let hits = 0;
        const checks = {
          age: /\b\d{1,3}\b/,
          sex: /\b(male|female|man|woman)\b/i,
          chief: /breath|respir|asthma|short/i,
          vitals: /\b(spo2|o2|bp|hr|rr|respiratory)\b/i,
          treatment: /albuterol|oxygen|nebul/i,
          response: /improv|wors|unchang|response/i,
          eta: /\beta\b|\bminute/i,
          history: /asthma|inhaler|allerg/i
        };
        expected.forEach(el => {
          const key = String(el).toLowerCase();
          if (checks[key] && checks[key].test(report)) hits += 1;
        });
        domains.communication.score += Math.min(4, hits);
        if (hits < expected.length / 2) {
          opportunities.push('Include age/sex, chief complaint, findings, vitals, treatments, response, and ETA in the radio report.');
        } else {
          strengths.push('Hospital notification covered key clinical elements.');
        }
      } else {
        opportunities.push('Provide a hospital notification / handoff report.');
      }

      // Documentation
      const pcr = sessionSnapshot.pcrComparison;
      if (pcr) {
        const accuracy = Number(pcr.accuracyScore ?? 0);
        domains.documentation.score = Math.round(clamp(accuracy * domains.documentation.max, 0, domains.documentation.max));
        (pcr.discrepancies || []).slice(0, 5).forEach(d => opportunities.push(`Documentation: ${d}`));
        if ((pcr.discrepancies || []).length === 0) strengths.push('PCR matched the event timeline.');
      } else if (sessionSnapshot.pcrSubmitted) {
        domains.documentation.score += 2;
      } else {
        opportunities.push('Complete PCR documentation after handoff.');
      }

      // Critical actions
      critical.forEach(ca => {
        const matched = timeline.some(e => {
          if (ca.matchAction && ca.matchAction instanceof RegExp) return ca.matchAction.test(e.action);
          if (ca.matchAction) return e.action === ca.matchAction || (e.action || '').includes(ca.matchAction);
          if (ca.assessmentId) return e.metadata?.assessmentId === ca.assessmentId;
          if (ca.eventType && ca.actionIncludes) {
            return e.eventType === ca.eventType && (e.action || '').toLowerCase().includes(String(ca.actionIncludes).toLowerCase());
          }
          if (ca.discovery) return e.metadata?.discovery === ca.discovery;
          return false;
        });
        // Also allow string patterns from JSON
        const matchedAlt = !matched && ca.actionIncludes
          ? timeline.some(e => (e.action || '').toLowerCase().includes(String(ca.actionIncludes).toLowerCase()) || JSON.stringify(e.metadata || {}).toLowerCase().includes(String(ca.actionIncludes).toLowerCase()))
          : false;

        if (matched || matchedAlt) {
          completedCritical.push(ca);
        } else {
          missedCritical.push(ca);
          opportunities.push(`Critical action missed: ${ca.label || ca.id}`);
        }
      });

      // Clamp domain scores
      Object.values(domains).forEach(d => {
        d.score = clamp(d.score, 0, d.max);
        d.percent = d.max ? Math.round((d.score / d.max) * 100) : 0;
      });

      const totalScore = Object.values(domains).reduce((s, d) => s + d.score, 0);
      const totalMax = Object.values(domains).reduce((s, d) => s + d.max, 0);
      const percent = totalMax ? Math.round((totalScore / totalMax) * 100) : 0;

      return {
        percent,
        totalScore: round(totalScore, 1),
        totalMax,
        domains,
        strengths,
        opportunities: unique(opportunities),
        completedCritical: completedCritical.map(c => ({ id: c.id, label: c.label })),
        missedCritical: missedCritical.map(c => ({ id: c.id, label: c.label, why: c.why || '' })),
        inappropriate,
        timelineFeedback,
        generatedAt: Date.now(),
        deterministic: true
      };
    }

    return { grade };
  }

  function formatClock(seconds) {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function round(n, d = 0) { const f = 10 ** d; return Math.round(n * f) / f; }
  function unique(arr) { return Array.from(new Set(arr)); }

  const api = { createGradingEngine, formatClock };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.PSV2 = global.PSV2 || {};
  global.PSV2.Grading = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
