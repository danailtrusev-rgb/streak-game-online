/*
  # Notification click recording RPC

  ## Why an RPC instead of a direct UPDATE
  `notification_delivery_log` intentionally has no INSERT/UPDATE policy
  for `authenticated` (see 20260714000000_*.sql) — a normal client must
  never be able to write arbitrary delivery-log rows or mark an
  arbitrary notification as "clicked" without a real click happening.
  This function is the one narrow, validated write path: it only ever
  touches a row that (a) exists and (b) belongs to the calling user,
  and it only ever sets `clicked_at`/`status` — nothing else.

  ## Usage
  Called from the frontend when a player lands on a route carrying
  `?notification=<id>` (see src/lib/notificationClick.ts). Idempotent —
  clicking a link twice does not error, it just leaves `clicked_at` at
  its first value.
*/

CREATE OR REPLACE FUNCTION public.record_notification_click(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_row_count integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;
  IF p_notification_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.notification_delivery_log
  SET    clicked_at = COALESCE(clicked_at, now()),
         status      = CASE WHEN status IN ('sent') THEN 'clicked' ELSE status END,
         updated_at  = now()
  WHERE  id = p_notification_id
    AND  user_id = v_user_id;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RETURN v_row_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.record_notification_click(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_notification_click(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_notification_click(uuid) TO authenticated;