/*
  # Fix guest merge RPC execute permissions

  ## Problem
  check_guest_merge_eligibility(uuid) and execute_guest_merge(uuid) are callable
  by the PUBLIC role (which includes anon). Supabase grants EXECUTE to PUBLIC by
  default on new functions. Unauthenticated callers should never reach these.

  ## Fix
  - REVOKE EXECUTE from PUBLIC and anon on both functions
  - GRANT EXECUTE only to authenticated

  Both functions already contain auth.uid() IS NULL guards and will return an
  error payload rather than panic, but the privilege lock-down adds a proper
  database-level enforcement layer before any SQL even executes.

  ## Internal guard audit (both functions — verified in migrations 20260525*)
  check_guest_merge_eligibility:
    [x] auth.uid() IS NULL → returns {eligible:false, reason:'not_authenticated'}
    [x] caller = guest → returns {eligible:false, reason:'same_user'}
    [x] email NOT LIKE '%@survive.local' → returns ineligible
    [x] already_merged check via guest_account_merges (UNIQUE on guest_user_id)
    [x] read-only — no state mutations
  execute_guest_merge:
    [x] auth.uid() IS NULL → returns {success:false, error:'not_authenticated'}
    [x] caller = guest → returns {success:false, error:'same_user'}
    [x] email NOT LIKE '%@survive.local' → returns error
    [x] idempotency via guest_account_merges ON CONFLICT DO NOTHING + pre-check
    [x] all writes scoped to caller (v_caller_id) or guest being drained
    [x] SECURITY DEFINER + SET search_path = public on all versions
*/

-- Revoke from PUBLIC (covers all roles including anon)
REVOKE EXECUTE ON FUNCTION public.check_guest_merge_eligibility(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.execute_guest_merge(uuid) FROM PUBLIC;

-- Belt-and-suspenders: explicit revoke from anon role
REVOKE EXECUTE ON FUNCTION public.check_guest_merge_eligibility(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.execute_guest_merge(uuid) FROM anon;

-- Grant only to authenticated users
GRANT EXECUTE ON FUNCTION public.check_guest_merge_eligibility(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_guest_merge(uuid) TO authenticated;

-- Security documentation on the functions
COMMENT ON FUNCTION public.check_guest_merge_eligibility(uuid) IS
  'Read-only eligibility check for merging a @survive.local guest account into the caller. Requires authenticated session. SECURITY DEFINER — execute privilege restricted to authenticated role only.';

COMMENT ON FUNCTION public.execute_guest_merge(uuid) IS
  'Atomically merges wallet, qualification points, and badges from a @survive.local guest into the authenticated caller. Idempotent via UNIQUE(guest_user_id) on guest_account_merges. SECURITY DEFINER — execute privilege restricted to authenticated role only.';
