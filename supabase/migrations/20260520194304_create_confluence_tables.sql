/*
  # Create Confluence integration tables

  ## New Tables

  ### confluence_connections
  Stores per-user Confluence connection credentials.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references users.id)
  - `confluence_url` (text) – e.g. "yourcompany.atlassian.net"
  - `api_token` (text) – Atlassian API token (stored as-is; access restricted by RLS)
  - `email` (text) – Atlassian account email
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### confluence_selected_pages
  Stores pages a user has pinned for inclusion in generation.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references users.id)
  - `page_id` (text) – Confluence page ID
  - `page_title` (text)
  - `page_url` (text)
  - `confluence_url` (text)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on both tables
  - Users can only read/write their own rows
*/

CREATE TABLE IF NOT EXISTS confluence_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  confluence_url text NOT NULL,
  api_token text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE confluence_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own confluence connection"
  ON confluence_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own confluence connection"
  ON confluence_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own confluence connection"
  ON confluence_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own confluence connection"
  ON confluence_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS confluence_selected_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_id text NOT NULL,
  page_title text NOT NULL,
  page_url text NOT NULL,
  confluence_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE confluence_selected_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own confluence pages"
  ON confluence_selected_pages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own confluence pages"
  ON confluence_selected_pages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own confluence pages"
  ON confluence_selected_pages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
