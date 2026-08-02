# Patient Picture Home UX Update

## Main workflow changes

- The patient picture is the only active scenario home.
- The scenario launcher now selects and starts cases; it no longer becomes a second assessment workspace.
- The legacy assessment workspace redirects any active scenario to the patient picture.
- The recommended-next-action card and the separate Rapid ABC step are not used.
- Scene size-up is followed by one combined Primary Assessment card with Airway, Breathing, Circulation, and Immediate Threats rows.
- Patient-relevant assessments and tools appear first. Optional and not-indicated items are placed under collapsible More sections.

## Navigation changes

- Focused assessment pages use Save and Return to Patient as the main scenario action.
- Vital simulators use Return to Patient as the primary action and show no more than two secondary Continue with links.
- The fixed post-save confirmation uses one primary Return to Patient action.
- Old links to the guided assessment workspace were removed from normal scenario navigation and debrief coaching.

## Persistence and tracking

- Scene time is calculated from the patient record startedAt timestamp and therefore survives navigation and reloads.
- Partner assignments store the tool, label, value, assignment time, expected completion time, delay, and status.
- Due partner tasks resolve on any scenario page load and appear as PARTNER UPDATE messages.
- Treatment and reassessment are tracked separately. A reassessment only counts when it occurs after treatment.
- Progress is phase based: scene, primary, relevant history/focused assessment, initial vitals, treatment, reassessment, impression/transport, handoff, and debrief.
- Scenario completion checks patient-specific essential actions instead of requiring every available tool.
- Instructor assignments that require a debrief remain clinically complete but are not marked fully complete until the reflection is saved.

## Information window

The picture overlay now prioritizes decision-changing information:

- Dispatch and initial visible condition
- Partner results
- New abnormal findings
- Significant history alerts
- Treatment and reassessment response
- Impression, transport, and report updates

Routine normal findings remain in the patient-care log. The update window can be collapsed on smaller screens.

## Patient visuals

The current project includes distinct pediatric and adult base assets. Adult cases now receive scenario-specific presentation modes, image positioning/filtering, and visible scene-clue overlays. Dedicated unique adult photo assets were not fabricated in this code update; the case configuration remains centralized so unique asthma, stroke, hypoglycemia, and trauma images can be substituted without changing the workflow code.

## Verification

- Site source validation passed.
- Scenario contract verification passed for all scenario simulator pages.
- Patient/scenario persistence passed, including partner tasks surviving navigation.
- Care-log ordering and repeat findings passed.
- Patient-specific phase tracking passed, including treatment/reassessment timing.
- Production build and deployment validation passed.
