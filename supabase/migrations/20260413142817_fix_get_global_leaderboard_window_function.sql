/*
  # Fix get_global_leaderboard: window function inside aggregate

  The previous implementation used ROW_NUMBER() window function directly inside
  jsonb_agg(), which is invalid in PostgreSQL. This fix uses a CTE to compute
  the ranked rows first, then aggregates the result.
*/

CREATE OR REPLACE FUNCTION public.get_global_leaderboard(p_limit int DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN (
    WITH ranked AS (
      SELECT
        u.guest_id,
        gs.current_streak,
        gs.pot_cents,
        ROW_NUMBER() OVER (ORDER BY gs.current_streak DESC, gs.pot_cents DESC) AS rank
      FROM game_state gs
      JOIN users u ON gs.user_id = u.id
      WHERE gs.current_streak > 0
      ORDER BY gs.current_streak DESC, gs.pot_cents DESC
      LIMIT p_limit
    )
    SELECT jsonb_agg(
      jsonb_build_object(
        'guest_id',       ranked.guest_id,
        'current_streak', ranked.current_streak,
        'pot_cents',      ranked.pot_cents,
        'rank',           ranked.rank
      )
    )
    FROM ranked
  );
END;
$$;
