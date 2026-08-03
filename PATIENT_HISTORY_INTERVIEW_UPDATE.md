# Patient History & Communication Update

## What changed

The patient simulator bottom bar now uses:

**Assessment | Vitals | History | Treatment | Log**

Transport remains inside Treatment as a clinical decision and no standalone Transport tab was added.

## New History workspace

- Patient, caregiver, family, or witness communication status
- Scenario-specific patient responses
- Current problem questions
- OPQRST questions
- Allergies, medications, and medical history
- Last oral intake and events leading to the call
- Natural-language custom question matching
- Realistic repeated-question responses
- Known patient information summary
- Automatic patient-care log entries
- Automatic SAMPLE completion after all required history areas are obtained
- Automatic OPQRST completion when all required symptom questions are obtained
- Direct links to the full SAMPLE and OPQRST learning tools

## Scenario behavior

Each of the five current scenarios has its own historian and communication limitations:

- Respiratory distress: alert patient answering in short sentences
- Stroke: patient plus family for timing and collateral history
- Hypoglycemia: confused patient plus coworker
- Trauma: anxious patient in severe pain
- Pediatric illness: caregiver provides most of the history

The feature does not reveal the complete history at once. Information appears only after the learner asks an appropriate question.

## Validation

Run:

```bash
npm run test:patient-interview
npm run build
```
