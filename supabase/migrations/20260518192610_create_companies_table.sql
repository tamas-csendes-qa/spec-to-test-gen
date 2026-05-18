/*
  # Create companies table

  Simple lookup table for organizations. RLS policies that reference the
  users table will be added in a later migration after users is created.

  ## New Tables
  - `companies` — id, name, created_at
*/

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
