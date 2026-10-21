# Clinical question-bank release review — pending

**Scope:** `quiz/emt_quiz.json` (191 EMT items) and `quiz/paramedic_quiz.json` (37 paramedic items). All 228 are currently labeled as drafts. Automated structural validation is **not** clinical approval.

## Reviewer workflow

A licensed, currently practicing EMS clinician/medical director or appropriately qualified EMS educator should review **each item** against current applicable NREMT test plans, AHA resuscitation guidance, neonatal resuscitation guidance, and relevant state/local EMS protocols. This material is independent educational practice content, **not official NREMT exam content**.

For every item, record: bank and zero-based index, reviewer, review date, clinical reference (title/version/link), correctness of stem and keyed answer, whether another option is also defensible, whether distractors are plausible and comparable, accuracy of rationale, EMT vs paramedic scope, and disposition (approve/revise/remove). Record revisions and re-review. Do not mark the bank approved based solely on automated tests.

## Priority review flags

- **EMT 58:** Historical TIA definition using symptom resolution within 24 hours can mislead; contemporary evaluation is tissue-based and any transient focal deficit needs urgent stroke evaluation. Revise the answer choices and stem.
- **EMT 91:** PDE-5 inhibitor nitrate avoidance interval depends on agent and local protocol; avoid an unqualified universal 48-hour rule.
- **EMT 106:** Adult rescue breathing target should align with current AHA guidance (approximately one breath every six seconds).
- **EMT 132:** Commercial tourniquet location varies with wound visibility, junctional injuries, and tactical circumstances.
- **EMT 136:** Prefer a vented chest seal when available; reassess for tension physiology.
- **EMT 173:** Do not delay newborn positive-pressure ventilation for routine suctioning.
- **All items:** Examine distractors for implausible choices, answer-position patterns, and stems that remain recall questions with a superficial vignette.

## Release gate

- [ ] All 228 questions individually reviewed, with reviewer and reference evidence
- [ ] Ambiguous/outdated items revised and re-reviewed
- [ ] Automated `validate` and `validate-quiz-bank` checks successful at final commit
- [ ] No unresolved security or merge blockers
- [ ] Production quiz smoke test on EMT and paramedic pages
- [ ] Reviewer/owner authorizes publication

**Status:** Pending independent item-level clinical review. Do not merge solely because CI passes.
