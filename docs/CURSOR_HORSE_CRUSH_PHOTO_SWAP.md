# Cursor task: Horse-crush photo swap + video-then-dispatch open

## Goal
1. Replace the current photos in `vitals/assets/horse-crush/` with the new scenario photos.
2. Wire **when** each photo appears during the scenario.
3. Open the scenario with the **calm-walk video first**, then the **dispatcher talking**.

Work in the EMSCodeSim repo. Primary files:
- `vitals/assets/horse-crush/` (image assets)
- `vitals/horse-crush-scenario.js` (exam image map + arrival/reveal)
- `vitals/scenario-definitions.js` (dispatch text / default image)
- `vitals/visual-patient.js` / `vitals/scenario-guided-start.js` / `vitals/horse-crush-bootstrap.js` (start sequence / communications UI)

---

## 1. Asset file mapping (replace these files)

Put the new images into `vitals/assets/horse-crush/` using the **existing filenames** so most JS keeps working.

| Existing asset (keep this name) | Replace with | What it shows | When it appears |
|--------------------------------|--------------|---------------|-----------------|
| `patient-initial.webp` | Frame 2 assessment (flat supine, **left knee ~45°**, right leg out) | Default / arrival / head exam / upper-extremity | Scenario reveal after video+dispatch; also `head_exam`, `upper_extremities` |
| `exam-neck-back.webp` | Same patient + rescuer, neck/C-spine focused (left knee still ~45°) | Neck and back exam | When learner runs **Neck and back exam** |
| `exam-chest.webp` | Chest exam hands on chest wall; left knee ~45° | Chest exam | **Chest exam** |
| `exam-abdomen.webp` | Abdominal exam; left knee ~45° | Abdominal exam | **Abdominal exam** |
| `exam-pelvis.webp` | Pelvis/hip exam focused on left hip; left knee ~45° | Pelvis and hip exam | **Pelvis and hip exam** (key positive finding) |
| `exam-leg.webp` | Distal CSM / lower extremity focus on left foot; left knee ~45° | Lower-extremity + distal CSM | **Lower-extremity exam**, **Distal CSM** |
| `movement-blankets.webp` | Frame 3 scoop style OR blankets under flexed left knee (right straight, left ~45° padded) | Correct packaging support | Movement plan when stabilization = blankets/vacuum |
| `movement-scoop.webp` | Frame 3 corrected: level scoop, right leg straight, left ~45° with blankets under | Scoop packaging | Movement plan when method uses scoop / default movement image |
| *(new)* `handoff.webp` (or `.jpg`) | Photo 1 handoff: two EMS talking, patient in background left knee ~45° | BLS handoff visual | Optional: show during `bls_handoff` / arrival card |
| *(new)* `transport-ambulance.webp` | Frame 4 corrected: level stretcher, right straight, left ~45° padded | Transport / ambulance | Optional: after movement plan recorded or transport phase |
| *(new)* `incident-calm-walk.mp4` | Calm walk video (or still used as poster) | Opening incident context | **Plays first** when scenario opens |
| *(new)* `incident-calm-walk.jpg` | Still of calm walk (poster frame for video) | Poster / fallback | Behind video or if autoplay blocked |

### Format note
Current code expects `.webp` for the eight core assets. Either:
- **A (preferred):** convert new JPGs → WebP with the same names above, or
- **B:** keep JPG and update every `ASSET...webp` path in `horse-crush-scenario.js` (and any CSS/preload) to `.jpg`.

Also update default image in `scenario-definitions.js` if it still points at:
`/vitals/assets/scenario-patient-horse-crush.webp`
→ point it at `/vitals/assets/horse-crush/patient-initial.webp` (or the new equivalent).

---

## 2. When photos change (already mostly in `horse-crush-scenario.js`)

`EXAMS` array drives focused-exam swaps via `setMainPatientImage(item.image, ...)`:

```js
const ASSET = '/vitals/assets/horse-crush/';
const EXAMS = [
  { key: 'head_exam',            image: `${ASSET}patient-initial.webp`, ... },
  { key: 'neck_back',            image: `${ASSET}exam-neck-back.webp`, ... },
  { key: 'chest_assessment',     image: `${ASSET}exam-chest.webp`, ... },
  { key: 'abdominal_assessment', image: `${ASSET}exam-abdomen.webp`, ... },
  { key: 'pelvis_hip',           image: `${ASSET}exam-pelvis.webp`, ... },
  { key: 'upper_extremities',    image: `${ASSET}patient-initial.webp`, ... },
  { key: 'left_leg',             image: `${ASSET}exam-leg.webp`, ... },
  { key: 'distal_csm',           image: `${ASSET}exam-leg.webp`, ... },
];
```

