# Apply to Responder Roadmap

This Cloud Agent can push to `EMS_Code_SIM` but **not** to `ResponderRoadmap` (403).

Copy these reference files into the Responder Roadmap repo and wire them as follows:

1. Add env `EMSCODESIM_ROADMAP_SHARED_SECRET` (same value as EMSCodeSim).
2. Copy `src/lib/emsCodeSimDrills.ts`.
3. Copy completion route to `src/app/api/v1/integrations/emscodesim/complete/route.ts`.
4. Implement `recordEmsDrillCompletion` against your real `submitRequirement` helper.
5. Mount `EmsCodeSimTaskBridge` beside `FireOpsTaskBridge` in `(portal)/layout.tsx`.
6. Add `POST /api/v1/integrations/emscodesim/launch` that:
   - authorizes the member for the assignment
   - resolves drillId from requirement `referenceUrl` or metadata
   - returns `createEmsDrillLaunchToken(...).launchUrl`
7. When creating a TRAINING_TASK assignment, allow selecting an EMSCodeSim drill from
   `fetchEmsDrillCatalog()` and store `drillId` on the requirement (`referenceUrl` or tags).

EMSCodeSim side is live in this PR:
- Catalog: `/.netlify/functions/ems-drill-catalog`
- Session validate: `/.netlify/functions/ems-drill-session`
- Completion emit: `/.netlify/functions/ems-drill-complete`
