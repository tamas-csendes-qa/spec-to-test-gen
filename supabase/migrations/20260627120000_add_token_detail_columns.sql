/*
  # Add input/output token columns to usage_logs

  Enables precise cost tracking — Claude Sonnet charges different rates
  for input ($3/1M) vs output ($15/1M) tokens.
*/

ALTER TABLE public.usage_logs
ADD COLUMN IF NOT EXISTS input_tokens integer,
ADD COLUMN IF NOT EXISTS output_tokens integer;
