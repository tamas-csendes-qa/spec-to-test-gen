/*
  # Create users table

  Maps 1:1 to auth.users, stores company membership, session limit, and admin flag.

  ## New Tables
  - `users` — id (refs auth.users), email, company_id, max_concurrent_sessions, is_admin, created_at

  ## Security
  - RLS enabled
  - Users can read their own row
  - Admins (is_admin=true) can read/insert/update/delete all rows
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  max_concurrent_sessions integer NOT NULL DEFAULT 1,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- admins can read all users
CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.id = auth.uid() AND u2.is_admin = true
    )
  );

-- admins can insert users
CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.id = auth.uid() AND u2.is_admin = true
    )
  );

-- admins can update users
CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.id = auth.uid() AND u2.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.id = auth.uid() AND u2.is_admin = true
    )
  );

-- admins can delete users
CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.id = auth.uid() AND u2.is_admin = true
    )
  );
