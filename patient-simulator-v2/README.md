# Patient Simulator V2

Clean, isolated EMS patient simulation architecture for EMSCodeSim.

## Route

- Production: `/patient-simulator-v2/`
- Legacy (rollback): `/vitals/visual-patient.html` and `/patient-simulator-legacy`

## Architecture

Clinical logic is deterministic and separate from AI:

| Module | Role |
|---|---|
| `scenarios/adult-asthma.js` | Data-driven scenario source of truth |
| `js/engines/patient-state-engine.js` | Physiology, progression, treatment effects |
| `js/engines/event-timeline.js` | Canonical call timeline |
| `js/engines/assessment-engine.js` | Findings revealed only on assessment |
| `js/engines/treatment-engine.js` | Exact medication/equipment recording |
| `js/engines/video-state-controller.js` | Video follows clinical state |
| `js/engines/conversation-engine.js` | Fact-constrained patient dialogue |
| `js/engines/grading-engine.js` | Deterministic scoring |
| `js/engines/pcr-engine.js` | PCR vs timeline comparison + OCR confirm gate |
| `js/engines/debrief-engine.js` | Instructor debrief (cannot change grade) |
| `js/engines/session.js` | Full session lifecycle / clean reset |

AI (optional Netlify function `/api/patient-simulator-v2-chat`) may phrase conversation or hospital replies from supplied facts only.

## First scenario

Adult Asthma / Respiratory Distress — dispatch through debrief.

## Tests

```bash
npm run test:patient-simulator-v2
```
