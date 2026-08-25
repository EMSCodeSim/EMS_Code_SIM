# EMSCodeSim Platform Improvement Roadmap

**Audience:** product owner / implementers  
**Scope:** Visual patient simulator, skill drills, career UX, technical health, engagement  
**Philosophy constraints:** free core tools, local-first / privacy-friendly, education support (never replaces approved programs or protocols), mobile-first for students  
**Date:** 2026-08-25

This document is an honest, prioritized plan based on the current architecture under `/vitals/` (scenario engine), homepage career personalization, prep/quiz loops, and Netlify static hosting. Prefer incremental ROI over platform rewrites.

---

## Architecture snapshot (current)

| Layer | Location | Notes |
|--------|----------|--------|
| Full-call runtime | `vitals/visual-patient.html` + `visual-patient.js` (~5.4k LOC) | Tabs, treatments, horse-specialized grade/handoff |
| Scenario data | `vitals/scenario-definitions.js` | 6 cases: asthma, stroke, hypoglycemia, trauma, pediatric, horse_crush |
| Persistence | `vitals/patient-record.js`, `scenario-session.js` | localStorage + backup/shadow keys |
| Mini-sims | `*-scenario.html` + overlay/embedded scripts | iframe tools over patient photo |
| Condition engine | `CONDITION_STAGES` + horse `horseClinicalState` | Dual systems |
| Debrief | `scenario-debrief.js` (core cases) + in-app horse grade | Split scoring paths |
| Public launch | `vitals/scenario-launcher.html` | Picture → Learning/Assessment |
| Career stage | `index.html` inline + `emscodesim-career-stage` | Homepage-only personalization |
| Backend | None for core tools | GPT Netlify function retired by design |

**Competitive position vs Full Code / SimX:** strong free access, solid horse production case, good mini-sim craft; weaker on scenario library surfacing, visual deterioration fidelity, unified Full-Code-style debrief teaching, and modular engine maintainability.

---

## High-level roadmap (phases)

### Phase A — Unlock what you already built (now → next sprint)
Surface the 5 defined non-horse cases, fix dead visual condition CSS, repair prep progress wiring, deepen debrief “why this matters,” route homepage CTAs through the library.

### Phase B — Mobile call quality (next)
One-thumb “what’s next” for abnormal findings → treat/reassess (without violating the no-`nextActionCard` contract), faster mini-sim open, reduce overlay friction, unify horse vs medical debrief UX.

### Phase C — Library depth & visuals (medium)
Distinct patient art per case, timed condition stage polish, branching treatments with clearer contraindications, protocol drill ↔ scenario bridges.

### Phase D — Engine health (larger, planned)
Split `visual-patient.js` into modules, single debrief engine, optional JSON scenario packs, portfolio export that merges prep + scenarios + quizzes—still local-first.

### Phase E — Optional premium (only if needed later)
Cloud sync / instructor dashboards as **optional** add-ons—never gate core sims or prep.

---

## Recommendations (P0–P3)

### P0-1 — Scenario library: expose all defined cases + filters
- **Problem / opportunity:** Six scenarios exist in `scenario-definitions.js`, but the launcher previously hard-coded only `horse_crush`. Students cannot practice asthma/stroke/AMS/trauma/pediatric without knowing deep URLs.
- **Why it matters:** Biggest free competitive gap vs paid libraries; uses work already paid for in data + node tests.
- **Approach:** Build gallery from `EMSCodeSimScenarioDefinitions.CATALOG` + `PATIENT_CASES`; featured badge for horse; filters All / Featured / Medical / Trauma / Pediatric; homepage CTAs → `/vitals/scenario-launcher.html`.
- **Files:** `vitals/scenario-launcher.js|.html|.css`, `index.html`, `tools/test-scenario-selection-menu.js`, `test/interaction/scenario-flow.spec.js`
- **Effort:** Low–Medium | **Priority:** P0
- **Status:** Implemented in this PR
- **Trade-off:** Core cases still share stock adult/pediatric photos (less cinematic than horse). Label honestly as “Core case” vs “Featured.”

### P0-2 — Patient condition visuals actually apply
- **Problem:** Condition engine sets `#patientImage.dataset.conditionMode`, but CSS targeted `.patient-image` (class missing) → deterioration filters never showed.
- **Why it matters:** Free realism win; students *see* fatigue/critical without new art.
- **Approach:** Add `.patient-image` class; CSS for `#patientImage[data-condition-mode…]`; subtle pulse for `-worse` with `prefers-reduced-motion` respect.
- **Files:** `vitals/visual-patient.html`, `vitals/visual-patient.css`
- **Effort:** Low | **Priority:** P0
- **Status:** Implemented in this PR

