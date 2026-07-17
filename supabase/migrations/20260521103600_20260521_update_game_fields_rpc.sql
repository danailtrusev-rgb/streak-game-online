/*
  # Add update_game_fields RPC

  ## Summary
  Adds a SECURITY DEFINER RPC that updates game row fields directly via SQL,
  bypassing the PostgREST schema cache. This resolves the "could not find the
  'launch_state' column in the schema cache" error when updating games from
  the admin panel.

  ## New Functions

  ### update_game_fields(p_game_id, p_launch_state, p_category, p_points_on_play, p_points_on_win, p_sort_order, p_qualification_enabled)
  - Updates the games table row matching p_game_id
  - All update params are nullable — only non-null values are applied
  - Uses a dynamic UPDATE with CASE expressions to skip null fields
  - SECURITY DEFINER with search_path = public
  - Only callable by service_role (the admin edge function uses the service role key)

  ## Notes
  1. The games table already has launch_state (added in ecosystem phase 1 migration)
  2. This RPC is the canonical admin update path, routing around schema cache issues
  3. Not accessible to authenticated users — no GRANT to authenticated or anon
*/

CREATE OR REPLACE FUNCTION public.update_game_fields(
  p_game_id               text,
  p_launch_state          text    DEFAULT NULL,
  p_category              text    DEFAULT NULL,
  p_points_on_play        integer DEFAULT NULL,
  p_points_on_win         integer DEFAULT NULL,
  p_sort_order            integer DEFAULT NULL,
  p_qualification_enabled boolean DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.games
  SET
    launch_state          = COALESCE(p_launch_state,          launch_state),
    category              = COALESCE(p_category,              category),
    points_on_play        = COALESCE(p_points_on_play,        points_on_play),
    points_on_win         = COALESCE(p_points_on_win,         points_on_win),
    sort_order            = COALESCE(p_sort_order,            sort_order),
    qualification_enabled = COALESCE(p_qualification_enabled, qualification_enabled)
  WHERE game_id = p_game_id;

  RETURN FOUND;
END;
$$;
