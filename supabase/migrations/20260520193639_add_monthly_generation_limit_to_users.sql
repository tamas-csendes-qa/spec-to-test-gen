/*
  # Add monthly_generation_limit to users table

  ## Changes
  - New column `monthly_generation_limit` (INTEGER, DEFAULT 100) on the `users` table
  - 0 means unlimited
  - Existing rows receive the default value of 100

  ## Notes
  - No RLS changes needed; existing policies cover this column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'monthly_generation_limit'
  ) THEN
    ALTER TABLE users ADD COLUMN monthly_generation_limit INTEGER NOT NULL DEFAULT 100;
  END IF;
END $$;
