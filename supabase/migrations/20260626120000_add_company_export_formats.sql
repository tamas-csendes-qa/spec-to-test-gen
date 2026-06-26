/*
  # Add per-company export format restrictions

  Companies can now limit which output formats their users see.
  Default = all formats enabled, so existing companies are unaffected.
*/

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS allowed_export_formats text[]
DEFAULT ARRAY['gherkin', 'zephyr', 'azurecsv', 'testrailcsv', 'xraycsv'];
