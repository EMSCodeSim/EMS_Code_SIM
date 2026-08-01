# High-Priority Reliability Update

## Automatic production exclusions

Manual deletion is no longer part of deployment.

- `tools/deployment-policy.js` is the single source of truth for retired and source-only paths.
- `tools/build-public.js` creates a clean `dist/` website package.
- `tools/prepare-functions.js` creates a clean `netlify-functions-dist/` directory.
- `netlify.toml` deploys functions only from `netlify-functions-dist/`, so the retired GPT endpoint cannot be deployed from the old default directory.
- `tools/validate-site.js` validates the active source and then validates the completed `dist/` package.
- Internal pages fail validation if they link to a retired path.

## Browser interaction tests

Playwright tests were added under `tests/interaction/` for desktop Chromium and a Pixel 5 mobile profile.

They verify:

- Retired and source-only files return 404 from the production output.
- The picture-first scenario launcher loads the patient image.
- A timed respiratory-rate assessment can be completed and saved.
- The patient finding persists in local storage.
- Scenario progress updates after returning from a simulator.
- Scenario progress survives a reload.
- Incomplete scenarios cannot be marked complete.
- Completed scenario state is persisted.
- Blood-pressure pump, release, deflation timer, audio cue, answer checking, and patient-record saving work end to end.

## Commands

```bash
npm install
npm run build
npm run test:interaction:install
npm run test:interaction
```

`npm run build` does not require a browser. Browser installation is only required for the interaction-test command.
