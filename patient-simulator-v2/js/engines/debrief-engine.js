/**
 * AI debrief helper — uses grading + timeline; never changes deterministic grade.
 * Works offline with scripted instructor prompts; optional Netlify AI phrasing.
 */
(function (global) {
  'use strict';

  function createDebriefEngine(scenario, gradeResult, timeline, patientOutcome) {
    const topics = scenario.debriefTopics || [];
    const turns = [];
    let index = 0;

    function buildLocalQuestions() {
      const questions = [];
      const missed = gradeResult?.missedCritical || [];
      const feedback = gradeResult?.timelineFeedback || [];
      const clinicalTopics = topics.slice();

      // Physiology teaching point for asthma fatigue
      questions.push({
        id: 'rr_fatigue',
        prompt: 'Your patient’s respiratory rate may fall while mental status and air movement worsen. What would that suggest to you?',
        expectedThemes: ['fatigue', 'failure', 'not improvement', 'impending', 'CO2', 'tiring'],
        teach: 'A falling respiratory rate with worsening mental status and quieter breath sounds suggests respiratory fatigue and impending failure — not improvement.'
      });

      clinicalTopics.forEach(t => {
        questions.push({
          id: t.id || `topic_${questions.length}`,
          prompt: t.prompt,
          expectedThemes: t.expectedThemes || [],
          teach: t.teach || t.teachingPoint || ''
        });
      });

      missed.slice(0, 2).forEach(m => {
        questions.push({
          id: `missed_${m.id}`,
          prompt: `You missed a critical action: ${m.label}. Why does that matter on this call?`,
          expectedThemes: [],
          teach: m.why || 'Critical actions protect the patient from preventable deterioration.'
        });
      });

      feedback.filter(f => f.type === 'opportunity').slice(0, 2).forEach((f, i) => {
        questions.push({
          id: `opp_${i}`,
          prompt: `Reflect on this timing note: "${f.text}" What would you change next time?`,
          expectedThemes: ['reassess', 'earlier', 'sequence'],
          teach: 'Reassessment closes the loop after treatment and catches deterioration early.'
        });
      });

      questions.push({
        id: 'outcome',
        prompt: `Patient outcome trend was "${patientOutcome || 'unknown'}". What findings told you the patient was improving or deteriorating?`,
        expectedThemes: ['spo2', 'wheeze', 'speech', 'work of breathing', 'mental'],
        teach: 'Track work of breathing, speech, SpO₂, air movement, and mentation together — not a single vital in isolation.'
      });

      return questions;
    }

    const queue = buildLocalQuestions();

    function nextQuestion() {
      if (index >= queue.length) {
        return {
          done: true,
          summary: {
            gradeUnchanged: true,
            percent: gradeResult?.percent,
            message: 'Debrief complete. Your deterministic grade was not modified by this discussion.',
            topicsCovered: turns.length
          }
        };
      }
      const q = queue[index];
      return { done: false, index, total: queue.length, question: q };
    }

    function evaluateAnswer(answerText) {
      const q = queue[index];
      if (!q) return nextQuestion();
      const normalized = String(answerText || '').toLowerCase();
      const hits = (q.expectedThemes || []).filter(theme => normalized.includes(String(theme).toLowerCase()));
      const solid = hits.length > 0 || normalized.length > 40;
      const evaluation = {
        solid,
        hits,
        instructorReply: solid
          ? `Good reasoning. ${q.teach}`
          : `Consider this: ${q.teach}`,
        gradeUnchanged: true,
        authoritativePercent: gradeResult?.percent
      };
      turns.push({
        questionId: q.id,
        prompt: q.prompt,
        answer: answerText,
        evaluation
      });
      index += 1;
      return {
        evaluation,
        next: nextQuestion()
      };
    }

    function getTranscript() {
      return turns.map(t => ({ ...t }));
    }

    function getAuthoritativeGrade() {
      return gradeResult ? { ...gradeResult, immutable: true } : null;
    }

    return {
      nextQuestion,
      evaluateAnswer,
      getTranscript,
      getAuthoritativeGrade,
      getTopics: () => queue.slice()
    };
  }

  const api = { createDebriefEngine };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.PSV2 = global.PSV2 || {};
  global.PSV2.Debrief = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
