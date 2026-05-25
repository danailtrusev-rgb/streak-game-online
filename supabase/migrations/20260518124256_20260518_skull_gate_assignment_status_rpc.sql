/*
  # Skull Gate Assignment Status RPC

  ## Summary
  Adds a simple SECURITY DEFINER function that lets the client update the
  status and result fields on the player's own assignment row for today.

  This is analytics/UX only — it tracks whether the player started and
  completed the scene challenge. It has no authority over game outcome;
  the survive/die result comes from play_daily_gate and is passed in by
  the client from pendingResult.outcome.

  ## New Function
  - `update_skull_gate_assignment_status(p_status text, p_result text)`
    - Authenticated, SECURITY DEFINER
    - Only updates the calling user's row for today's Madrid date
    - p_status: 'started' | 'completed' | 'skipped'
    - p_result: 'survive' | 'die' | NULL
    - Sets started_at when status → started
    - Sets completed_at when status → completed | skipped
    - Returns updated row id or NULL if no assignment for today

  ## Security
  - SECURITY DEFINER runs as owner, bypasses RLS
  - Uses auth.uid() — cannot update another user's row
  - No wallet, streak, or outcome logic touched
*/

CREATE OR REPLACE FUNCTION update_skull_gate_assignment_status(
  p_status text,
  p_result text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_today   date;
  v_id      uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate status
  IF p_status NOT IN ('started', 'completed', 'skipped') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;

  -- Validate result
  IF p_result IS NOT NULL AND p_result NOT IN ('survive', 'die') THEN
    RAISE EXCEPTION 'Invalid result: %', p_result;
  END IF;

  v_today := get_madrid_today();

  UPDATE player_skull_gate_assignments
  SET
    status       = p_status,
    result       = COALESCE(p_result, result),
    started_at   = CASE WHEN p_status = 'started'   AND started_at IS NULL   THEN now() ELSE started_at   END,
    completed_at = CASE WHEN p_status IN ('completed','skipped') AND completed_at IS NULL THEN now() ELSE completed_at END
  WHERE user_id  = v_user_id
    AND play_date = v_today
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_skull_gate_assignment_status(text, text) TO authenticated;