Movement images (`movementImage()`):

```js
function movementImage(method, stabilization) {
  if (stabilization === 'blankets_position' || stabilization === 'vacuum_support')
    return `${ASSET}movement-blankets.webp`;
  if (method) return `${ASSET}movement-scoop.webp`;
  // fallback: keep scoop or patient-initial
  return `${ASSET}movement-scoop.webp`;
}
```

Arrival currently forces:

```js
setMainPatientImage(`${ASSET}patient-initial.webp`, 'Alert patient lying on dirt outside the south barn with the left knee flexed');
```

**Do not** show the patient image until after the opening video + first dispatch message (see §3).

Optional upgrades (implement if easy):
- On `bls_handoff` finding / arrival card → briefly show `handoff.webp` then settle on `patient-initial.webp`.
- After successful movement plan → show `movement-scoop.webp` or `transport-ambulance.webp`.
- On hospital handoff / transport → `transport-ambulance.webp`.

---

## 3. Open sequence: video first, then dispatcher talking

### Desired UX
1. Learner opens horse-crush scenario (`?case=horse_crush...`).
2. **Main stage plays** `incident-calm-walk.mp4` (short, muted autoplay with controls or “Skip”).
3. When video ends (or Skip): show **DISPATCH** communication in `#infoUpdateWindow` (existing UI).
4. Then reveal patient image (`patient-initial.webp`) + BLS handoff text (existing `renderArrivalCard` / handoff copy).

### Dispatch copy (already in definitions)
From `scenario-definitions.js`:
> “Reported fall at a horse facility; a BLS engine crew is already on scene.”

BLS handoff line already in `horse-crush-scenario.js`:
> “She was smashed between two horses and fell to the ground. No loss of consciousness. She is alert and oriented ×4 and complains of left-hip pain. We have not moved her.”

### Implementation outline

**A. Add assets**
- `vitals/assets/horse-crush/incident-calm-walk.mp4`
- `vitals/assets/horse-crush/incident-calm-walk.jpg` (poster)

**B. Gate patient reveal**
In `horse-crush-scenario.js`, stop calling `revealPatientImage()` / `renderArrivalCard()` immediately on load. Instead:

```js
let introComplete = false;

function playIncidentIntro() {
  if (!isActive() || introComplete) return;
  const stage = document.querySelector('.patient-stage') || document.getElementById('patientStage');
  if (!stage) { finishIntro(); return; }

  // Hide normal patient img / clue layer during intro
  document.getElementById('sceneClueLayer')?.setAttribute('hidden', '');
  document.getElementById('patientPhaseControls')?.setAttribute('hidden', '');

  stage.classList.add('horse-intro-playing');
  stage.innerHTML = `
    <div class="horse-intro-video-wrap">
      <video id="horseIncidentVideo"
             playsinline muted controls
             poster="${ASSET}incident-calm-walk.jpg"
             src="${ASSET}incident-calm-walk.mp4"></video>
      <button type="button" id="horseIntroSkip" class="secondary">Skip intro</button>
    </div>`;

  const video = document.getElementById('horseIncidentVideo');
  const skip = document.getElementById('horseIntroSkip');
  const done = () => finishIntro();
  skip?.addEventListener('click', done, { once: true });
  video?.addEventListener('ended', done, { once: true });
  video?.play()?.catch(() => { /* autoplay blocked — user can press play or Skip */ });
}

function finishIntro() {
  if (introComplete) return;
  introComplete = true;
  document.querySelector('.patient-stage')?.classList.remove('horse-intro-playing');
  // Restore normal patient stage structure if innerHTML was replaced
  // (prefer toggling a dedicated intro layer instead of wiping stage HTML if the app is fragile)

  showDispatchThenHandoff();
}

function showDispatchThenHandoff() {
  // 1) DISPATCH into existing communications panel
  const type = document.getElementById('infoUpdateType');
  const title = document.getElementById('infoUpdateTitle'); // if present
  const text = document.getElementById('infoUpdateText');
  const time = document.getElementById('infoUpdateTime');
  if (type) type.textContent = 'DISPATCH';
  if (text) text.textContent = 'Reported fall at a horse facility; a BLS engine crew is already on scene.';
  if (time) time.textContent = 'TONES';
  document.getElementById('infoUpdateWindow')?.classList.add('info-dispatch');

  // 2) Shortly after, run existing arrival/handoff path
  window.setTimeout(() => {
    renderArrivalCard(); // saves arrival_parking + bls_handoff, reveals patient-initial image, sets BLS HANDOFF text
  }, 1200);
}
```

