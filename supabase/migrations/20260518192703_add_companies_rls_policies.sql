/*
  # Add RLS policies to companies table

  Now that the users table exists, we can add the cross-reference policies.
  Regular users can read their own company; admins can manage all companies.
*/

CREATE POLICY "Users can read own company"
  ON companies FOR SELECT TO authenticated
  USING (
    id IN (SELECT company_id FROM users WHERE users.id = auth.uid())
  );

CREATE POLICY "Admins can read companies"
  ON companies FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

CREATE POLICY "Admins can insert companies"
  ON companies FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

CREATE POLICY "Admins can update companies"
  ON companies FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

CREATE POLICY "Admins can delete companies"
  ON companies FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );
