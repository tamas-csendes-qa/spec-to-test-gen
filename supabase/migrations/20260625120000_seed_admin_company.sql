/*
  # Seed default Admin company

  Inserts the "Admin" company row if it does not already exist.
  Safe to run on existing databases — skipped if the row is already there.
*/

INSERT INTO public.companies (name)
SELECT 'Admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.companies WHERE name = 'Admin'
);
