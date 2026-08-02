# Scenario SAMPLE History Audit

Each active patient scenario now owns a complete SAMPLE history instead of borrowing a generic practice case by array index.

Audited scenarios:
- Respiratory Distress: asthma history, rescue inhaler use, trigger, prior severity, intake, and pertinent negatives.
- Possible Acute Stroke: exact last-known-well and symptom-onset times, medications, risk factors, intake, and pertinent negatives.
- Altered Mental Status: insulin use, missed meal, diabetic history, onset, collateral source, and pertinent negatives.
- Blunt Trauma: collision mechanism, restraint/airbag details, chest and abdominal symptoms, medications/anticoagulants, intake, and loss-of-consciousness status.
- Sick Pediatric Patient: caregiver-supplied fever/respiratory history, medication dose timing, birth/immunization/chronic-history information, intake, onset, and pertinent negatives.

A new test verifies that every scenario includes all six SAMPLE fields and scenario-specific clinical details.
