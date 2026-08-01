# EMSCodeSim Connected Scenario Update — 1.3.0

## What changed

- Scenario findings now save through one central session layer.
- Every accepted finding is written to both the active patient record and the scenario state.
- Missing findings are restored when one storage copy survives and the other does not.
- Opening a scenario simulator directly with `?case=<scenario>` creates or restores the correct patient instead of depending on the launcher having already run.
- Pupil scenarios no longer require pupil size. Learners must assess equality, each pupil's light response, gaze position, and tracking.
- Skin scenarios display a normal skin reference beside the patient's sample.
- The visual-patient and guided-assessment screens display the complete assessment tool registry.
- Airway, breathing, and perfusion assessments cross-link to related vital and assessment simulators without revealing the answer.
- Linked simulators include an always-visible return path to the originating assessment and a separate Patient Home path.
- Recording an airway, breathing, or perfusion finding unlocks a direct treatment button.
- The treatment simulator now offers monitoring/no treatment, positioning, suction, OPA, NPA, FBAO care, oxygen, BVM, CPAP, LMA, intubation, surgical airway, and other scenario treatments with scope labels.
- Treatment pages display the recorded source finding and return to the assessment that launched them.

## Reliability checks

`npm run build` now runs all of the following before producing `dist`:

1. Static site validation
2. Scenario contract verification
3. Scenario persistence test
4. Public production build
5. Production-output validation

The persistence test verifies direct scenario entry, patient/scenario mirrored saves, treatment and reassessment storage, and recovery after partial local-storage loss.

The Playwright suite includes connected pupil, skin, assessment-link, treatment-unlock, navigation-return, vital-save, reload, timer, audio, and deployment-exclusion tests.

## Deployment

Deploy the generated `dist` directory, or use the included clean production ZIP. Retired and source-only files remain automatically excluded by the deployment policy.
