EMSCodeSim 2.322 Scenario Photo Fix

ROOT CAUSE
scenario-definitions.js referenced image files that do not exist:
- /vitals/assets/scenario-patient-adult-v3.webp (missing)
- /vitals/assets/scenario-patient-pediatric-v3.webp (missing)

The project actually contains:
- /vitals/assets/scenario-patient-adult-v3.png
- /vitals/assets/scenario-patient-pediatric-v3.png
- /vitals/assets/scenario-patient-horse-crush.webp

FIX
- All adult scenario definitions now use the real .png file.
- Pediatric now uses the real .png file.
- Horse crush continues to use its real .webp file.
- Removed the horse-specific hard-coded override in visual-patient.js.
- Added tools/test-scenario-image-assets.js.
- npm run build now fails if a configured scenario image is missing.

Full production build passes.
Visible build: DESKTOP CLINICAL 2.322
