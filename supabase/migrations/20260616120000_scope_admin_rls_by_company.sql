/*
  # Scope admin RLS policies by company

  Goal: an is_admin user assigned to one company should only be able to
  read/write that company's users, sessions, usage logs, and Confluence
  connections — not every company's.

  Two things the naive version of this fix gets wrong, both fixed here:

  1. Infinite recursion: a policy ON public.users that subqueries
     public.users (e.g. `SELECT company_id FROM users WHERE id = auth.uid()`)
     re-triggers users' own RLS to satisfy the subquery, which re-triggers
     the same policy. This is the exact bug already fixed once in
     20260518194820_fix_users_rls_infinite_recursion.sql, which is why
     public.is_admin() exists as a SECURITY DEFINER helper. We need a second
     SECURITY DEFINER helper (my_company_id) for the same reason — any
     self-referencing subquery on users from a policy on users recurses,
     regardless of which column it reads.

  2. Superadmin lockout: the bootstrap admin account has no company_id
     (it manages every company from one panel). Under strict
     `company_id = my_company_id()` scoping, NULL never equals anything,
     so that account would be locked out of its own admin panel. Fix:
     treat company_id IS NULL on the calling admin as "superadmin — sees
     everything." Any future admin who *does* have a company_id assigned
     is scoped to only that company.
*/

-- Helper: returns the current user's own company_id, bypassing RLS to avoid
-- recursion when used inside a policy defined on public.users itself.
CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid();
$$;

-- ── users ────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can read all users"   ON public.users;
DROP POLICY IF EXISTS "Admins can insert users"      ON public.users;
DROP POLICY IF EXISTS "Admins can update users"      ON public.users;
DROP POLICY IF EXISTS "Admins can delete users"      ON public.users;
DROP POLICY IF EXISTS "Admins can read company users"   ON public.users;
DROP POLICY IF EXISTS "Admins can update company users" ON public.users;

CREATE POLICY "Admins can read company users"
  ON public.users FOR SELECT TO authenticated
  USING (public.is_admin() AND (public.my_company_id() IS NULL OR company_id = public.my_company_id()));

CREATE POLICY "Admins can insert company users"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND (public.my_company_id() IS NULL OR company_id = public.my_company_id()));

CREATE POLICY "Admins can update company users"
  ON public.users FOR UPDATE TO authenticated
  USING  (public.is_admin() AND (public.my_company_id() IS NULL OR company_id = public.my_company_id()))
  WITH CHECK (public.is_admin() AND (public.my_company_id() IS NULL OR company_id = public.my_company_id()));

CREATE POLICY "Admins can delete company users"
  ON public.users FOR DELETE TO authenticated
  USING (public.is_admin() AND (public.my_company_id() IS NULL OR company_id = public.my_company_id()));

-- ── companies ────────────────────────────────────────────────────────────────
-- A scoped admin may read/update only their own company row.
-- Creating or deleting companies stays superadmin-only (company_id IS NULL).

DROP POLICY IF EXISTS "Admins can read companies"   ON public.companies;
DROP POLICY IF EXISTS "Admins can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can update companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can delete companies" ON public.companies;

CREATE POLICY "Admins can read own company"
  ON public.companies FOR SELECT TO authenticated
  USING (public.is_admin() AND (public.my_company_id() IS NULL OR id = public.my_company_id()));

CREATE POLICY "Superadmin can insert companies"
  ON public.companies FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND public.my_company_id() IS NULL);

CREATE POLICY "Admins can update own company"
  ON public.companies FOR UPDATE TO authenticated
  USING  (public.is_admin() AND (public.my_company_id() IS NULL OR id = public.my_company_id()))
  WITH CHECK (public.is_admin() AND (public.my_company_id() IS NULL OR id = public.my_company_id()));

CREATE POLICY "Superadmin can delete companies"
  ON public.companies FOR DELETE TO authenticated
  USING (public.is_admin() AND public.my_company_id() IS NULL);

-- ── confluence_connections ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can read all confluence connections" ON public.confluence_connections;

CREATE POLICY "Admins can read company confluence"
  ON public.confluence_connections FOR SELECT TO authenticated
  USING (
    public.is_admin() AND (
      public.my_company_id() IS NULL
      OR (SELECT company_id FROM public.users WHERE id = user_id) = public.my_company_id()
    )
  );

-- ── usage_logs ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can read all usage logs" ON public.usage_logs;

CREATE POLICY "Admins can read company usage logs"
  ON public.usage_logs FOR SELECT TO authenticated
  USING (public.is_admin() AND (public.my_company_id() IS NULL OR company_id = public.my_company_id()));

-- ── sessions ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Admins can read all sessions"  ON public.sessions;
DROP POLICY IF EXISTS "Admins can delete any session" ON public.sessions;

CREATE POLICY "Admins can read company sessions"
  ON public.sessions FOR SELECT TO authenticated
  USING (
    public.is_admin() AND (
      public.my_company_id() IS NULL
      OR (SELECT company_id FROM public.users WHERE id = user_id) = public.my_company_id()
    )
  );

CREATE POLICY "Admins can delete company sessions"
  ON public.sessions FOR DELETE TO authenticated
  USING (
    public.is_admin() AND (
      public.my_company_id() IS NULL
      OR (SELECT company_id FROM public.users WHERE id = user_id) = public.my_company_id()
    )
  );
