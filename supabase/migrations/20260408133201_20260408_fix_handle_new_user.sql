/*
  # Fix handle_new_user trigger function

  ## Summary
  Recreates the handle_new_user trigger with SET search_path = '' and fully
  qualified table references (public.users, public.game_state, public.wallet_balance_cache).
  This resolves the "Database error saving new user" 500 error on signup.

  The previous version had no search_path set, which can cause failures when
  Supabase's internal auth service invokes the trigger with a restricted search_path.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_guest_id text;
BEGIN
  v_guest_id := COALESCE(
    NEW.raw_user_meta_data->>'guest_id',
    'guest_' || LEFT(NEW.id::text, 8)
  );

  INSERT INTO public.users (id, guest_id)
  VALUES (NEW.id, v_guest_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.game_state (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.wallet_balance_cache (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
