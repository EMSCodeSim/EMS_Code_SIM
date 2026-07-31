# EMSCodeSim Recommended Update — July 2026

This update applies the highest-priority findings from the project review without changing the overall EMSCodeSim design.

## What was fixed

### EMT Prep Module 2
- Added `emt-prep-module2.js`.
- Restored all seven missing interactive activities:
  1. Learning-lane matching
  2. First-week decision simulation
  3. Weekly workload calculator
  4. Instructor-feedback practice
  5. Falling-behind warning and recovery plan
  6. Skills-lab readiness checklist
  7. Two-week capstone planner
- Activities save locally in the learner's browser.
- Module timer, quiz, notes, and completion tracking remain connected to the existing shared EMT Prep scripts.

### Medical scenario simulator
- Removed the retired simulator from site navigation, search, and the sitemap.
- Updated scenario links to use `/vitals/scenario-launcher.html`, the connected mini-simulator pathway.
- Added redirects for old simulator bookmarks.
- Replaced `med_sim.html` with a safe, no-index transition page.
- Removed the retired GPT function from the active Netlify functions directory.
- Archived legacy simulator code and large response databases under `legacy-medical-simulator/`.

### Offline EMS Reference Pack
- Added 192 px and 512 px install icons.
- Updated the web app manifest.
- Rebuilt the service worker as cache version 2.
- One failed optional download no longer breaks the entire offline installation.
- Non-document asset failures no longer return an HTML page with the wrong content type.
- The service worker now handles only the reference-pack files rather than intercepting the rest of EMSCodeSim.
- The page reports how many reference-pack files were cached.

### Deployment and validation
- Added `tools/validate-site.js`.
- Added `tools/build-public.js`.
- Netlify now runs `npm run build` and publishes the generated `dist` folder.
- The live deployment excludes legacy simulator files, build tools, project notes, and internal update documents.
- Corrected the homepage and daily-practice text from six EMT Prep modules to 12.

## Validation completed

The updated source passed automated checks for:
- 136 HTML pages
- 66 active JavaScript files
- 11 JSON or manifest files
- Internal links and assets
- Sitemap targets
- JavaScript syntax
- Module 2 renderer connection
- Legacy medical-simulator exposure
- Required offline-reference assets

The generated live build contains 377 files and is approximately 25.4 MB. The retired simulator archive is not included in the live build.

## Deployment

### GitHub connected to Netlify
Replace the existing project with this updated project. Netlify will read `netlify.toml`, run:

```text
npm run build
```

and publish:

```text
dist
```

Do not manually upload the `legacy-medical-simulator` folder to a separate public location. It is retained only for future redevelopment.

### Manual deployment
Run:

```text
npm run build
```

Then deploy the contents of the generated `dist` folder.

## Main files changed or added

- `emt-prep-module2.js`
- `emt-prep/module-2-emt-school-expectations.html`
- `index.html`
- `daily-practice.js`
- `ems-training-tools.html`
- `emt-prep/practice-center.html`
- `emt-prep/module-6-patient-assessment.html`
- `ems-resources.html`
- `abc-training.html`
- `abc-skills.html`
- `abc-scenarios.html`
- `search-index.js`
- `sitemap.xml`
- `_redirects`
- `med_sim.html`
- `offline-ems-reference.js`
- `offline-reference-sw.js`
- `offline-reference.webmanifest`
- `icons/ems-reference-192.png`
- `icons/ems-reference-512.png`
- `package.json`
- `netlify.toml`
- `.gitignore`
- `tools/validate-site.js`
- `tools/build-public.js`
- `legacy-medical-simulator/`
