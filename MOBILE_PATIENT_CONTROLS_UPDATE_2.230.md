# Mobile Patient / Controls Workspace 2.230

Changed files:
- visual-patient.html
- visual-patient.css
- visual-patient.js

Phone interface changes:
- Patient View is the default phone view.
- Replaced the crowded five-button photo navigation with one Clinical Controls switch.
- Clinical Controls opens a full-height workspace instead of a partial bottom sheet.
- Assessment, Vitals, History, Treatment, and Log stay available as bottom tabs inside Controls.
- Patient View button remains visible at the top of the controls workspace for one-tap return to the patient.
- Scenario state and the selected clinical tab are preserved when switching views.
- Patient View keeps the patient photo, live Patient Update, and active follow-up together.
- The horse scenario no longer stacks the full current-assessment workspace under the photo on phones.
- Desktop Clinical Workstation 2.221 behavior is retained.
- Build stamp/cache version updated to Responsive Workstation 2.230.

Validation:
- JavaScript syntax check passed.
- Active-site validator passed.
- Unified clinical workspace test passed.
- Patient interview test passed.
- Treatment workflow test passed.
- Scenario persistence test passed.

Two older project tests still report pre-existing expectation mismatches around the Care Log wording and legacy repeatable-workflow UI. These were not introduced by the mobile view switch.
