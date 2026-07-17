/*
  # Drop the old non-idempotent admin_finalize_event overload

  ## Gap found during post-migration verification
  Migration 36 created `admin_finalize_event(...)` with 6 args, RETURNS uuid.
  Migration 40 used CREATE OR REPLACE with 7 args (+ p_force) and RETURNS jsonb.
  Since the argument count AND return type changed, CREATE OR REPLACE created
  a NEW overload rather than replacing the old one — leaving the old 6-arg
  version (no idempotency gate, no derived-status check, no no_entries safety)
  still callable. This is the same overload-ambiguity pattern already closed
  for cashout_game and enter_weekend_event.

  ## Fix
  Drop the old 6-arg overload so only the idempotent 7-arg version remains.
  The 7-arg version has p_force DEFAULT false, so calling it with 6 args
  still works and defaults to the safe (non-forced) path.
*/

DROP FUNCTION IF EXISTS public.admin_finalize_event(text, uuid, integer, text, text, uuid);