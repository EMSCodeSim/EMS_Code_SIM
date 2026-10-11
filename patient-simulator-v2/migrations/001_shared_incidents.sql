-- Patient Simulator V2 multiplayer incident foundation.
-- Apply to the designated EMSCodeSim Neon database only after environment verification.
CREATE TABLE IF NOT EXISTS public.psv2_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  join_code text NOT NULL UNIQUE,
  scenario_id text NOT NULL DEFAULT 'adult-asthma',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.psv2_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.psv2_incidents(id) ON DELETE CASCADE,
  role_id text NOT NULL CHECK (role_id IN ('dispatcher','lead_emt','firefighter','emt_partner')),
  token_hash text NOT NULL UNIQUE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.psv2_incident_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES public.psv2_incidents(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES public.psv2_participants(id),
  event_type text NOT NULL,
  visibility text NOT NULL DEFAULT 'radio' CHECK (visibility IN ('radio','dispatch','scene')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS psv2_events_incident_idx ON public.psv2_incident_events(incident_id,id);
CREATE INDEX IF NOT EXISTS psv2_participants_incident_idx ON public.psv2_participants(incident_id);
-- Access must be enforced by server-side role-scoped API using hashed participant tokens.
-- Do not expose the database connection string or grant direct browser SQL access.
