# Patient Scenario Tool Canonicalization

This document defines which EMSCodeSim assessment and vital-sign tools are canonical for the patient simulator. The goal is to prevent future scenarios from wiring to older duplicate pages while preserving compatibility for learning-center links until they can be audited safely.

## Canonical scenario assessment routes

| Clinical task | Canonical route |
| --- | --- |
| Scene size-up / first impression | `/vitals/visual-patient.html` |
| Airway | `/vitals/visual-airway-assessment.html` |
| Breathing / chest | `/vitals/respiratory-assessment-visual.html` |
| Circulation / distal CSM | `/vitals/distal-csm-assessment.html` |
| Mental status / AVPU | `/vitals/avpu-scenario.html` |
| Pupils | `/vitals/pupil-scenario.html` |
| Motor / sensory / stroke | `/vitals/visual-neuro-stroke-assessment.html` |
| GCS | `/vitals/gcs.html` |
| Breath sounds | `/vitals/breath-sounds-scenario.html` |
| Skin | `/vitals/skin-scenario.html` |
| Abdomen / pelvis | `/vitals/abdomen-pelvis-visual.html` |
| Rapid trauma exam | `/vitals/visual-trauma-body-exam.html` |
| Pain / OPQRST | `/vitals/pain-opqrst.html` |
| SAMPLE | `/vitals/sample-history.html` |
| Pediatric Assessment Triangle | `/vitals/pediatric-assessment-triangle.html` |
| Rule of Nines | `/vitals/nines.html` |

## Canonical measurable vital routes

- Blood pressure: `/vitals/bp-scenario.html`
- Pulse: `/vitals/pulse-scenario.html`
- Respiratory rate: `/vitals/respiratory-rate-scenario.html`
- SpO2: `/vitals/pulse-ox-scenario.html`
- Blood glucose: `/vitals/bgl-scenario.html`
- Temperature: `/vitals/temperature-scenario.html`

Breath sounds, pupils, skin, and mental status remain available from Vitals when clinically useful, but they are also assessment findings and may appear in the Assessment workspace.

## Compatibility-only legacy pages

The following older narrative pages are **not canonical scenario destinations**. Do not add new patient-scenario links to them. They remain temporarily for compatibility with older learning-center content and bookmarks while references are audited:

- `/vitals/airway-assessment.html`
- `/vitals/breathing-assessment.html`
- `/vitals/perfusion-assessment.html`
- `/vitals/chest-assessment.html`
- `/vitals/abdominal-assessment.html`
- `/vitals/trauma-assessment.html`
- `/vitals/motor-sensory-assessment.html`
- `/vitals/aao.html`

Once inbound references have been audited, each should either redirect to its canonical replacement or be retired.

## Instructor / utility tool

`/vitals/full-vitals-set.html` is an instructor/debug/rapid-setup utility. It should not be presented as a normal learner action in Assessment Mode because it bypasses bedside acquisition of individual vital signs.

## Horse-crush scenario presentation

The horse-crush encounter should keep the bedside workflow compact rather than display every tool equally.

### Primary / immediate
- Airway
- Breathing
- Circulation

### Focused examination
- Head
- Eyes / pupils
- Mental status
- Chest
- Breath sounds
- Abdomen
- Pelvis / hip
- Lower extremity
- Distal CSM

### Core vitals
- Blood pressure
- Pulse
- Respiratory rate
- SpO2

### More assessments
Blood glucose, temperature, GCS, broader neurologic/stroke examination, skin signs, and other scenario-capable tools remain available when the learner chooses to go deeper.

The patient simulator remains non-linear: learners may assess, obtain vitals, take history, treat, move/package, transport, and reassess in clinically reasonable order. This document controls routing and presentation, not a mandatory skill-sheet sequence.
