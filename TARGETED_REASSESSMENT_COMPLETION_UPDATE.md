# Targeted Reassessment and Completion Rules

## What changed

- Every appropriate treatment now creates reassessment requirements from its `targetKeys`.
- A generic post-treatment reassessment no longer clears unrelated treatment targets.
- Each affected finding must be reassessed after the most recent treatment that changed it.
- A single formal reassessment may cover several targets only when all target keys are explicitly recorded.
- A newer treatment makes its affected findings due again.
- Contraindicated, premature, or unnecessary treatment decisions remain available for grading but do not create false clinical reassessment requirements.
- Scenario progress now displays `X of Y treatment targets reassessed`.
- Completion messages identify the exact missing reassessments, such as `Reassess SpO₂` or `Reassess Breath sounds`.

## Examples

- Oxygen: breathing, respiratory rate, and SpO₂.
- Bronchodilator: breathing, breath sounds, respiratory rate, and SpO₂.
- Oral glucose: mental status, blood glucose, and airway protection.
- Airway positioning or ventilation: airway, breathing, respiratory rate, and SpO₂ as applicable.
- Hemorrhage/shock care: perfusion, pulse, blood pressure, and skin signs.

## Validation

Run `npm run test:targeted-reassessment` or the complete `npm run build` command.
