CREATE TABLE ems_report_class_completions (
  submission_key uuid PRIMARY KEY,
  learner_name text NOT NULL CHECK (char_length(learner_name) BETWEEN 2 AND 120),
  written_test_correct smallint NOT NULL CHECK (written_test_correct BETWEEN 0 AND 10),
  written_test_total smallint NOT NULL CHECK (written_test_total = 10),
  written_test_score smallint NOT NULL CHECK (written_test_score BETWEEN 0 AND 100),
  ai_narrative_score smallint NOT NULL CHECK (ai_narrative_score BETWEEN 0 AND 100),
  ai_narrative_attempts smallint NOT NULL DEFAULT 1 CHECK (ai_narrative_attempts BETWEEN 1 AND 1000),
  class_version text NOT NULL DEFAULT 'ems-report-writing-class-v1',
  completed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ems_report_class_completions_completed_at_idx
  ON ems_report_class_completions (completed_at DESC);

CREATE INDEX ems_report_class_completions_learner_name_idx
  ON ems_report_class_completions (lower(learner_name));

-- Create ems_completion_insert as a SQL-created LOGIN role and set its password
-- outside source control. Do not create it with the Neon Console/API, which grants
-- the managed neon_superuser role.
GRANT CONNECT ON DATABASE neondb TO ems_completion_insert;
GRANT USAGE ON SCHEMA public TO ems_completion_insert;
GRANT INSERT ON TABLE ems_report_class_completions TO ems_completion_insert;
