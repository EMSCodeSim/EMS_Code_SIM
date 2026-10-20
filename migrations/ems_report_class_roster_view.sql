-- EMS report class roster: limited admin-only read view.
-- Create the login role separately with a random password and NOINHERIT.
ALTER ROLE ems_class_roster_reader
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;

GRANT USAGE ON SCHEMA public TO ems_class_roster_reader;

CREATE OR REPLACE VIEW public.ems_report_class_roster_view
  WITH (security_barrier = true)
AS
  SELECT learner_name, written_test_score, ai_narrative_score, completed_at
  FROM public.ems_report_class_completions
  WHERE class_version = 'ems-report-writing-class-v1';

REVOKE ALL ON public.ems_report_class_roster_view FROM PUBLIC;
GRANT SELECT ON public.ems_report_class_roster_view TO ems_class_roster_reader;

REVOKE SELECT (learner_name, written_test_score, ai_narrative_score, completed_at, class_version)
  ON TABLE public.ems_report_class_completions FROM ems_class_roster_reader;
