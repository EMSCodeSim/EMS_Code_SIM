# Scenario Resume and Crash Protection Update

This update adds protected local storage for active patient scenarios.

## Protection added

- Every patient-record save writes a current copy and a shadow copy.
- The previous valid patient record is retained as a last-known-good backup.
- Scenario progress and partner-task queues use the same protected-save pattern.
- Loading chooses the newest valid copy and repairs a missing, stale, or damaged primary entry.
- Recovered findings, treatments, reassessments, and care-log events retain their existing event IDs.
- Interrupted partner tasks with a `completing` state resume safely after reload.
- A re-entry guard prevents synchronous UI refreshes from completing a partner task twice.
- The scenario launcher identifies when a saved patient was recovered.

## Automated coverage

`npm run test:crash-recovery` verifies:

1. Recovery from malformed patient-record JSON.
2. Recovery from damaged scenario-progress storage.
3. Recovery of a partner vital interrupted during completion.
4. Repair of primary storage entries.
5. Prevention of duplicate care-log events.
