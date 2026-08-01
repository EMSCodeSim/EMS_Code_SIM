# EMSCodeSim Scenario Workflow Update — 1.3.1

## Changes

- Scenario vital simulators save the learner's entered result without requiring a correct answer.
- Each saved result includes the expected scenario finding and an accuracy flag for final debrief review.
- Blood pressure, pulse, respirations, SpO2, blood glucose, temperature, pupils, skin, AVPU, and breath sounds follow the same deferred-feedback model.
- Scenario debrief scores and displays vital accuracy, showing the expected finding only when review is needed.
- Intermediate assessment, clinical-impression, treatment, and reassessment pages no longer require repeated PCR narratives.
- Optional short notes remain available, while the complete narrative stays in the final PCR/handoff activity.
- Skin assessment now provides tactile clues such as cool and wet, cool and clammy/tacky, warm and dry, or hot and sweaty.

## Validation

Run:

```bash
npm run build
```

The build validates source files, scenario contracts, persistence, clean production output, and retired-file exclusions.
