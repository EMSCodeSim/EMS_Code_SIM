# Scenario Reliability and Patient Record Unification

## What changed

- Added one canonical patient-record schema for all scenario findings.
- Automatically migrates older saved findings:
  - `bp` → `blood_pressure`
  - `bgl` → `blood_glucose`
  - `breathSounds` → `breath_sounds`
  - additional respiratory, mental-status, and assessment aliases are normalized.
- Updated the scenario runtime and visual patient to read and write the same finding keys.
- Corrected the scenario Pupils link to `/vitals/pupil.html`.
- Added automatic scenario-step progress based on the actual patient record.
- Removed manual step-completion toggles from the scenario launcher.
- Added back/forward-cache recovery for the blood-pressure and respiratory-rate simulators.
- Added page-return refresh behavior so newly saved findings appear immediately.
- Updated full-vitals documentation to use the active scenario profile through the shared runtime.
- Removed the retired GPT endpoint and legacy scenario files listed in `FILES_TO_DELETE.txt`.

## Validation performed

- Site validator passed with no broken internal references or JavaScript syntax errors.
- Production build completed successfully: 420 files, approximately 28.5 MB.
- Patient-record legacy migration test passed.
- Runtime alias and vital-formatting test passed.
- Scenario progress synchronization test passed.
- Modified inline simulator JavaScript syntax checks passed.
