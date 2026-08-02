# Patient Care Log Update — v1.4.2

## What changed

- The in-scenario Findings tab is now a complete chronological patient-care log.
- Every recorded assessment finding, history item, vital sign, treatment, reassessment, clinical impression, and final documentation update can appear in one ordered list.
- SAMPLE and OPQRST are normalized into the shared record so they no longer remain separate from the scenario findings.
- Repeat vital signs create separate timeline events instead of replacing the earlier event. The current finding summary still keeps the newest result.
- Treatments and reassessments are logged with their own timestamps and sequence numbers.
- The Findings tab and full Patient Record include quick filters for:
  - All log
  - Vitals
  - Treatments
- The Treatments filter includes both the intervention and the follow-up reassessment.
- Each log item displays:
  - sequence number;
  - clock time;
  - elapsed scenario time when available;
  - event type;
  - finding or treatment;
  - supporting details.
- The Findings tab includes direct buttons to record a treatment or open the full patient record.
- Scenario state mirrors the complete care log so findings and care events can be restored after partial local-storage loss.

## Validation

The production build now runs a dedicated patient-care log contract test in addition to the existing source, scenario, persistence, and deployment checks.

```bash
npm run build
```

The care-log test confirms that SAMPLE, OPQRST, repeat vital signs, treatment, reassessment, filtering, and chronological order remain connected.
