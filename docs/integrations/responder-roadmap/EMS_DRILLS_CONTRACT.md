# EMSCodeSim ↔ Responder Roadmap Integration Contract

## Ownership

| System | Owns |
| --- | --- |
| **EMSCodeSim** | Interactive EMS drill experience, scoring, local practice receipt, secure completion emit |
| **Responder Roadmap** | Department assignment, member roster, evaluator administration, training records, RMS export workflow |
| **Agency RMS** | Long-term official department record when the department uses that workflow |

EMSCodeSim is **not** an LMS. Roadmap must not require EMSCodeSim accounts for drill practice.

## Catalog

Roadmap Training Officers can browse drills via:

`GET https://emscodesim.com/.netlify/functions/ems-drill-catalog`

Response includes stable `id`, `version`, category, certification levels, duration, difficulty, crew type, completion type, summary, and launch URLs.

## Launch

Roadmap mints a signed, expiring launch token with the shared secret and opens:

```
https://emscodesim.com/ems-drill.html?id=<drillId>&token=<signedToken>
```

### Token payload

```json
{
  "v": 1,
  "iss": "responderroadmap",
  "aud": "emscodesim",
  "drillId": "ems-respiratory-distress-001",
  "drillVersion": 1,
  "assignmentId": "asg_...",
  "requirementId": "req_...",
  "membershipId": "mem_...",
  "departmentId": "dept_...",
  "returnUrl": "https://responderroadmap.com/my-task-books/...",
  "callbackUrl": "https://responderroadmap.com/api/v1/integrations/emscodesim/complete",
  "attemptNumber": 1,
  "iat": 1710000000,
  "exp": 1710021600,
  "jti": "uuid"
}
```

Token format: `base64url(json).base64url(hmac_sha256(body, shared_secret))`

Do **not** put names, emails, DOB, or clinical PHI in the URL.

EMSCodeSim validates the token with `POST /.netlify/functions/ems-drill-session` before granting Roadmap completion credit.

## Completion callback

On successful drill completion, EMSCodeSim posts:

```json
{
  "event": "ems_drill.completed",
  "drillId": "ems-respiratory-distress-001",
  "drillVersion": 1,
  "assignmentId": "asg_...",
  "requirementId": "req_...",
  "membershipId": "mem_...",
  "completionId": "cmp_...",
  "status": "completed",
  "completedAt": "2026-09-24T22:15:00.000Z",
  "durationSeconds": 540,
  "score": 88,
  "passed": true,
  "evaluatorId": null,
  "attemptNumber": 1
}
```

Headers:

- `Content-Type: application/json`
- `X-EMSCodeSim-Signature: sha256=<hmac_hex>`
- `X-EMSCodeSim-Event: ems_drill.completed`

### Roadmap verification checklist

1. Signature valid
2. Assignment exists
3. Drill ID matches assignment
4. Token/assignment still eligible
5. `completionId` not already recorded (idempotent)

Recommended Roadmap status after verified callback: mark the linked requirement **SUBMITTED** / completed-for-assignment with `EMSCodeSim verified` evidence. Do **not** invent evaluator sign-off unless your product rules explicitly map evaluator-verified drills to official sign-off.

## Failure behavior

If the callback fails, EMSCodeSim keeps a local pending sync and retries. The provider sees **Completion saved — waiting to sync** and is not forced to repeat a passed drill.

## Environment

Shared by both apps:

- `EMSCODESIM_ROADMAP_SHARED_SECRET` (or `ROADMAP_EMSCODESIM_SHARED_SECRET`)

EMSCodeSim optional:

- `ROADMAP_COMPLETION_CALLBACK_URL` default callback if not embedded in token

## Standalone use

If no token is present, EMS Drills run as normal free practice. No Roadmap callback is attempted.

## Reference implementation

See `roadmap-reference/` in this folder for drop-in Responder Roadmap files (this Cloud Agent workspace cannot push to the ResponderRoadmap repository).
