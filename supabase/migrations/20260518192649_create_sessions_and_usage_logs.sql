/*
  # Create sessions and usage_logs tables

  ## New Tables

  ### sessions
  - Tracks active app sessions per user
  - `last_active` updated on each API call; 30-minute window determines activity
  - On login, oldest session is invalidated if limit is exceeded

  ### usage_logs
  - One row per successful Claude generation
  - Records user, company, tab type, output format, and approximate token count

  ## Security
  - RLS enabled on both tables
  - Users manage their own records; admins can read/delete all
*/

-- sessions
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_last_active_idx ON sessions(last_active);

CREATE POLICY "Users can read own sessions"
  ON sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sessions"
  ON sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all sessions"
  ON sessions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

CREATE POLICY "Admins can delete any session"
  ON sessions FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );


-- usage_logs
CREATE TABLE IF NOT EXISTS usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  tab_type text NOT NULL,
  output_format text NOT NULL,
  token_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS usage_logs_user_id_idx ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS usage_logs_company_id_idx ON usage_logs(company_id);
CREATE INDEX IF NOT EXISTS usage_logs_created_at_idx ON usage_logs(created_at);

CREATE POLICY "Users can insert own usage logs"
  ON usage_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own usage logs"
  ON usage_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all usage logs"
  ON usage_logs FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );
