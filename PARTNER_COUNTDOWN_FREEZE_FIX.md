# Partner countdown freeze fix

- Added an intermediate `completing` partner-task state before the vital is written.
- Prevented synchronous patient-record refresh events from completing the same task repeatedly.
- Removed partner-task resolution from the vital-card rendering function.
- Failed saves return to `pending` and retry after one second instead of locking the interface.
- Added a regression test for synchronous resolver re-entry.
- Updated scenario-session and visual-patient cache versions.
