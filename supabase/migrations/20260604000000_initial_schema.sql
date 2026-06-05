-- =============================================================================
-- QAgen – complete initial schema
-- Run this once in the SQL Editor of the new Supabase project.
-- =============================================================================


-- ── 1. is_admin() helper ─────────────────────────────────────────────────────
-- SECURITY DEFINER bypasses RLS so admin-check policies on every table can call
-- this without triggering infinite recursion on the users table itself.

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


-- ── 2. companies ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.companies (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;


-- ── 3. users ─────────────────────────────────────────────────────────────────
-- id mirrors auth.users.id; cascade-deletes everything when the auth user is
-- removed.

CREATE TABLE IF NOT EXISTS public.users (
  id                       uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                    text        NOT NULL,
  company_id               uuid        REFERENCES public.companies(id) ON DELETE SET NULL,
  max_concurrent_sessions  integer     NOT NULL DEFAULT 1,
  monthly_generation_limit integer     NOT NULL DEFAULT 100,
  is_admin                 boolean     NOT NULL DEFAULT false,
  playwright_enabled       boolean     NOT NULL DEFAULT false,
  confluence_enabled       boolean     NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Every authenticated user can read their own profile row.
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Admins can read / write every user row.
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


-- ── 4. companies RLS policies ─────────────────────────────────────────────────
-- Added here (after users) so the sub-selects on users are valid.

-- Regular users can read the company they belong to.
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


-- ── 5. Auth trigger – auto-create profile on signup ───────────────────────────
-- Fires after every INSERT on auth.users (self-registration or admin creation).
-- ON CONFLICT DO NOTHING lets admin-create-user upsert override the defaults.

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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 6. sessions ───────────────────────────────────────────────────────────────

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


-- ── 7. usage_logs ─────────────────────────────────────────────────────────────

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


-- ── 8. confluence_connections ─────────────────────────────────────────────────

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


-- ── 9. confluence_selected_pages ──────────────────────────────────────────────

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


-- =============================================================================
-- BOOTSTRAP (Step 2)
-- After you have registered / logged in for the first time, run this in the
-- SQL Editor to promote your account to admin:
--
--   UPDATE public.users
--   SET    is_admin = true
--   WHERE  email = 'tacsendes@gmail.com';
--
-- =============================================================================
