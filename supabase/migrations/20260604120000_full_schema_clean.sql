-- =============================================================================
-- QAgen – full schema (clean, idempotent)
-- Paste the entire file into Supabase SQL Editor and click Run.
-- =============================================================================

-- ── 0. Drop stale policies that may have been partially created ───────────────
-- Safe to run even if the tables don't exist yet.

DO $$ BEGIN
  -- companies
  DROP POLICY IF EXISTS "Users can read own company"   ON public.companies;
  DROP POLICY IF EXISTS "Admins can read companies"    ON public.companies;
  DROP POLICY IF EXISTS "Admins can insert companies"  ON public.companies;
  DROP POLICY IF EXISTS "Admins can update companies"  ON public.companies;
  DROP POLICY IF EXISTS "Admins can delete companies"  ON public.companies;
  -- users
  DROP POLICY IF EXISTS "Users can read own profile"   ON public.users;
  DROP POLICY IF EXISTS "Admins can read all users"    ON public.users;
  DROP POLICY IF EXISTS "Admins can insert users"      ON public.users;
  DROP POLICY IF EXISTS "Admins can update users"      ON public.users;
  DROP POLICY IF EXISTS "Admins can delete users"      ON public.users;
  -- sessions
  DROP POLICY IF EXISTS "Users can read own sessions"    ON public.sessions;
  DROP POLICY IF EXISTS "Users can insert own sessions"  ON public.sessions;
  DROP POLICY IF EXISTS "Users can update own sessions"  ON public.sessions;
  DROP POLICY IF EXISTS "Users can delete own sessions"  ON public.sessions;
  DROP POLICY IF EXISTS "Admins can read all sessions"   ON public.sessions;
  DROP POLICY IF EXISTS "Admins can delete any session"  ON public.sessions;
  -- usage_logs
  DROP POLICY IF EXISTS "Users can insert own usage logs"  ON public.usage_logs;
  DROP POLICY IF EXISTS "Users can read own usage logs"    ON public.usage_logs;
  DROP POLICY IF EXISTS "Admins can read all usage logs"   ON public.usage_logs;
  -- confluence_connections
  DROP POLICY IF EXISTS "Users can select own confluence connection"  ON public.confluence_connections;
  DROP POLICY IF EXISTS "Users can insert own confluence connection"  ON public.confluence_connections;
  DROP POLICY IF EXISTS "Users can update own confluence connection"  ON public.confluence_connections;
  DROP POLICY IF EXISTS "Users can delete own confluence connection"  ON public.confluence_connections;
  DROP POLICY IF EXISTS "Admins can read all confluence connections"  ON public.confluence_connections;
  -- confluence_selected_pages
  DROP POLICY IF EXISTS "Users can select own confluence pages"  ON public.confluence_selected_pages;
  DROP POLICY IF EXISTS "Users can insert own confluence pages"  ON public.confluence_selected_pages;
  DROP POLICY IF EXISTS "Users can delete own confluence pages"  ON public.confluence_selected_pages;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── 1. companies ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.companies (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- ── 2. users ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
  id                         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                      text        NOT NULL,
  company_id                 uuid        REFERENCES public.companies(id) ON DELETE SET NULL,
  max_concurrent_sessions    integer     NOT NULL DEFAULT 1,
  monthly_generation_limit   integer     NOT NULL DEFAULT 100,
  max_pages_per_generation   integer     NOT NULL DEFAULT 10,
  is_admin                   boolean     NOT NULL DEFAULT false,
  playwright_enabled         boolean     NOT NULL DEFAULT false,
  confluence_enabled         boolean     NOT NULL DEFAULT false,
  created_at                 timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ── 3. is_admin() helper ──────────────────────────────────────────────────────
-- Must be created AFTER the users table exists.
-- SECURITY DEFINER bypasses RLS so admin-check policies never recurse.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.users WHERE id = auth.uid()),
    false
  );
$$;

-- ── 4. companies RLS ──────────────────────────────────────────────────────────

CREATE POLICY "Users can read own company"
  ON public.companies FOR SELECT TO authenticated
  USING (id IN (SELECT company_id FROM public.users WHERE users.id = auth.uid()));

CREATE POLICY "Admins can read companies"
  ON public.companies FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert companies"
  ON public.companies FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update companies"
  ON public.companies FOR UPDATE TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete companies"
  ON public.companies FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── 5. users RLS ──────────────────────────────────────────────────────────────

CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all users"
  ON public.users FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert users"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update users"
  ON public.users FOR UPDATE TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete users"
  ON public.users FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── 6. Auth trigger – auto-create profile on signup ──────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 7. sessions ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sessions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_token text        NOT NULL UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_active   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS sessions_user_id_idx     ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_last_active_idx ON public.sessions(last_active);

CREATE POLICY "Users can read own sessions"
  ON public.sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sessions"
  ON public.sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own sessions"
  ON public.sessions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all sessions"
  ON public.sessions FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete any session"
  ON public.sessions FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── 8. usage_logs ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.usage_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id    uuid        REFERENCES public.companies(id) ON DELETE SET NULL,
  tab_type      text        NOT NULL,
  output_format text        NOT NULL,
  token_count   integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS usage_logs_user_id_idx    ON public.usage_logs(user_id);
CREATE INDEX IF NOT EXISTS usage_logs_company_id_idx ON public.usage_logs(company_id);
CREATE INDEX IF NOT EXISTS usage_logs_created_at_idx ON public.usage_logs(created_at);

CREATE POLICY "Users can insert own usage logs"
  ON public.usage_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own usage logs"
  ON public.usage_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all usage logs"
  ON public.usage_logs FOR SELECT TO authenticated
  USING (public.is_admin());

-- ── 9. confluence_connections ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.confluence_connections (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  confluence_url text        NOT NULL,
  api_token      text        NOT NULL,
  email          text        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.confluence_connections ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS confluence_connections_user_id_idx
  ON public.confluence_connections(user_id);

CREATE POLICY "Users can select own confluence connection"
  ON public.confluence_connections FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own confluence connection"
  ON public.confluence_connections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own confluence connection"
  ON public.confluence_connections FOR UPDATE TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own confluence connection"
  ON public.confluence_connections FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all confluence connections"
  ON public.confluence_connections FOR SELECT TO authenticated
  USING (public.is_admin());

-- ── 10. confluence_selected_pages ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.confluence_selected_pages (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  page_id        text        NOT NULL,
  page_title     text        NOT NULL,
  page_url       text        NOT NULL,
  confluence_url text        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.confluence_selected_pages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS confluence_selected_pages_user_id_idx
  ON public.confluence_selected_pages(user_id);

CREATE POLICY "Users can select own confluence pages"
  ON public.confluence_selected_pages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own confluence pages"
  ON public.confluence_selected_pages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own confluence pages"
  ON public.confluence_selected_pages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── 11. Bootstrap admin user ──────────────────────────────────────────────────
-- The auth user (id 78fb3f41-b50b-4413-8df9-56a6c5c85d23) already exists.
-- Insert their profile row with is_admin = true.

INSERT INTO public.users (id, email, is_admin)
VALUES ('78fb3f41-b50b-4413-8df9-56a6c5c85d23', 'tacsendes@gmail.com', true)
ON CONFLICT (id) DO UPDATE
  SET is_admin = true,
      email    = EXCLUDED.email;