### P0-3 — Fix daily prep progress key mismatch
- **Problem:** `daily-practice.js` looked for legacy keys (`expectations`, `terminology`, …) while `emt-prep.js` stores `understanding-ems`, `emt-school-expectations`, …
- **Why it matters:** Homepage “X of 12 modules” stuck near zero → prep loop feels broken.
- **Approach:** Align to `emt-prep.js` keys; accept legacy aliases.
- **Files:** `daily-practice.js`
- **Effort:** Low | **Priority:** P0
- **Status:** Implemented in this PR

### P0-4 — Debrief “Why this matters” teaching points
- **Problem:** Core-case debrief scores phases but under-explains *clinical* stakes (Full Code differentiator).
- **Why it matters:** Sticky learning; Assessment Mode needs post-call teaching without mid-call spoilers.
- **Approach:** Add `whyItMatters[]` to `SCENARIO_EXPECTATIONS`; render section in debrief HTML.
- **Files:** `vitals/scenario-debrief.js`, `vitals/scenario-debrief.html`
- **Effort:** Low | **Priority:** P0
- **Status:** Implemented in this PR
- **Follow-up:** Port equivalent teaching into horse in-app grade panel (P1).

---

### P1-1 — Unify scoring / debrief across horse and medical cases
- **Problem:** Horse grade lives in `visual-patient.js`; medical cases use `scenario-debrief.js`. Different UX and metrics.
- **Why it matters:** One “finish the call → learn” habit; easier instructor trust.
- **Approach:** Extract shared `debrief-engine.js` (category weights, critical errors, coaching priorities, whyItMatters). Horse UI becomes a view over the same engine.
- **Effort:** High | **Priority:** P1

### P1-2 — Stronger abnormal-finding → treat → reassess loop on mobile
- **Problem:** `clinicalNextActions` exists but is generic; contract forbids a permanent `nextActionCard` on the patient home.
- **Why it matters:** Phone users need progressive disclosure without hunting tabs.
- **Approach:** Enrich `#clinicalNextActions` buttons to deep-link indicated treatments / reassessment targets from `TREATMENT_PLANS` + phase model; keep panel dismissible/ephemeral.
- **Files:** `visual-patient.js`, treatment plan evidence fields
- **Effort:** Medium | **Priority:** P1
- **Constraint:** Do not reintroduce `id="nextActionCard"` / `updateNextAction` (contract tests).

### P1-3 — Scenario-aware mini-sim cold start performance
- **Problem:** Each embedded tool loads a full HTML page in an iframe.
- **Why it matters:** Jank on phones kills “five-minute practice.”
- **Approach:** Prefetch next likely tool URL after primary ABC; reuse iframe document when same tool reopened; compress/lazy horse video; `fetchpriority` on patient image.
- **Effort:** Medium | **Priority:** P1

### P1-4 — Distinct patient artwork for core cases
- **Problem:** Asthma/stroke/trauma share one adult PNG → weak visual differentiation.
- **Why it matters:** Memory + immersion; library feels “real.”
- **Approach:** Commission or generate 1 hero still per case (webp); keep SVG reasoning cards; wire `PATIENT_CASES[].image`.
- **Effort:** Medium (asset) / Low (code) | **Priority:** P1

### P1-5 — Career stage personalization beyond homepage
- **Problem:** `emscodesim-career-stage` only reshapes `index.html`.
- **Why it matters:** Smarter “homepage feels smart” promise across tools.
- **Approach:** Tiny `scripts/career-stage.js` shared helper; stage-aware recommended strip on `/vitals/`, `/emt-prep.html`, `/ems-training-tools.html`. Delete unused `career-stage-slider.js` drift.
- **Effort:** Medium | **Priority:** P1

### P1-6 — Exportable learning portfolio (local-first)
- **Problem:** Tracker, prep, flashcards, scenarios, quizzes use separate keys.
- **Why it matters:** Students want proof of practice for field training / resumes without accounts.
- **Approach:** `emscodesim_portfolio_v1` aggregator + one JSON/PDF-print export page; import merges with conflict UI.
- **Effort:** Medium–High | **Priority:** P1

---

### P2-1 — Protocol drill ↔ scenario bridge
- **Problem:** Daily protocol and scenarios don’t share state/region context.
- **Approach:** After a protocol drill, offer “Practice this as a scenario” deep link with matching case when available; store preferred region in existing daily-protocol profile.
- **Effort:** Medium | **Priority:** P2

### P2-2 — Accessibility pass on overlays
- **Problem:** Duplicate skip links; mobile `<select>` nav; incomplete focus trap on sheets/dialogs.
- **Approach:** Deduplicate skip links; focus trap for case dialog / action sheet / clinical next; aria on filter chips (done for filters).
- **Effort:** Medium | **Priority:** P2

### P2-3 — Split `visual-patient.js` monolith
- **Problem:** 5.4k-line controller + horse forks → slow features, regressions.
- **Approach:** Extract grade, treatments, info-window, timer/condition into modules; keep globals for compatibility; no bundler required initially (script tags).
- **Effort:** High | **Priority:** P2
- **Trade-off:** Don’t rewrite framework (React/etc.)—ROI is low vs modular ES scripts for a static site.

### P2-4 — Offline reference polish + optional scenario snapshot
- **Problem:** SW only caches reference pack, not sims.
- **Approach:** Expand offline pack; optional “cache this scenario’s assets” button (user-initiated) for horse photos—avoid surprise storage use.
- **Effort:** Medium | **Priority:** P2

### P2-5 — SEO / CWV for simulator pages
- **Problem:** Large classic scripts; limited lazy-loading; scenario pages soft on SEO.
- **Approach:** Defer non-critical horse modules until after first paint; compress assets; add scenario CollectionPage JSON-LD on launcher; keep `max-age=0` on scenario JS (correct for frequent updates).
- **Effort:** Medium | **Priority:** P2

### P2-6 — Skill isolation drills with immediate feedback
- **Problem:** Standalone vitals are strong; “skill sheet mode” less explicit.
- **Approach:** NREMT-style timed skill stations using existing mini-sims + pass criteria without forcing mid-call correctness in full scenarios (keep Assessment Mode deferred grading).
- **Effort:** Medium | **Priority:** P2

---

### P3-1 — Branching narrative / multi-patient / ALS expansion
High effort; only after library art + unified debrief. Keep EMT BLS depth first.

### P3-2 — Optional cloud sync / class codes
Premium add-on only; never required for core practice.

### P3-3 — Retire root duplicate `visual-patient.*` and legacy `scenarios/chest_pain_002`
Reduce confusion; redirects already point to `/vitals/`.

---

## Concrete first implementation checklist (recommended order)

1. ✅ Expose full scenario library + filters + homepage routing  
2. ✅ Fix condition-mode CSS / class  
3. ✅ Fix prep progress on daily practice  
4. ✅ Add debrief “Why this matters”  
5. Next: enrich mobile `clinicalNextActions` with treatment deep-links (P1-2)  
6. Next: shared debrief engine for horse (P1-1)  
7. Next: per-case patient art (P1-4)

---

## Pseudocode — treatment-aware clinical next actions (P1-2)

```js
function suggestedActionsForFinding(caseId, findingKey, record) {
  const plans = TREATMENT_PLANS[caseId] || [];
  return plans
    .filter(plan => (plan.evidence || []).includes(findingKey))
    .filter(plan => treatmentEvidence(plan, record).ready)
    .slice(0, 2)
    .map(plan => ({
      label: plan.label,
      run: () => openTreatment(plan.id)
    }))
    .concat([{ label: 'Reassess targets', run: () => openReassessment(findingKey) }]);
}
```

---

## Pseudocode — portfolio export (P1-6)

```js
function buildPortfolio() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    careerStage: localStorage.getItem('emscodesim-career-stage'),
    prep: readJSON('emscodesim:emt-prep:progress'),
    tracker: readJSON('emscodeProgressTrackerV1'),
    scenarios: listKeys(/^emscodesim_scenario_/).map(readJSON),
    quizzes: { streak: localStorage.getItem('deq_streak') }
  };
}
```

---

## What not to do (trade-offs)

- **Don’t require accounts** for sims/prep/quizzes—kills the free mobile student funnel.
- **Don’t replace localStorage with a mandatory backend**—optional sync later.
- **Don’t freeze on horse-only polish** while five cases sit unused.
- **Don’t add a permanent next-action HUD** that fights the patient photo (contracts + UX).
- **Don’t migrate to a SPA framework** until the monolith is modularized in place—rewrite cost dwarfs benefit for Netlify static hosting.

---

## Success metrics (lightweight, privacy-friendly)

Track via GA4 events already gated by privacy controls (no PII):

- Launcher: `scenario_select` by case id / filter  
- Debrief open rate after transport  
- Prep module continuation from homepage daily strip  
- Mobile session length on `visual-patient`

---

## Related files to read first

- `vitals/scenario-definitions.js` — data model  
- `vitals/visual-patient.js` — runtime  
- `vitals/scenario-phase-model.js` — required vs optional findings  
- `vitals/scenario-mini-sim-overlay.js` / `scenario-mini-sim-embedded.js`  
- `tools/verify-scenario-contracts.js` — invariants you must not break  
- `docs/SCENARIO_TOOL_CANONICALIZATION.md` — tool routing policy
