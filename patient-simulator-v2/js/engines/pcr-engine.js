/**
 * PCR / documentation comparison against the event timeline.
 * OCR foundation: confirmExtractedText() must run before gradeFromOcr().
 */
(function (global) {
  'use strict';

  function createPcrEngine(scenario, timeline) {
    let draft = blankPcr();
    let submitted = null;
    let ocrPending = null;
    let ocrConfirmed = null;

    function blankPcr() {
      return {
        patientAge: '',
        patientSex: '',
        chiefComplaint: '',
        history: '',
        allergies: '',
        medications: '',
        assessmentFindings: '',
        vitals: '',
        treatments: '',
        responseToTreatment: '',
        transportPriority: '',
        destination: '',
        narrative: '',
        reassessments: ''
      };
    }

    function update(fields) {
      draft = { ...draft, ...fields };
      return { ...draft };
    }

    function getDraft() {
      return { ...draft };
    }

    /**
     * OCR foundation — never grade raw OCR without learner confirmation.
     */
    function ingestOcrRaw(extractedText, meta = {}) {
      ocrPending = {
        rawText: String(extractedText || ''),
        receivedAt: Date.now(),
        meta: { ...meta },
        status: 'awaiting_confirmation'
      };
      ocrConfirmed = null;
      return { ...ocrPending };
    }

    function confirmExtractedText(correctedText, parsedFields = {}) {
      if (!ocrPending) {
        throw new Error('No OCR capture awaiting confirmation.');
      }
      ocrConfirmed = {
        text: String(correctedText || ocrPending.rawText),
        fields: { ...parsedFields },
        confirmedAt: Date.now(),
        originalRaw: ocrPending.rawText
      };
      ocrPending = { ...ocrPending, status: 'confirmed' };
      if (parsedFields && Object.keys(parsedFields).length) {
        update(parsedFields);
      } else if (ocrConfirmed.text) {
        update({ narrative: ocrConfirmed.text });
      }
      return { ...ocrConfirmed };
    }

    function canGradeOcr() {
      return Boolean(ocrConfirmed);
    }

    function compare(pcr = draft) {
      const events = timeline.list();
      const discrepancies = [];
      const matches = [];

      const treatments = events.filter(e => e.eventType === 'treatment');
      const assessments = events.filter(e => e.eventType === 'assessment');
      const textBlob = Object.values(pcr).join(' \n ').toLowerCase();

      treatments.forEach(tx => {
        const med = String(tx.metadata?.treatment?.medication || tx.metadata?.treatment?.name || '').toLowerCase();
        const dose = String(tx.metadata?.treatment?.dose || '').toLowerCase();
        if (med && !textBlob.includes(med.split(' ')[0])) {
          discrepancies.push(`Treatment performed but not documented: ${tx.action}`);
        } else if (med) {
          matches.push(`Documented treatment: ${med}`);
          if (dose && pcr.treatments && !String(pcr.treatments).toLowerCase().includes(dose.replace(/\s+/g, '')) && !String(pcr.treatments).toLowerCase().includes(dose)) {
            // soft check on dose accuracy
            if (dose && !textBlob.includes(dose) && !textBlob.includes(dose.replace(' ', ''))) {
              discrepancies.push(`Possible inaccurate or missing medication dose for ${med} (expected ${tx.metadata.treatment.dose}).`);
            }
          }
        }
      });

      const lung = assessments.find(e => e.metadata?.assessmentId === 'lung_sounds');
      if (lung && !/lung|wheez|breath sound|auscult/i.test(textBlob)) {
        discrepancies.push('Important assessment omitted from PCR: lung sounds.');
      }

      const spo2 = assessments.find(e => e.metadata?.assessmentId === 'spo2' || e.metadata?.vitalsKey === 'spo2');
      if (spo2 && !/spo2|o2 sat|oxygen sat|%\b/i.test(textBlob)) {
        discrepancies.push('SpO₂ obtained but not clearly documented.');
      }

      const reassess = assessments.filter(e => e.metadata?.isReassessment || e.metadata?.reassessment);
      const postTx = treatments[0]
        ? assessments.filter(e => e.timestamp >= treatments[0].timestamp && ['lung_sounds', 'spo2', 'respiratory_rate', 'breathing'].includes(e.metadata?.assessmentId))
        : [];
      if ((reassess.length > 0 || postTx.length > 0) && !/reassess|response|improved|unchanged|worsened/i.test(textBlob)) {
        discrepancies.push('Reassessment / treatment response omitted from documentation.');
      } else if (treatments.length && !/reassess|response|improved|unchanged|worsened/i.test(pcr.responseToTreatment + pcr.reassessments + pcr.narrative)) {
        discrepancies.push('Missing reassessment or treatment response narrative.');
      }

      if (pcr.allergies && scenario.patientProfile?.allergies) {
        const expected = String(scenario.patientProfile.allergies).toLowerCase();
        const got = String(pcr.allergies).toLowerCase();
        if (expected.includes('nkda') && !(got.includes('nkda') || got.includes('no known'))) {
          discrepancies.push('Allergy documentation does not match scenario facts.');
        }
      }

      if (!String(pcr.narrative || '').trim() && !String(pcr.chiefComplaint || '').trim()) {
        discrepancies.push('PCR narrative / chief complaint is empty.');
      }

      const expectedItems = Math.max(1, treatments.length + (lung ? 1 : 0) + (spo2 ? 1 : 0) + 2);
      const accuracyScore = clamp(1 - discrepancies.length / expectedItems, 0, 1);

      return {
        discrepancies,
        matches,
        accuracyScore,
        expectedItems,
        ocrUsed: Boolean(ocrConfirmed),
        gradedFromConfirmedOcrOnly: ocrConfirmed ? true : false
      };
    }

    function submit(pcr = draft) {
      const comparison = compare(pcr);
      submitted = {
        pcr: { ...pcr },
        comparison,
        submittedAt: Date.now(),
        elapsed: timeline.list().slice(-1)[0]?.timestamp ?? 0
      };
      timeline.push({
        timestamp: submitted.elapsed,
        eventType: 'documentation',
        action: 'PCR submitted',
        result: `${comparison.discrepancies.length} discrepancy(ies)`,
        clinicalStateBefore: null,
        clinicalStateAfter: null,
        metadata: { comparison }
      });
      return submitted;
    }

    function getSubmitted() {
      return submitted ? { ...submitted, pcr: { ...submitted.pcr } } : null;
    }

    function reset() {
      draft = blankPcr();
      submitted = null;
      ocrPending = null;
      ocrConfirmed = null;
    }

    return {
      blankPcr,
      update,
      getDraft,
      ingestOcrRaw,
      confirmExtractedText,
      canGradeOcr,
      compare,
      submit,
      getSubmitted,
      reset,
      getOcrPending: () => (ocrPending ? { ...ocrPending } : null),
      getOcrConfirmed: () => (ocrConfirmed ? { ...ocrConfirmed } : null)
    };
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  const api = { createPcrEngine };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.PSV2 = global.PSV2 || {};
  global.PSV2.Pcr = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
