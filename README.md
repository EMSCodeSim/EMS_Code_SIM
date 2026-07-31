# EMSCodeSim

EMSCodeSim is an EMS education, career, and interactive training website. The active project includes the 12-module EMT Prep program, vital-sign and focused-assessment simulators, connected EMT scenarios, career resources, daily review tools, and an offline EMS reference pack.

See `RECOMMENDED_UPDATE_JULY_2026.md` for the current update details and deployment instructions.

## Validate

```text
npm run validate
```

## Build for Netlify

```text
npm run build
```

The deployable website is generated in `dist/`. Legacy AI-simulator files are retained under `legacy-medical-simulator/` and are excluded from the live build.
