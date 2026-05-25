/*
  # Fix _upsert_game_progress function

  Corrects the ON CONFLICT DO UPDATE clause which incorrectly referenced
  weekly_qualification_status instead of player_game_progress.
*/

CREATE OR REPLACE FUNCTION _upsert_game_progress(
  p_user_id   uuid,
  p_game_id   text,
  p_won       boolean,
  p_pts       integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date;
BEGIN
  v_today := get_madrid_today();

  INSERT INTO player_game_progress
    (user_id, game_id, progress_date, played_today, completed_today, won_today, qualification_points_earned)
  VALUES
    (p_user_id, p_game_id, v_today, true, true, p_won, p_pts)
  ON CONFLICT (user_id, game_id, progress_date) DO UPDATE SET
    played_today                = true,
    completed_today             = true,
    won_today                   = player_game_progress.won_today OR p_won,
    qualification_points_earned = greatest(player_game_progress.qualification_points_earned, p_pts);
END;
$$;
