/**
 * Treatment engine — records exact selections; effects applied via patient-state engine.
 * Does NOT show immediate correct/incorrect feedback.
 */
(function (global) {
  'use strict';

  function createTreatmentEngine(scenario, patientEngine, timeline) {
    const available = scenario.availableTreatments || {};
    const effects = scenario.treatmentEffects || {};
    const administered = [];

    function listCategories() {
      return Object.keys(available).map(key => ({
        id: key,
        label: available[key].label || key,
        items: (available[key].items || []).map(item => ({ ...item }))
      }));
    }

    function findItem(treatmentId) {
      for (const [category, group] of Object.entries(available)) {
        for (const item of group.items || []) {
          if (item.id === treatmentId) return { ...item, category };
        }
      }
      return null;
    }

    function administer(selection) {
      const catalogItem = findItem(selection.id || selection.medication);
      const treatment = {
        id: selection.id || catalogItem?.id || selection.medication,
        medication: selection.medication || catalogItem?.medication || catalogItem?.name || selection.id,
        dose: selection.dose != null ? selection.dose : (catalogItem?.defaultDose || null),
        route: selection.route || catalogItem?.defaultRoute || null,
        device: selection.device || catalogItem?.defaultDevice || null,
        category: selection.category || catalogItem?.category || 'medications',
        name: catalogItem?.name || selection.medication || selection.id
      };

      // Optional contraindication check — records event but still allows action (training).
      const contra = (catalogItem?.contraindications || []).filter(Boolean);
      const warnings = [];
      if (contra.length) {
        warnings.push(...contra);
      }

      const effectKey = treatment.id || treatment.medication;
      const effectConfig = effects[effectKey] || effects[String(treatment.medication || '').toLowerCase()] || {};
      const before = patientEngine.snapshotClinical();
      const applied = patientEngine.applyTreatmentEffect(treatment, effectConfig);
      const after = applied.after;

      const record = {
        ...treatment,
        at: patientEngine.getFullState().elapsedTime,
        warnings,
        effectApplied: Boolean(effectConfig)
      };
      administered.push(record);

      const event = timeline.push({
        timestamp: record.at,
        eventType: 'treatment',
        action: `${treatment.name || treatment.medication} administered`,
        result: [
          treatment.dose ? `Dose: ${treatment.dose}` : null,
          treatment.route ? `Route: ${treatment.route}` : null,
          treatment.device ? `Device: ${treatment.device}` : null
        ].filter(Boolean).join(' · ') || 'Administered',
        clinicalStateBefore: before,
        clinicalStateAfter: after,
        metadata: {
          treatment: record,
          exactSelection: { ...selection },
          warnings
        }
      });

      return { record, event, before, after, warnings };
    }

    function getAdministered() {
      return administered.map(x => ({ ...x }));
    }

    function reset() {
      administered.length = 0;
    }

    return {
      listCategories,
      findItem,
      administer,
      getAdministered,
      reset
    };
  }

  const api = { createTreatmentEngine };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.PSV2 = global.PSV2 || {};
  global.PSV2.Treatment = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
