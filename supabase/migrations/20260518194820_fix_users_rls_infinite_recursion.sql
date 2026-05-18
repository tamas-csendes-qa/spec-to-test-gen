/*
  # Fix infinite recursion in users table RLS policies

  The admin-check policies on `users`, `companies`, `sessions`, and `usage_logs`
  all do `SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = true`.
  When evaluated on the `users` table itself this triggers the same policy again,
  causing infinite recursion.

  Fix: create a SECURITY DEFINER helper function that reads `is_admin` bypassing
  RLS, then rewrite all affected policies to call that function.
*/

-- Helper: returns true if the current user has is_admin = true.
-- SECURITY DEFINER means it runs as the function owner (postgres), bypassing RLS.
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

-- ── users table ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can read all users"   ON users;
DROP POLICY IF EXISTS "Admins can insert users"     ON users;
DROP POLICY IF EXISTS "Admins can update users"     ON users;
DROP POLICY IF EXISTS "Admins can delete users"     ON users;

CREATE POLICY "Admins can read all users"
  ON users FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete users"
  ON users FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── companies table ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can read companies"   ON companies;
DROP POLICY IF EXISTS "Admins can insert companies" ON companies;
DROP POLICY IF EXISTS "Admins can update companies" ON companies;
DROP POLICY IF EXISTS "Admins can delete companies" ON companies;

CREATE POLICY "Admins can read companies"
  ON companies FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert companies"
  ON companies FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update companies"
  ON companies FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete companies"
  ON companies FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── sessions table ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can read all sessions"  ON sessions;
DROP POLICY IF EXISTS "Admins can delete any session" ON sessions;

CREATE POLICY "Admins can read all sessions"
  ON sessions FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete any session"
  ON sessions FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── usage_logs table ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can read all usage logs" ON usage_logs;

CREATE POLICY "Admins can read all usage logs"
  ON usage_logs FOR SELECT TO authenticated
  USING (public.is_admin());
