CREATE TABLE IF NOT EXISTS critical_thinking_sessions (
  token_hash text PRIMARY KEY,
  scenario_id text NOT NULL,
  learner_level text NOT NULL CHECK (learner_level IN ('Beginner', 'EMT', 'Paramedic')),
  mode text NOT NULL CHECK (mode IN ('solo', 'group')),
  current_stage integer NOT NULL DEFAULT 0 CHECK (current_stage BETWEEN 0 AND 4),
  decisions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(decisions) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days'
);

CREATE INDEX IF NOT EXISTS critical_thinking_sessions_expiry_idx
  ON critical_thinking_sessions (expires_at);
