EMSCodeSim Horse Scenario — Hospital Handoff 2.220

Replace only:
  vitals/visual-patient.html
  vitals/visual-patient.js
  vitals/visual-patient.css

Changes:
- Adds Hospital handoff as a treatment/workflow group after Transport.
- Transport Patient Update now directs the learner to Hospital handoff at arrival.
- On desktop, beginning handoff replaces the patient-photo area with a field-note handoff board.
- The note board is built only from data the learner actually documented during the call.
- Missing assessment/history/vital/treatment sections remain marked Not obtained / not documented.
- Notes are grouped into Patient/Mechanism, Primary Assessment, Focused Trauma Exam, Vitals, History, Treatment/Response, Reassessment, and Transport.
- Learner writes the verbal report in a dedicated handoff box and saves it.
- Sample Handoff opens separately and does not overwrite the learner's report.
- The sample uses only documented information, so it does not expose hidden scenario answers.
- Saving the hospital handoff writes documentation.handoff and handoffSavedAt, satisfying the scenario model's existing required Handoff phase.
- Scenario Progress/PCR and handoff shortcut opens the hospital handoff directly once transport is documented on desktop.

Build marker: HORSE HANDOFF 2.220