Call `playIncidentIntro()` from the scenario init path that currently calls `renderArrivalCard()` on load / `pageshow` (see bottom of `horse-crush-scenario.js` around the `renderArrivalCard()` and `pageshow` listeners). Replace those immediate `renderArrivalCard()` calls with `playIncidentIntro()`.

**C. Prefer non-destructive DOM**
If replacing `.patient-stage` innerHTML breaks the app, instead inject an overlay:

```html
<div id="horseIntroOverlay" class="horse-intro-overlay">
  <video ...></video>
  <button id="horseIntroSkip">Skip intro</button>
</div>
```

Hide overlay on finish; then call `showDispatchThenHandoff()`.

**D. CSS (minimal)**
```css
.horse-intro-overlay {
  position: absolute; inset: 0; z-index: 5;
  display: grid; place-items: center;
  background: #0b0f14;
}
.horse-intro-overlay video {
  max-width: 100%; max-height: 100%; width: 100%;
  object-fit: contain;
}
.horse-intro-overlay #horseIntroSkip {
  position: absolute; right: 12px; bottom: 12px;
}
```

---

## 4. Concrete Cursor checklist

1. [ ] Copy/convert new photos into `vitals/assets/horse-crush/` using the mapping table (same filenames for the eight core assets).
2. [ ] Add `incident-calm-walk.mp4` + poster `incident-calm-walk.jpg`.
3. [ ] Add optional `handoff.webp` and `transport-ambulance.webp` if implementing those moments.
4. [ ] Confirm `EXAMS[].image` and `movementImage()` paths still match the files on disk.
5. [ ] Change scenario start: **video → dispatch message → reveal patient + BLS handoff** (gate `renderArrivalCard`).
6. [ ] Update `scenario-definitions.js` default `image` for `horse_crush` if it still points at the old global asset.
7. [ ] Hard-refresh / cache-bust (`?v=...` on JS and assets if needed).
8. [ ] Manual test:
   - Open `visual-patient?case=horse_crush&training=assessment&reset=1`
   - Video (or poster + skip) first
   - Dispatch text appears in communications panel
   - Patient image appears with left knee flexed ~45°
   - Each focused exam swaps the correct photo
   - Movement plan shows blankets vs scoop images correctly

---

## 5. Source files for the new photos (local pack)

From the generated pack (adjust paths to wherever the user stored them):

| Pack file | Target under `vitals/assets/horse-crush/` |
|-----------|------------------------------------------|
| Handoff image (chat “Photo 1”) | `handoff.webp` (optional) |
| `02_assessment_left_knee_45.jpg` | `patient-initial.webp` (convert) |
| `03_scoop_padded.jpg` | `movement-scoop.webp` (convert); also usable for blankets variant |
| `04_ambulance_padded.jpg` | `transport-ambulance.webp` (optional) |
| `00_calm_walk_with_horse.jpg` | `incident-calm-walk.jpg` (poster) |
| `calm_walk.mp4` | `incident-calm-walk.mp4` |

Still need dedicated stills for neck/chest/abdomen/pelvis/leg if not already generated; until then, temporarily reuse `patient-initial.webp` for missing exam slots rather than leaving broken paths.

---

## 6. Do not break

- Keep `CASE_ID = 'horse_crush'` and `ASSET = '/vitals/assets/horse-crush/'`.
- Keep finding keys (`arrival_parking`, `bls_handoff`, exam keys) stable for grading.
- Do not force the left leg straight in any “correct path” image.
- Preserve existing communications panel IDs (`infoUpdateType`, `infoUpdateText`, `infoUpdateTime`, etc.).
